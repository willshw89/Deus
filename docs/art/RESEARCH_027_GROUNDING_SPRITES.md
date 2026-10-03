# RESEARCH-027: Grounding sprites in strict top-down pixel art

Deep research brief #27 for Project DEUS, 2026-10-03. Author: Claude (research only; no art was generated, DEC-007). Scope: objects (trees, stumps, roots, logs, rocks, boulders, bushes, grass tufts, flowers, bones, clutter, critters) that read as pasted on the ground instead of sunk into soil, sand, snow, mud, ash, gravel and shallow water. Constraints taken as given: strict 90-degree top-down camera, 48x48 px tiles at about 1 px per inch, the hand-tuned ~650-colour palette, selective dark outlines with no pure black, no baked dirt pads, PixelLab generation with local Python cleanup, 2x zoom, and the eight biome families.

Sources were verified to exist during this session; two of the most useful pages (Slynyrd's top-down objects post and the Stardew pixel-art guide) could not be opened from this container, so their facts below come from search excerpts and are marked (excerpt). No tutorial image is copied; every recipe and every line of code here is original.

## 0. The short answer

In a true overhead view with a high light, a cast shadow falls under the object and is hidden by it. So the usual fix for floating sprites (a drop shadow) is the wrong tool here; worse, an offset or oval shadow tells the eye the camera is tilted, which contradicts the strict top-down camera and makes everything else look off. What makes an object read as *in* the ground from directly above is, in order of strength:

1. **The ground occludes the object's base.** A few ground pixels (grass blades, soil crumbs, a snow lip, a sand drift) cross the object's lower silhouette. The object is behind the ground at its contact line, not on top of it.
2. **A contact-occlusion rim, not a drop shadow.** The ground immediately around the footprint is one or two ramp steps darker, widest on the side away from the light and in concavities, fading within 2 to 3 px. It darkens whatever ground is there, so it never looks like a pad.
3. **Colour and texture continuity at the contact line.** The object's lowest band shares the ground's hue and value, the bottom outline is dropped or tinted to the ground's dark, and a few pixels of the ground pattern continue onto the object.
4. **Material displacement.** Soft materials rise against the object: a crest on the lit side, a trough on the shadow side; wet materials darken; loose materials scatter.

Everything else (roots, debris, wet edges, waterlines, ripple rings) is a variation of those four. The runtime recommendation (section 4) keeps sprites biome-agnostic and draws the grounding as two small decal layers per object, one under the sprite (multiply rim, lip, wet band) and one over its lowest rows (occluders), both sorted with the object. The Python sketch (section 5) generates both decals from the sprite's alpha mask and a per-biome material table.

## 1. What the professionals do

| Game or artist | Projection | What grounds their objects | Evidence |
|---|---|---|---|
| Ultima VII | Oblique (cabinet) with a top-down ground plane, light from the north-west, 1 px black outline on everything | Objects sit on dense, busy ground texture; shading is baked on the south-east faces; the heavy outline is the contact line. Little or no occlusion by the ground. The DEUS look borrows U7's density and palette, not its projection or its black outlines | [The Digital Antiquarian on Ultima VII](https://www.filfre.net/2019/02/ultima-vii/), [Reverse engineering Ultima VII isometrics (OGA thread)](https://opengameart.org/forumtopic/reverse-engineering-ultima-vii-isometrics-wip), [Unity thread on the U7 projection](https://forum.unity.com/threads/ultima-vii-perspective-breakdown-3d.371293/) |
| Stardew Valley | 3/4 top-down | A flat drop shadow in black at about 40 % opacity, offset about 1 px left and 2 px down, solid (not dithered); outlines are the darkest colour of each object (excerpt). Grass and debris tiles overlap object bases | [Stardew modding wiki: how to make pixel art](https://stardewmodding.wiki.gg/wiki/How_to_make_pixel_art), [Stardew art style guide (scan)](https://www.scribd.com/document/694721155/SundropArtGuide) |
| Slynyrd (Raymond Schlitter) | 3/4 top-down tiles | Drop shadows "must be conservative", limited to one or two faces, all the same length regardless of object height; a tree's shadow size and direction come from the light source, offset to one side for a dynamic look (excerpt). Objects are built on the 16 px tile grid so bases align with ground tiles | [Pixelblog 21: Top Down Objects](https://www.slynyrd.com/blog/2019/9/18/pixelblog-21-top-down-objects), [Pixelblog 43: Top Down Tiles Part 2](https://www.slynyrd.com/blog/2023/3/26/pixelblog-43-top-down-tiles-part-2), [Pixelblog catalogue](https://www.slynyrd.com/pixelblog-catalogue) |
| Pedro Medeiros (Saint11) | Mixed | Compact 512x512 tutorials on shading, grass, water and top-down houses; shadow under eaves and in recesses is drawn as part of the shading pass, not added after | [saint11.art](https://saint11.art/), [Shading by Pedro Medeiros (Lospec)](https://lospec.com/pixel-art-tutorials/shading-by-pedro-medeiros), [tutorial collection (are.na)](https://www.are.na/pedro-medeiros-de-almeida/pixel-art-tutorials) |
| Cyangmou (Thomas Feichtmeir) | All | The projection charts that settle which shadow shapes are legal in which view; a strict top-down view has no visible vertical faces, so grounding must come from the ground plane itself | [Isometric games don't exist (40 charts, free)](https://cyangmou.itch.io/isometric-games-dont-exist), [Basic tiling (Lospec)](https://lospec.com/pixel-art-tutorials/basic-tiling-by-cyangmou), [Cyangmou on Lospec](https://lospec.com/pixel-art-tutorials/author/cyangmou) |
| Graveyard Keeper | 3/4 | Up to four shadow sprites per object rotating around a point (sun plus three dynamic lights), normal maps for volume, LUT colour grading by time of day: grounding is done by the renderer, not baked | [Graveyard Keeper: how the graphics effects are made (Game Developer)](https://www.gamedeveloper.com/programming/graveyard-keeper-how-the-graphics-effects-are-made), [Steam post](https://steamcommunity.com/games/599140/announcements/detail/1699439264779784595) |
| Eastward | 3/4 | A hand-painted bump map per asset so real lights shade flat sprites; fog layers; the contact darkening comes from the lighting pass | [Eastward's creators on making pixel art adventures (Game Developer)](https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures), [80.lv interview](https://80.lv/articles/eastward-charming-chinese-pixel-art-adventure) |
| CrossCode | 3/4 with real height | Every entity has a z; maps declare discrete levels (32 px a step); the editor draws wall faces under platform edges; objects are grounded by the level system, with their base rows part of the tile layers | [CrossCode update 56 (height map editor)](https://www.radicalfishgames.com/?p=2475), [PixelSmiths interview with Felix Klein](https://www.podcampmedia.com/post/pixelsmiths-ep-7-crosscode-with-radical-fish-games-co-founder-felix-klein) |
| Hyper Light Drifter | 3/4 | Large flat colour fields with small etched details; objects are grounded by sharing the field's colour at the base and by very dark contact lines; the "pixel impressionism" lets the eye fill the contact | [Game Developer on HLD's style](https://www.gamedeveloper.com/business/the-ultra-modern-stylings-of-hyper-light-drifter), [HLD's pixel impressionism](https://hookshotchargebeamrevive.com/2018/09/10/hyper-light-drifters-pixel-impressionism/). No GDC environment talk was found this session |
| Lospec community | All | Ambient-light and grass tutorials; the ambient-lighting sphere tutorial is the clearest statement that the darkening where an object meets a surface is occlusion, not a cast shadow | [Lospec tutorials](https://lospec.com/pixel-art-tutorials), [Ambient lighting: sphere (st0ven)](https://lospec.com/pixel-art-tutorials/ambient-lighting-sphere-by-st0ven), [grass tutorials tag](https://lospec.com/pixel-art-tutorials/tags/grass) |
| Pixel Joint forum | All | Thread on shadowing sprites: top light with the shadow directly beneath can be baked into the sprite without composition conflicts; otherwise keep the shadow separate | [How to shadow your sprites?](https://pixeljoint.com/forum/forum_posts.asp?TID=26274) |
| RimWorld, Dwarf Fortress (Steam tilesets), Chained Echoes, Sea of Stars, Kenshi | Various | Not verified by a source this session. From play: RimWorld draws a soft blurred shadow blob under each thing (its defs carry a shadow volume and offset) and blends terrain edges; DF's Steam tilesets leave the ground visible through the base of trees and boulders; Chained Echoes and Sea of Stars use flat ellipse shadows under 3/4-view sprites; Kenshi is a 3D game and grounds objects with terrain decals, so it is not a pixel-art reference | none; treat as observations |

Two general points fall out of the table. First, every 3/4-view game above leans on a cast or drop shadow because the tilted camera shows the ground beside and below the object; DEUS cannot, so it must lean harder on occlusion and continuity. Second, the games that look most "embedded" (Graveyard Keeper, Eastward) do it at runtime with lighting that darkens the ground around the base; the equivalent for a palette-locked pixel game is a multiply rim decal, which is what section 4 recommends.

## 2. Ranked techniques, with before and after

Ranked by how much of the floating look each one removes on its own in a strict top-down view. "Before" and "after" describe a 20 px boulder on temperate grass unless stated.

1. **Ground occlusion of the base (partial burial).** Before: the boulder's lower outline is a closed dark line and every pixel inside it belongs to the rock. After: three to five grass blades (1x2 or 1x3 px, grass mid and light tones) cross the lower third of the outline from outside to inside; one row of soil crumbs replaces the bottom 1 px of the rock along 50 to 70 % of its width; the outline is open where a blade crosses it. The rock is now behind the ground at its base. This single change does more than all the shadow work combined.
2. **Contact-occlusion rim (ambient occlusion on the ground).** Before: the grass next to the rock is the same value as grass a tile away. After: a 1 to 2 px band of the ground's ramp one step darker hugs the footprint, 2 px wide on the side away from the light (south-east for a north-west light), 1 px on the lit side, and 3 px deep in the notch where two lobes of the rock meet; outside that band, nothing. The hue follows the ground's shadow ramp (cooler for grass and snow, warmer for red soil), never a neutral grey. At runtime this is a multiply sprite at 25 to 35 % (section 4) so it works on every ground.
3. **Drop the bottom outline, keep the top one.** Before: a uniform dark outline all round. After: the outline on the near (lower) third of the silhouette is replaced by the ground's own darkest ramp value, or removed where an occluder crosses; the upper two thirds keep the object's outline because that edge faces the viewer against sky-lit ground. Pure black is never used; the darkest grass or soil value is.
4. **Base colour and texture continuation.** Before: the rock's bottom band is the rock's own shadow colour. After: the bottom 2 to 3 rows of the rock take a hue halfway to the ground (grass stain, soil dust, snow powder), and 2 to 4 pixels of the ground pattern (a blade tip, a crumb, a pebble speck) continue onto the rock's lower edge. On sand and ash the band is the ground's light colour (dusting); on soil and mud it is the ground's dark colour (staining).
5. **Lip, drift and trough (material displacement).** Before: the ground is flat up to the contact line. After, on soft ground: a 1 px crest one step lighter than the ground on the lit side of the footprint (snow, sand, ash) and a 1 px trough one step darker on the shadow side; the crest is broken (never a continuous ring) and 2 to 6 px long segments. On mud the ring is darker and wetter on both sides. On gravel the "crest" is two or three pebbles lifted against the base.
6. **Irregular footprint.** Before: a flat bottom edge or a perfect ellipse where the object meets the ground (a cut-out). After: the contact line has 1 px notches and bumps every 3 to 6 px; for logs and bones one end sinks 1 to 2 px deeper than the other; for stumps the bark line undulates. In a strict top-down view the visible footprint is just the silhouette, so this is silhouette work.
7. **Roots and anchors dipping in and out.** For trees, stumps and large bushes: two to four root segments leaving the trunk at different angles, each 3 to 8 px long and 2 px wide, with a 1 px gap of ground colour where the root goes under, and a lighter top pixel where it comes back up; roots fade in value as they get further from the trunk. Never a radial star of equal roots.
8. **Debris and local clutter.** Three to six specks within 4 px of the footprint: the object's own debris (fallen leaves and needles under a tree, bark flakes by a stump, chips by a rock) in the object's palette plus one or two ground specks. Specks cluster on the shadow side.
9. **A short directional cast shadow, not a drop shadow.** Only for tall objects, and only as a 1 to 2 px crescent on the far side from the light, with the same length for every object (the consistency rule Slynyrd gives). The crown of a tree covers its own base from above, so the visible shadow is the trunk's: a 2 to 4 px crescent at the base, nothing else.
10. **Wet edge, waterline and ripple ring.** At shorelines and in shallow water: a 1 to 2 px band of the object's own colour two steps darker just above the waterline (wet material), a 1 px light waterline pixel row (reflection) on the lit side, the submerged part drawn in the water ramp with the object's shape only hinted (section 3), and a ripple ring of 3 to 5 arcs 1 px wide, 1 to 2 px out, one step lighter than the water.

A sprite that uses techniques 1 to 4 reads as grounded at 1x and 2x. Techniques 5 to 10 are what make each material look like itself.

## 3. Per-material recipes at 48 px tiles

Units are source pixels; at 2x zoom each becomes a 2x2 block, so the recipes assume integer-scaled nearest-neighbour rendering and no sub-pixel blur. "Step" means one step of the ground's palette ramp in the DEUS lattice, not a fixed RGB delta; when a ramp has only three values, "two steps" means its darkest. Hue shifts are directions, to be realised with existing lattice colours. The light is north-west (the U7 convention), so the shadow side is south-east.

| Material | Occlusion of the base | Contact rim | Crest and trough | Base band on the object | Specks | Notes |
|---|---|---|---|---|---|---|
| Soil, dirt | 1 px crumb row along 50 to 70 % of the lower edge, soil mid tone | 2 px shadow side, 1 px lit side, -1 step, inner 1 px -2 in concavities; hue toward the soil's dark (warm) | none on dry soil; 1 px -1 trough on the shadow side only | bottom 2 rows: soil dark at 50 % mix (staining) | 4 to 6 soil-dark and 1 to 2 pebble-light within 4 px | the outline on the lower third becomes the soil's darkest value |
| Grass, meadow | 3 to 5 blades 1x2 to 1x3 px crossing the lower third of the outline, grass mid and light; blades lean away from the object | 1 to 2 px, -1 step, hue toward the grass shadow (cooler, bluer); no brown | none | bottom 1 to 2 rows: grass mid at 30 % (green stain) on rocks and logs; none on bark | 2 to 3 blade tips and 1 flower or seed head on the lit side | the rim is darker grass, never bare soil, unless the object is heavy (boulder: a 1 px soil crumb row as well) |
| Sand, desert | 1 to 2 px sand covering the lower edge, sand light tone (sand climbs the object) | 1 px only, -1 step (sand bounces light so occlusion is faint); hue toward the sand's shadow (slightly cooler or more saturated, never grey) | crest 1 px +1 step on the north-west side in 2 to 5 px segments; trough 1 px -1 step on the south-east; sand ripple lines bend around the object by 1 px | bottom 2 rows: sand light at 40 % (dusting) | few: 1 to 2 darker grains | wind-blown drift on the lee side can extend 3 to 4 px as a tapering +1 step wedge |
| Snow | 3 to 4 px of the base buried: snow light covers the lower edge with a ragged top (notches every 2 to 4 px) | -1 step snow-shadow blue, 1 to 2 px; -2 step only in deep concavities | crest 1 px +1 step (near white) on the lit side; trough 1 px -1 step blue on the shadow side; both broken | bottom 2 to 3 rows: snow light at 50 % (powder); dark objects (rock, trunk) get a 1 px melt ring of exposed ground dark or wet-snow -2 step directly against the base | 2 to 3 snow-light specks on the object's upper surfaces too (settled snow) | the bottom outline disappears entirely under the lip; snow is the material that buries most |
| Mud, bog | 3 to 4 px sunk: the object's lower edge is replaced by mud mid tone with a flat-ish top (mud levels out) | 2 to 3 px wet rim, -2 steps, hue toward the mud's dark (cool brown or olive); plus 2 to 3 single sheen pixels (+2 step, the water highlight colour) on the rim's lit side | a 1 px -1 step ridge around the base (displaced mud is wetter, so darker, not lighter) | bottom 3 rows: mud dark at 60 % (soaked) | reed or sedge blades (2 to 3, 1x3 px) crossing the base; 1 to 2 bubbles (1 px, +1 step) in the rim | a log in bog sits deeper at one end by 2 px |
| Ash, cinder (volcanic) | 1 to 2 px ash light covering the lower edge, very soft (ash is a powder) | 1 px, -1 step, hue toward the ash's dark warm grey; concavities -2 | crest 1 px +1 step on the lit side only, very short segments (1 to 2 px) | bottom 1 to 2 rows: ash light at 40 % (dusting); plus a 1 px ash-light band on the object's top surfaces (settled ash) | 3 to 5 ash-dark specks; optional 1 ember pixel (the lattice's warm accent) within 6 px on the shadow side | drag lines and footprints in ash are 1 px -1 step strokes 4 to 8 px long |
| Gravel, scree (highland) | no soft occlusion; 2 to 3 pebbles (2x2 or 3x2 px, pebble light tone) overlap the lower edge instead | shadow pockets: -2 step specks in the gaps between pebbles touching the base, not a continuous band | pebbles lifted against the lit side read as the crest (+1 step on their top pixel) | bottom 1 row: gravel dark at 40 % | the pebbles themselves | the object sits among stones; keep the outline where a pebble does not cross it |
| Wet sand, shoreline | 1 px wet sand (-1 step) over the lower edge | 2 px, -2 steps (wet sand is dark); hue toward the wet-sand ramp | 1 px sheen pixel row (+2 step) on the lit edge of the rim | bottom 2 rows: wet-sand dark at 50 % | 1 to 2 shell or pebble specks | the wet band around objects is wider on the water side (3 px) than the land side (1 px) |
| Shallow water | the submerged part is drawn in the water ramp: object shape at 30 to 40 % (one or two of the object's mid colours mixed into the water mid), with the outline removed; refraction: shift the submerged rows 1 px sideways relative to the part above water | not a rim but a 1 px water-dark band directly against the object below the waterline | waterline: 1 px row of water light (+1 step) on the lit side of the object at the surface; ripple ring: 3 to 5 arcs, 1 px wide, 1 to 2 px out, +1 step | wet band above the waterline: 1 to 2 px of the object's colour at -2 steps | 1 to 2 water-light sparkle pixels within 3 px | animated water keeps the ring static (the ring is the object's, not the water's) unless the sheet has ripple frames; no engine motion (AGENTS.md rule 12) |

Pixel counts for the common object classes:

- **Boulder 24 to 40 px:** rim 2 px (shadow side), occlusion 1 px crumbs plus 3 blades, base band 3 rows, 5 specks, 2 to 3 outline breaks.
- **Rock 8 to 16 px:** rim 1 px, occlusion 2 blades or 1 crumb row of 4 to 6 px, base band 1 row, 2 specks. Below 8 px do only the rim and one occluder; more reads as noise.
- **Tree (trunk 6 to 10 px at the base):** occlusion 2 px of ground over the trunk base plus 2 to 4 roots, rim 2 px with 3 px in root notches, trunk shadow crescent 2 to 4 px on the south-east, leaf litter 4 to 6 specks on the shadow side within one tile. The crown hides most of this at 1x; it is what sells the tree at 2x and when the crown is cut away or seen through.
- **Stump 10 to 18 px:** occlusion 1 to 2 px, 3 roots, rim 2 px, bark chips 3 to 4, moss or grass stain 1 row on the north side.
- **Log, bones:** one end sunk 1 to 2 px more (2 to 3 px of ground over that end), rim 1 to 2 px along the shadow-side length, grass blades crossing at two points, base band 1 row along the whole length.
- **Bush, grass tuft, flowers:** little rim (1 px, -1 step) since they are mostly leaves; grounding comes from 2 to 4 blades or stems drawn in the ground's grass colours leaving the base outward, and from a few petals or leaves on the ground.
- **Clutter and critters:** a 1 px rim on the shadow side and one occluder; a critter in motion gets no occluder (it is on the ground, not in it) and a 1 px rim only.

At 2x every one of these pixels is a visible 2x2 block, which is why the rim must be quantised to one or two steps and never gradiented: a smooth shadow becomes a staircase of mismatched blocks at 2x, while two hard steps stay crisp.

## 4. Runtime approach for PixiJS and RPG Maker MZ

Recommendation: keep every object sprite biome-agnostic and draw the grounding at runtime as two small decals per object, generated by the Python pipeline (section 5) into one atlas per biome.

- **Under-decal** (drawn above the ground tiles, below the object): the contact rim as a MULTIPLY sprite, plus the lip, trough, wet band, melt ring, cast-shadow crescent and ripple ring as a NORMAL sprite in the biome's palette colours. The multiply rim darkens whatever ground is really there, so it needs no per-ground variant and never shows a seam or a pad.
- **Over-decal** (drawn above the object's lowest rows, below characters): the occluders, which are ground pixels (blades, crumbs, lip top, pebbles, reeds) and the base-band stain, in the biome's palette.
- **Sorting:** attach both decals as children of the object's own sprite so they sort with it. RMMZ's `Tilemap` orders its children by z, then y, then sprite id, so a child container keeps its position in that order automatically. The over-decal must not be a separate y-sorted sprite, or a character standing just south of the rock will slip between the rock and its grass.
- **Blend modes:** `sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY` works on sprites in the WebGL renderer MZ ships (PixiJS 5.3). The renderer natively supports NORMAL, ADD, MULTIPLY and SCREEN; the advanced modes need the filters package and are not required here. Reference: [PixiJS blend modes example](https://pixijs.com/examples/basic/blend-modes), [BLEND_MODES constants](https://api.pixijs.io/@pixi/constants/PIXI/BLEND_MODES.html).
- **Pixel integrity:** every decal texture uses `scaleMode = PIXI.SCALE_MODES.NEAREST`, integer positions, and an atlas with 1 px padding between frames so bilinear bleed and seams cannot appear at 2x. Semi-transparent colour patches are forbidden except the multiply rim at a fixed alpha (0.25 to 0.35), because a translucent patch of a palette colour is exactly the sticker look.
- **Per-biome variants without per-sprite art:** decals are keyed by footprint class (a small set of silhouette shapes: round S/M/L, oblong, column, cluster) and biome, not by sprite. A new sprite gets a footprint class from its alpha mask at import time; the pipeline makes the decals from the real mask when the class fit is poor (concave silhouettes, roots).
- **Ground sampling at placement time:** when the object is placed, read the ground tile kind under it from the catalogue (the DEUS_Tiles ground kinds) and pick the biome decal set; a rock on a snow patch in a temperate biome gets snow grounding. Re-read on a ground change event (the existing object and tile systems already know when a tile kind changes).
- **The shader option, and why it is second:** a custom shader that samples the ground under the object (render the ground layer to a `RenderTexture` once per scroll, bind it as a second sampler, blend the sprite's bottom N rows toward it through a stepped mask) gives true texture continuation for free. In PixiJS 5 that means a custom `Shader` on a `Mesh` batch or a custom batch renderer plugin, not a per-sprite `Filter`: a filter is a framebuffer pass per object and thousands of objects would mean thousands of passes. Build the decal system first; add the shader only if the base-band stain still looks separate at 2x. Pixi's filter package is MIT ([pixijs/filters](https://github.com/pixijs/filters)).
- **Performance at thousands of objects:** decals are plain sprites in the same atlas, so they batch. A blend-mode change splits a batch, so put every multiply rim in one container drawn after the ground and before the objects (one batch), and every normal decal with the objects (same atlas as the objects if possible, otherwise one more batch). Only objects inside the culled viewport (DEUS_Culling) get decal sprites; off-screen objects keep a 3-byte record (footprint class, biome, flags). Memory: a 2048x2048 atlas holds about 1,600 48x48 frames, which is more than enough for all footprint classes across all biomes.
- **What not to do:** no per-object filters, no runtime colour sampling of the ground texture on the CPU, no procedural shadow drawing (the engine draws no motion and should draw no art of its own; AGENTS.md rules 11 to 13 and the grounding decals are generated art, not engine-synthesised pixels).

Pseudocode (plugin-side, PixiJS 5 / MZ naming, original):

```js
// GroundingLayer: owns the decal atlas and attaches decals to object sprites.
// atlas frames are named `${biome}/${footprintClass}/${part}` with parts: rim (multiply), under, over
class GroundingLayer {
    constructor(spritesetMap, atlasTexture, catalog) {
        this.atlas = atlasTexture;                 // scaleMode NEAREST, 1 px padded frames
        this.frames = catalog.groundingFrames;     // { "temperate/round_m/rim": {x,y,w,h,ox,oy}, ... }
        this.rimLayer = new PIXI.Container();      // all multiply rims: one batch
        this.rimLayer.zIndex = Z_GROUND_DECALS;    // above autotiles, below objects
        spritesetMap._tilemap.addChild(this.rimLayer);
    }
    attach(objectSprite, obj) {
        const key = `${obj.biomeGround}/${obj.footprintClass}`;
        const rim = this._sprite(`${key}/rim`);  rim.blendMode = PIXI.BLEND_MODES.MULTIPLY; rim.alpha = 0.3;
        const under = this._sprite(`${key}/under`);
        const over = this._sprite(`${key}/over`);
        rim.position.set(obj.screenX + rimFrame.ox, obj.screenY + rimFrame.oy);   // integer pixels
        this.rimLayer.addChild(rim);                                               // sorted below every object
        objectSprite.addChildAt(under, 0);                                         // behind the object's own texture
        objectSprite.addChild(over);                                               // in front of its lowest rows
        obj._grounding = { rim, under, over, key };
    }
    detach(obj) { /* remove the three sprites; called by culling and by object removal */ }
    onGroundChanged(obj) { this.detach(obj); this.attach(obj.sprite, obj); }   // tile kind under the object changed
    _sprite(name) { const f = this.frames[name]; const t = new PIXI.Texture(this.atlas, new PIXI.Rectangle(f.x, f.y, f.w, f.h)); const s = new PIXI.Sprite(t); s.anchor.set(0, 0); return s; }
}
```

The `under` child at index 0 draws behind the object's own texture but inside its sort slot, so the lip, trough and wet band sit between the ground and the object. The rim is in its own multiply batch. The `over` child draws the occluders over the object's base. Nothing here moves, scales or recolours anything per frame.

## 5. Pipeline automation (Python, Pillow, NumPy, SciPy)

Goal: from one biome-agnostic sprite, generate the three decal frames per biome, plus a QA flag for sticker-prone sprites. Licences: Pillow (HPND, permissive), NumPy (BSD-3), SciPy (BSD-3). The sketch is original.

The geometry comes from the alpha mask. In a strict top-down view the footprint is the whole silhouette, so the contact zone is the silhouette's boundary band, biased toward the lower (near) side and toward concavities.

```python
"""grounding.py: decal generation for a top-down sprite (Python 3.11, Pillow, numpy, scipy)."""
import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi

LIGHT = (-1, -1)   # north-west light: shadow side is (+1, +1)

def alpha_mask(png):                      # bool HxW, True where the sprite has pixels
    return np.asarray(Image.open(png).convert("RGBA"))[:, :, 3] > 0

def footprint_class(mask):                # a coarse silhouette class for atlas sharing
    ys, xs = np.nonzero(mask); h, w = ys.ptp() + 1, xs.ptp() + 1
    solidity = mask.sum() / (h * w)
    if w > 1.6 * h: return "oblong"
    if solidity < 0.55: return "cluster"      # concave: bushes, root crowns
    return "round_" + ("s" if max(h, w) <= 16 else "m" if max(h, w) <= 32 else "l")

def contact_rim(mask, steps=(2, 1)):
    """Ground pixels around the footprint, quantised to ramp steps: 2 = darkest (inner, shadow side,
    concavities), 1 = outer. Returns an int8 HxW with 0 outside the rim."""
    outside = ~mask
    dist = ndi.distance_transform_edt(outside)                       # distance to the sprite
    shifted = np.roll(np.roll(mask, 1, 0), 1, 1)                     # the shadow-side bias: 1 px south-east
    concavity = ndi.uniform_filter(mask.astype(float), 5)            # share of sprite in a 5x5 window
    rim = np.zeros(mask.shape, np.int8)
    rim[(dist > 0) & (dist <= 1.5)] = 1
    rim[(dist > 0) & (dist <= 1.5) & (shifted | (concavity > 0.45))] = 2   # inner step where biased
    rim[(dist > 1.5) & (dist <= 2.5) & (shifted | (concavity > 0.45))] = 1 # outer step only on the shadow side
    rim[mask] = 0
    return rim

def crest_and_trough(mask):
    """Lit-side crest (+1) and shadow-side trough (-1), 1 px, broken into segments by noise."""
    lit = np.roll(np.roll(mask, LIGHT[1], 0), LIGHT[0], 1) & ~mask          # ground pixels touching the lit edge
    shade = np.roll(np.roll(mask, 1, 0), 1, 1) & ~mask
    rng = np.random.default_rng(7)                                         # a fixed seed: deterministic art
    keep = rng.random(mask.shape) < 0.6                                    # breaks the ring into segments
    out = np.zeros(mask.shape, np.int8); out[lit & keep] = 1; out[shade & keep] = -1
    return out

def occluders(mask, depth=2, cover=0.6, seed=11):
    """Ground pixels that cover the lower part of the silhouette's boundary band: a ragged burial line.
    depth = rows of the base covered, cover = share of the band kept (0.6 = 60 %)."""
    inner = mask & ~ndi.binary_erosion(mask, iterations=depth)             # the boundary band, `depth` px wide
    ys = np.nonzero(mask.any(1))[0]
    mid = (ys.min() + ys.max()) // 2                                       # the silhouette's middle row
    rows = np.arange(mask.shape[0])[:, None]
    lower = inner & (rows >= mid)                                          # the near (lower) half of the band only
    rng = np.random.default_rng(seed)
    noise = ndi.uniform_filter(rng.random(mask.shape), 3)                  # coarse noise: 2 to 4 px runs, not salt
    return lower & (noise < cover)

def base_band(mask, rows=2):
    """The object's own lowest rows per column: where the ground colour stains or dusts it."""
    band = np.zeros_like(mask)
    for x in range(mask.shape[1]):
        ys = np.nonzero(mask[:, x])[0]
        if ys.size: band[ys.max() - rows + 1: ys.max() + 1, x] = True
    return band & mask

def paint(rim, crest, occ, band, material, palette):
    """Writes three RGBA frames. material = the per-biome row of grounding_materials.json; palette maps
    ramp names to lattice RGB. Rim is written as a grey level for the MULTIPLY sprite; under and over are
    palette colours (no alpha blending at all)."""
    h, w = rim.shape
    rim_png = np.zeros((h, w, 4), np.uint8)
    rim_png[rim == 1] = (*material["rim_grey_step1"], 255)                 # e.g. (178,178,178): -1 step at alpha 0.3
    rim_png[rim == 2] = (*material["rim_grey_step2"], 255)
    under = np.zeros((h, w, 4), np.uint8)
    under[crest == 1] = (*palette[material["crest"]], 255)
    under[crest == -1] = (*palette[material["trough"]], 255)
    over = np.zeros((h, w, 4), np.uint8)
    over[occ] = (*palette[material["occluder"]], 255)                      # grass mid, snow light, sand light...
    over[band & ~occ] = (*palette[material["base_stain"]], 255)            # the stain row(s); the atlas stores it
    return Image.fromarray(rim_png), Image.fromarray(under), Image.fromarray(over)

def sticker_score(png, outline_rgb):
    """QA: share of the lowest-row silhouette pixels that are the object's own outline colour.
    Above 0.5 the sprite will float on every ground: send it back or rely on the occluders."""
    img = np.asarray(Image.open(png).convert("RGBA")); mask = img[:, :, 3] > 0
    band = base_band(mask, 1)
    return float(np.mean(np.all(img[band][:, :3] == outline_rgb, axis=1))) if band.any() else 0.0

if __name__ == "__main__":
    materials = json.load(open("grounding_materials.json"))              # one row per biome ground kind
    palette = json.load(open("palette_lattice.json"))                    # ramp name -> [r, g, b]
    m = alpha_mask("rock_m.png")
    for biome, mat in materials.items():
        rim, under, over = paint(contact_rim(m), crest_and_trough(m), occluders(m, mat["bury_rows"], mat["cover"]), base_band(m, mat["stain_rows"]), mat, palette)
        rim.save(f"out/{biome}/rock_m_rim.png"); under.save(f"out/{biome}/rock_m_under.png"); over.save(f"out/{biome}/rock_m_over.png")
```

Notes on the sketch:
- `grounding_materials.json` is the table in section 3 as data: `bury_rows` (soil 1, grass 2, sand 2, snow 4, mud 4, ash 2, gravel 0 with `pebbles: true`, water 0 with `waterline: true`), `cover`, `stain_rows`, `crest`, `trough`, `occluder`, `base_stain`, `rim_grey_step1/2`. One sprite in, three frames per biome out, nothing baked into the sprite.
- The rim greys are chosen so that MULTIPLY at alpha 0.3 lands on the ground's own next ramp step for the mid-value grounds; verify once per biome by compositing a test tile and snapping the result to the lattice (the existing palette tools can report the nearest lattice colour and its distance).
- Pillow alone can do the morphology with `ImageFilter.MinFilter` (erosion) and `MaxFilter` (dilation) on the alpha channel if SciPy is unwanted; the distance transform and the concavity filter are the two places SciPy earns its import. References: [Pillow ImageFilter](https://pillow.readthedocs.io/en/stable/reference/ImageFilter.html), [SciPy ndimage](https://docs.scipy.org/doc/scipy/reference/ndimage.html).
- Water and gravel need their own painters (waterline row, ripple arcs, pebble sprites from a small library) rather than the generic occluder; both are a few lines on the same masks.
- Every output is palette-only and deterministic (fixed seeds), so the art QA can diff regenerated decals, and a changed material table regenerates a whole biome's grounding in seconds.

## 6. Mistakes that cause the floating look

1. **Uniform drop shadows in a top-down view.** An offset shadow implies a tilted camera; with a strict overhead camera the shadow belongs under the object. Keep at most a 1 to 2 px crescent on the shadow side.
2. **Oval or ellipse shadows.** They are the 3/4-view convention (Chained Echoes, Stardew, Sea of Stars) and read as a disc the object stands on. In top-down the only "ellipse" is the silhouette.
3. **A closed outline along the bottom edge.** The contact line is where the object must open up. Drop it, tint it to the ground's dark, or break it with occluders.
4. **A flat bottom silhouette.** A straight contact line is a cut-out. Notch it.
5. **Dirt rings and pads.** A baked ring of bare soil under every object is the Stardew-era shortcut and the thing the DEUS direction forbids; it also fails on sand, snow and water. Use the multiply rim plus material-specific displacement instead.
6. **Palette mismatch between object and ground.** An object whose shadow ramp is a different hue family from the ground's never sits in it. The base band and the rim must use the ground's ramp.
7. **Gradient or feathered shadows.** At 2x a smooth gradient becomes mismatched blocks. Quantise to one or two steps.
8. **Semi-transparent colour patches.** A 50 % green blob is a sticker. Occluders are opaque palette pixels; only the multiply rim is translucent.
9. **The same grounding on every material.** Snow buries, mud swallows, sand climbs, gravel surrounds, grass crosses, water cuts. One recipe per material or it reads wrong.
10. **Grounding drawn as a separate y-sorted sprite.** Characters and critters slip between the object and its grass. Attach the decals to the object's sprite.
11. **Occluders that ignore the light.** Crests on the shadow side and troughs on the lit side flip the light and the object pops off the ground.
12. **Roots as a radial star, specks as a uniform scatter.** Nature is asymmetric; cluster toward the shadow side and vary lengths.
13. **Forgetting the top at 2x.** Settled snow, ash and leaf litter also land on the object's upper surfaces; an object dusted on the ground but clean on top floats at 2x.

## 7. Licensing of everything cited

| Item | Licence | Use in DEUS |
|---|---|---|
| PixiJS (MZ's renderer) and [pixijs/filters](https://github.com/pixijs/filters) | MIT | any; blend modes are in the core |
| Pillow | HPND (permissive) | pipeline |
| NumPy, SciPy | BSD-3 | pipeline |
| Slynyrd Pixelblog, Saint11 tutorials, Lospec tutorials, Cyangmou's charts, Pixel Joint threads, Stardew art guide, Game Developer and 80.lv articles | copyrighted text and images, free to read | study only; no image or pixel copied; recipes here are original |
| [OpenGameArt: Chapter 4 shadow and light](https://opengameart.org/content/chapter-4-shadow-and-light) | check the page's own licence tag before reusing any image (OGA entries range from CC0 to CC-BY-SA) | reference only |
| [Pixel-art shadow generator (sprite-ai.art)](https://www.sprite-ai.art/tools/shadow-generator) | unknown; a web tool | reference only; the Python sketch above replaces it |
| Lospec palettes | no licence stated by the site; palettes themselves are not DEUS's (the lattice is) | none |

No GPL or AGPL code is cited or needed. No NC or SA asset is used.

## 8. Recommended order of work

1. Add `sticker_score` to the art QA and run it over the current object sheets to get the list of worst offenders (closed bottom outlines).
2. Write `grounding_materials.json` from section 3 for the temperate and snow grounds first (the two extremes: crossing grass versus burial).
3. Generate decals for five footprint classes, composite them on the real ground tiles at 1x and 2x, and grade in game (DEC-079).
4. Build the decal layer in the plugin with the three-sprite attachment and the single multiply batch; measure the batch count with a few thousand objects on screen.
5. Only then decide whether the shader route is needed for texture continuation.
6. Record the chosen recipes per material in `DEUS_ENVIRONMENT_MATERIAL_STANDARD.md` and the asset spec in `DEUS_ASSET_STANDARD.md`, so PixelLab prompts stop asking for pads and start asking for open bottom edges.
