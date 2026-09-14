interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
interface PendingSample { query: WebGLQuery; tag: string }

/** Bounded, asynchronous GPU queries; never wait for results or call finish(). */
export class GpuFrameTimer {
  private ext: TimerExtension | null;
  private pending: PendingSample[] = [];
  private active: PendingSample | null = null;
  private gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }
  get available() { return this.ext !== null; }
  poll(): Array<{ tag: string; ms: number }> {
    const { gl, ext } = this;
    if (!ext || gl.isContextLost()) return [];
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
      this.pending.forEach(({ query }) => gl.deleteQuery(query));
      this.pending = [];
      return [];
    }
    const samples = [];
    while (this.pending.length && gl.getQueryParameter(this.pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
      const { query, tag } = this.pending.shift()!;
      const ms = Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1e6;
      gl.deleteQuery(query);
      if (Number.isFinite(ms) && ms > 0) samples.push({ tag, ms });
    }
    return samples;
  }
  begin(tag: string) {
    if (!this.ext || this.active || this.pending.length >= 4 || this.gl.isContextLost()) return;
    const query = this.gl.createQuery();
    if (!query) return;
    this.active = { query, tag };
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
  }
  end() {
    if (!this.active || !this.ext) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }
  dispose() {
    this.end();
    this.pending.forEach(({ query }) => this.gl.deleteQuery(query));
    this.pending = [];
  }
}
