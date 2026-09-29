//=============================================================================
// index.js - Geomorphology Subsystem Exports
// Project DEUS - NAT.04.01
//=============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = require('./soil.js');
}

if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    if (window.DEUS.Sim.Soil) {
        window.DEUS.Sim.Geomorphology = window.DEUS.Sim.Soil;
    }
}
