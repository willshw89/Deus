'use strict';

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', 'game', 'data', 'UF_WorldCatalog.json');
const cat = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const newObjects = [
    {
        id: 'bed_wood',
        name: 'Wooden bed',
        image: '!$UF_Bed_Wood',
        under: true,
        passable: true,
        tags: ['building', 'bed', 'furniture', 'wood'],
        build: {
            items: { log: 2, fiber: 1 },
            work: 60
        }
    },
    {
        id: 'chest_wood',
        name: 'Storage chest',
        image: '!$UF_Chest_Wood',
        passable: false,
        tags: ['building', 'stockpile', 'furniture', 'wood'],
        build: {
            items: { log: 2, bar_iron: 1 },
            work: 40
        },
        ruin: 'rubble'
    },
    {
        id: 'dining_table',
        name: 'Dining table',
        image: '!$UF_Dining_Table',
        passable: false,
        tags: ['building', 'dining', 'furniture', 'wood'],
        build: {
            items: { log: 2 },
            work: 40
        },
        ruin: 'rubble'
    },
    {
        id: 'dining_bench',
        name: 'Dining bench',
        image: '!$UF_Dining_Bench',
        under: true,
        passable: true,
        tags: ['building', 'dining', 'furniture', 'wood'],
        build: {
            items: { log: 1 },
            work: 30
        }
    },
    {
        id: 'kitchen_counter',
        name: 'Kitchen counter',
        image: '!$UF_Kitchen_Counter',
        passable: false,
        tags: ['building', 'kitchen', 'workplace', 'furniture', 'wood'],
        build: {
            items: { log: 2 },
            work: 40
        },
        ruin: 'rubble'
    },
    {
        id: 'kitchen_pantry',
        name: 'Kitchen larder',
        image: '!$UF_Kitchen_Pantry',
        passable: false,
        tags: ['building', 'kitchen', 'stockpile', 'furniture', 'wood'],
        build: {
            items: { log: 2, stone: 1 },
            work: 50
        },
        ruin: 'rubble'
    },
    {
        id: 'kitchen_hearth',
        name: 'Cooking hearth',
        image: '!$UF_Kitchen_Hearth',
        passable: false,
        tags: ['building', 'fire', 'heat', 'kitchen', 'workplace', 'lit'],
        build: {
            items: { stone: 4, log: 1 },
            work: 80
        },
        ruin: 'rubble'
    },
    {
        id: 'shop_counter',
        name: 'Trade counter',
        image: '!$UF_Shop_Counter',
        passable: false,
        tags: ['building', 'shop', 'workplace', 'furniture', 'wood'],
        build: {
            items: { log: 2, stone: 1 },
            work: 50
        },
        ruin: 'rubble'
    },
    {
        id: 'apothecary_bench',
        name: 'Apothecary bench',
        image: '!$UF_Apothecary_Bench',
        passable: false,
        tags: ['building', 'workplace', 'herbalist', 'apothecary'],
        build: {
            items: { log: 2, stone: 1 },
            work: 60
        },
        ruin: 'rubble'
    }
];

let added = 0;
for (const obj of newObjects) {
    const idx = cat.objects.findIndex(o => o.id === obj.id);
    if (idx >= 0) {
        cat.objects[idx] = obj;
        console.log(`Updated catalog object: ${obj.id}`);
    } else {
        cat.objects.push(obj);
        added++;
        console.log(`Added catalog object: ${obj.id}`);
    }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(cat, null, 2));
console.log(`Successfully updated ${CATALOG_PATH} (${added} new objects added)`);
