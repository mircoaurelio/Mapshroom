import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeTimelineStepAssetSettings } from '../src/lib/timelineAssetSettings.ts';

test('preserves transparent compositing for a pinned timeline layer', () => {
  const normalized = normalizeTimelineStepAssetSettings({
    pinnedCompositeMode: 'blend',
  });

  assert.equal(normalized.pinnedCompositeMode, 'blend');
});
