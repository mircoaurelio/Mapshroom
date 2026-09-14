import { RangeInput } from './RangeInput';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
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
  const [selectedHue, setSelectedHue] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return;
    }

    const updatePlacement = () => {
      const control = rootRef.current;
      const popover = popoverRef.current;
      if (!control || !popover) {
        return;
      }

      const margin = 8;
      const gap = 6;
      const rect = control.getBoundingClientRect();
      const popoverWidth = Math.min(
        Math.max(rect.width, 242),
        286,
        Math.max(160, window.innerWidth - margin * 2),
      );
      const popoverHeight = popover.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
      const left = Math.min(
        Math.max(margin, rect.left),
        Math.max(margin, window.innerWidth - popoverWidth - margin),
      );
      const top = openUp
        ? Math.max(margin, rect.top - gap - popoverHeight)
        : Math.min(rect.bottom + gap, Math.max(margin, window.innerHeight - popoverHeight - margin));

      setPopoverStyle({
        top,
        left,
        width: popoverWidth,
      });
    };

    rootRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
    updatePlacement();
    const frameId = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) {
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
  // Achromatic RGB values have no hue; retain the user's hue for their next color edit.
  const hue = hsvValue.saturation > 0 ? hsvValue.hue % 360 : selectedHue;
  const hueColor = rgbToHex(hsvToRgb(hue, 1, 1));
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
    setSelectedHue(nextHue);
    commitHsv(nextHue, hsvValue.saturation, hsvValue.value);
  };
  const setSaturationValueFromPointer = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = (event.clientX - bounds.left) / bounds.width;
    const nextValue = 1 - (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedHue(hue);
    commitHsv(hue, saturation, nextValue);
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
        onClick={() => {
          setIsOpen((currentValue) => {
            const nextOpen = !currentValue;
            if (nextOpen) {
              rootRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
            }
            return nextOpen;
          });
        }}
      >
        <span className="color-picker-swatch" style={{ backgroundColor: hexValue }} />
        <span className="color-picker-copy">
          <strong>{hexValue.toUpperCase()}</strong>
          <small>RGB {rgbLabel}</small>
        </span>
      </button>

      {isOpen
        ? createPortal(
            <span
              ref={popoverRef}
              className="color-picker-popover"
              style={{
                ...(popoverStyle ?? { top: 0, left: 0 }),
                visibility: popoverStyle ? 'visible' : 'hidden',
              }}
            >
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
                  <RangeInput
                    min={0}
                    max={359}
                    step={1}
                    value={Math.round(hue)}
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
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
