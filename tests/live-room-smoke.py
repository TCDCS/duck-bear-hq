"""Bounded acceptance check against one temporary public room; no account data."""
import asyncio, json, os, time
from pathlib import Path
import aiohttp

BASE = os.environ['BASE_URL'].rstrip('/')
OUT = Path('verification')
checks = []

def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
    print('PASS', name, flush=True)

async def main():
    seats, clients, tasks, messages = [], [], [], []
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout, headers={'Origin': BASE}) as session:
        async def post(path, data):
            async with session.post(BASE + path, json=data) as r:
                return r.status, await r.json()

        async def read(ws, bucket):
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT and msg.data != 'pong':
                    bucket.append(json.loads(msg.data))
                    if len(bucket) > 300:
                        del bucket[:100]

        async def wait(predicate, label, seconds=20):
            deadline = time.monotonic() + seconds
            while time.monotonic() < deadline:
                if predicate():
                    return
                await asyncio.sleep(.05)
            raise AssertionError('Timed out: ' + label)

        def latest(i, kind):
            return next((m for m in reversed(messages[i]) if m.get('type') == kind), {})

        async def attach(seat):
            code, token = seat['room']['code'], seat['token']
            url = BASE.replace('https:', 'wss:').replace('http:', 'ws:')
            ws = await session.ws_connect(f'{url}/api/races/{code}/socket?token={token}', heartbeat=20)
            bucket = []
            clients.append(ws); seats.append(seat); messages.append(bucket)
            tasks.append(asyncio.create_task(read(ws, bucket)))
            await wait(lambda: bool(latest(len(clients)-1, 'welcome')), 'socket welcome')

        try:
            status, first = await post('/api/races/create', {'name': 'Release check 1', 'avatar': 0, 'track': 3})
            check('public production server creates a room without sign-in', status == 201)
            code = first['room']['code']
            check('room code has exactly four numbered digits', len(code) == 4 and code.isdigit())
            await attach(first)
            await clients[0].send_json({'type': 'setup', 'locked': True})
            await wait(lambda: latest(0, 'room').get('room', {}).get('locked') is True, 'room lock')
            status, rejected = await post('/api/races/join', {'code': code, 'name': 'Locked attempt'})
            check('locked room rejects new visitors while seats remain free', status == 409)
            await clients[0].send_json({'type': 'setup', 'locked': False})
            await wait(lambda: latest(0, 'room').get('room', {}).get('locked') is False, 'room unlock')
            for i in range(1, 7):
                status, seat = await post('/api/races/join', {'code': code, 'name': f'Release check {i+1}', 'avatar': i, 'vehicle': ['kart', 'police', 'ambulance', 'bus'][i % 4]})
                check(f'guest {i+1} joins a distinct live seat', status == 201 and seat['id'] not in [s['id'] for s in seats])
                await attach(seat)
            await wait(lambda: all(len(latest(i, 'room').get('room', {}).get('players', [])) == 7 and all(p['connected'] for p in latest(i, 'room')['room']['players']) for i in range(7)), 'seven-player roster')
            check('all seven real WebSocket clients share the roster', len({json.dumps(latest(i, 'room')['room']['players'], sort_keys=True) for i in range(7)}) == 1)
            status, rejected = await post('/api/races/join', {'code': code, 'name': 'Eighth visitor'})
            check('eighth player cannot overfill the race', status == 409)
            await clients[1].send_json({'type': 'start'})
            await wait(lambda: bool(latest(1, 'error')), 'non-host start rejection')
            check('non-host cannot start the shared race', 'host' in latest(1, 'error').get('message', '').lower())
            for ws in clients:
                await ws.send_json({'type': 'ready', 'ready': True})
            await wait(lambda: all(p['ready'] for p in latest(0, 'room')['room']['players']), 'ready checks')
            await clients[0].send_json({'type': 'start'})
            await wait(lambda: all(latest(i, 'snapshot').get('countdown') == 0 for i in range(7)), 'common countdown', 25)
            check('seven human drivers start the same race', all(not p['ai'] for p in latest(0, 'snapshot')['racers']))
            for seq in range(1, 61):
                for i, ws in enumerate(clients):
                    await ws.send_json({'type': 'input', 'seq': seq, 'gas': 1 if i % 2 == 0 else 0, 'brake': 0 if i % 2 == 0 else 1, 'steer': .15 if i == 0 else -.15 if i == 2 else 0, 's': 99999999, 'completedLaps': 3})
                await asyncio.sleep(.05)
            await asyncio.sleep(.2)
            snap = latest(0, 'snapshot')
            check('independent inputs drive only their assigned vehicles', all(p['speed'] > 8 if p['id'] % 2 == 0 else p['speed'] < 2 for p in snap['racers']))
            check('forged positions and lap counts are ignored by the server', all(p['s'] < 1000 and p['completedLaps'] == 0 and not p['finished'] for p in snap['racers']))
            common = set(m['sequence'] for m in messages[0] if m.get('type') == 'snapshot')
            for bucket in messages[1:]:
                common &= {m['sequence'] for m in bucket if m.get('type') == 'snapshot'}
            check('all seven players receive a common authoritative update', bool(common))
            sequence = max(common)
            packets = [next(m for m in bucket if m.get('type') == 'snapshot' and m['sequence'] == sequence) for bucket in messages]
            check('the shared update is identical for every player', len({json.dumps(m, sort_keys=True) for m in packets}) == 1)
            check('broadcasts contain no seat pass or account information', all(s['token'] not in json.dumps(messages) for s in seats))
            await asyncio.sleep(2.2)
            check('a stalled client brakes instead of accelerating indefinitely', latest(0, 'snapshot')['racers'][0]['speed'] < 2)
            await clients[0].send_json({'type': 'leave'})
            await wait(lambda: latest(1, 'room').get('room', {}).get('hostId') == seats[1]['id'], 'host migration')
            check('host departure transfers control to a connected friend', latest(1, 'room')['room']['hostId'] == seats[1]['id'])
        finally:
            for ws in clients:
                if not ws.closed:
                    try:
                        await ws.send_json({'type': 'leave'})
                        await ws.close()
                    except Exception:
                        pass
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    report = {'base': BASE, 'kind': 'seven real production WebSocket clients', 'passed': False}
    try:
        asyncio.run(main())
        report['passed'] = True
    except Exception as exc:
        report['failure'] = str(exc)
        raise
    finally:
        report.update(checks=checks, count=len(checks), completed=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
        (OUT / 'seven-player-live.json').write_text(json.dumps(report, indent=2))
