# Prototype 05 Notes — Painted Ocean Spatial Reconstruction

**Question:** Can the painted foreground ocean become a genuinely spatial surface extending toward the horizon while still looking like the ocean in `reference/poster.jpeg`?

**Mode:** Implementation + verification. Isolated `?p=5`. Prototypes 01–04 were not modified.

**Epistemic labels:** **Fact** = measured or observed in this pass. **Inference** = reasoned from those facts. **Hypothesis** = still untested.

---

## Repository State

| Item | Value |
| :--- | :--- |
| Branch | `main` |
| Starting HEAD | `10c1c38f17edbcdcece48e787ea98f601ecfa8bb` |
| Starting tree | clean, matching `origin/main` |
| Ending HEAD | unchanged (`10c1c38`) — **no commit, no push** |
| Ending tree | dirty: additive P05 files + `index.html` / `src/main.js` / `src/style.css` |

`src/prototype01.js` through `src/prototype04.js`, existing experimental PNGs/JSON, and `package.json` were not modified. `package-lock.json` was restored after `npm install` touched it.

---

## Architecture

Prototype 05 is a new class `Prototype05` in `src/prototype05.js`, following the Prototype 04 pattern:

- own scene, camera, load path
- duplicated surrounding proxy cards and volumetric Citadel (assets loaded read-only)
- new water representations owned only by P05
- `src/shaders/waterShader.js` for projective water
- additive controller wiring: `?p=5`, tab, `[5]`

P03 is untouched. There is no handoff from P03 into P05.

Default without a query param remains Prototype 04.

---

## Water Geometry

**Fact:** Slab vertices are built by canonical unprojection, not by rotating a `PlaneGeometry`.

```
v0 = 855 / 1024
u ∈ [0, 1], v ∈ [v0, 1]
t = (v - v0) / (1 - v0)
Z = profile(t)
X = (u - 0.5) * (2 - Z)
Y = (0.5 - v) * (2 - Z)
```

| Knob | Value |
| :--- | :--- |
| Width segments | 56 |
| Height segments | 32 |
| Vertices | 1881 |
| Triangles | 3584 |
| Side | `FrontSide` only |
| Rest attribute | `aRestPosition` (projective UVs from rest) |

**Fact (canonical identity):** at pose `(0,0,2)` / rot 0, horizon samples sit at `py = 0.83496094` = `855/1024` exactly.

---

## Depth Profiles

All four are implemented and selectable live.

| ID | Formula | Default knobs |
| :--- | :--- | :--- |
| **A LINEAR** | `z = mix(zH, zN, t)` | — |
| **B SMOOTH** | `z = mix(zH, zN, t²(3−2t))` | — |
| **C POWER** | `z = mix(zH, zN, pow(t, γ))` | `γ = 1.20` (range 0.65–2.0) |
| **D HERMITE** | C1 two-zone cubic, flatten at horizon | `tMid = 0.40`, `zMidT = 0.28` |

Starting search knobs: `zHorizon = 0.70`, `zNear = 1.38`.

---

## Profile Search

Canonical water-band vs `poster.jpeg` (bottom `y ≥ 855/1024`):

| Profile | PSNR | MSE | >5/255 |
| :--- | ---: | ---: | ---: |
| LINEAR | 39.22 dB | 7.777 | 0.78% |
| SMOOTH | 39.20 dB | 7.819 | 0.81% |
| POWER | 39.22 dB | 7.788 | 0.79% |
| HERMITE | 39.21 dB | 7.803 | 0.79% |

LINEAR `zHorizon`/`zNear` sweep (canonical water vs poster): all PSNR in **39.22–39.26 dB**. No knob won on metrics.

**Inference:** at the canonical camera, projective identity dominates. Profile shape is almost invisible until the camera moves.

Forward-push inspection (Z = 1.70): all four read as a receding painted tablet with a hard far edge. HERMITE kept slightly more foreground water in frame. LINEAR/SMOOTH/POWER were nearly interchangeable.

---

## Chosen Profile

| Role | Choice | Why |
| :--- | :--- | :--- |
| **Default (technical + shipping)** | **A LINEAR** | Simplest. Canonical PSNR tied. Wireframe proves recession without extra curve complexity. |
| **Fallback profile** | **D HERMITE** | Slightly more near-water presence under push. Not enough to justify as default. |
| **Fallback representation** | **CARD STACK** | Same projective paint, 2.5D strips. Did not beat the slab on forward motion. |

Technical winner and perceptual winner are **the same for default (LINEAR)**. HERMITE is only a weak perceptual alternative, not a different conclusion.

Metrics did **not** disagree with this choice; they were simply uninformative off the canonical pose.

---

## Canonical Fidelity

Water-band pixels only:

| Pair | PSNR | MSE | >5/255 |
| :--- | ---: | ---: | ---: |
| POSTER ↔ CARD | **47.86 dB** | 1.065 | 0.00% |
| POSTER ↔ SLAB | 39.22 dB | 7.777 | 0.78% |
| POSTER ↔ STACK | 39.28 dB | 7.669 | 0.78% |
| CARD ↔ SLAB | 39.80 dB | 6.805 | 0.75% |

**Fact:** CARD is the closest water match to the poster (as expected: same vertical card as P02/P04).

**Inference:** the ~8 dB drop from CARD to SLAB is mostly footprint discard + 3 px horizon feather + Citadel volume vs painted footings, not a projective UV bug. Blink at rest still reads as the same painted ocean.

Full-frame metrics are polluted by P04 Citadel/flare differences vs the raw poster (same as P04’s ~39 dB volume-vs-poster notes).

---

## Projective Texture

- Frozen dummy camera `FOV 53.130102`, `(0,0,2)`, near 0.1, far 100
- Sample `layer-f-water.png` (`SRGBColorSpace`, linear, ClampToEdge)
- Discard UV outside `[0,1]` and source alpha `< 0.05`
- `#include <colorspace_fragment>`
- No extra grading, no normals, no SSR, no PBR
- PROJECTION DEBUG visualizes canonical UV

---

## Footprint Contamination

**Fact:** P04 `citadel-silhouette-mask.png` fills from the left contour to the **right image edge**. It must not be used as a water reject (it would delete the entire right ocean).

P05 rejects using **layer alpha**:

- `layer-d-citadel.png`
- `layer-c-sentinel.png`
- needles optional (OFF)

FOOTPRINT DEBUG paints rejects magenta.

**Remaining artifacts:**

- Blocky magenta / holes at Sentinel and Citadel footings
- Open-sea waterline foam is mostly kept; some halo / missing foam at the rock/water cut
- Off-axis, discarded texels become empty gaps beside the Sentinel (no inpaint this pass, as specified)

---

## Depth Write

| Test | Result |
| :--- | :--- |
| ON vs OFF, forward-left pose | **MSE 0 / PSNR 88 dB** (identical) |

**Inference:** inside the approved envelope, footprint discard already removes the overlapping fragments, so depth write does not change pixels.

**Default: ON.** It is the correct 3D setting for later poses where the volume and slab occupy the same screen pixel without a silhouette hit. No z-fight was observed in the captured envelope.

---

## Horizon

**Canonical:** horizon world points project to `v = 855/1024` exactly. Crop of the water/sky junction looks connected.

**Forward (Z = 1.70, pitch 0):** those same points drop to `py ≈ 0.935` (~102 px down on a 1024 image). The painted horizon on the needle/sky cards stays in the distance; the slab’s far edge becomes a **hard table edge** in the lower third.

This is not a bug in unprojection. A pitch-0 camera flying toward −Z looks *over* a surface that lives below the optical axis. Keeping the painted horizon glued would require ~23° of down-pitch at this push, which violates the small-pitch envelope.

Feather: 3 source pixels (range 0–8). Softens the PNG cut at rest; does **not** hide the geometric far edge under motion.

---

## Citadel Contact

Volumetric Citadel remains ON.

**Works:** at rest, cyan churn is recognizable; mountain is not reprinted as a decal on open sea (footprint reject).

**Breaks under push:** a dark seam / table-edge where the slab meets the massif. Optional localized `z(u,v)` pull toward footing `Z = 1.012` (`Contact ON`) did not remove that read. Left **disabled**.

The Citadel is not remodeled.

---

## Camera Envelope

| Axis | Default | Hard clamp | Tested |
| :--- | :--- | :--- | :--- |
| X | ±0.12 | ±0.18 | ±0.12 |
| Y | ±0.04 | ±0.04 | +0.04 |
| Z | 2.00 → 1.70 (`push 0.30`) | `z > zNear + 0.08` | 1.70 |
| Yaw | ≤ 3.5° | 0.061 rad | ±0.04 rad |
| Pitch | very small | ±0.04 rad | 0 on the scripted push |

No WASD. Scripted path: canonical hold → push → left → right with tiny Y → return (16 s loop).

**Maximum comfortable envelope for human evaluation:** modest pointer parallax and **push to about 1.85–1.90**, not the full 1.70. At 1.70 the slab is true but reads as a tablet.

---

## Card Stack Comparison

Three receding strips (constant-Z per strip, overlapping `t` bands, same projective shader).

| | CARD | SLAB | STACK |
| :--- | :--- | :--- | :--- |
| Canonical water | Best PSNR | Good, slightly worse | ≈ slab |
| Forward Z=1.70 | Water band largely **leaves the frame** (billboard) | Receding painted surface remains | Similar tablet, extra strip seams |
| Proves spatial Z | No | **Yes** (wireframe) | Weak / layered |

The slab outperforms the stack as a spatial test. The stack is not a production fallback; it is the 2.5D control.

---

## Texture Swimming

| Condition | Water-band A vs B (700 ms apart, same pose) |
| :--- | :--- |
| Alive OFF | PSNR 88 dB, 0% >5/255 — **no crawl** |
| Alive ON (≤2 px UV warp) | PSNR 32.6 dB, 9.57% >5/255 — **visible crawl** |

Projective UVs come from rest positions. Alive warp offsets the sample UV; that *is* swimming. **Alive remains OFF.**

---

## Alive Motion

Implemented as optional ≤2 px UV warp, locked to zero at canonical pose. **Not used for the default evaluation.** It did not help painterly identity.

No vertex displacement, no Gerstner, no scrolling normals.

---

## Painterly Fidelity

**Survives:** canonical ocean — indigo troughs, cyan/sapphire body, white-cyan crests, Citadel churn, matte stroke.

**Breaks when the camera pushes:** the ocean becomes a finite painted quadrilateral with a razor far edge, empty sides (UV discard), and footing holes. It still looks like *this poster’s* paint, not like a game ocean — but it no longer feels like a world-ocean.

---

## Performance

Measured in headless Chrome + ANGLE/llvmpipe on this VM (software GL). **Not** a desktop GPU figure.

| Metric | Value |
| :--- | :--- |
| Water verts / tris | 1881 / 3584 |
| Draw calls | 9 |
| Headless FPS / frame | ~26 fps / ~39 ms |
| Textures | existing P02/P04 set + poster (no new images) |

60 fps on a real GPU is a **hypothesis**, not measured here. The mesh is small; draw-call count is near P04.

---

## Regression

| Check | Result |
| :--- | :--- |
| `?p=1` header Prototype 01 | pass |
| `?p=2` header Prototype 02 | pass |
| `?p=3` header Prototype 03 + ENTER overlay | pass |
| `?p=4` header Prototype 04, volume button active | pass |
| Hotkeys `[1]–[4]` unchanged meanings | pass (P05 only adds `[5]` and P05-scoped Space/D/S/W/P/F) |
| No P01–P04 source edits | pass |

---

## Known Artifacts

1. Forward motion: hard far edge / “painted table” (all profiles).
2. Horizon detaches from the sky gap under pitch-0 push (~102 px at Z=1.70).
3. Footprint reject holes beside Sentinel / under Citadel off-axis.
4. Dark waterline seam vs volumetric Citadel.
5. Empty regions left/right of the original poster frustum (no continuation texture).
6. CARD at Z=1.70 loses the ocean band out of frame — contrast that proves the slab has Z, and also shows why billboard water cannot travel.
7. Flare/Citadel volume differences vs raw poster (inherited from P04, not a water bug).

---

## What Prototype 05 Proves

- A ray-fitted projective slab can **blink-match** this poster’s ocean at the canonical camera.
- The same geometry has **real Z extent**: wireframe under push is a receding grid; the P02 card is not.
- Terrain RGB can be kept off open sea by **layer-alpha discard** (with leftover holes).
- Four monotonic depth profiles are **not** the main lever at this envelope; LINEAR is enough.
- Optional 2 px UV warp **does** swim; static reconstruction does not.

---

## What Prototype 05 Does Not Prove

- Unrestricted exploration
- Prototype 03 integration
- Final ocean simulation
- Generated infinite / side continuation
- Mobile performance
- Final terrain reconstruction
- That the viewer will read this as “the painted sea continues into a world” once they leave the opening pose — **under the approved push, they currently read a painted tablet**

---

## Controls

URL: `/` or `/?p=4` still opens Prototype 04. **Prototype 05: `/?p=5`**

| Input | Action |
| :--- | :--- |
| `[5]` / P05 tab | Select Prototype 05 |
| POSTER CARD SLAB STACK 50/50 | Representation |
| WIRE / FOOTPRINT / PROJ UV / PROFILE | Debug |
| A LINEAR … D HERMITE | Depth profile |
| zHorizon, zNear, gamma, Hermite mids, feather | Lab sliders |
| DepthWrite / Footprint / Alive / Contact | Toggles (Alive and Contact default OFF) |
| Pointer / Scripted Path | Camera |
| `[Space]` (while P05) | Toggle CARD ↔ SLAB |
| `[D]` | Cycle P05 modes |
| `[W]` | Wireframe |
| `[S]` | Scripted path |
| `[P]` | Parallax lock |
| `[F]` | Flare spire/sky |
| `[1]–[4]` | Other prototypes (unchanged) |

No ENTER sequence on P05.

---

## Verification artifacts

`scripts/test_prototype_05.cjs` writes `scripts/p05-verification/` (canonical modes, four profiles × poses, knob sweep, depth-write pair, swimming pair, crops, `metrics.json`).

---

# Prototype 05B — Horizon-Anchored Painted Ocean

**Question:** Can near/mid painted water occupy real 3D space while the distant water/horizon is a separate representation that stays perceptually attached to the background?

**Mode:** Targeted refinement of P05. Baseline LINEAR slab preserved. Alive OFF. Contact-pull OFF. No Prototype 06. No commit.

**Recommendation: B** — H1 far-extended projective slab (far Z = −3) is the topology winner. Generate one sea-only water asset before any integration. H2/H3/H4 do not beat H1.

## Measured far-edge horizon drift (open water u=0.50, 1024 px frame)

| Candidate | Canon PSNR (water band) | ΔZ=1.90 | ΔZ=1.85 | ΔZ=1.70 | Left/Right |
| :--- | ---: | ---: | ---: | ---: | ---: |
| BASELINE LINEAR zH=0.70 | 39.22 dB | 27.5 px | 43.0 px | **98.9 px** | 69.2 px |
| H1 zFar=0.5 | 39.26 | 23.5 | 36.6 | 82.4 | 58.4 |
| H1 zFar=0.0 | 39.24 | 17.3 | 26.7 | 58.2 | 42.0 |
| H1 zFar=−1 | 39.20 | 11.4 | 17.3 | 36.6 | 27.0 |
| **H1 zFar=−3** | **39.14** | **6.7** | **10.2** | **21.0** | **15.8** |
| H1 zFar=−6 | 39.07 | 4.2 | 6.3 | 12.8 | 9.8 |
| H2 cove start 0.24 far −3 | 39.17 | 6.7 | 10.2 | 21.0 | 15.8 |
| H2 cove start 0.18 far −6 | 39.13 | 4.2 | 6.3 | 12.8 | 9.8 |
| H2 cove start 0.35 far −1 | 39.22 | 11.4 | 17.3 | 36.6 | 27.0 |
| H3 split 0.30 far −3 | 34.66 | 6.7 | 10.2 | 21.0 | 15.8 |
| H3 split 0.22 far −6 | 34.02 | 4.2 | 6.3 | 12.8 | 9.8 |
| H3 split 0.40 far 0 | 34.68 | 17.3 | 26.7 | 58.2 | 42.0 |
| H4 pinned (diagnostic) | 29.80 | 0 | 0 | 0 | 0 |

Horizon drift for H1/H2/H3 at equal far Z is identical: it is determined only by the t=0 row’s world Z. Cove curvature does not move the far-edge sample.

## Perceptual verdict

- **H1 −3** is the only candidate that both keeps canonical paint (39.14 dB vs baseline 39.22) and still shows a receding painted ocean at Z=1.70 instead of a dropped tablet. Wireframe is a receding grid. New pathology: the water UV quad + terrain discard read as a rectangular pool / table-edge once the surface is more horizontal.
- **H1 −6** is numerically better (12.8 px) but more floor-like and more pool-edged. Not the default.
- **H2** matches H1 at the same far Z. Extra curve is not a perceptual win. Do not keep it as the architecture.
- **H3** hybrid seams, voids, and a ~5 dB canonical hit. Dual-horizon under push. Reject.
- **H4** proves a perfectly stable horizon is possible (0 px) and that horizon motion was a real failure mode — but the pinned strip is a HUD, not an ocean. Not production.

## Footprint

| Mode | Canon water PSNR | Hole heuristic |
| :--- | ---: | ---: |
| F0 hard (keep) | 39.22 dB | 0.09% |
| F1 soft / dilate | 33.05 dB | 0.59% — dark waterline across Citadel |
| F2 local fill | 33.05 dB | 0.61% — smears |

F1/F2 damage the painting. Stop shader-side reconstruction. Specify `layer-f-water-sea-only.png` (see report).

## Performance (canonical, llvmpipe — not a GPU number)

H1 −3: 3185 verts, 6144 tris, 7 draw calls. H3/H4: 8 draw calls.

## Controls added

BASE / H1 FAR / H2 COVE / H3 HYBRID / H4 PIN. F0 / F1 / F2. Scripted Path still uses the same camera motion for every topology. Default remains BASELINE SLAB.

Captures: `scripts/test_prototype_05b.cjs` → `scripts/p05b-verification/`.

---

## Prototype 05B Sea-Only Asset Integration

**Asset:** `reference/experimental/prototype-05/generated/layer-f-water-sea-only.png` (1024×1024 RGBA). Served from the same path under `public/`.

**Sea source toggle:** `ORIGINAL | SEA-ONLY`. H1 FAR defaults to SEA-ONLY. The original water card still uses `layer-f-water.png`. Spatial slab/H1/H2/H3/H4 sample the selected source. Geometry unchanged: LINEAR H1, far Z = −3, near Z = 1.38, 3185 verts, depth-write ON, alive OFF, contact pull OFF.

**Footprint discard:** disabled for SEA-ONLY (`effectiveFootprintOn = false` even if the Footprint ON toggle is set). ORIGINAL keeps F0 hard discard. This was required so reconstructed sea is not punched out.

### Pixel-preservation verification

Programmatic compare vs `layer-f-water.png` through `water-missing-mask-hard.png`:

| Check | Result |
| :--- | :--- |
| Protected pixels (hard-mask black) | **0** diffs |
| y < 855 | **0** diffs (transparent black) |
| Hard-mask pixels | 67,399 |
| Hard-mask changed | 67,372 (27 unchanged) |
| Reconstructed alpha | **255** on all 67,399 |
| Water-band opaque | 173,056 / 173,056 |

`scripts/verify_sea_only_pixels.cjs` → pass.

### Canonical (full composite)

| Pair | Full PSNR | Water-band PSNR | Hole heuristic |
| :--- | ---: | ---: | ---: |
| POSTER ↔ H1 ORIGINAL | (matches 05B) | **39.14 dB** | 0.09% |
| POSTER ↔ H1 SEA-ONLY | — | **28.17 dB** | 1.74% |
| ORIGINAL H1 ↔ SEA-ONLY H1 | 35.81 dB | 28.00 dB | — |

Isolated-water PSNR drop is expected: reconstructed sea replaces ice-colored water-layer pixels. Human composite: Citadel / Sentinel / needles still reconstruct the poster. Open-center water matches. No duplicated mountain on the sea. Slight extra horizon grain in the reconstructed strip; not a hole.

### Poses (same 05B path)

| Pose | ORIGINAL holes | SEA-ONLY holes | Verdict |
| :--- | ---: | ---: | :--- |
| Z = 1.90 | 17.17% | 16.23% | Sentinel empty rectangle **gone**. Ocean continues behind the Sentinel. UV-quad right edge still visible. |
| Z = 1.85 | 18.81% | 17.38% | Footprint hole **filled**. Rectangular pool remains as the poster-UV ocean patch, not as a missing-sea bite. Cyan churn at Citadel still reads. |
| Z = 1.70 stress | 21.90% | 20.03% | Remaining failure is **A — lateral side-continuation / UV-quad bounds**. Not a footing-contact hole. Left/right drift: black beyond the original frustum. No wider ocean generated. |

Horizon far-edge drift is unchanged (H1 −3 geometry untouched).

### Contact

- **Sentinel:** previous empty / rectangular missing-water region is gone at every captured pose.
- **Citadel:** dark table-edge from discarded water is gone at rest. Mountain still embedded. No decal duplicate of the Citadel on open sea. Push still shows the water **quad** ending beside the Citadel (UV 0–1), which is world-extension, not a discarded footing.
- **Needles / horizon:** no bright or dark patch. Tiny reconstructed strip is quiet.

### Rectangular pool

Still present under push because projective UVs are the original 1024 poster square. Sea-only removed the **interior bites** (Sentinel hole). It did not widen the ocean. That is the next world-extension job, not a topology reopen.

### Performance

H1 −3 ORIGINAL and SEA-ONLY: **3185 verts, 7 draw calls**. One extra 1024×1024 texture. Headless fps ~15–17 on both (llvmpipe). No geometry regression.

### P01–P04

Unchanged (`git diff` empty on `prototype01.js`–`prototype04.js`).

### H1 −3 status

Remains the topology winner. Not retuned.

**Recommendation: A** — Prototype 05 complete for a first controlled poster-to-world journey. Remaining limits are side-continuation / wider ocean, not broken water reconstruction.

Captures: `scripts/test_prototype_05b_sea_only.cjs` → `scripts/p05b-sea-only-verification/` (does not overwrite 05B captures).

