import * as THREE from 'three';

// ============================================================================
// Living Poster V1 — GPU Paint Melt Shader
// Viscous fluid coherent curl noise displacement and localized awakening shimmers.
// ============================================================================

export const paintMeltVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vDisplacedUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vLayerId;
  varying float vEmitterScore;
  varying float vWaterParam;

  uniform sampler2D uPoster;
  uniform sampler2D uSemanticMap;
  uniform float uTime;
  uniform float uAwaken;
  uniform float uMelt;
  uniform float uCurlStrength;
  uniform float uDisplacementScale;
  uniform vec3 uCameraPos;

  // --------------------------------------------------------------------------
  // Viscous divergence-free curl field for painterly fluid dynamics
  // Fast, numerically stable, zero division by zero or NaN risk.
  // --------------------------------------------------------------------------
  vec3 viscousCurlNoise(vec3 p) {
    float s1 = sin(p.y * 2.8 + p.z * 1.5);
    float c1 = cos(p.x * 2.8 + p.z * 1.5);
    float s2 = sin(p.z * 3.6 + p.x * 2.0);
    float c2 = cos(p.y * 3.6 + p.x * 2.0);
    float s3 = sin(p.x * 4.4 + p.y * 2.9);
    float c3 = cos(p.z * 4.4 + p.y * 2.9);
    vec3 c = vec3(s1 + c2, s2 + c3, s3 + c1) * 0.5;

    // Octave 2 for fine brush impasto ridges
    float s4 = sin(p.y * 7.5 - p.x * 5.2);
    float c4 = cos(p.x * 7.5 + p.z * 5.2);
    return c + vec3(s4, c4, -s4) * 0.22;
  }

  void main() {
    vUv = uv;

    // Sample semantic properties baked from layer textures
    vec4 sem = texture2D(uSemanticMap, uv);
    float targetZ = sem.r * 2.0; // 0 to 2.0 world units
    float layerId = sem.g * 6.0;
    float waterParam = sem.b;
    float emitterScore = sem.a;

    vLayerId = layerId;
    vEmitterScore = emitterScore;
    vWaterParam = waterParam;

    // 1. Compute Base Semantic Depth Progression
    float meltEased = smoothstep(0.0, 1.0, uMelt);
    float curZ = mix(0.0, targetZ * uDisplacementScale, meltEased);

    // 2. Canonical Perspective Ray Alignment
    // At CANON_Z = 2.0: x = (u - 0.5)*(2.0 - z), y = (v - 0.5)*(2.0 - z)
    // 100% pixel-perfect match to original 2D painting when viewed from (0, 0, 2.0)
    float d = 2.0 - curZ;
    vec3 basePos = vec3((uv.x - 0.5) * d, (uv.y - 0.5) * d, curZ);

    // 3. Viscous Coherent Fluid Displacement
    vec3 curl = viscousCurlNoise(vec3(uv * 3.5, uTime * 0.25));

    // Modulate fluidity by semantic layer
    float layerFluidity = 0.5;
    if (layerId < 0.5) {
      layerFluidity = 0.03; // Umbral Giant stays deep, massive & stable
    } else if (layerId >= 0.5 && layerId < 1.5) {
      layerFluidity = 0.85; // Ribbons undulate softly
    } else if (layerId >= 4.5) {
      layerFluidity = 1.25; // Water strokes loosen and flow
    } else if (layerId >= 2.5 && layerId < 4.5) {
      layerFluidity = 0.35; // Crystalline structures stretch along facets
    }

    // Swirl amplitude peaks mid-melt (melt ~ 0.5)
    float swirlIntensity = sin(meltEased * 3.141592) * uMelt * uCurlStrength * layerFluidity;

    // Awakening micro-wave (gentle breathing of paint surface)
    float awakenDrift = uAwaken * (1.0 - uMelt) * 0.003 * sin(uv.y * 22.0 + uTime * 2.2);

    vec3 fluidDisp = curl * swirlIntensity * 0.07;
    fluidDisp.z += awakenDrift;

    // Ocean specific forward-falling stretch
    if (layerId >= 4.5) {
      float fall = waterParam * meltEased * 0.16;
      basePos.y -= fall;
    }

    vec3 finalPos = basePos + fluidDisp;
    vec4 worldPos = modelMatrix * vec4(finalPos, 1.0);
    vWorldPos = worldPos.xyz;

    // Viscous paint shear on texture sampling UVs
    vDisplacedUv = uv + fluidDisp.xy * 0.20;

    // Surface normal estimation
    vec3 n = vec3(0.0, 0.0, 1.0);
    n.xy -= curl.xy * swirlIntensity * 0.45;
    vNormal = normalize(n);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const paintMeltFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vDisplacedUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vLayerId;
  varying float vEmitterScore;
  varying float vWaterParam;

  uniform sampler2D uPoster;
  uniform float uTime;
  uniform float uAwaken;
  uniform float uMelt;
  uniform vec3 uCameraPos;
  uniform float uThresholdFade;

  void main() {
    // Sample texture with viscous shear during melt, clamp to avoid border bleed
    vec2 sampleUv = clamp(mix(vUv, vDisplacedUv, uMelt * 0.65), vec2(0.001), vec2(0.999));
    vec4 baseTex = texture2D(uPoster, sampleUv);
    vec3 color = baseTex.rgb;

    // ------------------------------------------------------------------------
    // 1. Paint Awakening Localized Shimmers (1–4s)
    // ------------------------------------------------------------------------
    if (uAwaken > 0.001) {
      // (a) Cyan stroke shimmer
      bool isCyan = (baseTex.b > 0.40 && baseTex.g > 0.36 && baseTex.r < 0.40);
      if (isCyan) {
        float wave = sin(vUv.y * 38.0 - uTime * 3.8 + vUv.x * 24.0) * 0.5 + 0.5;
        float wave2 = cos(vUv.x * 26.0 + uTime * 2.2) * 0.5 + 0.5;
        vec3 cyanGlow = vec3(0.05, 0.95, 1.0) * (wave * wave2) * 0.50 * uAwaken;
        color += cyanGlow;
      }

      // (b) Magenta ribbon breathing
      if (vLayerId >= 0.5 && vLayerId < 1.5) {
        float pulse = sin(uTime * 2.2 + vUv.x * 7.5) * 0.5 + 0.5;
        vec3 magentaAura = vec3(1.0, 0.08, 0.65) * pulse * 0.30 * uAwaken;
        color += magentaAura;
      }

      // (c) Solar flare at Citadel peak bloom
      // Flare apex in poster UV is approx (0.648, 0.435)
      float dFlare = length(vUv - vec2(0.648, 0.435));
      if (dFlare < 0.16) {
        float flareIntensity = exp(-dFlare * 16.0) * (sin(uTime * 3.6) * 0.2 + 0.8) * uAwaken;
        vec3 goldLight = vec3(1.0, 0.88, 0.45) * flareIntensity * 0.85;
        color += goldLight;
      }

      // (d) Ocean strokes loosening
      if (vLayerId >= 4.5) {
        float waterShimmer = sin(vUv.x * 32.0 + uTime * 2.8 + vUv.y * 14.0) * 0.5 + 0.5;
        vec3 waterFoam = vec3(0.15, 0.68, 0.88) * waterShimmer * 0.25 * uAwaken;
        color += waterFoam;
      }

      // (e) Citadel highlight glints
      if (vLayerId >= 2.5 && vLayerId < 4.5 && vEmitterScore > 0.35) {
        vec3 viewDir = normalize(uCameraPos - vWorldPos);
        vec3 lightDir = normalize(vec3(0.4, 0.6, 0.8));
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(0.0, dot(vNormal, halfDir)), 20.0);
        color += vec3(0.92, 0.96, 1.0) * spec * 0.45 * uAwaken;
      }
    }

    // ------------------------------------------------------------------------
    // 2. Viscous Impasto Paint Sheen during Melt (4–8s)
    // ------------------------------------------------------------------------
    if (uMelt > 0.001) {
      vec3 viewDir = normalize(uCameraPos - vWorldPos);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      float paintSheen = pow(rim, 3.0) * uMelt * (1.0 - uMelt * 0.5);
      vec3 sheenColor = mix(vec3(0.1, 0.4, 0.7), vec3(0.9, 0.95, 1.0), vEmitterScore);
      color += sheenColor * paintSheen * 0.35;
    }

    // ------------------------------------------------------------------------
    // 3. Threshold Crossing Dissolve (Z < 1.78)
    // ------------------------------------------------------------------------
    float alpha = 1.0 - smoothstep(0.0, 1.0, uThresholdFade);
    if (alpha <= 0.001) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function createPaintMeltMaterial({ posterTexture, semanticTexture }) {
  posterTexture.wrapS = THREE.ClampToEdgeWrapping;
  posterTexture.wrapT = THREE.ClampToEdgeWrapping;
  posterTexture.minFilter = THREE.LinearFilter;
  posterTexture.magFilter = THREE.LinearFilter;

  semanticTexture.wrapS = THREE.ClampToEdgeWrapping;
  semanticTexture.wrapT = THREE.ClampToEdgeWrapping;
  semanticTexture.minFilter = THREE.LinearFilter;
  semanticTexture.magFilter = THREE.LinearFilter;

  return new THREE.ShaderMaterial({
    vertexShader: paintMeltVertexShader,
    fragmentShader: paintMeltFragmentShader,
    uniforms: {
      uPoster: { value: posterTexture },
      uSemanticMap: { value: semanticTexture },
      uTime: { value: 0.0 },
      uAwaken: { value: 0.0 },
      uMelt: { value: 0.0 },
      uCurlStrength: { value: 1.0 },
      uDisplacementScale: { value: 1.0 },
      uCameraPos: { value: new THREE.Vector3(0, 0, 2.0) },
      uThresholdFade: { value: 0.0 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}
