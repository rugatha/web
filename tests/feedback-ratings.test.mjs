import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFeedbackRatings } from '../scripts/export-feedback-ratings.mjs';

test('public summary matches admin averages, omits invalid scores and exposes no answers', () => {
  const result = summarizeFeedbackRatings([
    { storyRating: 5, dmRating: 4, nickname: 'Private name', privateFeedback: 'Private answer' },
    { storyRating: 4, dmRating: 5 },
    { storyRating: '5', dmRating: 0 },
    { storyRating: 6, dmRating: null },
  ], '2026-10-31T10:00:00Z');
  assert.equal(result.responseCount, 4);
  assert.equal(result.ratings.length, 5);
  assert.deepEqual(result.ratings[0], { key: 'storyRating', label: '劇本設計', count: 2, average: 4.5 });
  assert.equal(result.ratings[1].average, null);
  assert.equal(result.ratings[2].average, 4.5);
  assert(!JSON.stringify(result).includes('Private'));
  assert(summarizeFeedbackRatings([]).ratings.every(item => item.count === 0 && item.average === null));
});
