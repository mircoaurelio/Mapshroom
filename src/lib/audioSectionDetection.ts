export interface AudioSectionSnapshot {
  runId: string;
  revision: number;
  changedAtEpochMs: number;
  confidence: number;
  novelty: number;
}

export interface AudioSectionDetectorState {
  snapshot: AudioSectionSnapshot;
  sectionStartedAtMs: number;
  candidateStartedAtMs: number | null;
  changeArmed: boolean;
  samples: Array<{
    atMs: number;
    features: number[];
  }>;
  noveltyHistory: Array<{
    atMs: number;
    value: number;
  }>;
}

export interface AudioSectionDetectorSample {
  atMs: number;
  epochMs: number;
  features: number[];
  level: number;
  beat: number;
}

export interface AudioSectionDetectorOptions {
  minSectionMs: number;
  sensitivity?: number;
}

export interface AudioSectionDetectorUpdate {
  state: AudioSectionDetectorState;
  sectionChanged: boolean;
}

const RECENT_WINDOW_MS = 1_000;
const BASELINE_WINDOW_MS = 5_000;
const NOVELTY_HISTORY_MS = 18_000;
const MIN_RECENT_SAMPLES = 5;
const MIN_BASELINE_SAMPLES = 12;
const CANDIDATE_SUSTAIN_MS = 250;
const CANDIDATE_BEAT_WAIT_MS = 700;
const SILENCE_LEVEL = 0.035;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getMeanVector(samples: Array<{ features: number[] }>): number[] {
  const size = samples.reduce(
    (largest, sample) => Math.max(largest, sample.features.length),
    0,
  );
  if (size === 0 || samples.length === 0) {
    return [];
  }

  const mean = new Array<number>(size).fill(0);
  for (const sample of samples) {
    for (let index = 0; index < size; index += 1) {
      mean[index] += sample.features[index] ?? 0;
    }
  }

  return mean.map((value) => value / samples.length);
}

function getVectorDistance(left: number[], right: number[]): number {
  const size = Math.max(left.length, right.length);
  if (size === 0) {
    return 0;
  }

  let squaredDistance = 0;
  for (let index = 0; index < size; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    squaredDistance += difference * difference;
  }

  return Math.sqrt(squaredDistance / size);
}

function getAdaptiveThreshold(
  noveltyHistory: AudioSectionDetectorState['noveltyHistory'],
  sensitivity: number,
): number {
  const values = noveltyHistory.map((entry) => entry.value);
  const center = median(values);
  const deviation = median(values.map((value) => Math.abs(value - center)));
  const boundedSensitivity = clamp(sensitivity, 0, 1);
  // Byte-frequency spectra from real songs typically move by only a few
  // hundredths between verse/chorus/drop sections. The previous 0.15 floor
  // was reachable by synthetic tests but rejected normal music.
  const fixedFloor = 0.055 - boundedSensitivity * 0.035;
  return Math.max(
    fixedFloor,
    center + Math.max(0.008, deviation * 2.6),
  );
}

export function createAudioSectionDetector(
  runId: string,
  startedAtMs: number,
  startedAtEpochMs: number,
): AudioSectionDetectorState {
  return {
    snapshot: {
      runId,
      revision: 0,
      changedAtEpochMs: startedAtEpochMs,
      confidence: 0,
      novelty: 0,
    },
    sectionStartedAtMs: startedAtMs,
    candidateStartedAtMs: null,
    changeArmed: true,
    samples: [],
    noveltyHistory: [],
  };
}

export function updateAudioSectionDetector(
  currentState: AudioSectionDetectorState,
  sample: AudioSectionDetectorSample,
  options: AudioSectionDetectorOptions,
): AudioSectionDetectorUpdate {
  const samples = [
    ...currentState.samples,
    {
      atMs: sample.atMs,
      features: sample.features.map((value) =>
        Number.isFinite(value) ? clamp(value, 0, 1) : 0,
      ),
    },
  ].filter((entry) => sample.atMs - entry.atMs <= BASELINE_WINDOW_MS);
  const recentSamples = samples.filter(
    (entry) => sample.atMs - entry.atMs <= RECENT_WINDOW_MS,
  );
  const baselineSamples = samples.filter(
    (entry) =>
      sample.atMs - entry.atMs > RECENT_WINDOW_MS &&
      sample.atMs - entry.atMs <= BASELINE_WINDOW_MS,
  );

  if (
    recentSamples.length < MIN_RECENT_SAMPLES ||
    baselineSamples.length < MIN_BASELINE_SAMPLES
  ) {
    return {
      state: {
        ...currentState,
        samples,
        snapshot: {
          ...currentState.snapshot,
          confidence: 0,
          novelty: 0,
        },
      },
      sectionChanged: false,
    };
  }

  const novelty = getVectorDistance(
    getMeanVector(recentSamples),
    getMeanVector(baselineSamples),
  );
  const noveltyHistory = [
    ...currentState.noveltyHistory,
    { atMs: sample.atMs, value: novelty },
  ].filter((entry) => sample.atMs - entry.atMs <= NOVELTY_HISTORY_MS);
  const threshold = getAdaptiveThreshold(
    noveltyHistory.slice(0, Math.max(0, noveltyHistory.length - 1)),
    options.sensitivity ?? 0.55,
  );
  const confidence = clamp(
    (novelty - threshold * 0.72) / Math.max(0.04, threshold * 0.7),
    0,
    1,
  );
  const minimumSectionElapsed =
    sample.atMs - currentState.sectionStartedAtMs >=
    Math.max(1_000, options.minSectionMs);
  const changeArmed =
    currentState.changeArmed || novelty < threshold * 0.72;
  const isCandidate =
    changeArmed &&
    minimumSectionElapsed &&
    sample.level >= SILENCE_LEVEL &&
    novelty >= threshold;
  const candidateStartedAtMs = isCandidate
    ? currentState.candidateStartedAtMs ?? sample.atMs
    : novelty < threshold * 0.72
      ? null
      : currentState.candidateStartedAtMs;
  const candidateElapsedMs =
    candidateStartedAtMs === null ? 0 : sample.atMs - candidateStartedAtMs;
  const shouldConfirm =
    isCandidate &&
    candidateStartedAtMs !== null &&
    candidateElapsedMs >= CANDIDATE_SUSTAIN_MS &&
    (sample.beat >= 0.55 || candidateElapsedMs >= CANDIDATE_BEAT_WAIT_MS);

  if (!shouldConfirm) {
    return {
      state: {
        ...currentState,
        samples,
        noveltyHistory,
        candidateStartedAtMs,
        changeArmed,
        snapshot: {
          ...currentState.snapshot,
          confidence,
          novelty,
        },
      },
      sectionChanged: false,
    };
  }

  return {
    state: {
      ...currentState,
      samples,
      noveltyHistory,
      sectionStartedAtMs: sample.atMs,
      candidateStartedAtMs: null,
      changeArmed: false,
      snapshot: {
        ...currentState.snapshot,
        revision: currentState.snapshot.revision + 1,
        changedAtEpochMs: sample.epochMs,
        confidence,
        novelty,
      },
    },
    sectionChanged: true,
  };
}
