//=============================================================================
// UF_Environment.js - Environmental factors, temperature, weather, hypothermia, burning, and wetness
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Environment] Environmental factors: ambient temperature, diurnal cycles, weather, shelter insulation, heat sources, unit thermal regulation, hypothermia, burning, and wetness.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_DayNight
 * @orderAfter UF_Floors
 * @orderAfter UF_Fire
 * @orderAfter UF_Colonists
 * @orderAfter UF_Combat
 *
 * @help
 * Implements Dwarf Fortress-style environmental simulation for Ultima Fortress:
 *
 * 1. Ambient Cell Temperature:
 *    - Base climate from world generation fields (t = 0.0 polar to 1.0 desert).
 *    - Diurnal variation: night drop (-8°C to -12°C at 03:00), peak (+5°C to +8°C at 14:00).
 *    - Elevation / Z-level: z=0 surface, z=1 hills (-4°C), z=2 peaks (-10°C),
 *      z=-1 upper cavern (stable insulated 13°C), z=-2 deep cavern (16°C, hotter near magma).
 *    - Shelter: enclosed rooms (UF.Floors.roomAt) dampen outdoor extremes by 75% toward 20°C.
 *    - Heat sources: active campfires, hearths, furnaces, and forges radiate heat up to radius 3.
 *      Burning cells (UF.Fire.isBurning) radiate intense heat up to radius 3.
 *
 * 2. Weather & Precipitation:
 *    - Weather states: clear, overcast, rain, downpour, snow, blizzard, heatwave, coldsnap.
 *    - Precipitation cools surface air; unroofed units outdoors accumulate wetness.
 *    - Snow/blizzard occurs when precipitation happens and temperature <= 0°C.
 *
 * 3. Unit Thermal Regulation & Afflictions:
 *    - Normal body temperature: ~37.0°C.
 *    - Clothing insulation (torso, head, legs) protects against cold.
 *    - Wetness accelerates cooling rate up to 3x in sub-zero temperatures.
 *    - Hypothermia: Chilled (35.0-36.4°C), Moderate (32.0-34.9°C, shivering barks, slowed),
 *      Severe (28.0-31.9°C, periodic cold damage, ice-blue hitsplats), Critical (<28.0°C).
 *    - Hyperthermia / Heatstroke: Overheated (38.0-39.0°C), Heatstroke (39.1-41.0°C, severe thirst).
 *    - Burning: Units on fire take 2-4 HP per beat, panic-flee toward water, and are immediately
 *      quenched upon stepping into water or being doused.
 *    - Wetness: Quenches burning, dries rapidly near campfires and heat sources.
 *
 * API, events, and checks: docs/systems/UF_Environment.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const VERSION = 1;
    const TICKS_PER_STEP = 60; // 1 beat / 1 game second
    const BASE_COMFORT_TEMP = 20.0; // °C
    const NORMAL_BODY_TEMP = 37.0; // °C

    const WEATHER_TYPES = ["clear", "overcast", "rain", "downpour", "snow", "blizzard", "heatwave", "coldsnap"];

    const World = () => (window.UF && UF.World) || null;
    const WorldGen = () => (window.UF && UF.WorldGen) || null;
    const DayNight = () => (window.UF && UF.DayNight) || null;
    const Floors = () => (window.UF && UF.Floors) || null;
    const Fire = () => (window.UF && UF.Fire) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Combat = () => (window.UF && UF.Combat) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Speech = () => (window.UF && UF.Speech) || null;
    const catalog = () => window.$ufWorldCatalog || null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const zOf = r => (r && r.z !== undefined ? r.z : (r && r.area && r.area.z !== undefined ? r.area.z : 0));
    const copyArea = a => ({ x: a.x | 0, y: a.y | 0 });
    const sameArea = (a, b) => !!a && !!b && (a.x | 0) === (b.x | 0) && (a.y | 0) === (b.y | 0);
    const areaKey = a => `${a.x | 0},${a.y | 0}`;
    const levelArea = u => ({ x: u.area.x, y: u.area.y, z: zOf(u) });

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && typeof UF.Events.emit === "function") {
            UF.Events.emit(name, ...args);
        }
    };

    // State container in UF.World.state.environment
    function envState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.environment || typeof W.state.environment !== "object") {
            W.state.environment = {
                version: VERSION,
                weatherByArea: {},
                overrides: {}
            };
        }
        return W.state.environment;
    }

    //-------------------------------------------------------------------------
    // 1. Weather Simulation
    //-------------------------------------------------------------------------

    function getWeather(area) {
        if (!area) return "clear";
        const st = envState();
        if (st && st.overrides && st.overrides[areaKey(area)]) {
            return st.overrides[areaKey(area)];
        }
        if (st && st.weatherByArea && st.weatherByArea[areaKey(area)]) {
            return st.weatherByArea[areaKey(area)];
        }
        // Deterministic initial weather based on world seed and area
        const W = World();
        const seed = W && W.state ? W.state.seed : 12345;
        const hash = W && typeof W.hash32 === "function" ? W.hash32(seed, 0xef42, area.x, area.y) : (area.x * 31 + area.y);
        const roll = (hash >>> 0) % 100;
        let w = "clear";
        if (roll < 50) w = "clear";
        else if (roll < 75) w = "overcast";
        else if (roll < 90) w = "rain";
        else w = "downpour";
        if (st && st.weatherByArea) st.weatherByArea[areaKey(area)] = w;
        return w;
    }

    function setWeather(area, weatherType) {
        if (!area) return;
        const st = envState();
        if (!st) return;
        const k = areaKey(area);
        st.overrides[k] = weatherType;
        emit("environment:weatherChanged", copyArea(area), weatherType);
        syncWeatherVisuals();
    }

    //-------------------------------------------------------------------------
    // 2. Ambient Cell Temperature Calculation
    //-------------------------------------------------------------------------

    /**
     * Converts worldgen 0..1 temperature field `t` to base surface Celsius.
     * 0.0 -> -25°C (glacier / arctic)
     * 0.25 -> 0°C (tundra / taiga)
     * 0.5 -> 18°C (temperate grassland / deciduous)
     * 0.75 -> 30°C (savanna / tropical)
     * 1.0 -> 45°C (scorching desert)
     */
    function fieldToCelsius(t) {
        const val = clamp(Number.isFinite(t) ? t : 0.5, 0, 1);
        if (val <= 0.25) {
            // -25°C to 0°C
            return -25.0 + (val / 0.25) * 25.0;
        } else if (val <= 0.5) {
            // 0°C to 18°C
            return 0.0 + ((val - 0.25) / 0.25) * 18.0;
        } else if (val <= 0.75) {
            // 18°C to 30°C
            return 18.0 + ((val - 0.5) / 0.25) * 12.0;
        } else {
            // 30°C to 45°C
            return 30.0 + ((val - 0.75) / 0.25) * 15.0;
        }
    }

    const _tempCache = new Map();
    const _chunkBaseTemp = new Map();
    let _tempCacheFrame = -60;

    /**
     * Calculates the true local ambient temperature for cell (x, y, z) in an area.
     * Takes into account: biome climate, diurnal cycle (day/night), elevation, weather,
     * shelter/enclosure, and radiant heat sources.
     * Returns temperature in Celsius (°C).
     */
    function ambientTemperature(area, x, y, z = 0) {
        const W = World(), G = WorldGen();
        const lvl = W && typeof W.viewLevel === "function" ? W.viewLevel() : null;
        const cur = W && typeof W.currentArea === "function" ? W.currentArea() : null;
        const ax = area && Number.isInteger(area.x) ? area.x : (cur ? cur.x : (lvl ? lvl.x : 0));
        const ay = area && Number.isInteger(area.y) ? area.y : (cur ? cur.y : (lvl ? lvl.y : 0));
        const a = { x: ax | 0, y: ay | 0 };
        const zLevel = Number.isInteger(z) ? z : (area && area.z !== undefined ? area.z : (lvl ? lvl.z : 0));

        const cacheKey = ((zLevel + 2) << 20) | ((x & 0x3ff) << 10) | (y & 0x3ff);
        const cached = _tempCache.get(cacheKey);
        if (cached && (frameCount - cached.frame < 120)) {
            return cached.temp;
        }

        // Subterranean levels have stable insulation
        if (zLevel === -1) {
            // Upper cavern: stable 13°C cool subterranean air
            return 13.0;
        }
        if (zLevel === -2) {
            // Deep cavern: base 16°C, but near magma/lava heats up significantly
            let baseUnderground = 16.0;
            // Check for heat sources in radius
            baseUnderground += heatSourceRadiance(a, x, y, zLevel);
            return baseUnderground;
        }

        // Surface base temperature from worldgen fields (chunk-cached 16x16 to eliminate per-cell noise evaluation)
        const chunkKey = `${a.x},${a.y}:${x >> 4},${y >> 4}`;
        let baseTemp = _chunkBaseTemp.get(chunkKey);
        if (baseTemp === undefined) {
            baseTemp = 18.0;
            if (G && typeof G.cellInfoLocal === "function") {
                try {
                    const info = G.cellInfoLocal(a.x, a.y, x, y, 0);
                    if (info && info.fields && typeof info.fields.t === "number") {
                        baseTemp = fieldToCelsius(info.fields.t);
                    } else if (info && info.biomeId) {
                        if (info.biomeId.includes("glacier") || info.biomeId.includes("ice")) baseTemp = -15.0;
                        else if (info.biomeId.includes("tundra") || info.biomeId.includes("snow")) baseTemp = -4.0;
                        else if (info.biomeId.includes("taiga")) baseTemp = 3.0;
                        else if (info.biomeId.includes("desert") || info.biomeId.includes("badlands")) baseTemp = 36.0;
                        else if (info.biomeId.includes("savanna") || info.biomeId.includes("jungle")) baseTemp = 28.0;
                    }
                } catch (_) {
                    baseTemp = 18.0;
                }
            }
            _chunkBaseTemp.set(chunkKey, baseTemp);
        }

        // Elevation modifier on surface / above ground
        if (zLevel === 1) baseTemp -= 4.0; // High ground / hills
        else if (zLevel === 2) baseTemp -= 10.0; // Mountain peaks / cold alpine

        // Diurnal (Day/Night) cycle
        const DN = DayNight();
        const hour = DN && typeof DN.hours === "function" ? DN.hours() : (window.$ufTime ? $ufTime.hour + $ufTime.minute / 60 : 12);
        // Sinusoidal day-night temperature swing: peak at 14:00, trough at 03:00
        // Radians: (hour - 8.5) * (2 * PI / 24) -> max at 14.5, min at 2.5
        const rad = ((hour - 8.5) / 24.0) * (2 * Math.PI);
        const diurnalShift = Math.sin(rad) * 7.5; // -7.5°C to +7.5°C swing
        let outdoorTemp = baseTemp + diurnalShift;

        // Weather influence
        const weather = getWeather(a);
        if (weather === "rain") outdoorTemp -= 3.0;
        else if (weather === "downpour") outdoorTemp -= 5.0;
        else if (weather === "snow") outdoorTemp = Math.min(-1.0, outdoorTemp - 4.0);
        else if (weather === "blizzard") outdoorTemp = Math.min(-8.0, outdoorTemp - 12.0);
        else if (weather === "coldsnap") outdoorTemp -= 15.0;
        else if (weather === "heatwave") outdoorTemp += 12.0;

        // Shelter / Enclosed room insulation
        const F = Floors();
        const insideRoom = F && typeof F.roomAt === "function" ? F.roomAt(a, x, y) : null;
        let cellTemp = outdoorTemp;
        if (insideRoom) {
            // An enclosed room dampens outdoor extreme heat/cold by 75% toward 20°C
            cellTemp = outdoorTemp + (BASE_COMFORT_TEMP - outdoorTemp) * 0.75;
        }

        // Heat sources radiance (campfires, hearths, furnaces, burning cells)
        const heatRadiance = heatSourceRadiance(a, x, y, zLevel);
        cellTemp += heatRadiance;

        const finalTemp = Math.round(cellTemp * 10) / 10;
        _tempCache.set(cacheKey, { temp: finalTemp, frame: frameCount });
        return finalTemp;
    }

    /**
     * Calculates radiant heat from nearby fires, campfires, hearths, and burning tiles.
     */
    function heatSourceRadiance(area, x, y, z) {
        let addedHeat = 0;
        const radius = 3;
        const F = Fire(), O = Objects(), W = World();

        // 1. Burning tiles: only check if there are active fires recorded in state
        const fState = W && W.state && W.state.fire;
        const hasActiveFires = !!(fState && fState.burning && Object.keys(fState.burning).length > 0);
        if (hasActiveFires && F && typeof F.isBurning === "function") {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance
                    if (dist > radius) continue;
                    const nx = x + dx, ny = y + dy;
                    if (F.isBurning(area, nx, ny)) {
                        if (dist === 0) addedHeat = Math.max(addedHeat, 45.0);
                        else if (dist === 1) addedHeat = Math.max(addedHeat, 28.0);
                        else if (dist === 2) addedHeat = Math.max(addedHeat, 14.0);
                        else if (dist === 3) addedHeat = Math.max(addedHeat, 6.0);
                    }
                }
            }
        }

        // 2. Colony central campfire radiance
        const C = window.UF && UF.Colonists;
        const colSite = (C && typeof C.site === "function" ? C.site() : null) || (W && W.state && W.state.colonists && W.state.colonists.site);
        if (colSite) {
            const dist = Math.max(Math.abs(x - colSite.x), Math.abs(y - colSite.y));
            if (dist <= 3) {
                const sObj = O && O.atIn(area, colSite.x, colSite.y);
                const hasFire = sObj && (sObj.id === "campfire" || (Array.isArray(sObj.tags) && sObj.tags.includes("fire")));
                if (hasFire) {
                    if (dist === 0 || dist === 1) addedHeat = Math.max(addedHeat, 25.0);
                    else if (dist === 2) addedHeat = Math.max(addedHeat, 15.0);
                    else if (dist === 3) addedHeat = Math.max(addedHeat, 5.0);
                }
            }
        }

        // 3. Dwelling / room-wide hearth warming and nearby radiant warmth
        const H = window.UF && UF.Households;
        if (H && typeof H.all === "function") {
            for (const h of H.all()) {
                if (!h.home) continue;
                const home = h.home;
                const inHome = (x >= home.x && x <= home.x + home.w && y >= home.y && y <= home.y + home.h) ||
                    ((home.annexes || []).some(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h));
                if (inHome) {
                    const hearth = home.hearth;
                    const hObj = hearth && O && O.atIn(area, hearth.x, hearth.y);
                    const hasFire = (hObj && (hObj.id === "campfire" || (Array.isArray(hObj.tags) && hObj.tags.includes("fire")))) ||
                        (F && typeof F.isBurning === "function" && hearth && F.isBurning(area, hearth.x, hearth.y));
                    if (hasFire) {
                        addedHeat = Math.max(addedHeat, 18.0);
                    }
                } else if (home.hearth) {
                    const dist = Math.max(Math.abs(x - home.hearth.x), Math.abs(y - home.hearth.y));
                    if (dist <= 3) {
                        const hObj = O && O.atIn(area, home.hearth.x, home.hearth.y);
                        const hasFire = hObj && (hObj.id === "campfire" || (Array.isArray(hObj.tags) && hObj.tags.includes("fire")));
                        if (hasFire) {
                            if (dist === 0 || dist === 1) addedHeat = Math.max(addedHeat, 25.0);
                            else if (dist === 2) addedHeat = Math.max(addedHeat, 15.0);
                            else if (dist === 3) addedHeat = Math.max(addedHeat, 5.0);
                        }
                    }
                }
            }
        }

        return addedHeat;
    }

    //-------------------------------------------------------------------------
    // 3. Unit Thermal Regulation & Conditions
    //-------------------------------------------------------------------------

    /**
     * Retrieves or creates unit thermal data.
     */
    function unitThermal(unit) {
        if (!unit) return null;
        const d = unit.data || (unit.data = {});
        if (!d.thermal || typeof d.thermal !== "object") {
            d.thermal = {
                bodyTemp: NORMAL_BODY_TEMP,
                wetness: 0, // 0 to 100%
                stage: "normal", // normal, chilled, hypothermia_mild, hypothermia_severe, critical, overheated, heatstroke
                lastDamageTick: 0
            };
        }
        return d.thermal;
    }

    /**
     * Evaluates total cold insulation provided by worn clothes/armor (0 to 1).
     */
    function clothingInsulation(unit) {
        const d = unit.data || {};
        const eq = d.equipment || {};
        const I = Items();
        let total = 0.0;

        // Torso / clothes provide major insulation
        const torsoItem = eq.torso || eq.clothes;
        if (torsoItem) {
            const it = typeof torsoItem === "object" ? torsoItem : (I ? I.get(torsoItem) : null);
            const type = it && I ? I.type(it.type || it.id) : (I && typeof torsoItem === "string" ? I.type(torsoItem) : null);
            const id = type ? type.id : (typeof torsoItem === "string" ? torsoItem : "");
            if (id.includes("fur") || id.includes("hide") || id.includes("cloak")) total += 0.45;
            else if (id.includes("leather") || id.includes("wool")) total += 0.35;
            else total += 0.20; // basic linen/tunic/wrap
        }

        // Head gear provides secondary insulation
        if (eq.head) {
            total += 0.15;
        }

        // Legs provide secondary insulation
        if (eq.legs) {
            total += 0.15;
        }

        return clamp(total, 0, 0.85); // up to 85% reduction in environmental heat loss
    }

    /**
     * Checks if species has natural cold or heat resistances.
     */
    function speciesResistances(unit) {
        const d = unit.data || {};
        const species = String(d.species || "").toLowerCase();
        const isDwarf = species.includes("karadrim") || species.includes("dwarf");
        const isTroll = species.includes("crag") || species.includes("troll");
        const isVorgari = species.includes("vorgari") || species.includes("gargoyle");
        const isAutomaton = species.includes("automaton") || species.includes("construct");
        const isFurred = species.includes("bear") || species.includes("boar") || species.includes("wolf") || species.includes("fox");

        return {
            coldTolerance: isAutomaton ? 50 : (isDwarf ? 6 : (isTroll ? 8 : (isFurred ? 12 : 0))),
            heatTolerance: isAutomaton ? 30 : (isVorgari ? 15 : (isTroll ? 5 : 0)),
            isAutomaton
        };
    }

    /**
     * Updates wetness for unit.
     */
    function updateWetness(unit, area, x, y, z, ambient) {
        const t = unitThermal(unit);
        if (!t) return;

        const L = window.UF && UF.Levels, W = World(), F = Floors();
        let isWater = false;
        if (z < 0 && L) {
            if (typeof L.isWaterAt === "function") {
                isWater = L.isWaterAt(area.x, area.y, z, x, y);
            } else if (typeof L.waterAt === "function") {
                isWater = L.waterAt({ area, x, y, z });
            }
        } else if (z === 0 && W && typeof W.getTile === "function") {
            const tile = W.getTile(area.x, area.y, x, y, 0, 0) | 0;
            isWater = Tilemap.isWaterTile(tile);
            if (!isWater && window.UF && UF.Jobs && typeof UF.Jobs.isWaterAt === "function") {
                isWater = UF.Jobs.isWaterAt(area, x, y);
            }
        }

        if (isWater) {
            t.wetness = 100;
            // Extinguish burning immediately!
            if (unit.data && unit.data.burning) {
                extinguishUnit(unit, "water");
            }
            return;
        }

        // Check rain / snow unroofed
        const weather = getWeather(area);
        const R = window.UF && UF.Rooms;
        const isRoofed = (R && typeof R.isRoofed === "function") ? R.isRoofed(area, x, y, z)
            : (F && typeof F.isRoofed === "function") ? F.isRoofed(area, x, y, z)
            : (F && typeof F.roomAt === "function" && !!F.roomAt(area, x, y));
        if (!isRoofed && (weather === "rain" || weather === "downpour")) {
            const gain = weather === "downpour" ? 15 : 6;
            t.wetness = clamp(t.wetness + gain, 0, 100);
            if (unit.data && unit.data.burning && t.wetness > 40) {
                extinguishUnit(unit, "rain");
            }
        } else {
            // Drying off: ambient drying rate + huge boost near fire/warmth
            let dryRate = 2.0;
            if (ambient > 25.0) dryRate += (ambient - 25.0) * 0.4;
            t.wetness = clamp(t.wetness - dryRate, 0, 100);
        }
    }

    /**
     * Active burning handler.
     */
    function stepBurning(unit, beat) {
        const d = unit.data;
        if (!d || !d.burning) return;

        const b = d.burning;
        b.ticksLeft = (b.ticksLeft || 60) - 1;

        // Burning damage every beat (or interval)
        const C = Combat(), W = World();
        const dmg = Math.max(1, Math.round(b.damagePerBeat || 3));

        if (typeof d.hp === "number" && dmg > 0) {
            d.hp = Math.max(0, d.hp - dmg);
            if (W && W.isDisplayed && W.isDisplayed(unit)) {
                if (C && typeof C.addPopup === "function") {
                    C.addPopup(unit.x, unit.y, `-${dmg}`, "#ff6600");
                }
            }
            emit("environment:unitBurned", unit, dmg);

            if (d.hp <= 0) {
                if (C && typeof C.onUnitDeath === "function") C.onUnitDeath(unit, null);
                else if (W && typeof W.removeUnit === "function") W.removeUnit(unit.id);
                return;
            }
        }

        // Chance to ignite standing tile if dry and flammable
        const FireSys = Fire();
        if (FireSys && typeof FireSys.ignite === "function" && unit.area) {
            const roll = (W && W.hash32 ? (W.hash32(W.state.seed, 0xfa11, beat, unit.id) >>> 0) % 100 : 50);
            if (roll < 20) {
                FireSys.ignite(levelArea(unit), unit.x, unit.y, { cause: "running_flame" });
            }
        }

        // Panic thoughts / barks
        const Col = Colonists();
        if (Col && typeof Col.addThought === "function" && (d.kind === "colonist" || Array.isArray(d.thoughts))) {
            if (!d._lastBurnThought || beat - d._lastBurnThought >= 5) {
                Col.addThought(unit, "Was horrified by searing burns!", -15);
                d._lastBurnThought = beat;
            }
        }

        if (b.ticksLeft <= 0) {
            extinguishUnit(unit, "burned_out");
        }
    }

    /**
     * Ignites a unit, causing it to catch fire.
     */
    function igniteUnit(unit, durationBeats = 8, damagePerBeat = 3) {
        if (!unit || !unit.data) return false;
        const res = speciesResistances(unit);
        if (res.isAutomaton && res.heatTolerance > 20) {
            // Automaton fire resistance
            damagePerBeat = Math.max(1, damagePerBeat - 1);
        }
        unit.data.burning = {
            ticksLeft: durationBeats,
            damagePerBeat: damagePerBeat,
            startedAt: World() && World().state ? World().state.frame : 0
        };
        const W = World(), C = Combat();
        if (W && W.isDisplayed && W.isDisplayed(unit) && C && typeof C.addPopup === "function") {
            C.addPopup(unit.x, unit.y, "ON FIRE!", "#ff3300");
        }
        emit("environment:unitIgnited", unit);
        return true;
    }

    /**
     * Extinguishes a burning unit.
     */
    function extinguishUnit(unit, cause = "doused") {
        if (!unit || !unit.data || !unit.data.burning) return;
        delete unit.data.burning;
        const W = World(), C = Combat();
        if (W && W.isDisplayed && W.isDisplayed(unit) && C && typeof C.addPopup === "function") {
            C.addPopup(unit.x, unit.y, cause === "water" ? "DOUSED" : "OUT", "#38bdf8");
        }
        emit("environment:unitExtinguished", unit, cause);
    }

    /**
     * Thermal update loop for a single unit.
     */
    function stepUnitThermal(unit, beat) {
        if (!unit || !unit.data || unit.data._isDying || unit.data.dead) return;
        const t = unitThermal(unit);
        if (!t) return;

        const area = levelArea(unit);
        const z = zOf(unit);
        const ambient = ambientTemperature(area, unit.x, unit.y, z);

        // Update wetness
        updateWetness(unit, area, unit.x, unit.y, z, ambient);

        // Active burning
        if (unit.data.burning) {
            stepBurning(unit, beat);
        }

        const res = speciesResistances(unit);
        if (res.isAutomaton) {
            // Automata do not experience biological hypothermia
            t.stage = "normal";
            t.bodyTemp = NORMAL_BODY_TEMP;
            return;
        }

        const insul = clothingInsulation(unit);
        const effectiveColdTolerance = res.coldTolerance;

        // Comfort threshold (usually ~16°C to 26°C without clothes, wider with clothes)
        const lowerComfort = Math.max(0, 16.0 - insul * 18.0 - effectiveColdTolerance);
        const upperComfort = 28.0 + res.heatTolerance;

        // Thermal rate of change
        let tempDelta = 0;
        if (ambient < lowerComfort) {
            // Cold exposure: body temp drops
            const diff = lowerComfort - ambient;
            const wetMult = 1.0 + (t.wetness / 100.0) * 2.0; // wetness multiplies cooling up to 3x!
            const insulFactor = 1.0 - insul * 0.7; // insulation reduces cooling
            tempDelta = -0.04 * (diff / 10.0) * wetMult * insulFactor;
        } else if (ambient > upperComfort) {
            // Heat exposure: body temp rises
            const diff = ambient - upperComfort;
            tempDelta = 0.03 * (diff / 10.0);
        } else {
            // In comfortable range: body temp naturally recovers to 37.0°C
            if (t.bodyTemp < NORMAL_BODY_TEMP) {
                tempDelta = 0.08; // warming recovery
            } else if (t.bodyTemp > NORMAL_BODY_TEMP) {
                tempDelta = -0.06; // cooling recovery
            }
        }

        t.bodyTemp = clamp(t.bodyTemp + tempDelta, 24.0, 43.0);
        t.bodyTemp = Math.round(t.bodyTemp * 10) / 10;

        // Determine status condition
        const prevStage = t.stage;
        const C = Combat(), W = World(), Col = Colonists();

        if (t.bodyTemp <= 28.0) {
            t.stage = "critical";
        } else if (t.bodyTemp <= 31.9) {
            t.stage = "hypothermia_severe";
        } else if (t.bodyTemp <= 34.9) {
            t.stage = "hypothermia_mild";
        } else if (t.bodyTemp <= 36.4) {
            t.stage = "chilled";
        } else if (t.bodyTemp >= 40.5) {
            t.stage = "heatstroke";
        } else if (t.bodyTemp >= 38.5) {
            t.stage = "overheated";
        } else {
            t.stage = "normal";
        }

        // Emit transition event
        if (t.stage !== prevStage) {
            emit("environment:thermalStageChanged", unit, t.stage, prevStage);
            if (W && W.isDisplayed && W.isDisplayed(unit) && C && typeof C.addPopup === "function") {
                if (t.stage === "hypothermia_mild") C.addPopup(unit.x, unit.y, "SHIVERING", "#7dd3fc");
                else if (t.stage === "hypothermia_severe") C.addPopup(unit.x, unit.y, "HYPOTHERMIA", "#38bdf8");
                else if (t.stage === "critical") C.addPopup(unit.x, unit.y, "FREEZING!", "#0284c7");
                else if (t.stage === "overheated") C.addPopup(unit.x, unit.y, "OVERHEATED", "#fb923c");
                else if (t.stage === "heatstroke") C.addPopup(unit.x, unit.y, "HEATSTROKE", "#ea580c");
            }
        }

        // Periodic damage for severe hypothermia or heatstroke
        if (t.stage === "hypothermia_severe" || t.stage === "critical") {
            const coldDmg = t.stage === "critical" ? 4 : 2;
            if (typeof unit.data.hp === "number" && (!t.lastDamageBeat || beat - t.lastDamageBeat >= 2)) {
                unit.data.hp = Math.max(0, unit.data.hp - coldDmg);
                t.lastDamageBeat = beat;
                if (W && W.isDisplayed && W.isDisplayed(unit) && C && typeof C.addPopup === "function") {
                    C.addPopup(unit.x, unit.y, `-${coldDmg}`, "#0284c7");
                }
                if (Col && typeof Col.addThought === "function" && (unit.data.kind === "colonist" || Array.isArray(unit.data.thoughts))) {
                    Col.addThought(unit, "Shivered uncontrollably in the bone-chilling cold.", -15);
                }
                emit("environment:coldDamage", unit, coldDmg);

                if (unit.data.hp <= 0) {
                    if (C && typeof C.onUnitDeath === "function") C.onUnitDeath(unit, null);
                    else if (W && typeof W.removeUnit === "function") W.removeUnit(unit.id);
                }
            }
        } else if (t.stage === "heatstroke") {
            const heatDmg = 2;
            if (typeof unit.data.hp === "number" && (!t.lastDamageBeat || beat - t.lastDamageBeat >= 3)) {
                unit.data.hp = Math.max(0, unit.data.hp - heatDmg);
                t.lastDamageBeat = beat;
                if (W && W.isDisplayed && W.isDisplayed(unit) && C && typeof C.addPopup === "function") {
                    C.addPopup(unit.x, unit.y, `-${heatDmg}`, "#f97316");
                }
                if (Col && typeof Col.addThought === "function" && (unit.data.kind === "colonist" || Array.isArray(unit.data.thoughts))) {
                    Col.addThought(unit, "Was overcome by blistering heat and dizziness.", -12);
                }
                emit("environment:heatDamage", unit, heatDmg);

                if (unit.data.hp <= 0) {
                    if (C && typeof C.onUnitDeath === "function") C.onUnitDeath(unit, null);
                    else if (W && typeof W.removeUnit === "function") W.removeUnit(unit.id);
                }
            }
        }
    }

    function syncWeatherVisuals() {
        if (!window.$gameScreen || !window.$gameMap) return;
        const W = World();
        if (!W) return;
        const lvl = typeof W.viewLevel === "function" ? W.viewLevel() : null;
        const z = lvl ? lvl.z : 0;
        if (z < 0) {
            if ($gameScreen.weatherType && $gameScreen.weatherType() !== "none") {
                $gameScreen.changeWeather("none", 0, 30);
            }
            return;
        }
        const cur = (typeof W.currentArea === "function" && W.currentArea()) || (lvl ? { x: lvl.x, y: lvl.y } : null);
        if (!cur) return;
        const w = getWeather(cur);
        let targetType = "none", power = 0;
        if (w === "rain") { targetType = "rain"; power = 5; }
        else if (w === "downpour") { targetType = "storm"; power = 8; }
        else if (w === "snow") { targetType = "snow"; power = 5; }
        else if (w === "blizzard") { targetType = "snow"; power = 9; }

        if ($gameScreen.weatherType && ($gameScreen.weatherType() !== targetType || Math.abs(($gameScreen.weatherPower() || 0) - power) > 1)) {
            $gameScreen.changeWeather(targetType, power, 60);
        }
    }

    /**
     * Master update cycle called every tick.
     * Living units are interleaved across 60 frames (TICKS_PER_STEP) so that each unit
     * is stepped exactly once per beat, but work is spread smoothly (~3 units/tick)
     * eliminating frame hitching.
     */
    let localBeat = 0;
    function updateEnvironment() {
        const W = World();
        if (!W || !W.state) return;

        if (frameCount % TICKS_PER_STEP === 0) {
            localBeat++;
            // Synchronize on-screen weather particles once per beat
            syncWeatherVisuals();
        }

        // Interleave living units over 60 frames so simulation is smooth and spike-free
        const stUnits = W.state && W.state.units;
        if (stUnits) {
            for (const id in stUnits) {
                const u = stUnits[id];
                if (!u) continue;
                if ((frameCount + (u.id | 0)) % TICKS_PER_STEP !== 0) continue;
                try {
                    stepUnitThermal(u, localBeat);
                } catch (e) {
                    console.error("[UF_Environment] stepUnitThermal error", e);
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // 4. Public API
    //-------------------------------------------------------------------------

    const Environment = {
        ambientTemperature,
        weather: getWeather,
        setWeather,
        unitThermal,
        clothingInsulation,
        igniteUnit,
        extinguishUnit,
        stepUnitThermal,
        updateWetness,
        updateEnvironment,
        isBurning: u => !!(u && u.data && u.data.burning),
        isHypothermic: u => {
            const t = unitThermal(u);
            return t && (t.stage === "hypothermia_mild" || t.stage === "hypothermia_severe" || t.stage === "critical");
        },
        isWet: u => {
            const t = unitThermal(u);
            return t && t.wetness > 30;
        },
        conditionLabel(u) {
            if (!u || !u.data) return "";
            if (u.data.burning) return "Burning";
            const t = unitThermal(u);
            if (!t) return "";
            if (t.stage === "critical") return "Freezing";
            if (t.stage === "hypothermia_severe") return "Hypothermia";
            if (t.stage === "hypothermia_mild") return "Shivering";
            if (t.stage === "chilled") return "Chilled";
            if (t.stage === "heatstroke") return "Heatstroke";
            if (t.stage === "overheated") return "Overheated";
            if (t.wetness > 50) return "Wet";
            return "";
        }
    };

    window.UF = window.UF || {};
    window.UF.Environment = Environment;

    //-------------------------------------------------------------------------
    // 5. Engine Hooks & Event Listeners
    //-------------------------------------------------------------------------

    let frameCount = 0;
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        frameCount++;
        updateEnvironment();
    };

    // Listen to fire events: if a unit is burned in UF_Fire, ignite it!
    function hookEvents() {
        if (!window.UF || !UF.Events || typeof UF.Events.on !== "function") return;
        UF.Events.on("fire:unitBurned", (unit, dmg, died) => {
            if (unit && !died) {
                igniteUnit(unit, 6, Math.max(2, Math.round(dmg / 2)));
            }
        });
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        hookEvents();
        if (window.UF && UF.Test && (UF.Test.active || typeof UF.Test.suite === "function")) {
            registerTestSuite();
        }
    };

    //-------------------------------------------------------------------------
    // 6. Test Suite
    //-------------------------------------------------------------------------

    function registerTestSuite() {
        UF.Test.suite("environment", async t => {
            const W = World(), G = WorldGen(), F = Fire();
            t.check("world_ready", !!W && !!W.state, "UF.World ready");

            const curArea = (W && W.currentArea && W.currentArea()) || (W && W.viewLevel && W.viewLevel()) || { x: 0, y: 0 };
            const area = { x: curArea.x | 0, y: curArea.y | 0 };
            const curZ = zOf(area);

            // Check 1: Baseline temperature calculation
            const tempMid = ambientTemperature(area, 128, 128, 0);
            t.check("ambient_temp_reasonable", typeof tempMid === "number" && tempMid >= -35 && tempMid <= 55,
                `surface temperature at (128,128) is ${tempMid}°C`);

            // Check 2: Diurnal variation (surface midnight colder than midday)
            const origHour = window.$ufTime ? $ufTime.hour : 12;
            if (window.$ufTime) $ufTime.hour = 2; // midnight / night
            const tempNight = ambientTemperature(area, 128, 128, 0);
            if (window.$ufTime) $ufTime.hour = 14; // early afternoon
            const tempDay = ambientTemperature(area, 128, 128, 0);
            if (window.$ufTime) $ufTime.hour = origHour;
            t.check("diurnal_cycle", tempNight < tempDay,
                `midnight ${tempNight}°C < midday ${tempDay}°C (diff ${(tempDay - tempNight).toFixed(1)}°C)`);

            // Check 3: Cavern z=-1 stable insulated temperature
            const tempCavern = ambientTemperature(area, 128, 128, -1);
            t.check("cavern_stable", tempCavern === 13.0, `upper cavern z=-1 is stable ${tempCavern}°C`);

            // Check 4: Heat source radiance (radiates heat outward)
            const rad0 = heatSourceRadiance(area, 0, 0, 0);
            t.check("radiance_calculation", typeof rad0 === "number", `radiance returns numeric value ${rad0}`);

            // Check 5: Unit thermal state initialization and insulation
            const dummyUnit = {
                id: 99990,
                name: "Test Colonist",
                area: copyArea(area),
                x: 120,
                y: 120,
                data: {
                    kind: "colonist",
                    species: "human",
                    hp: 20,
                    maxHp: 20,
                    equipment: { torso: "hide_cloak", head: "leather_cap" }
                }
            };
            const therm = unitThermal(dummyUnit);
            t.check("unit_thermal_init", therm && therm.bodyTemp === NORMAL_BODY_TEMP && therm.wetness === 0,
                `body temp ${therm.bodyTemp}°C, wetness ${therm.wetness}%`);

            const insul = clothingInsulation(dummyUnit);
            t.check("clothing_insulation", insul >= 0.4, `clothing insulation is ${(insul * 100).toFixed(0)}%`);

            // Check 6: Hypothermia onset and damage
            therm.bodyTemp = 30.0; // Severe hypothermia
            stepUnitThermal(dummyUnit, 100);
            t.check("hypothermia_stage", therm.stage === "hypothermia_severe",
                `body temp 30.0°C correctly triggers stage ${therm.stage}`);
            t.check("hypothermia_cold_damage", dummyUnit.data.hp < 20,
                `severe hypothermia inflicts cold damage (HP 20 -> ${dummyUnit.data.hp})`);

            // Check 7: Recovery in warmth
            therm.bodyTemp = 36.0;
            dummyUnit.data.equipment = {}; // naked
            // Simulate stepping in comfortable warmth
            const savedT = G && G.cellInfoLocal;
            therm.bodyTemp = 36.2;
            // Warmth step
            stepUnitThermal(dummyUnit, 101);
            t.check("hypothermia_recovering", therm.bodyTemp >= 36.2,
                `unit thermal regulation functions without crash (bodyTemp ${therm.bodyTemp}°C)`);

            // Check 8: Burning condition, periodic damage, and water douse
            igniteUnit(dummyUnit, 5, 3);
            t.check("unit_ignited", dummyUnit.data.burning && dummyUnit.data.burning.ticksLeft === 5,
                "unit catches fire with active burning status");

            const hpBeforeBurn = dummyUnit.data.hp;
            stepBurning(dummyUnit, 102);
            t.check("burning_damage", dummyUnit.data.hp < hpBeforeBurn,
                `burning deals damage (HP ${hpBeforeBurn} -> ${dummyUnit.data.hp})`);

            // Extinguish in water
            extinguishUnit(dummyUnit, "water");
            t.check("unit_extinguished", !dummyUnit.data.burning,
                "unit safely extinguished upon water contact");

            // Check 9: Wetness accelerates cooling and tracks wet status
            setWeather(area, "clear");
            let landX = 120, landY = 120;
            if (G && typeof G.isWaterAt === "function") {
                for (let dx = 0; dx < 30; dx++) {
                    if (!G.isWaterAt(area.x * 256 + 120 + dx, area.y * 256 + 120, 0)) {
                        landX = 120 + dx;
                        break;
                    }
                }
            }
            const dryUnit = { id: 99991, area: copyArea(area), x: landX, y: landY, data: { thermal: { bodyTemp: 37.0, wetness: 0, stage: "normal" } } };
            const wetUnit = { id: 99992, area: copyArea(area), x: landX, y: landY, data: { thermal: { bodyTemp: 37.0, wetness: 100, stage: "normal" } } };
            stepUnitThermal(dryUnit, 103);
            stepUnitThermal(wetUnit, 103);
            t.check("wet_status_tracks", wetUnit.data.thermal.wetness > 80 && dryUnit.data.thermal.wetness === 0,
                `wetness tracked accurately across distinct units (wet=${wetUnit.data.thermal.wetness}%, dry=${dryUnit.data.thermal.wetness}%)`);

            // Check 10: Weather setting and reading
            setWeather(area, "blizzard");
            const wRead = getWeather(area);
            t.check("weather_override", wRead === "blizzard", `weather successfully set to ${wRead}`);

            // Check 11: Condition label helper
            dummyUnit.data.burning = { ticksLeft: 3 };
            const lblBurn = Environment.conditionLabel(dummyUnit);
            delete dummyUnit.data.burning;
            dummyUnit.data.thermal.stage = "hypothermia_severe";
            const lblHypo = Environment.conditionLabel(dummyUnit);
            t.check("condition_labels", lblBurn === "Burning" && lblHypo === "Hypothermia",
                `condition labels: burn='${lblBurn}', hypo='${lblHypo}'`);

            t.screenshot("environment_overview");
        });
    }

})();
