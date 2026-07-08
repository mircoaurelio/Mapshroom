import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatMidiMessage } from '../lib/midi/formatMidiMessage';
import { parseMidiMessage } from '../lib/midi/parseMidiMessage';
import {
  getShaderSliderUniforms,
  resolveUniformForFader,
  scaleMidiValueToUniform,
} from '../lib/midi/shaderUniformMapping';
import {
  isSmcMixerShiftButton,
  isPressedMidiButton,
  isUnambiguousSmcMixerShaderFader,
  isUnambiguousSmcMixerTimelineControl,
  resolveSmcMixerModeSwitch,
  resolveSmcMixerKnobIndex,
  resolveSmcMixerPitchBendFaderIndex,
  resolveSmcMixerShaderFaderIndex,
  resolveSmcMixerTimelineFaderIndex,
  resolveSmcMixerTransport,
} from '../lib/midi/smcMixerMapping';
import type {
  MidiConnectionStatus,
  MidiControllerMode,
  MidiEventLine,
  MidiFaderBinding,
  MidiTimelineTransportAction,
} from '../lib/midi/types';
import type { ShaderUniformMap, ShaderUniformValue } from '../types';

const MAX_EVENTS = 8;

function collectInputNames(access: MIDIAccess): string[] {
  const names: string[] = [];
  access.inputs.forEach((input) => {
    if (input.name && shouldUseMidiInput(input)) {
      names.push(input.name);
    }
  });
  return names;
}

function shouldUseMidiInput(input: MIDIInput): boolean {
  const name = input.name ?? '';
  return !name.includes('MIDIIN2');
}

interface UseMidiControllerOptions {
  enabled: boolean;
  mode: MidiControllerMode;
  uniformDefinitions: ShaderUniformMap;
  onUniformChange: (name: string, value: ShaderUniformValue) => void;
  onModeChange?: (mode: MidiControllerMode) => void;
  onTimelineTransport?: (action: MidiTimelineTransportAction) => void;
  onTimelineFaderChange?: (faderIndex: number, normalizedValue: number) => void;
  onTimelineMixVelocityChange?: (normalizedValue: number) => void;
}

export function useMidiController({
  enabled,
  mode,
  uniformDefinitions,
  onUniformChange,
  onModeChange,
  onTimelineTransport,
  onTimelineFaderChange,
  onTimelineMixVelocityChange,
}: UseMidiControllerOptions) {
  const [status, setStatus] = useState<MidiConnectionStatus>('idle');
  const [devices, setDevices] = useState<string[]>([]);
  const [events, setEvents] = useState<MidiEventLine[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const accessRef = useRef<MIDIAccess | null>(null);
  const attachedInputIdsRef = useRef<Set<string>>(new Set());
  const uniformDefinitionsRef = useRef(uniformDefinitions);
  const onUniformChangeRef = useRef(onUniformChange);
  const onModeChangeRef = useRef(onModeChange);
  const onTimelineTransportRef = useRef(onTimelineTransport);
  const onTimelineFaderChangeRef = useRef(onTimelineFaderChange);
  const onTimelineMixVelocityChangeRef = useRef(onTimelineMixVelocityChange);
  const modeRef = useRef(mode);
  const enabledRef = useRef(enabled);
  const shiftPressedRef = useRef(false);
  const mixModeCycleValueRef = useRef<number | null>(null);
  const manualMixSwitchValueRef = useRef<number | null>(null);

  useEffect(() => {
    uniformDefinitionsRef.current = uniformDefinitions;
    onUniformChangeRef.current = onUniformChange;
    onModeChangeRef.current = onModeChange;
    onTimelineTransportRef.current = onTimelineTransport;
    onTimelineFaderChangeRef.current = onTimelineFaderChange;
    onTimelineMixVelocityChangeRef.current = onTimelineMixVelocityChange;
    modeRef.current = mode;
    enabledRef.current = enabled;
  });

  const setControllerMode = useCallback((nextMode: MidiControllerMode) => {
    if (modeRef.current === nextMode) {
      return;
    }

    modeRef.current = nextMode;
    onModeChangeRef.current?.(nextMode);
  }, []);

  const applyShaderFader = useCallback((faderIndex: number, midiValue: number) => {
    const uniform = resolveUniformForFader(faderIndex, uniformDefinitionsRef.current);
    if (!uniform) {
      return;
    }

    const nextValue = scaleMidiValueToUniform(
      midiValue,
      uniform.min,
      uniform.max,
      uniform.type,
    );
    onUniformChangeRef.current(uniform.name, nextValue);
  }, []);

  const applyTimelineMixVelocity = useCallback((normalizedValue: number) => {
    onTimelineMixVelocityChangeRef.current?.(normalizedValue);
  }, []);

  const faderBindings = useMemo<MidiFaderBinding[]>(() => {
    if (mode === 'timeline-mixer') {
      return Array.from({ length: 8 }, (_, faderIndex) => ({
        faderIndex: faderIndex + 1,
        targetName: 'Mix speed',
      }));
    }

    const sliderUniforms = getShaderSliderUniforms(uniformDefinitions);
    return Array.from({ length: 8 }, (_, faderIndex) => ({
      faderIndex: faderIndex + 1,
      targetName: sliderUniforms[faderIndex] ?? null,
    }));
  }, [mode, uniformDefinitions]);

  const pushEvent = useCallback((data: Uint8Array, deviceName: string) => {
    const formatted = formatMidiMessage(data, deviceName);
    setEvents((currentEvents) =>
      [
        {
          ...formatted,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...currentEvents,
      ].slice(0, MAX_EVENTS),
    );
  }, []);

  const handleMidiData = useCallback(
    (data: Uint8Array, deviceName: string) => {
      if (!enabledRef.current) {
        return;
      }

      pushEvent(data, deviceName);

      const parsed = parseMidiMessage(data);

      if (parsed.kind === 'cc' || parsed.kind === 'note-on' || parsed.kind === 'note-off') {
        if (isSmcMixerShiftButton(parsed)) {
          shiftPressedRef.current = isPressedMidiButton(parsed);
          return;
        }

        if (isPressedMidiButton(parsed)) {
          const directModeSwitch = resolveSmcMixerModeSwitch(parsed);
          if (directModeSwitch) {
            setControllerMode(directModeSwitch);
            return;
          }
        }

        const transportAction = resolveSmcMixerTransport(parsed);
        if (shiftPressedRef.current && transportAction === 'select-left') {
          setControllerMode('shader-uniforms');
          return;
        }

        if (shiftPressedRef.current && transportAction === 'select-right') {
          setControllerMode('timeline-mixer');
          return;
        }
      }

      if (parsed.kind === 'cc' && parsed.channel === 1 && parsed.controller === 22) {
        setControllerMode('timeline-mixer');
        if (manualMixSwitchValueRef.current !== parsed.value) {
          manualMixSwitchValueRef.current = parsed.value;
          if (parsed.value === 1) {
            onTimelineTransportRef.current?.('manual-mix-on');
          } else if (parsed.value === 65) {
            onTimelineTransportRef.current?.('manual-mix-off');
          }
        }
        return;
      }

      if (parsed.kind === 'cc' && parsed.channel === 1 && parsed.controller === 23) {
        setControllerMode('timeline-mixer');
        if (parsed.value > 0 && mixModeCycleValueRef.current !== parsed.value) {
          mixModeCycleValueRef.current = parsed.value;
          onTimelineTransportRef.current?.('cycle-mix-mode');
        }
        return;
      }

      if (parsed.kind === 'cc' && isUnambiguousSmcMixerShaderFader(parsed)) {
        const shaderFaderIndex = resolveSmcMixerShaderFaderIndex(parsed);
        if (shaderFaderIndex !== null) {
          setControllerMode('shader-uniforms');
          applyShaderFader(shaderFaderIndex, parsed.value);
          return;
        }
      }

      if (modeRef.current === 'timeline-mixer') {
        if (parsed.kind === 'cc') {
          const faderIndex = resolveSmcMixerTimelineFaderIndex(parsed);
          if (faderIndex !== null) {
            applyTimelineMixVelocity(parsed.value / 127);
            return;
          }

          const knobIndex = resolveSmcMixerKnobIndex(parsed);
          if (knobIndex !== null) {
            applyTimelineMixVelocity(parsed.value / 127);
            return;
          }
        } else if (parsed.kind === 'pitch-bend') {
          const faderIndex = resolveSmcMixerPitchBendFaderIndex(parsed);
          if (faderIndex !== null) {
            onTimelineFaderChangeRef.current?.(faderIndex, parsed.value / 16383);
            return;
          }
        }

        if (parsed.kind === 'cc' || parsed.kind === 'note-on' || parsed.kind === 'note-off') {
          if (!isPressedMidiButton(parsed)) {
            return;
          }

          const transportAction = resolveSmcMixerTransport(parsed);
          if (transportAction) {
            onTimelineTransportRef.current?.(transportAction);
          }
        }

        return;
      }

      if (parsed.kind === 'cc') {
        const shaderFaderIndex = resolveSmcMixerShaderFaderIndex(parsed);
        const isShaderLayoutFader =
          shaderFaderIndex !== null &&
          (modeRef.current === 'shader-uniforms' ||
            (isUnambiguousSmcMixerShaderFader(parsed) &&
              !isUnambiguousSmcMixerTimelineControl(parsed)));

        if (isShaderLayoutFader) {
          setControllerMode('shader-uniforms');
          applyShaderFader(shaderFaderIndex, parsed.value);
          return;
        }
      }

      if (
        parsed.kind !== 'cc' &&
        parsed.kind !== 'pitch-bend' &&
        parsed.kind !== 'note-on' &&
        parsed.kind !== 'note-off'
      ) {
        return;
      }

      if (isUnambiguousSmcMixerTimelineControl(parsed)) {
        setControllerMode('timeline-mixer');

        if (parsed.kind === 'cc') {
          const faderIndex = resolveSmcMixerTimelineFaderIndex(parsed);
          if (faderIndex !== null) {
            applyTimelineMixVelocity(parsed.value / 127);
            return;
          }

          const knobIndex = resolveSmcMixerKnobIndex(parsed);
          if (knobIndex !== null) {
            applyTimelineMixVelocity(parsed.value / 127);
            return;
          }
        } else if (parsed.kind === 'pitch-bend') {
          const faderIndex = resolveSmcMixerPitchBendFaderIndex(parsed);
          if (faderIndex !== null) {
            onTimelineFaderChangeRef.current?.(faderIndex, parsed.value / 16383);
            return;
          }
        }

        if (parsed.kind === 'cc' || parsed.kind === 'note-on' || parsed.kind === 'note-off') {
          if (!isPressedMidiButton(parsed)) {
            return;
          }

          const transportAction = resolveSmcMixerTransport(parsed);
          if (transportAction) {
            onTimelineTransportRef.current?.(transportAction);
          }
        }

        return;
      }

      if (parsed.kind === 'cc' && modeRef.current === 'shader-uniforms') {
        const shaderFaderIndex = resolveSmcMixerShaderFaderIndex(parsed);
        if (shaderFaderIndex !== null) {
          applyShaderFader(shaderFaderIndex, parsed.value);
        }
      }
    },
    [applyShaderFader, applyTimelineMixVelocity, pushEvent, setControllerMode],
  );

  const detachInputs = useCallback(async () => {
    const access = accessRef.current;
    if (access) {
      access.onstatechange = null;
    }

    const inputIds = [...attachedInputIdsRef.current];
    attachedInputIdsRef.current.clear();

    await Promise.all(
      inputIds.map(async (inputId) => {
        const input = access?.inputs.get(inputId);
        if (!input) {
          return;
        }

        input.onmidimessage = null;
        try {
          await input.close();
        } catch {
          // Port may already be closed by the browser or OS.
        }
      }),
    );
  }, []);

  const attachInput = useCallback(
    (input: MIDIInput) => {
      if (!shouldUseMidiInput(input) || attachedInputIdsRef.current.has(input.id)) {
        return;
      }

      attachedInputIdsRef.current.add(input.id);
      input.onmidimessage = (event: MIDIMessageEvent) => {
        if (!event.data) {
          return;
        }

        handleMidiData(event.data, input.name || 'Unknown device');
      };
    },
    [handleMidiData],
  );

  const refreshInputs = useCallback(
    (access: MIDIAccess) => {
      access.inputs.forEach((input) => {
        attachInput(input);
      });
      setDevices(collectInputNames(access));
    },
    [attachInput],
  );

  const disconnect = useCallback(() => {
    void detachInputs().finally(() => {
      accessRef.current = null;
      setDevices([]);
      setEvents([]);
      setStatus('idle');
      setErrorMessage('');
    });
  }, [detachInputs]);

  const connect = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setStatus('unsupported');
      setErrorMessage('Web MIDI is not available. Use Chrome or Edge on desktop.');
      return;
    }

    try {
      await detachInputs();
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      refreshInputs(access);

      access.onstatechange = (event) => {
        const port = event.port;
        if (port?.type === 'input') {
          attachInput(port as MIDIInput);
          setDevices(collectInputNames(access));
        }
      };

      const inputNames = collectInputNames(access);
      setStatus('connected');
      setErrorMessage(
        inputNames.length === 0
          ? 'Connected, but no MIDI inputs found. Plug in the mixer and toggle MIDI again.'
          : '',
      );
    } catch (error) {
      setStatus('denied');
      setErrorMessage(error instanceof Error ? error.message : 'Could not access MIDI devices.');
    }
  }, [attachInput, detachInputs, refreshInputs]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    // Synchronizes with the external Web MIDI system; state updates land in
    // the async callbacks of the connection handshake.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void connect();
  }, [connect, disconnect, enabled]);

  useEffect(() => {
    return () => {
      void detachInputs();
    };
  }, [detachInputs]);

  return {
    status,
    devices,
    events,
    errorMessage,
    faderBindings,
    mode,
    clearEvents,
  };
}
