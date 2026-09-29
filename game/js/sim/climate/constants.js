'use strict';

/**
 * game/js/sim/climate/constants.js
 *
 * Physical constants and parameters for the Project DEUS Lean Climate Kernel.
 * Authority: DEC-037 (Natural World), DEC-039 (Rules Hierarchy), DEC-040 (Closed Mass).
 */

const CLIMATE_CONSTANTS = {
    // Environmental lapse rate per Z level (1 Z level = 10 ft vertical interval)
    // -0.35 deg F per Z level = -3.5 deg F per 100 ft
    LAPSE_RATE_PER_Z: 0.35,

    // Geothermal heating gradient per Z level below ground (Z < 0)
    GEOTHERMAL_GRADIENT_PER_Z: 0.15,

    // Base sea-level mean annual temperature (deg F)
    BASE_SEA_LEVEL_TEMP_F: 65.0,

    // Freezing point of water (deg F)
    FREEZING_POINT_F: 32.0,

    // Pure water mass density in centipounds per cubic foot
    // 62.4 lb / cu.ft = 6240 cp / cu.ft
    WATER_DENSITY_CP_PER_CUFT: 6240,

    // Temporal astronomical constants
    DAYS_PER_YEAR: 365,
    HOURS_PER_DAY: 24,
    SOLAR_NOON_HOUR: 12,

    // Seasonal insolation amplitude (deg F)
    // Summer peak at day 182 (+20 F), winter trough at day 0 (-20 F)
    SEASONAL_TEMP_AMPLITUDE_F: 20.0,

    // Diurnal temperature amplitude (deg F)
    // Solar noon peak (+10 F), nighttime pre-dawn trough (-10 F)
    DIURNAL_TEMP_AMPLITUDE_F: 10.0,

    // Humidity scale in basis points (100.00% = 10000 bp)
    SATURATION_HUMIDITY_BP: 10000,

    // Rain shadow minimum precipitation ratio:
    // Windward precipitation must exceed leeward by at least 3.0x
    MIN_RAIN_SHADOW_RATIO: 3.0,

    // Default prevailing wind vector (normalized components)
    DEFAULT_WIND_X: 1.0,
    DEFAULT_WIND_Y: 0.0
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLIMATE_CONSTANTS;
}
if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Climate = window.DEUS.Sim.Climate || {};
    window.DEUS.Sim.Climate.CONSTANTS = CLIMATE_CONSTANTS;
}
