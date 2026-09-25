import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHARACTER_PORTRAIT_MAX_EDGE,
  CHARACTER_PORTRAIT_TARGET_BYTES,
  constrainedImageSize
} from '../../../shared/portrait-image.js';

test('large portrait dimensions are reduced without changing their aspect ratio', () => {
  assert.deepEqual(constrainedImageSize(3000, 4000), { width: 900, height: 1200 });
  assert.deepEqual(constrainedImageSize(4000, 2000), { width: 1200, height: 600 });
});

test('small portraits are not enlarged', () => {
  assert.deepEqual(constrainedImageSize(480, 640), { width: 480, height: 640 });
  assert.equal(CHARACTER_PORTRAIT_MAX_EDGE, 1200);
  assert.equal(CHARACTER_PORTRAIT_TARGET_BYTES, 600 * 1024);
});
