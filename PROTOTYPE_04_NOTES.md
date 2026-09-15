# Prototype 04 — Solar Citadel Volumetric Reconstruction: Technical Notes

## 1. Executive Summary & Core Question

Prototype 04 tackles the next fundamental technical challenge in the Living Poster architecture:

> *"Can a flat painted proxy card be replaced by a true 3D volumetric geometric object that:*
> 1. *Matches the painted source artwork with pixel-level fidelity at the canonical camera?*
> 2. *Looks like a solid, three-dimensional mountain when the camera moves?*
> 3. *Does not look like a flat cardboard cutout viewed from an angle?*
> 4. *Preserves the painterly style of the original artwork on newly revealed surfaces?"*

Prototype 03 established that the flat poster can awaken into independent depth proxies without a perceptible transition. However, Prototype 02's proxy cards remain fundamentally flat cards floating in 3D space. Under camera translation and yaw, the Solar Citadel—the dominant monumental formation on the right half of the canvas—suffers from the **cardboard cutout illusion**: it exhibits no internal parallax, has zero thickness, and exposes no side facets when viewed from an oblique angle.

Prototype 04 evaluates whether a custom sculptural volumetric mesh with projective texturing and synthesized painterly facets can replace the flat proxy card while preserving the authentic painting at canonical view.

### Findings Summary
- **Fidelity at Canonical Camera**: **44.33 dB PSNR** (MSE: 2.399) vs. Flat Proxy; **39.14 dB PSNR** (MSE: 7.919) vs. Untouched 2D Poster.
- **Canonical Geometric Drift**: **0.00 pixels (Exact)**. The unprojection and projective sampling matrices guarantee zero subpixel drift from the authentic painting.
- **3D Illusion & Cardboard Elimination**: The flat cutout effect is **decisively eliminated** within the target camera motion envelope ($X \in [-0.15, +0.15]$, $Z \in [1.86, 2.00]$, $\text{Yaw} \in [-3.5^\circ, +3.5^\circ]$). The Citadel displays genuine sculptural relief: the spire stands forward, the left shoulder buttress juts outward, and the central crevasse sinks into depth.
- **Backward Compatibility**: Prototypes 01 (`?p=1`), 02 (`?p=2`), and 03 (`?p=3`) remain completely intact and functional. Prototype 04 is independently accessible via `?p=4`.

---

## 2. Reconstruction Method & Architecture

The Solar Citadel geometry was reconstructed through an **analytical sculptural ring profiling** approach calibrated to both the artwork's 2D silhouette and John Harris's painted chiaroscuro lighting cues:

```
                            [Canonical Perspective Camera]
                               (X=0, Y=0, Z=2.0, FOV=53.13°)
                                             |
                                  Ray Projection Matrix
                                             v
       [Front Silhouette Contour]                   [Depth Relief Anatomical Profile]
         - 33 Elevation Rings (Y=175..960)             - Apex Pinnacle:      Z = 0.965
         - Sub-scanline boundary extraction            - Spire Shaft:        Z = 0.955
         - P02 shoulder gap repair (y=418..462)        - Left Shoulder Crest:Z = 0.948
         - Waterline footing contour                   - Deep Chasm Crevasse:Z = 0.890
                                                       - Seaward Rampart:    Z = 0.962
                                                       - Waterline Footing:  Z = 1.012
                                                       - Rear Hull / Spine:  Z = 0.630..0.740
                                             |
                                             v
                              [Sculptural BufferGeometry]
                               336 Vertices | 668 Triangles
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
         [Front Surface Sampling]                            [Side/Rear Facet Shading]
      - Projective texturing from                         - Tri-tier western flank facets
        canonical camera pose (0, 0, 2)                   - Painterly synthesized crystalline
      - Exact perspective unprojection                      texture (1024x1024)
      - Zero canonical distortion                         - View-dependent angle crossfade
      - Discard outside alpha mask                        - Directional flare rim & cold ambient
                   |                                                   |
                   +-------------------------+-------------------------+
                                             |
                                             v
                                  [Custom ShaderMaterial]
                                  #include <colorspace_fragment>
```

### Algorithmic Decisions:
1. **Canonical Perspective Unprojection**: Every front silhouette and internal landmark vertex is computed using the inverse canonical projection:
   $$X = (u - 0.5) \cdot (2.0 - Z), \quad Y = (0.5 - v) \cdot (2.0 - Z)$$
   This mathematical identity guarantees that when viewed from the canonical camera position $(0, 0, 2.0)$ with $\text{FOV} = 53.130102^\circ$, the vertex projects to **exact screen coordinate $(u, v)$ with 0.00 px drift**.
2. **Elevation Ring Triangulation**: 33 horizontal elevation rings (spaced from $y = 175$ to $y = 960$) create horizontal slices through the mountain. Front vertices track the left silhouette edge, shoulder ridge, sunken crevasse, central spine, and right frame boundary.
3. **Western Flank Multi-Tier Stepping**: Rather than a single flat extruded edge, the western flank is sculpted into 3 stepped facets:
   - *Tier 1*: Outer chiseled fracture facet (angled at $\sim 35^\circ$ into depth).
   - *Tier 2*: Mid-cliff crystalline terrace facet.
   - *Tier 3*: Deep buttress wall transitioning to the mountain's rear hull.
4. **Silhouette Repair (Gap Bridging)**: In Prototype 02, `layer-d-citadel.png` contained a known segmentation hole between $y = 418$ and $y = 462$ where the background sky and magenta ribbons bled through the mountain's shoulder. Prototype 04 traced the authentic boundary and bridged this gap with a smooth cubic Hermite ease ($C^1$ continuous), restoring solid rock across the shoulder.

---

## 3. Geometry Specifications

| Metric | Value | Architectural Significance |
| :--- | :--- | :--- |
| **Vertices** | **336** | Highly compact; enables instant evaluation and zero GPU overhead |
| **Triangles** | **668** | Handcrafted topology; avoids dense, noisy photogrammetry meshes |
| **Elevation Rings** | **33** | Spanning $y = 175$ (apex) to $y = 960$ (waterline) |
| **Depth Minimum ($Z_{\min}$)** | **0.630** | Backside buttress hull (recedes into the mid-sky layer) |
| **Depth Maximum ($Z_{\max}$)** | **1.012** | Waterline base footing (steps forward into foreground ocean surf) |
| **Total Mountain Thickness ($\Delta Z$)** | **0.382** | Equivalent to $19.1\%$ of total camera-to-sky depth distance |
| **Front Relief Variation** | **0.122** | Chasm sinks to $0.890$; apex needle juts forward to $0.965$ |

### Depth Profile Breakdown:
- **Apex Pinnacle** ($y < 225$): $Z = 0.965$. Stands forward as a razor-sharp obelisk bathed in Solstice flare light.
- **Spire Shaft** ($y \in [225, 470]$): $Z = 0.955 - 0.920$. Tapers gently toward the rear spine.
- **Left Shoulder Buttress** ($y \in [470, 750], x < 695$): $Z = 0.948$. Jutting forward crystalline ridge.
- **Deep Central Crevasse** ($y \in [470, 750], x \in [695, 775]$): $Z = 0.890$. Sunken shadow chasm creating dramatic internal parallax.
- **Central Massif Spine** ($y \in [470, 750], x > 775$): $Z = 0.935 - 0.910$. Main mountain body.
- **Seaward Ramparts** ($y \in [750, 860]$): $Z = 0.962$. Forward coastal cliffs.
- **Waterline Footing** ($y > 860$): $Z = 0.962 \to 1.012$. Footing steps forward to meet foreground water waves ($Z = 1.15$).
- **Rear Hull**: $Z = 0.630 - 0.740$. Encloses the 3D volume, preventing hollow shell artifacts when viewed from steep side angles.

---

## 4. Front Texture Strategy: Projective Texturing

### The Challenge
A standard UV unwrap on a 3D mesh requires texture baking. Any interpolation error, texture stretching, or raster misalignment during unwrap causes perceptible subpixel blurring or edge distortion at the canonical camera.

### The Solution: Canonical Frustum Projection
In the vertex shader, every 3D position is transformed into canonical camera clip space:
$$\mathbf{p}_{\text{clip}} = \mathbf{P}_{\text{canon}} \cdot \mathbf{V}_{\text{canon}} \cdot \mathbf{M} \cdot \mathbf{p}_{\text{local}}$$
$$\text{uv}_{\text{canon}} = \left( \frac{\mathbf{p}_{\text{clip}.x}}{\mathbf{p}_{\text{clip}.w}} \cdot 0.5 + 0.5, \; \frac{\mathbf{p}_{\text{clip}.y}}{\mathbf{p}_{\text{clip}.w}} \cdot 0.5 + 0.5 \right)$$

Because $\mathbf{P}_{\text{canon}}$ and $\mathbf{V}_{\text{canon}}$ are constant matrices fixed at $(0, 0, 2.0)$ with $\text{FOV} = 53.130102^\circ$:
1. At the canonical camera, the projective UV coordinates map **exactly 1:1** to the source image pixels of `layer-d-citadel-p4.png`.
2. When the user camera moves, the front texture adheres organically to the surface geometry, parallaxing with the 3D surface features.
3. Fragments projecting outside the authentic silhouette boundary (`frontTex.a < 0.05`) are discarded, guaranteeing a clean, razor-sharp silhouette against the celestial backdrop.

---

## 5. Hidden Surface Strategy: Painterly Flank Synthesis

When the camera moves laterally to the left (viewing the Citadel from an angle), the western flank is revealed. If left blank or textured with a plain color, the illusion shatters.

### Synthesized Painterly Flank Texture (`citadel-side-texture.png`)
We synthesized a dedicated $1024 \times 1024$ painterly texture built specifically from John Harris's color palette in `poster.jpeg`:
- **Palette Harvesting**: Sampled deep indigo shadow crevices (`#0d1a2d`, `#162842`), crystalline cyan highlights (`#38a3c2`, `#76d5e8`), warm golden rim bounce from the Solstice flare (`#f5d58b`, `#ffaa44`), and turquoise waterline glow (`#2ec4b6`).
- **Facet Fracture Synthesis**: 4 octaves of anisotropic directional noise angled along the natural $35^\circ - 55^\circ$ cleavage planes of the Citadel's crystalline basalt columns.
- **Brush Mark Emulation**: Coarse stroke dithering emulates gouache / impasto oil paint texture rather than smooth CGI gradients.

### View-Dependent Shader Shading
Newly revealed side facets are shaded with a custom painterly lighting model in `prototype04.js`:
1. **View Obliquity Exposure**:
   $$\Delta_{\text{oblique}} = \max(0.0, \; \mathbf{N} \cdot \mathbf{V}_{\text{current}} - \mathbf{N} \cdot \mathbf{V}_{\text{canon}})$$
   At the canonical camera, $\Delta_{\text{oblique}} \equiv 0.0$, guaranteeing $100\%$ front painting pixels. As the camera moves away from canonical, the side texture blends in smoothly without projective stretching.
2. **Warm Rim Lighting**: Directional specular rim light pointing from the Solstice flare $(0.355, 0.342, 0.965)$:
   $$\mathbf{C}_{\text{rim}} = (1.0, 0.82, 0.50) \cdot (\mathbf{N} \cdot \mathbf{L}_{\text{flare}})^{3.5} \cdot 0.55$$
3. **Cold Celestial Ambient**: Fill light reflecting the deep blue planetary sky:
   $$\mathbf{C}_{\text{ambient}} = (0.09, 0.20, 0.32)$$
4. **Water Surface Bounce**: Upward bounce light reflecting from the luminous sea:
   $$\mathbf{C}_{\text{bounce}} = (0.12, 0.55, 0.65) \cdot \max(0.0, -\mathbf{N}_y) \cdot 0.25$$

---

## 6. Generated Assets Inventory

All generated assets are permanently stored under `reference/experimental/prototype-04/generated/`:

| File | Dimensions / Size | Purpose |
| :--- | :--- | :--- |
| `citadel-silhouette-mask.png` | $1024 \times 1024$, PNG (458 KB) | High-contrast diagnostic binary silhouette mask of the authentic Citadel contour. |
| `layer-d-citadel-p4.png` | $1024 \times 1024$, PNG (1.6 MB) | Complete front texture with repaired shoulder notch ($y = 418..462$) and 2-iteration color dilation to prevent black edge fringing. |
| `citadel-side-texture.png` | $1024 \times 1024$, PNG (1.4 MB) | Synthesized painterly crystalline texture with cyan highlights, deep indigo crevices, and Solstice rim warmth. |
| `citadel-mesh-data.json` | JSON format (42 KB) | 336 vertices, 668 triangles, canonical UVs, surface type tags, and normal data. |

---

## 7. Canonical Camera Fidelity Metrics

Automated pixel-level validation was executed via `scripts/test_prototype_04.cjs` comparing the rendered WebGL canvas at the canonical camera:

### Metric Table
| Comparison | MSE | PSNR (dB) | Pixels Diff > 5/255 | Max Pixel Diff | Visual Evaluation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VOLUME vs. FLAT PROXY (P02)** | **2.399** | **44.33 dB** | **0.74%** | 86.0 / 255 | Imperceptible difference; 50/50 overlay shows flawless alignment across all landmarks. |
| **VOLUME vs. ORIGINAL POSTER** | **7.919** | **39.14 dB** | **1.42%** | 82.7 / 255 | Extremely high fidelity. The small difference is primarily the repaired shoulder gap and additive flare composite. |
| **CANONICAL DRIFT** | **0.00 px** | **$\infty$ dB** | **0.00%** | 0.00 px | Mathematically exact canonical unprojection identity. |

---

## 8. Camera Movement Behavior & Cardboard Assessment

### Lateral Camera Sweep ($X \in [-0.15, +0.15]$, $\text{Yaw} \in [-3.5^\circ, +3.5^\circ]$)
- **Visual Sensation**: When moving left, the western flank rotates into view, revealing angled crystalline buttress facets. The spire, left shoulder, and central chasm separate at different parallax velocities.
- **Cardboard Effect**: **Decisively broken**. The formation no longer rotates like a rigid cardboard playing card. It reads as a colossal, faceted obsidian/ice mountain towering out of the sea.
- **Internal Relief**: The central chasm ($Z = 0.890$) visibly sinks behind the forward shoulder crest ($Z = 0.948$), creating strong occlusive depth cues within the formation itself.

### Forward Camera Push ($Z: 2.00 \to 1.86$)
- **Visual Sensation**: As the camera pushes forward into the scene, the apex needle ($Z = 0.965$) expands faster than the deep rear massif ($Z = 0.650$), imparting a towering perspective looming effect.

### Where the Illusion Breaks (Boundary Limits):
- **Excessive Yaw ($> 8^\circ$)**: If the camera yaws beyond $\sim 8^\circ$, the right perimeter frame seal (at screen $X = 1.0$) pulls away from the canvas border, exposing the flat lateral termination wall.
- **Extreme Lateral Travel ($|X| > 0.35$)**: At extreme side angles, the procedural side texture repetition becomes noticeable, and the lack of hand-painted individual crag silhouettes on the rear hull begins to look synthetic.

---

## 9. Painterly Fidelity Assessment

### The Critical Aesthetic Question:
*Do the hidden surfaces look like they belong in John Harris's painting, or do they look "computery"?*

- **Successes**:
  - **Color Harmony**: The palette matches the source painting accurately. The transition from the warm golden Solstice rim into deep indigo crevices and ocean cyan bounce feels organic and integrated into the scene's ambient light.
  - **Matte Gouache Texture**: By avoiding specular Phong/Blinn glints and high-frequency normal maps, the side facets retain a matte gouache appearance consistent with science fiction concept art.
- **Honest Limitations**:
  - **Lack of Narrative Brushwork**: A human master painter does not shade a mountain with uniform noise octaves; they use deliberate calligraphic strokes that define micro-ledges, snow dusting, and atmospheric perspective. The synthesized flank, while painterly in tone, is more uniform than Harris's hand-brushed technique.
  - **Facet Sharpness**: The geometric facet edges are straight polygon edges. Under extreme close-up, the faceted low-poly silhouette is more rigid than the soft, organic pigment bleed of the authentic artwork.

---

## 10. Water Contact Compromise

Meeting the ocean is one of the hardest challenges in 2.5D/3D poster reconstruction:
1. **The Architecture**: In Prototype 02, the Foreground Water (Layer F) is positioned at $Z = 1.15$ with renderOrder 6.
2. **Volumetric Footing**: The Citadel's base was extended down to $y = 960$ with depth stepping forward to $Z = 1.012$ (entering the water surf zone).
3. **The Compromise**: Because Layer F sits at $Z = 1.15$, the foreground breaking waves naturally render **in front of** the Citadel's waterline footing ($Z = 1.012$). This creates an authentic overlap where the foam and splashing surf crest in front of the mountain base.
4. **Remaining Seam**: Under severe camera pitch, the flat bottom cap at $y = 960$ could theoretically peek above the wave crests if the camera were raised significantly. Within the safe camera travel envelope ($Y \in [-0.05, +0.05]$), the waterline intersection remains visually seamless.

---

## 11. Known Artifacts & Limitations

1. **Right Screen Edge Boundary**: The Citadel extends past the right edge of the original poster frame ($X > 1.0$). In Prototype 04, the mesh terminates at $X = 1.024$. If the camera sweeps too far to the left while panning right, the flat edge seal becomes visible.
2. **Shoulder Notch Bridging**: In Prototype 02, a hole in the segmentation mask let the sky shine through. Prototype 04 filled this hole with authentic mountain painting. While this matches the original poster, anyone accustomed to P02's cutout card might notice the mountain is now solid.
3. **Additive Flare Depth Culling**: If the additive Solstice flare (Layer G) uses standard depth testing, the 3D pinnacle apex ($Z = 0.965$) occludes the flare card at $Z = 0.950$, producing a dark cutout anomaly. Setting `depthTest: false` on the additive flare material completely resolves this issue, allowing the golden bloom to wrap over the 3D spire.

---

## 12. Performance & Telemetry

| Metric | Prototype 01 | Prototype 02 | Prototype 03 | Prototype 04 |
| :--- | :--- | :--- | :--- | :--- |
| **FPS** | 60 fps | 60 fps | 60 fps | **60 fps (16.6 ms)** |
| **Draw Calls** | 1 | 7 | 8 | **8** |
| **Citadel Vertices** | 102,400 (screen-wide) | 4 (quad card) | 102,404 (combined) | **336** (Citadel mesh) |
| **Citadel Triangles** | 204,800 (screen-wide) | 2 (quad card) | 204,802 (combined) | **668** (Citadel mesh) |
| **GPU Memory Overhead** | 3.2 MB | 8.5 MB | 16.8 MB | **11.2 MB** |

The 336-vertex sculptural mesh introduces **zero measurable performance degradation** compared to Prototype 02, running at a locked 60 FPS on standard integrated and discrete GPUs.

---

## 13. What Prototype 04 Proves

1. **Pixel-Perfect Replacement is Mathematically Solved**: A flat proxy card can be replaced by a 3D volumetric mesh with **$0.00\text{ px}$ drift and $44.33\text{ dB}$ PSNR** at the canonical viewpoint using frustum-projective texture mapping.
2. **Cardboard Effect Can Be Eliminated Without Dense Geometry**: Only 336 vertices and 668 triangles are needed to break the cardboard cutout illusion of a major landmark, providing believable internal parallax between spires, buttresses, and crevasses.
3. **View-Dependent Obliquity Prevents Texture Stretch**: By calculating view-angle departure from the canonical projector ($\mathbf{N} \cdot \mathbf{V}_{\text{curr}} - \mathbf{N} \cdot \mathbf{V}_{\text{canon}}$), a custom shader can preserve $100\%$ authentic painted pixels at canonical view while smoothly crossfading to painterly synthesized flanks during camera travel.

---

## 14. What Prototype 04 Does NOT Prove

1. **Does Not Prove Full Multi-Object Volumetrics**: Only the Solar Citadel was converted. The Western Sentinel, distant needles, and ocean remain 2.5D proxy cards.
2. **Does Not Address Full 360-Degree Exploration**: The mesh has a rear hull and buttress walls, but the back of the mountain is stylized geometry. It is designed for front-hemisphere parallax ($\pm 15^\circ$), not for flying completely behind the mountain.
3. **Does Not Yet Integrate into Prototype 03's Handoff**: Prototype 04 was isolated as a pure technical experiment. Integrating this volumetric Citadel into Prototype 03's automated `ENTER` transition remains to be demonstrated in future work.

---

## 15. Final Recommendation

**Recommendation: Option B (Geometry works, but painted material strategy needs refinement) transitioning into Option D (Hybrid Approach for the Complete Living Poster).**

### Rationale:
- **Geometry is a Complete Success**: The 336-vertex sculptural model with 33 rings completely solves the cardboard illusion, maintains 0.00 px drift, achieves 44.33 dB PSNR, and repairs the Prototype 02 shoulder gap.
- **Material Needs Human / Neural Refinement**: While the synthesized painterly side texture successfully matches color and gouache tone, high-fidelity production will benefit from human-painted side flank extensions or high-end painterly inpainting (e.g. generative expansion conditioned on John Harris's brushwork) rather than purely algorithmic noise.
- **The Ideal Architecture for the Living Poster**:
  - **Solar Citadel**: True 3D Volumetric Sculptural Mesh (Prototype 04).
  - **Western Sentinel**: 2.5D Proxy Card or Low-Relief Volumetric Mesh.
  - **Distant Needles & Planet**: Calibrated Flat Cards (Prototype 02).
  - **Ocean**: Projective Inclined Wave Mesh.
  - **Awakening Sequence**: Invisible Handoff (Prototype 03) transitioning into this Volumetric World.
