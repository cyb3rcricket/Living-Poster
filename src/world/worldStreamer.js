import * as THREE from 'three';
import {
  createCrystalSpireGeometry,
  createCrystalBladeGeometry,
  createCrystalClusterGroup,
  mergeCrystalGeometries,
  CRYSTAL_PALETTE,
} from './crystalGenerator.js';

// ============================================================================
// Living Poster V1 — Progressive World Streamer
// Deterministic forward corridor chunks that construct themselves progressively
// just ahead of the camera lens:
//   0%: unformed / haze
//   20%: floating painted fragments
//   40%: wire / silhouettes / crystalline strokes
//   60%: low-poly geometry grows vertically
//   80%: painterly projective texture & vertex color
//   100%: finished environment
// ============================================================================

export const CHUNK_BOUNDS = [
  { id: 0, name: 'Gateway', minZ: 1.6, maxZ: 2.1, minX: -0.8, maxX: 0.8 },
  { id: 1, name: 'Near Sea', minZ: 0.8, maxZ: 1.6, minX: -1.2, maxX: 1.2 },
  { id: 2, name: 'Mid Needles', minZ: 0.0, maxZ: 0.8, minX: -1.5, maxX: 1.5 },
  { id: 3, name: 'Atmosphere', minZ: -1.8, maxZ: 0.0, minX: -1.8, maxX: 1.8 },
];

const CHUNK_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float aGrowthPhase;
  attribute vec3 aFragmentOffset;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vProgress;

  uniform float uProgress;
  uniform float uTime;

  void main() {
    vColor = color;
    vProgress = uProgress;

    vec3 pos = position;

    // 0% - 20%: Unformed
    if (uProgress < 0.10) {
      pos = vec3(0.0);
    }
    // 20% - 40%: Floating painted fragments
    else if (uProgress < 0.40) {
      float tFrag = (uProgress - 0.10) / 0.30;
      vec3 floatOffset = aFragmentOffset * (1.0 - tFrag) * 0.6;
      floatOffset.y += sin(uTime * 2.5 + position.x * 6.0) * 0.015;
      pos += floatOffset;
      pos = mix(vec3(pos.x, -0.25, pos.z), pos, tFrag * 0.5);
    }
    // 40% - 70%: Low-poly geometry grows vertically from water level (-0.22)
    else if (uProgress < 0.70) {
      float tGrow = (uProgress - 0.40) / 0.30;
      float vertEased = smoothstep(0.0, 1.0, tGrow);
      float yReach = mix(-0.25, pos.y, clamp((vertEased - aGrowthPhase * 0.3) / 0.7, 0.0, 1.0));
      pos.y = yReach;
    }
    // 70% - 100%: Finished environment settling into place
    else {
      pos.y = mix(pos.y, pos.y, 1.0);
    }

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CHUNK_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vProgress;

  uniform float uProgress;
  uniform float uDebugColors; // Key G toggle
  uniform vec3 uCameraPos;
  uniform float uLightingStrength;

  void main() {
    if (uProgress < 0.08) discard;

    // Debug Color Visualization (Key G)
    if (uDebugColors > 0.5) {
      vec3 debugCol;
      if (uProgress < 0.20) debugCol = vec3(0.05, 0.08, 0.18);        // Unborn (indigo haze)
      else if (uProgress < 0.40) debugCol = vec3(0.85, 0.10, 0.65);   // Fragment (magenta)
      else if (uProgress < 0.60) debugCol = vec3(0.00, 0.90, 0.95);   // Forming (cyan wire/silhouette)
      else if (uProgress < 0.80) debugCol = vec3(1.00, 0.82, 0.25);   // Texturing (gold/aquamarine)
      else debugCol = vec3(0.20, 0.75, 1.00);                          // Complete (electric sapphire)
      gl_FragColor = vec4(debugCol, 1.0);
      return;
    }

    // Finished Painterly Crystal Shading
    vec3 lightDir = normalize(vec3(0.355, 0.342, 0.965) - vWorldPos);
    vec3 viewDir = normalize(uCameraPos - vWorldPos);

    float nDotL = max(0.0, dot(vNormal, lightDir));
    vec3 flareGlint = vec3(1.0, 0.85, 0.50) * pow(nDotL, 4.0) * 0.45;

    // Cyan upward bounce from crystal sea
    float seaBounce = max(0.0, -vNormal.y) * 0.35;
    vec3 cyanBounce = vec3(0.0, 0.9, 1.0) * seaBounce;

    vec3 ambient = vec3(0.06, 0.11, 0.20);
    vec3 litColor = vColor * (ambient + vec3(0.72)) + flareGlint + cyanBounce;

    // Crystalline edge highlight glint during formation (40-80%)
    if (uProgress < 0.85) {
      float rim = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 2.5);
      vec3 wireGlow = vec3(0.0, 0.95, 1.0) * rim * (1.0 - smoothstep(0.4, 0.85, uProgress));
      litColor += wireGlow;
    }

    float alpha = smoothstep(0.08, 0.30, uProgress);
    gl_FragColor = vec4(litColor, alpha);
    #include <colorspace_fragment>
  }
`;

export class WorldStreamer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'lp-world-streamer';
    if (scene) scene.add(this.group);

    this.chunks = [];
    this.debugColors = false;
    this.showBoundaries = false;
    this.boundaryLines = null;

    this._initChunks();
    this._initBoundaries();
  }

  _initChunks() {
    // Build procedural crystal formations per chunk
    for (let c = 0; c < CHUNK_BOUNDS.length; c++) {
      const b = CHUNK_BOUNDS[c];
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `lp-chunk-${c}-${b.name}`;

      // Populate deterministic crystal clusters flanking the central corridor
      const count = c === 0 ? 5 : (c === 1 ? 8 : (c === 2 ? 10 : 7));
      const zSpan = b.maxZ - b.minZ;

      for (let i = 0; i < count; i++) {
        // Place clusters along left and right flanks, keeping central channel clear
        const side = i % 2 === 0 ? -1 : 1;
        const xOffset = side * (0.28 + (i * 0.13) % 0.65);
        const zOffset = b.minZ + (i / count) * zSpan;

        const cluster = createCrystalClusterGroup({
          count: 5 + (i % 4),
          radius: 0.18 + (c * 0.05),
          heightRange: [0.3 + c * 0.1, 0.8 + c * 0.25],
          seed: 100 * c + i * 19,
        });
        cluster.position.set(xOffset, -0.22, zOffset);
        chunkGroup.add(cluster);
      }

      // Merge into a single BufferGeometry for optimal performance
      const mergedGeo = mergeCrystalGeometries(chunkGroup);
      chunkGroup.clear();

      const mat = new THREE.ShaderMaterial({
        vertexShader: CHUNK_VERT,
        fragmentShader: CHUNK_FRAG,
        uniforms: {
          uProgress: { value: 0.0 },
          uTime: { value: 0.0 },
          uDebugColors: { value: 0.0 },
          uCameraPos: { value: new THREE.Vector3(0, 0, 2) },
          uLightingStrength: { value: 0.35 },
        },
        transparent: true,
        depthTest: true,
        depthWrite: true,
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(mergedGeo, mat);
      mesh.name = `lp-chunk-mesh-${c}`;
      mesh.renderOrder = 4;
      this.group.add(mesh);

      this.chunks.push({
        id: c,
        bounds: b,
        mesh,
        material: mat,
        progress: 0.0,
      });
    }
  }

  _initBoundaries() {
    // Wireframe bounding boxes for chunk boundary visualization (Key C)
    const linePositions = [];
    for (const b of CHUNK_BOUNDS) {
      const y0 = -0.25, y1 = 0.85;
      const x0 = b.minX, x1 = b.maxX;
      const z0 = b.minZ, z1 = b.maxZ;

      // Bottom rect
      linePositions.push(x0, y0, z0, x1, y0, z0);
      linePositions.push(x1, y0, z0, x1, y0, z1);
      linePositions.push(x1, y0, z1, x0, y0, z1);
      linePositions.push(x0, y0, z1, x0, y0, z0);

      // Top rect
      linePositions.push(x0, y1, z0, x1, y1, z0);
      linePositions.push(x1, y1, z0, x1, y1, z1);
      linePositions.push(x1, y1, z1, x0, y1, z1);
      linePositions.push(x0, y1, z1, x0, y1, z0);

      // Vertical edges
      linePositions.push(x0, y0, z0, x0, y1, z0);
      linePositions.push(x1, y0, z0, x1, y1, z0);
      linePositions.push(x1, y0, z1, x1, y1, z1);
      linePositions.push(x0, y0, z1, x0, y1, z1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.7,
    });

    this.boundaryLines = new THREE.LineSegments(geo, mat);
    this.boundaryLines.name = 'lp-chunk-boundaries';
    this.boundaryLines.visible = false;
    this.group.add(this.boundaryLines);
  }

  toggleDebugColors() {
    this.debugColors = !this.debugColors;
    const val = this.debugColors ? 1.0 : 0.0;
    this.chunks.forEach((c) => {
      c.material.uniforms.uDebugColors.value = val;
    });
    return this.debugColors;
  }

  toggleBoundaries() {
    this.showBoundaries = !this.showBoundaries;
    if (this.boundaryLines) {
      this.boundaryLines.visible = this.showBoundaries;
    }
    return this.showBoundaries;
  }

  /**
   * Updates progressive reveal based on camera position and elapsed journey time.
   */
  update(elapsed, camera, immediate = false) {
    const timeSec = elapsed;
    const camPos = camera ? camera.position : new THREE.Vector3(0, 0, 2);

    for (const chunk of this.chunks) {
      const b = chunk.bounds;
      let targetProgress = 0;

      if (timeSec < 4.0) {
        // Pre-melt: unformed
        targetProgress = 0.0;
      } else if (timeSec < 8.0) {
        // 4–8s (Melt): Chunk 0 constructs ahead, Chunk 1 begins fragments
        const tMelt = (timeSec - 4.0) / 4.0;
        if (chunk.id === 0) targetProgress = tMelt * 0.95;
        else if (chunk.id === 1) targetProgress = tMelt * 0.45;
        else targetProgress = 0.0;
      } else if (timeSec < 13.0) {
        // 8–13s (World Flight): Chunks complete in sequence ahead of camera
        const tFlight = (timeSec - 8.0) / 5.0;
        if (chunk.id === 0) targetProgress = 1.0;
        else if (chunk.id === 1) targetProgress = Math.min(1.0, 0.45 + tFlight * 0.75);
        else if (chunk.id === 2) targetProgress = Math.min(1.0, tFlight * 1.1);
        else if (chunk.id === 3) targetProgress = Math.min(1.0, Math.max(0.0, (tFlight - 0.2) * 1.25));
      } else {
        // 13s+ (Arrival & Exploration): Fully formed
        targetProgress = 1.0;
      }

      // Smooth progress lerp (or immediate snap on seek / initialization)
      if (immediate) {
        chunk.progress = targetProgress;
      } else {
        chunk.progress += (targetProgress - chunk.progress) * 0.15;
      }
      chunk.material.uniforms.uProgress.value = chunk.progress;
      chunk.material.uniforms.uTime.value = timeSec;
      chunk.material.uniforms.uCameraPos.value.copy(camPos);
    }
  }

  dispose() {
    this.chunks.forEach((c) => {
      if (c.mesh && c.mesh.geometry) c.mesh.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    if (this.boundaryLines) {
      if (this.boundaryLines.geometry) this.boundaryLines.geometry.dispose();
      if (this.boundaryLines.material) this.boundaryLines.material.dispose();
    }
    this.group.clear();
  }
}
