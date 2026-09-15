// STUB — replace by env/move/perf agent
// Contract: createLivingPosterWorld({ THREE, renderer, container, camera, scene })
//   → { group, bounds, colliders, loadAssets(), update(dt, camera), dispose() }

export function createLivingPosterWorld({ THREE, renderer, container, camera, scene }) {
  const group = new THREE.Group();
  group.name = 'lpWorld';

  if (scene && scene.background == null) {
    scene.background = new THREE.Color(0x0b1020);
  }

  // Tight channel around P06 rest. Move/env agents own real colliders.
  const bounds = {
    min: { x: -0.45, y: -0.18, z: 1.70 },
    max: { x: 0.45, y: 0.18, z: 2.05 },
  };

  return {
    group,
    bounds,
    colliders: [],
    async loadAssets() {},
    update(_dt, _camera) {},
    dispose() {
      group.clear();
    },
  };
}
