import { waterVertexShader } from './waterShader.js';

// V0 painted-ocean material.
// Reuses P05 rest-position projective UVs, but samples a wide atlas
// (u_canon ∈ [−uPad, 1+uPad]) instead of discarding outside [0,1].
// Opaque. No Fresnel / Gerstner / chrome / footprint discard.

export const v0WaterFragmentShader = /* glsl */ `
  varying vec2 vCanonUv;
  varying float vProfileT;
  varying float vWorldZ;
  varying vec3 vWorldPos;

  uniform sampler2D uWaterTex;
  uniform float uPad;
  uniform float uV0;
  uniform float uFeatherPx;

  void main() {
    vec2 atlasUv;
    atlasUv.x = (vCanonUv.x + uPad) / (1.0 + 2.0 * uPad);
    atlasUv.y = vCanonUv.y;

    if (atlasUv.x < 0.0 || atlasUv.x > 1.0 || atlasUv.y < 0.0 || atlasUv.y > 1.0) {
      discard;
    }

    vec4 water = texture2D(uWaterTex, atlasUv);
    if (water.a < 0.04) discard;

    // Canon UV y=1 is poster top. Horizon sits at 1−V0. Discard sky texels only.
    float horizonUv = 1.0 - uV0;
    float feather = max(uFeatherPx, 0.0) / 1024.0;
    if (atlasUv.y > horizonUv + feather) discard;

    gl_FragColor = vec4(water.rgb, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createV0WaterMaterial({
  THREE,
  waterTex,
  canonViewMatrix,
  canonProjMatrix,
  uPad = 0.5,
}) {
  waterTex.wrapS = THREE.ClampToEdgeWrapping;
  waterTex.wrapT = THREE.ClampToEdgeWrapping;
  waterTex.minFilter = THREE.LinearFilter;
  waterTex.magFilter = THREE.LinearFilter;

  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTex: { value: waterTex },
      uCanonViewMatrix: { value: canonViewMatrix },
      uCanonProjMatrix: { value: canonProjMatrix },
      uPad: { value: uPad },
      uV0: { value: 855 / 1024 },
      uFeatherPx: { value: 2.0 },
    },
    vertexShader: waterVertexShader,
    fragmentShader: v0WaterFragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
}
