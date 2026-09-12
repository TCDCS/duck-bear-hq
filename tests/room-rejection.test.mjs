import test from 'node:test';
import assert from 'node:assert/strict';
import {WackyRoom} from '../src/multiplayer/durable.mjs';
import {makeRoom, joinRoom} from '../src/multiplayer/room-state.mjs';

for (const scenario of ['locked', 'full', 'started']) {
  test(`a ${scenario} room rejects a join without resetting connected players`, async () => {
    const saved = makeRoom('1234');
    if (scenario === 'locked') saved.locked = true;
    if (scenario === 'full') for (let n = 1; n < 8; n++) joinRoom(saved, {name: `Driver ${n}`});
    if (scenario === 'started') saved.phase = 'race';
    let resets = 0;
    const ctx = {
      storage: {get: async () => saved, put: async () => {}, setAlarm: async () => {}},
      getWebSockets: () => [],
      async blockConcurrencyWhile(callback) {
        try {return await callback();}
        catch (error) {resets++; throw error;}
      }
    };
    const instance = new WackyRoom(ctx, {});
    await instance.ready;
    const response = await instance.fetch(new Request('https://internal/join', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: 'Visitor'})
    }));
    assert.equal(response.status, 409);
    assert.equal(resets, 0, 'expected user errors must be caught inside the concurrency gate');
  });
}
