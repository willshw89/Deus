//=============================================================================
// soil.js - Lean Geomorphology & Soil Simulation Kernel
// Project DEUS - NAT.04.01 (lane-by)
// Authority: DEC-037, DEC-038, DEC-039, DEC-040 (Owner clarification 2026-09-29: weight ledger for
// world material and water; material type, volume and density may change, weight may not).
//
// Model
//   A stratum cell is 5 ft x 5 ft x 2 ft. It holds a bonded matrix (solidMassCp), loose sediment
//   (looseMassCp) and pore water (waterMassCp), all in integer centipounds. bulkDensity is the
//   material's density in cp per cu ft and never changes; how full the cell is follows from its mass.
//   Only loose sediment moves in a slope cascade. Solid matrix leaves a cell only through weathering,
//   erosion or thermal degradation, and every one of those names the reservoir that receives it.
//   A column's ground surface is the top of its highest stratum that still holds material. A column
//   the engine has never been given is unknown ground, not a cliff down to elevation zero; nothing
//   cascades into it unless a groundElevationProvider says where its floor is.
//=============================================================================

const VOLUME_PER_STRATUM = 50.0; // 5 ft x 5 ft x 2 ft = 50 cu ft
const CELL_AREA_SQFT = 25.0;     // 5 ft x 5 ft
const STRATUM_HEIGHT_FT = 2.0;
const WATER_DENSITY_CP_PER_CUFT = 6240; // 62.4 lb/cu ft = 6240 centipounds / cu ft
const MAX_WATER_MASS_PER_STRATUM = Math.floor(VOLUME_PER_STRATUM * WATER_DENSITY_CP_PER_CUFT); // 312,000 cp
const CAPILLARY_RATE_CP_PER_TICK = 2000;
const REPOSE_EPSILON_FT = 0.01;  // a step this close to the stable height counts as settled

// Mutation flags (governed by DEC-034 / DEC-035; activated via process.env.MUTANT or CLI flags).
// Each flag restores one known defect. `node tools/test_soil_geomorphology.js --mutation-sweep`
// checks that the gate suite fails on an assertion for every one of them.
const MUTANTS = {
    no_donor_debit: false,
    reverse_drainage: false,
    bypass_pore_clamp: false,
    discard_signed_residuals: false,
    unbalanced_weathering: false,
    mint_on_deposit: false,          // a new deposit cell keeps the constructor's full solid body
    empty_neighbor_as_floor: false,  // a column with no strata reads as elevation 0 and receives at the source height
    moisture_clears_slope: false,    // the moisture pass empties the slope queue
    round_before_residual: false,    // the capillary rate is rounded before the signed residual sees it
    capillary_single_pulse: false,   // the capillary receiver is not re-queued until field capacity
    stale_surface: false,            // an emptied stratum still counts as its column's surface
    global_surface_scan: false,      // surface lookup walks every stratum instead of the column index
    deposition_no_debit: false,      // deposition credits the stratum without debiting the suspended reservoir
    load_without_index: false        // deserialize skips rebuilding the column index
};

if (typeof process !== 'undefined' && process.argv) {
    for (const arg of process.argv) {
        if (arg.startsWith('--mutant=')) {
            const m = arg.split('=')[1];
            if (MUTANTS[m] !== undefined) {
                MUTANTS[m] = true;
            }
        }
    }
}
if (typeof process !== 'undefined' && process.env && process.env.MUTANT) {
    if (MUTANTS[process.env.MUTANT] !== undefined) {
        MUTANTS[process.env.MUTANT] = true;
    }
}

function encodeStratumId(x, y, z, s) {
    return `${x | 0},${y | 0},${z | 0},${s | 0}`;
}

function decodeStratumId(id) {
    const parts = id.split(',').map(Number);
    return { x: parts[0], y: parts[1], z: parts[2], s: parts[3] };
}

function canonicalEdgeKey(idA, idB) {
    const [id1, id2] = idA < idB ? [idA, idB] : [idB, idA];
    return `${id1}:${id2}`;
}

function getDownwardNeighborId(x, y, z, s) {
    if (s > 0) {
        return encodeStratumId(x, y, z, s - 1);
    } else {
        return encodeStratumId(x, y, z - 1, 4);
    }
}

function getUpwardNeighborId(x, y, z, s) {
    if (s < 4) {
        return encodeStratumId(x, y, z, s + 1);
    } else {
        return encodeStratumId(x, y, z + 1, 0);
    }
}

// Bottom and top faces of stratum (z, s) in feet above the bottom of Z = -16: 10 ft per Z, 2 ft per stratum.
function stratumBottomElevationFt(z, s) {
    return (z + 16) * 10 + s * 2;
}

function stratumTopElevationFt(z, s) {
    return stratumBottomElevationFt(z, s) + STRATUM_HEIGHT_FT;
}

// The (z, s) whose 2 ft band contains an elevation in feet.
function stratumAtElevationFt(ft) {
    const band = Math.floor(ft / STRATUM_HEIGHT_FT);
    const z = Math.floor(band / 5) - 16;
    const s = ((band % 5) + 5) % 5;
    return { z, s };
}

function columnKey(x, y) {
    return `${x | 0},${y | 0}`;
}

const CARDINALS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
];

class SoilStratum {
    constructor(x, y, z, s, horizon, sand, silt, clay, organic, bulkDensity, porosity, fieldCapacity, initialMoistureBp = 0, loose = false, angleRepose = 34) {
        this.id = encodeStratumId(x, y, z, s);
        this.x = x | 0;
        this.y = y | 0;
        this.z = z | 0;
        this.s = s | 0;
        this.horizon = horizon;
        this.sand = sand | 0;
        this.silt = silt | 0;
        this.clay = clay | 0;
        this.organic = organic | 0;
        this.bulkDensity = Math.max(1, Math.round(bulkDensity)); // material density, centipounds per cu ft; constant
        this.porosity = porosity | 0; // basis points (0..10000)
        this.fieldCapacity = fieldCapacity | 0; // basis points (0..10000)
        this.loose = Boolean(loose);
        this.angleRepose = Number(angleRepose);
        this.particles = 5000;

        // Primary physical mass state in integer centipounds (DEC-040): a constructed cell is full of matrix.
        this.solidMassCp = Math.round(this.bulkDensity * VOLUME_PER_STRATUM);
        this.looseMassCp = 0;

        // Water mass state
        const maxWater = this.getMaxWaterMass();
        this.waterMassCp = Math.min(maxWater, Math.max(0, Math.round(maxWater * ((initialMoistureBp || 0) / 10000))));
    }

    // An empty cell that can receive sediment: same material as `like`, no matrix, no sediment, no water.
    static deposit(x, y, z, s, like) {
        const d = new SoilStratum(x, y, z, s, like.horizon, like.sand, like.silt, like.clay, like.organic,
            like.bulkDensity, like.porosity, like.fieldCapacity, 0, true, like.angleRepose);
        if (!MUTANTS.mint_on_deposit) {
            d.solidMassCp = 0;
        }
        d.looseMassCp = 0;
        d.waterMassCp = 0;
        return d;
    }

    get moisture() {
        const max = this.getMaxWaterMass();
        if (max <= 0) return 0;
        if (MUTANTS.bypass_pore_clamp) {
            return Math.max(0, Math.round((this.waterMassCp / max) * 10000));
        }
        return Math.min(10000, Math.max(0, Math.round((this.waterMassCp / max) * 10000)));
    }

    set moisture(bp) {
        const max = this.getMaxWaterMass();
        if (MUTANTS.bypass_pore_clamp) {
            this.waterMassCp = Math.max(0, Math.round(max * ((bp || 0) / 10000)));
            return;
        }
        this.waterMassCp = Math.min(max, Math.max(0, Math.round(max * ((bp || 0) / 10000))));
    }

    get mass() {
        return this.solidMassCp + this.looseMassCp + this.waterMassCp;
    }

    set mass(val) {
        // Compatibility setter: adjusts the matrix mass. Density is a material property and stays.
        this.solidMassCp = Math.max(0, Math.round(val));
    }

    getMaxWaterMass() {
        return Math.floor(VOLUME_PER_STRATUM * (this.porosity / 10000) * WATER_DENSITY_CP_PER_CUFT);
    }

    getCurrentWaterMass() {
        return this.waterMassCp;
    }

    getFieldCapacityWaterMass() {
        return Math.floor(this.getMaxWaterMass() * (this.fieldCapacity / 10000));
    }

    getAvailablePoreCapacity() {
        return Math.max(0, this.getMaxWaterMass() - this.waterMassCp);
    }

    getExcessDrainableWater() {
        return Math.max(0, this.waterMassCp - this.getFieldCapacityWaterMass());
    }

    // Ground is present while the stratum holds solid or loose material; water alone is not ground.
    hasGround() {
        return (this.solidMassCp + this.looseMassCp) > 0;
    }

    // Material volume and how high it fills the 2 ft cell. Volume follows from mass and density.
    materialVolumeCuFt() {
        return (this.solidMassCp + this.looseMassCp) / this.bulkDensity;
    }

    fillHeightFt() {
        return Math.min(STRATUM_HEIGHT_FT, this.materialVolumeCuFt() / CELL_AREA_SQFT);
    }

    // Space left in the cell for more material, in cu ft (0 when the cell is full or over-full).
    freeVolumeCuFt() {
        return Math.max(0, VOLUME_PER_STRATUM - this.materialVolumeCuFt());
    }

    bottomElevationFt() {
        return stratumBottomElevationFt(this.z, this.s);
    }

    topElevationFt() {
        return stratumTopElevationFt(this.z, this.s);
    }

    // Where the material surface of this cell sits.
    surfaceElevationFt() {
        return this.bottomElevationFt() + this.fillHeightFt();
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            z: this.z,
            s: this.s,
            horizon: this.horizon,
            sand: this.sand,
            silt: this.silt,
            clay: this.clay,
            organic: this.organic,
            bulkDensity: this.bulkDensity,
            porosity: this.porosity,
            fieldCapacity: this.fieldCapacity,
            waterMassCp: this.waterMassCp,
            solidMassCp: this.solidMassCp,
            looseMassCp: this.looseMassCp,
            loose: this.loose,
            angleRepose: this.angleRepose,
            particles: this.particles
        };
    }

    static deserialize(data) {
        const s = new SoilStratum(
            data.x, data.y, data.z, data.s,
            data.horizon,
            data.sand, data.silt, data.clay, data.organic,
            data.bulkDensity, data.porosity, data.fieldCapacity,
            0, data.loose, data.angleRepose
        );
        s.waterMassCp = data.waterMassCp !== undefined ? data.waterMassCp : 0;
        s.solidMassCp = data.solidMassCp !== undefined ? data.solidMassCp : Math.round(s.bulkDensity * VOLUME_PER_STRATUM);
        s.looseMassCp = data.looseMassCp !== undefined ? data.looseMassCp : 0;
        s.particles = data.particles !== undefined ? data.particles : 5000;
        return s;
    }
}

class GeomorphologyEngine {
    constructor() {
        this.strata = new Map(); // id -> SoilStratum
        this.columns = new Map(); // columnKey -> SoilStratum[] (the column index; never scan this.strata for a column)
        this.signedResidualMap = new Map(); // canonicalEdgeKey -> fractional remainder (DEC-038)
        // Two work queues. The moisture pass and the slope pass each consume their own and re-queue
        // what still needs work; neither pass can starve the other.
        this.dirtyMoisture = new Set();
        this.dirtySlope = new Set();

        // Optional bridge hook: (x, y) -> ground elevation in ft for a column the engine holds no strata for,
        // or null when that ground is unknown. Unknown ground never receives a cascade.
        this.groundElevationProvider = null;

        // Ledger journals in integer centipounds (DEC-040): running records of what moved, not reservoirs.
        this.ledgerMassSoilWater = 0;
        this.ledgerMassSediment = 0;
        this.ledgerMassRock = 0;
        // Reservoirs outside the strata; getTotalMass() counts them.
        this.reservoirCeramicCp = 0;
        this.reservoirAshGasCp = 0;
        this.reservoirSuspendedSediment = 0;

        // Statistics for performance observability
        this.stats = {
            ticksExecuted: 0,
            strataVisited: 0,
            columnLookups: 0,
            strataScanned: 0,
            waterTransfers: 0,
            sedimentTransfers: 0,
            quiescentTicks: 0
        };
    }

    // Union of both queues; kept for callers that only know the old name.
    get dirtyColumns() {
        return new Set([...this.dirtyMoisture, ...this.dirtySlope]);
    }

    addStratum(stratum) {
        const existing = this.strata.get(stratum.id);
        this.strata.set(stratum.id, stratum);
        const key = columnKey(stratum.x, stratum.y);
        let col = this.columns.get(key);
        if (!col) {
            col = [];
            this.columns.set(key, col);
        }
        if (existing) {
            const i = col.indexOf(existing);
            if (i >= 0) col.splice(i, 1);
        }
        col.push(stratum);
        return stratum;
    }

    getStratum(id) {
        return this.strata.get(id) || null;
    }

    markDirty(x, y, z, s) {
        const id = encodeStratumId(x, y, z, s);
        this.dirtyMoisture.add(id);
        this.dirtySlope.add(id);
    }

    // The highest stratum in a column that still holds material, through the column index.
    getHighestStratumAt(x, y) {
        this.stats.columnLookups++;
        let highest = null;
        let highestElev = -Infinity;
        const consider = (stratum) => {
            this.stats.strataScanned++;
            if (!MUTANTS.stale_surface && !stratum.hasGround()) return;
            const elev = stratum.bottomElevationFt();
            if (elev > highestElev) {
                highestElev = elev;
                highest = stratum;
            }
        };
        if (MUTANTS.global_surface_scan) {
            for (const stratum of this.strata.values()) {
                if (stratum.x === x && stratum.y === y) {
                    consider(stratum);
                } else {
                    this.stats.strataScanned++; // every stratum the walk touches counts, matching or not
                }
            }
            return highest;
        }
        const col = this.columns.get(columnKey(x, y));
        if (!col) return null;
        for (const stratum of col) consider(stratum);
        return highest;
    }

    // Ground surface of a column in ft, or null when the engine knows nothing about that ground.
    getSurfaceElevationFt(x, y) {
        const top = this.getHighestStratumAt(x, y);
        if (top) return top.surfaceElevationFt();
        if (typeof this.groundElevationProvider === 'function') {
            const ft = this.groundElevationProvider(x, y);
            return Number.isFinite(ft) ? ft : null;
        }
        return null;
    }

    accumulateFractionalTransfer(edgeKey, rawFlow) {
        let grossFlow = rawFlow;
        if (!MUTANTS.discard_signed_residuals) {
            grossFlow += (this.signedResidualMap.get(edgeKey) || 0);
        }
        const intTransfer = Math.trunc(grossFlow);
        if (!MUTANTS.discard_signed_residuals) {
            this.signedResidualMap.set(edgeKey, grossFlow - intTransfer);
        } else {
            this.signedResidualMap.set(edgeKey, 0);
        }
        return intTransfer;
    }

    processMoistureTick(dt = 1, ledger = null) {
        this.stats.ticksExecuted++;
        if (this.dirtyMoisture.size === 0) {
            this.stats.quiescentTicks++;
            if (MUTANTS.moisture_clears_slope) this.dirtySlope.clear();
            return;
        }

        const activeIds = Array.from(this.dirtyMoisture);
        this.dirtyMoisture.clear();
        if (MUTANTS.moisture_clears_slope) this.dirtySlope.clear();

        for (const id of activeIds) {
            this.stats.strataVisited++;
            const stratum = this.getStratum(id);
            if (!stratum) continue;

            // 1. Capillary wicking: draw from the stratum beneath until field capacity or until the donor
            //    has nothing above its own retention threshold. The cell stays queued until one of those holds.
            const receiverDeficitCp = stratum.getFieldCapacityWaterMass() - stratum.getCurrentWaterMass();
            if (receiverDeficitCp > 0) {
                const belowId = getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);
                const belowStratum = this.getStratum(belowId);
                if (belowStratum) {
                    const donorAvailCp = Math.max(0, belowStratum.getCurrentWaterMass() - belowStratum.getFieldCapacityWaterMass());
                    if (donorAvailCp > 0) {
                        // Rate falls with the remaining deficit but never below one centipound per tick while a
                        // deficit exists; the signed residual sees the unrounded rate (DEC-038).
                        const conductivityFactor = Math.min(1.0, receiverDeficitCp / (stratum.getFieldCapacityWaterMass() || 1));
                        let rate = CAPILLARY_RATE_CP_PER_TICK * conductivityFactor * dt;
                        if (MUTANTS.round_before_residual) {
                            rate = Math.round(rate);
                        } else {
                            rate = Math.max(1, rate);
                        }
                        const rawFlow = Math.min(receiverDeficitCp, donorAvailCp, rate);

                        if (rawFlow > 0) {
                            const edgeKey = canonicalEdgeKey(stratum.id, belowId);
                            const intTransfer = this.accumulateFractionalTransfer(edgeKey, rawFlow);

                            if (intTransfer > 0) {
                                if (!MUTANTS.no_donor_debit) {
                                    belowStratum.waterMassCp -= intTransfer;
                                }
                                stratum.waterMassCp += intTransfer;
                                this.ledgerMassSoilWater += intTransfer;
                                this.stats.waterTransfers++;
                                if (ledger) {
                                    ledger.ledgerMassSoilWater = (ledger.ledgerMassSoilWater || 0) + intTransfer;
                                }
                            }
                            const stillShort = stratum.getFieldCapacityWaterMass() - stratum.getCurrentWaterMass() > 0;
                            const donorLeft = belowStratum.getCurrentWaterMass() - belowStratum.getFieldCapacityWaterMass() > 0;
                            if (stillShort && donorLeft && !MUTANTS.capillary_single_pulse) {
                                this.dirtyMoisture.add(stratum.id);
                            }
                        }
                    }
                }
            }

            // 2. Gravitational drainage: excess above field capacity percolates into the stratum beneath.
            const excessDrainCp = stratum.getExcessDrainableWater();
            if (excessDrainCp > 0) {
                const targetId = MUTANTS.reverse_drainage
                    ? getUpwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s)
                    : getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);

                const targetStratum = this.getStratum(targetId);
                if (targetStratum) {
                    const availableCapacity = targetStratum.getAvailablePoreCapacity();
                    if (availableCapacity > 0) {
                        const rawDrain = Math.min(excessDrainCp, availableCapacity);
                        const edgeKey = canonicalEdgeKey(stratum.id, targetId);
                        const intTransfer = this.accumulateFractionalTransfer(edgeKey, rawDrain);

                        if (intTransfer > 0) {
                            stratum.waterMassCp -= intTransfer;
                            targetStratum.waterMassCp += intTransfer;
                            this.stats.waterTransfers++;
                            // Target received water, queue it for percolation on subsequent tick
                            this.dirtyMoisture.add(targetStratum.id);
                        }
                    }
                }
                // If stratum still holds excess water (e.g. lower stratum is saturated), keep dirty
                if (stratum.getExcessDrainableWater() > 0) {
                    this.dirtyMoisture.add(stratum.id);
                }
            }
        }
    }

    // Angle of repose for a stratum, with capillary cohesion and saturation liquefaction.
    reposeAngleDeg(stratum) {
        let theta = stratum.angleRepose;
        if (stratum.horizon === 'O/A' || stratum.clay > 1500) {
            if (stratum.moisture > 1000 && stratum.moisture < 8000) {
                theta = Math.max(theta, 45); // capillary cohesion
            } else if (stratum.moisture >= 8000) {
                theta = Math.min(theta, 20); // mudslide risk
            }
        }
        return theta;
    }

    // The cell that receives sediment arriving in column (nx, ny): the surface cell while it has room,
    // otherwise a new empty cell directly above it. Returns null when the column's ground is unknown.
    receivingCellAt(nx, ny, like) {
        const surface = this.getHighestStratumAt(nx, ny);
        if (surface) {
            if (surface.freeVolumeCuFt() > 0) return surface;
            const upId = getUpwardNeighborId(surface.x, surface.y, surface.z, surface.s);
            const up = this.getStratum(upId);
            if (up) return up;
            const pos = decodeStratumId(upId);
            return this.addStratum(SoilStratum.deposit(nx, ny, pos.z, pos.s, like));
        }
        let floorFt = null;
        if (MUTANTS.empty_neighbor_as_floor) {
            floorFt = 0;
        } else if (typeof this.groundElevationProvider === 'function') {
            const ft = this.groundElevationProvider(nx, ny);
            floorFt = Number.isFinite(ft) ? ft : null;
        }
        if (floorFt === null) return null;
        const pos = MUTANTS.empty_neighbor_as_floor ? { z: like.z, s: like.s } : stratumAtElevationFt(floorFt);
        const existing = this.getStratum(encodeStratumId(nx, ny, pos.z, pos.s));
        if (existing) return existing;
        return this.addStratum(SoilStratum.deposit(nx, ny, pos.z, pos.s, like));
    }

    processSlopeStability(dt = 1, ledger = null) {
        if (this.dirtySlope.size === 0) {
            this.stats.quiescentTicks++;
            return;
        }

        const candidateIds = Array.from(this.dirtySlope);
        this.dirtySlope.clear();
        const nextDirty = new Set();

        for (const id of candidateIds) {
            this.stats.strataVisited++;
            const stratum = this.getStratum(id);
            if (!stratum || !stratum.loose || stratum.looseMassCp <= 0) continue;
            // Only a column's surface cell can shed sediment sideways.
            if (this.getHighestStratumAt(stratum.x, stratum.y) !== stratum) continue;

            const tanTheta = Math.tan((this.reposeAngleDeg(stratum) * Math.PI) / 180);
            const maxStableHeightDiff = tanTheta * 5; // 5 ft lattice spacing

            for (const { dx, dy } of CARDINALS) {
                if (stratum.looseMassCp <= 0) break;
                const nx = stratum.x + dx;
                const ny = stratum.y + dy;
                const neighborElev = this.getSurfaceElevationFt(nx, ny);
                if (neighborElev === null && !MUTANTS.empty_neighbor_as_floor) continue; // unknown ground
                const neighborSurface = neighborElev === null ? 0 : neighborElev;

                const heightDiff = stratum.surfaceElevationFt() - neighborSurface;
                if (heightDiff <= maxStableHeightDiff + REPOSE_EPSILON_FT) continue;

                const target = this.receivingCellAt(nx, ny, stratum);
                if (!target) continue;

                // Move half the excess height as volume: the source drops and the target rises by
                // about the same amount, so equal cells settle in one step and unequal ones converge.
                const excessHeight = heightDiff - maxStableHeightDiff;
                const wantedVolume = Math.max(0, (excessHeight / 2) * CELL_AREA_SQFT);
                let transferMass = Math.round(wantedVolume * stratum.bulkDensity);
                transferMass = Math.min(transferMass, stratum.looseMassCp);
                if (target.freeVolumeCuFt() > 0) {
                    transferMass = Math.min(transferMass, Math.max(1, Math.floor(target.freeVolumeCuFt() * target.bulkDensity)));
                }
                if (transferMass <= 0) continue;

                stratum.looseMassCp -= transferMass;
                target.looseMassCp += transferMass;
                this.ledgerMassSediment += transferMass;
                this.stats.sedimentTransfers++;
                if (ledger) {
                    ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + transferMass;
                }

                nextDirty.add(target.id);
                const stillSteep = stratum.surfaceElevationFt() - target.surfaceElevationFt() > maxStableHeightDiff + REPOSE_EPSILON_FT;
                if (stratum.looseMassCp > 0 && stillSteep) {
                    nextDirty.add(stratum.id);
                }
            }
        }

        for (const nid of nextDirty) {
            this.dirtySlope.add(nid);
        }
    }

    applyWeathering(x, y, z, s, exposedSurface, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum || !exposedSurface) return;

        // Mechanical weathering: exposed bedrock fractures into regolith sediment
        const fractureRate = 0.01 * dt;
        const rockLossCp = Math.round(stratum.solidMassCp * fractureRate);
        if (rockLossCp <= 0) return;

        stratum.solidMassCp -= rockLossCp;

        if (!MUTANTS.unbalanced_weathering) {
            stratum.looseMassCp = (stratum.looseMassCp || 0) + rockLossCp;
        }

        this.ledgerMassRock -= rockLossCp;
        this.ledgerMassSediment += rockLossCp;
        if (ledger) {
            ledger.ledgerMassRock = (ledger.ledgerMassRock || 0) - rockLossCp;
            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + rockLossCp;
        }
        this.dirtySlope.add(stratum.id);
    }

    applyWaterErosion(x, y, z, s, fluidVelocity, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum || fluidVelocity <= 0) return;

        const erosionRate = Math.min(0.05, 0.005 * fluidVelocity * dt);
        const erodedMassCp = Math.round(stratum.solidMassCp * erosionRate);
        if (erodedMassCp <= 0) return;

        stratum.solidMassCp -= erodedMassCp;
        stratum.particles = Math.max(0, Math.round(stratum.particles * (1 - erosionRate)));

        this.reservoirSuspendedSediment += erodedMassCp;
        this.ledgerMassSediment += erodedMassCp;
        if (ledger) {
            ledger.ledgerMassSoil = (ledger.ledgerMassSoil || 0) - erodedMassCp;
            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + erodedMassCp;
        }
    }

    // Suspended sediment settles out of the water onto a stratum as loose alluvium. The reservoir is
    // the donor; the call moves at most what the reservoir holds and returns what moved.
    depositSuspendedSediment(x, y, z, s, massCp, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        const wanted = Math.max(0, Math.round(massCp));
        if (!stratum || wanted <= 0) return 0;
        const moved = Math.min(wanted, this.reservoirSuspendedSediment);
        if (moved <= 0) return 0;
        if (!MUTANTS.deposition_no_debit) {
            this.reservoirSuspendedSediment -= moved;
        }
        stratum.looseMassCp += moved;
        this.ledgerMassSediment += moved;
        if (ledger) {
            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + moved;
        }
        this.dirtySlope.add(stratum.id);
        return moved;
    }

    applyThermalDegradation(x, y, z, s, tempKelvin, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum) return;

        // Thermal degradation only occurs above 400 Kelvin
        if (tempKelvin < 400) return;

        const intensity = Math.min(0.1, ((tempKelvin - 400) / 1000) * 0.02 * dt);
        const organicFraction = stratum.organic / 10000;
        const organicLossCp = Math.round(stratum.solidMassCp * organicFraction * intensity);

        const clayFraction = stratum.clay / 10000;
        const clayBakedCp = Math.round(stratum.solidMassCp * clayFraction * intensity);

        const totalLossCp = organicLossCp + clayBakedCp;
        if (totalLossCp <= 0) return;

        stratum.solidMassCp -= totalLossCp;

        stratum.organic = Math.max(0, Math.round(stratum.organic * (1 - intensity)));
        stratum.clay = Math.max(0, Math.round(stratum.clay * (1 - intensity)));
        const rem = stratum.sand + stratum.silt + stratum.clay + stratum.organic;
        if (rem > 0) {
            stratum.sand = Math.round((stratum.sand / rem) * 10000);
            stratum.silt = Math.round((stratum.silt / rem) * 10000);
            const diff = 10000 - (stratum.sand + stratum.silt + stratum.clay + stratum.organic);
            stratum.sand += diff;
        }

        this.reservoirAshGasCp += organicLossCp;
        this.reservoirCeramicCp += clayBakedCp;
        if (ledger) {
            ledger.ledgerMassSoil = (ledger.ledgerMassSoil || 0) - totalLossCp;
            ledger.ledgerMassCeramic = (ledger.ledgerMassCeramic || 0) + clayBakedCp;
            ledger.ledgerMassAshGas = (ledger.ledgerMassAshGas || 0) + organicLossCp;
        }
    }

    // Every centipound the engine holds, by reservoir. This is the number the closed-mass checks compare.
    getTotalMass() {
        let totalRock = 0;
        let totalSediment = 0;
        let totalWater = 0;

        for (const stratum of this.strata.values()) {
            totalRock += stratum.solidMassCp;
            totalWater += stratum.waterMassCp;
            totalSediment += (stratum.looseMassCp || 0);
        }

        const ceramic = this.reservoirCeramicCp || 0;
        const ashGas = this.reservoirAshGasCp || 0;
        const suspended = this.reservoirSuspendedSediment || 0;

        return {
            rock: totalRock,
            sediment: totalSediment + suspended,
            water: totalWater,
            ceramic,
            ashGas,
            total: totalRock + totalSediment + totalWater + ceramic + ashGas + suspended
        };
    }

    serialize() {
        const strataList = [];
        for (const s of this.strata.values()) {
            strataList.push(s.serialize());
        }
        return JSON.stringify({
            strata: strataList,
            residuals: Array.from(this.signedResidualMap.entries()),
            dirtyMoisture: Array.from(this.dirtyMoisture),
            dirtySlope: Array.from(this.dirtySlope),
            ledgerMassSoilWater: this.ledgerMassSoilWater,
            ledgerMassSediment: this.ledgerMassSediment,
            ledgerMassRock: this.ledgerMassRock,
            reservoirCeramicCp: this.reservoirCeramicCp,
            reservoirAshGasCp: this.reservoirAshGasCp,
            reservoirSuspendedSediment: this.reservoirSuspendedSediment
        });
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.strata.clear();
        this.columns.clear();
        for (const sData of data.strata) {
            const s = SoilStratum.deserialize(sData);
            if (MUTANTS.load_without_index) {
                this.strata.set(s.id, s);
            } else {
                this.addStratum(s);
            }
        }
        this.signedResidualMap = new Map(data.residuals || []);
        if (data.dirtyMoisture || data.dirtySlope) {
            this.dirtyMoisture = new Set(data.dirtyMoisture || []);
            this.dirtySlope = new Set(data.dirtySlope || []);
        } else {
            // Payloads written before the two queues existed carried one shared list.
            this.dirtyMoisture = new Set(data.dirtyColumns || []);
            this.dirtySlope = new Set(data.dirtyColumns || []);
        }
        this.ledgerMassSoilWater = data.ledgerMassSoilWater || 0;
        this.ledgerMassSediment = data.ledgerMassSediment || 0;
        this.ledgerMassRock = data.ledgerMassRock || 0;
        this.reservoirCeramicCp = data.reservoirCeramicCp || 0;
        this.reservoirAshGasCp = data.reservoirAshGasCp || 0;
        this.reservoirSuspendedSediment = data.reservoirSuspendedSediment || 0;
    }
}

// Canonical Horizon Definitions
const HORIZON_SPECS = {
    'O/A': {
        name: 'O/A',
        bulkDensity: 3750,
        porosity: 4500,
        fieldCapacity: 3500,
        sand: 4000,
        silt: 3000,
        clay: 1000,
        organic: 2000,
        basisPoints: 2000
    },
    'B': {
        name: 'B',
        bulkDensity: 4750,
        porosity: 3800,
        fieldCapacity: 4000,
        sand: 3000,
        silt: 4000,
        clay: 2500,
        organic: 500,
        basisPoints: 3000
    },
    'C': {
        name: 'C',
        bulkDensity: 6000,
        porosity: 3000,
        fieldCapacity: 2500,
        sand: 6000,
        silt: 2500,
        clay: 1500,
        organic: 0,
        basisPoints: 5000
    }
};

function getHorizons() {
    return [HORIZON_SPECS['O/A'], HORIZON_SPECS['B'], HORIZON_SPECS['C']];
}

function createStratum(horizon, options = {}) {
    const spec = HORIZON_SPECS[horizon] || HORIZON_SPECS['O/A'];
    const sand = options.sand !== undefined ? options.sand : spec.sand;
    const silt = options.silt !== undefined ? options.silt : spec.silt;
    const clay = options.clay !== undefined ? options.clay : spec.clay;
    const organic = options.organic !== undefined ? options.organic : spec.organic;
    const bulkDensity = options.bulkDensity !== undefined ? options.bulkDensity : spec.bulkDensity;
    const porosity = options.porosity !== undefined ? options.porosity : spec.porosity;
    const fieldCapacity = options.fieldCapacity !== undefined ? options.fieldCapacity : spec.fieldCapacity;

    const s = new SoilStratum(
        options.x || 0,
        options.y || 0,
        options.z || 0,
        options.s || 0,
        horizon,
        sand,
        silt,
        clay,
        organic,
        bulkDensity,
        porosity,
        fieldCapacity,
        options.moisture !== undefined ? options.moisture : 2000,
        options.loose !== undefined ? options.loose : false,
        options.angleRepose !== undefined ? options.angleRepose : 34
    );
    if (options.particles !== undefined) s.particles = options.particles;
    if (options.mass !== undefined) s.solidMassCp = options.mass;
    return s;
}

function createAquifer(options = {}) {
    // Aquifer donor stratum representing saturated rock layer beneath
    return createStratum('C', {
        x: options.x || 0,
        y: options.y || 0,
        z: options.z !== undefined ? options.z : -1,
        s: options.s !== undefined ? options.s : 4,
        moisture: options.moisture !== undefined ? options.moisture : 8000,
        porosity: 3000,
        fieldCapacity: 2500
    });
}

// Public Delegation Helpers (Directly execute GeomorphologyEngine)
function simulateCapillaryRise(aquiferDonor, upperStratum, dt = 1) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(aquiferDonor);
    eng.addStratum(upperStratum);
    eng.markDirty(upperStratum.x, upperStratum.y, upperStratum.z, upperStratum.s);
    eng.processMoistureTick(dt);
}

function simulateGravityPercolation(stratum, dt = 1) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    const belowId = getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);
    const pos = decodeStratumId(belowId);
    const belowStratum = createStratum(stratum.horizon, {
        x: pos.x, y: pos.y, z: pos.z, s: pos.s,
        moisture: 0
    });
    eng.addStratum(belowStratum);
    eng.markDirty(stratum.x, stratum.y, stratum.z, stratum.s);
    eng.processMoistureTick(dt);
    return belowStratum;
}

function simulateWaterTransfer(stratum, amountBp) {
    const max = stratum.getMaxWaterMass();
    const massDelta = Math.round(max * (amountBp / 10000));
    stratum.waterMassCp = Math.max(0, stratum.waterMassCp + massDelta);
}

function clampMoisture(stratum) {
    if (MUTANTS.bypass_pore_clamp) return;
    const max = stratum.getMaxWaterMass();
    stratum.waterMassCp = Math.min(max, Math.max(0, stratum.waterMassCp));
}

function createSediment(type, options = {}) {
    let angleRepose = 34;
    let loose = true;
    if (type === 'gravel') {
        angleRepose = 35;
    } else if (type === 'sand') {
        angleRepose = 34;
    } else if (type === 'loam') {
        loose = false;
        angleRepose = (options.moisture !== undefined && options.moisture > 1000) ? 45 : 30;
    } else if (type === 'clay' || type === 'mud') {
        angleRepose = 20;
    }
    return {
        type,
        angleRepose,
        loose,
        moisture: options.moisture !== undefined ? options.moisture : 0
    };
}

function checkCollapse(sediment, slopeAngle) {
    return slopeAngle > sediment.angleRepose;
}

function weatherRock(initialRockMassCp) {
    const eng = new GeomorphologyEngine();
    const s = createStratum('C', {
        bulkDensity: Math.round(initialRockMassCp / VOLUME_PER_STRATUM)
    });
    s.solidMassCp = initialRockMassCp;
    eng.addStratum(s);
    eng.applyWeathering(s.x, s.y, s.z, s.s, true, 1);
    return {
        regolithMass: s.looseMassCp,
        remainingRockMass: s.solidMassCp,
        totalMass: s.solidMassCp + s.looseMassCp
    };
}

function simulateWaterErosion(stratum) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    eng.applyWaterErosion(stratum.x, stratum.y, stratum.z, stratum.s, 10, 1);
}

function simulateLavaThermalDegradation(stratum) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    eng.applyThermalDegradation(stratum.x, stratum.y, stratum.z, stratum.s, 1200, 1);
}

function serializeStratum(stratum) {
    return JSON.stringify(stratum.serialize());
}

function deserializeStratum(jsonStr) {
    return SoilStratum.deserialize(JSON.parse(jsonStr));
}

function createRegion() {
    return new GeomorphologyEngine();
}

// One simulation step in the brief's order: moisture, then slope stability.
function simulateQuiescence(engine) {
    engine.processMoistureTick(1);
    engine.processSlopeStability(1);
}

// Module export definitions
const exportedModule = {
    VOLUME_PER_STRATUM,
    CELL_AREA_SQFT,
    STRATUM_HEIGHT_FT,
    WATER_DENSITY_CP_PER_CUFT,
    MAX_WATER_MASS_PER_STRATUM,
    CAPILLARY_RATE_CP_PER_TICK,
    REPOSE_EPSILON_FT,
    MUTANTS,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    columnKey,
    getDownwardNeighborId,
    getUpwardNeighborId,
    stratumBottomElevationFt,
    stratumTopElevationFt,
    stratumAtElevationFt,
    SoilStratum,
    GeomorphologyEngine,
    HORIZON_SPECS,
    getHorizons,
    createStratum,
    createAquifer,
    simulateCapillaryRise,
    simulateGravityPercolation,
    simulateWaterTransfer,
    clampMoisture,
    createSediment,
    checkCollapse,
    weatherRock,
    simulateWaterErosion,
    simulateLavaThermalDegradation,
    serializeStratum,
    deserializeStratum,
    createRegion,
    simulateQuiescence
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedModule;
}

if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Soil = exportedModule;
    window.DEUS.Sim.Geomorphology = exportedModule;
}
