"use strict";
// Catalog species (UF_WorldCatalog wildlife.species) to SRD 5.1 stat blocks.
// kind "proxy" is PM_DEFAULT: the Owner may re-map it. No stat block is invented here.
// srdId is an id in game/data/srd51/creatures.json.

const SPECIES_MAP = [
    { species: "deer", srdId: "srd:creature:deer", kind: "direct", reason: "The catalog deer is the SRD Deer." },
    { species: "boar", srdId: "srd:creature:boar", kind: "direct", reason: "The catalog boar is the SRD Boar." },
    { species: "rat", srdId: "srd:creature:rat", kind: "direct", reason: "The catalog rat is the SRD Rat." },
    { species: "wolf", srdId: "srd:creature:wolf", kind: "direct", reason: "The catalog wolf is the SRD Wolf." },
    { species: "jackal", srdId: "srd:creature:jackal", kind: "direct", reason: "The catalog jackal is the SRD Jackal." },
    { species: "hawk", srdId: "srd:creature:hawk", kind: "direct", reason: "The catalog hawk is the SRD Hawk." },
    { species: "bat", srdId: "srd:creature:bat", kind: "direct", reason: "The catalog bat is the SRD Bat." },
    { species: "giant_spider", srdId: "srd:creature:giant-spider", kind: "direct", reason: "The catalog giant spider is the SRD Giant Spider." },
    { species: "troll", srdId: "srd:creature:troll", kind: "direct", reason: "The catalog troll is the SRD Troll." },
    { species: "hare", srdId: "srd:creature:weasel", kind: "proxy", reason: "No hare in the SRD. The Weasel is the nearest tiny beast with a bite." },
    { species: "fowl", srdId: "srd:creature:blood-hawk", kind: "proxy", reason: "No fowl in the SRD. The Blood Hawk is the nearest small bird with a beak." },
    { species: "fox", srdId: "srd:creature:jackal", kind: "proxy", reason: "No fox in the SRD. The Jackal is the nearest small canid with a bite." },
    { species: "arctic_fox", srdId: "srd:creature:jackal", kind: "proxy", reason: "No arctic fox in the SRD. The Jackal is the nearest small canid with a bite." },
    { species: "wildcat", srdId: "srd:creature:panther", kind: "proxy", reason: "No wildcat in the SRD. The Panther is the nearest medium feline with a claw." },
    { species: "serpent", srdId: "srd:creature:poisonous-snake", kind: "proxy", reason: "No serpent in the SRD. The Poisonous Snake is the nearest venomous bite." },
    { species: "songbird", srdId: "srd:creature:raven", kind: "proxy", reason: "No songbird in the SRD. The Raven is the nearest tiny bird with a beak." },
    { species: "bog_horror", srdId: "srd:creature:shambling-mound", kind: "proxy", reason: "No bog horror in the SRD. The Shambling Mound is the marsh plant horror." },
    { species: "sand_stalker", srdId: "srd:creature:ankheg", kind: "proxy", reason: "No sand stalker in the SRD. The Ankheg is the nearest burrowing ambush predator." },
    { species: "restless_dead", srdId: "srd:creature:zombie", kind: "proxy", reason: "No restless dead in the SRD. The Zombie is the risen corpse." },
    { species: "aurochs", srdId: "srd:creature:elk", kind: "proxy", reason: "No aurochs in the SRD. The Elk is the nearest large horned grazer." },
    { species: "wild_horse", srdId: "srd:creature:riding-horse", kind: "proxy", reason: "No wild horse in the SRD. The Riding Horse is the horse stat block." },
    { species: "wild_sheep", srdId: "srd:creature:goat", kind: "proxy", reason: "No sheep in the SRD. The Goat is the nearest small horned grazer." },
    { species: "ice_wraith", srdId: "srd:creature:wraith", kind: "proxy", reason: "No ice wraith in the SRD. The Wraith is the incorporeal undead of that name." }
];

const bySpecies = new Map();
for (let i = 0; i < SPECIES_MAP.length; i++) bySpecies.set(SPECIES_MAP[i].species, SPECIES_MAP[i]);

function rowFor(species) {
    if (species == null || species === "") return null;
    return bySpecies.get(String(species).toLowerCase()) || null;
}

module.exports = {
    SPECIES_MAP: SPECIES_MAP,
    rowFor: rowFor
};
