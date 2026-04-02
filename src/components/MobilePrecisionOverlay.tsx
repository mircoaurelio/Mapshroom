interface MobilePrecisionOverlayProps {
  precision: number;
  onPrecisionChange: (value: number) => void;
}

export function MobilePrecisionOverlay({
  precision,
  onPrecisionChange,
}: MobilePrecisionOverlayProps) {
  return (
    <div className="mobile-precision-overlay">
      <label className="mobile-precision-field">
        <span>Precision {precision}</span>
        <input
          type="range"
          min={1}
          max={40}
          value={precision}
          onChange={(event) => onPrecisionChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
