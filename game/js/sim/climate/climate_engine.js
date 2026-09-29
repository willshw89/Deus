(function() {
    'use strict';

    /**
     * game/js/sim/climate/climate_engine.js
     *
     * Core physical simulation engine for Project DEUS Lean Continuous Climate.
     * Implements:
     * 1. Elevation lapse rate (-35 centi-F per vertical Z level) and geothermal warming (+15 centi-F/Z).
     * 2. Diurnal solar thermal and 360-day orbital seasonal insolation curves (DEC-038).
     * 3. Prevailing wind advection and orographic precipitation / rain shadow dynamics (>= 3x deficit).
     * 4. Evapotranspiration with wind/humidity coupling and physical phase transitions (water <-> snow).
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
                x: (config.wind && config.wind.x !== undefined)
                    ? config.wind.x
                    : (this.constants.DEFAULT_WIND_X !== undefined ? this.constants.DEFAULT_WIND_X : 1.0),
                y: (config.wind && config.wind.y !== undefined)
                    ? config.wind.y
                    : (this.constants.DEFAULT_WIND_Y !== undefined ? this.constants.DEFAULT_WIND_Y : 0.0)
            };
        }

        _key(x, y) {
            return `${x},${y}`;
        }

        getElevationScaleCentiF() {
            if (this.constants.elevationScale !== undefined) {
                return this.constants.elevationScale;
            }
            if (this.constants.DEFAULT_ELEVATION_SCALE_CENTI_F !== undefined) {
                return this.constants.DEFAULT_ELEVATION_SCALE_CENTI_F;
            }
            if (this.constants.LAPSE_RATE_PER_Z !== undefined) {
                return -Math.round(this.constants.LAPSE_RATE_PER_Z * 100);
            }
            return -35;
        }

        setColumn(x, y, surfaceZ, surfaceElevationFt = 0, initialWater = {}, soil = null) {
            const key = this._key(x, y);

            const humidityBp = (initialWater.humidityBp !== undefined)
                ? Math.max(0, Math.min(10000, initialWater.humidityBp))
                : 5000;
            const vapourMassCp = (initialWater.vapourMassCp !== undefined) ? initialWater.vapourMassCp : 10000;
            const cloudMassCp = (initialWater.cloudMassCp !== undefined) ? initialWater.cloudMassCp : 0;
            const surfaceWaterCp = (initialWater.surfaceWaterCp !== undefined) ? initialWater.surfaceWaterCp : 0;
            const surfaceSnowCp = (initialWater.surfaceSnowCp !== undefined) ? initialWater.surfaceSnowCp : 0;

            let tempCentiF;
            if (initialWater.temperatureCentiF !== undefined) {
                tempCentiF = Math.round(initialWater.temperatureCentiF);
            } else if (initialWater.tempCentiF !== undefined) {
                tempCentiF = Math.round(initialWater.tempCentiF);
            } else if (initialWater.temp !== undefined) {
                // If passed in serialized format (centi-F or deg F)
                tempCentiF = (Math.abs(initialWater.temp) > 1000)
                    ? Math.round(initialWater.temp)
                    : Math.round(initialWater.temp * 100);
            } else if (initialWater.temperatureF !== undefined) {
                tempCentiF = Math.round(initialWater.temperatureF * 100);
            } else {
                tempCentiF = this.evalTemperatureCentiF(surfaceZ, 135, 12);
            }

            const col = {
                x,
                y,
                surfaceZ,
                surfaceElevationFt: (surfaceElevationFt !== undefined) ? surfaceElevationFt : (surfaceZ * 10),
                temperatureCentiF: tempCentiF,
                humidityBp,
                vapourMassCp,
                cloudMassCp,
                surfaceWaterCp,
                surfaceSnowCp,
                precipitationRateCp: 0,
                precipitationType: 'none',
                inRainShadow: false,
                soil: soil || null,

                getSurfaceWaterCp() {
                    if (this.soil) {
                        if (typeof this.soil.getCurrentWaterMass === 'function') {
                            return this.soil.getCurrentWaterMass();
                        }
                        if (typeof this.soil.waterMassCp === 'number') {
                            return this.soil.waterMassCp;
                        }
                    }
                    return this.surfaceWaterCp;
                },

                debitSurfaceWaterCp(amount) {
                    const debit = Math.max(0, Math.floor(amount));
                    if (this.soil && typeof this.soil.waterMassCp === 'number') {
                        const actual = Math.min(this.soil.waterMassCp, debit);
                        this.soil.waterMassCp -= actual;
                        return actual;
                    }
                    const actual = Math.min(this.surfaceWaterCp, debit);
                    this.surfaceWaterCp -= actual;
                    return actual;
                },

                creditSurfaceWaterCp(amount) {
                    const credit = Math.max(0, Math.floor(amount));
                    if (this.soil && typeof this.soil.waterMassCp === 'number') {
                        this.soil.waterMassCp += credit;
                        return credit;
                    }
                    this.surfaceWaterCp += credit;
                    return credit;
                }
            };

            Object.defineProperty(col, 'temperatureF', {
                get() {
                    return this.temperatureCentiF / 100;
                },
                set(v) {
                    this.temperatureCentiF = Math.round(v * 100);
                },
                enumerable: true,
                configurable: true
            });

            this.columns.set(key, col);
            return col;
        }

        getColumn(x, y) {
            return this.columns.get(this._key(x, y)) || null;
        }

        /**
         * Evaluates local ambient temperature in integer centi-Fahrenheit (DEC-038).
         * 7250 = 72.50 deg F.
         * 360-day calendar: Summer peak at day 135, Winter trough at day 315.
         */
        evalTemperatureCentiF(z, dayOfYear = 135, timeOfDay = 12) {
            const {
                BASE_SEA_LEVEL_TEMP_CENTI_F = 6500,
                SEASONAL_TEMP_AMPLITUDE_CENTI_F = 2000,
                DIURNAL_TEMP_AMPLITUDE_CENTI_F = 1000,
                GEOTHERMAL_GRADIENT_CENTI_F_PER_Z = 15,
                DAYS_PER_YEAR = 360,
                HOURS_PER_DAY = 24,
                SOLAR_NOON_HOUR = 12,
                SUMMER_PEAK_DAY = 135
            } = this.constants;

            // 360-day orbital insolation curve: day 135 (midsummer) = peak, day 315 (midwinter) = trough
            const day = ((dayOfYear % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
            const seasonalPhase = (2 * Math.PI * (day - SUMMER_PEAK_DAY)) / DAYS_PER_YEAR;
            const seasonalDeltaCentiF = SEASONAL_TEMP_AMPLITUDE_CENTI_F * Math.cos(seasonalPhase);

            // Diurnal solar cycle: noon hour 12 = peak (+1000 cF), midnight hour 0 = trough (-1000 cF)
            const diurnalPhase = (2 * Math.PI * (timeOfDay - SOLAR_NOON_HOUR)) / HOURS_PER_DAY;
            const diurnalDeltaCentiF = DIURNAL_TEMP_AMPLITUDE_CENTI_F * Math.cos(diurnalPhase);

            const seaLevelTempCentiF = BASE_SEA_LEVEL_TEMP_CENTI_F + seasonalDeltaCentiF + diurnalDeltaCentiF;

            let tempCentiF;
            if (z >= 0) {
                tempCentiF = seaLevelTempCentiF + (z * this.getElevationScaleCentiF());
            } else {
                tempCentiF = seaLevelTempCentiF + (Math.abs(z) * GEOTHERMAL_GRADIENT_CENTI_F_PER_Z);
            }

            return Math.round(tempCentiF);
        }

        evalTemperature(z, dayOfYear = 135, timeOfDay = 12) {
            return Math.round(this.evalTemperatureCentiF(z, dayOfYear, timeOfDay)) / 100;
        }

        /**
         * Processes:
         * 1. Prevailing wind atmospheric advection (vapour/cloud transport downwind).
         * 2. Orographic lift on rising slopes (condensation and rain/snow precipitation).
         * 3. Leeward rain shadow (suppressed precipitation, >= 3x deficit).
         */
        processOrographicWeather(dayOfYear, timeOfDay, elevationLookup = null) {
            const freezingCentiF = this.constants.FREEZING_POINT_CENTI_F || 3200;
            const minRainShadowRatio = this.constants.MIN_RAIN_SHADOW_RATIO || 3.0;

            // 1. Update thermal state for all columns
            for (const [key, col] of this.columns) {
                col.temperatureCentiF = this.evalTemperatureCentiF(col.surfaceZ, dayOfYear, timeOfDay);
            }

            // 2. Prevailing wind atmospheric advection
            const dx = Math.sign(this.wind.x);
            const dy = Math.sign(this.wind.y);
            const windSpeed = Math.hypot(this.wind.x, this.wind.y);

            if ((dx !== 0 || dy !== 0) && windSpeed > 0) {
                const vDeltas = new Map();
                const cDeltas = new Map();
                const advFrac = Math.min(0.5, 0.2 * Math.max(1, windSpeed));

                for (const [key, col] of this.columns) {
                    const nextCol = this.getColumn(col.x + dx, col.y + dy);
                    if (nextCol) {
                        const vAdv = Math.floor(col.vapourMassCp * advFrac);
                        const cAdv = Math.floor(col.cloudMassCp * advFrac);
                        if (vAdv > 0) {
                            vDeltas.set(key, (vDeltas.get(key) || 0) - vAdv);
                            const nextKey = this._key(nextCol.x, nextCol.y);
                            vDeltas.set(nextKey, (vDeltas.get(nextKey) || 0) + vAdv);
                        }
                        if (cAdv > 0) {
                            cDeltas.set(key, (cDeltas.get(key) || 0) - cAdv);
                            const nextKey = this._key(nextCol.x, nextCol.y);
                            cDeltas.set(nextKey, (cDeltas.get(nextKey) || 0) + cAdv);
                        }
                    }
                }

                for (const [key, delta] of vDeltas) {
                    this.columns.get(key).vapourMassCp += delta;
                }
                for (const [key, delta] of cDeltas) {
                    this.columns.get(key).cloudMassCp += delta;
                }
            }

            // 3. Determine slope and rain shadow status along wind path
            for (const [key, col] of this.columns) {
                const nextCol = this.getColumn(col.x + dx, col.y + dy);
                let downstreamElev = col.surfaceElevationFt;

                if (elevationLookup) {
                    const looked = elevationLookup(col.x + dx, col.y + dy);
                    if (looked !== null && looked !== undefined) downstreamElev = looked;
                } else if (nextCol) {
                    downstreamElev = nextCol.surfaceElevationFt;
                }

                const slope = downstreamElev - col.surfaceElevationFt;

                const upwindCol = this.getColumn(col.x - dx, col.y - dy);
                let upwindSlope = 0;
                if (upwindCol) {
                    upwindSlope = col.surfaceElevationFt - upwindCol.surfaceElevationFt;
                }

                // Rain shadow: downwind of a descent or descending slope
                if (upwindCol && (upwindCol.surfaceElevationFt > col.surfaceElevationFt || upwindCol.inRainShadow)) {
                    col.inRainShadow = true;
                } else if (slope < 0) {
                    col.inRainShadow = true;
                } else {
                    col.inRainShadow = false;
                }

                const effectiveSlope = (slope > 0) ? slope : ((upwindSlope > 0) ? upwindSlope : slope);

                if (slope < 0) {
                    // Leeward descending slope: adiabatic compression, cloud evaporation, 0 precipitation
                    col.humidityBp = Math.max(500, Math.min(3000, Math.floor(10000 / (1 + Math.abs(slope) * 0.1))));
                    if (col.cloudMassCp > 0) {
                        col.vapourMassCp += col.cloudMassCp;
                        col.cloudMassCp = 0;
                    }
                    col.precipitationRateCp = 0;
                    col.precipitationType = 'none';
                } else if (effectiveSlope >= 10) {
                    // Windward or rising slope (>= 1 Z level = 10 ft rise)
                    const liftBoost = Math.floor(effectiveSlope * 500);
                    col.humidityBp = Math.min(10000, col.humidityBp + liftBoost);

                    if (col.humidityBp >= 10000 && col.vapourMassCp > 0) {
                        const shadowDivider = col.inRainShadow ? minRainShadowRatio : 1.0;
                        const condenseCp = Math.min(col.vapourMassCp, Math.max(1, Math.floor(col.vapourMassCp * (0.4 / shadowDivider))));

                        col.vapourMassCp -= condenseCp;
                        col.cloudMassCp += condenseCp;

                        const precipCp = Math.min(col.cloudMassCp, Math.max(1, Math.floor(col.cloudMassCp * (0.75 / shadowDivider))));
                        col.cloudMassCp -= precipCp;
                        col.precipitationRateCp = precipCp;

                        if (col.temperatureCentiF <= freezingCentiF) {
                            col.surfaceSnowCp += precipCp;
                            col.precipitationType = 'snow';
                        } else {
                            col.creditSurfaceWaterCp(precipCp);
                            col.precipitationType = 'rain';
                        }
                    } else {
                        col.precipitationRateCp = 0;
                        col.precipitationType = 'none';
                    }
                } else {
                    // Flat terrain: minimal baseline condensation if saturated
                    if (col.cloudMassCp > 0 && col.humidityBp >= 10000) {
                        const precipCp = Math.floor(col.cloudMassCp * 0.1);
                        col.cloudMassCp -= precipCp;
                        col.precipitationRateCp = precipCp;
                        if (col.temperatureCentiF <= freezingCentiF) {
                            col.surfaceSnowCp += precipCp;
                            col.precipitationType = 'snow';
                        } else {
                            col.creditSurfaceWaterCp(precipCp);
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
         * Evapotranspiration: transfers surface / topsoil water back into atmospheric vapour.
         * Driven by temperature, atmospheric humidity deficit, and wind speed.
         * Conserves exact integer centipounds.
         */
        processEvapotranspiration(evapFactor = 0.1) {
            const freezingCentiF = this.constants.FREEZING_POINT_CENTI_F || 3200;
            const windSpeed = Math.hypot(this.wind.x, this.wind.y);
            const windMultiplier = 1.0 + (windSpeed * 0.1);

            for (const [key, col] of this.columns) {
                const availableWater = col.getSurfaceWaterCp();
                if (availableWater > 0 && col.temperatureCentiF > freezingCentiF) {
                    const thermalMultiplier = Math.max(0.05, (col.temperatureCentiF - freezingCentiF) / 5000);
                    const humidityDeficit = Math.max(0.1, (10000 - col.humidityBp) / 10000);
                    const rawEvap = availableWater * evapFactor * thermalMultiplier * humidityDeficit * windMultiplier;
                    const evapCp = Math.min(availableWater, Math.max(1, Math.floor(rawEvap)));

                    const debited = col.debitSurfaceWaterCp(evapCp);
                    col.vapourMassCp += debited;
                }
            }
        }

        /**
         * Thermal phase transitions: water freezes to snow/ice, snow melts to water.
         * 1 cp water = 1 cp snow. Strict closed-mass conservation.
         */
        processPhaseTransitions() {
            const freezingCentiF = this.constants.FREEZING_POINT_CENTI_F || 3200;
            for (const [key, col] of this.columns) {
                const water = col.getSurfaceWaterCp();
                if (col.temperatureCentiF <= freezingCentiF && water > 0) {
                    col.surfaceSnowCp += col.debitSurfaceWaterCp(water);
                } else if (col.temperatureCentiF > freezingCentiF && col.surfaceSnowCp > 0) {
                    const melted = col.surfaceSnowCp;
                    col.surfaceSnowCp = 0;
                    col.creditSurfaceWaterCp(melted);
                }
            }
        }

        /**
         * Closed-mass total inventory calculation across all water reservoirs.
         */
        getTotalMass() {
            let vapour = 0;
            let cloud = 0;
            let surfaceWater = 0;
            let surfaceSnow = 0;

            for (const [key, col] of this.columns) {
                vapour += col.vapourMassCp;
                cloud += col.cloudMassCp;
                surfaceWater += col.getSurfaceWaterCp();
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
                    temp: col.temperatureCentiF,
                    hum: col.humidityBp,
                    vap: col.vapourMassCp,
                    cld: col.cloudMassCp,
                    wat: col.getSurfaceWaterCp(),
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
                    temp: c.temp,
                    temperatureCentiF: c.temp,
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
})();
