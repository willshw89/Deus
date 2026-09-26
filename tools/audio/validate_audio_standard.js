"use strict";

// Name-and-size inventory only. This file must not read, decode, play, or write audio bytes.

const fs = require("fs");
const path = require("path");

const STEM_RE = /^[a-z][a-z0-9]*_[a-z0-9]+(-[a-z0-9]+)*_[a-z0-9]+(-[a-z0-9]+)*_01$/;
const EVENT_ID_RE = /^[a-z][a-z0-9]*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;
const FOLDERS = ["bgm", "bgs", "me", "se"];
const SECTION = {
    GLOBAL: "global",
    FOLDER: "folder",
    FOOT: "foot",
    HIT: "hit",
    SPELL: "spell",
    WPN: "weapon",
    WORK: "work",
    VOCAL: "vocal",
    AMB: "ambient",
    UI: "ui",
    MUSIC: "music",
    ATTEN: "attenuation",
    VALID: "validator"
};
const AXIS_FIELD = {
    surface: "surface",
    gait: "gait",
    damageType: "damageType",
    hitMaterial: "hitMaterial",
    outcome: "hitOutcome",
    school: "spellSchool",
    shape: "deliveryShape",
    phase: "phase",
    extra: "spellExtra",
    biome: "biome",
    depth: "depthBand",
    weather: "weather",
    season: "season",
    action: "workAction",
    group: "weaponGroup",
    creatureType: "creatureType",
    race: "race",
    call: "vocalCall",
    emote: "emote",
    state: "musicState",
    role: "stemRole"
};
const ENUM_FIELD = {
    damageType: ["damageTypes", "unknown-damage-type"],
    spellSchool: ["spellSchools", "unknown-spell-school"],
    biome: ["biomes", "unknown-biome"],
    depthBand: ["depthBands", "unknown-depth-band"],
    weather: ["weathers", "unknown-weather"],
    season: ["seasons", "unknown-season"],
    surface: ["surfaces", "unknown-surface"],
    gait: ["gaits", "unknown-gait"],
    creatureType: ["creatureTypes", "unknown-creature-type"],
    race: ["races", "unknown-race"],
    deliveryShape: ["deliveryShapes", "unknown-delivery-shape"],
    weaponGroup: ["weaponGroups", "unknown-weapon-group"],
    workAction: ["workActions", "unknown-work-action"],
    phase: ["phases", "unknown-phase"],
    hitMaterial: ["hitMaterials", "unknown-hit-material"],
    hitOutcome: ["hitOutcomes", "unknown-hit-outcome"],
    spellExtra: ["spellExtras", "unknown-spell-extra"],
    vocalCall: ["vocalCalls", "unknown-vocal-call"],
    emote: ["emotes", "unknown-emote"],
    musicState: ["musicStates", "unknown-music-state"],
    stemRole: ["stemRoles", "unknown-stem-role"]
};

const CANONICAL = {
    damageTypes: ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"],
    spellSchools: ["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"],
    biomes: ["volcanic", "wet", "arid", "temperate", "cold", "wild"],
    depthBands: ["deep-earth", "caverns", "lowlands", "uplands", "highlands"],
    weathers: ["clear", "rain", "storm", "snow", "fog", "wind"],
    engineWeather: ["clear", "overcast", "rain", "downpour", "snow", "blizzard", "heatwave", "coldsnap"],
    seasons: ["spring", "summer", "autumn", "winter"],
    surfaces: ["stone", "dirt", "grass", "sand", "snow", "ice", "mud", "wood", "metal", "water-shallow", "water-deep", "gravel", "ash", "volcanic-rock", "litter"],
    gaits: ["walk", "run", "sneak"],
    sizes: ["tiny", "small", "medium", "large", "huge", "gargantuan"],
    creatureTypes: ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"],
    races: ["dwarf", "elf", "halfling", "human", "dragonborn", "gnome", "half-elf", "half-orc", "tiefling"],
    vocalCalls: ["idle", "alert", "attack", "hurt", "death"],
    emotes: ["exclamation", "question", "music", "heart", "anger", "sweat", "cobweb", "silence", "idea", "sleep"],
    hitMaterials: ["flesh", "armor-light", "armor-medium", "armor-heavy", "shield", "stone", "wood"],
    hitOutcomes: ["miss", "parry", "block-shield", "block-weapon"],
    deliveryShapes: ["bolt", "beam", "cone", "line", "burst", "cylinder", "aura", "touch", "instant"],
    spellPhases: ["cast", "delivery", "impact", "linger"],
    spellExtras: ["concentration", "fizzle", "dispel"],
    phases: ["cast", "delivery", "impact", "linger", "windup", "action", "recover", "draw", "loose", "aim", "fire", "release", "start", "loop", "stop"],
    weaponGroups: ["swing", "thrust", "draw-loose", "crossbow", "thrown", "reload"],
    weaponPhases: {
        swing: ["windup", "action", "recover"],
        thrust: ["windup", "action", "recover"],
        "draw-loose": ["draw", "loose"],
        crossbow: ["aim", "fire"],
        thrown: ["windup", "release"],
        reload: ["start", "loop", "stop"]
    },
    workActions: ["hammer", "saw", "chop", "dig", "mine", "stir", "carry", "kneel", "forge", "loom", "mill"],
    workPhases: ["start", "loop", "stop"],
    musicStates: ["peace", "tension", "combat", "victory", "defeat", "night", "underground", "festival"],
    stemRoles: ["full", "bed", "percussion", "motif"],
    stingers: ["me.combat.enter", "me.victory.stinger", "me.defeat.stinger", "me.festival.stinger"],
    uiEvents: [
        "ui.system.cursor", "ui.system.ok", "ui.system.cancel", "ui.system.buzzer", "ui.system.equip",
        "ui.system.save", "ui.system.load", "ui.system.battle-start", "ui.system.escape",
        "ui.system.enemy-attack", "ui.system.enemy-damage", "ui.system.enemy-collapse",
        "ui.system.boss-collapse-1", "ui.system.boss-collapse-2", "ui.system.actor-damage",
        "ui.system.actor-collapse", "ui.system.recovery", "ui.system.evasion", "ui.system.magic-evasion",
        "ui.system.reflection", "ui.system.shop", "ui.system.use-item", "ui.system.use-skill",
        "ui.menu.open", "ui.menu.close", "ui.alert.notification", "ui.alert.raid", "ui.alert.fire",
        "ui.alert.death", "ui.alert.birth", "ui.designation.place", "ui.build.place"
    ]
};

CANONICAL.weaponRows = [
    ["Lance", "thrust", []],
    ["Net", "thrown", [], true],
    ["Battleaxe", "swing", []],
    ["Blowgun", "draw-loose", ["reload"]],
    ["Club", "swing", []],
    ["Crossbow, hand", "crossbow", ["reload"]],
    ["Crossbow, heavy", "crossbow", ["reload"]],
    ["Crossbow, light", "crossbow", ["reload"]],
    ["Dagger", "thrust", ["thrown"]],
    ["Dart", "thrown", []],
    ["Flail", "swing", []],
    ["Glaive", "swing", []],
    ["Greataxe", "swing", []],
    ["Greatclub", "swing", []],
    ["Greatsword", "swing", []],
    ["Halberd", "swing", []],
    ["Handaxe", "swing", ["thrown"]],
    ["Javelin", "thrust", ["thrown"]],
    ["Light hammer", "swing", ["thrown"]],
    ["Longbow", "draw-loose", []],
    ["Longsword", "swing", []],
    ["Mace", "swing", []],
    ["Maul", "swing", []],
    ["Morningstar", "swing", []],
    ["Pike", "thrust", []],
    ["Quarterstaff", "swing", []],
    ["Rapier", "thrust", []],
    ["Scimitar", "swing", []],
    ["Shortbow", "draw-loose", []],
    ["Shortsword", "thrust", []],
    ["Sickle", "swing", []],
    ["Sling", "thrown", []],
    ["Spear", "thrust", ["thrown"]],
    ["Trident", "thrust", ["thrown"]],
    ["War pick", "swing", []],
    ["Warhammer", "swing", []],
    ["Whip", "swing", []]
];

CANONICAL.systemSounds = [
    [0, "Cursor3", "ui.system.cursor"],
    [1, "Decision2", "ui.system.ok"],
    [2, "Cancel2", "ui.system.cancel"],
    [3, "Buzzer1", "ui.system.buzzer"],
    [4, "Equip1", "ui.system.equip"],
    [5, "Save2", "ui.system.save"],
    [6, "Load2", "ui.system.load"],
    [7, "Battle1", "ui.system.battle-start"],
    [8, "Run", "ui.system.escape"],
    [9, "Attack3", "ui.system.enemy-attack"],
    [10, "Damage4", "ui.system.enemy-damage"],
    [11, "Collapse1", "ui.system.enemy-collapse"],
    [12, "Collapse2", "ui.system.boss-collapse-1"],
    [13, "Collapse3", "ui.system.boss-collapse-2"],
    [14, "Damage5", "ui.system.actor-damage"],
    [15, "Collapse4", "ui.system.actor-collapse"],
    [16, "Recovery", "ui.system.recovery"],
    [17, "Miss", "hit.outcome.miss"],
    [18, "Evasion1", "ui.system.evasion"],
    [19, "Evasion2", "ui.system.magic-evasion"],
    [20, "Reflection", "ui.system.reflection"],
    [21, "Shop1", "ui.system.shop"],
    [22, "Item3", "ui.system.use-item"],
    [23, "Item3", "ui.system.use-skill"]
];

function copy(v) {
    return JSON.parse(JSON.stringify(v));
}

function stable(v) {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object") {
        const out = {};
        for (const key of Object.keys(v).sort()) {
            if (v[key] !== undefined) out[key] = stable(v[key]);
        }
        return out;
    }
    return v;
}

function deepEqual(a, b) {
    return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function stemFromEventId(eventId) {
    const parts = String(eventId).split(".");
    if (parts.length < 3) {
        const err = new Error("event id needs category.subject.variant");
        err.code = "bad-template";
        throw err;
    }
    return parts[0] + "_" + parts[1] + "_" + parts.slice(2).join("-") + "_01";
}

function fill(template, row) {
    const result = String(template).replace(/\{([A-Za-z0-9]+)\}/g, (match, key) => {
        if (!Object.prototype.hasOwnProperty.call(row, key)) {
            const err = new Error("missing template key " + key);
            err.code = "bad-template";
            throw err;
        }
        return String(row[key]);
    });
    if (result.indexOf("{") !== -1 || result.indexOf("}") !== -1) {
        const err = new Error("unfilled template " + template);
        err.code = "bad-template";
        throw err;
    }
    return result;
}

function cartesian(axes) {
    const keys = Object.keys(axes);
    let rows = [{}];
    for (const key of keys) {
        const next = [];
        for (const row of rows) {
            for (const value of axes[key]) {
                const copyRow = {};
                for (const have of Object.keys(row)) copyRow[have] = row[have];
                copyRow[key] = value;
                next.push(copyRow);
            }
        }
        rows = next;
    }
    return rows;
}

function matchesWhen(when, row) {
    for (const key of Object.keys(when)) {
        if (when[key].indexOf(row[key]) < 0) return false;
    }
    return true;
}

function loopFrom(gen, row) {
    if (gen.loopWhen) return matchesWhen(gen.loopWhen, row);
    return !!gen.loop;
}

function attenuationFrom(gen, row) {
    if (gen.attenuationWhen && matchesWhen(gen.attenuationWhen.when, row)) return gen.attenuationWhen.class;
    if (gen.attenuationWhen) return gen.attenuationWhen.else;
    return gen.attenuationClass;
}

function categoryShell(id, folder, variantMin, extra) {
    return Object.assign({
        id: id,
        folder: folder,
        variantMin: variantMin,
        channels: folder === "se" ? "mono" : "stereo"
    }, extra);
}

function buildCategories() {
    return {
        foot: categoryShell("foot", "se", 3, {
            namingPattern: "foot_{surface}_{gait}_01",
            attenuationClass: "point",
            layerAudibility: "positional",
            loudness: "sfx",
            requiredSets: ["surface", "gait"]
        }),
        hit: categoryShell("hit", "se", 3, {
            namingPattern: "hit_{damageType}_{hitMaterial}_01",
            attenuationClass: "point",
            layerAudibility: "positional",
            loudness: "sfx",
            requiredSets: ["damageType", "hitMaterial", "hitOutcome"]
        }),
        spell: categoryShell("spell", "se", 2, {
            namingPattern: "spell_{school}_{shape}-{phase}_01",
            attenuationClass: "point",
            layerAudibility: "positional",
            loudness: "sfx",
            requiredSets: ["spellSchool", "deliveryShape", "spellPhase", "spellExtra"]
        }),
        wpn: categoryShell("wpn", "se", 2, {
            namingPattern: "wpn_{group}_{phase}_01",
            attenuationClass: "point",
            layerAudibility: "positional",
            loudness: "sfx",
            requiredSets: ["weaponGroup", "phase"]
        }),
        work: categoryShell("work", "se", 2, {
            namingPattern: "work_{action}_{phase}_01",
            attenuationClass: "point",
            layerAudibility: "positional",
            loudness: "sfx",
            requiredSets: ["workAction", "phase"]
        }),
        vocal: categoryShell("vocal", "se", 1, {
            namingPattern: "vocal_{subject}_{call-or-emote}_01",
            attenuationClass: "voice",
            layerAudibility: "positional",
            loudness: "voice",
            requiredSets: ["creatureType", "race", "vocalCall", "emote"]
        }),
        amb: categoryShell("amb", "bgs", 1, {
            namingPattern: "amb_{subject}_{variant}_01",
            attenuationClass: "bed",
            layerAudibility: "global",
            loudness: "ambience",
            requiredSets: ["biome", "depthBand", "weather", "season"]
        }),
        ui: categoryShell("ui", "se", 1, {
            namingPattern: "ui_{subject}_{variant}_01",
            attenuationClass: "ui",
            layerAudibility: "global",
            loudness: "ui",
            requiredSets: ["uiEvent"]
        }),
        bgm: categoryShell("bgm", "bgm", 1, {
            namingPattern: "bgm_{biome}_{state}-{role}_01",
            attenuationClass: "music",
            layerAudibility: "global",
            loudness: "music",
            requiredSets: ["biome", "musicState", "stemRole"]
        }),
        me: categoryShell("me", "me", 1, {
            namingPattern: "me_{subject}_{variant}_01",
            attenuationClass: "stinger",
            layerAudibility: "global",
            loudness: "stinger",
            requiredSets: ["stinger"]
        })
    };
}

function pointGen(spec) {
    return Object.assign({
        variants: 1,
        loop: false,
        attenuationClass: "point",
        layerAudibility: "positional",
        loudness: "sfx",
        folder: "se"
    }, spec);
}

function bedGen(spec) {
    return Object.assign({
        variants: 1,
        loop: true,
        attenuationClass: "bed",
        layerAudibility: "global",
        loudness: "ambience",
        folder: "bgs",
        category: "amb"
    }, spec);
}

function buildGenerators() {
    const C = CANONICAL;
    const gens = [];
    gens.push(pointGen({
        generatorId: "foot",
        category: "foot",
        eventId: "foot.{surface}.{gait}",
        stem: "foot_{surface}_{gait}_01",
        variants: 3,
        axes: { surface: C.surfaces.slice(), gait: C.gaits.slice() }
    }));
    gens.push(pointGen({
        generatorId: "hit-material",
        category: "hit",
        eventId: "hit.{damageType}.{hitMaterial}",
        stem: "hit_{damageType}_{hitMaterial}_01",
        variants: 3,
        axes: { damageType: C.damageTypes.slice(), hitMaterial: C.hitMaterials.slice() }
    }));
    gens.push(pointGen({
        generatorId: "hit-crit",
        category: "hit",
        eventId: "hit.{damageType}.crit",
        stem: "hit_{damageType}_crit_01",
        variants: 3,
        axes: { damageType: C.damageTypes.slice() }
    }));
    gens.push(pointGen({
        generatorId: "hit-outcome",
        category: "hit",
        eventId: "hit.outcome.{outcome}",
        stem: "hit_outcome_{outcome}_01",
        variants: 3,
        axes: { outcome: C.hitOutcomes.slice() }
    }));
    gens.push(pointGen({
        generatorId: "spell-phase",
        category: "spell",
        eventId: "spell.{school}.{shape}.{phase}",
        stem: "spell_{school}_{shape}-{phase}_01",
        variants: 2,
        variantsWhenLoop: 1,
        loopWhen: { phase: ["linger"] },
        attenuationWhen: {
            when: { shape: ["burst", "cylinder"], phase: ["delivery", "impact"] },
            class: "point-loud",
            else: "point"
        },
        axes: { school: C.spellSchools.slice(), shape: C.deliveryShapes.slice(), phase: C.spellPhases.slice() }
    }));
    gens.push(pointGen({
        generatorId: "spell-concentration",
        category: "spell",
        eventId: "spell.{school}.concentration",
        stem: "spell_{school}_concentration_01",
        variants: 1,
        loop: true,
        axes: { school: C.spellSchools.slice(), extra: ["concentration"] }
    }));
    gens.push(pointGen({
        generatorId: "spell-fail",
        category: "spell",
        eventId: "spell.{school}.{extra}",
        stem: "spell_{school}_{extra}_01",
        variants: 2,
        axes: { school: C.spellSchools.slice(), extra: ["fizzle", "dispel"] }
    }));
    for (const group of C.weaponGroups) {
        const phases = C.weaponPhases[group];
        const gen = pointGen({
            generatorId: "wpn-" + group,
            category: "wpn",
            eventId: "wpn.{group}.{phase}",
            stem: "wpn_{group}_{phase}_01",
            variants: 2,
            variantsWhenLoop: 1,
            axes: { group: [group], phase: phases.slice() }
        });
        if (group === "reload") gen.loopWhen = { phase: ["loop"] };
        gens.push(gen);
    }
    gens.push(pointGen({
        generatorId: "work",
        category: "work",
        eventId: "work.{action}.{phase}",
        stem: "work_{action}_{phase}_01",
        variants: 2,
        variantsWhenLoop: 1,
        loopWhen: { phase: ["loop"] },
        axes: { action: C.workActions.slice(), phase: C.workPhases.slice() }
    }));
    gens.push(pointGen({
        generatorId: "vocal-type-call",
        category: "vocal",
        eventId: "vocal.{creatureType}.{call}",
        stem: "vocal_{creatureType}_{call}_01",
        variants: 2,
        attenuationClass: "voice",
        loudness: "voice",
        axes: { creatureType: C.creatureTypes.slice(), call: C.vocalCalls.slice() }
    }));
    gens.push(pointGen({
        generatorId: "vocal-race-call",
        category: "vocal",
        eventId: "vocal.{race}.{call}",
        stem: "vocal_{race}_{call}_01",
        variants: 2,
        attenuationClass: "voice",
        loudness: "voice",
        axes: { race: C.races.slice(), call: C.vocalCalls.slice() }
    }));
    gens.push(pointGen({
        generatorId: "vocal-type-emote",
        category: "vocal",
        eventId: "vocal.{creatureType}.{emote}",
        stem: "vocal_{creatureType}_{emote}_01",
        variants: 1,
        attenuationClass: "voice",
        loudness: "voice",
        axes: { creatureType: C.creatureTypes.slice(), emote: C.emotes.slice() }
    }));
    gens.push(pointGen({
        generatorId: "vocal-race-emote",
        category: "vocal",
        eventId: "vocal.{race}.{emote}",
        stem: "vocal_{race}_{emote}_01",
        variants: 1,
        attenuationClass: "voice",
        loudness: "voice",
        axes: { race: C.races.slice(), emote: C.emotes.slice() }
    }));
    gens.push(bedGen({
        generatorId: "amb-base",
        eventId: "amb.{biome}.{depth}.base",
        stem: "amb_{biome}_{depth}-base_01",
        axes: { biome: C.biomes.slice(), depth: C.depthBands.slice() }
    }));
    gens.push(bedGen({
        generatorId: "amb-weather",
        eventId: "amb.weather.{weather}",
        stem: "amb_weather_{weather}_01",
        axes: { weather: C.weathers.filter(w => w !== "clear") }
    }));
    gens.push(bedGen({
        generatorId: "amb-season",
        eventId: "amb.season.{season}",
        stem: "amb_season_{season}_01",
        axes: { season: C.seasons.slice() }
    }));
    gens.push(bedGen({
        generatorId: "amb-settlement",
        eventId: "amb.settlement.{biome}",
        stem: "amb_settlement_{biome}_01",
        axes: { biome: C.biomes.slice() }
    }));
    gens.push(bedGen({
        generatorId: "amb-interior",
        eventId: "amb.interior.{surface}",
        stem: "amb_interior_{surface}_01",
        axes: { surface: ["wood", "stone"] }
    }));
    gens.push(bedGen({
        generatorId: "amb-water",
        eventId: "amb.water.{water}",
        stem: "amb_water_{water}_01",
        axes: { water: ["shallow", "deep"] }
    }));
    gens.push({
        generatorId: "music",
        category: "bgm",
        folder: "bgm",
        eventId: "bgm.{biome}.{state}.{role}",
        stem: "bgm_{biome}_{state}-{role}_01",
        variants: 1,
        loop: true,
        attenuationClass: "music",
        layerAudibility: "global",
        loudness: "music",
        bpm: 96,
        beatsPerBar: 4,
        axes: { biome: C.biomes.slice(), state: C.musicStates.slice(), role: C.stemRoles.slice() }
    });
    return gens;
}

function makeEvent(eventId, spec) {
    const category = eventId.split(".")[0];
    const event = {
        eventId: eventId,
        category: category,
        folder: spec.folder,
        stem: stemFromEventId(eventId),
        variants: spec.variants,
        loop: !!spec.loop,
        attenuationClass: spec.attenuationClass,
        layerAudibility: spec.layerAudibility,
        loudness: spec.loudness,
        channels: spec.folder === "se" ? "mono" : "stereo",
        priority: spec.priority
    };
    if (spec.loop) {
        event.loopStart = 0;
        event.loopLength = null;
        event.loopContract = "full-file";
    }
    return event;
}

function buildExplicitEvents() {
    const events = [];
    for (const id of CANONICAL.uiEvents) {
        events.push(makeEvent(id, {
            folder: "se",
            variants: 1,
            attenuationClass: "ui",
            layerAudibility: "global",
            loudness: "ui",
            priority: 100
        }));
    }
    for (const id of CANONICAL.stingers) {
        events.push(makeEvent(id, {
            folder: "me",
            variants: 1,
            attenuationClass: "stinger",
            layerAudibility: "global",
            loudness: "stinger",
            priority: 90
        }));
    }
    events.push(makeEvent("amb.open-air.wind", {
        folder: "bgs",
        variants: 1,
        loop: true,
        attenuationClass: "bed",
        layerAudibility: "global",
        loudness: "ambience",
        priority: 20
    }));
    return events;
}

function buildClosedSets() {
    const C = CANONICAL;
    const keys = [
        "damageTypes", "spellSchools", "biomes", "depthBands", "weathers", "seasons", "surfaces",
        "gaits", "sizes", "creatureTypes", "races", "vocalCalls", "emotes", "hitMaterials",
        "hitOutcomes", "deliveryShapes", "spellPhases", "spellExtras", "phases", "weaponGroups",
        "workActions", "musicStates", "stemRoles"
    ];
    const out = {};
    for (const key of keys) out[key] = C[key].slice();
    return out;
}

function buildWeaponMap() {
    const out = {};
    for (const row of CANONICAL.weaponRows) {
        out[row[0]] = { primary: row[1], secondary: row[2].slice(), noHit: !!row[3] };
    }
    return out;
}

function buildSystemSounds() {
    return CANONICAL.systemSounds.map(row => ({ index: row[0], name: row[1], eventId: row[2] }));
}

function buildPublishedData() {
    const C = CANONICAL;
    return {
        closedSets: buildClosedSets(),
        categories: buildCategories(),
        format: {
            encoding: "ogg-vorbis",
            extension: ".ogg",
            m4aRequired: false,
            audioFileExt: ".ogg",
            sampleRate: 44100,
            bitDepth: 16,
            loopStartTag: "LOOPSTART",
            loopLengthTag: "LOOPLENGTH",
            musicGrid: { bpm: 96, beatsPerBar: 4 },
            channels: { positional: "mono", music: "stereo", ambience: "stereo", stinger: "stereo" }
        },
        loudnessTargets: {
            music: { integratedLufs: -18, truePeakDbtp: -1, channels: "stereo", defaultVolume: 90 },
            stinger: { integratedLufs: -16, truePeakDbtp: -1, channels: "stereo", defaultVolume: 90 },
            ambience: { integratedLufs: -24, truePeakDbtp: -1.5, channels: "stereo", defaultVolume: 70 },
            sfx: { integratedLufs: -18, truePeakDbtp: -1, channels: "mono", defaultVolume: 90 },
            sfxLoud: { integratedLufs: -14, truePeakDbtp: -1, channels: "mono", defaultVolume: 100 },
            ui: { integratedLufs: -20, truePeakDbtp: -1.5, channels: "mono", defaultVolume: 90 },
            voice: { integratedLufs: -16, truePeakDbtp: -1, channels: "mono", defaultVolume: 90 }
        },
        naming: {
            stemPattern: STEM_RE.source,
            eventIdPattern: EVENT_ID_RE.source,
            fields: ["category", "subject", "variant", "nn"],
            case: "lower",
            nnWidth: 2
        },
        attenuation: {
            silenceVolume: 4,
            openingRadiusCells: 3,
            layerGainPerLayer: 0.7,
            pitchDropPerLayer: 4,
            pitchFloor: 80,
            authoredPitchMin: 50,
            authoredPitchMax: 150,
            volumeMin: 0,
            volumeMax: 100,
            panMin: -100,
            panMax: 100,
            caps: { se: 24, voice: 8, beds: 4, bedsInterim: 1, bgm: 1, me: 1 },
            classes: {
                ui: { positional: false, refFeet: null, rolloff: 0, maxFeet: null, maxVolume: 90, priority: 100 },
                music: { positional: false, refFeet: null, rolloff: 0, maxFeet: null, maxVolume: 90, priority: 30 },
                bed: { positional: false, refFeet: null, rolloff: 0, maxFeet: null, maxVolume: 70, priority: 20 },
                stinger: { positional: false, refFeet: null, rolloff: 0, maxFeet: null, maxVolume: 90, priority: 90 },
                voice: { positional: true, refFeet: 15, rolloff: 1.2, maxFeet: 80, maxVolume: 90, priority: 80 },
                point: { positional: true, refFeet: 10, rolloff: 1.5, maxFeet: 60, maxVolume: 90, priority: 50 },
                "point-loud": { positional: true, refFeet: 20, rolloff: 1.2, maxFeet: 150, maxVolume: 100, priority: 70 }
            }
        },
        geometry: {
            cellFeet: 5,
            layerFeet: 10,
            zMin: -16,
            zMax: 15,
            layerCount: 32,
            openAirZMin: 12,
            openAirZMax: 15,
            naturalTerrainZMax: 11,
            depthRanges: {
                "deep-earth": { zMin: -16, zMax: -11 },
                caverns: { zMin: -10, zMax: -5 },
                lowlands: { zMin: -4, zMax: 1 },
                uplands: { zMin: 2, zMax: 6 },
                highlands: { zMin: 7, zMax: 11 }
            }
        },
        groundKindMap: {
            meadow: "grass", tropical_grass: "grass", dry_grass: "grass", cursed_grass: "grass",
            blessed_grass: "grass", tundra: "grass", dirt: "dirt", road: "dirt", shrub_soil: "dirt",
            red_clay: "dirt", forest_floor: "litter", jungle_floor: "litter", needle_floor: "litter",
            floor_rushes: "litter", sand: "sand", stony: "stone", rock: "stone", peak_rock: "stone",
            floor_stone: "stone", scree: "gravel", mud: "mud", swamp_mud: "mud", snow: "snow",
            ice: "ice", ash: "ash", floor_wood: "wood"
        },
        waterKindMap: {
            fresh: "water-shallow", pond: "water-shallow", marsh: "water-shallow", swamp: "water-shallow",
            icy: "water-shallow", brackish: "water-shallow", salt: "water-shallow", blighted: "water-shallow",
            deep: "water-deep"
        },
        weatherProjection: {
            clear: { audio: "clear", beds: [] },
            overcast: { audio: "clear", beds: [] },
            heatwave: { audio: "clear", beds: [] },
            coldsnap: { audio: "clear", beds: [] },
            rain: { audio: "rain", beds: ["rain"] },
            downpour: { audio: "storm", beds: ["storm"] },
            snow: { audio: "snow", beds: ["snow"] },
            blizzard: { audio: "storm", beds: ["storm"], multiBed: ["snow", "wind"] },
            fog: { audio: "fog", beds: ["fog"], engineToken: false },
            wind: { audio: "wind", beds: ["wind"], engineToken: false }
        },
        biomeDepthDefaults: {
            volcanic: { "deep-earth": "volcanic-rock", caverns: "volcanic-rock", lowlands: "ash", uplands: "volcanic-rock", highlands: "volcanic-rock" },
            wet: { "deep-earth": "stone", caverns: "mud", lowlands: "mud", uplands: "grass", highlands: "stone" },
            arid: { "deep-earth": "stone", caverns: "stone", lowlands: "sand", uplands: "gravel", highlands: "stone" },
            temperate: { "deep-earth": "stone", caverns: "stone", lowlands: "grass", uplands: "grass", highlands: "stone" },
            cold: { "deep-earth": "stone", caverns: "stone", lowlands: "snow", uplands: "snow", highlands: "ice" },
            wild: { "deep-earth": "stone", caverns: "litter", lowlands: "grass", uplands: "dirt", highlands: "gravel" }
        },
        legacyBiomeRouting: {
            glacier: "cold", tundra: "cold", taiga: "cold", ocean_arctic: "cold",
            forest_temperate_conifer: "temperate", forest_temperate_broadleaf: "temperate",
            grassland_temperate: "temperate", savanna_temperate: "temperate", shrubland_temperate: "temperate",
            ocean_temperate: "temperate",
            marsh_temperate_fresh: "wet", marsh_temperate_salt: "wet", marsh_tropical_fresh: "wet",
            marsh_tropical_salt: "wet", swamp_temperate_fresh: "wet", swamp_temperate_salt: "wet",
            swamp_tropical_fresh: "wet", swamp_tropical_salt: "wet", swamp_mangrove: "wet",
            forest_tropical_moist_broadleaf: "wet", lake_fresh: "wet", lake_brackish: "wet",
            desert_sand: "arid", desert_rock: "arid", desert_badland: "arid", savanna_tropical: "arid",
            shrubland_tropical: "arid", forest_tropical_dry_broadleaf: "arid", lake_salt: "arid",
            forest_tropical_conifer: "wild", grassland_tropical: "wild", mountain: "wild", ocean_tropical: "wild"
        },
        legacyBiomeDepthHint: { mountain: "highlands" },
        legacyRegistryRouting: { TEMP: "temperate", WET: "wet", ARID: "arid", HIGH: "wild", VOLC: "volcanic" },
        legacyMenuBgm: [
            { id: "human", bgm: "Town1", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "elf", bgm: "Theme2", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "dwarf", bgm: "Town2", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "gnome", bgm: "Town3", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "goblin", bgm: "Dungeon2", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "orc", bgm: "Battle3", via: ["cultures.themeBgm", "skins.bgm"] },
            { id: "lizardfolk", bgm: "Town7", via: ["skins.bgm"] },
            { id: "kobold", bgm: "Dungeon1", via: ["skins.bgm"] },
            { id: "undead", bgm: "Dungeon3", via: ["skins.bgm"] },
            { id: "starborn", bgm: "Theme1", via: ["skins.bgm"] },
            { id: "swarm", bgm: "Dungeon6", via: ["skins.bgm"] },
            { id: "automaton", bgm: null, like: "starborn", via: ["cultures", "skins.like"] },
            { id: "halfling", bgm: null, like: "human", via: ["skins.like"] },
            { id: "serpentkin", bgm: null, like: "lizardfolk", via: ["skins.like"] },
            { id: "demon", bgm: null, like: "undead", via: ["skins.like"] },
            { id: "swarmer", bgm: null, like: "swarm", via: ["skins.like"] },
            { id: "dark_dwarf", bgm: null, like: "dwarf", via: ["skins.like"] },
            { id: "dark_gnome", bgm: null, like: "gnome", via: ["skins.like"] }
        ],
        sizePlayback: {
            tiny: { pitch: 140, volumeOffset: -8 },
            small: { pitch: 120, volumeOffset: -4 },
            medium: { pitch: 100, volumeOffset: 0 },
            large: { pitch: 85, volumeOffset: 4 },
            huge: { pitch: 70, volumeOffset: 8 },
            gargantuan: { pitch: 55, volumeOffset: 12 }
        },
        footPlayback: { sneakVolumeScale: 0.45 },
        weaponMap: buildWeaponMap(),
        systemSounds: buildSystemSounds(),
        eventGenerators: buildGenerators(),
        events: buildExplicitEvents()
    };
}

function assemble(parts) {
    const data = buildPublishedData();
    return {
        schemaVersion: "1.0.0",
        profile: "full",
        rules: parts.rules,
        closedSets: data.closedSets,
        categories: data.categories,
        format: data.format,
        loudnessTargets: data.loudnessTargets,
        naming: data.naming,
        attenuation: data.attenuation,
        geometry: data.geometry,
        groundKindMap: data.groundKindMap,
        waterKindMap: data.waterKindMap,
        weatherProjection: data.weatherProjection,
        biomeDepthDefaults: data.biomeDepthDefaults,
        legacyBiomeRouting: data.legacyBiomeRouting,
        legacyBiomeDepthHint: data.legacyBiomeDepthHint,
        legacyRegistryRouting: data.legacyRegistryRouting,
        legacyMenuBgm: data.legacyMenuBgm,
        sizePlayback: data.sizePlayback,
        footPlayback: data.footPlayback,
        weaponMap: data.weaponMap,
        systemSounds: data.systemSounds,
        eventGenerators: data.eventGenerators,
        events: data.events,
        legacyCensus: parts.legacyCensus,
        openQuestions: parts.openQuestions,
        proposedFollowUps: parts.proposedFollowUps
    };
}

function expandGenerator(gen, doc) {
    const rows = cartesian(gen.axes);
    const out = [];
    for (const row of rows) {
        const loop = loopFrom(gen, row);
        let variants = gen.variants;
        if (loop && gen.variantsWhenLoop) variants = gen.variantsWhenLoop;
        const attenuationClass = attenuationFrom(gen, row);
        const eventId = fill(gen.eventId, row);
        const stem = fill(gen.stem, row);
        const event = {
            eventId: eventId,
            category: gen.category,
            folder: gen.folder,
            stem: stem,
            variants: variants,
            loop: loop,
            attenuationClass: attenuationClass,
            layerAudibility: gen.layerAudibility,
            loudness: attenuationClass === "point-loud" ? "sfxLoud" : gen.loudness,
            channels: gen.folder === "se" ? "mono" : "stereo"
        };
        const cls = doc.attenuation && doc.attenuation.classes && doc.attenuation.classes[attenuationClass];
        if (cls && cls.priority != null) event.priority = cls.priority;
        if (loop) {
            event.loopStart = 0;
            event.loopLength = null;
            event.loopContract = "full-file";
        }
        if (gen.bpm) {
            event.bpm = gen.bpm;
            event.beatsPerBar = gen.beatsPerBar;
        }
        for (const key of Object.keys(row)) {
            const field = AXIS_FIELD[key];
            if (field) event[field] = row[key];
        }
        out.push(event);
    }
    return out;
}

function expandEvents(doc) {
    const out = [];
    for (const gen of doc.eventGenerators || []) out.push.apply(out, expandGenerator(gen, doc));
    for (const event of doc.events || []) out.push(copy(event));
    return out;
}

function hitAlias(mapsTo, nearest) {
    return { mapsTo: mapsTo, nearest: nearest || null };
}

function noAlias(nearest) {
    return { mapsTo: null, nearest: nearest || null };
}

function classifyLegacyStem(folder, stem) {
    if (folder === "se") {
        if (/^Cursor\d+$/.test(stem)) return hitAlias("ui.system.cursor");
        if (/^Decision\d+$/.test(stem)) return hitAlias("ui.system.ok");
        if (/^Cancel\d+$/.test(stem)) return hitAlias("ui.system.cancel");
        if (/^Buzzer\d+$/.test(stem)) return hitAlias("ui.system.buzzer");
        if (/^Equip\d+$/.test(stem)) return hitAlias("ui.system.equip");
        if (/^Save\d+$/.test(stem)) return hitAlias("ui.system.save");
        if (/^Load\d+$/.test(stem)) return hitAlias("ui.system.load");
        if (/^Shop\d+$/.test(stem)) return hitAlias("ui.system.shop");
        if (stem === "Miss") return hitAlias("hit.outcome.miss");
        if (stem === "Parry") return hitAlias("hit.outcome.parry");
        if (stem === "Recovery") return hitAlias("ui.system.recovery");
        if (stem === "Evasion1") return hitAlias("ui.system.evasion");
        if (stem === "Evasion2") return hitAlias("ui.system.magic-evasion");
        if (stem === "Reflection") return hitAlias("ui.system.reflection");
        if (stem === "Run") return hitAlias("ui.system.escape");
        if (/^Attack\d+$/.test(stem)) return hitAlias("ui.system.enemy-attack");
        if (stem === "Damage4") return hitAlias("ui.system.enemy-damage");
        if (stem === "Damage5") return hitAlias("ui.system.actor-damage");
        if (/^Damage\d+$/.test(stem)) return noAlias("ui.system.enemy-damage");
        if (stem === "Collapse1") return hitAlias("ui.system.enemy-collapse");
        if (stem === "Collapse2") return hitAlias("ui.system.boss-collapse-1");
        if (stem === "Collapse3") return hitAlias("ui.system.boss-collapse-2");
        if (stem === "Collapse4") return hitAlias("ui.system.actor-collapse");
        if (stem === "Item3") return hitAlias(["ui.system.use-item", "ui.system.use-skill"]);
        if (/^Item\d+$/.test(stem)) return hitAlias("ui.system.use-item");
        if (stem === "Battle1") return hitAlias("ui.system.battle-start");
        if (/^Battle\d+$/.test(stem)) return noAlias("ui.system.battle-start");
        if (/^Slash\d+$/.test(stem)) return hitAlias("hit.slashing.flesh");
        if (/^Blow\d+$/.test(stem)) return hitAlias("hit.bludgeoning.flesh");
        if (/^Thunder\d+$/.test(stem)) return hitAlias("hit.thunder.flesh");
        if (/^Ice\d+$/.test(stem)) return hitAlias("hit.cold.flesh");
        if (/^Fire\d+$/.test(stem)) return hitAlias("hit.fire.flesh");
        if (stem === "Poison") return hitAlias("hit.poison.flesh");
        if (/^Saint\d+$/.test(stem)) return hitAlias("hit.radiant.flesh");
        if (/^Explosion\d+$/.test(stem)) return hitAlias("spell.evocation.burst.impact");
        if (/^Sword\d+$/.test(stem)) return hitAlias("wpn.swing.action");
        if (/^Bow\d+$/.test(stem)) return hitAlias("wpn.draw-loose.loose");
        if (stem === "Crossbow") return hitAlias("wpn.crossbow.fire");
        if (stem === "Hammer") return hitAlias("work.hammer.loop");
        if (stem === "Sand") return hitAlias("foot.sand.walk");
        if (stem === "Splash") return hitAlias("foot.water-shallow.walk");
        if (/^(Bell|Chime)\d+$/.test(stem)) return hitAlias("ui.alert.notification");
        if (/^(Cat|Chicken|Cow|Crow|Dog|Frog|Horse|Sheep|Wolf|Growl|Scream|Laugh)$/.test(stem) || /^(Monster|Cry)\d+$/.test(stem)) return noAlias("vocal");
        if (/^(Door|Open|Close|Gate|Switch)\d+$/.test(stem) || stem === "Knock" || stem === "Autodoor") return noAlias("door");
        if (/^(Gun|Shot)\d+$/.test(stem)) return noAlias("firearm");
        if (/^Move\d+$/.test(stem)) return noAlias("foot");
        return noAlias("sfx");
    }
    if (folder === "bgs") {
        if (/^Rain\d+$/.test(stem)) return hitAlias("amb.weather.rain");
        if (/^Storm\d+$/.test(stem)) return hitAlias("amb.weather.storm");
        if (/^Wind\d+$/.test(stem)) return hitAlias("amb.weather.wind");
        if (stem === "Sea") return hitAlias("amb.water.deep");
        if (stem === "River" || /^(Wave|Waterfall)\d+$/.test(stem)) return hitAlias("amb.water.shallow");
        return noAlias("ambience");
    }
    if (folder === "bgm") {
        if (/^Battle\d+$/.test(stem)) return hitAlias("bgm.temperate.combat.full");
        if (/^(Town|Field|Castle)\d+$/.test(stem)) return hitAlias("bgm.temperate.peace.full");
        if (/^Dungeon\d+$/.test(stem)) return hitAlias("bgm.temperate.underground.full");
        if (/^Ship\d+$/.test(stem)) return noAlias("vehicle");
        if (/^Theme\d+$/.test(stem)) return noAlias("menu");
        if (/^Scene\d+$/.test(stem)) return noAlias("underscore");
        return noAlias("music");
    }
    if (folder === "me") {
        if (/^Victory\d+$/.test(stem)) return hitAlias("me.victory.stinger");
        if (/^(Defeat|Gameover)\d+$/.test(stem)) return hitAlias("me.defeat.stinger");
        if (/^Fanfare\d+$/.test(stem)) return hitAlias("me.festival.stinger");
        if (stem === "Item") return hitAlias("ui.alert.notification");
        return noAlias("stinger");
    }
    return noAlias(null);
}

function censusRowFor(file) {
    const found = classifyLegacyStem(file.folder, file.stem);
    const row = {
        folder: file.folder,
        file: file.file,
        stem: file.stem,
        ext: file.ext,
        size: file.size,
        mapsTo: found.mapsTo
    };
    if (found.nearest) row.nearest = found.nearest;
    return row;
}

function selfCheck() {
    const problems = [];
    const data = buildPublishedData();
    const events = expandEvents(data);
    const ids = new Set();
    for (const event of events) {
        if (ids.has(event.eventId)) problems.push("duplicate " + event.eventId);
        ids.add(event.eventId);
        if (!EVENT_ID_RE.test(event.eventId)) problems.push("event id " + event.eventId);
        if (!STEM_RE.test(event.stem)) problems.push("stem " + event.stem);
        if (stemFromEventId(event.eventId) !== event.stem) problems.push("stem formula " + event.eventId);
        if (event.loop) {
            if (event.loopContract !== "full-file" || event.loopStart !== 0 || event.loopLength !== null) {
                problems.push("loop " + event.eventId);
            }
        }
    }
    if (CANONICAL.weaponRows.length !== 37) problems.push("weapon count");
    if (Object.keys(data.groundKindMap).length !== 26) problems.push("ground count");
    if (Object.keys(data.waterKindMap).length !== 9) problems.push("water count");
    if (Object.keys(data.legacyBiomeRouting).length !== 33) problems.push("biome route count");
    if (data.geometry.zMax - data.geometry.zMin + 1 !== 32) problems.push("layer count");
    const ranges = Object.keys(data.geometry.depthRanges).map(key => data.geometry.depthRanges[key]).sort((a, b) => a.zMin - b.zMin);
    if (ranges[0].zMin !== -16 || ranges[ranges.length - 1].zMax !== 11) problems.push("depth ends");
    for (let i = 1; i < ranges.length; i++) {
        if (ranges[i].zMin !== ranges[i - 1].zMax + 1) problems.push("depth gap");
    }
    for (const value of Object.values(data.groundKindMap)) {
        if (CANONICAL.surfaces.indexOf(value) < 0) problems.push("ground surface " + value);
    }
    for (const value of Object.values(data.legacyBiomeRouting)) {
        if (CANONICAL.biomes.indexOf(value) < 0) problems.push("route " + value);
    }
    for (const token of CANONICAL.engineWeather) {
        if (!data.weatherProjection[token]) problems.push("weather " + token);
    }
    for (const size of Object.keys(data.sizePlayback)) {
        const pitch = data.sizePlayback[size].pitch;
        if (pitch < 50 || pitch > 150) problems.push("pitch " + size);
    }
    if (classifyLegacyStem("se", "Slash1").mapsTo !== "hit.slashing.flesh") problems.push("slash map");
    if (classifyLegacyStem("bgm", "Town1").mapsTo !== "bgm.temperate.peace.full") problems.push("town map");
    if (classifyLegacyStem("se", "Computer").mapsTo !== null) problems.push("computer map");
    const foot = events.filter(event => event.category === "foot").length;
    if (foot !== CANONICAL.surfaces.length * CANONICAL.gaits.length) problems.push("foot count " + foot);
    return problems;
}

const SCHEMA_ANNOTATIONS = new Set(["$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "examples", "default"]);
const SCHEMA_CONSTRAINTS = new Set([
    "type", "properties", "required", "additionalProperties", "items", "enum", "const", "pattern",
    "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "minProperties",
    "propertyNames", "oneOf"
]);
function unsupportedSchemaKeywords(node, found) {
    const list = found || [];
    if (!node || typeof node !== "object" || Array.isArray(node)) return list;
    for (const key of Object.keys(node)) {
        if (!SCHEMA_ANNOTATIONS.has(key) && !SCHEMA_CONSTRAINTS.has(key)) list.push(key);
    }
    if (node.properties) {
        for (const sub of Object.values(node.properties)) unsupportedSchemaKeywords(sub, list);
    }
    if (node.$defs) {
        for (const sub of Object.values(node.$defs)) unsupportedSchemaKeywords(sub, list);
    }
    if (node.items && typeof node.items === "object") unsupportedSchemaKeywords(node.items, list);
    if (node.additionalProperties && typeof node.additionalProperties === "object") {
        unsupportedSchemaKeywords(node.additionalProperties, list);
    }
    if (node.propertyNames) unsupportedSchemaKeywords(node.propertyNames, list);
    if (node.oneOf) {
        for (const sub of node.oneOf) unsupportedSchemaKeywords(sub, list);
    }
    return list;
}

const patternCache = new Map();

function patternTest(source, data) {
    let re = patternCache.get(source);
    if (!re) {
        re = new RegExp(source);
        patternCache.set(source, re);
    }
    return re.test(data);
}

function typeOk(schemaType, value) {
    const types = Array.isArray(schemaType) ? schemaType : [schemaType];
    for (const kind of types) {
        if (kind === "integer" && Number.isInteger(value)) return true;
        if (kind === "number" && typeof value === "number" && !Number.isNaN(value)) return true;
        if (kind === "null" && value === null) return true;
        if (kind === "array" && Array.isArray(value)) return true;
        if (kind === "object" && value && typeof value === "object" && !Array.isArray(value)) return true;
        if (kind === "string" && typeof value === "string") return true;
        if (kind === "boolean" && typeof value === "boolean") return true;
    }
    return false;
}

function resolveRef(root, ref) {
    if (!ref || ref.charAt(0) !== "#" || ref.charAt(1) !== "/") return null;
    let node = root;
    for (const part of ref.slice(2).split("/")) {
        if (!node || typeof node !== "object") return null;
        node = node[part];
    }
    return node || null;
}

function validateAgainst(root, schema, data, at) {
    const errors = [];
    if (!schema || typeof schema !== "object") return errors;
    if (schema.$ref) {
        const target = resolveRef(root, schema.$ref);
        if (!target) {
            errors.push({ code: "schema", keyword: "$ref", path: at, ref: schema.$ref });
            return errors;
        }
        return validateAgainst(root, target, data, at);
    }
    if (schema.oneOf) {
        let passed = 0;
        for (const branch of schema.oneOf) {
            if (validateAgainst(root, branch, data, at).length === 0) passed += 1;
        }
        if (passed !== 1) errors.push({ code: "schema", keyword: "oneOf", path: at });
        return errors;
    }
    if (schema.type && !typeOk(schema.type, data)) {
        errors.push({ code: "schema", keyword: "type", path: at });
        return errors;
    }
    if (Object.prototype.hasOwnProperty.call(schema, "const") && data !== schema.const) {
        errors.push({ code: "schema", keyword: "const", path: at });
    }
    if (schema.enum && schema.enum.indexOf(data) < 0) {
        errors.push({ code: "schema", keyword: "enum", path: at });
    }
    if (typeof data === "string" && schema.pattern && !patternTest(schema.pattern, data)) {
        errors.push({ code: "schema", keyword: "pattern", path: at });
    }
    if (typeof data === "string" && schema.minLength != null && data.length < schema.minLength) {
        errors.push({ code: "schema", keyword: "minLength", path: at });
    }
    if (typeof data === "string" && schema.maxLength != null && data.length > schema.maxLength) {
        errors.push({ code: "schema", keyword: "maxLength", path: at });
    }
    if (typeof data === "number" && schema.minimum != null && data < schema.minimum) {
        errors.push({ code: "schema", keyword: "minimum", path: at });
    }
    if (typeof data === "number" && schema.maximum != null && data > schema.maximum) {
        errors.push({ code: "schema", keyword: "maximum", path: at });
    }
    if (Array.isArray(data)) {
        if (schema.minItems != null && data.length < schema.minItems) errors.push({ code: "schema", keyword: "minItems", path: at });
        if (schema.maxItems != null && data.length > schema.maxItems) errors.push({ code: "schema", keyword: "maxItems", path: at });
        if (schema.items) {
            for (let i = 0; i < data.length; i++) {
                const nested = validateAgainst(root, schema.items, data[i], at + "/" + i);
                for (const err of nested) errors.push(err);
            }
        }
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
        const keys = Object.keys(data);
        if (schema.minProperties != null && keys.length < schema.minProperties) {
            errors.push({ code: "schema", keyword: "minProperties", path: at });
        }
        if (schema.required) {
            for (const key of schema.required) {
                if (!Object.prototype.hasOwnProperty.call(data, key)) {
                    errors.push({ code: "schema", keyword: "required", path: at, missing: key });
                }
            }
        }
        if (schema.propertyNames) {
            for (const key of keys) {
                const nested = validateAgainst(root, schema.propertyNames, key, at + "/" + key);
                for (const err of nested) errors.push(err);
            }
        }
        for (const key of keys) {
            const child = at + "/" + key;
            if (schema.properties && schema.properties[key]) {
                const nested = validateAgainst(root, schema.properties[key], data[key], child);
                for (const err of nested) errors.push(err);
            } else if (schema.additionalProperties === false) {
                errors.push({ code: "schema", keyword: "additionalProperties", path: child });
            } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
                const nested = validateAgainst(root, schema.additionalProperties, data[key], child);
                for (const err of nested) errors.push(err);
            }
        }
    }
    return errors;
}

function loopErrors(event) {
    const errors = [];
    const start = event.loopStart;
    const len = event.loopLength;
    if (start != null && (!Number.isInteger(start) || start < 0)) {
        errors.push({ code: "bad-loop", eventId: event.eventId, reason: "loopStart" });
    }
    if (len != null && (!Number.isInteger(len) || len < 1)) {
        errors.push({ code: "bad-loop", eventId: event.eventId, reason: "loopLength" });
    }
    if (event.loop) {
        if (event.loopContract === "full-file") {
            if (start != null && start !== 0) errors.push({ code: "bad-loop", eventId: event.eventId, reason: "full-file-start" });
            if (len != null) errors.push({ code: "bad-loop", eventId: event.eventId, reason: "full-file-length" });
        } else if (event.loopContract === "samples") {
            if (start == null || len == null) errors.push({ code: "bad-loop", eventId: event.eventId, reason: "samples-required" });
        } else {
            errors.push({ code: "bad-loop", eventId: event.eventId, reason: "contract" });
        }
    } else if (start != null || len != null || event.loopContract != null) {
        errors.push({ code: "bad-loop", eventId: event.eventId, reason: "not-a-loop" });
    }
    return errors;
}

function enumErrors(event, doc) {
    const errors = [];
    const sets = doc.closedSets || {};
    if (event.damageType != null && sets.damageTypes && sets.damageTypes.indexOf(event.damageType) < 0) {
        errors.push({ code: "unknown-damage-type", eventId: event.eventId, value: event.damageType });
    }
    if (event.spellSchool != null && sets.spellSchools && sets.spellSchools.indexOf(event.spellSchool) < 0) {
        errors.push({ code: "unknown-spell-school", eventId: event.eventId, value: event.spellSchool });
    }
    if (event.biome != null && sets.biomes && sets.biomes.indexOf(event.biome) < 0) {
        errors.push({ code: "unknown-biome", eventId: event.eventId, value: event.biome });
    }
    for (const field of Object.keys(ENUM_FIELD)) {
        if (field === "damageType" || field === "spellSchool" || field === "biome") continue;
        const spec = ENUM_FIELD[field];
        if (event[field] == null || !sets[spec[0]]) continue;
        if (sets[spec[0]].indexOf(event[field]) < 0) {
            errors.push({ code: spec[1], eventId: event.eventId, value: event[field] });
        }
    }
    return errors;
}

function semanticEventErrors(event, doc) {
    const errors = [];
    for (const err of loopErrors(event)) errors.push(err);
    for (const err of enumErrors(event, doc)) errors.push(err);
    const cat = doc.categories && doc.categories[event.category];
    if (!cat) errors.push({ code: "unknown-category", eventId: event.eventId, category: event.category });
    else if (cat.folder !== event.folder) {
        errors.push({ code: "category-folder", eventId: event.eventId, folder: event.folder, expected: cat.folder });
    }
    if (Object.prototype.hasOwnProperty.call(event, "attenuationClass")) {
        const classes = doc.attenuation && doc.attenuation.classes;
        if (!classes || !classes[event.attenuationClass]) {
            errors.push({ code: "missing-attenuation", eventId: event.eventId, value: event.attenuationClass });
        }
    }
    if (STEM_RE.test(event.stem)) {
        let expected = null;
        try { expected = stemFromEventId(event.eventId); } catch (e) { expected = null; }
        if (expected && expected !== event.stem) errors.push({ code: "bad-name", eventId: event.eventId, stem: event.stem });
    }
    return errors;
}

function variantStems(stem, variants) {
    const match = /^(.+_)(\d{2})$/.exec(stem);
    if (!match) return [];
    const out = [];
    const start = Number(match[2]);
    for (let i = 0; i < variants; i++) out.push(match[1] + String(start + i).padStart(2, "0"));
    return out;
}

function indexFiles(files) {
    const byFolder = { bgm: new Map(), bgs: new Map(), me: new Map(), se: new Map() };
    for (const file of files) {
        if (!byFolder[file.folder]) continue;
        if (!byFolder[file.folder].has(file.stem)) byFolder[file.folder].set(file.stem, []);
        byFolder[file.folder].get(file.stem).push(file);
    }
    return byFolder;
}

function hasOgg(list) {
    return !!(list && list.some(file => file.ext === ".ogg"));
}

function findWrongFolder(stem, want, index) {
    for (const folder of FOLDERS) {
        if (folder === want) continue;
        if (hasOgg(index[folder].get(stem))) return folder;
    }
    return null;
}

function aliasMap(census) {
    const map = new Map();
    for (const row of census || []) {
        const targets = row.mapsTo == null ? [] : (Array.isArray(row.mapsTo) ? row.mapsTo : [row.mapsTo]);
        for (const id of targets) {
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(row);
        }
    }
    return map;
}

function classifyEvent(event, index, aliases) {
    const stems = variantStems(event.stem, event.variants);
    const have = stems.filter(stem => hasOgg(index[event.folder].get(stem)));
    let wrongFolder = null;
    for (const stem of stems) {
        const found = findWrongFolder(stem, event.folder, index);
        if (found) wrongFolder = { folder: found, stem: stem };
    }
    const liveAlias = (aliases.get(event.eventId) || []).filter(row => hasOgg((index[row.folder] || new Map()).get(row.stem)));
    let status = "unset";
    let reason = null;
    let foundFolder = null;
    let foundStem = event.stem;
    if (have.length === stems.length && stems.length > 0) {
        status = "present";
    } else if (wrongFolder) {
        status = "misnamed";
        reason = "wrong-folder";
        foundFolder = wrongFolder.folder;
        foundStem = wrongFolder.stem;
    } else if (liveAlias.length) {
        status = "misnamed";
        reason = "alias";
    } else {
        status = "missing";
        reason = have.length ? "incomplete-variants" : "absent";
    }
    return {
        eventId: event.eventId,
        category: event.category,
        folder: event.folder,
        stem: foundStem,
        status: status,
        reason: reason,
        foundFolder: foundFolder
    };
}

function unknownFiles(files, events, census) {
    const canonical = new Set();
    const knownStems = new Set();
    for (const event of events) {
        for (const stem of variantStems(event.stem, event.variants)) {
            canonical.add(event.folder + "/" + stem);
            knownStems.add(stem);
        }
    }
    const aliases = new Set();
    for (const row of census || []) {
        if (row.mapsTo != null) aliases.add(row.folder + "/" + row.stem);
    }
    const unknown = [];
    for (const file of files) {
        const key = file.folder + "/" + file.stem;
        if (file.ext === ".ogg" && (canonical.has(key) || knownStems.has(file.stem))) continue;
        if (aliases.has(key)) continue;
        unknown.push({ folder: file.folder, file: file.file, stem: file.stem, ext: file.ext, size: file.size, status: "unknown" });
    }
    return unknown;
}

function dataDrift(doc) {
    const published = buildPublishedData();
    const errors = [];
    for (const key of Object.keys(published)) {
        if (!deepEqual(doc[key], published[key])) errors.push({ code: "data-drift", key: key });
    }
    return errors;
}

function censusDrift(doc, files) {
    const errors = [];
    const want = files.map(censusRowFor);
    const got = new Map((doc.legacyCensus || []).map(row => [row.folder + "/" + row.file, row]));
    const seen = new Set();
    for (const row of want) {
        const key = row.folder + "/" + row.file;
        seen.add(key);
        if (!deepEqual(got.get(key), row)) errors.push({ code: "census-mismatch", key: key });
    }
    for (const row of doc.legacyCensus || []) {
        const key = row.folder + "/" + row.file;
        if (!seen.has(key)) errors.push({ code: "census-mismatch", key: key, reason: "extra" });
    }
    const ids = new Set(expandEvents(doc).map(event => event.eventId));
    for (const row of doc.legacyCensus || []) {
        const targets = row.mapsTo == null ? [] : (Array.isArray(row.mapsTo) ? row.mapsTo : [row.mapsTo]);
        for (const id of targets) {
            if (!ids.has(id)) errors.push({ code: "unknown-alias", key: row.folder + "/" + row.stem, eventId: id });
        }
    }
    return errors;
}

function extractBlocks(md, headingRe) {
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    const out = {};
    for (let i = 0; i < lines.length; i++) {
        const match = headingRe.exec(lines[i]);
        if (!match) continue;
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        const para = [];
        while (j < lines.length && lines[j].trim() !== "" && lines[j].charAt(0) !== "#") {
            para.push(lines[j].trim());
            j++;
        }
        out[match[1]] = { id: match[1], title: match[2], statement: para.join(" ") };
    }
    return out;
}

function extractRules(md) {
    const blocks = extractBlocks(md, /^### (AU-[A-Z]+-\d{3}) - (.+)$/);
    const rules = {};
    for (const id of Object.keys(blocks)) {
        const block = blocks[id];
        let level = null;
        if (block.statement.indexOf("SHOULD:") === 0) level = "SHOULD";
        else if (block.statement.indexOf("MUST:") === 0) level = "MUST";
        rules[id] = {
            id: id,
            level: level,
            section: SECTION[id.split("-")[1]] || null,
            title: block.title,
            statement: block.statement
        };
    }
    return rules;
}

function extractNotes(md, headingRe) {
    const blocks = extractBlocks(md, headingRe);
    const out = {};
    for (const id of Object.keys(blocks)) out[id] = blocks[id];
    return out;
}

function diffNamed(extracted, actual) {
    const missingInJson = [];
    const missingInMd = [];
    const statementMismatches = [];
    const levelMismatches = [];
    for (const id of Object.keys(extracted)) {
        if (!actual || !actual[id]) missingInJson.push(id);
        else {
            if (actual[id].statement !== extracted[id].statement) statementMismatches.push(id);
            if (actual[id].title !== extracted[id].title) statementMismatches.push(id + ":title");
            if (extracted[id].level && actual[id].level !== extracted[id].level) levelMismatches.push(id);
        }
    }
    const have = new Set(Object.keys(extracted));
    for (const id of Object.keys(actual || {})) if (!have.has(id)) missingInMd.push(id);
    return { missingInJson: missingInJson, missingInMd: missingInMd, statementMismatches: statementMismatches, levelMismatches: levelMismatches };
}

function mdMentionsCanonical(md) {
    const text = String(md);
    const lists = [
        CANONICAL.damageTypes, CANONICAL.spellSchools, CANONICAL.biomes, CANONICAL.depthBands,
        CANONICAL.weathers, CANONICAL.seasons, CANONICAL.surfaces, CANONICAL.gaits, CANONICAL.sizes,
        CANONICAL.creatureTypes, CANONICAL.races, CANONICAL.weaponGroups, CANONICAL.workActions,
        CANONICAL.deliveryShapes, CANONICAL.spellPhases, CANONICAL.vocalCalls, CANONICAL.emotes,
        CANONICAL.musicStates, CANONICAL.hitMaterials
    ];
    const missing = [];
    for (const list of lists) {
        for (const token of list) if (text.indexOf(token) < 0) missing.push(token);
    }
    return missing;
}

function wbsIds(text) {
    const hits = [];
    const re = /\b(?:WG|SIM|SOC|DW|OPS)\.\d+(?:\.\d+)*/g;
    let match;
    while ((match = re.exec(String(text)))) hits.push(match[0]);
    return hits;
}

function missingKeys(have, need) {
    const out = [];
    for (const key of need) if (!Object.prototype.hasOwnProperty.call(have || {}, key)) out.push(key);
    return out;
}

function listAudio(root) {
    const files = [];
    function walk(dir, folder) {
        for (const name of fs.readdirSync(dir)) {
            if (name.charAt(0) === ".") continue;
            const full = path.join(dir, name);
            const st = fs.statSync(full);
            if (st.isDirectory()) {
                walk(full, folder);
                continue;
            }
            const rel = path.relative(path.join(root, folder), full).split(path.sep).join("/");
            files.push({
                folder: folder,
                file: rel,
                stem: path.basename(name, path.extname(name)),
                ext: path.extname(name).toLowerCase(),
                size: st.size
            });
        }
    }
    for (const folder of FOLDERS) {
        const dir = path.join(root, folder);
        if (!fs.existsSync(dir)) continue;
        walk(dir, folder);
    }
    files.sort((a, b) => (a.folder + "/" + a.file).localeCompare(b.folder + "/" + b.file));
    return files;
}

function evaluate(doc, schema, files, opts, mdText) {
    const documentErrors = [];
    const schemaErrors = validateAgainst(schema, schema, doc, "");
    for (const err of schemaErrors) documentErrors.push(err);
    let events = [];
    try {
        events = expandEvents(doc);
    } catch (e) {
        documentErrors.push({ code: e.code || "bad-template", message: e.message });
    }
    const eventSchema = schema && schema.$defs && schema.$defs.event;
    if (eventSchema) {
        for (const event of events) {
            const nested = validateAgainst(schema, eventSchema, event, "/expanded/" + event.eventId);
            for (const err of nested) documentErrors.push(err);
        }
    }
    for (const event of events) {
        for (const err of semanticEventErrors(event, doc)) documentErrors.push(err);
    }
    if (doc.profile === "full") {
        for (const err of dataDrift(doc)) documentErrors.push(err);
        for (const problem of selfCheck()) documentErrors.push({ code: "self-check", detail: problem });
        for (const err of censusDrift(doc, files)) documentErrors.push(err);
        if (!doc.openQuestions || !Object.keys(doc.openQuestions).length) documentErrors.push({ code: "open-questions" });
        if (!doc.proposedFollowUps || !Object.keys(doc.proposedFollowUps).length) documentErrors.push({ code: "proposed" });
        if (mdText != null) {
            const ruleDiff = diffNamed(extractRules(mdText), doc.rules);
            if (ruleDiff.missingInJson.length || ruleDiff.missingInMd.length || ruleDiff.statementMismatches.length || ruleDiff.levelMismatches.length) {
                documentErrors.push({ code: "rule-drift", diff: ruleDiff });
            }
            const oq = diffNamed(extractNotes(mdText, /^### (OQ-\d{2}) - (.+)$/), doc.openQuestions);
            if (oq.missingInJson.length || oq.missingInMd.length || oq.statementMismatches.length) {
                documentErrors.push({ code: "question-drift", diff: oq });
            }
            const proposed = diffNamed(extractNotes(mdText, /^### (PROPOSED-AM-\d{2}) - (.+)$/), doc.proposedFollowUps);
            if (proposed.missingInJson.length || proposed.missingInMd.length || proposed.statementMismatches.length) {
                documentErrors.push({ code: "proposal-drift", diff: proposed });
            }
            const mentions = mdMentionsCanonical(mdText);
            if (mentions.length) documentErrors.push({ code: "md-missing-token", tokens: mentions });
        }
    }
    const index = indexFiles(files);
    const aliases = aliasMap(doc.legacyCensus);
    const items = events.map(event => classifyEvent(event, index, aliases));
    const unknown = unknownFiles(files, events, doc.legacyCensus);
    const shown = opts.category ? items.filter(item => item.category === opts.category) : items;
    const shownUnknown = opts.category ? [] : unknown;
    const counts = { present: 0, missing: 0, misnamed: 0, unknown: shownUnknown.length };
    const byCategory = {};
    for (const item of shown) {
        counts[item.status] = (counts[item.status] || 0) + 1;
        if (!byCategory[item.category]) byCategory[item.category] = { present: 0, missing: 0, misnamed: 0 };
        if (byCategory[item.category][item.status] != null) byCategory[item.category][item.status] += 1;
    }
    const violations = shown.filter(item => item.status === "missing" || item.status === "misnamed");
    const report = {
        ok: documentErrors.length === 0 && counts.missing === 0 && counts.misnamed === 0 && counts.unknown === 0,
        schemaVersion: doc.schemaVersion || null,
        profile: doc.profile || null,
        category: opts.category || null,
        wroteAudio: false,
        decodedAudio: false,
        documentErrors: documentErrors,
        eventCount: shown.length,
        counts: counts,
        byCategory: byCategory,
        violations: violations,
        unknownFiles: shownUnknown
    };
    let exitCode = 0;
    if (documentErrors.length) exitCode = 2;
    else if (opts.strict && (counts.missing + counts.misnamed + counts.unknown) > 0) exitCode = 1;
    return { exitCode: exitCode, report: report };
}

function formatHuman(report) {
    const lines = [];
    lines.push("DEUS audio standard coverage");
    lines.push("documentErrors: " + report.documentErrors.length);
    lines.push("events: " + report.eventCount);
    lines.push("present: " + report.counts.present);
    lines.push("missing: " + report.counts.missing);
    lines.push("misnamed: " + report.counts.misnamed);
    lines.push("unknown: " + report.counts.unknown);
    for (const category of Object.keys(report.byCategory)) {
        const row = report.byCategory[category];
        lines.push("category " + category + " present=" + row.present + " missing=" + row.missing + " misnamed=" + row.misnamed);
    }
    if (report.documentErrors.length) {
        lines.push("document errors:");
        for (const err of report.documentErrors.slice(0, 30)) lines.push("  " + JSON.stringify(err));
    }
    return lines.join("\n") + "\n";
}

function repoRoot() {
    return path.resolve(__dirname, "..", "..");
}

function parseArgs(argv) {
    const opts = { json: false, strict: false, category: null, standard: null, schema: null, audio: null, md: null, help: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--json") opts.json = true;
        else if (arg === "--strict") opts.strict = true;
        else if (arg === "--help") opts.help = true;
        else if (arg === "--category" || arg === "--standard" || arg === "--schema" || arg === "--audio" || arg === "--md") {
            const value = argv[i + 1];
            if (!value || value.indexOf("--") === 0) {
                const err = new Error("missing value for " + arg);
                err.code = "usage";
                throw err;
            }
            i += 1;
            if (arg === "--category") opts.category = value;
            if (arg === "--standard") opts.standard = value;
            if (arg === "--schema") opts.schema = value;
            if (arg === "--audio") opts.audio = value;
            if (arg === "--md") opts.md = value;
        } else {
            const err = new Error("unknown argument " + arg);
            err.code = "usage";
            throw err;
        }
    }
    return opts;
}

function readJson(file) {
    let text = fs.readFileSync(file, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return JSON.parse(text);
}

function run(argv) {
    let opts;
    try {
        opts = parseArgs(argv || []);
    } catch (e) {
        return { exitCode: 2, stdout: e.message + "\n", report: null };
    }
    if (opts.help) {
        return { exitCode: 0, stdout: "usage: node tools/audio/validate_audio_standard.js [--json] [--strict] [--category CAT] [--standard FILE] [--schema FILE] [--audio DIR] [--md FILE]\n", report: null };
    }
    const root = repoRoot();
    const standardPath = opts.standard || path.join(root, "game", "data", "UF_AudioStandard.json");
    const schemaPath = opts.schema || path.join(root, "game", "data", "UF_AudioStandard.schema.json");
    const audioRoot = opts.audio || path.join(root, "game", "audio");
    const mdPath = opts.md || path.join(root, "docs", "audio", "DEUS_AUDIO_STANDARD.md");
    let doc;
    let schema;
    try {
        doc = readJson(standardPath);
        schema = readJson(schemaPath);
    } catch (e) {
        return { exitCode: 2, stdout: "read error: " + e.message + "\n", report: null };
    }
    if (opts.category && (!doc.categories || !doc.categories[opts.category])) {
        return { exitCode: 2, stdout: "unknown category " + opts.category + "\n", report: null };
    }
    let files = [];
    try {
        files = listAudio(audioRoot);
    } catch (e) {
        return { exitCode: 2, stdout: "audio inventory error: " + e.message + "\n", report: null };
    }
    let mdText = null;
    if (doc.profile === "full") {
        try {
            mdText = fs.readFileSync(mdPath, "utf8");
        } catch (e) {
            return { exitCode: 2, stdout: "markdown read error: " + e.message + "\n", report: null };
        }
    }
    const result = evaluate(doc, schema, files, opts, mdText);
    const stdout = opts.json ? JSON.stringify(result.report, null, 2) + "\n" : formatHuman(result.report);
    return { exitCode: result.exitCode, stdout: stdout, report: result.report };
}

if (require.main === module) {
    try {
        const result = run(process.argv.slice(2));
        process.stdout.write(result.stdout);
        process.exit(result.exitCode);
    } catch (e) {
        process.stderr.write(String(e && e.stack || e) + "\n");
        process.exit(2);
    }
}

module.exports = {
    CANONICAL: CANONICAL,
    STEM_RE: STEM_RE,
    EVENT_ID_RE: EVENT_ID_RE,
    stemFromEventId: stemFromEventId,
    buildPublishedData: buildPublishedData,
    assemble: assemble,
    expandEvents: expandEvents,
    classifyLegacyStem: classifyLegacyStem,
    censusRowFor: censusRowFor,
    selfCheck: selfCheck,
    unsupportedSchemaKeywords: unsupportedSchemaKeywords,
    validateAgainst: validateAgainst,
    extractRules: extractRules,
    extractNotes: extractNotes,
    diffNamed: diffNamed,
    mdMentionsCanonical: mdMentionsCanonical,
    wbsIds: wbsIds,
    missingKeys: missingKeys,
    listAudio: listAudio,
    evaluate: evaluate,
    run: run
};
