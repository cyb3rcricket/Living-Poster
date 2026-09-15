import { createV0WaterMaterial } from './shaders/livingPosterWater.js';

// ============================================================================
// Living Poster V0 — world geometry module
// Isolated environment: ocean continuation, Sentinel hybrid, P04 Citadel
// reuse, distant Midnight Needle, infinite Umbral Giant, magenta ribbons,
// haze / bounds. Does not implement WASD/look or the V0 orchestrator.
//
// WATER CONTINUATION
//   Atlas 2048×1024 at reference/experimental/living-poster-v0/
//   ocean-continuation-2048x1024.png. Center 1024×1024 is the P05 sea-only
//   painting (open-sea interior identical; landmark inpaint repaired). Wings (u_canon ∈ [−0.5,0] ∪ [1,1.5])
//   are low-frequency edge extension + warped samples of nearby original
//   water + GenerateImage painterly luminance (sides only) + broad dabs +
//   fBm. No mirror / tile. Opaque indigo–sapphire–cyan–foam. Shader does
//   NOT discard canonical UV outside [0,1]; it remaps into the atlas.
//   Geometry: P05 H1 FAR LINEAR, zFar = −3, zNear = 1.38, u ∈ [−0.75, 1.75].
//   Atlas still covers u ∈ [−0.5, 1.5]; extra pad is painterly indigo, not
//   clamp-stretch. Horizon feathers into atmosphere so the far row is not a
//   card. Still (no Gerstner / Fresnel / alive warp). Citadel waterline is
//   pulled forward to overlap the volume; side aprons sit behind the base.
//
// SENTINEL
//   Painted front (layer-c-sentinel.png) via canonical projective sampling
//   on a silhouette mesh. Shallow rear wedge (ΔZ = 0.11) with a 256×512
//   cyan/blue side texture. Modest rings (~56 × 4 verts). Canonical view
//   uses original art (front weight 1 at pose (0,0,2)).
//
// CITADEL
//   P04 volumetric mesh + painterly shader duplicated here. Loads
//   citadel-mesh-data.json, layer-d-citadel-p4.png, citadel-side-texture.png
//   read-only. Prototype files are not edited.
//
// DISTANT WORLD
//   Midnight Needle: calibrated front card + a crossed card / shallow pair
//   at the needle. Hidden envelope: painterly haze cards, darkened
//   silhouettes, scene background indigo. Sky / Umbral Giant is infinitely
//   distant (tracks camera translation, world-aligned — no planet parallax).
//
// SUPPORTED CAMERA ENVELOPE (central channel)
//   Rest pose (−0.020, 0.003, 1.892) is inside. Tightened so the H1 slab
//   is not walked onto as a table.
//   X [−0.070,  0.028]
//   Y [ 0.000,  0.018]
//   Z [ 1.858,  1.970]
//
// COLLIDERS (XZ; movement module clamps)
//   citadel        aabb   X[0.041, 0.705] Z[0.610, 1.032]
//   sentinel       circle X=−0.255  Z=1.250  r=0.145
//   sentinel-base  aabb   X[−0.380, −0.120] Z[1.120, 1.320]
//   behind-world   aabb   X[−2.00,  2.00]  Z[−2.00, 1.720]
//
// TEXTURE SIZES
//   canonical cards / citadel front     1024
//   sky-clean (poster + occluded fill)  1024
//   ocean continuation atlas            2048×1024
//   haze fill                           512
//   sentinel side                       256×512
// ============================================================================

const V0 = 855 / 1024;
const CANON_Z = 2.0;
const CANON_FOV = 53.130102;
const U_PAD = 0.5;
const GEO_PAD = 0.75;
const Z_FAR = -3.0;
const Z_NEAR = 1.38;
const SKY_DIST = 2.0;
const SKY_SIZE = 2.7;

const BOUNDS = Object.freeze({
  minX: -0.070,
  maxX: 0.028,
  minY: 0.000,
  maxY: 0.018,
  minZ: 1.858,
  maxZ: 1.970,
});

const COLLIDERS = Object.freeze([
  Object.freeze({
    name: 'citadel',
    type: 'aabb',
    minX: 0.041,
    maxX: 0.705,
    minZ: 0.610,
    maxZ: 1.032,
  }),
  Object.freeze({
    name: 'sentinel',
    type: 'circle',
    x: -0.255,
    z: 1.250,
    r: 0.145,
  }),
  Object.freeze({
    name: 'sentinel-base',
    type: 'aabb',
    minX: -0.380,
    maxX: -0.120,
    minZ: 1.120,
    maxZ: 1.320,
  }),
  Object.freeze({
    name: 'behind-world',
    type: 'aabb',
    minX: -2.00,
    maxX: 2.00,
    minZ: -2.00,
    maxZ: 1.720,
  }),
]);

const CITADEL_VERT = /* glsl */ `
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
`;

const CITADEL_FRAG = /* glsl */ `
  varying vec2 vCanonUv;
  varying vec2 vSideUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vSurfaceType;
  uniform sampler2D uFrontTexture;
  uniform sampler2D uSideTexture;
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
    float foot = 1.0 - smoothstep(0.020, 0.168, vCanonUv.y);
    vec3 wet = vec3(0.14, 0.52, 0.64);
    baseColor = mix(baseColor, mix(baseColor, wet, 0.70), foot * 0.88);
    if (foot > 0.82 && frontTex.a < 0.94) discard;
    gl_FragColor = vec4(baseColor, 1.0);
    #include <colorspace_fragment>
  }
`;

const SENTINEL_VERT = CITADEL_VERT;

const SENTINEL_FRAG = /* glsl */ `
  varying vec2 vCanonUv;
  varying vec2 vSideUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vSurfaceType;
  uniform sampler2D uFrontTexture;
  uniform sampler2D uSideTexture;
  uniform float uLightingStrength;
  void main() {
    vec4 frontTex = texture2D(uFrontTexture, vCanonUv);
    vec4 sideTex = texture2D(uSideTexture, vSideUv);
    if (vSurfaceType < 0.25 && frontTex.a < 0.05) discard;
    vec3 canonCamDir = normalize(vec3(0.0, 0.0, 2.0) - vWorldPos);
    float dotCanon = max(0.0, dot(vWorldNormal, canonCamDir));
    float dotView = max(0.0, dot(vWorldNormal, vViewDir));
    float oblique = max(0.0, dotView - dotCanon);
    float sideWeight = smoothstep(0.20, 0.70, vSurfaceType) * smoothstep(0.00, 0.10, oblique * 2.5 + vSurfaceType * 0.35);
    vec3 ice = sideTex.rgb * vec3(0.75, 0.92, 1.05);
    ice += vec3(0.05, 0.18, 0.28) * max(0.0, vWorldNormal.y);
    ice += vec3(0.10, 0.22, 0.18) * uLightingStrength * max(0.0, dot(vWorldNormal, vec3(0.4, 0.5, 0.7)));
    vec3 baseColor = mix(frontTex.rgb, ice, sideWeight);
    if (vSurfaceType >= 0.25 && frontTex.a < 0.05) baseColor = ice;
    gl_FragColor = vec4(baseColor, 1.0);
    #include <colorspace_fragment>
  }
`;

const SKY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uSky;
  uniform sampler2D uHaze;
  uniform float uCover;
  void main() {
    vec2 uv = (vUv - 0.5) / uCover + 0.5;
    vec4 sky = texture2D(uSky, clamp(uv, vec2(0.001), vec2(0.999)));
    vec4 haze = texture2D(uHaze, vUv);
    // Sky card must not carry the painted ocean (that reads as a second rectangle).
    float horizonUv = 169.0 / 1024.0;
    float waterBand = 1.0 - smoothstep(horizonUv - 0.012, horizonUv + 0.028, uv.y);
    vec2 horizonSample = vec2(uv.x, clamp(horizonUv + 0.04 + uv.y * 0.08, 0.001, 0.999));
    vec3 horizonSky = texture2D(uSky, horizonSample).rgb;
    sky.rgb = mix(sky.rgb, mix(horizonSky, haze.rgb * vec3(0.45, 0.50, 0.62), 0.22), waterBand);
    float inx = smoothstep(-0.02, 0.03, uv.x) * smoothstep(-0.02, 0.03, 1.0 - uv.x);
    float iny = smoothstep(-0.02, 0.03, uv.y) * smoothstep(-0.02, 0.03, 1.0 - uv.y);
    float w = clamp(inx * iny, 0.0, 1.0);
    vec3 fill = mix(vec3(0.025, 0.03, 0.07), haze.rgb * vec3(0.35, 0.40, 0.55), 0.40);
    vec3 col = mix(fill, sky.rgb, w);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function mix(a, b, t) {
  return a + (b - a) * t;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function smooth01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function unprojectCanon(u, v, z) {
  const d = CANON_Z - z;
  return {
    x: (u - 0.5) * d,
    y: (0.5 - v) * d,
    z,
  };
}

function hash21(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeAlphaSampler(tex) {
  const img = tex && tex.image;
  if (!img || !img.width) return () => 0;
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return () => 0;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  return (u, v) => {
    const x = clamp(Math.floor(u * w), 0, w - 1);
    const y = clamp(Math.floor(v * h), 0, h - 1);
    return data[(y * w + x) * 4 + 3] / 255;
  };
}

function applyWaterContact(u, v, z, occ) {
  // Only lift water where a landmark actually stands, and only in a thin
  // footing band — a UV rectangle here becomes a visible shelf in the channel.
  const foot = smooth01((v - 0.868) / 0.022);
  const w = Math.min(1, occ * foot * 0.78);
  const target = mix(1.04, 1.14, smooth01((v - 0.90) / 0.055));
  return mix(z, target, w);
}

function colorize(tex, THREE) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  return tex;
}

export function createLivingPosterWorld({ THREE, renderer, container, camera, scene }) {
  const group = new THREE.Group();
  group.name = 'lpWorld';

  if (scene && scene.background == null) {
    scene.background = new THREE.Color(0x0b1020);
  }

  const bounds = {
    minX: BOUNDS.minX,
    maxX: BOUNDS.maxX,
    minY: BOUNDS.minY,
    maxY: BOUNDS.maxY,
    minZ: BOUNDS.minZ,
    maxZ: BOUNDS.maxZ,
    min: { x: BOUNDS.minX, y: BOUNDS.minY, z: BOUNDS.minZ },
    max: { x: BOUNDS.maxX, y: BOUNDS.maxY, z: BOUNDS.maxZ },
  };

  const colliders = COLLIDERS.map((c) => ({ ...c }));

  const dummyCam = new THREE.PerspectiveCamera(CANON_FOV, 1.0, 0.1, 200.0);
  dummyCam.position.set(0, 0, CANON_Z);
  dummyCam.updateMatrixWorld(true);
  const canonView = dummyCam.matrixWorldInverse.clone();
  const canonProj = dummyCam.projectionMatrix.clone();

  const resources = [];
  const textures = {};
  let skyFollow = null;
  let ribbonA = null;
  let ribbonT = 0;
  let loaded = false;

  function track(obj) {
    resources.push(obj);
    return obj;
  }

  function calibratedCard(texture, zDepth, renderOrder, opts = {}) {
    const dist = CANON_Z - zDepth;
    const size = opts.size || dist;
    const geo = track(new THREE.PlaneGeometry(size, size));
    const mat = track(new THREE.MeshBasicMaterial({
      map: texture,
      transparent: opts.transparent !== false,
      depthTest: opts.depthTest !== false,
      depthWrite: !!opts.depthWrite,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.FrontSide,
      alphaTest: opts.alphaTest != null ? opts.alphaTest : 0.04,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, zDepth);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  function pushWaterVert(positions, rest, profileT, u, v, z, t) {
    const p = unprojectCanon(u, v, z);
    positions.push(p.x, p.y, p.z);
    rest.push(p.x, p.y, p.z);
    profileT.push(t);
  }

  function addWaterGrid(positions, rest, profileT, indices, u0, u1, v0, v1, zFn, segsW, segsH, tBase) {
    const base = positions.length / 3;
    for (let j = 0; j <= segsH; j++) {
      const tv = j / segsH;
      const v = mix(v0, v1, tv);
      for (let i = 0; i <= segsW; i++) {
        const tu = i / segsW;
        const u = mix(u0, u1, tu);
        const z = zFn(u, v, tu, tv);
        pushWaterVert(positions, rest, profileT, u, v, z, mix(tBase, 1, tv));
      }
    }
    const cols = segsW + 1;
    for (let j = 0; j < segsH; j++) {
      for (let i = 0; i < segsW; i++) {
        const a = base + j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  function buildWater() {
    const segsW = 96;
    const segsH = 48;
    const u0 = -GEO_PAD;
    const u1 = 1 + GEO_PAD;
    const positions = [];
    const rest = [];
    const profileT = [];
    const indices = [];
    const citA = makeAlphaSampler(textures.citadelFront);
    const sentA = makeAlphaSampler(textures.sentinel);
    const occAt = (u, v) => {
      let m = 0;
      for (const du of [-0.014, 0, 0.014]) {
        for (const dv of [-0.01, 0, 0.01]) {
          m = Math.max(m, citA(u + du, v + dv), sentA(u + du, v + dv));
        }
      }
      return m;
    };

    addWaterGrid(positions, rest, profileT, indices, u0, u1, V0, 1, (u, v, tu, tv) => {
      let zLin = mix(Z_FAR, Z_NEAR, tv);
      if (tv < 0.10) {
        const wobble = (hash21(u * 18.0, v * 40.0) - 0.5) * 0.12 * (1 - tv / 0.10);
        zLin += wobble;
      }
      return applyWaterContact(u, v, zLin, occAt(u, v));
    }, segsW, segsH, 0);

    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aRestPosition', new THREE.Float32BufferAttribute(rest, 3));
    geo.setAttribute('aProfileT', new THREE.Float32BufferAttribute(profileT, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = track(createV0WaterMaterial({
      THREE,
      waterTex: textures.ocean,
      citadelTex: textures.citadelFront,
      sentinelTex: textures.sentinel,
      canonViewMatrix: canonView,
      canonProjMatrix: canonProj,
      uPad: U_PAD,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'lp-ocean';
    mesh.renderOrder = 6;
    group.add(mesh);
  }

  function buildCitadel() {
    const data = textures.meshData;
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    geo.setAttribute('canonUv', new THREE.Float32BufferAttribute(data.canonUvs, 2));
    geo.setAttribute('surfaceType', new THREE.Float32BufferAttribute(data.surfaceTypes, 1));
    geo.setIndex(data.indices);

    const mat = track(new THREE.ShaderMaterial({
      uniforms: {
        uFrontTexture: { value: textures.citadelFront },
        uSideTexture: { value: textures.citadelSide },
        uCanonViewMatrix: { value: canonView },
        uCanonProjMatrix: { value: canonProj },
        uLightingStrength: { value: 0.35 },
        uFlarePos: { value: new THREE.Vector3(0.355, 0.342, 0.965) },
      },
      vertexShader: CITADEL_VERT,
      fragmentShader: CITADEL_FRAG,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'lp-citadel';
    mesh.renderOrder = 4;
    group.add(mesh);
  }

  function buildSentinel(ringsData) {
    const rings = ringsData.rings;
    const zF = ringsData.zFront;
    const thick = ringsData.thickness;
    const inset = ringsData.wedgeInset;

    const front = [];
    const back = [];
    for (const ring of rings) {
      const v = ring.yPx / 1024;
      const uL = ring.leftPx / 1024;
      const uR = ring.rightPx / 1024;
      const mid = (uL + uR) * 0.5;
      const pL = unprojectCanon(uL, v, zF);
      const pR = unprojectCanon(uR, v, zF);
      const uLb = mix(uL, mid, inset);
      const uRb = mix(uR, mid, inset);
      const pLb = unprojectCanon(uLb, v, zF - thick);
      const pRb = unprojectCanon(uRb, v, zF - thick);
      front.push({ pL, pR, uL, uR, v });
      back.push({ pL: pLb, pR: pRb, uL: uLb, uR: uRb, v });
    }

    function makeSentinelGeo(pos, uv, canon, surf, idx) {
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute('canonUv', new THREE.Float32BufferAttribute(canon, 2));
      geo.setAttribute('surfaceType', new THREE.Float32BufferAttribute(surf, 1));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    }

    const frontPos = [];
    const frontUv = [];
    const frontCanon = [];
    const frontSurf = [];
    const frontIdx = [];
    const hullPos = [];
    const hullUv = [];
    const hullCanon = [];
    const hullSurf = [];
    const hullIdx = [];

    function push(bufPos, bufUv, bufCanon, bufSurf, p, uv, canon, surf) {
      bufPos.push(p.x, p.y, p.z);
      bufUv.push(uv[0], uv[1]);
      bufCanon.push(canon[0], canon[1]);
      bufSurf.push(surf);
      return bufPos.length / 3 - 1;
    }

    function quad(idx, a, b, c, d) {
      idx.push(a, b, c, a, c, d);
    }

    for (let i = 0; i < rings.length - 1; i++) {
      const f0 = front[i];
      const f1 = front[i + 1];
      const b0 = back[i];
      const b1 = back[i + 1];
      const cL0 = [f0.uL, 1 - f0.v];
      const cR0 = [f0.uR, 1 - f0.v];
      const cL1 = [f1.uL, 1 - f1.v];
      const cR1 = [f1.uR, 1 - f1.v];
      const vSide0 = i / (rings.length - 1);
      const vSide1 = (i + 1) / (rings.length - 1);

      const iFL0 = push(frontPos, frontUv, frontCanon, frontSurf, f0.pL, [0, vSide0], cL0, 0);
      const iFR0 = push(frontPos, frontUv, frontCanon, frontSurf, f0.pR, [1, vSide0], cR0, 0);
      const iFL1 = push(frontPos, frontUv, frontCanon, frontSurf, f1.pL, [0, vSide1], cL1, 0);
      const iFR1 = push(frontPos, frontUv, frontCanon, frontSurf, f1.pR, [1, vSide1], cR1, 0);
      quad(frontIdx, iFL0, iFL1, iFR1, iFR0);

      const iBL0 = push(hullPos, hullUv, hullCanon, hullSurf, b0.pL, [0.0, vSide0], cL0, 1);
      const iBL1 = push(hullPos, hullUv, hullCanon, hullSurf, b1.pL, [0.0, vSide1], cL1, 1);
      const iFL0s = push(hullPos, hullUv, hullCanon, hullSurf, f0.pL, [0.85, vSide0], cL0, 1);
      const iFL1s = push(hullPos, hullUv, hullCanon, hullSurf, f1.pL, [0.85, vSide1], cL1, 1);
      quad(hullIdx, iFL0s, iFL1s, iBL1, iBL0);

      const iBR0 = push(hullPos, hullUv, hullCanon, hullSurf, b0.pR, [1.0, vSide0], cR0, 1);
      const iBR1 = push(hullPos, hullUv, hullCanon, hullSurf, b1.pR, [1.0, vSide1], cR1, 1);
      const iFR0s = push(hullPos, hullUv, hullCanon, hullSurf, f0.pR, [0.85, vSide0], cR0, 1);
      const iFR1s = push(hullPos, hullUv, hullCanon, hullSurf, f1.pR, [0.85, vSide1], cR1, 1);
      quad(hullIdx, iFR0s, iBR0, iBR1, iFR1s);

      const iBLcap = push(hullPos, hullUv, hullCanon, hullSurf, b0.pL, [0.15, vSide0], cL0, 1);
      const iBRcap = push(hullPos, hullUv, hullCanon, hullSurf, b0.pR, [0.85, vSide0], cR0, 1);
      const iBL1c = push(hullPos, hullUv, hullCanon, hullSurf, b1.pL, [0.15, vSide1], cL1, 1);
      const iBR1c = push(hullPos, hullUv, hullCanon, hullSurf, b1.pR, [0.85, vSide1], cR1, 1);
      quad(hullIdx, iBRcap, iBR1c, iBL1c, iBLcap);
    }

    const lastF = front[front.length - 1];
    const lastB = back[back.length - 1];
    const cL = [lastF.uL, 1 - lastF.v];
    const cR = [lastF.uR, 1 - lastF.v];
    const a = push(hullPos, hullUv, hullCanon, hullSurf, lastF.pL, [0, 1], cL, 1);
    const b = push(hullPos, hullUv, hullCanon, hullSurf, lastF.pR, [1, 1], cR, 1);
    const c = push(hullPos, hullUv, hullCanon, hullSurf, lastB.pR, [1, 0.7], cR, 1);
    const d = push(hullPos, hullUv, hullCanon, hullSurf, lastB.pL, [0, 0.7], cL, 1);
    quad(hullIdx, a, b, c, d);

    const frontMat = track(new THREE.ShaderMaterial({
      uniforms: {
        uFrontTexture: { value: textures.sentinel },
        uSideTexture: { value: textures.sentinelSide },
        uCanonViewMatrix: { value: canonView },
        uCanonProjMatrix: { value: canonProj },
        uLightingStrength: { value: 0.40 },
      },
      vertexShader: SENTINEL_VERT,
      fragmentShader: SENTINEL_FRAG,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    }));
    const hullMat = track(new THREE.ShaderMaterial({
      uniforms: {
        uFrontTexture: { value: textures.sentinel },
        uSideTexture: { value: textures.sentinelSide },
        uCanonViewMatrix: { value: canonView },
        uCanonProjMatrix: { value: canonProj },
        uLightingStrength: { value: 0.55 },
      },
      vertexShader: SENTINEL_VERT,
      fragmentShader: SENTINEL_FRAG,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    }));

    const frontMesh = new THREE.Mesh(
      makeSentinelGeo(frontPos, frontUv, frontCanon, frontSurf, frontIdx),
      frontMat,
    );
    frontMesh.name = 'lp-sentinel-front';
    frontMesh.renderOrder = 5;
    group.add(frontMesh);

    const hullMesh = new THREE.Mesh(
      makeSentinelGeo(hullPos, hullUv, hullCanon, hullSurf, hullIdx),
      hullMat,
    );
    hullMesh.name = 'lp-sentinel-hull';
    hullMesh.renderOrder = 5;
    group.add(hullMesh);
  }

  function buildNeedles() {
    const front = calibratedCard(textures.needles, 0.65, 3, { depthWrite: true, alphaTest: 0.08 });
    front.name = 'lp-needles-front';
    group.add(front);

    const u0 = 0.528;
    const u1 = 0.585;
    const vTop = 0.615;
    const vBot = 0.835;
    const z = 0.65;
    const a = unprojectCanon(u0, vTop, z);
    const b = unprojectCanon(u1, vTop, z);
    const c = unprojectCanon(u1, vBot, z);
    const d = unprojectCanon(u0, vBot, z);
    const pos = [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z];
    const uv = [u0, 1 - vTop, u1, 1 - vTop, u1, 1 - vBot, u0, 1 - vBot];
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex([0, 3, 1, 1, 3, 2]);
    geo.computeVertexNormals();
    const mat = track(new THREE.MeshBasicMaterial({
      map: textures.needles,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.08,
      side: THREE.DoubleSide,
    }));
    const cx = (a.x + b.x) * 0.5;
    const cy = (a.y + d.y) * 0.5;
    const mkCross = (yaw, name) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.renderOrder = 3;
      const pivot = new THREE.Group();
      pivot.position.set(cx, cy, z);
      mesh.position.set(-cx, -cy, -z);
      pivot.add(mesh);
      pivot.rotation.y = yaw;
      pivot.name = `${name}-pivot`;
      group.add(pivot);
    };
    mkCross(1.15, 'lp-needles-cross');
  }

  function buildSkyAndHaze() {
    skyFollow = new THREE.Group();
    skyFollow.name = 'lp-sky-follow';
    group.add(skyFollow);

    const skyMat = track(new THREE.ShaderMaterial({
      uniforms: {
        uSky: { value: textures.sky },
        uHaze: { value: textures.haze },
        uCover: { value: 2.0 / SKY_SIZE },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide,
    }));
    const skyGeo = track(new THREE.PlaneGeometry(SKY_SIZE, SKY_SIZE));
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.position.set(0, 0, -SKY_DIST);
    skyMesh.renderOrder = 0;
    skyMesh.name = 'lp-umbral-giant';
    skyMesh.frustumCulled = false;
    skyFollow.add(skyMesh);

    const voidMat = track(new THREE.MeshBasicMaterial({
      color: 0x0b1020,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    }));
    const voidMesh = new THREE.Mesh(track(new THREE.SphereGeometry(48, 16, 12)), voidMat);
    voidMesh.renderOrder = -1;
    voidMesh.name = 'lp-void-sphere';
    voidMesh.frustumCulled = false;
    skyFollow.add(voidMesh);

    const hazeMat = track(new THREE.MeshBasicMaterial({
      map: textures.haze,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    }));
    const mkHaze = (name, w, h, pos, rotY, order) => {
      const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), hazeMat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.y = rotY;
      mesh.renderOrder = order;
      mesh.name = name;
      group.add(mesh);
    };
    mkHaze('lp-haze-left', 2.8, 2.4, [-1.85, 0.20, 0.05], 0.85, 1);
    mkHaze('lp-haze-right', 2.6, 2.4, [1.95, 0.22, -0.10], -0.85, 1);

    const silMat = track(new THREE.MeshBasicMaterial({
      color: 0x152038,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    const sil = new THREE.Mesh(track(new THREE.PlaneGeometry(0.18, 0.55)), silMat);
    sil.position.set(-1.35, -0.12, 0.05);
    sil.rotation.y = 0.55;
    sil.renderOrder = 1;
    sil.name = 'lp-silhouette-left';
    group.add(sil);
    const sil2 = sil.clone();
    sil2.position.set(1.45, -0.10, -0.15);
    sil2.rotation.y = -0.35;
    sil2.scale.set(1.6, 1.4, 1);
    sil2.name = 'lp-silhouette-right';
    group.add(sil2);
  }

  function buildRibbons() {
    ribbonA = calibratedCard(textures.ribbons, 0.40, 2, {
      depthWrite: false,
      alphaTest: 0.04,
      transparent: true,
    });
    ribbonA.name = 'lp-ribbons';
    group.add(ribbonA);
  }

  function buildFlare() {
    const flare = calibratedCard(textures.flare, 0.95, 7, {
      additive: true,
      depthTest: false,
      depthWrite: false,
      alphaTest: 0.0,
      transparent: true,
    });
    flare.material.alphaTest = 0;
    flare.name = 'lp-flare';
    group.add(flare);
  }

  async function loadAssets() {
    const loader = new THREE.TextureLoader();
    const load = (url) => loader.loadAsync(url);
    const [
      texSky,
      texRibbons,
      texSentinel,
      texNeedles,
      texFlare,
      texCitadelFront,
      texCitadelSide,
      texOcean,
      texSentinelSide,
      texHaze,
      meshData,
      ringsData,
    ] = await Promise.all([
      load('/reference/experimental/living-poster-v0/sky-clean-1024.png'),
      load('/reference/experimental/prototype-02/layer-b-ribbons.png'),
      load('/reference/experimental/prototype-02/layer-c-sentinel.png'),
      load('/reference/experimental/prototype-02/layer-e-needles.png'),
      load('/reference/experimental/prototype-02/layer-g-flare.png'),
      load('/reference/experimental/prototype-04/generated/layer-d-citadel-p4.png'),
      load('/reference/experimental/prototype-04/generated/citadel-side-texture.png'),
      load('/reference/experimental/living-poster-v0/ocean-continuation-2048x1024.png'),
      load('/reference/experimental/living-poster-v0/sentinel-side-256x512.png'),
      load('/reference/experimental/living-poster-v0/haze-fill-512.png'),
      fetch('/reference/experimental/prototype-04/generated/citadel-mesh-data.json').then((r) => r.json()),
      fetch('/reference/experimental/living-poster-v0/sentinel-rings.json').then((r) => r.json()),
    ]);

    const color = [
      texSky, texRibbons, texSentinel, texNeedles, texFlare,
      texCitadelFront, texCitadelSide, texOcean, texSentinelSide, texHaze,
    ];
    color.forEach((t) => {
      colorize(t, THREE);
      track(t);
    });

    textures.sky = texSky;
    textures.ribbons = texRibbons;
    textures.sentinel = texSentinel;
    textures.needles = texNeedles;
    textures.flare = texFlare;
    textures.citadelFront = texCitadelFront;
    textures.citadelSide = texCitadelSide;
    textures.ocean = texOcean;
    textures.sentinelSide = texSentinelSide;
    textures.haze = texHaze;
    textures.meshData = meshData;

    buildSkyAndHaze();
    buildRibbons();
    buildNeedles();
    buildCitadel();
    buildSentinel(ringsData);
    buildWater();
    buildFlare();

    loaded = true;
    return group;
  }

  function update(dt, cam) {
    const c = cam || camera;
    if (!loaded || !c) return;
    if (skyFollow) {
      skyFollow.position.set(c.position.x, c.position.y, c.position.z);
    }
    ribbonT += dt || 0;
    if (ribbonA) {
      ribbonA.position.x = Math.sin(ribbonT * 0.012) * 0.002;
    }
  }

  function dispose() {
    group.traverse((obj) => {
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m && m.dispose && m.dispose());
      }
    });
    resources.forEach((r) => {
      if (r && r.dispose) r.dispose();
    });
    resources.length = 0;
    group.clear();
    loaded = false;
  }

  return {
    group,
    bounds,
    colliders,
    loadAssets,
    update,
    dispose,
  };
}
