# DEUS — 10 ARTISTIC STYLE PROPOSALS & SPECIFICATION MATRIX
**Document ID:** `DEUS-ART-STYLE-01`  
**Status:** Approved Candidate Matrix for Direction Refinement  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Mandatory Baseline:**
- **Perspective:** Pure 2D top-down RPG projection (zero 2.5D, zero elevation offsets, zero cast shadow sprites).
- **Scale:** Grounded late-16-bit proportions (~3.0–3.2 heads tall, 40–44px inside 48×48px 1-tile frames for humanoids; 96×96px 2-tile frames for large monsters; mature Western fantasy proportions).
- **Architecture:** Dwarf Fortress Steam-style black wall-top convention (lower 48px visible material face; upper 48px flat near-black `#08080C` occlusion cap).
- **Animation:** 100% authored sprite-frame animation (zero runtime code-driven after-effects or shaders).
- **Palette & Lighting:** Clamped to 16-bit master palette (`art/palette/uf.hex`), Upper-Left light source (135°).

---

## 1. Quick Comparison Matrix

| # | Proposal Name | Primary Aesthetic Reference | Shading & Light | Line & Texture | Atmosphere / Mood |
|---|---|---|---|---|---|
| **01** | **The Iron Chronicle** | *Tactics Ogre*, *FF Tactics*, *Ogre Battle* | 3-tone cel, crisp upper-left sun | Sharp 1px charcoal outline, fine woven textures | Military sobriety, gritty feudal realism |
| **02** | **The Ash & Ember** | *Darkest Dungeon*, *Bloodborne*, *Diablo I* | Heavy chiaroscuro, 60% shadow mass | Jagged contours, soot stains, notched silhouettes | Bleak survival horror, oppressive wilderness |
| **03** | **The Illuminated Bestiary** | *Pentiment*, Dürer woodcuts, medieval manuscripts | Flat heraldic lighting, parchment undertones | Fine pixel hatching/stippling, sepia ink lines | Mythic Arthurian folklore, monastic chronicle |
| **04** | **The Rust & Relic** | *Hyper Light Drifter*, *Caves of Qud*, *Elden Ring* | Earthy low-light + vivid phosphor/cyan mana glows | Rough-hewn wood vs geometric alien monoliths | Precursor sci-fi mystery, cosmic awe |
| **05** | **The Living Mud & Timber** | *Witcher 3* (Velen), *Kingdom Come*, *Green Hell* | Ambient occlusion in crevices, diffuse daylight | Asymmetric log cuts, mud splatter, wet stone sheen | Visceral survival naturalism, physical grit |
| **06** | **The Runed Vault** | *Dwarf Fortress* (Steam Deluxe), *Dungeon Keeper* | Graphic architectural contrast, forge amber radiance | Bold stone bevels, prominent masonry striations | Monumental subterranean industry & order |
| **07** | **The Autumn Hearth** | *Sea of Stars*, *Secret of Mana* (Autumn), Nordic folk | Warm secondary bounce light, twilight purples | Soft rounded timber, billowing chimneys, thick wool | Melancholic beauty, settler warmth vs cold wild |
| **08** | **The Pale North** | *The Banner Saga*, *Valheim*, *Northgard* | Overcast diffuse daylight, high value contrast | Broad color planes, sweeping furs, bone carvings | Windswept Nordic stoicism, clan endurance |
| **09** | **The Black Blade** | *Blasphemous*, *Slain*, *Castlevania SOTN* | High-contrast rim highlights on dark metals | Sharp gothic spires, ornate ironwork, cowled robes | Solemn penitence, macabre dark fantasy |
| **10** | **The Tactical Blueprint** | *Into the Breach*, *Advance Wars*, *RimWorld* | Strict 2-3 tone cel, zero micro-dither noise | Hyper-readable 1px bounding outlines, iconic gear | Maximum simulation clarity across 0.5x–3x zoom |

---

## 2. Detailed Technical Breakdown per Proposal

### Proposal 01: The Iron Chronicle (Classic Tactical Grimdark)
- **Concept:** Translates the revered aesthetics of classic 16-bit tactical RPGs (*Tactics Ogre*, *Final Fantasy Tactics*) into a pure 2D top-down simulation.
- **Character Sprites:** Muted, practical combat gear. Heavy boiled leather brigandines, chainmail stippling, weathered surcoats with clan badges, scabbarded sidearms, and mud-stained greaves. Faces feature determined, narrow eyes under steel sallets and leather hoods.
- **Environment & Architecture:** Weathered fieldstone walls with visible mortar joints, hand-split oak timber frames, mossy cobblestone pathways, and deep loamy soil.
- **Color & Shading:** Disciplined 3-tone cel shading. Clean, readable step-down shadows under brims and folds. Strong upper-left sunlight.
- **Best Suited For:** Faction warfare, military discipline, historical medieval plausibility, and clear armor tier progression.

### Proposal 02: The Ash & Ember (Bleak Chiaroscuro Survival)
- **Concept:** An unforgiving, high-stress survival horror treatment inspired by *Darkest Dungeon* and *Bloodborne*.
- **Character Sprites:** Weary, desperate survivors. Tattered cloaks, heavily bandaged limbs, notched and rusted blades, hunched survival postures, and hollow, shadowed eye sockets.
- **Environment & Architecture:** Charred timbers, damp black moss, cracked volcanic basalt, soot-blackened workshops, and murky bogs. Structures look hastily cobbled together from salvaged ruins.
- **Color & Shading:** Radical chiaroscuro. Sprites are dominated by 60% shadow mass, punctured by sharp specular edge highlights from torches, braziers, and blade reflections.
- **Best Suited For:** Dangerous wilderness expeditions, desperate winter starvation, monster incursions, and high-fatality colonies.

### Proposal 03: The Illuminated Bestiary (Medieval Woodcut & Manuscript)
- **Concept:** Renders the DEUS world as if it were a living 14th-century illuminated psalter or an Albrecht Dürer woodcut engraving translated into 16-bit pixels.
- **Character Sprites:** Formalized heraldic poses, expressive linework with selective pixel-hatching on cloaks and mail. Distinct silhouettes reminiscent of medieval tapestries.
- **Environment & Architecture:** Stylized botanical trees (distinct heraldic oak leaves, spiraling fern fronds), geometric water curl ripples, and calligraphic keystone carvings.
- **Color & Shading:** Warm vellum/parchment undertones with deep sepia-brown outlines. Local colors are dominated by earth pigments, punctuated by precious mineral pigments (vermilion red, lapis lazuli, gold ochre) reserved for eyes, magic runes, and noble gear.
- **Best Suited For:** Deep mythic Arthurian lore, ancient monastic settlements, chronicled histories, and artistic uniqueness.

### Proposal 04: The Rust & Relic (Arthurian Precursor Sci-Fi / Deep DEUS)
- **Concept:** Fully realizes DEUS's core lore pillar (V65): primitive medieval Arthurian settlers struggling to survive atop the buried carcass of an incomprehensible cosmic god-civilization.
- **Character Sprites:** Low-fantasy peasants and knights equipped with scavenged precursor technology: crude iron broadswords mounted with humming crystal power-cells; rusted plate armor retrofitted with glowing glass conduits; star-born Glassfolk with translucent obsidian frames.
- **Environment & Architecture:** Rough-hewn wooden huts built against the towering, geometry-defying black alloy pylons of ancient machines. Overgrown subterranean vaults featuring pulsing bioluminescent conduits and ancient glass interfaces.
- **Color & Shading:** Desaturated peat, soil, and rust juxtaposed against high-intensity cold neon phosphor glows (cyan, magenta, violet).
- **Best Suited For:** High-concept sci-fi/fantasy fusion, exploration of ancient ruins, technological progression, and distinct faction identities.

### Proposal 05: The Living Mud & Timber (Hyper-Tactile Naturalism)
- **Concept:** Grounded physical naturalism inspired by the wilderness of *The Witcher 3* and *Kingdom Come: Deliverance*.
- **Character Sprites:** Thick, heavy, weather-appropriate clothing. Coarse frieze wool cloaks, greasy leather aprons, mud caked up to the knees, and calloused bare forearms. Belts laden with functional pouches, cordage, and skinning knives.
- **Environment & Architecture:** Natural, imperfect structures: hand-notched round logs with bark remnants, uneven mud-daub infill, sagging thatch eaves, and trampled wagon ruts filled with standing rainwater.
- **Color & Shading:** Soft ambient occlusion in crevices and folds; subtle wet specular sheen on river stones and greenwood timbers; rich organic earth gradients across soil types.
- **Best Suited For:** Hardcore frontier survival, forestry, farming, crafting immersion, and colonist vulnerability.

### Proposal 06: The Runed Vault (Architectural Monumentality & DF Deluxe)
- **Concept:** Maximizes the architectural satisfaction and subterranean monumentality of *Dwarf Fortress* (Steam Edition).
- **Character Sprites:** Sturdy, stocky, broad-shouldered silhouettes. Ornate belt buckles, geometric braided beards, heavy plate pauldrons, and distinct tool-in-hand stances.
- **Environment & Architecture:** Massive dressed stone blocks, deep chisel-cut runes, geometric floor tiles, and heavy iron-banded doors. The black wall-top convention is razor-sharp and frames complex multi-room fortress layouts with immaculate graphic clarity.
- **Color & Shading:** High-contrast material differentiation. Salt-and-pepper crystalline granite, obsidian columnar basalt, and golden sandstone are instantly distinguishable. Smelter vents and lava pools cast dramatic orange light across deep gray stonework.
- **Best Suited For:** Subterranean mining, massive fortress construction, deep earth exploration, and heavy industry.

### Proposal 07: The Autumn Hearth (Melancholic Warmth & Folk Fantasy)
- **Concept:** Balances brutal grimdark survival stakes with the comforting warmth of communal life, drawing inspiration from *Sea of Stars* and Nordic folk aesthetics.
- **Character Sprites:** Expressive grounded late-16-bit sprites with warm, woolen textures, fur collars, hooded mantles, and distinct facial expressions reflecting morale and exhaustion.
- **Environment & Architecture:** Warm timber longhouses with glowing smoked windows, golden wheat and barley fields, autumn-tinted amber foliage, cozy communal firepits, and rustic split-rail fences.
- **Color & Shading:** Warm secondary bounce lighting from hearths, torches, and lanterns. Twilight purples, russet browns, deep golden ambers, and forest greens create high emotional resonance.
- **Best Suited For:** Community building, emotional attachment to colonists, domestic village simulation, and cozy survival against harsh winters.

### Proposal 08: The Pale North (Windswept Nordic Stoicism)
- **Concept:** Stark, minimalist northern low-fantasy inspired by *The Banner Saga* and *Valheim*.
- **Character Sprites:** Broad, clean silhouettes defined by sweeping wind-blown cloaks, bone amulets, heavy wool trousers, and braided leather wraps. Minimal interior fussiness; relies on bold, decisive shape language.
- **Environment & Architecture:** Dark pine stave halls with dragon/raven-carved gables, lichen-covered standing stones, snow-dusted tundra turf, and black peat bogs.
- **Color & Shading:** Cold, overcast northern daylight. Flat value planes with subtle desaturated gradients; stark contrast between white snow, charcoal rock, and deep evergreen foliage.
- **Best Suited For:** Harsh winter biomes, clan migrations, stoic cultural values, and epic mythic scope.

### Proposal 09: The Black Blade (Gothic Dark Fantasy & Relic Baroque)
- **Concept:** Ominous, gothic medievalism inspired by *Blasphemous*, *Slain*, and *Dark Souls*.
- **Character Sprites:** Austere, severe silhouettes. Pierced steel helms, spiked iron gorgets, heavy penitent hoods, tarnished chainmail, and long iron broadswords.
- **Environment & Architecture:** Pointed gothic arch doorways, carved gargoyle corbels, weathered ossuary catacombs, iron gibbets, and cracked flagstones overgrown with blackened briars.
- **Color & Shading:** Dramatic directional lighting with deep obsidian shadows and glistening specular highlights on polished blade edges. Accented by dried ceremonial blood, tarnished church silver, and verdigris bronze.
- **Best Suited For:** Religious factions, ancient curses, brutal combat, dungeon delves, and dark occult mysteries.

### Proposal 10: The Tactical Blueprint (Iconic Graphic Precision & Readability)
- **Concept:** Engineered for absolute simulation clarity and zero-noise readability across massive colonies (inspired by *Into the Breach* and *Advance Wars*).
- **Character Sprites:** Ultra-clean 1px dark contour containment. Every profession, held tool, condition, and status reads unequivocally at 0.5x, 1x, or 3x zoom. No muddy pixels or ambiguous clumping.
- **Environment & Architecture:** Bold, clean tile transitions. Modular building blocks fit together with crisp board-game precision. Wall caps, doorways, and storage stockpiles pop out instantly from the background.
- **Color & Shading:** Strict 2-3 tone cel shading with high value contrast between steps. Zero micro-dither noise that dissolves into visual grain when zoomed out.
- **Best Suited For:** Massive mega-fortresses (hundreds of colonists and creatures on screen), fast tactical decision-making, and flawless multi-zoom performance.

---

## 3. Direction Synthesis & Dial Blending Guide

When reviewing these proposals, the final production direction can be synthesized by locking specific dials across:
1. **Character Dial:** Line clarity, proportion, and gear realism (e.g. #01 *Tactics Ogre* discipline vs #08 *Banner Saga* bold shapes).
2. **Environmental Dial:** Architectural geometry and texture frequency (e.g. #06 *DF Deluxe* stonework vs #05 *Living Mud & Timber* naturalism).
3. **Lore Dial:** Cosmic Precursor integration (e.g. #04 *Rust & Relic* technology vs #03 *Illuminated Bestiary* medieval folk myth).
4. **Atmosphere Dial:** Light and emotional tone (e.g. #07 *Autumn Hearth* community warmth vs #02 *Ash & Ember* bleak horror).
