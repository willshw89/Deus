'use strict';

/**
 * game/js/sim/climate/climate_engine.js
 *
 * Core physical simulation engine for Project DEUS Lean Continuous Climate.
 * Implements:
 * 1. Elevation lapse rate (-0.35 deg F per vertical Z level) and geothermal warming.
 * 2. Diurnal solar thermal and orbital seasonal insolation curves.
 * 3. Prevailing wind advection and orographic precipitation / rain shadow dynamics.
 * 4. Evapotranspiration and physical phase transitions (water <-> ice/snow).
 * 5. Strict integer centipound closed-mass conservation (DEC-040).
 */

const CONSTANTS = (typeof require !== 'undefined')
    ? require('./constants')
    : (window.DEUS && window.DEUS.Sim && window.DEUS.Sim.Climate && window.DEUS.Sim.Climate.CONSTANTS) || {};

class ClimateEngine {
    constructor(config = {}) {
        this.constants = Object.assign({}, CONSTANTS, config);
        this.columns = new Map();
        this.wind = {
            x: this.constants.DEFAULT_WIND_X || 1.0,
            y: this.constants.DEFAULT_WIND_Y || 0.0
        };
        this.prevWorldTotalMass = null;
    }

    _key(x, y) {
        return `${x},${y}`;
    }

    setColumn(x, y, surfaceZ, surfaceElevationFt = 0, initialWater = {}) {
        const key = this._key(x, y);
        const col = {
            x,
            y,
            surfaceZ,
            surfaceElevationFt: (surfaceElevationFt !== undefined) ? surfaceElevationFt : (surfaceZ * 10),
            temperatureF: this.evalTemperature(surfaceZ, 0, 12),
            humidityBp: initialWater.humidityBp || 5000,
            vapourMassCp: initialWater.vapourMassCp || 10000,
            cloudMassCp: initialWater.cloudMassCp || 0,
            surfaceWaterCp: initialWater.surfaceWaterCp || 0,
            surfaceSnowCp: initialWater.surfaceSnowCp || 0,
            precipitationRateCp: 0,
            precipitationType: 'none'
        };
        this.columns.set(key, col);
        return col;
    }

    getColumn(x, y) {
        return this.columns.get(this._key(x, y)) || null;
    }

    /**
     * Evaluates local ambient temperature given Z level, day of year, and time of day.
     * T(z, day, hour) = T0(day, hour) - (z >= 0 ? 0.35 * z : -0.15 * |z|)
     */
    evalTemperature(z, dayOfYear = 182, timeOfDay = 12) {
        const {
            BASE_SEA_LEVEL_TEMP_F,
            SEASONAL_TEMP_AMPLITUDE_F,
            DIURNAL_TEMP_AMPLITUDE_F,
            LAPSE_RATE_PER_Z,
            GEOTHERMAL_GRADIENT_PER_Z,
            DAYS_PER_YEAR,
            HOURS_PER_DAY,
            SOLAR_NOON_HOUR
        } = this.constants;

        // Annual orbital solar insolation (cosinusoidal: day 0 = winter trough, day 182 = summer peak)
        const seasonalPhase = (2 * Math.PI * dayOfYear) / DAYS_PER_YEAR;
        const seasonalDelta = -SEASONAL_TEMP_AMPLITUDE_F * Math.cos(seasonalPhase);

        // Diurnal solar cycle (cosinusoidal: hour 12 = peak, hour 0 = trough)
        const diurnalPhase = (2 * Math.PI * (timeOfDay - SOLAR_NOON_HOUR)) / HOURS_PER_DAY;
        const diurnalDelta = DIURNAL_TEMP_AMPLITUDE_F * Math.cos(diurnalPhase);

        const seaLevelTemp = BASE_SEA_LEVEL_TEMP_F + seasonalDelta + diurnalDelta;

        let temp;
        if (z >= 0) {
            temp = seaLevelTemp - (z * LAPSE_RATE_PER_Z);
        } else {
            // Geothermal warming at subterranean depths
            temp = seaLevelTemp + (Math.abs(z) * GEOTHERMAL_GRADIENT_PER_Z);
        }

        return Math.round(temp * 100) / 100;
    }

    /**
     * Processes orographic wind lift, condensation, and rain shadow precipitation.
     */
    processOrographicWeather(dayOfYear, timeOfDay, elevationLookup = null) {
        const { SATURATION_HUMIDITY_BP, FREEZING_POINT_F } = this.constants;

        for (const [key, col] of this.columns) {
            // 1. Update thermal state
            col.temperatureF = this.evalTemperature(col.surfaceZ, dayOfYear, timeOfDay);

            // 2. Determine slope along wind vector
            const nextX = col.x + Math.sign(this.wind.x);
            const nextY = col.y + Math.sign(this.wind.y);

            let upstreamElev = col.surfaceElevationFt;
            let downstreamElev = col.surfaceElevationFt;

            if (elevationLookup) {
                downstreamElev = elevationLookup(nextX, nextY) !== null ? elevationLookup(nextX, nextY) : col.surfaceElevationFt;
            } else {
                const neighbor = this.getColumn(nextX, nextY);
                if (neighbor) downstreamElev = neighbor.surfaceElevationFt;
            }

            const slope = downstreamElev - col.surfaceElevationFt;

            // 3. Orographic Lift (windward rising slope)
            if (slope > 0) {
                // Adiabatic cooling surges relative humidity
                const liftBoostBp = Math.min(8000, Math.floor(slope * 150));
                col.humidityBp = Math.min(15000, 5000 + liftBoostBp);

                if (col.humidityBp >= SATURATION_HUMIDITY_BP && col.vapourMassCp > 0) {
                    const excessFraction = Math.max(0.1, (col.humidityBp - SATURATION_HUMIDITY_BP) / 5000);
                    const condenseCp = Math.min(col.vapourMassCp, Math.max(1, Math.floor(col.vapourMassCp * 0.4 * excessFraction)));

                    col.vapourMassCp -= condenseCp;
                    col.cloudMassCp += condenseCp;

                    // Precipitation drops from cloud reservoir
                    const precipCp = Math.min(col.cloudMassCp, Math.max(1, Math.floor(col.cloudMassCp * 0.6)));
                    col.cloudMassCp -= precipCp;
                    col.precipitationRateCp = precipCp;

                    if (col.temperatureF <= FREEZING_POINT_F) {
                        col.surfaceSnowCp += precipCp;
                        col.precipitationType = 'snow';
                    } else {
                        col.surfaceWaterCp += precipCp;
                        col.precipitationType = 'rain';
                    }
                } else {
                    col.precipitationRateCp = 0;
                    col.precipitationType = 'none';
                }
            } else if (slope < 0) {
                // 4. Rain Shadow (leeward descending slope)
                // Adiabatic compression drops humidity and suppresses precipitation
                col.humidityBp = Math.max(1000, Math.floor(3000 / (1 + Math.abs(slope))));

                // Leeward warming evaporates any clouds back to vapour
                if (col.cloudMassCp > 0) {
                    col.vapourMassCp += col.cloudMassCp;
                    col.cloudMassCp = 0;
                }

                col.precipitationRateCp = 0;
                col.precipitationType = 'none';
            } else {
                // Flat terrain: minimal baseline condensation if saturated
                if (col.cloudMassCp > 0) {
                    const precipCp = Math.floor(col.cloudMassCp * 0.1);
                    col.cloudMassCp -= precipCp;
                    col.precipitationRateCp = precipCp;
                    if (col.temperatureF <= FREEZING_POINT_F) {
                        col.surfaceSnowCp += precipCp;
                        col.precipitationType = 'snow';
                    } else {
                        col.surfaceWaterCp += precipCp;
                        col.precipitationType = 'rain';
                    }
                } else {
                    col.precipitationRateCp = 0;
                    col.precipitationType = 'none';
                }
            }
        }
    }

    /**
     * Evapotranspiration: transfers surface water back into atmospheric vapour.
     * Conserves exact integer centipounds.
     */
    processEvapotranspiration(evapFactor = 0.1) {
        for (const [key, col] of this.columns) {
            if (col.surfaceWaterCp > 0 && col.temperatureF > this.constants.FREEZING_POINT_F) {
                const thermalMultiplier = Math.max(0.1, (col.temperatureF - 32) / 50);
                const evapCp = Math.min(col.surfaceWaterCp, Math.max(1, Math.floor(col.surfaceWaterCp * evapFactor * thermalMultiplier)));
                col.surfaceWaterCp -= evapCp;
                col.vapourMassCp += evapCp;
            }
        }
    }

    /**
     * Thermal phase transition: water freezes into ice/snow, snow melts into water.
     * Weight is strictly conserved: 1 cp water = 1 cp ice/snow.
     */
    processPhaseTransitions() {
        const { FREEZING_POINT_F } = this.constants;
        for (const [key, col] of this.columns) {
            if (col.temperatureF <= FREEZING_POINT_F && col.surfaceWaterCp > 0) {
                // Freezing
                col.surfaceSnowCp += col.surfaceWaterCp;
                col.surfaceWaterCp = 0;
            } else if (col.temperatureF > FREEZING_POINT_F && col.surfaceSnowCp > 0) {
                // Melting
                col.surfaceWaterCp += col.surfaceSnowCp;
                col.surfaceSnowCp = 0;
            }
        }
    }

    /**
     * Closed-mass total inventory calculation across all 4 water reservoirs.
     */
    getTotalMass() {
        let vapour = 0;
        let cloud = 0;
        let surfaceWater = 0;
        let surfaceSnow = 0;

        for (const [key, col] of this.columns) {
            vapour += col.vapourMassCp;
            cloud += col.cloudMassCp;
            surfaceWater += col.surfaceWaterCp;
            surfaceSnow += col.surfaceSnowCp;
        }

        return {
            vapour,
            cloud,
            surfaceWater,
            surfaceSnow,
            total: vapour + cloud + surfaceWater + surfaceSnow
        };
    }

    assertClosedMass(expectedTotalCp) {
        const current = this.getTotalMass();
        if (current.total !== expectedTotalCp) {
            throw new Error(`DEC-040 Closed-Mass Violation: expected ${expectedTotalCp} cp, observed ${current.total} cp (delta: ${current.total - expectedTotalCp} cp)`);
        }
        return true;
    }

    serialize() {
        const colArray = [];
        for (const [key, col] of this.columns) {
            colArray.push({
                x: col.x,
                y: col.y,
                z: col.surfaceZ,
                elev: col.surfaceElevationFt,
                temp: col.temperatureF,
                hum: col.humidityBp,
                vap: col.vapourMassCp,
                cld: col.cloudMassCp,
                wat: col.surfaceWaterCp,
                snw: col.surfaceSnowCp
            });
        }
        return JSON.stringify({
            schemaVersion: 1,
            wind: this.wind,
            columns: colArray
        });
    }

    deserialize(jsonStr) {
        const data = (typeof jsonStr === 'string') ? JSON.parse(jsonStr) : jsonStr;
        this.wind = data.wind || { x: 1.0, y: 0.0 };
        this.columns.clear();
        for (const c of data.columns) {
            this.setColumn(c.x, c.y, c.z, c.elev, {
                humidityBp: c.hum,
                vapourMassCp: c.vap,
                cloudMassCp: c.cld,
                surfaceWaterCp: c.wat,
                surfaceSnowCp: c.snw
            });
        }
        return this;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClimateEngine;
}
if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Climate = window.DEUS.Sim.Climate || {};
    window.DEUS.Sim.Climate.ClimateEngine = ClimateEngine;
}
