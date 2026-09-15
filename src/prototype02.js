import * as THREE from 'three';

// ============================================================================
// Prototype 02 — Independent Proxy Reconstruction
// ============================================================================

export class Prototype02 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    // Canonical Camera Calibration
    this.canonicalCamPos = new THREE.Vector3(0, 0, 2.0);
    this.canonicalFov = 53.130102; // At Z=2, plane of height 2 fills viewport

    this.config = {
      parallaxEnabled: true,
      scriptedSweep: false,
      sweepSpeed: 0.8,              // Hz
      parallaxShift: 0.055,         // Max horizontal/vertical camera translation
      parallaxTilt: 0.025,          // Max angular pitch/yaw (radians)
      cameraPush: 0.080,            // Subtle forward camera advance
      flareMode: 'spire',           // 'spire' | 'sky'
      comparisonMode: 'proxy',      // 'original' | 'proxy' | 'mask'
      // Layer depths (Z positions along view axis, 0 <= Z < 2.0)
      depths: {
        sky: 0.00,                  // Layer A: Deep Sky / Planet
        ribbons: 0.40,              // Layer B: Magenta Ribbons
        needles: 0.65,              // Layer E: Distant Needles
        citadel: 0.95,              // Layer D: Solar Citadel
        sentinel: 1.25,             // Layer C: Western Sentinel (nearer than Citadel)
        water: 1.15,                // Layer F: Water ground plane
        flare: 0.95,                // Layer G: Solstice Flare (spire-locked default)
      },
      // Individual layer visibility toggles for inspection
      visible: {
        sky: true,
        ribbons: true,
        sentinel: true,
        citadel: true,
        needles: true,
        water: true,
        flare: true,
      }
    };

    this.state = {
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      isLoaded: false,
      sweepTime: 0,
      activeComparison: 'proxy',    // 'original' | 'proxy' | 'mask'
    };

    // Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 100.0);
    this.camera.position.copy(this.canonicalCamPos);

    // Canonical projection matrices for projective texturing
    this.canonicalViewMatrix = new THREE.Matrix4();
    this.canonicalProjMatrix = new THREE.Matrix4();
    this.updateCanonicalMatrices();

    // Meshes and groups
    this.proxyGroup = new THREE.Group();
    this.scene.add(this.proxyGroup);

    this.layerMeshes = {};
    this.originalMesh = null;
    this.maskMesh = null;
  }

  updateCanonicalMatrices() {
    const dummyCam = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 100.0);
    dummyCam.position.copy(this.canonicalCamPos);
    dummyCam.updateMatrixWorld(true);
    this.canonicalViewMatrix.copy(dummyCam.matrixWorldInverse);
    this.canonicalProjMatrix.copy(dummyCam.projectionMatrix);
  }

  async loadAssets() {
    const textureLoader = new THREE.TextureLoader();

    // Load all layer textures in parallel
    const [
      texSky,
      texRibbons,
      texSentinel,
      texCitadel,
      texNeedles,
      texWater,
      texFlare,
      texOriginal,
      texMaskComp,
    ] = await Promise.all([
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-a-deep-sky.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-b-ribbons.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-c-sentinel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-d-citadel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-e-needles.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-f-water.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-g-flare.png'),
      textureLoader.loadAsync('/reference/poster.jpeg'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/generated/segmentation-masks-composite.png'),
    ]);

    // Ensure sRGB color space
    const allTextures = [
      texSky, texRibbons, texSentinel, texCitadel, texNeedles,
      texWater, texFlare, texOriginal, texMaskComp
    ];
    for (const t of allTextures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
    }

    this.textures = {
      sky: texSky,
      ribbons: texRibbons,
      sentinel: texSentinel,
      citadel: texCitadel,
      needles: texNeedles,
      water: texWater,
      flare: texFlare,
      original: texOriginal,
      maskComp: texMaskComp,
    };

    this.buildProxies();
    this.buildComparisonMeshes();
    this.setComparisonMode(this.config.comparisonMode);

    this.state.isLoaded = true;
    console.log('Prototype 02 Independent Proxy Reconstruction initialized.');
  }

  // Helper to create a frustum-calibrated planar proxy card
  createCalibratedCard(texture, zDepth, renderOrder, isAdditive = false) {
    const dist = this.canonicalCamPos.z - zDepth;
    const size = dist; // With fov=53.13°, visible dimension = distance

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: renderOrder === 1, // Deep sky writes depth, cutout layers blend
      blending: isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, zDepth);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  // Create Projective Inclined Ground Plane for Layer F (Water)
  createProjectiveWaterMesh(texture, renderOrder) {
    // Sloped ground plane from near foreground (Z=1.40, Y=-0.95) to horizon (Z=0.65, Y=-0.67)
    // Using projective texture mapping so canonical view is 100% pixel-perfect to poster.jpeg
    const subdivisions = 32;
    const geo = new THREE.PlaneGeometry(2.0, 1.2, subdivisions, subdivisions);

    // Custom shader for camera projective texture mapping
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uCanonViewMat: { value: this.canonicalViewMatrix },
        uCanonProjMat: { value: this.canonicalProjMatrix },
        uOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec4 vProjUv;
        uniform mat4 uCanonProjMat;
        uniform mat4 uCanonViewMat;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vProjUv = uCanonProjMat * uCanonViewMat * worldPos;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec4 vProjUv;
        uniform sampler2D uTexture;
        uniform float uOpacity;

        void main() {
          vec2 uv = (vProjUv.xy / vProjUv.w) * 0.5 + 0.5;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            discard;
          }
          vec4 color = texture2D(uTexture, uv);
          gl_FragColor = vec4(color.rgb, color.a * uOpacity);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Align inclined surface to match water band
    const zHorizon = this.config.depths.needles; // meets needles at horizon (0.65)
    const zNear = 1.35;                         // closer at foreground
    const zMid = (zHorizon + zNear) * 0.5;
    const dMid = this.canonicalCamPos.z - zMid;

    mesh.position.set(0, -0.68 * dMid, zMid);
    mesh.rotation.x = -0.32; // inclined alien sea plane
    mesh.scale.set(dMid * 1.15, dMid * 0.85, 1.0);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  buildProxies() {
    // 1. Layer A — Deep Sky (Background Plane, Z = 0.00)
    const meshSky = this.createCalibratedCard(this.textures.sky, this.config.depths.sky, 1);
    this.proxyGroup.add(meshSky);
    this.layerMeshes.sky = meshSky;

    // 2. Layer B — Magenta Atmospheric Ribbons (Z = 0.40)
    const meshRibbons = this.createCalibratedCard(this.textures.ribbons, this.config.depths.ribbons, 2);
    this.proxyGroup.add(meshRibbons);
    this.layerMeshes.ribbons = meshRibbons;

    // 3. Layer E — Distant Formations & Needles (Z = 0.65)
    const meshNeedles = this.createCalibratedCard(this.textures.needles, this.config.depths.needles, 3);
    this.proxyGroup.add(meshNeedles);
    this.layerMeshes.needles = meshNeedles;

    // 4. Layer D — Solar Citadel (Major Right Formation, Z = 0.95)
    const meshCitadel = this.createCalibratedCard(this.textures.citadel, this.config.depths.citadel, 4);
    this.proxyGroup.add(meshCitadel);
    this.layerMeshes.citadel = meshCitadel;

    // 5. Layer C — Western Sentinel (Major Left Formation, Z = 1.25, closer than Citadel)
    const meshSentinel = this.createCalibratedCard(this.textures.sentinel, this.config.depths.sentinel, 5);
    this.proxyGroup.add(meshSentinel);
    this.layerMeshes.sentinel = meshSentinel;

    // 6. Layer F — Foreground Water (Calibrated proxy card at Z = 1.15)
    // Placed at near-foreground depth for strong wave parallax
    const meshWater = this.createCalibratedCard(this.textures.water, this.config.depths.water, 6);
    this.proxyGroup.add(meshWater);
    this.layerMeshes.water = meshWater;

    // 7. Layer G — Solstice Flare Card (Additive, toggleable between Citadel apex and Sky)
    const flareZ = this.config.flareMode === 'spire' ? this.config.depths.citadel : this.config.depths.sky;
    const meshFlare = this.createCalibratedCard(this.textures.flare, flareZ, 7, true);
    this.proxyGroup.add(meshFlare);
    this.layerMeshes.flare = meshFlare;
  }

  buildComparisonMeshes() {
    // 1. Original Flat Poster Mesh (Z = 0.0, exact 2.0 x 2.0 plane)
    const origGeo = new THREE.PlaneGeometry(2.0, 2.0);
    const origMat = new THREE.MeshBasicMaterial({
      map: this.textures.original,
      depthTest: true,
      depthWrite: true,
    });
    this.originalMesh = new THREE.Mesh(origGeo, origMat);
    this.originalMesh.position.set(0, 0, 0);
    this.originalMesh.visible = false;
    this.scene.add(this.originalMesh);

    // 2. Segmentation Mask Composite Mesh (Diagnostic visualization)
    const maskGeo = new THREE.PlaneGeometry(2.0, 2.0);
    const maskMat = new THREE.MeshBasicMaterial({
      map: this.textures.maskComp,
      depthTest: true,
      depthWrite: true,
    });
    this.maskMesh = new THREE.Mesh(maskGeo, maskMat);
    this.maskMesh.position.set(0, 0, 0);
    this.maskMesh.visible = false;
    this.scene.add(this.maskMesh);
  }

  setComparisonMode(mode) {
    this.config.comparisonMode = mode;
    this.state.activeComparison = mode;

    if (mode === 'original') {
      this.proxyGroup.visible = false;
      this.originalMesh.visible = true;
      this.maskMesh.visible = false;
      this.showToast('Comparison: ORIGINAL Flat Poster (1:1 Reference)');
    } else if (mode === 'proxy') {
      this.proxyGroup.visible = true;
      this.originalMesh.visible = false;
      this.maskMesh.visible = false;
      this.showToast('Comparison: PROXY Reconstruction (Canonical Camera Locked)');
    } else if (mode === 'parallax') {
      this.proxyGroup.visible = true;
      this.originalMesh.visible = false;
      this.maskMesh.visible = false;
      this.config.parallaxEnabled = true;
      this.showToast('Comparison: PARALLAX Active (Spatial Movement)');
    } else if (mode === 'mask') {
      this.proxyGroup.visible = false;
      this.originalMesh.visible = false;
      this.maskMesh.visible = true;
      this.showToast('Comparison: EDGE / MASK Debug Map');
    }
  }

  toggleOriginalProxy() {
    if (this.config.comparisonMode === 'original') {
      this.setComparisonMode('proxy');
    } else {
      this.setComparisonMode('original');
    }
    return this.config.comparisonMode;
  }

  toggleParallax() {
    if (this.config.comparisonMode === 'parallax') {
      this.setComparisonMode('proxy');
    } else {
      this.setComparisonMode('parallax');
    }
    return this.config.comparisonMode === 'parallax';
  }

  toggleMaskDebug() {
    if (this.config.comparisonMode === 'mask') {
      this.setComparisonMode('proxy');
    } else {
      this.setComparisonMode('mask');
    }
    return this.config.comparisonMode;
  }

  toggleScriptedSweep() {
    this.config.scriptedSweep = !this.config.scriptedSweep;
    if (this.config.scriptedSweep) {
      this.config.parallaxEnabled = true;
      this.showToast('Scripted Sweep: ACTIVE (Repeatable Evaluation)');
    } else {
      this.showToast('Scripted Sweep: PAUSED (Manual Pointer)');
    }
    return this.config.scriptedSweep;
  }

  setFlareMode(mode) {
    this.config.flareMode = mode;
    if (!this.layerMeshes.flare) return;

    // Reposition flare card to test Spire-locked vs Sky-locked hypothesis
    const targetZ = mode === 'spire' ? this.config.depths.citadel : this.config.depths.sky;
    const dist = this.canonicalCamPos.z - targetZ;
    const size = dist;

    this.layerMeshes.flare.position.z = targetZ;
    this.layerMeshes.flare.scale.set(size / 2.0, size / 2.0, 1.0);

    this.showToast(mode === 'spire' ? 'Flare Mode: SPIRE-LOCKED (Beacon)' : 'Flare Mode: SKY-LOCKED (Distant Sun)');
    return this.config.flareMode;
  }

  toggleFlareMode() {
    const next = this.config.flareMode === 'spire' ? 'sky' : 'spire';
    return this.setFlareMode(next);
  }

  toggleLayer(layerKey) {
    if (this.layerMeshes[layerKey]) {
      this.config.visible[layerKey] = !this.config.visible[layerKey];
      this.layerMeshes[layerKey].visible = this.config.visible[layerKey];
      const stateStr = this.config.visible[layerKey] ? 'VISIBLE' : 'HIDDEN';
      this.showToast(`Layer ${layerKey.toUpperCase()}: ${stateStr}`);
      return this.config.visible[layerKey];
    }
    return false;
  }

  onPointerMove(normX, normY) {
    if (!this.config.parallaxEnabled || this.config.scriptedSweep) return;
    this.state.mouse.targetX = Math.max(-1.5, Math.min(1.5, normX));
    this.state.mouse.targetY = Math.max(-1.5, Math.min(1.5, normY));
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(now) {
    if (!this.state.isLoaded) return;

    // 1. Camera Motion Calculation (Only active in PARALLAX mode)
    const isParallaxActive = this.config.comparisonMode === 'parallax' && this.config.parallaxEnabled;
    if (isParallaxActive) {
      let shiftX = 0;
      let shiftY = 0;

      if (this.config.scriptedSweep) {
        // Smooth sine oscillation for repeatable evaluation (period ~ 6.0s)
        const elapsedSec = now / 1000.0;
        const wave = Math.sin(elapsedSec * this.config.sweepSpeed * 1.5);
        shiftX = wave * this.config.parallaxShift;
        shiftY = Math.sin(elapsedSec * 0.75) * (this.config.parallaxShift * 0.25);
      } else {
        // Manual pointer parallax with smooth exponential damping
        this.state.mouse.x = THREE.MathUtils.lerp(this.state.mouse.x, this.state.mouse.targetX, 0.05);
        this.state.mouse.y = THREE.MathUtils.lerp(this.state.mouse.y, this.state.mouse.targetY, 0.05);

        shiftX = -this.state.mouse.x * this.config.parallaxShift;
        shiftY = this.state.mouse.y * this.config.parallaxShift;
      }

      // Target camera position
      const targetCamX = shiftX;
      const targetCamY = shiftY;
      const targetCamZ = this.canonicalCamPos.z - this.config.cameraPush;

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.08);

      // Subtle look-at / angular pitch & yaw
      const targetRotX = -shiftY * (this.config.parallaxTilt / this.config.parallaxShift);
      const targetRotY = -shiftX * (this.config.parallaxTilt / this.config.parallaxShift);

      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, targetRotX, 0.08);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, targetRotY, 0.08);
    } else {
      // Smooth return to canonical camera pose (0, 0, 2.0)
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.canonicalCamPos.x, 0.1);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.canonicalCamPos.y, 0.1);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.canonicalCamPos.z, 0.1);
      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.1);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.1);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
