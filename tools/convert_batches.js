'use strict';
const { convertJpgToPng } = require('./jpg_to_png');
const path = require('path');
const fs = require('fs');

const brain = "C:/Users/snewt/.gemini/antigravity/brain/68544d17-f5bb-452f-930d-323a949c82b4";
const rawDir = path.join(__dirname, '..', 'art', 'raw');
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

convertJpgToPng(path.join(brain, "deus_containers_animated_1790007856962.jpg"), path.join(rawDir, "raw_containers_animated.png"));
convertJpgToPng(path.join(brain, "deus_doors_animated_1790007874722.jpg"), path.join(rawDir, "raw_doors_animated.png"));
convertJpgToPng(path.join(brain, "deus_flames_animated_1790008009502.jpg"), path.join(rawDir, "raw_flames_animated.png"));
convertJpgToPng(path.join(brain, "deus_workshops_animated_1790008350231.jpg"), path.join(rawDir, "raw_workshops_animated.png"));
console.log("All 4 raw images converted to PNG successfully.");

