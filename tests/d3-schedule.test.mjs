import test from 'node:test';
import assert from 'node:assert/strict';
import { dates, times, slotIds, slotId, slotLabel } from '../experience/cons/d3/2026/schedule.js';
import { commitD3Registration } from '../experience/cons/d3/2026/registration-store.js';

test('each event date has three consecutive two-hour sessions ending at 18:00', () => {
  assert.deepEqual(times, ['12:00-14:00', '14:00-16:00', '16:00-18:00']);
  assert.equal(slotIds.length, 6);
  for (const day of Object.keys(dates)) {
    assert.deepEqual(times.map((_, index) => slotId(day, index)), [12, 14, 16].map(hour => `${day}-${hour}`));
    assert.equal(slotLabel(`${day}-16`), `${day.slice(5).replace('-', '/')} 16:00–18:00`);
  }
  assert.equal(slotLabel('2026-12-12-13'), '12/12 13:00–14:00（舊時段）');
});

test('retired hourly sessions cannot be registered even through the shared store', async () => {
  for (const day of Object.keys(dates)) for (const hour of [13, 15, 17]) {
    await assert.rejects(commitD3Registration(null, 'test', { slotId: `${day}-${hour}` }, {}), /有效的 2 小時班次/);
  }
});
