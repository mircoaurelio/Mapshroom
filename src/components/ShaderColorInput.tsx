import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ShaderUniformValue } from '../types';
import { rgbToHex } from '../lib/shader';

interface ShaderColorInputProps {
  value: ShaderUniformValue;
  onChange: (value: ShaderUniformValue) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function rgbToHsv(red: number, green: number, blue: number): { hue: number; saturation: number; value: number } {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  hue = Math.round(hue * 60);
  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (normalizedHue < 60) {
    red = chroma;
    green = x;
  } else if (normalizedHue < 120) {
    red = x;
    green = chroma;
  } else if (normalizedHue < 180) {
    green = chroma;
    blue = x;
  } else if (normalizedHue < 240) {
    green = x;
    blue = chroma;
  } else if (normalizedHue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return [red + match, green + match, blue + match];
}

export function ShaderColorInput({ value, onChange }: ShaderColorInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedValue: [number, number, number] = [
    clamp01(Number(value[0])),
    clamp01(Number(value[1])),
    clamp01(Number(value[2])),
  ];
  const hexValue = rgbToHex(normalizedValue);
  const hsvValue = rgbToHsv(normalizedValue[0], normalizedValue[1], normalizedValue[2]);
  const hueColor = rgbToHex(hsvToRgb(hsvValue.hue, 1, 1));
  const rgbValues: [number, number, number] = [
    Math.round(normalizedValue[0] * 255),
    Math.round(normalizedValue[1] * 255),
    Math.round(normalizedValue[2] * 255),
  ];
  const rgbLabel = value
    .map((channel) => Math.round(Math.max(0, Math.min(1, Number(channel))) * 255))
    .join(' ');
  const commitHsv = (hue: number, saturation: number, nextValue: number) => {
    onChange(hsvToRgb(hue, clamp01(saturation), clamp01(nextValue)));
  };
  const setHue = (nextHue: number) => {
    commitHsv(nextHue, hsvValue.saturation, hsvValue.value);
  };
  const setSaturationValueFromPointer = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = (event.clientX - bounds.left) / bounds.width;
    const nextValue = 1 - (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.setPointerCapture(event.pointerId);
    commitHsv(hsvValue.hue, saturation, nextValue);
  };
  const setHex = (nextHex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(nextHex)) {
      return;
    }

    const red = parseInt(nextHex.slice(1, 3), 16);
    const green = parseInt(nextHex.slice(3, 5), 16);
    const blue = parseInt(nextHex.slice(5, 7), 16);
    onChange([red / 255, green / 255, blue / 255]);
  };

  return (
    <span className="color-picker-root" ref={rootRef}>
      <button
        type="button"
        className="color-picker-control"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="color-picker-swatch" style={{ backgroundColor: hexValue }} />
        <span className="color-picker-copy">
          <strong>{hexValue.toUpperCase()}</strong>
          <small>RGB {rgbLabel}</small>
        </span>
      </button>

      {isOpen ? (
        <span className="color-picker-popover">
          <span className="color-picker-spectrum-row">
            <span
              className="color-picker-spectrum"
              style={{ backgroundColor: hueColor }}
              onPointerDown={setSaturationValueFromPointer}
              onPointerMove={(event) => {
                if (event.buttons === 1) {
                  setSaturationValueFromPointer(event);
                }
              }}
            >
              <span
                className="color-picker-spectrum-handle"
                style={{
                  left: `${hsvValue.saturation * 100}%`,
                  top: `${(1 - hsvValue.value) * 100}%`,
                }}
              />
            </span>
            <label className="color-picker-hue-field">
              <span>Hue</span>
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(hsvValue.hue)}
                onChange={(event) => setHue(Number(event.target.value))}
                aria-label="Color hue"
              />
            </label>
          </span>
          <span className="color-picker-preview-row">
            <span className="color-picker-preview" style={{ backgroundColor: hexValue }} />
            <span className="color-picker-rgb-value">RGB {rgbValues.join(' ')}</span>
          </span>
          <label className="color-picker-hex-field">
            <span>Hex</span>
            <input
              className="text-field"
              value={hexValue.toUpperCase()}
              onChange={(event) => setHex(event.target.value)}
            />
          </label>
        </span>
      ) : null}
    </span>
  );
}
