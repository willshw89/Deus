"use strict";

// Fixed PRNG sample, not favorable seeds selected after observing the world.
// No CLI seed-count/seed-list override exists on the acceptance gate.
const MASTER_SEED = 20260927;
function seedRoster() {
    let state = MASTER_SEED;
    const seeds = [];
    while (seeds.length < 20) {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        const seed = state >>> 1;
        if (!seeds.includes(seed)) seeds.push(seed);
    }
    return seeds;
}
const SEEDS = Object.freeze(seedRoster());
const LEVELS = Object.freeze(Array.from({ length: 32 }, (_, i) => i - 16));
const GENERATORS = ["uf_levels_terrain", "uf_worldgen", "uf_underground_resources"];
const MUTANTS = Object.freeze({
    seed_count: "seed_roster",
    registration: "registration",
    completion: "completion",
    map_integrity: "map_integrity",
    stability: "stability",
    state_stability: "stability",
    reproducibility: "reproducibility",
    runtime_errors: "runtime_errors",
    worker_protocol: "worker_protocol",
    fatal: "fatal",
    timeout: "bounded_runtime",
    founder_population: "founder_population",
    founder_links: "founder_links",
    founder_cells: "founder_cells",
    camp_chests: "camp_chests",
    camp_clearance: "camp_clearance",
    food_reachable: "food_reachable",
    water_reachable: "water_reachable",
    light_reachable: "light_reachable",
    surface_kit: "surface_kit"
});
module.exports = { MASTER_SEED, SEEDS, LEVELS, GENERATORS, MUTANTS };
