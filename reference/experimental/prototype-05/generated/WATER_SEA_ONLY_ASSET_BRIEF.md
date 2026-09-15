# Water sea-only asset brief

**Output file:** `reference/experimental/prototype-05/generated/layer-f-water-sea-only.png`

**This is an inpainting / compositing job, not a new painting.**

Do not imitate a named artist. Match only the visible water already present in `reference/poster.jpeg` and `reference/experimental/prototype-02/layer-f-water.png`.

---

## Canvas

| Item | Value |
| :--- | :--- |
| Size | **1024 × 1024** pixels |
| Color | sRGB PNG |
| Water band | **y ≥ 855** (rows 855–1023 inclusive) |
| Above the band | **y < 855** — must stay **transparent black** (RGBA 0,0,0,0), identical to `layer-f-water.png` |

Source water layer to edit:

`reference/experimental/prototype-02/layer-f-water.png`

That file is already fully opaque in the water band. Terrain footings are painted **into** it. The sea-only asset replaces only those footing pixels with continued ocean.

---

## Masks

Use:

- `water-missing-mask-hard.png` — **binary**. White = reconstruct. Black = **pixel-identical** to the source water layer.
- `water-missing-mask-soft.png` — same core, plus a **2 px Euclidean feather** (grayscale falloff) for the inpainter only.

**Highest-priority rule:** after inpainting, **composite**:

```
out[x,y] = hard_mask.white ? inpainted[x,y] : source_water[x,y]
```

Every black hard-mask pixel in the water band must match `layer-f-water.png` exactly (RGB and alpha). The soft mask may overlap a 2 px ring of valid foam; that ring is **context for the generator**, not permission to keep those changes in the final file.

---

## What may change

White pixels of `water-missing-mask-hard.png` only. These are water-band pixels whose **Prototype 02 layer alpha** belongs to:

- Solar Citadel — `layer-d-citadel.png` (right mass, y 855–960)
- Western Sentinel — `layer-c-sentinel.png` (left mass, y 855–920)
- Needles — `layer-e-needles.png` (two distant spire feet, y 855–860 only)

Union count: **67,399 pixels** = **38.95% of the water band** = **6.43% of the full image**.

Fill those pixels with **opaque ocean** that continues the adjacent unmasked water: same stroke family, scale, and palette, as if the ice were not there and the sea ran behind it.

---

## What must remain pixel-identical

- All pixels with **y < 855**
- All water-band pixels that are **black** in the hard mask (open ocean, foam, churn that is not inside a terrain silhouette)
- Alpha = 0 above the band; alpha = 255 on every reconstructed sea pixel and on every preserved water pixel

Do not move foam, do not sharpen, do not grade, do not inpaint the whole ocean.

---

## Observable water (from `poster.jpeg`)

In the lower ~16.5% of the square image:

- Opaque indigo / deep sapphire troughs
- Luminous cyan and aquamarine strokes on the faces of the waves
- White–cyan foam on crests and in the near foreground
- Broad painterly wave forms, not ripple noise
- Stroke scale **compresses toward the horizon** (y ≈ 855): distant water is a tighter, flatter band
- Warm reflected light (amber / pale gold) where the sun column hits mid-water
- Bright cyan churn against the Citadel’s right-hand base — **keep this on the unmasked water**; do not invent a second Citadel
- Matte, painted, gouache-like surface

---

## Alpha / material

- Reconstructed sea: **opaque** (alpha ≥ 250, prefer 255)
- No holes, no glass, no see-through water
- **Forbidden:** PBR highlights, IOR, real-ocean photography, stock normal-map water, repeating procedural tiles, generic “game water,” sparkle shaders, foam particle sprites

---

## Suggested generator settings

1. Source image: `layer-f-water.png` (not a blank canvas).
2. Inpaint mask: `water-missing-mask-soft.png` (white/gray = generate).
3. Condition on neighboring unmasked water; do not generate above y = 855.
4. Composite with the **hard** mask as specified above.
5. Save as `layer-f-water-sea-only.png` at 1024×1024 sRGB PNG.

---

## Forbidden changes

- Any edit of valid (hard-mask black) water
- Painting sky, ribbons, planet, or ice above y = 855
- Extending the ocean into a new composition or wider world
- Softening or removing the existing near-field foam outside the mask
- Named-artist style prompts
- Transparency in reconstructed sea
- Using `citadel-silhouette-mask.png` (it fills the entire right water band; it is not a footing mask)

---

## Diagnostic

`water-missing-mask-preview.png` — poster with water-band overlay:

- **Red** — Citadel footing (inpaint)
- **Green** — Sentinel footing (inpaint)
- **Yellow** — needle footing (inpaint)
- **Pale yellow ring** — 2 px soft feather
- **White row** — y = 855 water-band start
- Sky darkened — no generation
