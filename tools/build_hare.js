const path = require('path');
const { processCreature } = require('./creature_pipeline');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

const config = {
    species: 'hare',
    className: 'Hare',
    targetH: 24, // Micro scale per Rule V81: 24px tall in 48x48 frame
    sourceImages: {
        south: path.join(BRAIN, 'nb_hare_south_1789844556658.jpg'),
        profile: path.join(BRAIN, 'nb_hare_profile_1789844587926.jpg'),
        north: path.join(BRAIN, 'nb_hare_north_1789844601646.jpg'),
        southwest: path.join(BRAIN, 'nb_hare_southwest_1789844614126.jpg'),
        northwest: path.join(BRAIN, 'nb_hare_northwest_1789844627119.jpg'),
        death: path.join(BRAIN, 'nb_hare_death_1789844772113.jpg')
    },
    options: {
        death: { targetH: 14 }
    }
};

processCreature(config).catch(console.error);
