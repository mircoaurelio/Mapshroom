import type { MappingAction } from '../components/MappingPad';

interface MappingKey {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  defaultPrevented?: boolean;
  isComposing?: boolean;
}

export function mappingKeyboardAction(event: MappingKey, editing: boolean): MappingAction | 'undo' | 'redo' | null {
  if (editing || event.defaultPrevented || event.isComposing || event.altKey) return null;
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === 'z') return event.shiftKey ? 'redo' : 'undo';
    return null;
  }
  const arrows: Record<string, MappingAction> = {
    ArrowLeft: 'move-left', ArrowRight: 'move-right', ArrowUp: 'move-up', ArrowDown: 'move-down',
  };
  return arrows[event.key] ?? null;
}
