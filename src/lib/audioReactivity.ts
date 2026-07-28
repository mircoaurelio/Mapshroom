import type {
  ShaderAudioReactiveBinding,
  ShaderAudioReactiveBindingMap,
  ShaderAudioReactiveSignal,
  ShaderUniformMap,
  ShaderUniformValueMap,
} from '../types';
import type { AudioSectionSnapshot } from './audioSectionDetection';

export type AudioReactiveSignal = ShaderAudioReactiveSignal;

export type AudioCaptureSource = 'microphone' | 'system';
export type AudioBpmMode = 'auto' | 'manual';
export type AudioMappingMode = 'cohesive' | 'random';

export type AudioReactiveBinding = ShaderAudioReactiveBinding;
export type AudioReactiveBindingMap = ShaderAudioReactiveBindingMap;

export interface AudioReactivePreferences {
  modeEnabled: boolean;
  source: AudioCaptureSource;
  bpmMode: AudioBpmMode;
  mappingMode: AudioMappingMode;
  manualBpm: number;
  syncOffsetMs: number;
  bindingsByShaderId: Record<string, AudioReactiveBindingMap>;
}

export interface AudioReactiveFrame {
  active: boolean;
  level: number;
  bass: number;
  mid: number;
  high: number;
  beat: number;
  tempo: number;
  bpm: number;
  updatedAt: number;
  section: AudioSectionSnapshot;
}

export interface AudioReactiveRuntime {
  current: AudioReactiveFrame;
}

export interface AudioReactiveLiveMessage {
  type: 'frame' | 'stop';
  sessionId: string;
  frame?: AudioReactiveFrame;
}

const AUDIO_REACTIVE_STORAGE_PREFIX = 'mapshroom-v3:audio-reactive:';
const AUDIO_REACTIVE_CHANNEL_PREFIX = 'mapshroom-v3:audio-reactive-live:';

export const DEFAULT_AUDIO_REACTIVE_FRAME: AudioReactiveFrame = {
  active: false,
  level: 0,
  bass: 0,
  mid: 0,
  high: 0,
  beat: 0,
  tempo: 0,
  bpm: 120,
  updatedAt: 0,
  section: {
    runId: '',
    revision: 0,
    changedAtEpochMs: 0,
    confidence: 0,
    novelty: 0,
  },
};

export const DEFAULT_AUDIO_REACTIVE_PREFERENCES: AudioReactivePreferences = {
  modeEnabled: false,
  source: 'system',
  bpmMode: 'auto',
  mappingMode: 'cohesive',
  manualBpm: 120,
  syncOffsetMs: 0,
  bindingsByShaderId: {},
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isAudioReactiveSignal(value: unknown): value is AudioReactiveSignal {
  return (
    value === 'level' ||
    value === 'bass' ||
    value === 'mid' ||
    value === 'high' ||
    value === 'beat' ||
    value === 'tempo'
  );
}

function normalizeBinding(value: unknown): AudioReactiveBinding | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AudioReactiveBinding>;
  if (
    typeof candidate.min !== 'number' ||
    !Number.isFinite(candidate.min) ||
    typeof candidate.max !== 'number' ||
    !Number.isFinite(candidate.max) ||
    !isAudioReactiveSignal(candidate.signal)
  ) {
    return null;
  }

  return {
    enabled: candidate.enabled !== false,
    signal: candidate.signal,
    min: Math.min(candidate.min, candidate.max),
    max: Math.max(candidate.min, candidate.max),
  };
}

function normalizeBindingsByShaderId(
  value: unknown,
): Record<string, AudioReactiveBindingMap> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalized: Record<string, AudioReactiveBindingMap> = {};
  for (const [shaderId, shaderBindings] of Object.entries(value)) {
    if (!shaderBindings || typeof shaderBindings !== 'object') {
      continue;
    }

    const bindings: AudioReactiveBindingMap = {};
    for (const [uniformName, rawBinding] of Object.entries(shaderBindings)) {
      const binding = normalizeBinding(rawBinding);
      if (binding) {
        bindings[uniformName] = binding;
      }
    }

    if (Object.keys(bindings).length > 0) {
      normalized[shaderId] = bindings;
    }
  }

  return normalized;
}

export function createAudioReactiveRuntime(): AudioReactiveRuntime {
  return {
    current: { ...DEFAULT_AUDIO_REACTIVE_FRAME },
  };
}

export function getAudioReactiveStorageKey(sessionId: string): string {
  return `${AUDIO_REACTIVE_STORAGE_PREFIX}${sessionId}`;
}

export function getAudioReactiveChannelName(sessionId: string): string {
  return `${AUDIO_REACTIVE_CHANNEL_PREFIX}${sessionId}`;
}

export function loadAudioReactivePreferences(
  sessionId: string | null,
): AudioReactivePreferences {
  if (!sessionId || typeof window === 'undefined') {
    return { ...DEFAULT_AUDIO_REACTIVE_PREFERENCES, bindingsByShaderId: {} };
  }

  try {
    const serialized = window.localStorage.getItem(getAudioReactiveStorageKey(sessionId));
    if (!serialized) {
      return { ...DEFAULT_AUDIO_REACTIVE_PREFERENCES, bindingsByShaderId: {} };
    }

    const parsed = JSON.parse(serialized) as Partial<AudioReactivePreferences>;
    return {
      modeEnabled: parsed.modeEnabled === true,
      source: parsed.source === 'microphone' ? 'microphone' : 'system',
      bpmMode: parsed.bpmMode === 'manual' ? 'manual' : 'auto',
      mappingMode: parsed.mappingMode === 'random' ? 'random' : 'cohesive',
      manualBpm: clamp(
        typeof parsed.manualBpm === 'number' ? parsed.manualBpm : 120,
        40,
        240,
      ),
      syncOffsetMs: clamp(
        typeof parsed.syncOffsetMs === 'number' ? parsed.syncOffsetMs : 0,
        -500,
        500,
      ),
      bindingsByShaderId: normalizeBindingsByShaderId(parsed.bindingsByShaderId),
    };
  } catch {
    return { ...DEFAULT_AUDIO_REACTIVE_PREFERENCES, bindingsByShaderId: {} };
  }
}

export function saveAudioReactivePreferences(
  sessionId: string,
  preferences: AudioReactivePreferences,
): void {
  try {
    window.localStorage.setItem(
      getAudioReactiveStorageKey(sessionId),
      JSON.stringify(preferences),
    );
  } catch {
    // Audio reactivity is optional. A storage failure must never affect shader playback.
  }
}

export function getAudioReactiveSignalValue(
  frame: AudioReactiveFrame,
  signal: AudioReactiveSignal,
): number {
  return clamp(frame[signal], 0, 1);
}

export function resolveAudioReactiveValue({
  baseValue,
  binding,
  frame,
  integer = false,
}: {
  baseValue: number;
  binding: AudioReactiveBinding | null | undefined;
  frame: AudioReactiveFrame;
  integer?: boolean;
}): number {
  if (!binding?.enabled || !frame.active) {
    return baseValue;
  }

  const normalized = getAudioReactiveSignalValue(frame, binding.signal);
  const value = binding.min + (binding.max - binding.min) * normalized;
  return integer ? Math.round(value) : value;
}

function getNumericUniformEntries(
  uniformDefinitions: ShaderUniformMap,
): Array<[string, ShaderUniformMap[string]]> {
  return Object.entries(uniformDefinitions).filter(
    ([, definition]) => definition.type === 'float' || definition.type === 'int',
  );
}

const AUDIO_REACTIVE_SIGNAL_ORDER: AudioReactiveSignal[] = [
  'bass',
  'mid',
  'high',
  'level',
  'beat',
  'tempo',
];

type AudioReactiveSignalScores = Record<AudioReactiveSignal, number>;

type AudioReactiveAnalysisSource = 'annotation' | 'shader' | 'fallback';

export interface AudioReactiveUniformAnalysis {
  name: string;
  signal: AudioReactiveSignal;
  confidence: number;
  priority: number;
  safe: boolean;
  enabled: boolean;
  source: AudioReactiveAnalysisSource;
}

interface UniformUsageFacts {
  usageCount: number;
  timeCoupling: boolean;
  spatialFrequency: boolean;
  oscillatingPosition: boolean;
  displacement: boolean;
  masking: boolean;
  coloring: boolean;
}

interface AudioDirective {
  signal: AudioReactiveSignal | null;
  enabled: boolean;
}

function createSignalScores(): AudioReactiveSignalScores {
  return {
    level: 0,
    bass: 0,
    mid: 0,
    high: 0,
    beat: 0,
    tempo: 0,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readAudioDirective(shaderCode: string, name: string): AudioDirective | null {
  if (!shaderCode) {
    return null;
  }

  const declarationPattern = new RegExp(
    `\\buniform\\s+(?:float|int)\\s+${escapeRegExp(name)}\\s*;\\s*(?:\\/\\/\\s*([^\\r\\n]*))?`,
    'i',
  );
  const metadata = declarationPattern.exec(shaderCode)?.[1] ?? '';
  const audioMatch = metadata.match(
    /@audio\s+(level|bass|mid|high|beat|tempo|off|none)\b/i,
  );
  if (!audioMatch) {
    return null;
  }

  const value = audioMatch[1].toLowerCase();
  if (value === 'off' || value === 'none') {
    return { signal: null, enabled: false };
  }
  return { signal: value as AudioReactiveSignal, enabled: true };
}

function collectUniformUsageFacts(
  executableShaderCode: string,
  name: string,
): UniformUsageFacts {
  if (!executableShaderCode) {
    return {
      usageCount: 0,
      timeCoupling: false,
      spatialFrequency: false,
      oscillatingPosition: false,
      displacement: false,
      masking: false,
      coloring: false,
    };
  }

  const identifier = escapeRegExp(name);
  const occurrencePattern = new RegExp(`\\b${identifier}\\b`, 'gi');
  const windows: string[] = [];
  const statements: string[] = [];
  let usageCount = 0;
  let match: RegExpExecArray | null = null;

  while ((match = occurrencePattern.exec(executableShaderCode)) !== null) {
    usageCount += 1;
    if (windows.length < 12) {
      const start = Math.max(0, match.index - 180);
      const end = Math.min(executableShaderCode.length, match.index + name.length + 180);
      windows.push(executableShaderCode.slice(start, end).toLowerCase());
    }
    if (statements.length < 12) {
      const previousSemicolon = executableShaderCode.lastIndexOf(';', match.index - 1);
      const previousBrace = executableShaderCode.lastIndexOf('{', match.index - 1);
      const nextSemicolon = executableShaderCode.indexOf(';', match.index + name.length);
      const nextBrace = executableShaderCode.indexOf('}', match.index + name.length);
      const start = Math.max(previousSemicolon, previousBrace) + 1;
      const endCandidates = [nextSemicolon, nextBrace].filter((value) => value >= 0);
      const end =
        endCandidates.length > 0
          ? Math.min(...endCandidates) + 1
          : Math.min(executableShaderCode.length, match.index + name.length + 180);
      statements.push(executableShaderCode.slice(start, end).toLowerCase());
    }
  }

  const context = statements.length > 0 ? statements.join('\n') : windows.join('\n');
  const semanticName = name.toLowerCase();
  const timeCouplingPattern = new RegExp(
    `(?:\\btime\\b\\s*\\*\\s*\\b${identifier}\\b|\\b${identifier}\\b\\s*\\*\\s*\\btime\\b)`,
    'i',
  );
  const spatialFrequencyPattern = new RegExp(
    `(?:(?:\\buv\\b|\\bdist\\b|\\bangle\\b|\\bcoord\\w*\\b|\\bp\\b|\\bq\\b)\\s*\\*\\s*\\b${identifier}\\b|\\b${identifier}\\b\\s*\\*\\s*(?:\\buv\\b|\\bdist\\b|\\bangle\\b|\\bcoord\\w*\\b|\\bp\\b|\\bq\\b))`,
    'i',
  );
  const displacementPattern = new RegExp(
    `(?:(?:\\buv\\b|\\bcoord\\w*\\b|\\bp\\b|\\bq\\b)\\s*(?:\\+|-)=?[^;\\n]{0,100}\\b${identifier}\\b|\\b${identifier}\\b[^;\\n]{0,100}(?:\\buv\\b|\\bcoord\\w*\\b|\\bp\\b|\\bq\\b))`,
    'i',
  );
  const oscillatingPosition = statements.some(
    (statement) =>
      /\b\w*(?:pos|position|center|origin)\w*\b/.test(statement) &&
      /(?:sin|cos)\s*\([^)]*\btime\b/.test(statement) &&
      new RegExp(`(?:\\*\\s*\\b${identifier}\\b|\\b${identifier}\\b\\s*\\*)`, 'i').test(
        statement,
      ),
  );
  const maskingPattern = new RegExp(
    `\\b(?:smoothstep|step)\\s*\\([^;\\n]{0,140}\\b${identifier}\\b|\\b${identifier}\\b[^;\\n]{0,100}\\b(?:mask|alpha|discard|threshold|cutoff)\\b`,
    'i',
  );
  const coloringPattern = new RegExp(
    `\\b(?:mix|palette|color|colour|hue|saturation|light|glow|vec3)\\w*\\b[^;\\n]{0,140}\\b${identifier}\\b|\\b${identifier}\\b[^;\\n]{0,100}\\b(?:mix|palette|color|colour|hue|saturation|light|glow|vec3)\\w*\\b`,
    'i',
  );

  return {
    usageCount,
    timeCoupling: timeCouplingPattern.test(context),
    spatialFrequency: spatialFrequencyPattern.test(context),
    oscillatingPosition,
    displacement:
      displacementPattern.test(context) ||
      /(offset|displace|distort|warp|bend)/.test(semanticName),
    masking: maskingPattern.test(context),
    coloring: coloringPattern.test(context),
  };
}

function chooseHighestScoringSignal(scores: AudioReactiveSignalScores): {
  signal: AudioReactiveSignal;
  confidence: number;
  highestScore: number;
} {
  const ranked = AUDIO_REACTIVE_SIGNAL_ORDER.map((signal) => ({
    signal,
    score: scores[signal],
  })).sort((left, right) => right.score - left.score);
  const highest = ranked[0];
  const second = ranked[1];
  if (!highest || highest.score <= 0) {
    return { signal: 'level', confidence: 0, highestScore: 0 };
  }

  return {
    signal: highest.signal,
    confidence: clamp(
      (highest.score - (second?.score ?? 0)) / Math.max(1, highest.score),
      0,
      1,
    ),
    highestScore: highest.score,
  };
}

function analyzeUniform({
  name,
  definition,
  index,
  shaderCode,
  executableShaderCode,
}: {
  name: string;
  definition: ShaderUniformMap[string];
  index: number;
  shaderCode: string;
  executableShaderCode: string;
}): Omit<AudioReactiveUniformAnalysis, 'enabled'> & {
  explicitlyEnabled: boolean;
  explicitlyDisabled: boolean;
  recommended: boolean;
} {
  const directive = readAudioDirective(shaderCode, name);
  if (directive) {
    return {
      name,
      signal: directive.signal ?? 'level',
      confidence: 1,
      priority: directive.enabled ? 100 : -100,
      safe: directive.enabled,
      source: 'annotation',
      explicitlyEnabled: directive.enabled,
      explicitlyDisabled: !directive.enabled,
      recommended: directive.enabled,
    };
  }

  const semanticName = name.toLowerCase();
  const scores = createSignalScores();
  const facts = collectUniformUsageFacts(executableShaderCode, name);
  let semanticMatch = false;
  let priority = 1 + Math.min(2.5, facts.usageCount * 0.35);

  const score = (signal: AudioReactiveSignal, amount: number) => {
    scores[signal] += amount;
    semanticMatch = true;
  };

  if (/(beat|kick|pulse|impact|hit|trigger|strobe)/.test(semanticName)) {
    score('beat', 11);
    priority += 4;
  }
  if (/(speed|tempo|rate|time|phase|flow|velocity)/.test(semanticName)) {
    score('tempo', 10);
    priority += 4;
  }
  if (
    /(detail|grain|sharp|spark|edge|noise|flicker|freq|frequency|density|line|stripe|roughness|thickness|segments|steps)/.test(
      semanticName,
    )
  ) {
    score('high', 9);
    priority += 2.5;
  }
  if (
    /(distort|displace|warp|bend|offset|depth|height|bump|strength|amount|amplitude|intensity|power|force)/.test(
      semanticName,
    )
  ) {
    score('bass', 9);
    priority += 3;
  }
  if (/(scale|size|radius|zoom|width|range|spread)/.test(semanticName)) {
    score('bass', 6);
    priority += 2;
  }
  if (
    /(color|colour|hue|saturation|tone|palette|contrast|brightness|luminosity|light|glow|mix|blend|tint)/.test(
      semanticName,
    )
  ) {
    score('mid', 8);
    scores.level += 3;
    priority += 2;
  }
  if (/(volume|level|gain|opacity|alpha|exposure)/.test(semanticName)) {
    score('level', 9);
    priority += 2.5;
  }
  if (/(orbit|movement|travel|position|center|origin)/.test(semanticName)) {
    score('beat', 5);
    scores.bass += 3;
    priority += 1;
  }
  if (/(threshold|cutoff|tolerance|blackout|mask)/.test(semanticName)) {
    score('level', 5);
  }

  if (facts.timeCoupling) {
    scores.tempo += 9;
    priority += 3;
  }
  if (
    facts.spatialFrequency &&
    /(scale|freq|frequency|density|line|stripe|detail|grain|segments|steps)/.test(semanticName)
  ) {
    scores.high += 10;
    priority += 2.5;
  }
  if (facts.oscillatingPosition) {
    scores.beat += 11;
    priority += 3;
  }
  if (facts.displacement) {
    scores.bass += 7;
    priority += 2;
  }
  if (facts.coloring) {
    scores.mid += 3;
  }

  const riskyName =
    /(threshold|cutoff|tolerance|blackout|mask|seed|iteration|samples|camera|fov|aspect|resolution|center[xy]?|pos[xy])/.test(
      semanticName,
    );
  const fixedRange = definition.max <= definition.min;
  const safe = !riskyName && !fixedRange;
  if (riskyName) {
    priority -= 9;
  }
  if (facts.masking && !/(size|radius|width|softness)/.test(semanticName)) {
    priority -= 1.5;
  }
  if (definition.type === 'int') {
    priority -= 2.5;
  }
  if (fixedRange) {
    priority = -100;
  }

  const highest = chooseHighestScoringSignal(scores);
  const fallbackSignal =
    AUDIO_REACTIVE_SIGNAL_ORDER[index % AUDIO_REACTIVE_SIGNAL_ORDER.length] ?? 'level';
  const source: AudioReactiveAnalysisSource =
    semanticMatch || highest.highestScore > 0 ? 'shader' : 'fallback';

  return {
    name,
    signal: source === 'fallback' ? fallbackSignal : highest.signal,
    confidence: source === 'fallback' ? 0 : highest.confidence,
    priority,
    safe,
    source,
    explicitlyEnabled: false,
    explicitlyDisabled: false,
    recommended: safe && (highest.highestScore >= 5 || facts.usageCount >= 2),
  };
}

export function analyzeAudioReactiveUniforms({
  shaderCode = '',
  uniformDefinitions,
}: {
  shaderCode?: string;
  uniformDefinitions: ShaderUniformMap;
}): AudioReactiveUniformAnalysis[] {
  const entries = getNumericUniformEntries(uniformDefinitions);
  const executableShaderCode = shaderCode.replace(
    /\buniform\s+(?:float|int|vec3|bool)\s+[A-Za-z_][A-Za-z0-9_]*\s*;\s*(?:\/\/[^\r\n]*)?/g,
    ' ',
  );
  const candidates = entries.map(([name, definition], index) =>
    analyzeUniform({
      name,
      definition,
      index,
      shaderCode,
      executableShaderCode,
    }),
  );
  const activeLimit = Math.min(
    entries.length,
    entries.length <= 3 ? entries.length : Math.min(5, Math.max(3, Math.ceil(entries.length / 2))),
  );
  const selectedNames = new Set(
    candidates
      .filter((candidate) => candidate.explicitlyEnabled)
      .map((candidate) => candidate.name),
  );
  const signalCounts = new Map<AudioReactiveSignal, number>();
  for (const candidate of candidates) {
    if (candidate.explicitlyEnabled) {
      signalCounts.set(candidate.signal, (signalCounts.get(candidate.signal) ?? 0) + 1);
    }
  }

  const ranked = [...candidates]
    .filter(
      (candidate) =>
        !candidate.explicitlyEnabled &&
        !candidate.explicitlyDisabled &&
        candidate.safe &&
        candidate.recommended,
    )
    .sort((left, right) => right.priority - left.priority || right.confidence - left.confidence);

  for (const candidate of ranked) {
    if (selectedNames.size >= activeLimit) {
      break;
    }
    const signalLimit = candidate.signal === 'tempo' || candidate.signal === 'beat' ? 1 : 2;
    if ((signalCounts.get(candidate.signal) ?? 0) >= signalLimit) {
      continue;
    }
    selectedNames.add(candidate.name);
    signalCounts.set(candidate.signal, (signalCounts.get(candidate.signal) ?? 0) + 1);
  }

  if (selectedNames.size === 0 && activeLimit > 0) {
    const fallback = [...candidates]
      .filter((candidate) => candidate.safe && !candidate.explicitlyDisabled)
      .sort((left, right) => right.priority - left.priority)
      .slice(0, Math.min(activeLimit, 3));
    for (const candidate of fallback) {
      selectedNames.add(candidate.name);
    }
  }

  return candidates.map((candidate) => ({
    name: candidate.name,
    signal: candidate.signal,
    confidence: candidate.confidence,
    priority: candidate.priority,
    safe: candidate.safe,
    enabled: selectedNames.has(candidate.name),
    source: candidate.source,
  }));
}

function createBindingRange({
  definition,
  baseValue,
  signal,
  randomize,
}: {
  definition: ShaderUniformMap[string];
  baseValue: number;
  signal: AudioReactiveSignal;
  randomize: boolean;
}): Pick<AudioReactiveBinding, 'min' | 'max'> {
  const span = Math.max(0, definition.max - definition.min);
  const signalWindow: Record<AudioReactiveSignal, number> = {
    level: 0.34,
    bass: 0.42,
    mid: 0.34,
    high: 0.28,
    beat: 0.5,
    tempo: 0.32,
  };
  const randomScale = randomize ? 0.75 + Math.random() * 0.45 : 1;
  const windowSize = span * signalWindow[signal] * randomScale;
  const centerJitter = randomize ? (Math.random() - 0.5) * span * 0.18 : 0;
  const center = clamp(baseValue + centerJitter, definition.min, definition.max);
  let min = clamp(center - windowSize * 0.48, definition.min, definition.max);
  let max = clamp(center + windowSize * 0.52, definition.min, definition.max);

  if (definition.type === 'int') {
    min = Math.round(min);
    max = Math.round(max);
    if (min === max && definition.max > definition.min) {
      min = Math.max(definition.min, min - 1);
      max = Math.min(definition.max, max + 1);
    }
  }

  return { min: Math.min(min, max), max: Math.max(min, max) };
}

export function buildAudioReactiveBindings({
  shaderCode,
  uniformDefinitions,
  uniformValues,
  mode,
}: {
  shaderCode?: string;
  uniformDefinitions: ShaderUniformMap;
  uniformValues: ShaderUniformValueMap;
  mode: AudioMappingMode;
}): AudioReactiveBindingMap {
  const entries = getNumericUniformEntries(uniformDefinitions);
  const analyses =
    mode === 'cohesive'
      ? analyzeAudioReactiveUniforms({ shaderCode, uniformDefinitions })
      : [];
  const analysisByName = new Map(analyses.map((analysis) => [analysis.name, analysis]));
  const randomSignals: AudioReactiveSignal[] = ['bass', 'mid', 'high', 'level', 'beat', 'tempo'];
  for (let index = randomSignals.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [randomSignals[index], randomSignals[swapIndex]] = [
      randomSignals[swapIndex],
      randomSignals[index],
    ];
  }
  const bindings: AudioReactiveBindingMap = {};

  entries.forEach(([name, definition], index) => {
    const baseValue = Number(uniformValues[name] ?? definition.default);
    const analysis = analysisByName.get(name);
    const signal =
      mode === 'random'
        ? randomSignals[index % randomSignals.length]
        : analysis?.signal ?? AUDIO_REACTIVE_SIGNAL_ORDER[index % AUDIO_REACTIVE_SIGNAL_ORDER.length];
    bindings[name] = {
      enabled: mode === 'random' ? true : Boolean(analysis?.enabled),
      signal,
      ...createBindingRange({
        definition,
        baseValue,
        signal,
        randomize: mode === 'random',
      }),
    };
  });

  return bindings;
}

export function prefixAudioReactiveBindingKeys({
  bindings,
  namespace,
}: {
  bindings: AudioReactiveBindingMap;
  namespace: string;
}): AudioReactiveBindingMap {
  const prefixed: AudioReactiveBindingMap = {};
  for (const [name, binding] of Object.entries(bindings)) {
    prefixed[`${namespace}_${name}`] = binding;
  }
  return prefixed;
}
