import { waterVertexShader } from './waterShader.js';

// V0 painted-ocean material.
// Reuses P05 rest-position projective UVs, but samples a wide atlas
// (u_canon ∈ [−uPad, 1+uPad]) instead of discarding outside [0,1].
// Opaque. No Fresnel / Gerstner / chrome / footprint discard.
// Outside the atlas: low-frequency indigo continuation (not clamp-stretch).
// Horizon: wide atmospheric feather so the H1 far edge is not a card.

export const v0WaterFragmentShader = /* glsl */ `
  varying vec2 vCanonUv;
  varying float vProfileT;
  varying float vWorldZ;
  varying vec3 vWorldPos;

  uniform sampler2D uWaterTex;
  uniform sampler2D uCitadelTex;
  uniform sampler2D uSentinelTex;
  uniform float uPad;
  uniform float uV0;
  uniform float uFeatherPx;
  uniform float uHasContact;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 atlasUv;
    atlasUv.x = (vCanonUv.x + uPad) / (1.0 + 2.0 * uPad);
    atlasUv.y = vCanonUv.y;

    vec2 sampleUv = atlasUv;
    sampleUv.x = clamp(sampleUv.x, 0.0015, 0.9985);
    sampleUv.y = clamp(sampleUv.y, 0.0015, 0.9985);

    vec4 water = texture2D(uWaterTex, sampleUv);
    vec3 deep = vec3(0.035, 0.10, 0.24);
    vec3 atmos = vec3(0.055, 0.10, 0.20);

    float outX = max(0.0, max(-atlasUv.x, atlasUv.x - 1.0));
    float outY = max(0.0, max(-atlasUv.y, atlasUv.y - 1.0));
    float outside = max(outX, outY);
    if (outside > 0.0) {
      float n = hash21(vWorldPos.xz * 3.1);
      vec3 wing = mix(deep, vec3(0.07, 0.22, 0.40), 0.35 + 0.25 * n);
      water.rgb = mix(water.rgb, wing, smoothstep(0.0, 0.10, outside));
      water.a = max(water.a, 0.9);
    }

    if (water.a < 0.04) {
      water.rgb = mix(deep, atmos, clamp(vProfileT, 0.0, 1.0));
      water.a = 1.0;
    }

    // Canon UV y=1 is poster top. Horizon sits at 1−V0.
    // Feather far water into atmosphere so the H1 far row is not a ruler edge.
    float horizonUv = 1.0 - uV0;
    float feather = max(uFeatherPx, 8.0) / 1024.0;
    float hazeAmt = smoothstep(horizonUv - feather * 2.8, horizonUv + feather * 0.6, atlasUv.y);
    float distHaze = pow(clamp(1.0 - vProfileT, 0.0, 1.0), 1.45);
    water.rgb = mix(water.rgb, atmos, hazeAmt * 0.82 + distHaze * 0.18 * (1.0 - hazeAmt));

    if (atlasUv.y > horizonUv + feather * 1.15) discard;

    if (uHasContact > 0.5) {
      float cA = texture2D(uCitadelTex, clamp(vCanonUv, vec2(0.001), vec2(0.999))).a;
      float sA = texture2D(uSentinelTex, clamp(vCanonUv, vec2(0.001), vec2(0.999))).a;
      float occ = max(cA, sA);
      float foot = 1.0 - smoothstep(0.018, 0.155, vCanonUv.y);
      float ring = smoothstep(0.00, 0.20, occ) * smoothstep(0.78, 0.16, occ);
      float n = hash21(vWorldPos.xz * 11.0 + vWorldPos.y);
      vec3 foam = vec3(0.42 + n * 0.18, 0.82, 0.88);
      water.rgb = mix(water.rgb, foam, ring * foot * (0.38 + 0.20 * n));
    }

    gl_FragColor = vec4(water.rgb, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createV0WaterMaterial({
  THREE,
  waterTex,
  citadelTex = null,
  sentinelTex = null,
  canonViewMatrix,
  canonProjMatrix,
  uPad = 0.5,
}) {
  waterTex.wrapS = THREE.ClampToEdgeWrapping;
  waterTex.wrapT = THREE.ClampToEdgeWrapping;
  waterTex.minFilter = THREE.LinearFilter;
  waterTex.magFilter = THREE.LinearFilter;

  const dummy = waterTex;

  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTex: { value: waterTex },
      uCitadelTex: { value: citadelTex || dummy },
      uSentinelTex: { value: sentinelTex || dummy },
      uCanonViewMatrix: { value: canonViewMatrix },
      uCanonProjMatrix: { value: canonProjMatrix },
      uPad: { value: uPad },
      uV0: { value: 855 / 1024 },
      uFeatherPx: { value: 36.0 },
      uHasContact: { value: citadelTex ? 1.0 : 0.0 },
    },
    vertexShader: waterVertexShader,
    fragmentShader: v0WaterFragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
}
