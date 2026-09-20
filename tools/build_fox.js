const path = require('path');
const { processCreature } = require('./creature_pipeline');

const BRAIN = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';

const config = {
    species: 'fox',
    className: 'Fox',
    targetH: 26,
    sourceImages: {
        south: path.join(BRAIN, 'nb_fox_south_1789846504217.jpg'),
        profile: path.join(BRAIN, 'nb_fox_profile_1789846517562.jpg'),
        north: path.join(BRAIN, 'nb_fox_north_1789846547173.jpg'),
        southwest: path.join(BRAIN, 'nb_fox_southwest_1789846582966.jpg'),
        northwest: path.join(BRAIN, 'nb_fox_northwest_1789846603144.jpg'),
        death: path.join(BRAIN, 'nb_fox_death_1789846618795.jpg')
    },
    options: {
        death: { targetH: 14 }
    }
};

processCreature(config).catch(console.error);
