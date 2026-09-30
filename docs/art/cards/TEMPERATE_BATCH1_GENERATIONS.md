# Temperate batch 1 — one prompt per generation

DRAFT v0.2, 2026-09-30. CARDS-1 document corrections and DEC-045 catalogue metadata only; this document is not an art request or authorization to execute a tool. Existing run numbers are stable reference IDs, not execution order. World / Biome or depth band / Item / Specs structure retained; World paragraph remains provisional until the lore lock. DEC-046: static first; animation references below are DEFERRED. Nothing enters the game without the Owner's YEA.

## Owner run order (CARDS-1 Section 4 reference)

Recorded dependency order only; no generation is requested by this lane. Within each triplet: base (V2), damp (V1), dry (V3); damp and dry share the accepted base reference.

1. Dirt 4, 5, 6: Meadow reference for base, then accepted Dirt base.
2. Forest floor 7, 8, 9.
3. Dry grass 16, 17, 18.
4. Rock 1, 2, 3.
5. Stony 28, 29, 30: accepted Dirt base reference for run 28.
6. Shrub soil 13, 14, 15.
7. Needle floor 10, 11, 12.
8. Mud 19, 20, 21.
9. Swamp mud 22, 23, 24.
10. Sand 34, 35, 36.
11. Scree 31, 32, 33: accepted Rock base reference for run 31.
12. Peak rock 25: accepted Rock base reference; uniform.
13. Road 37: accepted Dirt base reference; uniform.
14. Cave floor 48 and mined stone 49: accepted Rock base reference; uniform.
15. Mined soil (dug earth) 50: accepted Dirt base reference; uniform. Canonical ID: `ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT`.

Runs 26 and 27 were removed because peak rock is uniform. Runs 51 and 52 are outside these 16 terrain kinds. Water loops 39, 41, 43, 45, 47 and foliage loops 75–79 remain DEFERRED. For uniform cards, the damp/dry Specs comparison describes neighbouring gradient kinds; it does not create additional variants.

## Ground

### 1. Rock — base

`SURFACE_SHARED_TERRAIN_ROCK_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of grey rock ground, cracked and weathered, with quiet mineral grain.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 2. Rock — damp

`SURFACE_SHARED_TERRAIN_ROCK_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of rain-wet, darker grey rock ground, cracked and weathered, with quiet mineral grain.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 3. Rock — dry

`SURFACE_SHARED_TERRAIN_ROCK_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of sun-dried, paler grey rock ground, cracked and weathered, with quiet mineral grain.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 4. Dirt — base

`SURFACE_SHARED_TERRAIN_DIRT_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of bare brown loam with an even fine crumb and a few tiny pebbles.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 5. Dirt — damp

`SURFACE_SHARED_TERRAIN_DIRT_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, dark bare brown loam with an even fine crumb and a few tiny pebbles.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 6. Dirt — dry

`SURFACE_SHARED_TERRAIN_DIRT_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, pale bare brown loam with an even fine crumb and a few tiny pebbles.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 7. Forest floor — base

`SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of leaf litter of fallen oak and ash leaves with a few small twigs over dark humus.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 8. Forest floor — damp

`SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Forest floor base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, dark leaf litter of fallen oak and ash leaves with a few small twigs over dark humus.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 9. Forest floor — dry

`SURFACE_SHARED_TERRAIN_FOREST-FLOOR_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Forest floor base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, paler leaf litter of fallen oak and ash leaves with a few small twigs over dark humus.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 10. Needle floor — base

`SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 11. Needle floor — damp

`SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Needle floor base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, dark fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 12. Needle floor — dry

`SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Needle floor base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, paler fine rusty-brown pine needles over dark earth, even grain, no cones or large twigs.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 13. Shrub soil — base

`SURFACE_SHARED_TERRAIN_SHRUB-SOIL_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of gritty light-brown scrubland soil with small stones, no grass tufts, no bush.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 14. Shrub soil — damp

`SURFACE_SHARED_TERRAIN_SHRUB-SOIL_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Shrub soil base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp gritty light-brown scrubland soil with small stones, no grass tufts, no bush.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 15. Shrub soil — dry

`SURFACE_SHARED_TERRAIN_SHRUB-SOIL_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Shrub soil base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, pale gritty light-brown scrubland soil with small stones, no grass tufts, no bush.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 16. Dry grass — base

`SURFACE_SHARED_TERRAIN_DRY-GRASS_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry golden-brown grass with sparse blades over soil.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 17. Dry grass — damp

`SURFACE_SHARED_TERRAIN_DRY-GRASS_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dry grass base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of rain-damp golden-brown grass with sparse blades over soil, same hue as the base, one value-step darker.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 18. Dry grass — dry

`SURFACE_SHARED_TERRAIN_DRY-GRASS_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dry grass base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of parched, pale dry golden-brown grass with sparse blades over soil.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 19. Mud — base

`SURFACE_SHARED_TERRAIN_MUD_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 20. Mud — damp

`SURFACE_SHARED_TERRAIN_MUD_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Mud base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, darker soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles, no specular highlight.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 21. Mud — dry

`SURFACE_SHARED_TERRAIN_MUD_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Mud base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, paler soft brown marsh mud with broad compressed patches and a little reed stubble, no open puddles, no cracked crust.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 22. Swamp mud — base

`SURFACE_SHARED_TERRAIN_SWAMP-MUD_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of black peaty swamp mud with coarse organic texture and small flecks of moss, no open water.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 23. Swamp mud — damp

`SURFACE_SHARED_TERRAIN_SWAMP-MUD_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Swamp mud base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, darker black peaty swamp mud with coarse organic texture and small flecks of moss, no open water, no specular highlight.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 24. Swamp mud — dry

`SURFACE_SHARED_TERRAIN_SWAMP-MUD_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Swamp mud base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, paler black peaty swamp mud with coarse organic texture and small flecks of moss, no open water, no cracked crust.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 25. Peak rock — uniform

`SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of rough dark-grey crag rock with hard fractures, darker than ordinary rock, not loose scree.

Specs: one seamless 48x48 tile, the single uniform state of this ground; no damp or dry variants. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 28. Stony — base

`SURFACE_SHARED_TERRAIN_STONY_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of packed brown earth with small, evenly scattered weathered grey stones, sparser than scree.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 29. Stony — damp

`SURFACE_SHARED_TERRAIN_STONY_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Stony base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp packed brown earth with small, evenly scattered weathered grey stones, sparser than scree.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 30. Stony — dry

`SURFACE_SHARED_TERRAIN_STONY_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Stony base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, pale packed brown earth with small, evenly scattered weathered grey stones, sparser than scree.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 31. Scree — base

`SURFACE_SHARED_TERRAIN_SCREE_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 32. Scree — damp

`SURFACE_SHARED_TERRAIN_SCREE_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Scree base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of damp, darker grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 33. Scree — dry

`SURFACE_SHARED_TERRAIN_SCREE_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Scree base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, paler grey scree of tight-packed angular broken stones, fully opaque, no intact slab, no holes.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 34. Sand — base

`SURFACE_SHARED_TERRAIN_SAND_V2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your Meadow tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of fine pale lake-shore sand with even grain and faint shallow ripples.

Specs: one seamless 48x48 tile, the ordinary state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 35. Sand — damp

`SURFACE_SHARED_TERRAIN_SAND_V1_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Sand base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of wet, darker fine pale lake-shore sand with even grain and faint shallow ripples.

Specs: one seamless 48x48 tile, the damp state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 36. Sand — dry

`SURFACE_SHARED_TERRAIN_SAND_V3_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Sand base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One seamless tile of dry, palest fine pale lake-shore sand with even grain and faint shallow ripples.

Specs: one seamless 48x48 tile, the dry state of this ground; match the grain scale and density of its other states. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow, central object, or features that change what the ground is. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 37. Road (one tile)

`SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Ground stays quiet enough for figures and resources to read clearly.

A compacted packed-earth cart track with subdued wheel wear, lighter and smoother than bare dirt, no painted border.

Specs: one seamless 48x48 tile. Opaque edge to edge, static, flat ground seen from high top-down. No border, bevel, cast shadow or central object.
```

## Water

### 38. Fresh water — still

`SURFACE_SHARED_WATER_FRESH_A1_DEFAULT` · Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile · no style reference

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Clear fresh river water, cool blue-green, with small restrained groups of ripples.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. Static single frame. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 39. Fresh water — animation (3 phases) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_WATER_FRESH_A1_DEFAULT` · Animate · input: your accepted Fresh water still · 3 frames · loop

```text
Small ripple groups drift gently across the water in the direction of the current; three frames; seamless loop; every frame tiles; no whole-texture scrolling, no sparkle.
```

### 40. Pond — still

`SURFACE_SHARED_WATER_POND_A1_DEFAULT` · Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile · no style reference

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Sheltered still pond water, slightly greener and calmer than river water, with gentle local ripples and no foam.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. Static single frame. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 41. Pond — animation (3 phases) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_WATER_POND_A1_DEFAULT` · Animate · input: your accepted Pond still · 3 frames · loop

```text
Faint local ripples swell and fade in place; three frames; seamless loop; every frame tiles; calmer than the river; no sparkle.
```

### 42. Marsh water — still

`SURFACE_SHARED_WATER_MARSH_A1_DEFAULT` · Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile · no style reference

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Shallow, sediment-rich marsh water, murky olive-green, with small scattered specks of duckweed and no reeds in the fill.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. Static single frame. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 43. Marsh water — animation (3 phases) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_WATER_MARSH_A1_DEFAULT` · Animate · input: your accepted Marsh water still · 3 frames · loop

```text
The duckweed specks shift a pixel or two as the shallow water barely moves; three frames; seamless loop; every frame tiles.
```

### 44. Swamp water — still

`SURFACE_SHARED_WATER_SWAMP_A1_DEFAULT` · Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile · no style reference

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Dark peaty swamp water, tea-brown to near black, with sparse floating leaf debris, clearly wetter and glossier than swamp mud.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. Static single frame. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 45. Swamp water — animation (3 phases) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_WATER_SWAMP_A1_DEFAULT` · Animate · input: your accepted Swamp water still · 3 frames · loop

```text
Slow dull glints move across the dark water and the floating debris drifts slightly; three frames; seamless loop; every frame tiles.
```

### 46. Deep water — still

`SURFACE_SHARED_WATER_DEEP_A1_DEFAULT` · Maps → Create Tiles Pro · square top-down · 48 px · view high top-down · segmentation on · one tile · no style reference

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

Deep open water, a darker blue clearly lower in value than shallow water, with broad quiet internal wave marks.

Specs: one seamless 48x48 water tile, opaque edge to edge, flat, seen from high top-down. Static single frame. No foam line, border, glow, sparkle stars or reflections of objects.
```

### 47. Deep water — animation (3 phases) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_WATER_DEEP_A1_DEFAULT` · Animate · input: your accepted Deep water still · 3 frames · loop

```text
Broad slow wave marks roll across the deep water; three frames; seamless loop; every frame tiles; no foam.
```

## Underground

### 48. Cave floor

`ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A natural cave floor of damp grey stone with worn mineral grain and a little settled sediment, no walls painted in.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 49. Mined stone

`ALL_SHARED_TERRAIN_MINED-STONE_A2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A newly worked floor of the same grey rock, flatter than the cave floor, with restrained chisel marks, evenly scattered, no centred motif, and the host rock still recognisable.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 50. Mined soil (dug earth)

`ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

A freshly dug floor of compacted brown earth with blunt pick marks, evenly scattered, no centred motif, and no surviving turf, the same soil colour as dirt.

Specs: one seamless 48x48 floor tile, opaque edge to edge, static, flat, seen from high top-down. No walls, border, bevel, cast shadow or central object. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 51. Rock top — DEFERRED (outside the 16 terrain kinds)

Outside the CARDS-1 terrain job; retained as reference metadata only.

`ALL_SHARED_TERRAIN_ROCK-SOLID_TOP_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Rock base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of intact grey rock seen from directly above, quiet grain matching the rock ground, reading as solid and not as walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque edge to edge, static, no thickness, border, bevel or shadow. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

### 52. Soil top — DEFERRED (outside the 16 terrain kinds)

Outside the CARDS-1 terrain job; retained as reference metadata only.

`ALL_SHARED_TERRAIN_SOIL-SOLID_TOP_DEFAULT` · Maps -> Create Tiles Pro · square top-down · 48 px · view high top-down · outline off · segmentation off · tile thickness 0 · one tile · style reference: your accepted Dirt base tile

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

The Lowlands, just below the surface: shallow underground spaces where soil, rock, water and roots meet. Exposed material layers, modest relief, weathered surfaces. Floors show honest stone and earth with a little settled sediment; do not make them uniformly black or carpet them with growth.

The flat top of a solid mass of packed brown earth seen from directly above, matching the dug-earth colour, reading as solid and not as walkable floor.

Specs: one seamless 48x48 tile showing the flat top of a solid mass from directly above. Opaque edge to edge, static, no thickness, border, bevel or shadow. Master palette only, ≤8 colours, no outline, no glow. Same hue as this kind's base; damp is one grey-value step darker, dry one step paler. Self-seam; no unique blob on an edge; same crack/pebble/leaf positions as the accepted base, value only. Driest of this kind must still read apart from the dampest neighbour kind.
```

## Flora and stones

### 53. Grass tuft

`SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One compact upright tuft of mid-green grass, separate from the ground.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 54. Wildflowers

`SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small mixed cluster of meadow wildflowers, a few tiny red, yellow and white blooms among green leaves, quiet enough to stay background vegetation.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 55. Bluebells

`SURFACE_SHARED_FLORA_FLOWERS-BLUE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small cluster of nodding bluebells with one readable blue-violet bloom mass over strap leaves.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 56. White flowers

`SURFACE_SHARED_FLORA_FLOWERS-WHITE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A low cluster of small white woodland flowers with restrained bright petals over dark leaves.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 57. Fern

`SURFACE_SHARED_FLORA_FERN_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A few broad divided bracken fronds spread in a clear fan.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 58. Bush

`SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A quiet non-fruiting hedgerow bush with a clear rounded silhouette.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 59. Berry bush

`SURFACE_SHARED_FLORA_BERRY-BUSH_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A low broad bramble bush with a few conspicuous dark berry clusters.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 60. Reeds

`SURFACE_SHARED_FLORA_REEDS_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A bundle of slender wetland reed stems with brown seed heads.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 61. Lily pad

CARDS-1 follow-up: binary-alpha wording correction remains deferred; this card is not QA-cleared by WG.20.02.

`SURFACE_SHARED_FLORA_LILY-PAD_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small group of broad round floating lily leaves with transparent gaps where the water shows through.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 62. Lichen

`SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A flat crust-like patch of pale grey-green lichen, shaped as if growing on exposed rock.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 63. Gravel

`SURFACE_SHARED_STONE_GRAVEL_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A small loose deposit of angular grey gravel in discrete pieces.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 64. Berry bush, picked

`SURFACE_SHARED_FLORA_BERRY-BUSH-BARE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → one per accepted berry bush · reference image: that accepted berry bush

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

The same bramble bush after its berries are gathered: same shape and leaves, no fruit.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 65. Loose stones (optional: already generated, redo only if it fails QA) (optional)

`ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A loose group of a few separate weathered grey stones.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

### 66. Granite boulder (optional: already generated, redo only if it fails QA) (optional)

`SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · 48 px · 16 candidates → keep the 8 most different

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

One heavy blocky speckled-grey granite boulder with a clear ground contact.

Specs: a single object on a transparent background, sized for a 48x48 tile, seen from high top-down, resting on the ground at the bottom centre. Crisp pixel clusters and a restrained one-pixel outline in its own darkest colour. Static. No ground tile, shadow blob, glow or text.
```

## Trees

### 67. Oak (96x96)

`SURFACE_SHARED_TREE_OAK_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x96 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A broad sturdy oak with a broken rounded crown and a substantial trunk.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 68. Birch (96x144)

`SURFACE_SHARED_TREE_BIRCH_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x144 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A slender white-barked birch with dark bark marks and a light, airy, irregular crown.

Specs: a single tree on a transparent background at native size 96x144, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 69. Pine (96x144)

`SURFACE_SHARED_TREE_PINE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x144 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A tall pine with tiered dark-green foliage masses and a visible reddish trunk base.

Specs: a single tree on a transparent background at native size 96x144, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 70. Fruit tree (96x96)

`SURFACE_SHARED_TREE_FRUIT-TREE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x96 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A modest spreading apple tree with a few readable clusters of red fruit.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 71. Fruit tree, picked (96x96)

`SURFACE_SHARED_TREE_FRUIT-TREE-BARE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x96 · pick the best one · reference image: your accepted fruit tree

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

The same apple tree after harvest: same trunk and crown, no fruit.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 72. Swamp tree (96x96)

`SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x96 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A damp-ground alder with exposed arching roots and an irregular crown.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 73. Stump (48x48)

`SURFACE_SHARED_TREE_STUMP_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 48x48 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A cut oak stump with a readable pale cut face and rings.

Specs: a single tree on a transparent background at native size 48x48, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees.
```

### 74. Dead tree (96x96)

`SURFACE_SHARED_TREE_DEAD-TREE_V1_DEFAULT` · Objects → Create 1-direction object · high top-down · selective outline · medium detail · native size 96x96 · pick the best one

```text
Emrys is a tangible fantasy world of old stone, living woodland and dangerous depths, shaped by oaths, hospitality and the nearness of the uncanny. Create original, readable pixel art with English folklore character and a lived-in medieval feel. Use high top-down view, crisp pixel clusters and consistent upper-left light. Establish silhouette first, value second and restrained colour third. Keep terrain calmer than actors, materials believable and details legible at native game size. World feel: English folklore, in the spirit of Ultima VII and EverQuest.

Temperate Emrys: meadow, broadleaf woodland, hedged clearings, streams and weathered stone. Calm greens, loam brown, grey rock and restrained straw tones: grass a mid green, soil a mid brown, fieldstone a mid grey, flowers only small accents. Do not paint roads, fences or ruins into natural things. Ground stays quiet enough for figures and resources to read clearly.

A leafless weathered dead tree with grey bark and broken branch ends.

Specs: a single tree on a transparent background at native size 96x96, seen from high top-down, trunk base at the bottom centre. A restrained one-pixel outline in its own darkest colour. No ground tile, shadow blob, glow or neighbouring trees. Never a 48 px tree enlarged.
```

### 75. Oak — foliage animation (optional) (optional) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_TREE_OAK_V1_DEFAULT` · Animate · input: your accepted Oak · 4 frames · loop

```text
The crown's leaves stir gently in a light breeze; the trunk and base stay perfectly still; four frames; seamless loop; no whole-tree sway, stretching or rotation.
```

### 76. Birch — foliage animation (optional) (optional) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_TREE_BIRCH_V1_DEFAULT` · Animate · input: your accepted Birch · 4 frames · loop

```text
The crown's leaves stir gently in a light breeze; the trunk and base stay perfectly still; four frames; seamless loop; no whole-tree sway, stretching or rotation.
```

### 77. Pine — foliage animation (optional) (optional) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_TREE_PINE_V1_DEFAULT` · Animate · input: your accepted Pine · 4 frames · loop

```text
The crown's leaves stir gently in a light breeze; the trunk and base stay perfectly still; four frames; seamless loop; no whole-tree sway, stretching or rotation.
```

### 78. Fruit tree — foliage animation (optional) (optional) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_TREE_FRUIT-TREE_V1_DEFAULT` · Animate · input: your accepted Fruit tree · 4 frames · loop

```text
The crown's leaves stir gently in a light breeze; the trunk and base stay perfectly still; four frames; seamless loop; no whole-tree sway, stretching or rotation.
```

### 79. Swamp tree — foliage animation (optional) (optional) — DEFERRED

DEFERRED under DEC-046 (2026-09-30): animation is outside the static-first batch; retained as a future reference only.

`SURFACE_SHARED_TREE_TREE-SWAMP_V1_DEFAULT` · Animate · input: your accepted Swamp tree · 4 frames · loop

```text
The crown's leaves stir gently in a light breeze; the trunk and base stay perfectly still; four frames; seamless loop; no whole-tree sway, stretching or rotation.
```
