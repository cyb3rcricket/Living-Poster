import * as THREE from 'three';

export const depthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vNormal;
  varying float vDepth;

  uniform sampler2D uDepthMap;
  uniform float uTransition;
  uniform float uDepthStrength;
  uniform int uTechnique; // 0 = Mesh Displacement, 1 = Parallax Occlusion Mapping
  uniform float uOverscan;

  void main() {
    // Dynamic overscan: exactly 1.0 at t=0 (pixel-for-pixel match), smoothly blends to uOverscan during awakening
    float currentOverscan = mix(1.0, uOverscan, uTransition);
    vec2 scaledUv = (uv - 0.5) * (1.0 / currentOverscan) + 0.5;
    vUv = scaledUv;

    vec3 pos = position;
    float depthVal = texture2D(uDepthMap, scaledUv).r;
    vDepth = depthVal;

    // Technique 0: Mesh Vertex Displacement
    if (uTechnique == 0) {
      // Anchored at background (depth ~ 0.0 at Z=0.0):
      // Foreground crystals and water advance forward toward viewer (+Z),
      // ensuring geometry only expands outwards into perspective without edge exposure
      float zDisplacement = depthVal * uDepthStrength * uTransition;
      pos.z += zDisplacement;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormal = normalMatrix * normal;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const depthFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  varying vec3 vNormal;
  varying float vDepth;

  uniform sampler2D uTexture;
  uniform sampler2D uDepthMap;
  uniform float uTransition;
  uniform float uDepthStrength;
  uniform int uTechnique; // 0 = Mesh Displacement, 1 = Parallax Occlusion
  uniform int uDisplayMode; // 0 = Artwork, 1 = Flat Original, 2 = Depth Map
  uniform float uParallaxFactor;

  // Parallax Occlusion Mapping for screen-space raymarching
  vec2 parallaxRaymarch(vec2 uv, vec3 viewDir, float depthScale) {
    if (depthScale <= 0.0001 || uTransition <= 0.0001) {
      return uv;
    }

    // Number of depth slicing layers
    const float minLayers = 16.0;
    const float maxLayers = 36.0;
    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));
    
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;
    
    // Parallax delta UV per layer
    vec2 p = viewDir.xy / (viewDir.z + 0.00001) * (depthScale * uTransition);
    vec2 deltaUv = p / numLayers;
    
    vec2 currentUv = uv;
    float currentDepthMapValue = 1.0 - texture2D(uDepthMap, currentUv).r;
    
    // March through layers until we hit the height field
    for (int i = 0; i < 36; i++) {
      if (float(i) >= numLayers || currentLayerDepth >= currentDepthMapValue) {
        break;
      }
      currentUv -= deltaUv;
      currentDepthMapValue = 1.0 - texture2D(uDepthMap, currentUv).r;
      currentLayerDepth += layerDepth;
    }
    
    // Linear interpolation refinement between previous and current step
    vec2 prevUv = currentUv + deltaUv;
    float afterDepth = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = (1.0 - texture2D(uDepthMap, prevUv).r) - currentLayerDepth + layerDepth;
    
    float weight = afterDepth / (afterDepth - beforeDepth + 0.00001);
    vec2 finalUv = prevUv * weight + currentUv * (1.0 - weight);
    
    return clamp(finalUv, vec2(0.001), vec2(0.999));
  }

  void main() {
    // Mode 2: Visualize Depth Map
    if (uDisplayMode == 2) {
      float d = texture2D(uDepthMap, vUv).r;
      gl_FragColor = vec4(vec3(d), 1.0);
      return;
    }

    // Mode 1: Force Pure Flat Original
    if (uDisplayMode == 1 || uTransition <= 0.0001) {
      gl_FragColor = texture2D(uTexture, vUv);
      return;
    }

    // Mode 0: Awakened Artwork with Depth
    vec2 sampleUv = vUv;
    
    if (uTechnique == 1) {
      // Parallax Occlusion Mapping
      vec3 viewDir = normalize(vViewPosition);
      sampleUv = parallaxRaymarch(vUv, viewDir, uDepthStrength * 0.5);
    }

    // Conservative clamp to prevent edge bleeding outside texture
    sampleUv = clamp(sampleUv, vec2(0.001), vec2(0.999));
    vec4 color = texture2D(uTexture, sampleUv);

    gl_FragColor = color;
  }
`;

export function createDepthMaterial(posterTexture, depthTexture) {
  posterTexture.wrapS = THREE.ClampToEdgeWrapping;
  posterTexture.wrapT = THREE.ClampToEdgeWrapping;
  posterTexture.minFilter = THREE.LinearFilter;
  posterTexture.magFilter = THREE.LinearFilter;

  depthTexture.wrapS = THREE.ClampToEdgeWrapping;
  depthTexture.wrapT = THREE.ClampToEdgeWrapping;
  depthTexture.minFilter = THREE.LinearFilter;
  depthTexture.magFilter = THREE.LinearFilter;

  return new THREE.ShaderMaterial({
    vertexShader: depthVertexShader,
    fragmentShader: depthFragmentShader,
    uniforms: {
      uTexture: { value: posterTexture },
      uDepthMap: { value: depthTexture },
      uTransition: { value: 0.0 },
      uDepthStrength: { value: 0.08 },
      uTechnique: { value: 0 }, // 0 = Mesh, 1 = POM
      uDisplayMode: { value: 0 }, // 0 = Awakened, 1 = Flat, 2 = DepthMap
      uOverscan: { value: 1.04 }, // 4% overscan prevents edge tearing
      uParallaxFactor: { value: 1.0 },
    },
    side: THREE.DoubleSide,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
}
