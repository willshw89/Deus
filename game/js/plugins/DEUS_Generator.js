//=============================================================================
// RPG Maker MZ - UF_Generator
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [DEUS Generator] Procedural composite character sprite assembly, portrait generation, and demographic variation.
 * @author Gemini / Claude Code
 *
 * @help
 * UF_Generator.js
 *
 * Procedural modular character and portrait generator.
 * Synchronizes 1:1 between in-game walking charsets ($gen_*) and U7 stone-arch
 * portraits (face_gen_*), spanning hundreds of unique appearances across 5
 * genetic loci: Skin Tone x Hair Style x Hair Color x Beard x Outfit.
 * Supports dynamic equipment paperdolling and life-stage aging transitions.
 */

'use strict';

var Imported = Imported || {};
Imported.UF_Generator = true;

var UF = window.UF || {};
window.UF = UF;

(function() {
    UF.Generator = UF.Generator || {};

    const HAIR_RAMPS = {
        brown:  [[40, 20, 10], [75, 40, 15], [120, 65, 25], [160, 95, 40], [200, 130, 60]],
        black:  [[15, 15, 20], [30, 30, 38], [50, 50, 60], [80, 80, 95], [120, 120, 135]],
        blonde: [[85, 55, 20], [140, 95, 30], [195, 145, 45], [235, 190, 75], [255, 230, 135]],
        red:    [[70, 15, 10], [120, 25, 15], [175, 45, 25], [215, 75, 40], [245, 120, 65]],
        silver: [[50, 55, 65], [85, 95, 110], [130, 140, 155], [180, 190, 205], [230, 235, 245]]
    };

    UF.Generator.HAIR_RAMPS = HAIR_RAMPS;
    UF.Generator._bitmapCache = {};

    let _pool = null;

    function loadPool() {
        if (_pool) return _pool;
        if (typeof window !== 'undefined' && window.$dataGeneratorPool) {
            _pool = window.$dataGeneratorPool;
            return _pool;
        }
        if (typeof require === 'function') {
            try {
                const fs = require('fs');
                const path = require('path');
                const candidates = [
                    'data/UF_GeneratorPool.json',
                    'game/data/UF_GeneratorPool.json',
                    path.join(process.cwd(), 'data/UF_GeneratorPool.json'),
                    path.join(process.cwd(), 'game/data/UF_GeneratorPool.json')
                ];
                for (const p of candidates) {
                    if (fs.existsSync(p)) {
                        _pool = JSON.parse(fs.readFileSync(p, 'utf8'));
                        return _pool;
                    }
                }
            } catch (_) {}
        }
        return null;
    }

    UF.Generator.pool = function() {
        return loadPool() || [];
    };

    UF.Generator.clothingIndexForUnit = function(unit, d) {
        if (!unit && !d) return 1;
        const uData = (unit && unit.data) || d || {};
        const eq = uData.equipment || {};

        // 1. Check equipped item in torso or clothes slot
        const torsoId = eq.torso !== undefined && eq.torso !== null ? eq.torso : (eq.clothes !== undefined ? eq.clothes : null);
        let typeId = null;

        if (typeof torsoId === 'string') {
            typeId = torsoId;
        } else if (typeof torsoId === 'number' && window.UF && UF.Items && typeof UF.Items.get === 'function') {
            const it = UF.Items.get(torsoId);
            if (it) typeId = it.type;
        } else if (d && d.clothes && typeof d.clothes === 'string') {
            typeId = d.clothes;
        } else if (unit && unit.equipment && Array.isArray(unit.equipment)) {
            const torsoEntry = unit.equipment.find(e => e && (e.slot === 'torso' || e.slot === 'clothes'));
            if (torsoEntry) typeId = torsoEntry.typeId;
        }

        if (typeId) {
            const lowerId = String(typeId).toLowerCase();
            // Metal / plate / mail armor -> clothing 2
            if (lowerId.includes('mail') || lowerId.includes('iron') || lowerId.includes('steel') || lowerId.includes('plate') || lowerId.includes('cuirass')) {
                return 2;
            }
            // Cloak / wrap / mantle -> clothing 3
            if (lowerId.includes('wrap') || lowerId.includes('cloak') || lowerId.includes('mantle') || lowerId.includes('cape')) {
                return 3;
            }
            // Leather armor / jerkin -> clothing 1
            if (lowerId.includes('leather') || lowerId.includes('hide') || lowerId.includes('jerkin') || lowerId.includes('padded')) {
                return 1;
            }
            // Apron / artisan / peasant -> clothing 4
            if (lowerId.includes('apron') || lowerId.includes('artisan') || lowerId.includes('peasant') || lowerId.includes('tunic')) {
                return 4;
            }
        }

        // 2. Check clothing tier
        const tier = uData.tier !== undefined ? (uData.tier | 0) : ((d && d.tier !== undefined) ? (d.tier | 0) : 0);
        if (tier >= 3) return 2; // Tier 3: Steel plate / iron mail
        if (tier === 2) return 1; // Tier 2: Leather armor / jerkin
        if (tier === 1) return 3; // Tier 1: Woven wrap / cloak

        // 3. Tier 0 (unarmored / civilian): use genetics clothing if set, otherwise 4 (plain peasant tunic / apron) or 1
        if (uData.genetics && uData.genetics.clothing) {
            return Math.max(1, Math.min(4, uData.genetics.clothing | 0));
        }
        return 4;
    };

    /**
     * Resolves the filename for the armor layer overlay (or null for children).
     */
    UF.Generator.armorSheetForUnit = function(unit, d) {
        const uData = (unit && unit.data) || d || {};
        const stage = uData.stage || ((uData.age !== undefined && uData.age < 15) ? 'child' : 'adult');
        if (stage === 'child') return null; // Children don't wear adult armor layers
        const gender = (d && d.gender) || uData.gender || 'male';
        const isMale = String(gender).toLowerCase() !== 'female';
        const cIdx = UF.Generator.clothingIndexForUnit(unit, d);
        return (isMale ? 'male_cloth_' : 'female_cloth_') + cIdx;
    };

    /**
     * Map a unit's gender, stage, genetics, and tier to a modular generator key & spec.
     */
    UF.Generator.specFor = function(seed, unitId, gender, stage, genetics, tier, unitOrDesc) {
        const isMale = gender === 'male';
        const isChild = stage === 'child' || stage === 'baby';
        const isElder = stage === 'elder';

        const g = genetics || {};
        const skinTone = Math.max(1, Math.min(3, g.skinTone || 1));
        const hairStyle = Math.max(1, Math.min(4, g.hairStyle || 1));
        const hairColor = isElder ? 'silver' : (g.hairColor || 'brown');
        const beard = (isMale && !isChild) ? Math.max(0, Math.min(3, g.beard !== undefined ? g.beard : 1)) : 0;
        
        // Tiered clothing paperdolling: 1=Jerkin, 2=Plate, 3=Mantle, 4=Apron/Peasant
        let clothing = unitOrDesc ? UF.Generator.clothingIndexForUnit(unitOrDesc) : Math.max(1, Math.min(4, g.clothing || 1));
        if (!unitOrDesc && tier !== undefined && tier > 0) {
            if (tier === 1) clothing = 3; // Forester/Hunter mantle
            else if (tier === 2) clothing = 1; // Leather armor / jerkin
            else if (tier >= 3) clothing = 2; // Steel cuirass / armor
        }

        let key = '';
        if (isChild) {
            key = `c_${isMale ? 'boy' : 'girl'}_s${skinTone}_${hairColor === 'silver' ? 'brown' : hairColor}`;
        } else if (isElder) {
            key = isMale ? `m_elder_s${skinTone}_b${beard || 1}_c${clothing}` : `f_elder_s${skinTone}_c${clothing}`;
        } else if (isMale) {
            key = `m_s${skinTone}_h${hairStyle}_${hairColor}_b${beard}_c${clothing}`;
        } else {
            key = `f_s${skinTone}_h${hairStyle}_${hairColor}_c${clothing}`;
        }

        // Snap to guaranteed available combination in baked pool to prevent missing file LoadError
        const pool = loadPool();
        if (pool && pool.length) {
            const exact = pool.find(p => p.key === key);
            if (!exact) {
                const targetStage = isChild ? 'child' : (isElder ? 'elder' : 'adult');
                const targetGender = isMale ? 'male' : 'female';
                const candidates = pool.filter(p => p.stage === targetStage && p.gender === targetGender);
                if (candidates.length) {
                    const closest = candidates.find(c => c.skinTone === skinTone && c.hairColor === hairColor && c.hairStyle === hairStyle) ||
                                    candidates.find(c => c.skinTone === skinTone && c.hairColor === hairColor) ||
                                    candidates.find(c => c.skinTone === skinTone) ||
                                    candidates[Math.abs((unitId || 0) + (seed || 0)) % candidates.length];
                    if (closest) {
                        key = closest.key;
                    }
                }
            }
        }

        const spec = {
            key,
            gender: isMale ? 'male' : 'female',
            stage: isChild ? 'child' : (isElder ? 'elder' : 'adult'),
            skinTone,
            hairStyle,
            hairColor,
            beard,
            clothing,
            charsetName: `$gen_${key}`,
            faceName: `face_gen_${key}`,
            faceIndex: 0
        };

        return spec;
    };

    /**
     * Apply procedural appearance to a unit (characterName, face, and map event).
     */
    UF.Generator.applyToUnit = function(unit, worldSeed) {
        if (!unit || !unit.data) return null;
        const d = unit.data;
        if (d.species && d.species !== 'human') return null; // Modular generator applies to humans

        const seed = worldSeed || (window.UF && UF.World && UF.World.state ? UF.World.state.seed : 0);
        const gender = d.gender === 'female' ? 'female' : 'male';
        const stage = d.stage || (d.age >= 55 ? 'elder' : (d.age < 15 ? 'child' : 'adult'));

        // Ensure 5-locus genetics
        if (!d.genetics) {
            const v = d.variation || 1;
            const hairColors = ['brown', 'blonde', 'black', 'red'];
            d.genetics = {
                skinTone: ((v % 3) + 1),
                hairStyle: 1 + ((Math.abs(unit.id | 0) + 1) % 4),
                hairColor: hairColors[(Math.abs(unit.id | 0)) % 4],
                beard: gender === 'male' ? ((Math.abs(unit.id | 0)) % 4) : 0,
                clothing: 1 + ((Math.abs(unit.id | 0)) % 4)
            };
        }

        const spec = UF.Generator.specFor(seed, unit.id, gender, stage, d.genetics, d.tier, unit);

        // Assign synchronized charset and portrait
        unit.image = unit.image || {};
        unit.image.characterName = spec.charsetName;
        unit.image.characterIndex = 0;

        d.face = {
            sheet: spec.faceName,
            index: 0
        };

        // If map event is active, refresh sprite
        if (window.UF && UF.World && typeof UF.World.eventOf === 'function') {
            const ev = UF.World.eventOf(unit.id);
            if (ev) {
                ev.setImage(spec.charsetName, 0);
            }
        }

        return spec;
    };

    /**
     * Paperdolling hook: change unit outfit and re-composite / update sprite and portrait.
     */
    UF.Generator.setOutfit = function(unit, outfitId) {
        if (!unit || !unit.data) return;
        unit.data.genetics = unit.data.genetics || {};
        unit.data.genetics.clothing = Math.max(1, Math.min(4, outfitId | 0 || 1));
        return UF.Generator.applyToUnit(unit);
    };

    /**
     * Synchronizes unit portrait and charset with currently equipped armor.
     */
    UF.Generator.syncEquipmentToPortrait = function(unit) {
        if (!unit || !unit.data) return;
        const cIdx = UF.Generator.clothingIndexForUnit(unit);
        if (unit.data.genetics) unit.data.genetics.clothing = cIdx;
        return UF.Generator.applyToUnit(unit);
    };

    // -------------------------------------------------------------------------
    // ImageManager Hooks for seamless loading of $gen_* and face_gen_*
    // -------------------------------------------------------------------------
    const _ImageManager_loadCharacter = ImageManager.loadCharacter;
    ImageManager.loadCharacter = function(filename) {
        if (!filename) return _ImageManager_loadCharacter.call(this, filename);
        // Normalize gen/ prefix if present or absent
        if (filename.startsWith('$gen_')) {
            const base = _ImageManager_loadCharacter.call(this, filename);
            if (base && !base.isError()) return base;
            return _ImageManager_loadCharacter.call(this, 'gen/' + filename);
        } else if (filename.startsWith('gen/$gen_')) {
            const base = _ImageManager_loadCharacter.call(this, filename);
            if (base && !base.isError()) return base;
            return _ImageManager_loadCharacter.call(this, filename.replace('gen/', ''));
        }
        return _ImageManager_loadCharacter.call(this, filename);
    };

    const _ImageManager_loadFace = ImageManager.loadFace;
    ImageManager.loadFace = function(filename) {
        if (!filename) return _ImageManager_loadFace.call(this, filename);
        if (filename.startsWith('face_gen_')) {
            const base = _ImageManager_loadFace.call(this, filename);
            if (base && !base.isError()) return base;
            return _ImageManager_loadFace.call(this, 'gen/' + filename);
        } else if (filename.startsWith('gen/face_gen_')) {
            const base = _ImageManager_loadFace.call(this, filename);
            if (base && !base.isError()) return base;
            return _ImageManager_loadFace.call(this, filename.replace('gen/', ''));
        }
        return _ImageManager_loadFace.call(this, filename);
    };

})();

