import assert from 'node:assert/strict';
import test from 'node:test';
import { d3BasePrice, d3Total } from '../experience/cons/d3/2026/pricing.js';

test('both noon sessions include the 100 dollar discount; printing stays 500 per person', () => {
  for (const day of ['2026-12-12', '2026-12-13']) for (const hour of [12, 13, 14, 15, 16, 17]) {
    const slot = `${day}-${hour}`;
    const base = hour === 12 ? 400 : 500;
    assert.equal(d3BasePrice(slot), base);
    for (const people of [1, 2]) {
      assert.equal(d3Total(slot, false, people), base * people);
      assert.equal(d3Total(slot, true, people), (base + 500) * people);
    }
  }
  assert.equal(d3BasePrice(''), 500);
});
