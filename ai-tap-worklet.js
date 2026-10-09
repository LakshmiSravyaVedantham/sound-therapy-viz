/* AudioWorklet: copies mic / track audio (mono) to the AI worker in ~2048-sample chunks.
 * Output stays silent. Audio stays on this device. */
class AITap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.out = null; this.buf = new Float32Array(2048); this.n = 0;
    this.port.onmessage = (e) => { if (e.data && e.data.port) this.out = e.data.port; };
  }
  process(inputs) {
    const ch = inputs[0];
    if (this.out && ch && ch.length) {
      const a = ch[0], b = ch[1], len = a.length;
      for (let i = 0; i < len; i++) {
        this.buf[this.n++] = b ? 0.5 * (a[i] + b[i]) : a[i];
        if (this.n === this.buf.length) {
          this.out.postMessage(this.buf, [this.buf.buffer]);
          this.buf = new Float32Array(2048); this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("ai-tap", AITap);
