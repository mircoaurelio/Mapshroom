import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_LIBRARY_WIDTHS, libraryPaneMaximum, readLibraryWidths, resolveLibraryWidths } from '../src/lib/shaderLibraryLayout.ts';

test('library widths recover from unavailable, malformed and obsolete preferences', () => {
  for (const raw of [null, '{', 'null', '[]']) assert.deepEqual(readLibraryWidths(raw), DEFAULT_LIBRARY_WIDTHS);
  assert.deepEqual(readLibraryWidths('{"directory":900,"chat":10}'), { directory: 480, chat: 280 });
  assert.deepEqual(readLibraryWidths('{"directory":"300","chat":420}'), { directory: 280, chat: 420 });
});

test('large saved panes shrink together to keep the catalog usable on smaller desktops', () => {
  const preferred = { directory: 480, chat: 560 };
  const resolved = resolveLibraryWidths(preferred, 1045, true, true);
  assert.ok(resolved.directory >= 220 && resolved.chat >= 280);
  assert.ok(1045 - resolved.directory - resolved.chat - 16 >= 340);
  assert.deepEqual(resolveLibraryWidths(preferred, 1800, true, true), preferred);
  assert.deepEqual(preferred, { directory: 480, chat: 560 });
  const fractional = resolveLibraryWidths(preferred, 1045.6, true, true);
  assert.ok(1045.6 - fractional.directory - fractional.chat - 16 >= 340);
  assert.ok(fractional.chat <= libraryPaneMaximum('chat', fractional, 1045.6));
});

test('hidden and overlay panes do not reserve space in the catalog', () => {
  assert.deepEqual(resolveLibraryWidths(DEFAULT_LIBRARY_WIDTHS, 1000, false, true), { directory: 0, chat: 340 });
  assert.deepEqual(resolveLibraryWidths(DEFAULT_LIBRARY_WIDTHS, 390, false, false), { directory: 0, chat: 0 });
  assert.deepEqual(resolveLibraryWidths(DEFAULT_LIBRARY_WIDTHS, 1100, true, false), { directory: 280, chat: 0 });
});

test('drag limits reserve the opposite panel and widen when that panel is closed', () => {
  assert.equal(libraryPaneMaximum('directory', { directory: 280, chat: 340 }, 1045), 349);
  assert.equal(libraryPaneMaximum('chat', { directory: 280, chat: 340 }, 1045), 409);
  assert.equal(libraryPaneMaximum('directory', { directory: 280, chat: 0 }, 1045), 480);
  assert.equal(libraryPaneMaximum('chat', { directory: 0, chat: 340 }, 700), 352);
});
