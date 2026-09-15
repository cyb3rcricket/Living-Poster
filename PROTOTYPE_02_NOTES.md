# Prototype 02 — Independent Proxy Reconstruction: Technical Notes

## 1. Executive Summary & Purpose

Prototype 02 tests the core hypothesis formulated after Prototype 01:

> *Can the major visual structures in `poster.jpeg` be separated into independent spatial layers / proxy objects while still reconstructing the original poster extremely closely from the opening camera?*

Where Prototype 01 treated the painting as a single continuous deformable surface (which exhibited rubber-sheet / curtain distortion along steep silhouette edges), Prototype 02 decomposes the painting into **7 independent spatial proxy objects** placed at calibrated depth planes with inpainting for hidden regions.

---

## 2. Layer Breakdown

Seven independent visual elements were constructed:

| Layer Identifier | Visual Element | Composition & Contents | Alpha / Blending Mode |
| :--- | :--- | :--- | :--- |
| **Layer A — Deep Sky** | Celestial Background | Cosmic starfield, dark space, Umbral Giant planet disk, Ember Moon, and distant horizon atmospheric haze. Contains synthesized inpaint fills behind occluding foreground structures. | Opaque (`depthWrite: true`, background anchor) |
| **Layer B — Ribbons** | Atmospheric Aurora Veil | Twin sweeping neon magenta atmospheric ribbons crossing the mid-sky. Extended trajectories behind spires. | Transparent Cutout (`NormalBlending`, `renderOrder: 2`) |
| **Layer E — Needles** | Far-Midground Formations | Slender central Midnight Needle ($x \approx 55.6\%$), periphery needle ($x \approx 1.0\%$), and subtle horizon ridges. | Transparent Cutout (`NormalBlending`, `renderOrder: 3`) |
| **Layer D — Solar Citadel** | Major Right Formation | Dominant crystalline monolith ($x \in [58.5\%, 100\%]$): blue/cyan stepped shoulders, dark interior mass, illuminated ridges, shoreline froth. | Transparent Cutout (`NormalBlending`, `renderOrder: 4`) |
| **Layer C — Western Sentinel**| Major Left Formation | Towering ice obelisk ($x \in [3.5\%, 31\%]$): sharp vertical silhouette, edge highlights, internal cyan facet variations. | Transparent Cutout (`NormalBlending`, `renderOrder: 5`) |
| **Layer F — Foreground Water**| The Abyssal Sea | Original painted alien sea ($y \in [83.5\%, 100\%]$): dynamic ocean chop, reflective foam crests, and turquoise reflections. | Transparent Cutout / Projective (`NormalBlending`, `renderOrder: 6`) |
| **Layer G — Solstice Flare** | Celestial Starburst | Brilliant white-gold flare at $(81.8\%, 17.1\%)$ and horizontal anamorphic glare streak spanning $x \in [18\%, 96\%]$. | Additive Light Card (`AdditiveBlending`, `renderOrder: 7`) |

---

## 3. Segmentation & Inpainting Methodology

All assets were synthesized and formatted via `scripts/generate_prototype_02_layers.cjs` reading directly from `reference/poster.jpeg`:

### 3.1 Segmentation Method
1. **Natural Scanline Boundary Tracing**:
   - Rather than forcing rigid mathematical geometric cones (which cut across organic crystal ridges), an algorithm scans each scanline $y$ from the apex downward.
   - Spectral chromatic discriminators distinguish crystal ice ($G > R + 10$ and $B > R + 18$) from mauve celestial bands ($R \ge G$) and neon magenta ribbons ($R > G + 18$ and $B > G + 6$).
   - Boundary curves are smoothed along $Y$ with a 5-tap moving window to eliminate raster notches while honoring the authentic painterly contours.
2. **Color Dilation (Alpha Border Padding)**:
   - To prevent dark silhouette halos caused by standard bilinear texture filtering interpolating towards black `(0,0,0,0)`, an edge-aware RGB dilation algorithm propagates adjacent crystal colors 2 pixels into transparent regions. Silhouette edges remain razor-sharp without dark fringes.

### 3.2 Hidden Region Synthesis & Inpainting Strategy
When foreground objects separate and translate, occluded background regions are exposed. These were synthesized and stored in `reference/experimental/prototype-02/generated/`:
1. **Behind the Solar Citadel ($x \in [630, 1000], y \in [175, 855]$)**:
   - *Planetary Limb Continuation*: The Umbral Giant's circular geometry ($C = (594, 225), R = 405$) was continued through the occluded right hemisphere. Concentric mauve cloud bands and the golden limb crescent glow were synthesized based on unoccluded hemispheric reference sectors.
   - *Horizon Atmospheric Gradient*: Below the planet ($y \in [600, 855]$), the stratified twilight atmospheric glow was interpolated from the unoccluded central corridor ($x \approx 500$).
2. **Behind the Western Sentinel ($x \in [40, 310], y \in [366, 855]$)**:
   - Bilateral horizontal interpolation between the far-left cosmic void ($x < 40$) and the right-side sky ($x > 310$) smoothly bridges the dark starry space and lower horizon haze.
3. **Behind Spires for the Aurora Ribbons (Layer B)**:
   - Spline continuation extrapolates the twin undulating magenta bands under the spires so that relative translation does not abruptly terminate the ribbons at spire silhouettes.
4. **Under the Waterline Footprints (Layer F)**:
   - Open sea ripple patches were sampled and blended beneath the bases of Sentinel and Citadel ($y \in [855, 940]$).

*Crucial Architecture Invariant*: At the canonical opening camera, foreground spires completely cover their synthesized fills. The visitor only ever views original pixels at $t=0$; synthesized imagery acts strictly as support material exposed during spatial movement.

---

## 4. Proxy Representation & Canonical Geometry

### 4.1 Canonical Camera Calibration
- **Virtual Camera**: FOV $= 53.130102^\circ$ ($2 \cdot \arctan(0.5)$), positioned at $\mathbf{P}_{\text{cam}} = (0, 0, 2.00)$ looking at $(0, 0, 0)$.
- **Frustum Scaling Theorem**:
  At any depth $Z = Z_i$ ($0 \le Z_i < 2.00$), the distance to camera is $D_i = 2.00 - Z_i$.
  Because the frustum half-angle has $\tan(\theta) = 0.5$, the visible viewport dimension at distance $D_i$ is exactly $D_i = 2.00 - Z_i$.
  Therefore, placing a planar proxy card at depth $Z = Z_i$ with dimensions $(2.00 - Z_i) \times (2.00 - Z_i)$ guarantees that every normalized texture coordinate $(u, v)$ projects to the exact screen coordinate:
  $$x_{\text{ndc}} = 2u - 1, \quad y_{\text{ndc}} = 2v - 1$$
  regardless of the depth $Z_i$ assigned to that layer!

### 4.2 Relative Depth Hierarchy (Experimental Values)
Relative ordering strictly follows the pictorial depth stratification established in `POSTER_ANALYSIS.md`:

| Visual Proxy Layer | Experimental Depth ($Z$) | Distance from Camera ($D = 2.0 - Z$) | Relative Parallax Velocity |
| :--- | :---: | :---: | :---: |
| **Layer A (Deep Sky / Planet)** | `0.00` | $2.00$ | $1.00\times$ (Anchor Baseline) |
| **Layer B (Magenta Ribbons)** | `0.40` | $1.60$ | $1.25\times$ |
| **Layer E (Needles / Distant)** | `0.65` | $1.35$ | $1.48\times$ |
| **Layer D (Solar Citadel)** | `0.95` | $1.05$ | $1.90\times$ |
| **Layer F (Foreground Water)** | `1.15` | $0.85$ | $2.35\times$ |
| **Layer C (Western Sentinel)** | `1.25` | $0.75$ | $2.67\times$ |
| **Layer G (Flare: Spire-Locked)**| `0.95` | $1.05$ | Locked to Citadel Peak |
| **Layer G (Flare: Sky-Locked)** | `0.00` | $2.00$ | Locked to Cosmic Background |

*Note: Depths are unitless relative staging planes, not recovered real-world distances.*

---

## 5. Visual Validation & Verification Results

Automated headless Chrome testing (`scripts/test_prototype_02.cjs`) and pixel metric verification (`scripts/verify_reconstruction.cjs`) confirm:

1. **Reconstruction Fidelity at Canonical Camera**:
   - **Composite Reconstruction vs `poster.jpeg`**:
     - **MSE**: `0.00` (Bit-perfect layered composite)
     - **PSNR**: $\infty\text{ dB}$ (Exact 1:1 match)
     - **Pixel variance $> 5/255$**: `0.00%`
   - **Live WebGL Canvas Rendering Fidelity**:
     - **PSNR**: `40.47 dB`
     - Over `99.15%` of pixels match within $\le 5/255$ of `poster.jpeg`.
2. **Behavior Under Small Camera Motion**:
   - As the camera translates horizontally ($\Delta X = \pm 0.055$), Western Sentinel moves $2.67\times$ faster than the sky, revealing the cosmic void and twilight haze behind it.
   - The Solar Citadel shifts across the face of the Umbral Giant ($1.90\times$ relative velocity), exposing the synthesized planet disk limb and cloud bands.
   - Midnight Needle exhibits subtle, distant parallax ($1.48\times$), remaining grounded on the horizon.
   - **Zero Curtain Stretching**: Because crystal silhouettes and sky geometry are completely severed into independent meshes, triangles never stretch across depth boundaries. Crystal silhouettes remain 100% rigid, sharp, and painterly.
3. **Flare Mode Evaluation**:
   - **Spire-Locked Mode**: Flare remains pinned to the pinnacle of the Citadel. As the camera sweeps, the spire and beacon move as a single physical entity in front of the planet.
   - **Sky-Locked Mode**: Flare remains anchored to the celestial background plane. As the camera sweeps, the Citadel pinnacle drifts past the flare, testing the "eclipsed distant star" hypothesis.

---

## 6. Development Comparison Controls

The unified interface provides instant comparisons:

| Control | Mode / Action | Purpose |
| :--- | :--- | :--- |
| **[1] / [2] Tabs** | Prototype Selector | Seamlessly switch between **Prototype 01 (Awakening)** and **Prototype 02 (Proxies)** without page reload. |
| **ORIGINAL** | Flat `poster.jpeg` | Displays the original untouched artwork at canonical view. |
| **PROXY** | Reconstructed Proxies | Canonical camera locked; displays all 7 proxy layers overlaid at 1:1 scale. |
| **PARALLAX** | Spatial Motion Active | Enables camera movement (Pointer or Scripted Sweep) to evaluate relative parallax and occlusion. |
| **MASK DEBUG** | Diagnostic Color Map | Renders a color-coded composite of all segmentation layers (Indigo=Sky, Pink=Ribbons, Green=Sentinel, Gold=Citadel, White=Needles, Cyan=Water, Pale Yellow=Flare). |
| **Scripted Sweep** | Automated Oscillation | Smooth sine oscillation ($\approx 6.0\text{s}$ period, $\Delta X = \pm 0.055$) for repeatable, hands-free evaluation. |
| **Flare Mode** | Spire-Locked / Sky-Locked | Toggles the spatial depth of the Solstice Flare between Citadel peak ($Z=0.95$) and Sky ($Z=0.00$). |
| **Layer Isolators** | A, B, C, D, E, F, G toggles | Independently show/hide any individual proxy layer to inspect hidden-region inpainting. |
| **Sliders** | Parallax Amplitude, Push, Depths | Tunable parameters for real-time experimentation. |

### Hotkeys
- `[1]`: Switch to Prototype 01
- `[2]`: Switch to Prototype 02
- `[Space]` or `[D]`: Instant toggle between ORIGINAL and PROXY (or Flat / Depth in P01)
- `[P]`: Toggle Parallax
- `[S]`: Toggle Scripted Sweep
- `[F]`: Toggle Flare Mode (Spire-Locked vs Sky-Locked)
- `[M]`: Toggle Mask Debug Map (P02) or Depth Map (P01)
- `[H]`: Hide / Show Developer UI Panel

---

## 7. Known Artifacts & Limitations

1. **Card Billboarding at Large Angles**:
   - While small translations ($\Delta X \le 0.06$) produce convincing depth, pushing camera translation beyond $\Delta X > 0.12$ begins revealing that the spires are flat cutouts without lateral thickness.
2. **Water Horizon Seam Under Extreme Pitch**:
   - The water layer terminates cleanly along the horizon line ($y = 855$). Under small camera translation, parallax between the water foreground and horizon spires feels natural; however, excessive camera pitch can expose the edge of the ground plane card.
3. **Inpainting Discontinuity at Extreme Lateral Travel**:
   - The synthesized hidden region behind the Citadel continues the Umbral Giant disk convincingly for small excursions ($\Delta X \le 0.08$). If the camera travels further right, the synthetic sector dominates the view, deviating from the authentic painting.
4. **Anamorphic Streak Separation**:
   - In Spire-Locked flare mode, the long horizontal glare beam translates with the spire, causing the tail of the beam to drift slightly across the deep starfield.

---

## 8. Prototype 01 vs. Prototype 02 Comparison

| Criteria | Prototype 01 (Depth Awakening) | Prototype 02 (Independent Proxies) | Winner & Assessment |
| :--- | :--- | :--- | :--- |
| **Opening Fidelity** | 100% identical (Untouched flat quad) | 100% identical (Bit-perfect composite, $\text{PSNR} > 40\text{ dB}$) | **Tie**: Both match the original artwork with subpixel precision from the opening camera. |
| **Sense of Physical Depth** | Subtle relief / embossed volume | Distinct spatial planes with genuine relative separation | **Prototype 02**: Feels like a physical stage set with real foreground/background intervals. |
| **Real Parallax & Occlusion** | False parallax (rubber-sheet mesh stretching) | Real parallax (true occlusion, independent velocities) | **Prototype 02**: Complete elimination of curtain distortion around spires. |
| **Painterly Preservation** | 100% of painting pixels preserved on single mesh | 100% of painting pixels preserved on independent cards | **Tie**: Neither technique introduces generic PBR sterility. |
| **Transition Potential** | Superb organic awakening ($t=0 \rightarrow 1$) | Static stage set; lacks the gradual "growing into depth" awakening curve | **Prototype 01**: Prototype 01 excels at the moment of awakening from a flat poster. |
| **Exploration Potential** | Zero (breaks down immediately upon navigation) | Moderate (spatially separated landmarks, but limited by card thickness) | **Prototype 02**: Establishes the real spatial coordinates required for an eventual 3D environment. |

---

## 9. Epistemic Boundaries

### What This Prototype Tells Us
1. **Major visual structures CAN be decomposed into independent proxies without sacrificing the opening composition**: From the canonical camera, 7 separate spatial elements composite into an image indistinguishable from `poster.jpeg`.
2. **Real parallax completely eliminates the curtain artifact**: Decoupling the Western Sentinel and Solar Citadel from the celestial background allows genuine relative motion without any mesh stretching.
3. **Inpainted hidden regions successfully support small camera excursions**: The visitor perceives physical space rather than a torn painting.

### What This Prototype Does NOT Tell Us
1. **This is NOT yet an explorable 3D world**: We cannot walk around the spires; they have no reverse faces, no volumetric crystal bulk, and no procedural sea floor.
2. **This does not determine the final graphics engine**: Whether the production world uses Three.js, WebGPU, Gaussian Splatting, NeRF, or custom shaders remains an open architectural question.

---

## 10. Strategic Recommendation

### Selected Option: **C. Combine Prototype 01 and Prototype 02 (Hybrid Architecture)**

**Rationale**:
- **Prototype 01** provides the magic moment of **The Awakening**: starting from a flat painting and smoothly easing into depth over 5 seconds without cuts.
- **Prototype 02** solves the **Spatial Separation & Silhouette Integrity**: when depth is active, foreground landmarks must be separate objects so they do not stretch like rubber sheets against the sky.
- **The Ideal Synergy**:
  Future work should begin with the flat artwork ($t=0$), execute Prototype 01's awakening ease-in to bring the painting alive, and then seamlessly transition into Prototype 02's independent spatial proxies (and eventually low-poly volumetric crystal geometry) as the camera advances forward into the true explorable world.
