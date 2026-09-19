const path = require('path');
const { processCreature } = require('./creature_pipeline');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

const config = {
    species: 'boar',
    className: 'Boar',
    targetH: 32,
    sourceImages: {
        south: path.join(BRAIN, 'nb_boar_south_1789843675270.jpg'),
        profile: path.join(BRAIN, 'nb_boar_profile_1789843829642.jpg'),
        north: path.join(BRAIN, 'nb_boar_north_1789843886155.jpg'),
        southwest: path.join(BRAIN, 'nb_boar_southwest_1789844075876.jpg'),
        northwest: path.join(BRAIN, 'nb_boar_northwest_1789844091092.jpg'),
        death: path.join(BRAIN, 'nb_boar_death_1789844012900.jpg')
    },
    options: {
        profile: { cropX: 168, cropY: 348, cropW: 682, cropH: 380, targetH: 32 },
        death: { targetH: 22 }
    }
};

processCreature(config).catch(console.error);
