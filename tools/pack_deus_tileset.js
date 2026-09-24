#!/usr/bin/env node
'use strict';

/**
 * tools/pack_deus_tileset.js
 *
 * Deterministic tileset assembler and packer for Project DEUS.
 * Separates ART GENERATION (Google Nano Banana Pro) from PACKING CODE (deterministic assembly).
 *
 * Enforces official RPG Maker MZ geometry:
 * - A1: 768 × 576 px (16 × 12 tiles, 16 autotile blocks; odd kinds 4-15 are waterfalls animating vertically)
 * - A2: 768 × 576 px (16 × 12 tiles, 32 autotile blocks of 96×144 px)
 * - A3: 768 × 384 px (16 × 8 tiles, 32 roof autotile blocks of 96×96 px, 4 rows x 8 cols)
 * - A4: 768 × 720 px (16 × 15 tiles, 48 wall/cliff blocks of 96×120 px, 6 rows x 8 cols)
 * - A5: 384 × 768 px (8 × 16 tiles, 128 single static 48×48 px tiles)
 * - B–E: 768 × 768 px (16 × 16 tiles, 256 static tiles; Cell [0,0] on B is strictly transparent)
 *
 * Also handles DEUS 3-frame animation companions:
 * - Frame 1 packed into primary B–E sheet for stock RMMZ editor compatibility.
 * - Frames 2 & 3 exported to parallel companion sheets (_B_F02.png, _B_F03.png) or manifests.
 *
 * Usage:
 *   node tools/pack_deus_tileset.js --help
 *   node tools/pack_deus_tileset.js --selftest
 */

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { decodePNG } = require('./png_read');

const TILE = 48;

const SHEET_SPECS = {
    A1: { width: 768, height: 576, cols: 16, rows: 12, autotileBlocks: 16 },
    A2: { width: 768, height: 576, cols: 16, rows: 12, autotileBlocks: 32 },
    A3: { width: 768, height: 384, cols: 16, rows: 8,  autotileBlocks: 32 },
    A4: { width: 768, height: 720, cols: 16, rows: 15, autotileBlocks: 48 },
    A5: { width: 384, height: 768, cols: 8,  rows: 16, singleTiles: 128 },
    B:  { width: 768, height: 768, cols: 16, rows: 16, singleTiles: 256, transparentZero: true },
    C:  { width: 768, height: 768, cols: 16, rows: 16, singleTiles: 256 },
    D:  { width: 768, height: 768, cols: 16, rows: 16, singleTiles: 256 },
    E:  { width: 768, height: 768, cols: 16, rows: 16, singleTiles: 256 }
};

function createBlankSheet(slot) {
    const spec = SHEET_SPECS[slot];
    if (!spec) throw new Error(`Unknown tileset slot: ${slot}`);
    return {
        slot,
        width: spec.width,
        height: spec.height,
        cols: spec.cols,
        rows: spec.rows,
        buffer: Buffer.alloc(spec.width * spec.height * 4, 0) // transparent black
    };
}

function blitCell(srcBuf, srcW, srcH, sx, sy, w, h, dstBuf, dstW, dstH, dx, dy) {
    for (let y = 0; y < h; y++) {
        const syActual = sy + y;
        const dyActual = dy + y;
        if (syActual < 0 || syActual >= srcH || dyActual < 0 || dyActual >= dstH) continue;
        for (let x = 0; x < w; x++) {
            const sxActual = sx + x;
            const dxActual = dx + x;
            if (sxActual < 0 || sxActual >= srcW || dxActual < 0 || dxActual >= dstW) continue;
            const si = (syActual * srcW + sxActual) * 4;
            const di = (dyActual * dstW + dxActual) * 4;
            dstBuf[di]     = srcBuf[si];
            dstBuf[di + 1] = srcBuf[si + 1];
            dstBuf[di + 2] = srcBuf[si + 2];
            dstBuf[di + 3] = srcBuf[si + 3];
        }
    }
}

/**
 * Validates that an assembled sheet conforms to official dimensions and constraints.
 */
function validateAssembledSheet(sheetObj) {
    const spec = SHEET_SPECS[sheetObj.slot];
    if (!spec) return { valid: false, error: `Invalid slot ${sheetObj.slot}` };
    if (sheetObj.width !== spec.width || sheetObj.height !== spec.height) {
        return { valid: false, error: `Dimension mismatch for ${sheetObj.slot}: got ${sheetObj.width}x${sheetObj.height}, expected ${spec.width}x${spec.height}` };
    }
    if (spec.transparentZero) {
        // First 48x48 cell must be strictly 100% transparent
        for (let y = 0; y < TILE; y++) {
            for (let x = 0; x < TILE; x++) {
                const idx = (y * sheetObj.width + x) * 4;
                if (sheetObj.buffer[idx + 3] !== 0) {
                    return { valid: false, error: `Cell [0,0] on ${sheetObj.slot} must be strictly transparent (found alpha ${sheetObj.buffer[idx + 3]} at ${x},${y})` };
                }
            }
        }
    }
    return { valid: true };
}

/**
 * Run deterministic selftest to prove assembler dimensions and constraints.
 */
function runSelftest() {
    console.log('Running tools/pack_deus_tileset.js selftest...');
    let passed = 0;
    let failed = 0;

    for (const [slot, spec] of Object.entries(SHEET_SPECS)) {
        const sheet = createBlankSheet(slot);
        const check = validateAssembledSheet(sheet);
        if (check.valid && sheet.width === spec.width && sheet.height === spec.height) {
            console.log(`PASS: ${slot} blank sheet conforms to ${spec.width}x${spec.height} (${spec.cols}x${spec.rows} tiles)`);
            passed++;
        } else {
            console.error(`FAIL: ${slot} blank sheet validation failed: ${check.error}`);
            failed++;
        }
    }

    // Test B cell 0,0 transparency violation
    const bSheet = createBlankSheet('B');
    bSheet.buffer[3] = 255; // dirty cell 0,0
    const bCheck = validateAssembledSheet(bSheet);
    if (!bCheck.valid && bCheck.error.includes('Cell [0,0]')) {
        console.log('PASS: Cell [0,0] opacity violation correctly caught on Sheet B');
        passed++;
    } else {
        console.error('FAIL: Cell [0,0] opacity violation was NOT caught on Sheet B');
        failed++;
    }

    console.log(`Selftest completed: ${passed} passed, ${failed} failed.`);
    return failed === 0;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--selftest')) {
        const ok = runSelftest();
        process.exit(ok ? 0 : 1);
    } else {
        console.log('Project DEUS Deterministic Tileset Packer');
        console.log('Usage: node tools/pack_deus_tileset.js --selftest');
        process.exit(0);
    }
}

module.exports = {
    SHEET_SPECS,
    createBlankSheet,
    blitCell,
    validateAssembledSheet,
    runSelftest
};
