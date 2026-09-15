import * as THREE from 'three';

// ============================================================================
// Living Poster V1 — Brushstroke Particles
// Instanced painterly shards and flecks that detach from luminous regions of the
// poster, drift during Awakening, and stream backward past the camera lens
// during Melt to sell "crossing the canvas".
// ============================================================================

export class BrushstrokeParticles {
  constructor(count = 450) {
    this.count = count;
    this.group = new THREE.Group();
    this.group.name = 'lp-brushstroke-particles';

    this._instancedMesh = null;
    this._particleData = [];
    this._dummy = new THREE.Object3D();
    this._colorHelper = new THREE.Color();
    this.active = true;

    this._init();
  }

  _init() {
    // Small faceted shard geometry (tapered crystal shard / painterly fleck)
    const geo = new THREE.BufferGeometry();
    const s = 0.018;
    const positions = new Float32Array([
      0, s * 1.5, 0,
      -s * 0.4, 0, s * 0.2,
      s * 0.4, 0, s * 0.2,

      0, s * 1.5, 0,
      s * 0.4, 0, s * 0.2,
      0, -s * 0.8, 0,

      0, s * 1.5, 0,
      0, -s * 0.8, 0,
      -s * 0.4, 0, s * 0.2,

      // Rear facet
      0, s * 1.5, 0,
      s * 0.4, 0, -s * 0.2,
      -s * 0.4, 0, -s * 0.2,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    this._instancedMesh = new THREE.InstancedMesh(geo, mat, this.count);
    this._instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this._instancedMesh);

    // Palette colors from poster
    const PALETTE = [
      new THREE.Color(0xffe580), // Gold flare
      new THREE.Color(0xffffff), // White glint
      new THREE.Color(0x00e5ff), // Electric cyan
      new THREE.Color(0x5ffbf1), // Aquamarine
      new THREE.Color(0xff007f), // Magenta
      new THREE.Color(0xff80bf), // Dusty pink
      new THREE.Color(0x7aaaff), // Sapphire light
    ];

    // Seed deterministic particle emitter locations based on poster features
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < this.count; i++) {
      const type = rand();
      let u, v, zOrigin, color;

      if (type < 0.35) {
        // Solar Citadel peak & flare region
        u = 0.55 + (rand() - 0.5) * 0.22;
        v = 0.35 + (rand() - 0.5) * 0.18;
        zOrigin = 0.95;
        color = rand() < 0.6 ? PALETTE[0] : (rand() < 0.5 ? PALETTE[1] : PALETTE[2]);
      } else if (type < 0.65) {
        // Sentinel crystal crest & cyan highlights
        u = 0.12 + (rand() - 0.5) * 0.16;
        v = 0.40 + (rand() - 0.5) * 0.35;
        zOrigin = 1.25;
        color = rand() < 0.65 ? PALETTE[2] : (rand() < 0.5 ? PALETTE[3] : PALETTE[1]);
      } else if (type < 0.85) {
        // Ocean wave foam crests
        u = 0.10 + rand() * 0.80;
        v = 0.84 + rand() * 0.14;
        zOrigin = 1.40;
        color = rand() < 0.6 ? PALETTE[3] : PALETTE[6];
      } else {
        // Magenta atmospheric ribbons
        u = 0.15 + rand() * 0.70;
        v = 0.45 + (rand() - 0.5) * 0.20;
        zOrigin = 0.45;
        color = rand() < 0.7 ? PALETTE[4] : PALETTE[5];
      }

      // Canonical unprojection to 3D world space at t=0
      const d = 2.0 - zOrigin;
      const xOrigin = (u - 0.5) * d;
      const yOrigin = (0.5 - v) * d;

      this._particleData.push({
        origin: new THREE.Vector3(xOrigin, yOrigin, zOrigin),
        pos: new THREE.Vector3(xOrigin, yOrigin, zOrigin),
        rot: new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2),
        rotSpeed: new THREE.Vector3((rand() - 0.5) * 4, (rand() - 0.5) * 4, (rand() - 0.5) * 4),
        scale: 0.6 + rand() * 0.8,
        driftSpeed: 0.05 + rand() * 0.12,
        streamSpeed: 0.4 + rand() * 0.8,
        streamOffset: rand() * 2.0,
        driftPhase: rand() * Math.PI * 2,
      });

      this._instancedMesh.setColorAt(i, color);
    }
    this._instancedMesh.instanceColor.needsUpdate = true;
  }

  update(elapsed, camera) {
    if (!this.active || !this._instancedMesh) return;

    // 0–1s: completely hidden/dormant
    if (elapsed < 1.0) {
      this._instancedMesh.visible = false;
      return;
    }

    this._instancedMesh.visible = true;

    // Awaken progress (1–4s)
    const awaken = Math.min(1.0, Math.max(0.0, (elapsed - 1.0) / 3.0));
    // Melt progress (4–8s)
    const melt = Math.min(1.0, Math.max(0.0, (elapsed - 4.0) / 4.0));
    // Threshold dissolve (7.5–8.5s)
    const fade = Math.min(1.0, Math.max(0.0, (elapsed - 7.5) / 0.8));
    if (fade >= 0.99) {
      this._instancedMesh.visible = false;
      return;
    }

    const camZ = camera ? camera.position.z : 2.0;

    for (let i = 0; i < this.count; i++) {
      const p = this._particleData[i];

      // Gentle Brownian floating drift during awakening
      const tDrift = elapsed * p.driftSpeed + p.driftPhase;
      const driftX = Math.sin(tDrift * 1.5) * 0.015 * awaken;
      const driftY = Math.cos(tDrift * 2.0) * 0.015 * awaken;
      const driftZ = Math.sin(tDrift * 1.2) * 0.03 * awaken;

      // During melt: stream backward past camera lens as camera approaches
      let streamZ = 0;
      let streamSpreadX = 0;
      let streamSpreadY = 0;

      if (melt > 0) {
        // Accelerate backward (+Z) toward and past camera
        const tStream = melt * melt * p.streamSpeed * 2.5;
        streamZ = tStream;
        // Natural conical expansion as shards whip past lens
        streamSpreadX = (p.origin.x) * tStream * 0.4;
        streamSpreadY = (p.origin.y) * tStream * 0.4;
      }

      p.pos.x = p.origin.x + driftX + streamSpreadX;
      p.pos.y = p.origin.y + driftY + streamSpreadY;
      p.pos.z = p.origin.z + driftZ + streamZ;

      // Stateless deterministic rotation based on elapsed time
      p.rot.x = elapsed * p.rotSpeed.x;
      p.rot.y = elapsed * p.rotSpeed.y;
      p.rot.z = elapsed * p.rotSpeed.z;

      // Scale: swells during awaken, stretches during melt, fades behind camera or at threshold
      let scale = p.scale * Math.min(1.0, awaken * 1.5);
      if (p.pos.z > camZ + 0.1) {
        scale = 0.0; // Past camera lens
      } else if (p.pos.z > camZ - 0.3) {
        // Fade out as it hits camera near plane
        scale *= Math.max(0.0, (camZ - p.pos.z) / 0.3);
      }

      this._dummy.position.copy(p.pos);
      this._dummy.rotation.copy(p.rot);
      this._dummy.scale.set(scale, scale * (1.0 + melt * 2.0), scale); // Stretches into streak
      this._dummy.updateMatrix();

      this._instancedMesh.setMatrixAt(i, this._dummy.matrix);
    }

    this._instancedMesh.instanceMatrix.needsUpdate = true;
    this._instancedMesh.material.opacity = (1.0 - fade) * 0.9;
  }

  dispose() {
    this.active = false;
    if (this._instancedMesh) {
      if (this._instancedMesh.geometry) this._instancedMesh.geometry.dispose();
      if (this._instancedMesh.material) this._instancedMesh.material.dispose();
      this.group.remove(this._instancedMesh);
      this._instancedMesh = null;
    }
    this._particleData.length = 0;
  }
}
