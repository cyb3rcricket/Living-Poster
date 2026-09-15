import * as THREE from 'three';
import { createWaterMaterial, createH4Material } from './shaders/waterShader.js';

// ============================================================================
// Prototype 05 — Painted Ocean Spatial Reconstruction
// Isolated experiment: ray-fitted projective water slab vs card vs card-stack.
// Does not modify Prototypes 01–04.
// ============================================================================

const V0 = 855 / 1024;
const PROFILE_IDS = ['linear', 'smooth', 'power', 'hermite'];

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function smoothstep01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function hermite01(u, y0, y1, m0, m1) {
  const t = clamp(u, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1;
}

export class Prototype05 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    this.canonicalCamPos = new THREE.Vector3(0, 0, 2.0);
    this.canonicalFov = 53.130102;

    this.config = {
      comparisonMode: 'slab', // poster | card | slab | stack | overlay | wireframe | footprint | projection | profile | h1 | h2 | h3 | h4
      topology: 'baseline', // baseline | h1 | h2 | h3 | h4
      profile: 'linear',
      zHorizon: 0.70,
      zNear: 1.38,
      gamma: 1.20,
      tMid: 0.40,
      zMidT: 0.28,
      featherPx: 3.0,
      h1FarZ: -3.0,
      coveStart: 0.24,
      coveJoinZ: 0.70,
      coveFarZ: -3.0,
      coveVerticality: 0.85,
      coveCurvature: 1.0,
      h3Split: 0.30,
      h3Overlap: 0.12,
      h3JoinZ: 0.70,
      h3FarZ: -3.0,
      h4Band: 0.040,
      h4SlabTMin: 0.18,
      footprintMode: 0, // 0 hard, 1 F1 soft, 2 F2 fill
      dilatePx: 2.0,
      depthWrite: true,
      footprintOn: true,
      seaSource: 'sea-only', // original | sea-only (H1 FAR defaults to reconstructed sea)
      rejectNeedles: false,
      contactCorrection: false,
      contactStrength: 0.35,
      alive: false,
      parallaxEnabled: true,
      scriptedSweep: false,
      freezeCamera: false,
      sweepSpeed: 0.22,
      parallaxShiftX: 0.120,
      parallaxShiftY: 0.040,
      cameraPush: 0.300,
      parallaxYaw: 0.061, // ~3.5°
      flareMode: 'spire',
      lightingStrength: 0.35,
      segsW: 56,
      segsH: 32,
      depths: {
        sky: 0.00,
        ribbons: 0.40,
        needles: 0.65,
        citadelCard: 0.95,
        sentinel: 1.25,
        water: 1.15,
        flare: 0.95,
      },
    };

    this.state = {
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      isLoaded: false,
      pathOrigin: 0,
      fps: 60,
      frameTimeMs: 16.6,
      telemetry: {
        waterVerts: 0,
        waterTris: 0,
        drawCalls: 0,
        camX: 0,
        camY: 0,
        camZ: 2.0,
        camYawDeg: 0,
        profile: 'linear',
        zHorizon: 0.70,
        zNear: 1.38,
        depthWrite: true,
        topology: 'baseline',
        seaSource: 'sea-only',
        horizonPy: 0.835,
      },
    };

    this._fpsFrames = 0;
    this._fpsStamp = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 200.0);
    this.camera.position.copy(this.canonicalCamPos);
    this.scene.add(this.camera);

    this.canonicalViewMatrix = new THREE.Matrix4();
    this.canonicalProjMatrix = new THREE.Matrix4();
    this.updateCanonicalMatrices();

    this.backgroundGroup = new THREE.Group();
    this.scene.add(this.backgroundGroup);

    this.waterGroup = new THREE.Group();
    this.scene.add(this.waterGroup);

    this.layerMeshes = {};
    this.flatCitadelMesh = null;
    this.volumeCitadelMesh = null;
    this.citadelWireframeMesh = null;
    this.originalPosterMesh = null;
    this.waterCardMesh = null;
    this.slabMesh = null;
    this.slabWireframeMesh = null;
    this.stackMeshes = [];
    this.h3FarMesh = null;
    this.h3NearMesh = null;
    this.h4PlateMesh = null;
    this.waterMaterial = null;
    this.waterMaterialB = null;
    this.stackMaterial = null;
    this.h4Material = null;
    this.volumeMaterial = null;
  }

  updateCanonicalMatrices() {
    const dummyCam = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 200.0);
    dummyCam.position.copy(this.canonicalCamPos);
    dummyCam.updateMatrixWorld(true);
    this.canonicalViewMatrix.copy(dummyCam.matrixWorldInverse);
    this.canonicalProjMatrix.copy(dummyCam.projectionMatrix);
  }

  async loadAssets() {
    const textureLoader = new THREE.TextureLoader();
    const [
      texSky,
      texRibbons,
      texSentinel,
      texNeedles,
      texWater,
      texWaterSeaOnly,
      texFlare,
      texPoster,
      texCitadelCard,
      texCitadelP4Front,
      texCitadelSide,
      texSilhouetteMask,
      meshDataResponse,
    ] = await Promise.all([
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-a-deep-sky.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-b-ribbons.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-c-sentinel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-e-needles.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-f-water.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-05/generated/layer-f-water-sea-only.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-g-flare.png'),
      textureLoader.loadAsync('/reference/poster.jpeg'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-d-citadel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/layer-d-citadel-p4.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/citadel-side-texture.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/citadel-silhouette-mask.png'),
      fetch('/reference/experimental/prototype-04/generated/citadel-mesh-data.json').then((r) => r.json()),
    ]);

    const colorTextures = [
      texSky, texRibbons, texSentinel, texNeedles, texWater, texWaterSeaOnly,
      texFlare, texPoster, texCitadelCard, texCitadelP4Front, texCitadelSide,
    ];
    for (const t of colorTextures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
    }
    texSilhouetteMask.minFilter = THREE.LinearFilter;
    texSilhouetteMask.magFilter = THREE.LinearFilter;

    this.textures = {
      sky: texSky,
      ribbons: texRibbons,
      sentinel: texSentinel,
      needles: texNeedles,
      water: texWater,
      waterSeaOnly: texWaterSeaOnly,
      flare: texFlare,
      poster: texPoster,
      citadelCard: texCitadelCard,
      citadelP4Front: texCitadelP4Front,
      citadelSide: texCitadelSide,
      silhouetteMask: texSilhouetteMask,
    };
    this.meshData = meshDataResponse;

    this.buildSurroundingProxies();
    this.buildFlatCitadelProxy();
    this.buildVolumetricCitadel();
    this.buildPosterMesh();
    this.buildWater();
    this.setComparisonMode(this.config.comparisonMode, true);

    this.state.isLoaded = true;
    console.log('Prototype 05 Painted Ocean Spatial Reconstruction initialized.');
  }

  createCalibratedCard(texture, zDepth, renderOrder, isAdditive = false) {
    const dist = this.canonicalCamPos.z - zDepth;
    const size = dist;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: renderOrder === 1,
      blending: isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, zDepth);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  buildSurroundingProxies() {
    const meshSky = this.createCalibratedCard(this.textures.sky, this.config.depths.sky, 1);
    meshSky.material.depthWrite = false;
    this.backgroundGroup.add(meshSky);
    this.layerMeshes.sky = meshSky;

    const meshRibbons = this.createCalibratedCard(this.textures.ribbons, this.config.depths.ribbons, 2);
    this.backgroundGroup.add(meshRibbons);
    this.layerMeshes.ribbons = meshRibbons;

    const meshNeedles = this.createCalibratedCard(this.textures.needles, this.config.depths.needles, 3);
    this.backgroundGroup.add(meshNeedles);
    this.layerMeshes.needles = meshNeedles;

    const meshSentinel = this.createCalibratedCard(this.textures.sentinel, this.config.depths.sentinel, 5);
    this.backgroundGroup.add(meshSentinel);
    this.layerMeshes.sentinel = meshSentinel;

    const flareZ = this.config.flareMode === 'spire' ? this.config.depths.citadelCard : this.config.depths.sky;
    const meshFlare = this.createCalibratedCard(this.textures.flare, flareZ, 7, true);
    meshFlare.material.depthTest = false;
    this.backgroundGroup.add(meshFlare);
    this.layerMeshes.flare = meshFlare;
  }

  buildFlatCitadelProxy() {
    const dist = this.canonicalCamPos.z - this.config.depths.citadelCard;
    const size = dist;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: this.textures.citadelCard,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    this.flatCitadelMesh = new THREE.Mesh(geo, mat);
    this.flatCitadelMesh.position.set(0, 0, this.config.depths.citadelCard);
    this.flatCitadelMesh.renderOrder = 4;
    this.flatCitadelMesh.visible = false;
    this.scene.add(this.flatCitadelMesh);
  }

  buildVolumetricCitadel() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.meshData.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.meshData.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.meshData.uvs, 2));
    geo.setAttribute('canonUv', new THREE.Float32BufferAttribute(this.meshData.canonUvs, 2));
    geo.setAttribute('surfaceType', new THREE.Float32BufferAttribute(this.meshData.surfaceTypes, 1));
    geo.setIndex(this.meshData.indices);

    this.volumeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFrontTexture: { value: this.textures.citadelP4Front },
        uSideTexture: { value: this.textures.citadelSide },
        uCanonViewMatrix: { value: this.canonicalViewMatrix },
        uCanonProjMatrix: { value: this.canonicalProjMatrix },
        uDebugMode: { value: 0 },
        uVolumeOpacity: { value: 1.0 },
        uLightingStrength: { value: this.config.lightingStrength },
        uFlarePos: { value: new THREE.Vector3(0.355, 0.342, 0.965) },
      },
      vertexShader: `
        attribute vec2 canonUv;
        attribute float surfaceType;
        varying vec2 vCanonUv;
        varying vec2 vSideUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying float vSurfaceType;
        uniform mat4 uCanonViewMatrix;
        uniform mat4 uCanonProjMatrix;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          vec4 canonClip = uCanonProjMatrix * uCanonViewMatrix * worldPos;
          vCanonUv = (canonClip.xy / canonClip.w) * 0.5 + 0.5;
          vSideUv = uv;
          vSurfaceType = surfaceType;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vCanonUv;
        varying vec2 vSideUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying float vSurfaceType;
        uniform sampler2D uFrontTexture;
        uniform sampler2D uSideTexture;
        uniform int uDebugMode;
        uniform float uVolumeOpacity;
        uniform float uLightingStrength;
        uniform vec3 uFlarePos;
        void main() {
          vec4 frontTex = texture2D(uFrontTexture, vCanonUv);
          vec4 sideTex = texture2D(uSideTexture, vSideUv);
          if (frontTex.a < 0.05) discard;
          vec3 canonCamDir = normalize(vec3(0.0, 0.0, 2.0) - vWorldPos);
          float dotCanon = max(0.0, dot(vWorldNormal, canonCamDir));
          float dotView = max(0.0, dot(vWorldNormal, vViewDir));
          float obliqueExposure = max(0.0, dotView - dotCanon);
          float sideWeight = smoothstep(0.15, 0.65, vSurfaceType) * smoothstep(0.01, 0.12, obliqueExposure * 3.0);
          float frontWeight = 1.0 - sideWeight;
          vec3 flareDir = normalize(uFlarePos - vWorldPos);
          float flareNdotL = max(0.0, dot(vWorldNormal, flareDir));
          vec3 warmRim = vec3(1.0, 0.82, 0.50) * pow(flareNdotL, 3.5) * 0.55;
          vec3 coldAmbient = vec3(0.09, 0.20, 0.32);
          float waterBounce = max(0.0, -vWorldNormal.y) * 0.25;
          vec3 cyanBounce = vec3(0.12, 0.55, 0.65) * waterBounce;
          vec3 litSide = sideTex.rgb * (coldAmbient + vec3(0.75)) + warmRim + cyanBounce;
          vec3 blendedSide = mix(sideTex.rgb, litSide, uLightingStrength);
          vec3 baseColor = mix(blendedSide, frontTex.rgb, frontWeight);
          if (uDebugMode == 1) {
            if (vSurfaceType > 0.25 || dotCanon < 0.12) {
              baseColor = mix(vec3(0.95, 0.15, 0.70), baseColor, 0.15);
            } else {
              baseColor = mix(baseColor, vec3(0.2, 0.5, 0.6), 0.4);
            }
          } else if (uDebugMode == 2) {
            baseColor = vec3(0.10, 0.90, 0.98);
          }
          gl_FragColor = vec4(baseColor, uVolumeOpacity);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    this.volumeCitadelMesh = new THREE.Mesh(geo, this.volumeMaterial);
    this.volumeCitadelMesh.renderOrder = 4;
    this.scene.add(this.volumeCitadelMesh);
  }

  buildPosterMesh() {
    const posterGeo = new THREE.PlaneGeometry(2.0, 2.0);
    const posterMat = new THREE.MeshBasicMaterial({
      map: this.textures.poster,
      depthTest: true,
      depthWrite: true,
    });
    this.originalPosterMesh = new THREE.Mesh(posterGeo, posterMat);
    this.originalPosterMesh.position.set(0, 0, 0);
    this.originalPosterMesh.visible = false;
    this.scene.add(this.originalPosterMesh);
  }

  // --------------------------------------------------------------------------
  // Depth profiles — t = 0 at painted horizon (v = V0), t = 1 at image bottom.
  // --------------------------------------------------------------------------
  evalProfileT(t) {
    const tClamped = clamp(t, 0, 1);
    const zH = this.config.zHorizon;
    const zN = this.config.zNear;
    const profile = this.config.profile;

    if (profile === 'smooth') {
      return mix(zH, zN, smoothstep01(tClamped));
    }
    if (profile === 'power') {
      const g = clamp(this.config.gamma, 0.65, 2.0);
      return mix(zH, zN, Math.pow(tClamped, g));
    }
    if (profile === 'hermite') {
      const tMid = clamp(this.config.tMid, 0.15, 0.85);
      const zMid = mix(zH, zN, clamp(this.config.zMidT, 0.05, 0.95));
      const mH = 0;
      const mN = (zN - zMid) / Math.max(1e-4, 1 - tMid);
      const mM = 0.5 * (
        (zMid - zH) / Math.max(1e-4, tMid) +
        (zN - zMid) / Math.max(1e-4, 1 - tMid)
      );
      let z;
      if (tClamped <= tMid) {
        const u = tClamped / tMid;
        z = hermite01(u, zH, zMid, mH * tMid, mM * tMid);
      } else {
        const u = (tClamped - tMid) / (1 - tMid);
        z = hermite01(u, zMid, zN, mM * (1 - tMid), mN * (1 - tMid));
      }
      return clamp(z, Math.min(zH, zN), Math.max(zH, zN));
    }
    return mix(zH, zN, tClamped);
  }

  evalCoveZ(t) {
    const tC = clamp(this.config.coveStart, 0.08, 0.60);
    const zN = this.config.zNear;
    const zJoin = this.config.coveJoinZ;
    const zFar = this.config.coveFarZ;
    const vert = clamp(this.config.coveVerticality, 0, 1);
    if (t >= tC) {
      const u = (t - tC) / Math.max(1e-4, 1 - tC);
      return mix(zJoin, zN, u);
    }
    const curve = clamp(this.config.coveCurvature, 0.4, 2.5);
    const u = Math.pow(t / tC, curve);
    const mJoin = (zN - zJoin) / Math.max(1e-4, 1 - tC);
    const mFar = mix(mJoin, 0, vert);
    return hermite01(u, zFar, zJoin, mFar * tC, mJoin * tC);
  }

  evalTopologyZ(t) {
    const topo = this.config.topology;
    if (topo === 'h1') {
      return mix(this.config.h1FarZ, this.config.zNear, clamp(t, 0, 1));
    }
    if (topo === 'h2') {
      return this.evalCoveZ(t);
    }
    if (topo === 'h3') {
      if (t < this.config.h3Split) return this.config.h3FarZ;
      return this.evalProfileT(t);
    }
    return this.evalProfileT(t);
  }

  applyContact(u, v, z) {
    if (!this.config.contactCorrection) return z;
    const wU = smoothstep01((u - 0.58) / 0.20);
    const wV = smoothstep01((v - 0.86) / 0.10);
    const w = wU * wV * this.config.contactStrength;
    return mix(z, 1.012, w);
  }

  unprojectCanon(u, v, z) {
    const d = 2.0 - z;
    return {
      x: (u - 0.5) * d,
      y: (0.5 - v) * d,
      z,
    };
  }

  buildRayGridGeometry({ t0, t1, zFn, segsW, segsH }) {
    const positions = [];
    const rest = [];
    const profileT = [];
    const indices = [];

    for (let j = 0; j <= segsH; j++) {
      const tLocal = j / segsH;
      const t = t0 + tLocal * (t1 - t0);
      const v = V0 + t * (1 - V0);
      for (let i = 0; i <= segsW; i++) {
        const u = i / segsW;
        const z0 = zFn(t, u, v);
        const z = this.applyContact(u, v, z0);
        const p = this.unprojectCanon(u, v, z);
        positions.push(p.x, p.y, p.z);
        rest.push(p.x, p.y, p.z);
        profileT.push(t);
      }
    }

    const cols = segsW + 1;
    for (let j = 0; j < segsH; j++) {
      for (let i = 0; i < segsW; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        // CCW when viewed from +Z (camera) with j increasing toward more negative Y.
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aRestPosition', new THREE.Float32BufferAttribute(rest, 3));
    geo.setAttribute('aProfileT', new THREE.Float32BufferAttribute(profileT, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  disposeWaterMeshes() {
    const uniqueGeos = new Set();
    const uniqueMats = new Set();
    const meshes = [
      this.waterCardMesh, this.slabMesh, this.slabWireframeMesh,
      this.h3FarMesh, this.h3NearMesh, this.h4PlateMesh,
      ...this.stackMeshes,
    ];
    for (const mesh of meshes) {
      if (!mesh) continue;
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.geometry) uniqueGeos.add(mesh.geometry);
      if (mesh.material) uniqueMats.add(mesh.material);
    }
    uniqueGeos.forEach((geo) => geo.dispose());
    uniqueMats.forEach((mat) => {
      if (mat && mat.dispose) mat.dispose();
    });
    this.waterMaterial = null;
    this.waterMaterialB = null;
    this.stackMaterial = null;
    this.h4Material = null;
    this.waterCardMesh = null;
    this.slabMesh = null;
    this.slabWireframeMesh = null;
    this.h3FarMesh = null;
    this.h3NearMesh = null;
    this.h4PlateMesh = null;
    this.stackMeshes = [];
  }

  activeWaterTexture() {
    if (this.config.seaSource === 'sea-only' && this.textures.waterSeaOnly) {
      return this.textures.waterSeaOnly;
    }
    return this.textures.water;
  }

  effectiveFootprintOn() {
    // Sea-only already contains reconstructed sea in terrain footings.
    // Keep discard only for the contaminated original water source.
    if (this.config.seaSource === 'sea-only') return false;
    return !!this.config.footprintOn;
  }

  cloneWaterMaterial(tAlphaMode, tLo, tHi) {
    const mat = createWaterMaterial({
      waterTex: this.activeWaterTexture(),
      citadelCard: this.textures.citadelCard,
      sentinelTex: this.textures.sentinel,
      needlesTex: this.textures.needles,
      canonViewMatrix: this.canonicalViewMatrix,
      canonProjMatrix: this.canonicalProjMatrix,
    });
    mat.uniforms.uTAlphaMode.value = tAlphaMode;
    mat.uniforms.uTAlphaLo.value = tLo;
    mat.uniforms.uTAlphaHi.value = tHi;
    return mat;
  }

  buildWater() {
    this.disposeWaterMeshes();

    this.waterCardMesh = this.createCalibratedCard(
      this.textures.water,
      this.config.depths.water,
      6
    );
    this.waterCardMesh.name = 'p05-water-card';
    this.waterGroup.add(this.waterCardMesh);

    this.waterMaterial = this.cloneWaterMaterial(0, 0, 1);
    this.stackMaterial = this.cloneWaterMaterial(0, 0, 1);
    this.syncWaterUniforms();

    const topo = this.config.topology;
    const segsW = (topo === 'h1' || topo === 'h2') ? 64 : this.config.segsW;
    const segsH = (topo === 'h1' || topo === 'h2') ? 48 : this.config.segsH;
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x55ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });

    if (topo === 'h3') {
      const split = this.config.h3Split;
      const ov = this.config.h3Overlap;
      this.waterMaterialB = this.cloneWaterMaterial(1, split - ov, split + ov);
      this.syncWaterUniforms();
      this.waterMaterial.uniforms.uTAlphaMode.value = 2;
      this.waterMaterial.uniforms.uTAlphaLo.value = split - ov;
      this.waterMaterial.uniforms.uTAlphaHi.value = split + ov;
      this.waterMaterialB.depthWrite = false;

      const farGeo = this.buildRayGridGeometry({
        t0: 0,
        t1: Math.min(1, split + ov),
        zFn: () => this.config.h3FarZ,
        segsW: segsW,
        segsH: 16,
      });
      this.h3FarMesh = new THREE.Mesh(farGeo, this.waterMaterialB);
      this.h3FarMesh.name = 'p05-h3-far';
      this.h3FarMesh.renderOrder = 6;
      this.waterGroup.add(this.h3FarMesh);

      const nearGeo = this.buildRayGridGeometry({
        t0: Math.max(0, split - ov),
        t1: 1,
        zFn: (t) => this.evalProfileT(t),
        segsW: segsW,
        segsH: segsH,
      });
      this.h3NearMesh = new THREE.Mesh(nearGeo, this.waterMaterial);
      this.h3NearMesh.name = 'p05-h3-near';
      this.h3NearMesh.renderOrder = 6.1;
      this.waterGroup.add(this.h3NearMesh);

      this.slabMesh = this.h3NearMesh;
      this.slabWireframeMesh = new THREE.Mesh(nearGeo.clone(), wireMat);
      this.slabWireframeMesh.renderOrder = 8;
      this.slabWireframeMesh.visible = false;
      this.waterGroup.add(this.slabWireframeMesh);

      this.state.telemetry.waterVerts = farGeo.getAttribute('position').count + nearGeo.getAttribute('position').count;
      this.state.telemetry.waterTris = (farGeo.index.count + nearGeo.index.count) / 3;
    } else {
      const t0 = (topo === 'h4') ? this.config.h4SlabTMin : 0;
      if (topo === 'h4') {
        this.waterMaterial.uniforms.uTAlphaMode.value = 2;
        this.waterMaterial.uniforms.uTAlphaLo.value = this.config.h4SlabTMin;
        this.waterMaterial.uniforms.uTAlphaHi.value = this.config.h4SlabTMin + 0.10;
      }
      const slabGeo = this.buildRayGridGeometry({
        t0,
        t1: 1,
        zFn: (t) => this.evalTopologyZ(t),
        segsW,
        segsH,
      });
      this.slabMesh = new THREE.Mesh(slabGeo, this.waterMaterial);
      this.slabMesh.name = 'p05-water-slab';
      this.slabMesh.renderOrder = 6;
      this.waterGroup.add(this.slabMesh);

      this.slabWireframeMesh = new THREE.Mesh(slabGeo.clone(), wireMat);
      this.slabWireframeMesh.renderOrder = 8;
      this.slabWireframeMesh.visible = false;
      this.waterGroup.add(this.slabWireframeMesh);

      this.state.telemetry.waterVerts = slabGeo.getAttribute('position').count;
      this.state.telemetry.waterTris = slabGeo.index.count / 3;
    }

    if (topo === 'h4') {
      this.h4Material = createH4Material({
        waterTex: this.activeWaterTexture(),
        citadelCard: this.textures.citadelCard,
        sentinelTex: this.textures.sentinel,
      });
      this.h4Material.uniforms.uH4Band.value = this.config.h4Band;
      const h4Geo = new THREE.PlaneGeometry(1, 1);
      this.h4PlateMesh = new THREE.Mesh(h4Geo, this.h4Material);
      this.h4PlateMesh.name = 'p05-h4-plate';
      this.h4PlateMesh.position.set(0, 0, -1);
      this.h4PlateMesh.renderOrder = 9;
      this.h4PlateMesh.frustumCulled = false;
      this.camera.add(this.h4PlateMesh);
    }

    const strips = [
      { t0: 0.00, t1: 0.42, zT: 0.18 },
      { t0: 0.34, t1: 0.72, zT: 0.52 },
      { t0: 0.64, t1: 1.00, zT: 0.90 },
    ];
    strips.forEach((strip, idx) => {
      const zConst = mix(this.config.zHorizon, this.config.zNear, strip.zT);
      const geo = this.buildRayGridGeometry({
        t0: strip.t0,
        t1: strip.t1,
        zFn: () => zConst,
        segsW: 48,
        segsH: 8,
      });
      const mesh = new THREE.Mesh(geo, this.stackMaterial);
      mesh.name = `p05-water-stack-${idx}`;
      mesh.renderOrder = 6 + idx * 0.01;
      mesh.visible = false;
      this.waterGroup.add(mesh);
      this.stackMeshes.push(mesh);
    });
  }

  rebuildWater() {
    if (!this.state.isLoaded) return;
    this.buildWater();
    this.setComparisonMode(this.config.comparisonMode, true);
  }

  syncWaterUniforms() {
    const waterTex = this.activeWaterTexture();
    const footprintOn = this.effectiveFootprintOn();
    const apply = (mat) => {
      if (!mat || !mat.uniforms) return;
      const u = mat.uniforms;
      if (u.uWaterTex) u.uWaterTex.value = waterTex;
      if (u.uFeatherPx) u.uFeatherPx.value = this.config.featherPx;
      if (u.uFootprintOn) u.uFootprintOn.value = footprintOn ? 1.0 : 0.0;
      if (u.uRejectNeedles) u.uRejectNeedles.value = this.config.rejectNeedles ? 1.0 : 0.0;
      if (u.uFootprintMode) u.uFootprintMode.value = this.config.footprintMode;
      if (u.uDilatePx) u.uDilatePx.value = this.config.dilatePx;
      if (u.uAlive) u.uAlive.value = this.config.alive ? 1.0 : 0.0;
      if (u.uZHorizon) u.uZHorizon.value = this.config.zHorizon;
      if (u.uZNear) u.uZNear.value = this.config.zNear;
      mat.depthWrite = this.config.depthWrite;
    };
    apply(this.waterMaterial);
    apply(this.waterMaterialB);
    apply(this.stackMaterial);
    apply(this.h4Material);
    if (this.waterMaterialB && this.config.topology === 'h3') {
      this.waterMaterialB.depthWrite = false;
    }
    if (this.h4Material && this.h4Material.uniforms.uH4Band) {
      this.h4Material.uniforms.uH4Band.value = this.config.h4Band;
    }
  }

  setSeaSource(id, silent = false) {
    const next = id === 'original' ? 'original' : 'sea-only';
    this.config.seaSource = next;
    this.syncWaterUniforms();
    if (!silent) {
      this.showToast(next === 'sea-only'
        ? 'Sea source: SEA-ONLY (footprint discard off)'
        : 'Sea source: ORIGINAL (footprint discard as set)');
    }
    return this.config.seaSource;
  }

  setTopology(id, silent = false) {
    const allowed = ['baseline', 'h1', 'h2', 'h3', 'h4'];
    if (!allowed.includes(id)) return this.config.topology;
    this.config.topology = id;
    const modeMap = { baseline: 'slab', h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4' };
    this.config.comparisonMode = modeMap[id];
    this.rebuildWater();
    if (!silent) {
      const labels = {
        baseline: 'BASELINE SLAB (LINEAR)',
        h1: 'H1 FAR-EXTENDED SLAB',
        h2: 'H2 PROJECTIVE COVE',
        h3: 'H3 NEAR SLAB + HORIZON PLATE',
        h4: 'H4 SCREEN-ANCHORED HORIZON (diagnostic)',
      };
      this.showToast(`Topology: ${labels[id]}`);
      if (id === 'h1' && this.config.seaSource !== 'sea-only') {
        this.setSeaSource('sea-only', true);
        this.showToast('H1 FAR — sea source: SEA-ONLY');
      }
    }
    return this.config.topology;
  }

  setFootprintMode(mode) {
    this.config.footprintMode = mode;
    this.syncWaterUniforms();
    const names = ['HARD discard', 'F1 SOFT / dilate', 'F2 local fill'];
    this.showToast(`Footprint: ${names[mode] || mode}`);
  }

  setProfile(id, silent = false) {
    if (!PROFILE_IDS.includes(id)) return this.config.profile;
    this.config.profile = id;
    this.rebuildWater();
    if (!silent) this.showToast(`Depth Profile: ${id.toUpperCase()}`);
    return this.config.profile;
  }

  cycleProfile() {
    const idx = PROFILE_IDS.indexOf(this.config.profile);
    return this.setProfile(PROFILE_IDS[(idx + 1) % PROFILE_IDS.length]);
  }

  setDepthWrite(on) {
    this.config.depthWrite = !!on;
    this.syncWaterUniforms();
    this.showToast(this.config.depthWrite ? 'Depth Write: ON' : 'Depth Write: OFF');
  }

  toggleDepthWrite() {
    this.setDepthWrite(!this.config.depthWrite);
    return this.config.depthWrite;
  }

  setFeather(px) {
    this.config.featherPx = clamp(px, 0, 8);
    this.syncWaterUniforms();
  }

  setHorizonNear(zHorizon, zNear, rebuild = true) {
    this.config.zHorizon = clamp(zHorizon, 0.66, 0.82);
    this.config.zNear = clamp(zNear, 1.15, 1.40);
    if (rebuild) this.rebuildWater();
    else this.syncWaterUniforms();
  }

  setComparisonMode(mode, silent = false) {
    this.config.comparisonMode = mode;

    this.originalPosterMesh.visible = false;
    this.backgroundGroup.visible = true;
    this.volumeCitadelMesh.visible = true;
    this.flatCitadelMesh.visible = false;
    this.waterCardMesh.visible = false;
    this.slabMesh.visible = false;
    this.slabWireframeMesh.visible = false;
    this.stackMeshes.forEach((m) => { m.visible = false; });
    if (this.h3FarMesh) this.h3FarMesh.visible = false;
    if (this.h3NearMesh) this.h3NearMesh.visible = false;
    if (this.h4PlateMesh) this.h4PlateMesh.visible = false;
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uDebugMode.value = 0;
      this.waterMaterial.uniforms.uOpacity.value = 1.0;
    }
    if (this.waterMaterialB) {
      this.waterMaterialB.uniforms.uDebugMode.value = 0;
      this.waterMaterialB.uniforms.uOpacity.value = 1.0;
    }
    this.waterCardMesh.material.opacity = 1.0;
    this.waterCardMesh.material.transparent = true;

    const showWorld = () => {
      this.backgroundGroup.visible = true;
      this.volumeCitadelMesh.visible = true;
    };

    const showSpatial = () => {
      showWorld();
      if (this.config.topology === 'h3') {
        if (this.h3FarMesh) this.h3FarMesh.visible = true;
        if (this.h3NearMesh) this.h3NearMesh.visible = true;
      } else if (this.slabMesh) {
        this.slabMesh.visible = true;
      }
      if (this.config.topology === 'h4' && this.h4PlateMesh) {
        this.h4PlateMesh.visible = true;
      }
    };

    if (mode === 'poster') {
      this.backgroundGroup.visible = false;
      this.volumeCitadelMesh.visible = false;
      this.originalPosterMesh.visible = true;
      if (!silent) this.showToast('Mode: POSTER (Untouched 2D Reference)');
    } else if (mode === 'card') {
      showWorld();
      this.waterCardMesh.visible = true;
      if (!silent) this.showToast('Mode: CARD (P02/P04 Vertical Water at Z=1.15)');
    } else if (mode === 'slab') {
      if (this.config.topology !== 'baseline') {
        this.config.topology = 'baseline';
        this.rebuildWater();
        return;
      }
      showSpatial();
      if (!silent) this.showToast('Mode: BASELINE SLAB (Ray-Fitted LINEAR)');
    } else if (mode === 'h1') {
      if (this.config.topology !== 'h1') {
        this.config.topology = 'h1';
        this.rebuildWater();
        return;
      }
      showSpatial();
      if (!silent) this.showToast('Mode: H1 FAR-EXTENDED SLAB');
    } else if (mode === 'h2') {
      if (this.config.topology !== 'h2') {
        this.config.topology = 'h2';
        this.rebuildWater();
        return;
      }
      showSpatial();
      if (!silent) this.showToast('Mode: H2 PROJECTIVE COVE');
    } else if (mode === 'h3') {
      if (this.config.topology !== 'h3') {
        this.config.topology = 'h3';
        this.rebuildWater();
        return;
      }
      showSpatial();
      if (!silent) this.showToast('Mode: H3 HYBRID NEAR + HORIZON PLATE');
    } else if (mode === 'h4') {
      if (this.config.topology !== 'h4') {
        this.config.topology = 'h4';
        this.rebuildWater();
        return;
      }
      showSpatial();
      if (!silent) this.showToast('Mode: H4 PINNED HORIZON (diagnostic)');
    } else if (mode === 'stack') {
      showWorld();
      this.stackMeshes.forEach((m) => { m.visible = true; });
      if (!silent) this.showToast('Mode: CARD STACK (2.5D Receding Strips)');
    } else if (mode === 'overlay') {
      showWorld();
      this.waterCardMesh.visible = true;
      showSpatial();
      this.waterCardMesh.material.opacity = 0.50;
      if (this.waterMaterial) this.waterMaterial.uniforms.uOpacity.value = 0.50;
      if (this.waterMaterialB) this.waterMaterialB.uniforms.uOpacity.value = 0.50;
      if (!silent) this.showToast('Mode: 50/50 CARD vs SPATIAL');
    } else if (mode === 'wireframe') {
      showSpatial();
      this.slabWireframeMesh.visible = true;
      if (this.waterMaterial) this.waterMaterial.uniforms.uOpacity.value = 0.45;
      if (this.waterMaterialB) this.waterMaterialB.uniforms.uOpacity.value = 0.45;
      if (!silent) this.showToast('Mode: WIREFRAME (Active Topology)');
    } else if (mode === 'footprint') {
      showSpatial();
      if (this.waterMaterial) this.waterMaterial.uniforms.uDebugMode.value = 1;
      if (this.waterMaterialB) this.waterMaterialB.uniforms.uDebugMode.value = 1;
      if (!silent) this.showToast('Mode: FOOTPRINT DEBUG (Magenta = Terrain)');
    } else if (mode === 'projection') {
      showSpatial();
      if (this.waterMaterial) this.waterMaterial.uniforms.uDebugMode.value = 2;
      if (this.waterMaterialB) this.waterMaterialB.uniforms.uDebugMode.value = 2;
      if (!silent) this.showToast('Mode: PROJECTION DEBUG (Canonical UV)');
    } else if (mode === 'profile') {
      showSpatial();
      if (this.waterMaterial) this.waterMaterial.uniforms.uDebugMode.value = 3;
      if (this.waterMaterialB) this.waterMaterialB.uniforms.uDebugMode.value = 3;
      if (!silent) this.showToast('Mode: DEPTH PROFILE DEBUG');
    } else {
      this.setComparisonMode('slab', silent);
      return;
    }
  }

  cycleComparisonMode() {
    const modes = ['poster', 'card', 'slab', 'h1', 'h2', 'h3', 'h4', 'stack', 'overlay', 'wireframe', 'footprint', 'projection', 'profile'];
    const idx = modes.indexOf(this.config.comparisonMode);
    const next = modes[(idx + 1) % modes.length];
    this.setComparisonMode(next);
    return next;
  }

  toggleScriptedSweep() {
    this.config.scriptedSweep = !this.config.scriptedSweep;
    if (this.config.scriptedSweep) {
      this.config.parallaxEnabled = true;
      this.config.freezeCamera = false;
      this.state.pathOrigin = performance.now();
      this.showToast('Scripted Path: ACTIVE (Canonical → Push → Lateral → Return)');
    } else {
      this.showToast('Scripted Path: PAUSED (Manual Pointer)');
    }
    return this.config.scriptedSweep;
  }

  setFlareMode(mode) {
    this.config.flareMode = mode;
    if (!this.layerMeshes.flare) return;
    const targetZ = mode === 'spire' ? this.config.depths.citadelCard : this.config.depths.sky;
    const dist = this.canonicalCamPos.z - targetZ;
    this.layerMeshes.flare.position.z = targetZ;
    this.layerMeshes.flare.scale.set(dist / 2.0, dist / 2.0, 1.0);
    this.showToast(mode === 'spire' ? 'Flare: SPIRE-LOCKED' : 'Flare: SKY-LOCKED');
    return this.config.flareMode;
  }

  toggleFlareMode() {
    return this.setFlareMode(this.config.flareMode === 'spire' ? 'sky' : 'spire');
  }

  snapPose({ x = 0, y = 0, z = 2.0, rx = 0, ry = 0 } = {}) {
    this.config.scriptedSweep = false;
    this.config.parallaxEnabled = false;
    this.config.freezeCamera = true;
    const clamped = this.clampCamera(x, y, z, rx, ry);
    this.camera.position.set(clamped.x, clamped.y, clamped.z);
    this.camera.rotation.set(clamped.rx, clamped.ry, 0);
    this.state.mouse.x = 0;
    this.state.mouse.y = 0;
    this.state.mouse.targetX = 0;
    this.state.mouse.targetY = 0;
  }

  snapCanonical() {
    this.snapPose({ x: 0, y: 0, z: 2.0, rx: 0, ry: 0 });
  }

  releasePose() {
    this.config.freezeCamera = false;
    this.config.parallaxEnabled = true;
  }

  clampCamera(x, y, z, rx, ry) {
    const zMin = this.config.zNear + 0.08;
    const zClamped = clamp(z, zMin, 2.0);
    const xClamped = clamp(x, -0.18, 0.18);
    const yClamped = clamp(y, -0.04, 0.04);
    const yawMax = this.config.parallaxYaw;
    const ryClamped = clamp(ry, -yawMax, yawMax);
    const rxClamped = clamp(rx, -0.04, 0.04);
    return { x: xClamped, y: yClamped, z: zClamped, rx: rxClamped, ry: ryClamped };
  }

  evalScriptedPath(now) {
    if (!this.state.pathOrigin) this.state.pathOrigin = now;
    const elapsed = ((now - this.state.pathOrigin) / 1000) % 16;
    const xAmp = this.config.parallaxShiftX;
    const yAmp = this.config.parallaxShiftY;
    const push = this.config.cameraPush;

    let x = 0;
    let y = 0;
    let pushZ = 0;
    let yaw = 0;

    const lerpSeg = (t, a, b) => mix(a, b, clamp(t, 0, 1));

    if (elapsed < 1.5) {
      // hold canonical
    } else if (elapsed < 5.0) {
      const u = (elapsed - 1.5) / 3.5;
      pushZ = lerpSeg(smoothstep01(u), 0, push);
    } else if (elapsed < 8.0) {
      const u = (elapsed - 5.0) / 3.0;
      pushZ = push;
      x = lerpSeg(smoothstep01(u), 0, -xAmp);
      yaw = -x * 0.40;
    } else if (elapsed < 11.0) {
      const u = (elapsed - 8.0) / 3.0;
      pushZ = push;
      x = lerpSeg(smoothstep01(u), -xAmp, xAmp);
      y = Math.sin(u * Math.PI) * yAmp * 0.5;
      yaw = -x * 0.40;
    } else if (elapsed < 14.5) {
      const u = (elapsed - 11.0) / 3.5;
      const e = smoothstep01(u);
      pushZ = lerpSeg(e, push, 0);
      x = lerpSeg(e, xAmp, 0);
      y = lerpSeg(e, 0, 0);
      yaw = -x * 0.40;
    }

    const pitch = -y * 0.25;
    return this.clampCamera(x, y, 2.0 - pushZ, pitch, yaw);
  }

  onPointerMove(normX, normY) {
    if (!this.config.parallaxEnabled || this.config.scriptedSweep || this.config.freezeCamera) return;
    this.state.mouse.targetX = clamp(normX, -1.5, 1.5);
    this.state.mouse.targetY = clamp(normY, -1.5, 1.5);
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getHorizonScreenSamples() {
    const us = [0.29, 0.40, 0.50, 0.58, 0.72];
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    return us.map((u) => {
      const z = this.evalTopologyZ(0);
      const p = this.unprojectCanon(u, V0, z);
      const vec = new THREE.Vector3(p.x, p.y, p.z).project(this.camera);
      const sample = {
        u,
        ndcX: vec.x,
        ndcY: vec.y,
        px: (vec.x * 0.5 + 0.5),
        py: (-vec.y * 0.5 + 0.5),
        worldZ: z,
      };
      if (this.config.topology === 'h4') {
        sample.pyGeom = sample.py;
        sample.py = V0;
        sample.pyPinned = V0;
      }
      return sample;
    });
  }

  getWaterStats() {
    const horizon = this.getHorizonScreenSamples();
    return {
      topology: this.config.topology,
      profile: this.config.profile,
      zHorizon: this.config.zHorizon,
      zNear: this.config.zNear,
      h1FarZ: this.config.h1FarZ,
      coveStart: this.config.coveStart,
      coveFarZ: this.config.coveFarZ,
      h3Split: this.config.h3Split,
      h3FarZ: this.config.h3FarZ,
      footprintMode: this.config.footprintMode,
      depthWrite: this.config.depthWrite,
      footprintOn: this.config.footprintOn,
      footprintEffective: this.effectiveFootprintOn(),
      seaSource: this.config.seaSource,
      alive: this.config.alive,
      contactCorrection: this.config.contactCorrection,
      verts: this.state.telemetry.waterVerts,
      tris: this.state.telemetry.waterTris,
      drawCalls: this.renderer.info.render.calls,
      fps: this.state.fps,
      frameTimeMs: this.state.frameTimeMs,
      cam: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        rx: this.camera.rotation.x,
        ry: this.camera.rotation.y,
      },
      horizon,
    };
  }

  setExperiment(opts = {}) {
    if (opts.profile) this.config.profile = opts.profile;
    if (opts.zHorizon != null) this.config.zHorizon = clamp(opts.zHorizon, 0.66, 0.82);
    if (opts.zNear != null) this.config.zNear = clamp(opts.zNear, 1.15, 1.40);
    if (opts.gamma != null) this.config.gamma = clamp(opts.gamma, 0.65, 2.0);
    if (opts.tMid != null) this.config.tMid = clamp(opts.tMid, 0.15, 0.85);
    if (opts.zMidT != null) this.config.zMidT = clamp(opts.zMidT, 0.05, 0.95);
    if (opts.featherPx != null) this.config.featherPx = clamp(opts.featherPx, 0, 8);
    if (opts.depthWrite != null) this.config.depthWrite = !!opts.depthWrite;
    if (opts.footprintOn != null) this.config.footprintOn = !!opts.footprintOn;
    if (opts.seaSource != null) this.config.seaSource = opts.seaSource === 'original' ? 'original' : 'sea-only';
    if (opts.footprintMode != null) this.config.footprintMode = opts.footprintMode;
    if (opts.dilatePx != null) this.config.dilatePx = opts.dilatePx;
    if (opts.alive != null) this.config.alive = !!opts.alive;
    if (opts.contactCorrection != null) this.config.contactCorrection = !!opts.contactCorrection;
    if (opts.h1FarZ != null) this.config.h1FarZ = opts.h1FarZ;
    if (opts.coveStart != null) this.config.coveStart = opts.coveStart;
    if (opts.coveJoinZ != null) this.config.coveJoinZ = opts.coveJoinZ;
    if (opts.coveFarZ != null) this.config.coveFarZ = opts.coveFarZ;
    if (opts.coveVerticality != null) this.config.coveVerticality = opts.coveVerticality;
    if (opts.coveCurvature != null) this.config.coveCurvature = opts.coveCurvature;
    if (opts.h3Split != null) this.config.h3Split = opts.h3Split;
    if (opts.h3Overlap != null) this.config.h3Overlap = opts.h3Overlap;
    if (opts.h3JoinZ != null) this.config.h3JoinZ = opts.h3JoinZ;
    if (opts.h3FarZ != null) this.config.h3FarZ = opts.h3FarZ;
    if (opts.h4Band != null) this.config.h4Band = opts.h4Band;
    if (opts.topology) this.config.topology = opts.topology;
    if (opts.comparisonMode) {
      const topoFromMode = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', slab: 'baseline' };
      if (topoFromMode[opts.comparisonMode]) this.config.topology = topoFromMode[opts.comparisonMode];
    }
    if (opts.rebuild !== false) this.rebuildWater();
    else this.syncWaterUniforms();
    if (opts.comparisonMode) this.setComparisonMode(opts.comparisonMode, true);
    if (opts.pose) this.snapPose(opts.pose);
    if (opts.canonical) this.snapCanonical();
  }

  update(now) {
    if (!this.state.isLoaded) return;

    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value = now * 0.001;
      const dx = this.camera.position.x - this.canonicalCamPos.x;
      const dy = this.camera.position.y - this.canonicalCamPos.y;
      const dz = this.camera.position.z - this.canonicalCamPos.z;
      const atCanon = (dx * dx + dy * dy + dz * dz) < 0.0004
        && Math.abs(this.camera.rotation.x) < 0.002
        && Math.abs(this.camera.rotation.y) < 0.002;
      this.waterMaterial.uniforms.uCanonWarpLock.value = atCanon ? 1.0 : 0.0;
      if (this.waterMaterialB) {
        this.waterMaterialB.uniforms.uTime.value = now * 0.001;
        this.waterMaterialB.uniforms.uCanonWarpLock.value = atCanon ? 1.0 : 0.0;
      }
    }

    if (!this.config.freezeCamera) {
      const isMoving = this.config.parallaxEnabled && this.config.comparisonMode !== 'poster';
      if (isMoving && this.config.scriptedSweep) {
        const pose = this.evalScriptedPath(now);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, pose.x, 0.08);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, pose.y, 0.08);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, pose.z, 0.08);
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, pose.rx, 0.08);
        this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, pose.ry, 0.08);
      } else if (isMoving) {
        this.state.mouse.x = THREE.MathUtils.lerp(this.state.mouse.x, this.state.mouse.targetX, 0.05);
        this.state.mouse.y = THREE.MathUtils.lerp(this.state.mouse.y, this.state.mouse.targetY, 0.05);
        const shiftX = -this.state.mouse.x * this.config.parallaxShiftX;
        const shiftY = this.state.mouse.y * this.config.parallaxShiftY;
        const pushZ = Math.max(0, -this.state.mouse.y * 0.5) * this.config.cameraPush;
        const yaw = -shiftX * 0.35;
        const pose = this.clampCamera(shiftX, shiftY, this.canonicalCamPos.z - pushZ, -shiftY * 0.25, yaw);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, pose.x, 0.08);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, pose.y, 0.08);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, pose.z, 0.08);
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, pose.rx, 0.08);
        this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, pose.ry, 0.08);
      } else {
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.canonicalCamPos.x, 0.1);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.canonicalCamPos.y, 0.1);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.canonicalCamPos.z, 0.1);
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.1);
        this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.1);
      }
    }

    const hard = this.clampCamera(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
      this.camera.rotation.x,
      this.camera.rotation.y
    );
    this.camera.position.set(hard.x, hard.y, hard.z);
    this.camera.rotation.set(hard.rx, hard.ry, 0);

    this._fpsFrames += 1;
    if (!this._fpsStamp) this._fpsStamp = now;
    if (now - this._fpsStamp >= 500) {
      const dt = now - this._fpsStamp;
      this.state.fps = Math.round((this._fpsFrames * 1000) / dt);
      this.state.frameTimeMs = dt / this._fpsFrames;
      this._fpsFrames = 0;
      this._fpsStamp = now;
    }

    this.state.telemetry.camX = this.camera.position.x;
    this.state.telemetry.camY = this.camera.position.y;
    this.state.telemetry.camZ = this.camera.position.z;
    this.state.telemetry.camYawDeg = (this.camera.rotation.y * 180) / Math.PI;
    this.state.telemetry.drawCalls = this.renderer.info.render.calls;
    this.state.telemetry.profile = this.config.profile;
    this.state.telemetry.topology = this.config.topology;
    this.state.telemetry.seaSource = this.config.seaSource;
    this.state.telemetry.zHorizon = this.config.zHorizon;
    this.state.telemetry.zNear = this.config.zNear;
    this.state.telemetry.depthWrite = this.config.depthWrite;
    const hz = this.getHorizonScreenSamples()[2];
    this.state.telemetry.horizonPy = hz ? hz.py : V0;

    this.renderer.render(this.scene, this.camera);
  }
}
