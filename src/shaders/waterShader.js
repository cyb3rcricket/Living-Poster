import * as THREE from 'three';

// Prototype 05 / 05B — projective painted water.
// Rest-position canonical UVs. Footprint F0 hard / F1 soft / F2 local fill.

export const waterVertexShader = /* glsl */ `
  attribute vec3 aRestPosition;
  attribute float aProfileT;

  varying vec2 vCanonUv;
  varying float vProfileT;
  varying float vWorldZ;
  varying vec3 vWorldPos;

  uniform mat4 uCanonViewMatrix;
  uniform mat4 uCanonProjMatrix;

  void main() {
    vProfileT = aProfileT;
    vec4 restWorld = modelMatrix * vec4(aRestPosition, 1.0);
    vec4 canonClip = uCanonProjMatrix * uCanonViewMatrix * restWorld;
    vCanonUv = (canonClip.xy / canonClip.w) * 0.5 + 0.5;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldZ = worldPos.z;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const waterFragmentShader = /* glsl */ `
  varying vec2 vCanonUv;
  varying float vProfileT;
  varying float vWorldZ;
  varying vec3 vWorldPos;

  uniform sampler2D uWaterTex;
  uniform sampler2D uCitadelCard;
  uniform sampler2D uSentinelTex;
  uniform sampler2D uNeedlesTex;

  uniform float uOpacity;
  uniform float uV0;
  uniform float uFeatherPx;
  uniform float uFootprintOn;
  uniform float uRejectNeedles;
  uniform int uFootprintMode;
  uniform float uDilatePx;
  uniform float uAlive;
  uniform float uTime;
  uniform float uCanonWarpLock;
  uniform int uDebugMode;
  uniform float uZHorizon;
  uniform float uZNear;
  uniform float uTAlphaLo;
  uniform float uTAlphaHi;
  uniform int uTAlphaMode;

  float terrainAt(vec2 p) {
    float citadelA = texture2D(uCitadelCard, p).a;
    float sentinelA = texture2D(uSentinelTex, p).a;
    float needlesA = texture2D(uNeedlesTex, p).a;
    float t = max(citadelA, sentinelA);
    if (uRejectNeedles > 0.5) t = max(t, needlesA);
    return t;
  }

  float terrainDilated(vec2 uv) {
    float d = max(uDilatePx, 0.0) / 1024.0;
    float t = terrainAt(uv);
    t = max(t, terrainAt(uv + vec2(d, 0.0)));
    t = max(t, terrainAt(uv + vec2(-d, 0.0)));
    t = max(t, terrainAt(uv + vec2(0.0, d)));
    t = max(t, terrainAt(uv + vec2(0.0, -d)));
    if (d > 0.0001) {
      t = max(t, terrainAt(uv + vec2(d, d) * 0.7));
      t = max(t, terrainAt(uv + vec2(-d, d) * 0.7));
    }
    return t;
  }

  void main() {
    vec2 uv = vCanonUv;

    if (uAlive > 0.5 && uCanonWarpLock < 0.5) {
      float amp = 2.0 / 1024.0;
      uv += amp * vec2(
        sin(uTime * 0.50 + vWorldPos.x * 6.0 + vWorldPos.z * 2.0),
        cos(uTime * 0.37 + vWorldPos.z * 5.0)
      );
    }

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      if (uDebugMode == 2) {
        gl_FragColor = vec4(0.85, 0.12, 0.12, 0.90);
        #include <colorspace_fragment>
        return;
      }
      discard;
    }

    vec4 water = texture2D(uWaterTex, uv);
    if (water.a < 0.05) discard;

    float horizonUv = 1.0 - uV0;
    float feather = max(uFeatherPx, 0.0) / 1024.0;
    float horizonFade = 1.0;
    if (feather > 0.0001) {
      horizonFade = smoothstep(horizonUv, horizonUv - feather, uv.y);
    } else if (uv.y > horizonUv + 0.0005) {
      horizonFade = 0.0;
    }
    if (horizonFade <= 0.001) discard;

    float tFade = 1.0;
    if (uTAlphaMode == 1) {
      tFade = 1.0 - smoothstep(uTAlphaLo, uTAlphaHi, vProfileT);
    } else if (uTAlphaMode == 2) {
      tFade = smoothstep(uTAlphaLo, uTAlphaHi, vProfileT);
    }
    if (tFade <= 0.001) discard;

    float terrainHard = terrainAt(uv);
    float terrainSoft = terrainDilated(uv);
    float terrain = uFootprintMode <= 0 ? terrainHard : terrainSoft;
    float soft = smoothstep(0.06, 0.32, terrainSoft);
    bool hardReject = (uFootprintOn > 0.5) && (terrainHard > 0.12);

    if (uDebugMode == 1) {
      if (uFootprintOn > 0.5 && soft > 0.15) {
        gl_FragColor = vec4(0.95, 0.12, 0.72, mix(0.35, 0.92, soft));
        #include <colorspace_fragment>
        return;
      }
    }

    if (uFootprintOn > 0.5 && uDebugMode != 1) {
      if (uFootprintMode <= 0) {
        if (hardReject) discard;
      } else if (uFootprintMode == 1) {
        if (soft > 0.97) discard;
        horizonFade *= (1.0 - smoothstep(0.18, 0.90, soft));
        if (horizonFade <= 0.001) discard;
      } else {
        if (soft > 0.12) {
          vec2 dir = uv.x > 0.55
            ? vec2(-1.0, -0.20)
            : (uv.x < 0.30 ? vec2(1.0, -0.20) : vec2(0.0, -1.0));
          vec4 fill = water;
          bool found = false;
          for (int k = 1; k <= 8; k++) {
            vec2 suv = uv + dir * (float(k) * 3.0 / 1024.0);
            suv = clamp(suv, vec2(0.001), vec2(0.999));
            if (terrainDilated(suv) < 0.08) {
              vec4 s = texture2D(uWaterTex, suv);
              if (s.a > 0.05) {
                fill = s;
                found = true;
                break;
              }
            }
          }
          if (!found && soft > 0.55) discard;
          water = mix(water, fill, clamp(soft, 0.0, 1.0));
        }
      }
    }

    vec3 color = water.rgb;
    float alpha = water.a * horizonFade * tFade * uOpacity;

    if (uDebugMode == 2) {
      color = mix(vec3(uv.x, uv.y, 0.18), water.rgb, 0.25);
    } else if (uDebugMode == 3) {
      vec3 farCol = vec3(0.10, 0.55, 0.85);
      vec3 nearCol = vec3(0.95, 0.82, 0.28);
      color = mix(farCol, nearCol, clamp(vProfileT, 0.0, 1.0));
    }

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export const h4VertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const h4FragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uWaterTex;
  uniform sampler2D uCitadelCard;
  uniform sampler2D uSentinelTex;
  uniform float uV0;
  uniform float uH4Band;
  uniform float uOpacity;

  void main() {
    float vImg = 1.0 - vUv.y;
    if (vImg < uV0 || vImg > uV0 + uH4Band) discard;
    vec4 water = texture2D(uWaterTex, vUv);
    if (water.a < 0.05) discard;
    float citadelA = texture2D(uCitadelCard, vUv).a;
    float sentinelA = texture2D(uSentinelTex, vUv).a;
    if (max(citadelA, sentinelA) > 0.18) discard;
    float edge = smoothstep(uV0 + uH4Band, uV0 + uH4Band * 0.55, vImg);
    gl_FragColor = vec4(water.rgb, water.a * edge * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function createWaterMaterial({
  waterTex,
  citadelCard,
  sentinelTex,
  needlesTex,
  canonViewMatrix,
  canonProjMatrix,
}) {
  const wrap = (t) => {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
  };
  wrap(waterTex);
  wrap(citadelCard);
  wrap(sentinelTex);
  wrap(needlesTex);

  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTex: { value: waterTex },
      uCitadelCard: { value: citadelCard },
      uSentinelTex: { value: sentinelTex },
      uNeedlesTex: { value: needlesTex },
      uCanonViewMatrix: { value: canonViewMatrix },
      uCanonProjMatrix: { value: canonProjMatrix },
      uOpacity: { value: 1.0 },
      uV0: { value: 855 / 1024 },
      uFeatherPx: { value: 3.0 },
      uFootprintOn: { value: 1.0 },
      uRejectNeedles: { value: 0.0 },
      uFootprintMode: { value: 0 },
      uDilatePx: { value: 2.0 },
      uAlive: { value: 0.0 },
      uTime: { value: 0.0 },
      uCanonWarpLock: { value: 1.0 },
      uDebugMode: { value: 0 },
      uZHorizon: { value: 0.70 },
      uZNear: { value: 1.38 },
      uTAlphaLo: { value: 0.0 },
      uTAlphaHi: { value: 1.0 },
      uTAlphaMode: { value: 0 },
    },
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
}

export function createH4Material({ waterTex, citadelCard, sentinelTex }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTex: { value: waterTex },
      uCitadelCard: { value: citadelCard },
      uSentinelTex: { value: sentinelTex },
      uV0: { value: 855 / 1024 },
      uH4Band: { value: 0.040 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: h4VertexShader,
    fragmentShader: h4FragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}
