import * as THREE from 'three';

// ============================================================================
// Prototype 04 — Solar Citadel Volumetric Reconstruction
// Technical Experiment: Converting the dominant right-hand formation (Solar Citadel)
// from a flat proxy card into convincing volumetric 3D geometry while preserving
// the painted front appearance from the canonical opening camera.
// ============================================================================

export class Prototype04 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    // Canonical Camera Baseline (shared across prototypes)
    this.canonicalCamPos = new THREE.Vector3(0, 0, 2.0);
    this.canonicalFov = 53.130102; // At Z=2, plane of height 2 fills viewport

    this.config = {
      comparisonMode: 'volume',   // 'poster' | 'proxy' | 'volume' | 'overlay' | 'silhouette' | 'wireframe' | 'generated'
      volumeBlend: 1.0,           // 0.0 = Flat Proxy, 1.0 = Volumetric Citadel
      parallaxEnabled: true,
      scriptedSweep: false,
      sweepSpeed: 0.75,           // Hz
      parallaxShiftX: 0.120,      // Safe horizontal camera travel (can see western flank)
      parallaxShiftY: 0.045,      // Safe vertical camera travel
      cameraPush: 0.140,          // Forward camera push (demonstrates thickness)
      parallaxYaw: 0.055,         // Max yaw rotation (~3.15 deg)
      flareMode: 'spire',         // 'spire' | 'sky'
      lightingStrength: 0.35,     // Subtle directional/rim light on newly revealed side facets
      depths: {
        sky: 0.00,                // Layer A: Deep Sky / Planet
        ribbons: 0.40,            // Layer B: Magenta Ribbons
        needles: 0.65,            // Layer E: Distant Needles
        citadelCard: 0.95,        // Layer D: Flat Proxy Card baseline
        sentinel: 1.25,           // Layer C: Western Sentinel
        water: 1.15,              // Layer F: Foreground Water
        flare: 0.95,              // Layer G: Solstice Flare
      },
      visible: {
        sky: true,
        ribbons: true,
        sentinel: true,
        needles: true,
        water: true,
        flare: true,
      }
    };

    this.state = {
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      isLoaded: false,
      sweepTime: 0,
      activeMode: 'volume',
      fps: 60,
      frameTimeMs: 16.6,
      telemetry: {
        triangles: 668,
        vertices: 336,
        drawCalls: 8,
        camX: 0,
        camY: 0,
        camZ: 2.0,
        camYawDeg: 0,
        canonDriftPx: 0.0,
      }
    };

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 100.0);
    this.camera.position.copy(this.canonicalCamPos);

    // Canonical matrices for projective texturing
    this.canonicalViewMatrix = new THREE.Matrix4();
    this.canonicalProjMatrix = new THREE.Matrix4();
    this.updateCanonicalMatrices();

    // Scene Groups
    this.backgroundGroup = new THREE.Group();
    this.scene.add(this.backgroundGroup);

    this.layerMeshes = {};
    this.flatCitadelMesh = null;
    this.volumeCitadelMesh = null;
    this.wireframeMesh = null;
    this.silhouetteMesh = null;
    this.maskMesh = null;
    this.originalPosterMesh = null;
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

    // Load base proxy textures and Prototype 04 generated assets
    const [
      texSky,
      texRibbons,
      texSentinel,
      texNeedles,
      texWater,
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
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-g-flare.png'),
      textureLoader.loadAsync('/reference/poster.jpeg'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-d-citadel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/layer-d-citadel-p4.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/citadel-side-texture.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-04/generated/citadel-silhouette-mask.png'),
      fetch('/reference/experimental/prototype-04/generated/citadel-mesh-data.json').then(r => r.json()),
    ]);

    // Ensure sRGB color space on all image textures
    const colorTextures = [
      texSky, texRibbons, texSentinel, texNeedles, texWater,
      texFlare, texPoster, texCitadelCard, texCitadelP4Front, texCitadelSide
    ];
    for (const t of colorTextures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
    }

    texSilhouetteMask.minFilter = THREE.LinearFilter;
    texSilhouetteMask.magFilter = THREE.LinearFilter;

    this.textures = {
      sky: texSky,
      ribbons: texRibbons,
      sentinel: texSentinel,
      needles: texNeedles,
      water: texWater,
      flare: texFlare,
      poster: texPoster,
      citadelCard: texCitadelCard,
      citadelP4Front: texCitadelP4Front,
      citadelSide: texCitadelSide,
      silhouetteMask: texSilhouetteMask,
    };

    this.meshData = meshDataResponse;
    this.state.telemetry.triangles = meshDataResponse.numTriangles;
    this.state.telemetry.vertices = meshDataResponse.numVertices;
    this.state.telemetry.canonDriftPx = meshDataResponse.maxCanonDriftPx;

    this.buildSurroundingProxies();
    this.buildFlatCitadelProxy();
    this.buildVolumetricCitadel();
    this.buildComparisonMeshes();
    this.setComparisonMode(this.config.comparisonMode);

    this.state.isLoaded = true;
    console.log('Prototype 04 Solar Citadel Volumetric Reconstruction initialized.');
  }

  // Helper to create frustum-calibrated proxy card
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
    // 1. Layer A — Deep Sky / Planet (Z = 0.00)
    const meshSky = this.createCalibratedCard(this.textures.sky, this.config.depths.sky, 1);
    this.backgroundGroup.add(meshSky);
    this.layerMeshes.sky = meshSky;

    // 2. Layer B — Magenta Ribbons (Z = 0.40)
    const meshRibbons = this.createCalibratedCard(this.textures.ribbons, this.config.depths.ribbons, 2);
    this.backgroundGroup.add(meshRibbons);
    this.layerMeshes.ribbons = meshRibbons;

    // 3. Layer E — Distant Needles (Z = 0.65)
    const meshNeedles = this.createCalibratedCard(this.textures.needles, this.config.depths.needles, 3);
    this.backgroundGroup.add(meshNeedles);
    this.layerMeshes.needles = meshNeedles;

    // 4. Layer C — Western Sentinel (Z = 1.25)
    const meshSentinel = this.createCalibratedCard(this.textures.sentinel, this.config.depths.sentinel, 5);
    this.backgroundGroup.add(meshSentinel);
    this.layerMeshes.sentinel = meshSentinel;

    // 5. Layer F — Foreground Water (Z = 1.15)
    const meshWater = this.createCalibratedCard(this.textures.water, this.config.depths.water, 6);
    this.backgroundGroup.add(meshWater);
    this.layerMeshes.water = meshWater;

    // 6. Layer G — Solstice Flare (Z = 0.95 default spire-locked)
    const flareZ = this.config.flareMode === 'spire' ? this.config.depths.citadelCard : this.config.depths.sky;
    const meshFlare = this.createCalibratedCard(this.textures.flare, flareZ, 7, true);
    meshFlare.material.depthTest = false; // Additive lens flare blooms across 3D spire geometry
    this.backgroundGroup.add(meshFlare);
    this.layerMeshes.flare = meshFlare;
  }

  buildFlatCitadelProxy() {
    // The existing Prototype 02 Solar Citadel flat proxy card at Z = 0.95
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
    this.scene.add(this.flatCitadelMesh);
  }

  buildVolumetricCitadel() {
    // 1. Construct BufferGeometry from JSON data
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.meshData.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.meshData.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.meshData.uvs, 2));
    geo.setAttribute('canonUv', new THREE.Float32BufferAttribute(this.meshData.canonUvs, 2));
    geo.setAttribute('surfaceType', new THREE.Float32BufferAttribute(this.meshData.surfaceTypes, 1));
    geo.setIndex(this.meshData.indices);

    // 2. Custom Painterly Volumetric Shader Material
    this.volumeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFrontTexture: { value: this.textures.citadelP4Front },
        uSideTexture: { value: this.textures.citadelSide },
        uCanonViewMatrix: { value: this.canonicalViewMatrix },
        uCanonProjMatrix: { value: this.canonicalProjMatrix },
        uDebugMode: { value: 0 },          // 0: Normal, 1: Generated Surfaces, 2: Silhouette, 3: Wireframe
        uVolumeOpacity: { value: 1.0 },     // Crossfade weight vs Flat Proxy
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

          // Canonical projection coordinate:
          // Projects 3D position into canonical camera frustum
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
          // --- 1. SAMPLES ---
          vec4 frontTex = texture2D(uFrontTexture, vCanonUv);
          vec4 sideTex = texture2D(uSideTexture, vSideUv);

          // Discard any fragment outside canonical citadel boundary:
          // Guarantees zero protrusion into open celestial sky at both canonical camera
          // and during lateral/orbital parallax.
          if (frontTex.a < 0.05) {
            discard;
          }

          // --- 2. FRONT vs SIDE WEIGHTING ---
          // Direction to canonical camera pose (0, 0, 2.0)
          vec3 canonCamDir = normalize(vec3(0.0, 0.0, 2.0) - vWorldPos);
          float dotCanon = max(0.0, dot(vWorldNormal, canonCamDir));
          float dotView = max(0.0, dot(vWorldNormal, vViewDir));

          // At canonical camera, vViewDir == canonCamDir, so dotView == dotCanon.
          // When camera moves away from canonical, newly exposed oblique side facets
          // have dotView > dotCanon (they turn toward current camera, away from canonical projector).
          float obliqueExposure = max(0.0, dotView - dotCanon);

          // Side blend weight: 0.0 at canonical camera, ramps up smoothly on side/rear
          // facets as camera moves to reveal hidden flanks.
          float sideWeight = smoothstep(0.15, 0.65, vSurfaceType) * smoothstep(0.01, 0.12, obliqueExposure * 3.0);
          float frontWeight = 1.0 - sideWeight;

          // --- 3. PAINTERLY CRYSTAL LIGHTING (Only on newly revealed side/rear facets) ---
          // Direction from Solstice Flare to surface
          vec3 flareDir = normalize(uFlarePos - vWorldPos);
          float flareNdotL = max(0.0, dot(vWorldNormal, flareDir));
          vec3 warmRim = vec3(1.0, 0.82, 0.50) * pow(flareNdotL, 3.5) * 0.55;

          // Cold celestial ambient
          vec3 coldAmbient = vec3(0.09, 0.20, 0.32);

          // Water surface bounce
          float waterBounce = max(0.0, -vWorldNormal.y) * 0.25;
          vec3 cyanBounce = vec3(0.12, 0.55, 0.65) * waterBounce;

          // Composite side surface color with painterly lighting
          vec3 litSide = sideTex.rgb * (coldAmbient + vec3(0.75)) + warmRim + cyanBounce;
          vec3 blendedSide = mix(sideTex.rgb, litSide, uLightingStrength);

          // Final Base Surface Color:
          // At canonical camera, frontWeight is strictly 1.0 -> 100% original poster pixels!
          vec3 baseColor = mix(blendedSide, frontTex.rgb, frontWeight);

          // --- 4. DEBUG MODES ---
          if (uDebugMode == 1) {
            // GENERATED SURFACE DEBUG:
            // Clearly identify which visible pixels come from generated side / hidden surfaces
            // Front original painting is kept muted, generated surfaces highlighted in electric magenta
            if (vSurfaceType > 0.25 || dotCanon < 0.12) {
              baseColor = mix(vec3(0.95, 0.15, 0.70), baseColor, 0.15); // Neon Magenta
            } else {
              baseColor = mix(baseColor, vec3(0.2, 0.5, 0.6), 0.4); // Desaturated front
            }
          } else if (uDebugMode == 2) {
            // SILHOUETTE DEBUG:
            // Render solid electric cyan silhouette
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

    // 3. Wireframe Overlay Mesh for Debugging
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x55ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
    });
    this.wireframeMesh = new THREE.Mesh(geo, wireframeMat);
    this.wireframeMesh.renderOrder = 5;
    this.wireframeMesh.visible = false;
    this.scene.add(this.wireframeMesh);
  }

  buildComparisonMeshes() {
    // 1. Original Untouched Flat Poster Mesh (POSTER mode)
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

    // 2. Ground-Truth Silhouette Mask Mesh (SILHOUETTE DEBUG mode overlay)
    const maskGeo = new THREE.PlaneGeometry(2.0, 2.0);
    const maskMat = new THREE.MeshBasicMaterial({
      map: this.textures.silhouetteMask,
      transparent: true,
      opacity: 0.65,
      depthTest: true,
    });
    this.maskMesh = new THREE.Mesh(maskGeo, maskMat);
    this.maskMesh.position.set(0, 0, 0.05);
    this.maskMesh.visible = false;
    this.scene.add(this.maskMesh);
  }

  // ============================================================================
  // Comparison & Development Mode Manager
  // ============================================================================
  setComparisonMode(mode) {
    this.config.comparisonMode = mode;
    this.state.activeMode = mode;

    // Reset default visibilities
    this.originalPosterMesh.visible = false;
    this.backgroundGroup.visible = true;
    this.maskMesh.visible = false;
    this.wireframeMesh.visible = false;
    this.volumeMaterial.uniforms.uDebugMode.value = 0;

    if (mode === 'poster') {
      // POSTER: Untouched 2D source artwork
      this.backgroundGroup.visible = false;
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = false;
      this.originalPosterMesh.visible = true;
      this.showToast('Mode: POSTER (Untouched 2D Reference)');
    }
    else if (mode === 'proxy') {
      // FLAT PROXY: Existing Prototype 02 Solar Citadel card
      this.flatCitadelMesh.visible = true;
      this.flatCitadelMesh.material.opacity = 1.0;
      this.volumeCitadelMesh.visible = false;
      this.config.volumeBlend = 0.0;
      this.showToast('Mode: FLAT PROXY (P02 Citadel Card at Z=0.95)');
    }
    else if (mode === 'volume') {
      // VOLUME: Volumetric Solar Citadel replacement
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 1.0;
      this.config.volumeBlend = 1.0;
      this.showToast('Mode: VOLUME (Sculptural 3D Citadel Active)');
    }
    else if (mode === 'overlay') {
      // 50/50: Overlaid for canonical alignment inspection
      this.flatCitadelMesh.visible = true;
      this.flatCitadelMesh.material.opacity = 0.50;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 0.50;
      this.config.volumeBlend = 0.50;
      this.showToast('Mode: 50/50 OVERLAY (Alignment Inspection)');
    }
    else if (mode === 'silhouette') {
      // SILHOUETTE DEBUG: Source mask vs rendered volume silhouette
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uDebugMode.value = 2; // Cyan silhouette
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 0.85;
      this.maskMesh.visible = true; // Magenta mask overlay
      this.showToast('Mode: SILHOUETTE DEBUG (Mask vs Volume Contour)');
    }
    else if (mode === 'wireframe') {
      // WIREFRAME / GEOMETRY DEBUG
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 0.80;
      this.wireframeMesh.visible = true;
      this.showToast('Mode: WIREFRAME / GEOMETRY DEBUG (Mesh Facets)');
    }
    else if (mode === 'generated') {
      // GENERATED SURFACE DEBUG:
      // Clearly identify which pixels come from generated side assets
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uDebugMode.value = 1;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 1.0;
      this.showToast('Mode: GENERATED SURFACE DEBUG (Magenta = Invented Flanks)');
    }
  }

  setVolumeBlend(blend) {
    this.config.volumeBlend = Math.max(0.0, Math.min(1.0, blend));
    if (this.config.comparisonMode === 'poster' || this.config.comparisonMode === 'silhouette') return;

    if (this.config.volumeBlend <= 0.001) {
      this.flatCitadelMesh.visible = true;
      this.flatCitadelMesh.material.opacity = 1.0;
      this.volumeCitadelMesh.visible = false;
    } else if (this.config.volumeBlend >= 0.999) {
      this.flatCitadelMesh.visible = false;
      this.volumeCitadelMesh.visible = true;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = 1.0;
    } else {
      this.flatCitadelMesh.visible = true;
      this.volumeCitadelMesh.visible = true;
      this.flatCitadelMesh.material.opacity = 1.0 - this.config.volumeBlend;
      this.volumeMaterial.uniforms.uVolumeOpacity.value = this.config.volumeBlend;
    }
  }

  toggleScriptedSweep() {
    this.config.scriptedSweep = !this.config.scriptedSweep;
    if (this.config.scriptedSweep) {
      this.config.parallaxEnabled = true;
      this.showToast('Scripted Sweep: ACTIVE (Exposing Western Flank)');
    } else {
      this.showToast('Scripted Sweep: PAUSED (Manual Pointer Control)');
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

    this.showToast(mode === 'spire' ? 'Flare: SPIRE-LOCKED (Citadel Peak)' : 'Flare: SKY-LOCKED (Distant Celestial)');
    return this.config.flareMode;
  }

  toggleFlareMode() {
    const next = this.config.flareMode === 'spire' ? 'sky' : 'spire';
    return this.setFlareMode(next);
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

  // ============================================================================
  // Animation & Camera Motion Loop
  // ============================================================================
  update(now) {
    if (!this.state.isLoaded) return;

    const isMoving = this.config.parallaxEnabled && this.config.comparisonMode !== 'poster';

    if (isMoving) {
      let shiftX = 0;
      let shiftY = 0;
      let pushZ = 0;
      let yaw = 0;

      if (this.config.scriptedSweep) {
        // Scripted lateral inspection sweep:
        // Sweeps toward the left (-X) to reveal the Citadel's western flank and crystal facets
        const elapsedSec = now / 1000.0;
        const sweepPhase = Math.sin(elapsedSec * this.config.sweepSpeed);

        // Bias sweep toward -X (left) to showcase the western flank
        shiftX = sweepPhase * this.config.parallaxShiftX - (this.config.parallaxShiftX * 0.35);
        shiftY = Math.cos(elapsedSec * 0.6) * (this.config.parallaxShiftY * 0.5);
        pushZ = (0.5 + 0.5 * Math.sin(elapsedSec * 0.45)) * this.config.cameraPush;

        // Yaw camera slightly to track the Citadel massif
        yaw = -shiftX * 0.45;
      } else {
        // Manual pointer parallax with smooth exponential damping
        this.state.mouse.x = THREE.MathUtils.lerp(this.state.mouse.x, this.state.mouse.targetX, 0.05);
        this.state.mouse.y = THREE.MathUtils.lerp(this.state.mouse.y, this.state.mouse.targetY, 0.05);

        shiftX = -this.state.mouse.x * this.config.parallaxShiftX;
        shiftY = this.state.mouse.y * this.config.parallaxShiftY;
        pushZ = Math.max(0, -this.state.mouse.y * 0.5) * this.config.cameraPush;
        yaw = -shiftX * 0.35;
      }

      const targetCamX = shiftX;
      const targetCamY = shiftY;
      const targetCamZ = this.canonicalCamPos.z - pushZ;

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.08);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.08);

      const targetRotX = -shiftY * 0.25;
      const targetRotY = yaw;

      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, targetRotX, 0.08);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, targetRotY, 0.08);
    } else {
      // Return to canonical camera pose (0, 0, 2.0)
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.canonicalCamPos.x, 0.1);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.canonicalCamPos.y, 0.1);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.canonicalCamPos.z, 0.1);
      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.1);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.1);
    }

    // Update telemetry state
    this.state.telemetry.camX = this.camera.position.x;
    this.state.telemetry.camY = this.camera.position.y;
    this.state.telemetry.camZ = this.camera.position.z;
    this.state.telemetry.camYawDeg = (this.camera.rotation.y * 180 / Math.PI);
    this.state.telemetry.drawCalls = this.renderer.info.render.calls;

    this.renderer.render(this.scene, this.camera);
  }
}
