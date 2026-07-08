interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

type MIDIInputMap = ReadonlyMap<string, MIDIInput>;
type MIDIOutputMap = ReadonlyMap<string, MIDIOutput>;

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap;
  readonly outputs: MIDIOutputMap;
  readonly sysexEnabled: boolean;
  onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => void) | null;
}

interface MIDIPort extends EventTarget {
  readonly id: string;
  readonly manufacturer?: string;
  readonly name?: string;
  readonly type: 'input' | 'output';
  readonly version?: string;
  readonly connection: 'open' | 'closed' | 'pending';
  onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => void) | null;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

interface MIDIInput extends MIDIPort {
  readonly type: 'input';
  onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => void) | null;
}

interface MIDIOutput extends MIDIPort {
  readonly type: 'output';
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array;
}

interface MIDIConnectionEvent extends Event {
  readonly port: MIDIPort;
}

interface Navigator {
  requestMIDIAccess?(options?: MIDIOptions): Promise<MIDIAccess>;
}
