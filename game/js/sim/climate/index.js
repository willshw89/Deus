'use strict';

/**
 * game/js/sim/climate/index.js
 *
 * Package entry point for Project DEUS Lean Climate Kernel (NAT.05.01).
 */

const CONSTANTS = (typeof require !== 'undefined')
    ? require('./constants')
    : (window.DEUS && window.DEUS.Sim && window.DEUS.Sim.Climate && window.DEUS.Sim.Climate.CONSTANTS) || {};

const ClimateEngine = (typeof require !== 'undefined')
    ? require('./climate_engine')
    : (window.DEUS && window.DEUS.Sim && window.DEUS.Sim.Climate && window.DEUS.Sim.Climate.ClimateEngine) || {};

const Climate = {
    CONSTANTS,
    ClimateEngine
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Climate;
}
if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Climate = Climate;
}
