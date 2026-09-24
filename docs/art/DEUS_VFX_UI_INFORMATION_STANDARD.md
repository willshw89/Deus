# DEUS — VFX, UI & Information Presentation Standard
**Document ID:** `DEUS-ART-VFX-UI-01`  
**Status:** Authoritative VFX, UI & Information Layer Standard  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Companion Documents:**
- [`docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md)
- [`docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md)
- [`docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md)
- [`docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md)

---

## 1. Executive Summary & Purpose

A deep simulation like Project DEUS requires absolute visual clarity. The player must effortlessly differentiate:
1. **The Physical World** (terrain, flora, buildings, items, units).
2. **Transient Physical Effects (VFX)** (fire, smoke, blood spray, spell bursts).
3. **The Information Layer** (selection rings, path previews, project ghosts, stockpile boundaries).
4. **The User Interface (UI)** (faction-themed system menus, inventory icons, status indicators).

This specification establishes the aesthetic, technical, and rendering standards for all visual effects, iconography, tactical overlays, faction UI theming, and accessibility rules across Project DEUS.

---

## 2. Visual Effects (VFX) Bible

$$\textbf{RULE: VFX must never obscure tactical combat readability or colonist task status.}$$

Unlike physical world assets, which strictly adhere to hard-edged pixel rendering and `uf.hex` palette quantization, **VFX assets are granted permissive alpha transparency and additive blend modes** to authentically convey energy, fire, light, and vapor while remaining anchored to late-16-bit retro styling.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DEUS VFX CORE CATALOG                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Fire & Heat:        3-4 frame looping sprite flames ($16\times 32$  │
│                        to $32\times 48\text{ px}$), embers, heat haze. │
│ 2. Blood & Wounds:     Directional arterial spray, impact splatter,    │
│                        blood pool ground decal deposit.                │
│ 3. Impact & Friction:  Weapon parry sparks, stone chisel dust puffs,   │
│                        axe woodchips, bludgeoning blunt shockwaves.    │
│ 4. Water Dynamics:     Step ripples ($8\times 8\text{ px}$), splashing │
│                        droplets, swimming foam, waterfall mist.        │
│ 5. Magic: Divine:      Warm golden/amber coronas, soft descending      │
│                        radiant motes, sacred parchment halos.          │
│ 6. Magic: Arcane:      Cold cyan/violet lightning arcs, sharp energy   │
│                        fractures, teleportation planar wisps.          │
│ 7. Magic: Necrotic:    Sickly pale green/charcoal smoke, soul wisps.   │
│ 8. Magic: Primal:      Emerald leaf vortices, briar thorns, dust burst.│
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Animation Rule for VFX
Per **AGENTS.md Rule 12**, all VFX motion must originate from **distinct pixel sprite animation frames**, never code-driven affine transformations, procedural rotation, or elastic scaling. A burst of sparks is an authentic 4-frame sprite sequence, not a code-rotated texture.

---

## 3. UI & Icon Language Standard

The user interface in DEUS bridges rich tabletop CRPG depth (Baldur's Gate 1 / Icewind Dale character records) with tactical RTS management (Dwarf Fortress colony control).

### 3.1 Icon Dimensions & Categories
- **Inventory & Item Icons:** Standard $32 \times 32\text{ px}$ (or $24 \times 24\text{ px}$ compact). Rendered with subtle top-left key lighting, dark 1px silhouette outline, and authentic material texturing (wood grain, beaten iron, coarse wool).
- **Status Condition Icons:** Compact $16 \times 16\text{ px}$ or $20 \times 20\text{ px}$ icons displayed adjacent to character nameplates and in unit inspection sheets:
  - *Bleeding*: Crimson blood drop with jagged slash.
  - *Starvation*: Broken wooden bowl.
  - *Dehydration*: Cracked empty waterskin.
  - *Exhaustion*: Drooping eye over twilight crescent.
  - *Hypothermia / Freezing*: Jagged ice crystal.
  - *Burning*: Blazing flame silhouette.
  - *Poisoned*: Skull silhouette with emerald droplet.
- **Typography & Font Treatment:** Clean, high-legibility bitmap/retro fonts. Text rendered with a crisp 1px drop shadow or dark outline; zero blurry bilinear anti-aliasing.

---

## 4. Faction-Themed System Menus

$$\textbf{RULE: Same Information Architecture. Culturally Distinct Presentation.}$$

When the player clicks or selects a unit belonging to a simulated faction, the entire system menu chrome (dialogue boxes, inspection sheets, status windows, command bars) skin dynamically to reflect that faction's cultural heritage.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   FACTION SYSTEM UI THEME MATRIX                       │
├────────────────────────────────────────────────────────────────────────┤
│ Faction Profile    │ Frame / Border Style │ Panel Background │ Accent  │
├────────────────────┼──────────────────────┼──────────────────┼─────────┤
│ `human_frontier`   │ Hewn oak, iron bands │ Aged parchment   │ Indigo  │
│ `dwarf_stonehold`  │ Chiseled granite ashlar│ Dark slate slab │ Runic Au│
│ `elf_glade`        │ Living bentwood vine │ Birchbark weave  │ Emerald │
│ `halfling_homestead`│ Polished brass bezel│ Cream linen      │ Floral  │
│ `dragonborn_citadel`│ Polished basalt     │ Crimson velvet   │ Bronze  │
│ `goblin_salvage`   │ Rusted scrap plate   │ Greasy rawhide   │ Blood Red│
└────────────────────┴──────────────────────┴──────────────────┴─────────┘
```

- **Race vs. Faction UI Independence:** A Dwarf residing in a Human frontier faction uses the `human_frontier` parchment-and-oak UI chrome when inspected, but their biological portrait and sprite retain canonical Dwarven physiology.

---

## 5. Tactical Information Layer (Selection & Commands)

The tactical layer communicates player intentions and simulation state. It must be **visually distinct from physical world terrain** so players never mistake an information graphic for physical geometry.

```text
  [SELECTION RINGS]
  - Ground origin: Anchored precisely at (x = Center, y = 47) under entity feet.
  - Friendly Unit: Crisp Leaf Green ring (#48A048) with 1px inner border.
  - Neutral / Wildlife: Warm Amber Yellow ring (#D0A030).
  - Hostile / Enemy: Vivid Crimson Spiked ring (#D03030).
  - Active Selected Unit: Pulsing White/Gold ring (#F0E080) with 4 corner pips.

  [COMMAND DESIGNATIONS]
  - Mine Designation: Flashing semi-transparent pickaxe icon overlaid on rock face.
  - Fell Tree Designation: Flashing timber axe icon overlaid on tree trunk base.
  - Haul Designation: Small burlap sack icon hovering at item baseline.
  - Build Ghost: Semi-transparent (35% alpha) white blueprint sprite of structure.

  [SPATIAL BOUNDARIES]
  - Stockpiles: Translucent tinted grid fill with low wooden corner stakes.
  - Restricted Zones: Translucent diagonal red hazard stripe fill.
  - Path Previews: Subtle dotted white trail showing planned route.
  - Z-Transition Markers: Distinct 16px green "▲ UP" or blue "▼ DOWN" chevron icons
    above stairs, ladders, and ramps.
```

---

## 6. Fog-of-War & Knowledge Visualization

Project DEUS differentiates **objective world truth** from **colonist / faction knowledge**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     THREE-TIER FOG OF WAR MODEL                        │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 1: UNEXPLORED (VOID)                                              │
│ - Render: 100% Solid Near-Black (#08080C).                              │
│ - Truth: Complete unknown. Terrain, elevation, and resources hidden.   │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: REMEMBERED / HISTORICAL SNAPSHOT                               │
│ - Render: Desaturated (-60%), Dimmed (-40% value) static terrain.     │
│ - Truth: Shows world as it was when last visited. Dynamic entities     │
│   (enemies, wildlife, items) are culled from view. Structural damage   │
│   inflicted while out of sight remains hidden until re-scouted.        │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: ACTIVE LINE OF SIGHT                                           │
│ - Render: 100% Full Color, dynamic lighting, real-time animation.      │
│ - Truth: Real-time visibility updated per colonist sensory radius.     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Accessibility Standard: Multi-Channel Encoding

$$\textbf{RULE: Never encode gameplay-critical information by color alone.}$$

All tactical status indicators, faction alignments, and liquid hazards must be readable by players with color-vision deficiencies (protanopia, deuteranopia, tritanopia):

| Information | Primary Color Channel | Secondary Shape / Pattern Channel | Tertiary Icon Channel |
|---|---|---|---|
| **Hostile Entity** | Crimson Red | Spiked / Octagonal border ring | Crossed swords icon |
| **Friendly Entity** | Leaf Green | Smooth circular border ring | Shield icon |
| **Neutral Entity** | Amber Yellow | Diamond border ring | Open hand icon |
| **Lethal Lava** | Bright Orange | Boiling bubble particle burst | Heat shimmer wave |
| **Deep Water** | Deep Blue | Concentric ripple lines | Floating wave chevron |
| **Active Project** | Cyan Blue | 50% diagonal dashed boundary | Hammer & nail icon |

---

## 8. Corpse, Remains & Burial Progression

To prevent thousands of persistent corpse entities from degrading engine performance, bodily remains undergo a structured 4-phase lifecycle:

```text
  [STAGE 1: FRESH CORPSE (0 - 24 Game Hours)]
  - Prone unit sprite lying flat at baseline y = 47.
  - Carries all equipped gear, weapons, and inventory items.
  - Can be looted or resuscitated (if within medical window).
          │
          ▼  Biological decay
  [STAGE 2: DECOMPOSING REMAINS (24 - 72 Game Hours)]
  - Bloated / desaturated sprite with subtle fly particle loop.
  - Emits localized miasma/disease cloud if left unburied in living quarters.
          │
          ▼  Soft tissue decay
  [STAGE 3: SKELETAL REMAINS (72+ Game Hours)]
  - Stripped bleached bones, bare skull, and ribcage sprite ($24\times 16\text{ px}$).
  - Loose gear drops to ground as standalone items.
          │
          ▼  Colonist burial labor
  [STAGE 4: GRAVE / TOMB CAIRN]
  - Remains hauled to cemetery plot; converted to $1\times 1\ T$ permanent grave.
  - Wooden headboard or carved stone cairn.
  - Relieves settlement mourning penalties; permanently clears entity memory.
```

---

## 9. Rarity & Prestige Visual Language

Project DEUS rejects garish neon MMO glowing weapons. Prestige and craftsmanship are communicated through historical medieval craftsmanship and subtle material elegance:

- **Common / Crude (Tier 1):** Rough pitted iron, splintered ash wood, dull edges, unpadded rawhide wraps.
- **Fine / High-Quality (Tier 2):** Polished steel with clean specular highlights, oiled walnut wood, brass wire-wrapped hilt.
- **Masterwork / Ancestral (Tier 3):** Damascus pattern-welded steel ripples, carved silver/gold pommel inlay, immaculate geometric balance.
- **Runic / Enchanted (Tier 4):** Faint, subtle glowing runic inscriptions carved along the fuller (1–2 px soft emissive pulse), soft ambient hum; zero blinding neon fire trails.

---

## 10. Art Level of Detail (LOD) at Fixed 1x Gameplay Camera

Because Project DEUS standardizes on a **single canonical gameplay camera distance** (no continuous zoom):
1. **The 3-Pixel Cluster Rule:** Any visual detail smaller than a $2\times 2$ or $3\times 3$ pixel cluster will visually dissolve into noise at 1× gameplay scale. Avoid micro-stippling on clothing and walls.
2. **Silhouette Dominance:** A character's weapon, helmet shape, and cloak must be immediately identifiable from its exterior silhouette alone.
3. **High-Contrast Focal Points:** Eyes are 2px dark clusters; belt buckles are 4px bright brass accents; weapon blades are bright steel lines with dark contrast outlines.

---

## 11. Golden-Scene Regression Testing Standard

To ensure engine rendering, shader filters, and lighting pipelines never degrade visual quality across updates, five canonical scenes are established as regression benchmarks:

1. `SCENE-01`: **Frontier Village Noon** (Dwellings, storehouse, crop furrows, peons hauling timber).
2. `SCENE-02`: **Settlement Night & Fire** (Torches, burning thatch roof, smoke particles, deep night indigo filter).
3. `SCENE-03`: **Forest Tactical Skirmish** (Selection rings, archery, blood splatters, lightning bolt spell).
4. `SCENE-04`: **Dwarf Stonehold Forge** (Subterranean basalt, glowing crucible, anvils, runic braziers).
5. `SCENE-05`: **Supernatural Ancient Ruin** (Planar rupture, crumbling cyclopean stone, eerie cold glow).

Every visual system update must be validated against these 5 golden benchmarks in RMMZ Playtest.
