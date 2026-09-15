// STUB — replace by env/move/perf agent
// Contract: createQualityController({ renderer, container })
//   → { level, pixelRatio, renderScale, setLevel(level), beginFrame(now), endFrame(), getStats(), apply() }

export function createQualityController({ renderer, container }) {
  const dpr = typeof window !== 'undefined'
    ? Math.min(window.devicePixelRatio || 1, 2)
    : 1;

  const quality = {
    level: 'auto',
    pixelRatio: dpr,
    renderScale: 1,
    _t0: 0,
    _frameMs: 0,
    setLevel(level) {
      const allowed = ['auto', 'high', 'medium', 'low'];
      this.level = allowed.includes(level) ? level : 'auto';
    },
    beginFrame(now) {
      this._t0 = now || (typeof performance !== 'undefined' ? performance.now() : 0);
    },
    endFrame() {
      const t1 = typeof performance !== 'undefined' ? performance.now() : this._t0;
      this._frameMs = t1 - this._t0;
    },
    getStats() {
      const frameMs = this._frameMs || 0;
      return {
        level: this.level,
        pixelRatio: this.pixelRatio,
        renderScale: this.renderScale,
        frameMs,
        fps: frameMs > 0 ? 1000 / frameMs : 0,
      };
    },
    apply() {},
  };

  return quality;
}
