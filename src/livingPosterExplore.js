// STUB — replace by env/move/perf agent
// Contract: createExplorer({ camera, bounds, colliders, canvas })
//   → { enabled, enable(), disable(), update(dt), dispose(), setEnabled(bool) }

export function createExplorer({ camera, bounds, colliders, canvas }) {
  const explorer = {
    enabled: false,
    enable() {
      this.enabled = true;
    },
    disable() {
      this.enabled = false;
    },
    setEnabled(on) {
      this.enabled = !!on;
    },
    update(_dt) {},
    dispose() {
      this.enabled = false;
    },
  };
  return explorer;
}
