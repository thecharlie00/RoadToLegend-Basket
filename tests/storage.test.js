'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Save = require('../src/core/save.js');
const Storage = require('../src/platform/storage.js');

function env(id, payload) {
  return Save.createEnvelope(id, payload, { updatedAt: '2026-10-31T00:00:00.000Z' });
}

test('localStorage adapter saves, loads, lists and deletes', async () => {
  const adapter = Storage.createLocalStorageAdapter(Storage.createMemoryStorage());
  await adapter.save('slot-1', env('career-1', { a: 1 }));
  const loaded = await adapter.load('slot-1');
  assert.equal(loaded.careerId, 'career-1');
  assert.equal((await adapter.list()).length, 1);
  await adapter.remove('slot-1');
  assert.equal(await adapter.load('slot-1'), null);
});

test('corrupt current falls back to backup', async () => {
  const mem = Storage.createMemoryStorage();
  const adapter = Storage.createLocalStorageAdapter(mem);
  await adapter.save('slot-1', env('career-1', { a: 1 }));
  await adapter.save('slot-1', env('career-1', { a: 2 }));
  mem.setItem('caa.slot.slot-1.current', '{corrupt');
  const loaded = await adapter.load('slot-1');
  assert.equal(loaded.payload.a, 1);
});

test('quota failure does not destroy previous current', async () => {
  const mem = Storage.createMemoryStorage();
  const adapter = Storage.createLocalStorageAdapter(mem);
  await adapter.save('slot-1', env('career-1', { a: 1 }));
  const original = mem.setItem.bind(mem);
  mem.setItem = (k, v) => { if (k.endsWith('.current') && String(v).includes('"a":2')) throw new Error('quota'); original(k, v); };
  await assert.rejects(() => adapter.save('slot-1', env('career-1', { a: 2 })), /quota/);
  const loaded = await adapter.load('slot-1');
  assert.equal(loaded.payload.a, 1);
});
