"""Danao two-browser online acceptance test.

Runs two real Chromium contexts against either local Wrangler or the published Worker.
The desktop browser hosts; a landscape mobile browser joins, sends touch input, receives
authoritative snapshots, then reconnects to the running fight.
"""
import asyncio
import json
import os
import time
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:8787").rstrip("/")
LABEL = os.environ.get("DANAO_RUN_LABEL", "local")
OUT = ROOT / "verification" / "danao-online"
OUT.mkdir(parents=True, exist_ok=True)

checks = []
page_errors = []
console_errors = []


async def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
    print("PASS", name, flush=True)


def parse_frame(payload):
    if isinstance(payload, bytes):
        try:
            payload = payload.decode("utf-8")
        except Exception:
            return None
    if not isinstance(payload, str):
        return None
    try:
        value = json.loads(payload)
    except Exception:
        return None
    return value if isinstance(value, dict) else None


def attach_socket_log(page, label):
    log = {"label": label, "urls": [], "sent": [], "received": [], "closed": 0}

    def on_socket(ws):
        if "/api/danao/" not in ws.url:
            return
        log["urls"].append(ws.url)

        def sent(payload):
            value = parse_frame(payload)
            if value is not None:
                log["sent"].append(value)

        def received(payload):
            value = parse_frame(payload)
            if value is not None:
                log["received"].append(value)

        ws.on("framesent", sent)
        ws.on("framereceived", received)
        ws.on("close", lambda: log.__setitem__("closed", log["closed"] + 1))

    page.on("websocket", on_socket)
    return log


async def wait_eval(page, expression, label, timeout=90000):
    deadline = time.monotonic() + timeout / 1000
    while time.monotonic() < deadline:
        try:
            if await page.evaluate(f"() => Boolean({expression})"):
                return
        except Exception:
            pass
        await asyncio.sleep(0.1)
    raise AssertionError(f"Timed out waiting for {label}")


async def wait_frame(log, direction, predicate, label, timeout=30000):
    deadline = time.monotonic() + timeout / 1000
    while time.monotonic() < deadline:
        for value in list(log[direction]):
            try:
                if predicate(value):
                    return value
            except Exception:
                pass
        await asyncio.sleep(0.05)
    tail = log[direction][-8:]
    raise AssertionError(f"Timed out waiting for {label}; tail={json.dumps(tail)[:2500]}")


def fighter_x(message, slot):
    state = message.get("state") if isinstance(message, dict) else None
    if not isinstance(state, dict):
        return None
    for fighter in state.get("fighters") or []:
        if isinstance(fighter, dict) and fighter.get("slot") == slot:
            value = fighter.get("x")
            return float(value) if isinstance(value, (int, float)) else None
    return None


async def load_danao(page, mobile=False):
    suffix = "?touch=1" if mobile else ""
    await page.goto(BASE + "/games/danao/" + suffix, wait_until="domcontentloaded", timeout=90000)
    await page.locator('[data-online-action="open"]').wait_for(state="visible", timeout=30000)
    await check(f"{'mobile' if mobile else 'desktop'} Danao shell loads", await page.locator('[data-action="play"]').is_visible())


async def main():
    report = {
        "passed": False,
        "label": LABEL,
        "baseUrl": BASE,
        "checks": checks,
        "pageErrors": page_errors,
        "consoleErrors": console_errors,
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--disable-dev-shm-usage",
            ],
        )
        host_context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            service_workers="block",
        )
        guest_context = await browser.new_context(
            viewport={"width": 844, "height": 390},
            screen={"width": 844, "height": 390},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2,
            service_workers="block",
        )
        host = await host_context.new_page()
        guest = await guest_context.new_page()

        for page, name in [(host, "host"), (guest, "guest")]:
            page.on("pageerror", lambda error, n=name: page_errors.append(f"{n}: {error}"))

            def console(message, n=name):
                if message.type == "error":
                    console_errors.append(f"{n}: {message.text}")

            page.on("console", console)

        host_net = attach_socket_log(host, "host")
        guest_net = attach_socket_log(guest, "guest")

        try:
            await load_danao(host, mobile=False)
            await host.locator('[data-online-action="open"]').click()
            await host.locator('[data-online-field="name"]').fill("Host")
            await host.locator('[data-online-action="create"]').click()
            await host.locator(".online-room-head strong").wait_for(state="visible", timeout=30000)
            code = (await host.locator(".online-room-head strong").inner_text()).strip()
            await check("host receives a four-digit Danao room code", len(code) == 4 and code.isdigit())

            host_welcome = await wait_frame(
                host_net,
                "received",
                lambda value: value.get("type") == "welcome" and value.get("id") == 0,
                "host WebSocket welcome",
            )
            await check("host connects through the Danao WebSocket", host_welcome.get("room", {}).get("code") == code)
            await check("room token stays out of the browser URL", "token=" not in host.url)

            await load_danao(guest, mobile=True)
            await guest.locator('[data-online-action="open"]').click()
            await guest.locator('[data-online-field="name"]').fill("Mobile Guest")
            await guest.locator('[data-online-field="code"]').fill(code)
            await guest.locator('[data-online-action="join"]').click()

            guest_welcome = await wait_frame(
                guest_net,
                "received",
                lambda value: value.get("type") == "welcome" and isinstance(value.get("id"), int),
                "guest WebSocket welcome",
            )
            guest_id = int(guest_welcome["id"])
            await check("mobile guest joins a separate room slot", guest_id != 0)
            await check("guest reconnect token stays out of the browser URL", "token=" not in guest.url)

            await host.locator(".online-player").nth(1).wait_for(state="visible", timeout=30000)
            await guest.locator('[data-online-action="ready"]').wait_for(state="visible", timeout=30000)
            await guest.locator('[data-online-action="ready"]').click()

            await host.wait_for_function(
                "() => { const b=document.querySelector('[data-online-action=\"start\"]'); return Boolean(b && !b.disabled); }",
                timeout=30000,
            )
            await check("host cannot start until mobile guest is ready", await host.locator('[data-online-action="start"]').is_enabled())
            await host.screenshot(path=str(OUT / f"{LABEL}-lobby-host.png"))
            await guest.screenshot(path=str(OUT / f"{LABEL}-lobby-mobile.png"))

            await host.locator('[data-online-action="start"]').click()

            await wait_eval(host, "globalThis.BABYLON?.EngineStore?.LastCreatedScene", "host Babylon fight")
            await wait_eval(guest, "globalThis.BABYLON?.EngineStore?.LastCreatedScene", "guest Babylon fight")
            await guest.locator(".danao-touch-shell.is-active").wait_for(state="visible", timeout=90000)
            await check("mobile touch controls stay active in an online fight", await guest.locator(".danao-touch-shell.is-active").is_visible())

            baseline = await wait_frame(
                guest_net,
                "received",
                lambda value: value.get("type") == "snapshot" and fighter_x(value, guest_id) is not None,
                "first authoritative guest snapshot",
                timeout=30000,
            )
            baseline_x = fighter_x(baseline, guest_id)

            right = guest.locator('[data-touch-action="right"]')
            await right.dispatch_event(
                "pointerdown",
                {"pointerId": 41, "pointerType": "touch", "isPrimary": True},
            )

            guest_input = await wait_frame(
                guest_net,
                "sent",
                lambda value: value.get("type") == "input" and float(value.get("moveX", 0)) > 0.8,
                "mobile guest right input frame",
                timeout=15000,
            )
            await check("mobile touch input sends a real online input frame", guest_input.get("type") == "input")

            host_input = await wait_frame(
                host_net,
                "received",
                lambda value: (
                    value.get("type") == "input"
                    and value.get("id") == guest_id
                    and float((value.get("frame") or {}).get("moveX", 0)) > 0.8
                ),
                "host receiving mobile guest input",
                timeout=15000,
            )
            await check("host receives the mobile guest input through the room", host_input.get("id") == guest_id)

            moved = await wait_frame(
                guest_net,
                "received",
                lambda value: (
                    value.get("type") == "snapshot"
                    and fighter_x(value, guest_id) is not None
                    and fighter_x(value, guest_id) > baseline_x + 0.15
                ),
                "authoritative guest movement snapshot",
                timeout=20000,
            )
            await right.dispatch_event(
                "pointerup",
                {"pointerId": 41, "pointerType": "touch", "isPrimary": True},
            )
            moved_x = fighter_x(moved, guest_id)
            await check("authoritative host simulation moves the mobile guest fighter", moved_x > baseline_x + 0.15)
            await check(
                "guest receives host snapshots after its input",
                any(value.get("type") == "snapshot" for value in guest_net["received"]),
            )

            await host.screenshot(path=str(OUT / f"{LABEL}-fight-host.png"))
            await guest.screenshot(path=str(OUT / f"{LABEL}-fight-mobile.png"))

            old_guest_id = guest_id
            guest_net["sent"].clear()
            guest_net["received"].clear()
            await guest.reload(wait_until="domcontentloaded", timeout=90000)
            await guest.locator('[data-online-action="open"]').wait_for(state="visible", timeout=30000)
            guest_net["sent"].clear()
            guest_net["received"].clear()
            await guest.locator('[data-online-action="open"]').click()
            await guest.locator('[data-online-action="reconnect"]').click()

            reconnect_welcome = await wait_frame(
                guest_net,
                "received",
                lambda value: value.get("type") == "welcome" and isinstance(value.get("id"), int),
                "guest reconnect welcome",
                timeout=30000,
            )
            await check("mobile reconnect restores the same player slot", reconnect_welcome.get("id") == old_guest_id)
            await check(
                "reconnect welcome carries the retained fight state",
                isinstance(reconnect_welcome.get("state"), dict)
                and bool((reconnect_welcome.get("state") or {}).get("fighters")),
            )
            await wait_eval(guest, "globalThis.BABYLON?.EngineStore?.LastCreatedScene", "reconnected guest Babylon fight")
            await guest.locator(".danao-touch-shell.is-active").wait_for(state="visible", timeout=90000)

            reconnect_snapshot = await wait_frame(
                guest_net,
                "received",
                lambda value: value.get("type") == "snapshot" and fighter_x(value, old_guest_id) is not None,
                "snapshot after mobile reconnect",
                timeout=30000,
            )
            await check("reconnected mobile guest resumes authoritative snapshots", fighter_x(reconnect_snapshot, old_guest_id) is not None)
            await guest.screenshot(path=str(OUT / f"{LABEL}-reconnected-mobile.png"))

            version = await guest_context.request.get(BASE + "/games/danao/release.json")
            release = await version.json()
            report["release"] = release
            await check("two-browser proof runs against Danao 0.10.8 or later", tuple(map(int, release["version"].split("."))) >= (0, 10, 8))
            await check("no uncaught Danao browser errors", not page_errors)

            report.update(
                {
                    "passed": True,
                    "roomCode": code,
                    "guestId": guest_id,
                    "baselineX": baseline_x,
                    "movedX": moved_x,
                    "hostWebSocket": {
                        "urls": host_net["urls"],
                        "sentTypes": [v.get("type") for v in host_net["sent"]],
                        "receivedTypes": [v.get("type") for v in host_net["received"]],
                    },
                    "guestWebSocket": {
                        "urls": guest_net["urls"],
                        "sentTypes": [v.get("type") for v in guest_net["sent"]],
                        "receivedTypes": [v.get("type") for v in guest_net["received"]],
                    },
                }
            )
        except Exception as error:
            report["failure"] = str(error)
            for page, name in [(host, "host"), (guest, "guest")]:
                try:
                    await page.screenshot(path=str(OUT / f"{LABEL}-failure-{name}.png"), full_page=True)
                except Exception:
                    pass
            raise
        finally:
            (OUT / f"{LABEL}-report.json").write_text(json.dumps(report, indent=2))
            await host_context.close()
            await guest_context.close()
            await browser.close()

    print(json.dumps({"passed": report["passed"], "checks": len(checks), "label": LABEL}, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise
