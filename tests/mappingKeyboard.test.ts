import assert from 'node:assert/strict';
import test from 'node:test';
import { mappingKeyboardAction } from '../src/lib/mappingKeyboard.ts';

test('all four arrows position the image, with undo and redo shortcuts', () => {
  for (const [key, direction] of [['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down']]) {
    assert.equal(mappingKeyboardAction({ key }, false), `move-${direction}`);
  }
  assert.equal(mappingKeyboardAction({ key: 'z', ctrlKey: true }, false), 'undo');
  assert.equal(mappingKeyboardAction({ key: 'Z', metaKey: true, shiftKey: true }, false), 'redo');
});

test('typing, native shortcuts and already handled corner/precision arrows do not move the image', () => {
  assert.equal(mappingKeyboardAction({ key: 'ArrowRight' }, true), null);
  for (const property of ['altKey', 'ctrlKey', 'metaKey', 'defaultPrevented', 'isComposing']) {
    assert.equal(mappingKeyboardAction({ key: 'ArrowRight', [property]: true }, false), null);
  }
  assert.equal(mappingKeyboardAction({ key: 'z', ctrlKey: true }, true), null);
  assert.equal(mappingKeyboardAction({ key: 'Enter' }, false), null);
});
