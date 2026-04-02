export type MappingAction =
  | 'move-up'
  | 'move-down'
  | 'move-left'
  | 'move-right'
  | 'width-plus'
  | 'width-minus'
  | 'height-plus'
  | 'height-minus';

interface MappingPadProps {
  onAction: (action: MappingAction) => void;
  disabled?: boolean;
  variant?: 'default' | 'overlay';
}

const MAPPING_PAD_ACTIONS: Array<{
  label: string;
  action?: MappingAction;
  accent?: boolean;
}> = [
  { label: 'H-', action: 'height-minus' },
  { label: 'Up', action: 'move-up', accent: true },
  { label: 'H+', action: 'height-plus' },
  { label: 'Left', action: 'move-left', accent: true },
  { label: 'Center' },
  { label: 'Right', action: 'move-right', accent: true },
  { label: 'W-', action: 'width-minus' },
  { label: 'Down', action: 'move-down', accent: true },
  { label: 'W+', action: 'width-plus' },
];

export function MappingPad({
  onAction,
  disabled = false,
  variant = 'default',
}: MappingPadProps) {
  return (
    <div className={`mapping-pad mapping-pad-${variant}`}>
      {MAPPING_PAD_ACTIONS.map((item) => (
        <button
          key={`${item.label}-${item.action ?? 'noop'}`}
          type="button"
          className={`mapping-pad-button mapping-pad-button-${variant} ${item.accent ? 'mapping-pad-button-accent' : ''}`}
          onClick={() => {
            if (!item.action) {
              return;
            }
            onAction(item.action);
          }}
          disabled={disabled || !item.action}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
