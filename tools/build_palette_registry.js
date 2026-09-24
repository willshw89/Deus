#!/usr/bin/env node
'use strict';

/**
 * tools/build_palette_registry.js
 *
 * Compiles and validates the authoritative DEUS Canonical World Palette Architecture
 * and Family Material Ramps Registry (DW.01.05).
 *
 * Generates:
 * - game/data/DEUS_PaletteRegistry.json
 * - docs/art/DEUS_PaletteRegistry.json
 * - art/palette/deus_master_world_palette_v1.hex
 */

const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgbToHex(r, g, b) {
    const toHex = c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getLuminance(r, g, b) {
    // Relative luminance according to ITU-R BT.709
    return Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10) / 10;
}

function colorDistance(c1, c2) {
    // Euclidean distance in RGB space
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

// -----------------------------------------------------------------------------
// CANONICAL SHARED TONES (Strategic Color Sharing across families)
// -----------------------------------------------------------------------------
const SHARED = {
    // Structural voids & shadows
    VOID_DEEP: '#060709',
    VOID_CAP: '#0C0D12',
    VOID_OCCLUSION: '#14161C',      // Shared by neutral void, obsidian dark, forged iron shadow

    // Shared stone & mineral shadows
    COOL_SHADOW_01: '#1C2126',      // Shared by cool gray neutral and highland granite shadow
    WARM_STONE_01: '#23211D',       // Shared by warm gray neutral, fieldstone, limestone, and pumice dark
    WARM_STONE_02: '#3D3833',       // Shared by warm gray and driftwood body
    WARM_STONE_05: '#B4ABA1',       // Shared by warm stone and pumice crest
    PALE_CREST_MAX: '#EDE9DE',      // Shared by pale neutral crest and white birch bark

    // Shared wood & bark tones
    BARK_DEEP: '#1B1714',           // Shared by oak bark shadow, conifer bark, woodland floor, and driftwood
    BARK_DARK_BODY: '#4E3E33',      // Shared by oak bark and conifer bark
    BARK_LIT_BODY: '#6F5948',       // Shared by oak bark and conifer bark lit
    AGED_WOOD_01: '#1D1B18',        // Shared by aged timber, highland soil shadow, and charred wood
    AGED_WOOD_02: '#322F29',        // Shared by aged timber and highland soil
    DRIFT_BLEACH_01: '#2A2722',     // Shared by wetland driftwood and arid bleached wood shadow

    // Shared soils & dark organic residues
    DEEP_SCORCH_PEAT: '#171210',    // Shared by deep peat, scorched earth, and scoria recess
    DARK_EARTH_02: '#261D18',       // Shared by peat shadow, scorched earth, and raw leather shadow
    MUD_SLATE_CHIP: '#212325',      // Shared by anaerobic mud, mountain scree shadow, and dressed stone recess

    // Shared slates & metals
    SLATE_DEEP: '#161B20',          // Shared by wetland slate and highland slate recess
    SLATE_SHADOW: '#252F36',        // Shared by wetland slate and highland slate shadow
    SLATE_IRON_BODY: '#3C474F',     // Shared by mountain slate and forged iron body
    DRESSED_STONE_02: '#3A3E42',    // Shared by dressed stone and scree shadow
    DRESSED_STONE_03: '#5A5D63',    // Shared by dressed stone, scree body, and volcanic ash lit
    DRESSED_STONE_04: '#7C8389',    // Shared by dressed stone and scree lit
    DRESSED_STONE_05: '#A4ABB1',    // Shared by dressed stone and scree crest
    WEATHERED_PALE_BODY: '#706A5B', // Shared by arid bleached wood and highland stony loam

    // Shared water
    WATER_CORE_BLUE: '#23445A'      // Shared core freshwater tone
};

// -----------------------------------------------------------------------------
// RAW RAMP DEFINITIONS
// -----------------------------------------------------------------------------
const RAMP_DEFINITIONS = [
    // -------------------------------------------------------------------------
    // 1. SHARED NEUTRALS
    // -------------------------------------------------------------------------
    {
        rampId: 'NEUT_VOID_BLACK',
        materialFamily: 'NEUTRALS',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Dwarf-Fortress black wall caps, deep environmental void, hard structural occlusion, deep crevices',
        forbiddenUsage: 'Soft organic surface shading, water bodies',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'NEUT_VOID_DEEP', hex: SHARED.VOID_DEEP, role: 'deepShadow', tags: ['void', 'deepest_occlusion'] },
            { id: 'NEUT_VOID_CAP', hex: SHARED.VOID_CAP, role: 'shadow', tags: ['wall_cap', 'structural_dark'] },
            { id: 'NEUT_VOID_OCCLUSION', hex: SHARED.VOID_OCCLUSION, role: 'body', tags: ['corner_occlusion', 'ambient_dark'] }
        ],
        notes: 'Anchors the deepest shadow and DF 2-grid black wall cap standard across all biomes.'
    },
    {
        rampId: 'NEUT_COOL_GRAY',
        materialFamily: 'NEUTRALS',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Cold stone shadows, slate accents, iron forged metal, cool ambient shadows',
        forbiddenUsage: 'Fertile vegetation surfaces, warm sand',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'NEUT_COOL_01', hex: SHARED.COOL_SHADOW_01, role: 'deepShadow', tags: ['slate_shadow', 'cool_dark'] },
            { id: 'NEUT_COOL_02', hex: '#333B45', role: 'shadow', tags: ['slate_body_dark'] },
            { id: 'NEUT_COOL_03', hex: '#525D6B', role: 'body', tags: ['slate_body'] },
            { id: 'NEUT_COOL_04', hex: '#798797', role: 'light', tags: ['slate_lit'] },
            { id: 'NEUT_COOL_05', hex: '#A7B4C2', role: 'highlight', tags: ['slate_crest'] }
        ],
        notes: 'Universal cool grey ramp for non-organic cold surfaces.'
    },
    {
        rampId: 'NEUT_WARM_GRAY',
        materialFamily: 'NEUTRALS',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Mortar, dressed stone blocks, dry rock fractures, warm structural shadows',
        forbiddenUsage: 'Saturated grass, deep water',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'NEUT_WARM_01', hex: SHARED.WARM_STONE_01, role: 'deepShadow', tags: ['warm_shadow'] },
            { id: 'NEUT_WARM_02', hex: SHARED.WARM_STONE_02, role: 'shadow', tags: ['warm_body_dark'] },
            { id: 'NEUT_WARM_03', hex: '#5F5851', role: 'body', tags: ['warm_stone_body'] },
            { id: 'NEUT_WARM_04', hex: '#867E75', role: 'light', tags: ['warm_stone_lit'] },
            { id: 'NEUT_WARM_05', hex: SHARED.WARM_STONE_05, role: 'highlight', tags: ['warm_stone_crest'] }
        ],
        notes: 'Universal warm grey ramp for neutral masonry and weathered stone.'
    },
    {
        rampId: 'NEUT_PALE_CREST',
        materialFamily: 'NEUTRALS',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Parchment, bone, stark edge highlights, cloth accents, chalk markings',
        forbiddenUsage: 'Ground background fills, deep shadows',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'NEUT_PALE_01', hex: '#6D6961', role: 'deepShadow', tags: ['bone_shadow'] },
            { id: 'NEUT_PALE_02', hex: '#9B968C', role: 'shadow', tags: ['parchment_shadow'] },
            { id: 'NEUT_PALE_03', hex: '#C8C3B7', role: 'body', tags: ['parchment_body'] },
            { id: 'NEUT_PALE_04', hex: SHARED.PALE_CREST_MAX, role: 'highlight', tags: ['stark_crest'] }
        ],
        notes: 'High-value pale neutral ramp for crests, skulls, cloth, and edge glints.'
    },

    // -------------------------------------------------------------------------
    // 2. TEMPERATE / VERDANT
    // -------------------------------------------------------------------------
    {
        rampId: 'TEMP_GRASS_FERTILE',
        materialFamily: 'GRASS',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Continuous fertile meadow turf, lush pasture ground',
        forbiddenUsage: 'Arid desert, volcanic plain, snowy peaks',
        transitionCompatibility: ['TEMP_WET', 'TEMP_ARID', 'TEMP_HIGH', 'TEMP_VOLC'],
        tones: [
            { id: 'TEMP_GRASS_01', hex: '#152614', role: 'deepShadow', tags: ['turf_deep_shadow'] },
            { id: 'TEMP_GRASS_02', hex: '#26421C', role: 'shadow', tags: ['turf_shadow'] },
            { id: 'TEMP_GRASS_03', hex: '#3E6328', role: 'body', tags: ['turf_body'] },
            { id: 'TEMP_GRASS_04', hex: '#628C38', role: 'light', tags: ['turf_lit'] },
            { id: 'TEMP_GRASS_05', hex: '#91B851', role: 'highlight', tags: ['turf_highlight'] }
        ],
        notes: 'Canonical baseline fertile meadow grass. Balanced green with warm golden-green highlight.'
    },
    {
        rampId: 'TEMP_GRASS_DRY',
        materialFamily: 'GRASS',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Secondary meadow, foot-beaten path margins, late summer grass patches',
        forbiddenUsage: 'Deep saturated marsh, fresh spring lawns',
        transitionCompatibility: ['TEMP_ARID', 'TEMP_HIGH', 'TEMP_VOLC'],
        tones: [
            { id: 'TEMP_GRASS_DRY_01', hex: '#1D2315', role: 'deepShadow', tags: ['dry_turf_shadow'] },
            { id: 'TEMP_GRASS_DRY_02', hex: '#353C20', role: 'shadow', tags: ['dry_turf_body_dark'] },
            { id: 'TEMP_GRASS_DRY_03', hex: '#565E31', role: 'body', tags: ['dry_turf_body'] },
            { id: 'TEMP_GRASS_DRY_04', hex: '#82884A', role: 'light', tags: ['dry_turf_lit'] },
            { id: 'TEMP_GRASS_DRY_05', hex: '#B1B26C', role: 'highlight', tags: ['dry_turf_highlight'] }
        ],
        notes: 'Muted olive secondary grass; essential bridge ramp to Arid steppe and rocky highland.'
    },
    {
        rampId: 'TEMP_SOIL_LOAM',
        materialFamily: 'SOIL',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Rich agricultural loam, garden plots, dirt roads, earthen banks',
        forbiddenUsage: 'Sand dunes, chalk hardpan, volcanic ash',
        transitionCompatibility: ['TEMP_WET', 'TEMP_ARID', 'TEMP_HIGH'],
        tones: [
            { id: 'TEMP_LOAM_01', hex: '#1F1610', role: 'deepShadow', tags: ['loam_deep'] },
            { id: 'TEMP_LOAM_02', hex: '#38291C', role: 'shadow', tags: ['loam_shadow'] },
            { id: 'TEMP_LOAM_03', hex: '#57422C', role: 'body', tags: ['loam_body'] },
            { id: 'TEMP_LOAM_04', hex: '#7C6142', role: 'light', tags: ['loam_lit'] },
            { id: 'TEMP_LOAM_05', hex: '#A3845F', role: 'highlight', tags: ['loam_crest'] }
        ],
        notes: 'Classic rich brown earth. High fertility visual cue.'
    },
    {
        rampId: 'TEMP_WOODLAND_FLOOR',
        materialFamily: 'SOIL',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Deciduous forest floor, leaf humus, shaded woodland ground',
        forbiddenUsage: 'Open sun-baked plains, sand beaches',
        transitionCompatibility: ['TEMP_WET', 'TEMP_HIGH'],
        tones: [
            { id: 'TEMP_WOOD_FL_01', hex: SHARED.BARK_DEEP, role: 'deepShadow', tags: ['humus_shadow'] },
            { id: 'TEMP_WOOD_FL_02', hex: '#332A1E', role: 'shadow', tags: ['humus_dark'] },
            { id: 'TEMP_WOOD_FL_03', hex: '#4D3F2C', role: 'body', tags: ['humus_body'] },
            { id: 'TEMP_WOOD_FL_04', hex: '#6B5A3E', role: 'light', tags: ['humus_lit'] },
            { id: 'TEMP_WOOD_FL_05', hex: '#8A7653', role: 'highlight', tags: ['humus_crest'] }
        ],
        notes: 'Warm leaf-littered forest floor for under canopy clusters.'
    },
    {
        rampId: 'TEMP_BARK_OAK',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Mature oak trunks, broadleaf branches, tree stumps',
        forbiddenUsage: 'Conifer needles, birch trunks',
        transitionCompatibility: ['TEMP_WET', 'TEMP_HIGH'],
        tones: [
            { id: 'TEMP_OAK_BARK_01', hex: SHARED.BARK_DEEP, role: 'deepShadow', tags: ['bark_crevice'] },
            { id: 'TEMP_OAK_BARK_02', hex: '#302720', role: 'shadow', tags: ['oak_bark_dark'] },
            { id: 'TEMP_OAK_BARK_03', hex: SHARED.BARK_DARK_BODY, role: 'body', tags: ['oak_bark_body'] },
            { id: 'TEMP_OAK_BARK_04', hex: SHARED.BARK_LIT_BODY, role: 'light', tags: ['oak_bark_lit'] },
            { id: 'TEMP_OAK_BARK_05', hex: '#8F7663', role: 'highlight', tags: ['oak_bark_crest'] }
        ],
        notes: 'Weathered grey-brown furrowed bark for temperate deciduous trees.'
    },
    {
        rampId: 'TEMP_BARK_BIRCH',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['TEMP', 'HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Birch trunks, white paper bark',
        forbiddenUsage: 'Oak foliage, dark soil',
        transitionCompatibility: ['TEMP_HIGH', 'TEMP_WET'],
        tones: [
            { id: 'TEMP_BIRCH_BARK_01', hex: '#28231E', role: 'deepShadow', tags: ['birch_lenticel'] },
            { id: 'TEMP_BIRCH_BARK_02', hex: '#544E45', role: 'shadow', tags: ['birch_peeling'] },
            { id: 'TEMP_BIRCH_BARK_03', hex: '#8A8376', role: 'body', tags: ['birch_body'] },
            { id: 'TEMP_BIRCH_BARK_04', hex: '#C2BBB0', role: 'light', tags: ['birch_paper_lit'] },
            { id: 'TEMP_BIRCH_BARK_05', hex: SHARED.PALE_CREST_MAX, role: 'highlight', tags: ['birch_white_crest'] }
        ],
        notes: 'Paper birch bark with distinct dark lenticels and chalk-cream paper.'
    },
    {
        rampId: 'TEMP_FOLIAGE_OAK',
        materialFamily: 'FOLIAGE',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Broadleaf oak canopy, fruit trees, dense green shrubs',
        forbiddenUsage: 'Conifer needles, desert succulents',
        transitionCompatibility: ['TEMP_WET', 'TEMP_HIGH'],
        tones: [
            { id: 'TEMP_OAK_LEAF_01', hex: '#122416', role: 'deepShadow', tags: ['canopy_undershadow'] },
            { id: 'TEMP_OAK_LEAF_02', hex: '#1F3D20', role: 'shadow', tags: ['oak_leaf_dark'] },
            { id: 'TEMP_OAK_LEAF_03', hex: '#325C2C', role: 'body', tags: ['oak_leaf_body'] },
            { id: 'TEMP_OAK_LEAF_04', hex: '#4F823F', role: 'light', tags: ['oak_leaf_lit'] },
            { id: 'TEMP_OAK_LEAF_05', hex: '#78AD5B', role: 'highlight', tags: ['oak_leaf_crest'] }
        ],
        notes: 'Rich broadleaf oak canopy tones with controlled hue-shifting from deep cool green to sunny yellow-green.'
    },
    {
        rampId: 'TEMP_STONE_FIELDSTONE',
        materialFamily: 'STONE',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Rounded pasture fieldstones, dry stone walls, roadside cairns',
        forbiddenUsage: 'Sharp volcanic basalt, red desert sandstone',
        transitionCompatibility: ['TEMP_WET', 'TEMP_HIGH'],
        tones: [
            { id: 'TEMP_FIELDSTONE_01', hex: SHARED.WARM_STONE_01, role: 'deepShadow', tags: ['stone_crevice'] },
            { id: 'TEMP_FIELDSTONE_02', hex: '#3B3B35', role: 'shadow', tags: ['fieldstone_dark'] },
            { id: 'TEMP_FIELDSTONE_03', hex: '#59594F', role: 'body', tags: ['fieldstone_body'] },
            { id: 'TEMP_FIELDSTONE_04', hex: '#7C7C6E', role: 'light', tags: ['fieldstone_lit'] },
            { id: 'TEMP_FIELDSTONE_05', hex: '#A1A190', role: 'highlight', tags: ['fieldstone_crest'] }
        ],
        notes: 'Weathered rounded stones with gentle greenish-grey patina.'
    },
    {
        rampId: 'TEMP_STONE_LIMESTONE',
        materialFamily: 'STONE',
        biomeAffinity: ['TEMP'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Layered limestone cliffs, river bluffs, upland ledges',
        forbiddenUsage: 'Volcanic scoria, jagged mountain horn peaks',
        transitionCompatibility: ['TEMP_HIGH'],
        tones: [
            { id: 'TEMP_LIMESTONE_01', hex: SHARED.WARM_STONE_01, role: 'deepShadow', tags: ['limestone_deep'] },
            { id: 'TEMP_LIMESTONE_02', hex: '#423E32', role: 'shadow', tags: ['limestone_dark'] },
            { id: 'TEMP_LIMESTONE_03', hex: '#66604E', role: 'body', tags: ['limestone_body'] },
            { id: 'TEMP_LIMESTONE_04', hex: '#8F8770', role: 'light', tags: ['limestone_lit'] },
            { id: 'TEMP_LIMESTONE_05', hex: '#BAB095', role: 'highlight', tags: ['limestone_crest'] }
        ],
        notes: 'Warm sedimentary limestone for temperate rock bluffs.'
    },

    // -------------------------------------------------------------------------
    // 3. WETLAND / RIVERLAND
    // -------------------------------------------------------------------------
    {
        rampId: 'WET_GRASS_SATURATED',
        materialFamily: 'GRASS',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Spongy marsh tussocks, waterlogged grass hummocks',
        forbiddenUsage: 'Dry upland hills, baking desert',
        transitionCompatibility: ['TEMP_WET', 'WET_ARID', 'WET_HIGH', 'WET_VOLC'],
        tones: [
            { id: 'WET_GRASS_01', hex: '#131E14', role: 'deepShadow', tags: ['bog_shadow'] },
            { id: 'WET_GRASS_02', hex: '#203320', role: 'shadow', tags: ['bog_turf_dark'] },
            { id: 'WET_GRASS_03', hex: '#314D2E', role: 'body', tags: ['bog_turf_body'] },
            { id: 'WET_GRASS_04', hex: '#4A6E42', role: 'light', tags: ['bog_turf_lit'] },
            { id: 'WET_GRASS_05', hex: '#6C935D', role: 'highlight', tags: ['bog_turf_crest'] }
        ],
        notes: 'Cool saturated green with muted mossy highlights.'
    },
    {
        rampId: 'WET_REED_RUSH',
        materialFamily: 'FLORA',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Cattails, marsh reeds, bulrushes, water lilies',
        forbiddenUsage: 'Conifer forest, dry scrub',
        transitionCompatibility: ['TEMP_WET', 'WET_ARID'],
        tones: [
            { id: 'WET_REED_01', hex: '#181E11', role: 'deepShadow', tags: ['reed_recess'] },
            { id: 'WET_REED_02', hex: '#2B361A', role: 'shadow', tags: ['reed_shadow'] },
            { id: 'WET_REED_03', hex: '#445427', role: 'body', tags: ['reed_body'] },
            { id: 'WET_REED_04', hex: '#667A3A', role: 'light', tags: ['reed_lit'] },
            { id: 'WET_REED_05', hex: '#8EA353', role: 'highlight', tags: ['reed_crest'] }
        ],
        notes: 'Upright olive-tinged marsh reed ramp.'
    },
    {
        rampId: 'WET_SOIL_PEAT',
        materialFamily: 'SOIL',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Deep saturated peat beds, bog soil, dark organic loam',
        forbiddenUsage: 'Dry gravel, sand',
        transitionCompatibility: ['TEMP_WET', 'WET_VOLC'],
        tones: [
            { id: 'WET_PEAT_01', hex: SHARED.DEEP_SCORCH_PEAT, role: 'deepShadow', tags: ['peat_void'] },
            { id: 'WET_PEAT_02', hex: SHARED.DARK_EARTH_02, role: 'shadow', tags: ['peat_dark'] },
            { id: 'WET_PEAT_03', hex: '#3B2E25', role: 'body', tags: ['peat_body'] },
            { id: 'WET_PEAT_04', hex: '#544234', role: 'light', tags: ['peat_lit'] },
            { id: 'WET_PEAT_05', hex: '#735B49', role: 'highlight', tags: ['peat_crest'] }
        ],
        notes: 'Dark spongy organic peat earth.'
    },
    {
        rampId: 'WET_MUD_ANAEROBIC',
        materialFamily: 'SOIL',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Anaerobic black swamp mud, riverbed sludge, wet sinkholes',
        forbiddenUsage: 'Fertile garden topsoil',
        transitionCompatibility: ['TEMP_WET', 'WET_ARID', 'WET_VOLC'],
        tones: [
            { id: 'WET_MUD_01', hex: '#131415', role: 'deepShadow', tags: ['mud_deep'] },
            { id: 'WET_MUD_02', hex: SHARED.MUD_SLATE_CHIP, role: 'shadow', tags: ['mud_dark'] },
            { id: 'WET_MUD_03', hex: '#323536', role: 'body', tags: ['mud_body'] },
            { id: 'WET_MUD_04', hex: '#474B4D', role: 'light', tags: ['mud_lit'] },
            { id: 'WET_MUD_05', hex: '#606568', role: 'highlight', tags: ['mud_crest'] }
        ],
        notes: 'Cold dark anaerobic mud with wet slick sheen.'
    },
    {
        rampId: 'WET_SILT_RIVER',
        materialFamily: 'SOIL',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Riverbank silt, slow water deposit flats, damp mudbars',
        forbiddenUsage: 'Arid desert sand',
        transitionCompatibility: ['TEMP_WET'],
        tones: [
            { id: 'WET_SILT_01', hex: '#171813', role: 'deepShadow', tags: ['silt_shadow'] },
            { id: 'WET_SILT_02', hex: '#292A20', role: 'shadow', tags: ['silt_dark'] },
            { id: 'WET_SILT_03', hex: '#3F4030', role: 'body', tags: ['silt_body'] },
            { id: 'WET_SILT_04', hex: '#5A5B45', role: 'light', tags: ['silt_lit'] },
            { id: 'WET_SILT_05', hex: '#797A5F', role: 'highlight', tags: ['silt_crest'] }
        ],
        notes: 'Muted olive-grey silt for river deposits.'
    },
    {
        rampId: 'WET_STONE_DAMP_SLATE',
        materialFamily: 'STONE',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Water-smoothed river slate, submerged stepping stones, wet boulders',
        forbiddenUsage: 'Dry limestone bluffs',
        transitionCompatibility: ['WET_HIGH', 'TEMP_WET'],
        tones: [
            { id: 'WET_SLATE_01', hex: SHARED.SLATE_DEEP, role: 'deepShadow', tags: ['wet_stone_shadow'] },
            { id: 'WET_SLATE_02', hex: SHARED.SLATE_SHADOW, role: 'shadow', tags: ['wet_stone_dark'] },
            { id: 'WET_SLATE_03', hex: '#37464F', role: 'body', tags: ['wet_stone_body'] },
            { id: 'WET_SLATE_04', hex: '#4E626E', role: 'light', tags: ['wet_stone_lit'] },
            { id: 'WET_SLATE_05', hex: '#6B8291', role: 'highlight', tags: ['wet_stone_crest'] }
        ],
        notes: 'Dark blue-slate stone with wet surface reflection.'
    },
    {
        rampId: 'WET_WOOD_DRIFTWOOD',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Waterlogged snags, exposed gnarly cypress roots, rotting dock pilings',
        forbiddenUsage: 'Fresh sawed construction timber',
        transitionCompatibility: ['TEMP_WET'],
        tones: [
            { id: 'WET_DRIFT_01', hex: SHARED.BARK_DEEP, role: 'deepShadow', tags: ['driftwood_shadow'] },
            { id: 'WET_DRIFT_02', hex: SHARED.DRIFT_BLEACH_01, role: 'shadow', tags: ['driftwood_dark'] },
            { id: 'WET_DRIFT_03', hex: SHARED.WARM_STONE_02, role: 'body', tags: ['driftwood_body'] },
            { id: 'WET_DRIFT_04', hex: '#585045', role: 'light', tags: ['driftwood_lit'] },
            { id: 'WET_DRIFT_05', hex: '#766B5B', role: 'highlight', tags: ['driftwood_crest'] }
        ],
        notes: 'Dark waterlogged timber with muted brown-grey body.'
    },
    {
        rampId: 'WET_FOLIAGE_WILLOW',
        materialFamily: 'FOLIAGE',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Drooping weeping willow fronds, swamp alder leaves, bog briars',
        forbiddenUsage: 'Conifer needles, mountain pines',
        transitionCompatibility: ['TEMP_WET'],
        tones: [
            { id: 'WET_WILLOW_01', hex: '#162115', role: 'deepShadow', tags: ['willow_recess'] },
            { id: 'WET_WILLOW_02', hex: '#293B22', role: 'shadow', tags: ['willow_dark'] },
            { id: 'WET_WILLOW_03', hex: '#415C32', role: 'body', tags: ['willow_body'] },
            { id: 'WET_WILLOW_04', hex: '#618247', role: 'light', tags: ['willow_lit'] },
            { id: 'WET_WILLOW_05', hex: '#8AA864', role: 'highlight', tags: ['willow_crest'] }
        ],
        notes: 'Yellow-tinged willow fronds for marsh wetlands.'
    },

    // -------------------------------------------------------------------------
    // 4. ARID / STEPPE / DESERT
    // -------------------------------------------------------------------------
    {
        rampId: 'ARID_GRASS_BUNCHGRASS',
        materialFamily: 'GRASS',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Spiky drought-adapted bunchgrass clumps, dried straw tussocks',
        forbiddenUsage: 'Lush meadow lawns',
        transitionCompatibility: ['TEMP_ARID', 'WET_ARID', 'ARID_HIGH', 'ARID_VOLC'],
        tones: [
            { id: 'ARID_GRASS_01', hex: '#262316', role: 'deepShadow', tags: ['straw_shadow'] },
            { id: 'ARID_GRASS_02', hex: '#473E24', role: 'shadow', tags: ['straw_dark'] },
            { id: 'ARID_GRASS_03', hex: '#6F5F34', role: 'body', tags: ['straw_body'] },
            { id: 'ARID_GRASS_04', hex: '#9C8449', role: 'light', tags: ['straw_lit'] },
            { id: 'ARID_GRASS_05', hex: '#CBB06A', role: 'highlight', tags: ['straw_crest'] }
        ],
        notes: 'Warm straw-yellow bunchgrass for dry steppe plains.'
    },
    {
        rampId: 'ARID_SOIL_HARDPAN',
        materialFamily: 'SOIL',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Caliche-rich sun-baked hardpan earth, cracked alkali flats',
        forbiddenUsage: 'Rich dark garden loam',
        transitionCompatibility: ['TEMP_ARID', 'WET_ARID', 'ARID_HIGH', 'ARID_VOLC'],
        tones: [
            { id: 'ARID_HARDPAN_01', hex: '#2E261D', role: 'deepShadow', tags: ['hardpan_crack'] },
            { id: 'ARID_HARDPAN_02', hex: '#4F4232', role: 'shadow', tags: ['hardpan_dark'] },
            { id: 'ARID_HARDPAN_03', hex: '#77634A', role: 'body', tags: ['hardpan_body'] },
            { id: 'ARID_HARDPAN_04', hex: '#A28968', role: 'light', tags: ['hardpan_lit'] },
            { id: 'ARID_HARDPAN_05', hex: '#CFB38D', role: 'highlight', tags: ['hardpan_crest'] }
        ],
        notes: 'Pale caliche hardpan soil.'
    },
    {
        rampId: 'ARID_SOIL_CLAY',
        materialFamily: 'SOIL',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Baked reddish-buff clay washes, dry arroyo banks',
        forbiddenUsage: 'Waterlogged peat',
        transitionCompatibility: ['TEMP_ARID', 'ARID_VOLC'],
        tones: [
            { id: 'ARID_CLAY_01', hex: '#2C1B16', role: 'deepShadow', tags: ['clay_shadow'] },
            { id: 'ARID_CLAY_02', hex: '#4E2E23', role: 'shadow', tags: ['clay_dark'] },
            { id: 'ARID_CLAY_03', hex: '#764432', role: 'body', tags: ['clay_body'] },
            { id: 'ARID_CLAY_04', hex: '#A16147', role: 'light', tags: ['clay_lit'] },
            { id: 'ARID_CLAY_05', hex: '#CF8667', role: 'highlight', tags: ['clay_crest'] }
        ],
        notes: 'Terracotta-tinted arid clay.'
    },
    {
        rampId: 'ARID_SAND_COARSE',
        materialFamily: 'SOIL',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Coarse desert sand drifts, arroyo wash beds, dry stream channels',
        forbiddenUsage: 'Black volcanic ash',
        transitionCompatibility: ['ARID_HIGH', 'TEMP_ARID'],
        tones: [
            { id: 'ARID_SAND_01', hex: '#30281B', role: 'deepShadow', tags: ['sand_recess'] },
            { id: 'ARID_SAND_02', hex: '#54442D', role: 'shadow', tags: ['sand_dark'] },
            { id: 'ARID_SAND_03', hex: '#7D6642', role: 'body', tags: ['sand_body'] },
            { id: 'ARID_SAND_04', hex: '#A88C5D', role: 'light', tags: ['sand_lit'] },
            { id: 'ARID_SAND_05', hex: '#D3B680', role: 'highlight', tags: ['sand_crest'] }
        ],
        notes: 'Coarse buff sand with high reflectivity.'
    },
    {
        rampId: 'ARID_STONE_SANDSTONE',
        materialFamily: 'STONE',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Layered horizontal red/buff sandstone cliffs, mesa summits, hoodoos',
        forbiddenUsage: 'Cold grey granite, black columnar basalt',
        transitionCompatibility: ['ARID_HIGH', 'ARID_VOLC'],
        tones: [
            { id: 'ARID_SANDSTONE_01', hex: '#331F18', role: 'deepShadow', tags: ['sandstone_shadow'] },
            { id: 'ARID_SANDSTONE_02', hex: '#583224', role: 'shadow', tags: ['sandstone_dark'] },
            { id: 'ARID_SANDSTONE_03', hex: '#834A34', role: 'body', tags: ['sandstone_body'] },
            { id: 'ARID_SANDSTONE_04', hex: '#B06A4B', role: 'light', tags: ['sandstone_lit'] },
            { id: 'ARID_SANDSTONE_05', hex: '#DC906B', role: 'highlight', tags: ['sandstone_crest'] }
        ],
        notes: 'Warm horizontal layered sandstone. Signature geological marker for Arid biome.'
    },
    {
        rampId: 'ARID_SCRUB_THORN',
        materialFamily: 'FOLIAGE',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Dusty desert sagebrush, creosote scrub, spiny thorn bushes',
        forbiddenUsage: 'Broadleaf oak forest',
        transitionCompatibility: ['TEMP_ARID', 'ARID_HIGH'],
        tones: [
            { id: 'ARID_SCRUB_01', hex: '#1D221A', role: 'deepShadow', tags: ['scrub_shadow'] },
            { id: 'ARID_SCRUB_02', hex: '#343C2D', role: 'shadow', tags: ['scrub_dark'] },
            { id: 'ARID_SCRUB_03', hex: '#505B44', role: 'body', tags: ['scrub_body'] },
            { id: 'ARID_SCRUB_04', hex: '#738162', role: 'light', tags: ['scrub_lit'] },
            { id: 'ARID_SCRUB_05', hex: '#9AA986', role: 'highlight', tags: ['scrub_crest'] }
        ],
        notes: 'Dusty desaturated sage-green for arid shrubs.'
    },
    {
        rampId: 'ARID_WOOD_BLEACHED',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Sun-bleached dead snags, dry weathered branch clutter, fence posts',
        forbiddenUsage: 'Waterlogged bog driftwood',
        transitionCompatibility: ['TEMP_ARID', 'ARID_HIGH'],
        tones: [
            { id: 'ARID_BLEACH_01', hex: SHARED.DRIFT_BLEACH_01, role: 'deepShadow', tags: ['bleached_shadow'] },
            { id: 'ARID_BLEACH_02', hex: '#4A443A', role: 'shadow', tags: ['bleached_dark'] },
            { id: 'ARID_BLEACH_03', hex: SHARED.WEATHERED_PALE_BODY, role: 'body', tags: ['bleached_body'] },
            { id: 'ARID_BLEACH_04', hex: '#9C9282', role: 'light', tags: ['bleached_lit'] },
            { id: 'ARID_BLEACH_05', hex: '#CAC0AF', role: 'highlight', tags: ['bleached_crest'] }
        ],
        notes: 'Bone-dry sun-bleached wood.'
    },
    {
        rampId: 'ARID_BONE_CALICHE',
        materialFamily: 'NEUTRALS',
        biomeAffinity: ['ARID'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Desert animal skulls, scattered ribcages, caliche mineral crusts',
        forbiddenUsage: 'Live vegetation, deep shadows',
        transitionCompatibility: ['WET_ARID', 'ARID_HIGH'],
        tones: [
            { id: 'ARID_BONE_01', hex: '#36332C', role: 'deepShadow', tags: ['bone_recess'] },
            { id: 'ARID_BONE_02', hex: '#5D584C', role: 'shadow', tags: ['bone_shadow'] },
            { id: 'ARID_BONE_03', hex: '#888170', role: 'body', tags: ['bone_body'] },
            { id: 'ARID_BONE_04', hex: '#B7AF9C', role: 'light', tags: ['bone_lit'] },
            { id: 'ARID_BONE_05', hex: '#E6DECD', role: 'highlight', tags: ['bone_crest'] }
        ],
        notes: 'Weathered pale bone and caliche crust.'
    },

    // -------------------------------------------------------------------------
    // 5. HIGHLAND / MOUNTAIN
    // -------------------------------------------------------------------------
    {
        rampId: 'HIGH_GRASS_ALPINE',
        materialFamily: 'GRASS',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Hardy alpine fescue, rock-cleft cushion turf, windward ridge grass',
        forbiddenUsage: 'Snow/ice surfaces (HARD RULE: zero snow/ice in DEUS)',
        transitionCompatibility: ['TEMP_HIGH', 'WET_HIGH', 'ARID_HIGH', 'HIGH_VOLC'],
        tones: [
            { id: 'HIGH_GRASS_01', hex: '#162018', role: 'deepShadow', tags: ['alpine_turf_shadow'] },
            { id: 'HIGH_GRASS_02', hex: '#273827', role: 'shadow', tags: ['alpine_turf_dark'] },
            { id: 'HIGH_GRASS_03', hex: '#3D523A', role: 'body', tags: ['alpine_turf_body'] },
            { id: 'HIGH_GRASS_04', hex: '#5B7353', role: 'light', tags: ['alpine_turf_lit'] },
            { id: 'HIGH_GRASS_05', hex: '#809C73', role: 'highlight', tags: ['alpine_turf_crest'] }
        ],
        notes: 'Tough blue-green alpine fescue. ZERO snow or frost cues.'
    },
    {
        rampId: 'HIGH_SOIL_STONY_LOAM',
        materialFamily: 'SOIL',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Thin rocky mountain soil, weathered gravelly upland dirt',
        forbiddenUsage: 'Deep rich garden loam',
        transitionCompatibility: ['TEMP_HIGH', 'HIGH_VOLC'],
        tones: [
            { id: 'HIGH_SOIL_01', hex: SHARED.AGED_WOOD_01, role: 'deepShadow', tags: ['mountain_soil_shadow'] },
            { id: 'HIGH_SOIL_02', hex: SHARED.AGED_WOOD_02, role: 'shadow', tags: ['mountain_soil_dark'] },
            { id: 'HIGH_SOIL_03', hex: '#4D4A3F', role: 'body', tags: ['mountain_soil_body'] },
            { id: 'HIGH_SOIL_04', hex: SHARED.WEATHERED_PALE_BODY, role: 'light', tags: ['mountain_soil_lit'] },
            { id: 'HIGH_SOIL_05', hex: '#938E7C', role: 'highlight', tags: ['mountain_soil_crest'] }
        ],
        notes: 'Thin gravelly mountain topsoil.'
    },
    {
        rampId: 'HIGH_GRAVEL_SCREE',
        materialFamily: 'STONE',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Angular rock scree, talus slopes, mountain trail footing',
        forbiddenUsage: 'Soft river sand',
        transitionCompatibility: ['TEMP_HIGH', 'ARID_HIGH', 'HIGH_VOLC'],
        tones: [
            { id: 'HIGH_SCREE_01', hex: SHARED.MUD_SLATE_CHIP, role: 'deepShadow', tags: ['scree_shadow'] },
            { id: 'HIGH_SCREE_02', hex: SHARED.DRESSED_STONE_02, role: 'shadow', tags: ['scree_dark'] },
            { id: 'HIGH_SCREE_03', hex: SHARED.DRESSED_STONE_03, role: 'body', tags: ['scree_body'] },
            { id: 'HIGH_SCREE_04', hex: SHARED.DRESSED_STONE_04, role: 'light', tags: ['scree_lit'] },
            { id: 'HIGH_SCREE_05', hex: SHARED.DRESSED_STONE_05, role: 'highlight', tags: ['scree_crest'] }
        ],
        notes: 'Angular grey rock chips and scree talus.'
    },
    {
        rampId: 'HIGH_STONE_GRANITE',
        materialFamily: 'STONE',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Fractured cold grey granite cliffs, mountain peaks, sheer vertical bluffs',
        forbiddenUsage: 'Soft yellow sandstone',
        transitionCompatibility: ['TEMP_HIGH', 'HIGH_VOLC'],
        tones: [
            { id: 'HIGH_GRANITE_01', hex: SHARED.COOL_SHADOW_01, role: 'deepShadow', tags: ['granite_deep'] },
            { id: 'HIGH_GRANITE_02', hex: '#30383E', role: 'shadow', tags: ['granite_dark'] },
            { id: 'HIGH_GRANITE_03', hex: '#4B555D', role: 'body', tags: ['granite_body'] },
            { id: 'HIGH_GRANITE_04', hex: '#6E7A85', role: 'light', tags: ['granite_lit'] },
            { id: 'HIGH_GRANITE_05', hex: '#97A3AF', role: 'highlight', tags: ['granite_crest'] }
        ],
        notes: 'Massive cold fractured grey granite bedrock.'
    },
    {
        rampId: 'HIGH_STONE_SLATE',
        materialFamily: 'STONE',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Dark cleft slate slabs, jagged mountain ridges, roofing tiles',
        forbiddenUsage: 'Volcanic pumice',
        transitionCompatibility: ['WET_HIGH', 'HIGH_VOLC'],
        tones: [
            { id: 'HIGH_SLATE_01', hex: SHARED.SLATE_DEEP, role: 'deepShadow', tags: ['slate_deep'] },
            { id: 'HIGH_SLATE_02', hex: SHARED.SLATE_SHADOW, role: 'shadow', tags: ['slate_dark'] },
            { id: 'HIGH_SLATE_03', hex: SHARED.SLATE_IRON_BODY, role: 'body', tags: ['slate_body'] },
            { id: 'HIGH_SLATE_04', hex: '#55636F', role: 'light', tags: ['slate_lit'] },
            { id: 'HIGH_SLATE_05', hex: '#758593', role: 'highlight', tags: ['slate_crest'] }
        ],
        notes: 'Dark cleft mountain slate.'
    },
    {
        rampId: 'HIGH_FOLIAGE_CONIFER',
        materialFamily: 'FOLIAGE',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Mountain pine needles, stunted alpine fir, wind-twisted krummholz',
        forbiddenUsage: 'Broadleaf oak canopy',
        transitionCompatibility: ['TEMP_HIGH'],
        tones: [
            { id: 'HIGH_CONIFER_01', hex: '#0F1F1D', role: 'deepShadow', tags: ['needle_shadow'] },
            { id: 'HIGH_CONIFER_02', hex: '#1B332D', role: 'shadow', tags: ['needle_dark'] },
            { id: 'HIGH_CONIFER_03', hex: '#2A4E43', role: 'body', tags: ['needle_body'] },
            { id: 'HIGH_CONIFER_04', hex: '#3E6E5D', role: 'light', tags: ['needle_lit'] },
            { id: 'HIGH_CONIFER_05', hex: '#5A927C', role: 'highlight', tags: ['needle_crest'] }
        ],
        notes: 'Deep blue-green needle foliage for mountain conifers.'
    },
    {
        rampId: 'HIGH_BARK_CONIFER',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['HIGH'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Mountain pine bark, resinous spruce trunks',
        forbiddenUsage: 'Birch white bark',
        transitionCompatibility: ['TEMP_HIGH'],
        tones: [
            { id: 'HIGH_BARK_01', hex: SHARED.BARK_DEEP, role: 'deepShadow', tags: ['pine_bark_shadow'] },
            { id: 'HIGH_BARK_02', hex: '#332922', role: 'shadow', tags: ['pine_bark_dark'] },
            { id: 'HIGH_BARK_03', hex: SHARED.BARK_DARK_BODY, role: 'body', tags: ['pine_bark_body'] },
            { id: 'HIGH_BARK_04', hex: SHARED.BARK_LIT_BODY, role: 'light', tags: ['pine_bark_lit'] },
            { id: 'HIGH_BARK_05', hex: '#947762', role: 'highlight', tags: ['pine_bark_crest'] }
        ],
        notes: 'Rough dark pine bark.'
    },

    // -------------------------------------------------------------------------
    // 6. VOLCANIC / ASHLAND
    // -------------------------------------------------------------------------
    {
        rampId: 'VOLC_ASH_DRIFT',
        materialFamily: 'SOIL',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Powdery dark ash drifts, barren volcanic flats, cinder plains',
        forbiddenUsage: 'Fertile green turf',
        transitionCompatibility: ['TEMP_VOLC', 'ARID_VOLC', 'HIGH_VOLC'],
        tones: [
            { id: 'VOLC_ASH_01', hex: '#161618', role: 'deepShadow', tags: ['ash_shadow'] },
            { id: 'VOLC_ASH_02', hex: '#27272B', role: 'shadow', tags: ['ash_dark'] },
            { id: 'VOLC_ASH_03', hex: '#3E3E44', role: 'body', tags: ['ash_body'] },
            { id: 'VOLC_ASH_04', hex: SHARED.DRESSED_STONE_03, role: 'light', tags: ['ash_lit'] },
            { id: 'VOLC_ASH_05', hex: '#7D7D88', role: 'highlight', tags: ['ash_crest'] }
        ],
        notes: 'Powdery grey-black volcanic ash.'
    },
    {
        rampId: 'VOLC_SOIL_SCORCHED',
        materialFamily: 'SOIL',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Heat-scorched earth, baked brown-black crust, geothermal clay',
        forbiddenUsage: 'Lush meadow lawns',
        transitionCompatibility: ['TEMP_VOLC', 'WET_VOLC'],
        tones: [
            { id: 'VOLC_SCORCH_01', hex: SHARED.DEEP_SCORCH_PEAT, role: 'deepShadow', tags: ['scorch_shadow'] },
            { id: 'VOLC_SCORCH_02', hex: SHARED.DARK_EARTH_02, role: 'shadow', tags: ['scorch_dark'] },
            { id: 'VOLC_SCORCH_03', hex: '#412A23', role: 'body', tags: ['scorch_body'] },
            { id: 'VOLC_SCORCH_04', hex: '#5E3C32', role: 'light', tags: ['scorch_lit'] },
            { id: 'VOLC_SCORCH_05', hex: '#805345', role: 'highlight', tags: ['scorch_crest'] }
        ],
        notes: 'Heat-baked dark scorched earth.'
    },
    {
        rampId: 'VOLC_STONE_BASALT',
        materialFamily: 'STONE',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Columnar basalt pillars, caldera crater rims, dark igneous rock',
        forbiddenUsage: 'Sandstone ledges',
        transitionCompatibility: ['HIGH_VOLC', 'ARID_VOLC'],
        tones: [
            { id: 'VOLC_BASALT_01', hex: '#101114', role: 'deepShadow', tags: ['basalt_deep'] },
            { id: 'VOLC_BASALT_02', hex: '#1D1E24', role: 'shadow', tags: ['basalt_dark'] },
            { id: 'VOLC_BASALT_03', hex: '#2F303A', role: 'body', tags: ['basalt_body'] },
            { id: 'VOLC_BASALT_04', hex: '#464754', role: 'light', tags: ['basalt_lit'] },
            { id: 'VOLC_BASALT_05', hex: '#636474', role: 'highlight', tags: ['basalt_crest'] }
        ],
        notes: 'Dark columnar basalt. Deep cool grey-black tone.'
    },
    {
        rampId: 'VOLC_STONE_SCORIA',
        materialFamily: 'STONE',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Vesicular scoria boulders, rough cinder rock, reddish-black volcanic slag',
        forbiddenUsage: 'Dressed ashlar masonry',
        transitionCompatibility: ['WET_VOLC'],
        tones: [
            { id: 'VOLC_SCORIA_01', hex: '#191113', role: 'deepShadow', tags: ['scoria_shadow'] },
            { id: 'VOLC_SCORIA_02', hex: '#2B1B1E', role: 'shadow', tags: ['scoria_dark'] },
            { id: 'VOLC_SCORIA_03', hex: '#44292E', role: 'body', tags: ['scoria_body'] },
            { id: 'VOLC_SCORIA_04', hex: '#623C43', role: 'light', tags: ['scoria_lit'] },
            { id: 'VOLC_SCORIA_05', hex: '#85545D', role: 'highlight', tags: ['scoria_crest'] }
        ],
        notes: 'Porous reddish-black scoria rock.'
    },
    {
        rampId: 'VOLC_STONE_PUMICE',
        materialFamily: 'STONE',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Pale porous pumice gravel, floating volcanic stone',
        forbiddenUsage: 'Dark obsidian',
        transitionCompatibility: ['TEMP_VOLC'],
        tones: [
            { id: 'VOLC_PUMICE_01', hex: SHARED.WARM_STONE_01, role: 'deepShadow', tags: ['pumice_shadow'] },
            { id: 'VOLC_PUMICE_02', hex: '#3E3B38', role: 'shadow', tags: ['pumice_dark'] },
            { id: 'VOLC_PUMICE_03', hex: '#605C56', role: 'body', tags: ['pumice_body'] },
            { id: 'VOLC_PUMICE_04', hex: '#878179', role: 'light', tags: ['pumice_lit'] },
            { id: 'VOLC_PUMICE_05', hex: SHARED.WARM_STONE_05, role: 'highlight', tags: ['pumice_crest'] }
        ],
        notes: 'Light grey-buff vesicular pumice stone.'
    },
    {
        rampId: 'VOLC_STONE_OBSIDIAN',
        materialFamily: 'STONE',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Glassy jet-black obsidian seams, razor-sharp knapped flakes',
        forbiddenUsage: 'Common fieldstones',
        transitionCompatibility: ['VOLC_HAZARD'],
        tones: [
            { id: 'VOLC_OBSIDIAN_01', hex: '#090A0D', role: 'deepShadow', tags: ['obsidian_deep'] },
            { id: 'VOLC_OBSIDIAN_02', hex: SHARED.VOID_OCCLUSION, role: 'shadow', tags: ['obsidian_dark'] },
            { id: 'VOLC_OBSIDIAN_03', hex: '#1F2430', role: 'body', tags: ['obsidian_body'] },
            { id: 'VOLC_OBSIDIAN_04', hex: '#353E52', role: 'light', tags: ['obsidian_lit'] },
            { id: 'VOLC_OBSIDIAN_05', hex: '#5E6A88', role: 'highlight', tags: ['obsidian_glint'] }
        ],
        notes: 'Vitreous volcanic glass with specular blue-grey edge glints.'
    },
    {
        rampId: 'VOLC_MINERAL_SULFUR',
        materialFamily: 'MINERAL',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Geothermal sulfur rims, yellow encrustations, acid fumarole lips',
        forbiddenUsage: 'Healthy meadow grass',
        transitionCompatibility: ['WET_VOLC'],
        tones: [
            { id: 'VOLC_SULFUR_01', hex: '#272810', role: 'deepShadow', tags: ['sulfur_shadow'] },
            { id: 'VOLC_SULFUR_02', hex: '#4A4C1C', role: 'shadow', tags: ['sulfur_dark'] },
            { id: 'VOLC_SULFUR_03', hex: '#777A29', role: 'body', tags: ['sulfur_body'] },
            { id: 'VOLC_SULFUR_04', hex: '#ABAE39', role: 'light', tags: ['sulfur_lit'] },
            { id: 'VOLC_SULFUR_05', hex: '#DEDF5E', role: 'highlight', tags: ['sulfur_crest'] }
        ],
        notes: 'Vibrant yellow-green sulfur crust.'
    },
    {
        rampId: 'VOLC_WOOD_CHARRED',
        materialFamily: 'WOOD_BARK',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Burned timber, charred snags, campfire charcoal remains',
        forbiddenUsage: 'Healthy growing foliage',
        transitionCompatibility: ['TEMP_VOLC'],
        tones: [
            { id: 'VOLC_CHAR_01', hex: '#0F0E0E', role: 'deepShadow', tags: ['charcoal_shadow'] },
            { id: 'VOLC_CHAR_02', hex: SHARED.AGED_WOOD_01, role: 'shadow', tags: ['charcoal_dark'] },
            { id: 'VOLC_CHAR_03', hex: '#2F2A28', role: 'body', tags: ['charcoal_body'] },
            { id: 'VOLC_CHAR_04', hex: '#463E3B', role: 'light', tags: ['charcoal_lit'] },
            { id: 'VOLC_CHAR_05', hex: '#635753', role: 'highlight', tags: ['charcoal_crest'] }
        ],
        notes: 'Charred deadwood and charcoal.'
    },
    {
        rampId: 'VOLC_LAVA_HAZARD',
        materialFamily: 'LAVA',
        biomeAffinity: ['VOLC'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Active molten lava hazard channels, bubbling magma pools (STRICTLY LOCAL ACCENT)',
        forbiddenUsage: 'Full-screen wallpaper flooding (HARD RULE: lava is an accent/hazard only)',
        transitionCompatibility: ['HAZARD_ONLY'],
        tones: [
            { id: 'VOLC_LAVA_01', hex: '#300705', role: 'deepShadow', tags: ['crust_boundary'] },
            { id: 'VOLC_LAVA_02', hex: '#6D1109', role: 'shadow', tags: ['cooling_flow'] },
            { id: 'VOLC_LAVA_03', hex: '#B5280D', role: 'body', tags: ['active_magma'] },
            { id: 'VOLC_LAVA_04', hex: '#F26018', role: 'light', tags: ['incandescent_core'] },
            { id: 'VOLC_LAVA_05', hex: '#FFB833', role: 'highlight', tags: ['white_hot_crest'] }
        ],
        notes: 'Incandescent molten lava. Strictly reserved for dangerous thermal nodes.'
    },

    // -------------------------------------------------------------------------
    // 7. WATER
    // -------------------------------------------------------------------------
    {
        rampId: 'WATER_SHALLOW_CLEAR',
        materialFamily: 'WATER',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Sunlit lake shallows, clear stream margins, pebble shoreline fringe',
        forbiddenUsage: 'Murky swamp sumps',
        transitionCompatibility: ['TEMP_WET', 'ALL'],
        tones: [
            { id: 'WATER_SHALLOW_01', hex: '#162A36', role: 'deepShadow', tags: ['shallow_recess'] },
            { id: 'WATER_SHALLOW_02', hex: SHARED.WATER_CORE_BLUE, role: 'shadow', tags: ['shallow_dark'] },
            { id: 'WATER_SHALLOW_03', hex: '#356782', role: 'body', tags: ['shallow_body'] },
            { id: 'WATER_SHALLOW_04', hex: '#4F8FB2', role: 'light', tags: ['shallow_lit'] },
            { id: 'WATER_SHALLOW_05', hex: '#7BC0E3', role: 'highlight', tags: ['shallow_glint'] }
        ],
        notes: 'Clean transparent shallow freshwater.'
    },
    {
        rampId: 'WATER_DEEP_FRESH',
        materialFamily: 'WATER',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Deep freshwater rivers, lake basins, subterranean aquifers',
        forbiddenUsage: 'Acid fumarole pools',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'WATER_DEEP_01', hex: '#0F1B26', role: 'deepShadow', tags: ['deep_water_abyss'] },
            { id: 'WATER_DEEP_02', hex: '#172C3D', role: 'shadow', tags: ['deep_water_dark'] },
            { id: 'WATER_DEEP_03', hex: SHARED.WATER_CORE_BLUE, role: 'body', tags: ['deep_water_body'] },
            { id: 'WATER_DEEP_04', hex: '#356182', role: 'light', tags: ['deep_water_lit'] },
            { id: 'WATER_DEEP_05', hex: '#5289B0', role: 'highlight', tags: ['deep_water_crest'] }
        ],
        notes: 'Deep canonical freshwater blue-teal.'
    },
    {
        rampId: 'WATER_MURKY_WETLAND',
        materialFamily: 'WATER',
        biomeAffinity: ['WET'],
        sharedAcrossBiomes: false,
        preferredUsage: 'Tannin-stained wetland pools, stagnant swamp channels, slow marsh creeks',
        forbiddenUsage: 'Mountain cascade torrents',
        transitionCompatibility: ['TEMP_WET'],
        tones: [
            { id: 'WATER_MURK_01', hex: '#141B18', role: 'deepShadow', tags: ['murk_abyss'] },
            { id: 'WATER_MURK_02', hex: '#202B24', role: 'shadow', tags: ['murk_dark'] },
            { id: 'WATER_MURK_03', hex: '#2F4035', role: 'body', tags: ['murk_body'] },
            { id: 'WATER_MURK_04', hex: '#435A4B', role: 'light', tags: ['murk_lit'] },
            { id: 'WATER_MURK_05', hex: '#5D7C68', role: 'highlight', tags: ['murk_crest'] }
        ],
        notes: 'Tannin-stained slow wetland water with olive-drab undertone.'
    },
    {
        rampId: 'WATER_FOAM_RAPIDS',
        materialFamily: 'WATER',
        biomeAffinity: ['HIGH', 'UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Mountain stream white-water, cascade splash, rapids, shoreline foam',
        forbiddenUsage: 'Stagnant bog pools',
        transitionCompatibility: ['WET_HIGH', 'TEMP_HIGH'],
        tones: [
            { id: 'WATER_FOAM_01', hex: '#304859', role: 'deepShadow', tags: ['foam_recess'] },
            { id: 'WATER_FOAM_02', hex: '#4C6E85', role: 'shadow', tags: ['foam_shadow'] },
            { id: 'WATER_FOAM_03', hex: '#7297B2', role: 'body', tags: ['foam_body'] },
            { id: 'WATER_FOAM_04', hex: '#A5C5DC', role: 'light', tags: ['foam_lit'] },
            { id: 'WATER_FOAM_05', hex: '#E2EFF8', role: 'highlight', tags: ['foam_spray'] }
        ],
        notes: 'Frothy aerated water for waterfalls and rapids.'
    },

    // -------------------------------------------------------------------------
    // 8. CONSTRUCTION / SHARED MATERIALS
    // -------------------------------------------------------------------------
    {
        rampId: 'CONSTRUCT_TIMBER_FRESH',
        materialFamily: 'CONSTRUCTION',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Fresh sawn lumber, wooden workbenches, settlement palisades, door frames',
        forbiddenUsage: 'Sun-bleached desert snags',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'TIMBER_FRESH_01', hex: '#281D13', role: 'deepShadow', tags: ['timber_recess'] },
            { id: 'TIMBER_FRESH_02', hex: '#49331E', role: 'shadow', tags: ['timber_shadow'] },
            { id: 'TIMBER_FRESH_03', hex: '#734F2D', role: 'body', tags: ['timber_body'] },
            { id: 'TIMBER_FRESH_04', hex: '#A2713F', role: 'light', tags: ['timber_lit'] },
            { id: 'TIMBER_FRESH_05', hex: '#D0995C', role: 'highlight', tags: ['timber_crest'] }
        ],
        notes: 'Warm fresh sawn timber for newly built structures and carpentry.'
    },
    {
        rampId: 'CONSTRUCT_TIMBER_AGED',
        materialFamily: 'CONSTRUCTION',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Weathered grey timber walls, old fencing, village roofing shingles',
        forbiddenUsage: 'Fresh golden lumber',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'TIMBER_AGED_01', hex: SHARED.AGED_WOOD_01, role: 'deepShadow', tags: ['aged_wood_shadow'] },
            { id: 'TIMBER_AGED_02', hex: SHARED.AGED_WOOD_02, role: 'shadow', tags: ['aged_wood_dark'] },
            { id: 'TIMBER_AGED_03', hex: '#4D463D', role: 'body', tags: ['aged_wood_body'] },
            { id: 'TIMBER_AGED_04', hex: '#6E6457', role: 'light', tags: ['aged_wood_lit'] },
            { id: 'TIMBER_AGED_05', hex: '#938676', role: 'highlight', tags: ['aged_wood_crest'] }
        ],
        notes: 'Weathered grey-brown structural posts and roofing.'
    },
    {
        rampId: 'CONSTRUCT_STONE_DRESSED',
        materialFamily: 'CONSTRUCTION',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Cut ashlar stone masonry, fortress foundations, stone hearths, paved roads',
        forbiddenUsage: 'Rough natural caves',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'STONE_DRESSED_01', hex: SHARED.MUD_SLATE_CHIP, role: 'deepShadow', tags: ['mortar_recess'] },
            { id: 'STONE_DRESSED_02', hex: SHARED.DRESSED_STONE_02, role: 'shadow', tags: ['ashlar_dark'] },
            { id: 'STONE_DRESSED_03', hex: SHARED.DRESSED_STONE_03, role: 'body', tags: ['ashlar_body'] },
            { id: 'STONE_DRESSED_04', hex: SHARED.DRESSED_STONE_04, role: 'light', tags: ['ashlar_lit'] },
            { id: 'STONE_DRESSED_05', hex: SHARED.DRESSED_STONE_05, role: 'highlight', tags: ['ashlar_crest'] }
        ],
        notes: 'Formal dressed ashlar stone blocks for human and dwarven architecture.'
    },
    {
        rampId: 'CONSTRUCT_METAL_IRON',
        materialFamily: 'CONSTRUCTION',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Wrought iron hinges, metal reinforcing bands, anvil bodies, weapons, nails',
        forbiddenUsage: 'Wood planking',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'METAL_IRON_01', hex: SHARED.VOID_OCCLUSION, role: 'deepShadow', tags: ['iron_shadow'] },
            { id: 'METAL_IRON_02', hex: '#252B30', role: 'shadow', tags: ['iron_dark'] },
            { id: 'METAL_IRON_03', hex: SHARED.SLATE_IRON_BODY, role: 'body', tags: ['iron_body'] },
            { id: 'METAL_IRON_04', hex: '#606D78', role: 'light', tags: ['iron_lit'] },
            { id: 'METAL_IRON_05', hex: '#8C9DA9', role: 'highlight', tags: ['steel_glint'] }
        ],
        notes: 'Forged iron and weapon steel neutral ramp.'
    },
    {
        rampId: 'CONSTRUCT_FABRIC_LEATHER',
        materialFamily: 'CONSTRUCTION',
        biomeAffinity: ['UNIVERSAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Tanned hide bedding, market stall canvas, sacks, leather straps',
        forbiddenUsage: 'Hard stone',
        transitionCompatibility: ['ALL'],
        tones: [
            { id: 'FABRIC_LEATHER_01', hex: SHARED.DARK_EARTH_02, role: 'deepShadow', tags: ['leather_shadow'] },
            { id: 'FABRIC_LEATHER_02', hex: '#423023', role: 'shadow', tags: ['leather_dark'] },
            { id: 'FABRIC_LEATHER_03', hex: '#674A35', role: 'body', tags: ['leather_body'] },
            { id: 'FABRIC_LEATHER_04', hex: '#91694A', role: 'light', tags: ['leather_lit'] },
            { id: 'FABRIC_LEATHER_05', hex: '#BA8C66', role: 'highlight', tags: ['leather_crest'] }
        ],
        notes: 'Tanned leather and canvas neutral ramp for world props.'
    },

    // -------------------------------------------------------------------------
    // 9. RESERVED SUPERNATURAL / VFX
    // -------------------------------------------------------------------------
    {
        rampId: 'MAGIC_DIVINE_GOLD',
        materialFamily: 'SUPERNATURAL',
        biomeAffinity: ['SPECIAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Holy radiant spells, divine miracles, sunburst symbols, celestial aura',
        forbiddenUsage: 'Mundane dirt roads',
        transitionCompatibility: ['VFX_ONLY'],
        tones: [
            { id: 'MAGIC_GOLD_01', hex: '#3B2905', role: 'deepShadow', tags: ['divine_deep'] },
            { id: 'MAGIC_GOLD_02', hex: '#78540D', role: 'shadow', tags: ['divine_shadow'] },
            { id: 'MAGIC_GOLD_03', hex: '#BE891B', role: 'body', tags: ['divine_body'] },
            { id: 'MAGIC_GOLD_04', hex: '#F7C03D', role: 'light', tags: ['divine_lit'] },
            { id: 'MAGIC_GOLD_05', hex: '#FFF2A3', role: 'highlight', tags: ['radiant_core'] }
        ],
        notes: 'Radiant gold divine magic spectrum.'
    },
    {
        rampId: 'MAGIC_ARCANE_CYAN',
        materialFamily: 'SUPERNATURAL',
        biomeAffinity: ['SPECIAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Arcane glyphs, wizard missile trails, crystalline energy, moongate vortex',
        forbiddenUsage: 'Ordinary lake water',
        transitionCompatibility: ['VFX_ONLY'],
        tones: [
            { id: 'MAGIC_CYAN_01', hex: '#062B33', role: 'deepShadow', tags: ['arcane_deep'] },
            { id: 'MAGIC_CYAN_02', hex: '#0F5969', role: 'shadow', tags: ['arcane_shadow'] },
            { id: 'MAGIC_CYAN_03', hex: '#1C95AD', role: 'body', tags: ['arcane_body'] },
            { id: 'MAGIC_CYAN_04', hex: '#3DD4F2', role: 'light', tags: ['arcane_lit'] },
            { id: 'MAGIC_CYAN_05', hex: '#A8F3FF', role: 'highlight', tags: ['arcane_core'] }
        ],
        notes: 'Electric arcane cyan energy spectrum.'
    },
    {
        rampId: 'MAGIC_ASTRAL_VIOLET',
        materialFamily: 'SUPERNATURAL',
        biomeAffinity: ['SPECIAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Astral rifts, nether magic, eldritch wardings, shadow curses',
        forbiddenUsage: 'Common flora',
        transitionCompatibility: ['VFX_ONLY'],
        tones: [
            { id: 'MAGIC_VIOLET_01', hex: '#220C30', role: 'deepShadow', tags: ['astral_deep'] },
            { id: 'MAGIC_VIOLET_02', hex: '#4A1E69', role: 'shadow', tags: ['astral_shadow'] },
            { id: 'MAGIC_VIOLET_03', hex: '#8239B5', role: 'body', tags: ['astral_body'] },
            { id: 'MAGIC_VIOLET_04', hex: '#BE65FA', role: 'light', tags: ['astral_lit'] },
            { id: 'MAGIC_VIOLET_05', hex: '#E6BAFF', role: 'highlight', tags: ['astral_core'] }
        ],
        notes: 'Astral and eldritch purple spectrum.'
    },
    {
        rampId: 'MAGIC_HEALING_EMERALD',
        materialFamily: 'SUPERNATURAL',
        biomeAffinity: ['SPECIAL'],
        sharedAcrossBiomes: true,
        preferredUsage: 'Druidic nature magic, potent restoration auras, enchanted spring glints',
        forbiddenUsage: 'Ordinary lawn grass',
        transitionCompatibility: ['VFX_ONLY'],
        tones: [
            { id: 'MAGIC_EMERALD_01', hex: '#0A2E16', role: 'deepShadow', tags: ['nature_magic_deep'] },
            { id: 'MAGIC_EMERALD_02', hex: '#165C2F', role: 'shadow', tags: ['nature_magic_shadow'] },
            { id: 'MAGIC_EMERALD_03', hex: '#269E51', role: 'body', tags: ['nature_magic_body'] },
            { id: 'MAGIC_EMERALD_04', hex: '#4EE085', role: 'light', tags: ['nature_magic_lit'] },
            { id: 'MAGIC_EMERALD_05', hex: '#ADFFD0', role: 'highlight', tags: ['nature_magic_core'] }
        ],
        notes: 'Supernatural high-saturation emerald healing aura.'
    }
];

// -----------------------------------------------------------------------------
// HORIZONTAL TRANSITION BRIDGES (ALL 10 PAIRS FROM DW.01.04)
// -----------------------------------------------------------------------------
const TRANSITION_BRIDGES = {
    'TEMP_WET': {
        primaryBridgeRamps: ['TEMP_GRASS_FERTILE', 'WET_GRASS_SATURATED', 'WET_REED_RUSH', 'TEMP_SOIL_LOAM', 'WET_SOIL_PEAT'],
        bridgeTones: ['#26421C', '#203320', '#3B2E25', '#57422C', '#6C935D'],
        notes: 'Transition from lush loam meadow to spongy peat marsh and upright reed beds'
    },
    'TEMP_ARID': {
        primaryBridgeRamps: ['TEMP_GRASS_DRY', 'ARID_GRASS_BUNCHGRASS', 'TEMP_SOIL_LOAM', 'ARID_SOIL_HARDPAN'],
        bridgeTones: ['#353C20', '#473E24', '#7C6142', '#77634A', '#B1B26C'],
        notes: 'Transition from fertile loam hills to sun-baked steppe flats and hardpan caliche'
    },
    'TEMP_HIGH': {
        primaryBridgeRamps: ['TEMP_GRASS_DRY', 'HIGH_GRASS_ALPINE', 'TEMP_STONE_FIELDSTONE', 'HIGH_STONE_GRANITE'],
        bridgeTones: ['#273827', '#3D523A', '#59594F', '#4B555D', '#6E7A85'],
        notes: 'Transition from gentle valley meadows to rugged scree slopes and granite cliffs'
    },
    'TEMP_VOLC': {
        primaryBridgeRamps: ['TEMP_GRASS_DRY', 'VOLC_SOIL_SCORCHED', 'VOLC_ASH_DRIFT', 'TEMP_BARK_OAK', 'VOLC_WOOD_CHARRED'],
        bridgeTones: ['#353C20', '#261D18', '#3E3E44', SHARED.BARK_DARK_BODY, '#2F2A28'],
        notes: 'Transition from verdant forest margins to scorched perimeter and ash plain'
    },
    'WET_ARID': {
        primaryBridgeRamps: ['WET_REED_RUSH', 'ARID_GRASS_BUNCHGRASS', 'WET_MUD_ANAEROBIC', 'ARID_SOIL_HARDPAN', 'ARID_BONE_CALICHE'],
        bridgeTones: ['#445427', '#473E24', '#323536', '#77634A', '#888170'],
        notes: 'Terminal evaporative basin: drying mud playa with sparse spiky straw'
    },
    'WET_HIGH': {
        primaryBridgeRamps: ['WET_GRASS_SATURATED', 'HIGH_GRASS_ALPINE', 'WET_STONE_DAMP_SLATE', 'HIGH_STONE_SLATE', 'WATER_FOAM_RAPIDS'],
        bridgeTones: [SHARED.SLATE_SHADOW, '#273827', '#37464F', '#4E626E', '#7297B2'],
        notes: 'Steep mountain gorge transitioning down to wetlands'
    },
    'WET_VOLC': {
        primaryBridgeRamps: ['WET_MUD_ANAEROBIC', 'VOLC_SOIL_SCORCHED', 'VOLC_MINERAL_SULFUR', 'VOLC_STONE_SCORIA'],
        bridgeTones: [SHARED.MUD_SLATE_CHIP, '#412A23', '#4A4C1C', '#44292E', '#777A29'],
        notes: 'Geothermal marsh with hot sulfur springs and scalding mudpots'
    },
    'ARID_HIGH': {
        primaryBridgeRamps: ['ARID_GRASS_BUNCHGRASS', 'HIGH_GRASS_ALPINE', 'ARID_STONE_SANDSTONE', 'HIGH_STONE_GRANITE'],
        bridgeTones: ['#473E24', '#3D523A', '#834A34', '#4B555D', '#9C8449'],
        notes: 'Rain-shadow mountain flanks and high arid passes'
    },
    'ARID_VOLC': {
        primaryBridgeRamps: ['ARID_SOIL_HARDPAN', 'VOLC_ASH_DRIFT', 'ARID_STONE_SANDSTONE', 'VOLC_STONE_BASALT'],
        bridgeTones: ['#4F4232', '#27272B', '#583224', '#2F303A', '#834A34'],
        notes: 'Tectonic fault scarps and dark volcanic escarpments'
    },
    'HIGH_VOLC': {
        primaryBridgeRamps: ['HIGH_STONE_GRANITE', 'VOLC_STONE_BASALT', 'HIGH_GRAVEL_SCREE', 'VOLC_ASH_DRIFT'],
        bridgeTones: ['#30383E', '#1D1E24', SHARED.DRESSED_STONE_03, '#3E3E44', '#6E7A85'],
        notes: 'High volcanic peaks, active fumaroles, and jagged caldera crests'
    }
};

// -----------------------------------------------------------------------------
// VALUE HIERARCHY SPECIFICATION
// -----------------------------------------------------------------------------
const VALUE_HIERARCHY = {
    ground: {
        role: 'Lowest contrast, quiet negative space for tactical gameplay and readability',
        minLuminance: 5.0,
        maxLuminance: 68.0,
        maxDeltaLuminancePerTile: 35.0,
        guidance: 'Ground tiles must not compete with entities; avoid jarring 1-pixel high-contrast speckles.'
    },
    vegetationProps: {
        role: 'Moderate contrast, distinct silhouettes, organic clustering',
        minLuminance: 7.0,
        maxLuminance: 75.0,
        maxDeltaLuminancePerTile: 50.0,
        guidance: 'Foliage and props use clear shadow masses and restrained rim highlights.'
    },
    characters: {
        role: 'Clear separation from ground and vegetation, prioritized readability',
        minLuminance: 5.0,
        maxLuminance: 85.0,
        maxDeltaLuminancePerTile: 65.0,
        guidance: 'Characters maintain distinctive silhouettes, local contrast, and readable equipment.'
    },
    interactiveObjects: {
        role: 'High readability, distinct highlights, interactive affordance',
        minLuminance: 5.0,
        maxLuminance: 90.0,
        maxDeltaLuminancePerTile: 70.0,
        guidance: 'Chests, doors, levers, and items pop against ground backgrounds.'
    },
    supernaturalVFX: {
        role: 'Highest selective saturation, full-range contrast, incandescent luminance',
        minLuminance: 5.0,
        maxLuminance: 98.0,
        maxDeltaLuminancePerTile: 85.0,
        guidance: 'Reserved exclusively for spells, divine miracles, and molten lava hazard nodes.'
    }
};

// -----------------------------------------------------------------------------
// COLOR BUDGET GUIDELINES (POLICY: NO ARBITRARY 32-COLOR CAP PER PACKED SHEET)
// -----------------------------------------------------------------------------
const COLOR_BUDGETS = {
    simpleClutter: {
        assetClass: 'Simple Clutter / Small Debris',
        typicalTones: '3–6 colors',
        maxUniqueColors: 6,
        guidance: 'Small pebbles, single mushrooms, leaf piles, loose bones.'
    },
    commonWorldProp: {
        assetClass: 'Common World Prop',
        typicalTones: '4–8 colors',
        maxUniqueColors: 8,
        guidance: 'Barrels, crates, small boulders, market stalls, bushes.'
    },
    treeLargeVegetation: {
        assetClass: 'Tree / Large Vegetation Family',
        typicalTones: '6–12 colors',
        maxUniqueColors: 14,
        guidance: 'Combines 1 bark ramp (3-5 tones) + 1-2 foliage ramps (4-6 tones).'
    },
    complexStructure: {
        assetClass: 'Complex Structural Material / Workshop',
        typicalTones: '8–16 colors',
        maxUniqueColors: 20,
        guidance: 'Multi-material architectural units combining timber, masonry, iron, and thatch.'
    },
    fullPackedTilesetSheet: {
        assetClass: 'Full Packed Tileset Sheet (A1-A5, B-E)',
        typicalTones: 'CONTAINER UNION (No Arbitrary Sheet-Wide Cap)',
        maxUniqueColors: null,
        guidance: 'A packed tileset sheet is a container holding multiple materials. NO arbitrary 32 or 64 total cap applies. All pixels must adhere to constituent ramps and the Master Palette.'
    }
};

// -----------------------------------------------------------------------------
// COMPILATION AND AUDIT ENGINE
// -----------------------------------------------------------------------------
function compileRegistry() {
    const masterColors = {};
    const hexToIdMap = new Map();
    const ramps = {};

    let totalRampTones = 0;

    for (const def of RAMP_DEFINITIONS) {
        const rampColors = [];
        const hexColors = [];
        const toneRoles = [];

        let prevLuminance = -1;

        for (let i = 0; i < def.tones.length; i++) {
            const tone = def.tones[i];
            const hex = tone.hex.toUpperCase();
            const rgb = hexToRgb(hex);
            const lum = getLuminance(rgb.r, rgb.g, rgb.b);

            // Monotonicity verification
            if (lum < prevLuminance) {
                console.warn(`WARNING: Ramp ${def.rampId} tone ${tone.id} luminance (${lum}) is less than previous (${prevLuminance})`);
            }
            prevLuminance = lum;

            if (hexToIdMap.has(hex)) {
                // Shared master color reused across ramps
                const existingId = hexToIdMap.get(hex);
                rampColors.push(existingId);
                hexColors.push(hex);
                toneRoles.push(tone.role);
                // merge tags
                if (tone.tags) {
                    for (const t of tone.tags) {
                        if (!masterColors[existingId].tags.includes(t)) {
                            masterColors[existingId].tags.push(t);
                        }
                    }
                }
            } else {
                // New master color entry
                const colorEntry = {
                    colorId: tone.id,
                    hex: hex,
                    r: rgb.r,
                    g: rgb.g,
                    b: rgb.b,
                    luminance: lum,
                    tags: tone.tags || []
                };
                masterColors[tone.id] = colorEntry;
                hexToIdMap.set(hex, tone.id);
                rampColors.push(tone.id);
                hexColors.push(hex);
                toneRoles.push(tone.role);
            }
            totalRampTones++;
        }

        ramps[def.rampId] = {
            rampId: def.rampId,
            materialFamily: def.materialFamily,
            biomeAffinity: def.biomeAffinity,
            sharedAcrossBiomes: def.sharedAcrossBiomes,
            preferredUsage: def.preferredUsage,
            forbiddenUsage: def.forbiddenUsage,
            transitionCompatibility: def.transitionCompatibility,
            colorCount: def.tones.length,
            colorIds: rampColors,
            hexColors: hexColors,
            toneRoles: toneRoles,
            notes: def.notes
        };
    }

    // Check near duplicates among master colors (dist < 4)
    const masterList = Object.values(masterColors);
    const nearDuplicates = [];
    for (let i = 0; i < masterList.length; i++) {
        for (let j = i + 1; j < masterList.length; j++) {
            const dist = colorDistance(masterList[i], masterList[j]);
            if (dist < 4.0) {
                nearDuplicates.push({
                    c1: masterList[i].colorId,
                    c2: masterList[j].colorId,
                    hex1: masterList[i].hex,
                    hex2: masterList[j].hex,
                    distance: Math.round(dist * 10) / 10
                });
            }
        }
    }

    const registry = {
        version: '1.0.0',
        documentId: 'DEUS-PALETTE-REGISTRY-01',
        task: 'DW.01.05',
        title: 'DEUS Canonical World Palette Architecture & Material Ramps Registry',
        canonicalCeiling: 256,
        masterColorCount: masterList.length,
        totalRampsCount: Object.keys(ramps).length,
        totalRampSlotsCount: totalRampTones,
        nearDuplicatesReport: nearDuplicates,
        policy: {
            sheetCapPolicy: 'NO ARBITRARY 32-COLOR CAP PER PACKED TILESET SHEET. Tileset sheets are containers containing the union of multiple material ramps.',
            enforcementLevel: 'Color discipline is enforced at Material Family and Individual Asset level.',
            pixelDensityRule: 'Author at 1:1 Native Resolution; draw strictly from canonical material ramps and Master Palette.'
        },
        valueHierarchy: VALUE_HIERARCHY,
        colorBudgets: COLOR_BUDGETS,
        transitionBridges: TRANSITION_BRIDGES,
        ramps: ramps,
        masterColors: masterColors
    };

    return { registry, masterList };
}

// -----------------------------------------------------------------------------
// MAIN EXECUTION & FILE WRITING
// -----------------------------------------------------------------------------
const { registry, masterList } = compileRegistry();

const GAME_OUT = path.resolve(__dirname, '..', 'game', 'data', 'DEUS_PaletteRegistry.json');
const DOCS_OUT = path.resolve(__dirname, '..', 'docs', 'art', 'DEUS_PaletteRegistry.json');
const HEX_OUT = path.resolve(__dirname, '..', 'art', 'palette', 'deus_master_world_palette_v1.hex');

fs.writeFileSync(GAME_OUT, JSON.stringify(registry, null, 2), 'utf8');
fs.writeFileSync(DOCS_OUT, JSON.stringify(registry, null, 2), 'utf8');

// Write HEX file
const hexLines = masterList.map(c => c.hex);
fs.writeFileSync(HEX_OUT, hexLines.join('\n') + '\n', 'utf8');

console.log(`=== DEUS PALETTE REGISTRY COMPILED (DW.01.05) ===`);
console.log(`Master Palette Unique Colors: ${registry.masterColorCount} (Ceiling: 256)`);
console.log(`Total Material Ramps:         ${registry.totalRampsCount}`);
console.log(`Near-Duplicates (<4 RGB dist): ${registry.nearDuplicatesReport.length}`);
console.log(`Written to:`);
console.log(`  - ${GAME_OUT}`);
console.log(`  - ${DOCS_OUT}`);
console.log(`  - ${HEX_OUT}`);
