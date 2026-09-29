(function() {
    'use strict';

    /**
     * game/js/sim/climate/constants.js
     *
     * Physical constants and parameters for the Project DEUS Lean Climate Kernel.
     * Authority: DEC-037 (Natural World), DEC-038 (Calendar & Units), DEC-039 (Rules Hierarchy), DEC-040 (Closed Mass).
     */

    const CLIMATE_CONSTANTS = {
        // Environmental lapse rate / elevation scale per Z level (1 Z level = 10 ft vertical interval)
        // DEC-038 Item 6: Configurable elevationScale in integer centi-F per Z level
        elevationScale: -35, // -35 centi-F per Z level = -0.35 deg F per Z level
        DEFAULT_ELEVATION_SCALE_CENTI_F: -35,
        LAPSE_RATE_PER_Z: 0.35, // legacy degrees F compatibility

        // Subterranean geothermal gradient per vertical level (Z < 0)
        GEOTHERMAL_GRADIENT_CENTI_F_PER_Z: 15, // +15 centi-F per Z level = +0.15 deg F per Z level
        GEOTHERMAL_GRADIENT_PER_Z: 0.15,

        // Base sea-level mean annual temperature in centi-F (65.00 deg F)
        BASE_SEA_LEVEL_TEMP_CENTI_F: 6500,
        BASE_SEA_LEVEL_TEMP_F: 65.0,

        // Freezing point of water in centi-F (32.00 deg F)
        FREEZING_POINT_CENTI_F: 3200,
        FREEZING_POINT_F: 32.0,

        // Pure water mass density in centipounds per cubic foot
        // 62.4 lb / cu.ft = 6240 cp / cu.ft
        WATER_DENSITY_CP_PER_CUFT: 6240,

        // Temporal astronomical constants (DEC-038 Item 8: 360-day calendar)
        DAYS_PER_YEAR: 360,
        HOURS_PER_DAY: 24,
        SOLAR_NOON_HOUR: 12,

        // Calendar seasons (DEC-038: 90 days per season)
        // 0 = Spring (0..89), 1 = Summer (90..179), 2 = Autumn (180..269), 3 = Winter (270..359)
        SUMMER_PEAK_DAY: 135, // Mid-summer orbital insolation peak
        WINTER_TROUGH_DAY: 315, // Mid-winter orbital insolation trough

        // Seasonal insolation amplitude in centi-F (20.00 deg F)
        SEASONAL_TEMP_AMPLITUDE_CENTI_F: 2000,
        SEASONAL_TEMP_AMPLITUDE_F: 20.0,

        // Diurnal temperature amplitude in centi-F (10.00 deg F)
        DIURNAL_TEMP_AMPLITUDE_CENTI_F: 1000,
        DIURNAL_TEMP_AMPLITUDE_F: 10.0,

        // Humidity scale in basis points (100.00% = 10000 bp)
        SATURATION_HUMIDITY_BP: 10000,

        // Rain shadow minimum precipitation ratio (>= 3.0x deficit)
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
})();
