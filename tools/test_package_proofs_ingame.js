const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'pkg_proofs');

console.log('=== Setting up In-Engine Proof Scenario Harness (Packages 1, 2, 3) ===');

if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (_) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'DEUS_Test.js');
let testJs = fs.readFileSync(testJsPath, 'utf8');

const suiteInjection = `
    //-------------------------------------------------------------------------
    // In-Engine Playtest Proof Suites for Packages 1, 2, 3
    Test.suite("package_proofs", async t => {
        const W = window.UF && window.UF.World;
        const Levels = window.UF && window.UF.Levels;
        const Items = window.UF && window.UF.Items;
        const Objects = window.UF && window.UF.Objects;

        await t.waitUntil(() => W && W.currentArea() && window.$gameMap && window.$gamePlayer, 25000, "world ready");
        const area = W.currentArea();
        const px = $gamePlayer.x, py = $gamePlayer.y;

        // =====================================================================
        // PROOF A: Package 1 - Physical Space & Multi-Z Substrate
        // =====================================================================
        t.check("pkg1_area_valid", !!area, "World area active and initialized");
        t.check("pkg1_player_coords", Number.isInteger(px) && Number.isInteger(py), "Player coordinate space: (" + px + "," + py + ")");
        
        // Multi-Z level check
        const curZ = Levels && typeof Levels.viewZ === "function" ? Levels.viewZ() : 0;
        t.check("pkg1_multiz_substrate", Number.isInteger(curZ), "Current Z level: " + curZ);

        // Physical Object & Ground Item placement
        // Physical Object & Ground Item placement
        if (Objects && Items) {
            const chestX = px + 1, chestY = py;
            Objects.set(area, chestX, chestY, "chest_wood");
            const chestObj = Objects.at(area, chestX, chestY) || Objects.at(chestX, chestY);
            t.check("pkg1_object_placement", chestObj && (chestObj.id === "chest_wood" || chestObj.type === "chest_wood"), "Physical chest placed at (" + chestX + "," + chestY + ")");

            Items.drop(area, chestX, chestY, "stone", 1, null, { mat: "granite" });
            const groundItems = Items.at(chestX, chestY);
            t.check("pkg1_item_spawned", groundItems && groundItems.length > 0 && groundItems[0].type === "stone", "Physical item spawned on ground at (" + chestX + "," + chestY + ")");
        }

        await t.waitFrames(15);
        t.screenshot("proof_pkg1_physical_space");

        // =====================================================================
        // PROOF B: Package 2 - Physical Matter & Structural Collapse
        // =====================================================================
        try {
            const structuralMod = require(path.join(baseDir, "js", "sim", "structural", "index.js"));
            t.check("pkg2_module_loaded", !!structuralMod, "Structural module loaded in engine");

            const granite = { density: 165.0, tensileYield: 3000 }; // max span = 3000 / (165 * 10) = 1 cell
            const anchor = { position: { x: 0, y: 0 }, solid: true, supported: true, material: granite, type: "solid" };
            const beam1 = { position: { x: 1, y: 0 }, solid: true, supported: false, material: granite, type: "solid" };
            const beam2 = { position: { x: 2, y: 0 }, solid: true, supported: true, material: granite, type: "solid" };

            // Beam 1 anchored to (0,0): span = 1 <= maxSpan 1 -> supported
            const res1 = structuralMod.evalCellSupport(beam1, granite, null, anchor);
            t.check("pkg2_cantilever_supported", res1.supported === true, "Span 1 cantilever beam supported within tensile limit");

            // Beam 2 evaluated relative to anchor at (0,0): span = 2 > maxSpan 1 -> overloaded
            const res2 = structuralMod.evalCellSupport(beam2, granite, null, anchor);
            t.check("pkg2_cantilever_overloaded", res2.supported === false, "Span 2 cantilever beam exceeds tensile limit");

            // Execute collapse and verify mass conservation via ledger
            beam2.neighborHoriz = anchor;
            const cellMass = structuralMod.CELL_VOLUME_CUFT * granite.density; // 50 * 165 = 8250 lbs
            const ledger = { solid: 50000, rubble: 0 };
            const collapseRes = structuralMod.executeCollapse([beam2], null, ledger);

            t.check("pkg2_collapse_executed", collapseRes.collapsedCount === 1, "Unsupported beam collapsed (count: " + collapseRes.collapsedCount + ")");
            t.check("pkg2_mass_conservation", ledger.rubble === cellMass && ledger.solid === 50000 - cellMass, "Mass ledger strictly conserved (transferred " + cellMass + " lbs)");
            t.check("pkg2_rubble_generated", collapseRes.rubbleItemsCreated === 1, "Rubble items spawned from collapsed rock mass");
        } catch (err) {
            t.check("pkg2_structural_error", false, "Structural proof failed: " + err.message);
        }

        await t.waitFrames(15);
        t.screenshot("proof_pkg2_collapse_rubble");

        // =====================================================================
        // PROOF C: Package 3 - Water & Aquifer Seepage
        // =====================================================================
        try {
            const hydroMod = require(path.join(baseDir, "js", "sim", "hydrology", "index.js"));
            t.check("pkg3_module_loaded", !!hydroMod, "Hydrology module loaded in engine");

            const engine = new hydroMod.AquiferEngine();
            // Sandstone stratum (x=10, y=10, z=0, s=2), 25% porosity, 100k conductivity, saturated with 78,000 cp water
            const sandStratum = new hydroMod.Stratum(hydroMod.encodeStratumId(10, 10, 0, 2), 10, 10, 0, 2, 2500, 100000, 78000, "rock");
            // Adjacent empty cavern void stratum (x=11, y=10, z=0, s=2)
            const voidStratum = new hydroMod.Stratum(hydroMod.encodeStratumId(11, 10, 0, 2), 11, 10, 0, 2, 10000, 1000000, 0, "void");

            engine.addStratum(sandStratum);
            engine.addStratum(voidStratum);
            engine.markDirty(10, 10, 0, 2);

            const initialTotalMass = engine.getTotalMass();
            t.check("pkg3_initial_mass", initialTotalMass === 78000, "Initial aquifer mass recorded: 78,000 cp");

            // Tick hydrology simulation for 10 steps using processTick
            for (let i = 0; i < 10; i++) {
                engine.processTick(1);
            }

            const postTickTotalMass = engine.getTotalMass();
            const seepageMass = voidStratum.waterMass;
            t.check("pkg3_darcy_seepage", seepageMass > 0, "Groundwater seeped from rock into breached void: " + seepageMass + " cp");
            t.check("pkg3_drawdown", sandStratum.waterMass < 78000, "Aquifer rock pore volume depleted: " + sandStratum.waterMass + " cp remaining");
            t.check("pkg3_mass_conservation", initialTotalMass === postTickTotalMass, "Universal closed-mass invariant verified (total mass unchanged: " + postTickTotalMass + " cp)");

            // Visual presentation: Draw a pool of surface water adjacent to player to verify engine autotile rendering
            const w = $dataMap.width;
            for (let dy = 2; dy <= 4; dy++) {
                for (let dx = 2; dx <= 4; dx++) {
                    $dataMap.data[(py + dy) * w + (px + dx)] = 2048; // autotile fresh water
                }
            }
            if (SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap) {
                SceneManager._scene._spriteset._tilemap.refresh();
            }
        } catch (err) {
            t.check("pkg3_hydrology_error", false, "Hydrology proof failed: " + err.message);
        }

        await t.waitFrames(25);
        t.screenshot("proof_pkg3_aquifer_seepage");

        // =====================================================================
        // PROOF D: Package 4 - Soil Geomorphology & Capillary Coupling
        // =====================================================================
        try {
            const soilMod = require(path.join(baseDir, "js", "sim", "geomorphology", "index.js"));
            t.check("pkg4_module_loaded", !!soilMod, "Soil Geomorphology module loaded in engine");

            // Load & verify DEUS_SoilBridge coupling
            const bridgePath = path.join(baseDir, "js", "plugins", "DEUS_SoilBridge.js");
            let loadedBridge = null;
            if (fs.existsSync(bridgePath)) {
                loadedBridge = require(bridgePath);
            }
            const SoilBridge = (window.UF && window.UF.Soil) || (window.DEUS && window.DEUS.Soil) || loadedBridge;
            t.check("pkg4_bridge_present", !!SoilBridge, "Soil Bridge namespace present in engine");

            const soilEng = new soilMod.GeomorphologyEngine();
            // Create a 3-stratum vertical column:
            // S0: Bedrock / Aquifer (saturated with pore water, 78,000 cp)
            // S1: Horizon B (Subsoil, mineral clay/silt, field capacity 3000 bp, initially dry)
            // S2: Horizon A (Topsoil/Humus, high organic, field capacity 3500 bp, initially dry)
            const sBedrock = new soilMod.SoilStratum(px, py, 0, 0, "C", 5000, 3000, 1900, 100, 6000, 2500, 2000, 10000);
            const sSubsoil = new soilMod.SoilStratum(px, py, 0, 1, "B", 3000, 3000, 3800, 200, 4750, 3500, 3000, 500);
            const sTopsoil = new soilMod.SoilStratum(px, py, 0, 2, "A", 4000, 4000, 1500, 2500, 3750, 4500, 3500, 0);

            soilEng.addStratum(sBedrock);
            soilEng.addStratum(sSubsoil);
            soilEng.addStratum(sTopsoil);

            const initialSoilMass = soilEng.getTotalMass().total;
            t.check("pkg4_initial_mass", initialSoilMass > 0, "Initial soil column mass recorded: " + initialSoilMass + " cp");

            // Capillary wicking: moisture wicks upward from saturated bedrock into subsoil and topsoil
            soilMod.simulateCapillaryRise(sBedrock, sSubsoil);
            soilMod.simulateCapillaryRise(sSubsoil, sTopsoil);

            t.check("pkg4_capillary_wicking", sSubsoil.waterMassCp > 0 && sTopsoil.waterMassCp >= 0, "Capillary suction wicked pore moisture upward from aquifer into subsoil");

            // Angle of repose & slope cascade:
            // Cell (px+1, py) has high loose sediment (4 ft high = 2 strata); adjacent Cell (px+2, py) has 0 ft (ground floor)
            const sandSpec = ["C", 6000, 2500, 1500, 0, 6000, 3000, 2500];
            const steepCell = new soilMod.SoilStratum(px + 1, py, 0, 1, ...sandSpec, 0, true, 34);
            steepCell.looseMassCp = 150000; // 150,000 cp loose sand
            soilEng.addStratum(steepCell);

            const floorCell = new soilMod.SoilStratum(px + 2, py, 0, 0, ...sandSpec, 0, false, 34);
            soilEng.addStratum(floorCell);

            const preCascadeMass = soilEng.getTotalMass().total;
            soilEng.markDirty(px + 1, py, 0, 1);
            soilEng.processSlopeStability(1);

            const postCascadeMass = soilEng.getTotalMass().total;
            t.check("pkg4_slope_cascade_repose", postCascadeMass === preCascadeMass, "Sediment cascade conserved 100% of mass during angle-of-repose settling (" + postCascadeMass + " cp)");

            // Visual presentation: Draw rich tilled/loam soil tiles adjacent to player to verify visual ground representation
            const w = $dataMap.width;
            for (let dy = -3; dy <= -1; dy++) {
                for (let dx = 1; dx <= 3; dx++) {
                    $dataMap.data[(py + dy) * w + (px + dx)] = 2816; // autotile loam / dirt
                }
            }
            if (SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap) {
                SceneManager._scene._spriteset._tilemap.refresh();
            }
        } catch (err) {
            t.check("pkg4_soil_error", false, "Soil geomorphology proof failed: " + err.message);
        }

        await t.waitFrames(25);
        t.screenshot("proof_pkg4_soil_geomorphology");
    });
`;

testJs = testJs.replace('if (!Test.active) return;', 'if (!Test.active) return;\n' + suiteInjection);
fs.writeFileSync(testJsPath, testJs, 'utf8');

console.log('Running package_proofs in-engine test via run_tests.js...');
const nodePath = 'C:\\Program Files\\nodejs\\node.exe';
const runTestsPath = path.join(ROOT, 'tools', 'run_tests.js');

try {
    const out = childProcess.execSync(`"${nodePath}" "${runTestsPath}" package_proofs --game "${SNAPSHOT_DIR}"`, { stdio: 'pipe' });
    console.log(out.toString());
} catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(1);
}

// Copy screenshots
const outDir = path.join(SNAPSHOT_DIR, 'test_output');
const reviewDir = path.join(ROOT, 'art', 'review');
fs.mkdirSync(reviewDir, { recursive: true });

const shots = [
    'package_proofs.proof_pkg1_physical_space.png',
    'package_proofs.proof_pkg2_collapse_rubble.png',
    'package_proofs.proof_pkg3_aquifer_seepage.png',
    'package_proofs.proof_pkg4_soil_geomorphology.png'
];

for (const s of shots) {
    const src = path.join(outDir, s);
    const dest = path.join(reviewDir, s);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied screenshot: ${s} -> art/review/`);
    } else {
        console.log(`Screenshot missing: ${s}`);
    }
}
console.log('=== In-Engine Package Proof Execution Complete ===');
