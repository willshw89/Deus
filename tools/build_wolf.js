const path = require('path');
const { processCreature } = require('./creature_pipeline');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

const config = {
    species: 'wolf',
    className: 'Wolf',
    targetH: 30,
    sourceImages: {
        south: path.join(BRAIN, 'nb_wolf_south_1789845400503.jpg'),
        profile: path.join(BRAIN, 'nb_wolf_profile_1789845413113.jpg'),
        north: path.join(BRAIN, 'nb_wolf_north_v2_1789845480809.jpg'),
        southwest: path.join(BRAIN, 'nb_wolf_southwest_1789845440079.jpg'),
        northwest: path.join(BRAIN, 'nb_wolf_northwest_1789845454835.jpg'),
        death: path.join(BRAIN, 'nb_wolf_death_1789845467967.jpg')
    },
    options: {
        death: { targetH: 18 }
    }
};

processCreature(config).catch(console.error);
