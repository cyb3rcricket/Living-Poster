import * as THREE from 'three';

// ============================================================================
// Living Poster V1 — Procedural Crystal Generator
// Seeded deterministic generator for low-poly crystal spires, blades,
// clustered shards, and irregular towers with painterly vertex colors.
// Strictly adheres to the poster color palette: no greens/browns/rocks.
// ============================================================================

export const CRYSTAL_PALETTE = Object.freeze({
  deepIndigo: new THREE.Color(0x090f26),
  blueBlack: new THREE.Color(0x03060e),
  darkSapphire: new THREE.Color(0x0e275c),
  sapphire: new THREE.Color(0x184896),
  cyan: new THREE.Color(0x00e5ff),
  aquamarine: new THREE.Color(0x5ffbf1),
  whiteBlue: new THREE.Color(0xe8f8ff),
  violet: new THREE.Color(0x4d1670),
  magenta: new THREE.Color(0xff007f),
  dustyPink: new THREE.Color(0xff80bf),
  goldFlare: new THREE.Color(0xffe580),
});

class PRNG {
  constructor(seed = 12345) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/**
 * Creates a low-poly tapered crystal spire with faceted chisel or point apex.
 */
export function createCrystalSpireGeometry({
  height = 1.0,
  radius = 0.12,
  segments = 6,
  taper = 0.2,
  chiselAngle = 0.35,
  seed = 1,
} = {}) {
  const rng = new PRNG(seed);
  const positions = [];
  const colors = [];
  const growthPhase = [];
  const fragmentOffsets = [];

  // Generate rings along height
  const rings = 4;
  const vertices = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const y = t * height;
    const rCurrent = radius * (1.0 - t * (1.0 - taper));
    const ringVerts = [];

    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2 + (rng.next() - 0.5) * 0.15;
      const jitterR = rCurrent * (1.0 + (rng.next() - 0.5) * 0.2);
      const x = Math.cos(angle) * jitterR;
      const z = Math.sin(angle) * jitterR;
      ringVerts.push({ x, y, z, t });
    }
    vertices.push(ringVerts);
  }

  // Apex tip
  const apex = {
    x: (rng.next() - 0.5) * radius * 0.4,
    y: height + rng.range(0.05, 0.15),
    z: (rng.next() - 0.5) * radius * 0.4,
    t: 1.0,
  };

  function pickColor(t, isHighlight = false) {
    const col = new THREE.Color();
    if (t < 0.2) {
      col.copy(CRYSTAL_PALETTE.deepIndigo).lerp(CRYSTAL_PALETTE.darkSapphire, t / 0.2);
    } else if (t < 0.6) {
      const u = (t - 0.2) / 0.4;
      col.copy(CRYSTAL_PALETTE.darkSapphire).lerp(CRYSTAL_PALETTE.sapphire, u);
      if (rng.next() < 0.2) col.lerp(CRYSTAL_PALETTE.violet, 0.4);
    } else if (t < 0.85) {
      const u = (t - 0.6) / 0.25;
      col.copy(CRYSTAL_PALETTE.sapphire).lerp(CRYSTAL_PALETTE.cyan, u);
      if (rng.next() < 0.25) col.lerp(CRYSTAL_PALETTE.magenta, 0.35);
    } else {
      const u = (t - 0.85) / 0.15;
      col.copy(CRYSTAL_PALETTE.cyan).lerp(CRYSTAL_PALETTE.aquamarine, u);
      if (isHighlight || rng.next() < 0.4) {
        col.lerp(CRYSTAL_PALETTE.whiteBlue, 0.6);
      }
      if (rng.next() < 0.15) {
        col.copy(CRYSTAL_PALETTE.goldFlare);
      }
    }
    return col;
  }

  function addTri(p1, p2, p3, isApex = false) {
    const fragOff = [
      (rng.next() - 0.5) * 0.3,
      (rng.next() - 0.5) * 0.3,
      (rng.next() - 0.5) * 0.3,
    ];

    [p1, p2, p3].forEach((p) => {
      positions.push(p.x, p.y, p.z);
      const c = pickColor(p.t, isApex);
      colors.push(c.r, c.g, c.b);
      growthPhase.push(p.t);
      fragmentOffsets.push(fragOff[0], fragOff[1], fragOff[2]);
    });
  }

  // Side faces between rings
  for (let r = 0; r < rings; r++) {
    const r0 = vertices[r];
    const r1 = vertices[r + 1];
    for (let s = 0; s < segments; s++) {
      const sNext = (s + 1) % segments;
      const v00 = r0[s];
      const v01 = r0[sNext];
      const v10 = r1[s];
      const v11 = r1[sNext];

      addTri(v00, v10, v01);
      addTri(v01, v10, v11);
    }
  }

  // Top cap to apex
  const topRing = vertices[rings];
  for (let s = 0; s < segments; s++) {
    const sNext = (s + 1) % segments;
    addTri(topRing[s], apex, topRing[sNext], true);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aGrowthPhase', new THREE.Float32BufferAttribute(growthPhase, 1));
  geo.setAttribute('aFragmentOffset', new THREE.Float32BufferAttribute(fragmentOffsets, 3));
  geo.computeVertexNormals();

  return geo;
}

/**
 * Creates an angled crystal blade jutting out at an oblique angle.
 */
export function createCrystalBladeGeometry({
  length = 1.2,
  width = 0.20,
  thickness = 0.05,
  tiltAngle = 0.45,
  seed = 2,
} = {}) {
  const rng = new PRNG(seed);
  const positions = [];
  const colors = [];
  const growthPhase = [];
  const fragmentOffsets = [];

  const rotZ = tiltAngle;
  const cosT = Math.cos(rotZ);
  const sinT = Math.sin(rotZ);

  function transform(x, y, z) {
    return {
      x: x * cosT - y * sinT,
      y: x * sinT + y * cosT,
      z,
      t: Math.min(1.0, Math.max(0.0, y / length)),
    };
  }

  const v0 = transform(0, 0, 0);
  const v1 = transform(-width * 0.5, length * 0.3, thickness * 0.5);
  const v2 = transform(width * 0.5, length * 0.3, thickness * 0.5);
  const v3 = transform(-width * 0.35, length * 0.7, thickness * 0.3);
  const v4 = transform(width * 0.35, length * 0.7, thickness * 0.3);
  const vTip = transform(0, length, 0);

  const b1 = transform(-width * 0.5, length * 0.3, -thickness * 0.5);
  const b2 = transform(width * 0.5, length * 0.3, -thickness * 0.5);
  const b3 = transform(-width * 0.35, length * 0.7, -thickness * 0.3);
  const b4 = transform(width * 0.35, length * 0.7, -thickness * 0.3);

  function pickColor(t) {
    const col = new THREE.Color();
    if (t < 0.25) {
      col.copy(CRYSTAL_PALETTE.deepIndigo).lerp(CRYSTAL_PALETTE.darkSapphire, t / 0.25);
    } else if (t < 0.7) {
      const u = (t - 0.25) / 0.45;
      col.copy(CRYSTAL_PALETTE.darkSapphire).lerp(CRYSTAL_PALETTE.sapphire, u);
      if (rng.next() < 0.3) col.lerp(CRYSTAL_PALETTE.cyan, 0.4);
    } else {
      const u = (t - 0.7) / 0.3;
      col.copy(CRYSTAL_PALETTE.cyan).lerp(CRYSTAL_PALETTE.aquamarine, u);
      if (rng.next() < 0.5) col.lerp(CRYSTAL_PALETTE.whiteBlue, 0.5);
    }
    return col;
  }

  function addTri(p1, p2, p3) {
    const fragOff = [(rng.next() - 0.5) * 0.25, (rng.next() - 0.5) * 0.25, (rng.next() - 0.5) * 0.25];
    [p1, p2, p3].forEach((p) => {
      positions.push(p.x, p.y, p.z);
      const c = pickColor(p.t);
      colors.push(c.r, c.g, c.b);
      growthPhase.push(p.t);
      fragmentOffsets.push(fragOff[0], fragOff[1], fragOff[2]);
    });
  }

  // Front facets
  addTri(v0, v1, v2);
  addTri(v1, v3, v2);
  addTri(v2, v3, v4);
  addTri(v3, vTip, v4);

  // Back facets
  addTri(v0, b2, b1);
  addTri(b1, b2, b3);
  addTri(b2, b4, b3);
  addTri(b3, b4, vTip);

  // Sharp sides
  addTri(v0, b1, v1);
  addTri(v1, b1, v3);
  addTri(v3, b1, b3);
  addTri(v3, b3, vTip);

  addTri(v0, v2, b2);
  addTri(v2, v4, b2);
  addTri(v4, b4, b2);
  addTri(v4, vTip, b4);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aGrowthPhase', new THREE.Float32BufferAttribute(growthPhase, 1));
  geo.setAttribute('aFragmentOffset', new THREE.Float32BufferAttribute(fragmentOffsets, 3));
  geo.computeVertexNormals();

  return geo;
}

/**
 * Creates a clustered group of intersecting crystal shards.
 */
export function createCrystalClusterGroup({ count = 7, radius = 0.35, heightRange = [0.4, 0.9], seed = 3 } = {}) {
  const rng = new PRNG(seed);
  const group = new THREE.Group();
  group.name = `lp-crystal-cluster-${seed}`;

  for (let i = 0; i < count; i++) {
    const isBlade = rng.next() < 0.45;
    const h = rng.range(heightRange[0], heightRange[1]);
    const r = rng.range(0.04, 0.09);

    let geo;
    if (isBlade) {
      geo = createCrystalBladeGeometry({
        length: h,
        width: r * 2.2,
        tiltAngle: rng.range(-0.4, 0.4),
        seed: seed + i * 17,
      });
    } else {
      geo = createCrystalSpireGeometry({
        height: h,
        radius: r,
        segments: 5,
        taper: rng.range(0.15, 0.35),
        seed: seed + i * 17,
      });
    }

    const angle = (i / count) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const dist = rng.range(0.02, radius);
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;

    // Create a mesh with standard painterly material
    const mesh = new THREE.Mesh(geo);
    mesh.position.set(px, 0, pz);
    mesh.rotation.y = rng.range(0, Math.PI * 2);
    mesh.rotation.x = rng.range(-0.15, 0.15);
    mesh.rotation.z = rng.range(-0.15, 0.15);

    group.add(mesh);
  }

  return group;
}

/**
 * Merges a group of crystal meshes into a single BufferGeometry for minimal draw calls.
 */
export function mergeCrystalGeometries(group) {
  const mergedPositions = [];
  const mergedColors = [];
  const mergedGrowthPhase = [];
  const mergedFragmentOffsets = [];
  const mergedNormals = [];

  group.updateMatrixWorld(true);

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const growthAttr = geo.attributes.aGrowthPhase;
      const fragAttr = geo.attributes.aFragmentOffset;
      const normAttr = geo.attributes.normal;

      const m = child.matrixWorld;
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      const rot = new THREE.Matrix3().getNormalMatrix(m);

      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(m);
        mergedPositions.push(v.x, v.y, v.z);

        if (normAttr) {
          n.fromBufferAttribute(normAttr, i).applyMatrix3(rot).normalize();
          mergedNormals.push(n.x, n.y, n.z);
        } else {
          mergedNormals.push(0, 1, 0);
        }

        if (colAttr) {
          mergedColors.push(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i));
        } else {
          mergedColors.push(0.1, 0.5, 0.9);
        }

        mergedGrowthPhase.push(growthAttr ? growthAttr.getX(i) : 0.5);

        if (fragAttr) {
          mergedFragmentOffsets.push(fragAttr.getX(i), fragAttr.getY(i), fragAttr.getZ(i));
        } else {
          mergedFragmentOffsets.push(0, 0, 0);
        }
      }
    }
  });

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
  mergedGeo.setAttribute('color', new THREE.Float32BufferAttribute(mergedColors, 3));
  mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNormals, 3));
  mergedGeo.setAttribute('aGrowthPhase', new THREE.Float32BufferAttribute(mergedGrowthPhase, 1));
  mergedGeo.setAttribute('aFragmentOffset', new THREE.Float32BufferAttribute(mergedFragmentOffsets, 3));

  return mergedGeo;
}
