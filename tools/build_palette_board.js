#!/usr/bin/env node
'use strict';

/**
 * tools/build_palette_board.js
 *
 * Deterministic Palette Reference Board Generator for Project DEUS (DW.01.05).
 * Renders the authoritative Technical World Palette & Material Ramps Board:
 * `art/reference/DEUS_PALETTE_BOARD_V1.png`.
 *
 * Visualizes:
 * - 254 Master Colors across 58 Material Ramps
 * - Shared Neutrals & Dwarf-Fortress Black Wall-Cap baseline
 * - Temperate, Wetland, Arid, Highland, Volcanic material ramps
 * - Water & Fluid ramps
 * - Construction / Shared materials
 * - Reserved Supernatural / VFX spectrum
 * - Exact hexadecimal codes and tone roles
 *
 * Generated deterministically via code. Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { loadRegistry } = require('./palette_resolver');

const OUTPUT_PATH = path.resolve(__dirname, '..', 'art', 'reference', 'DEUS_PALETTE_BOARD_V1.png');

// Canvas dimensions
const W = 1480;
const H = 1440;

// RGBA Buffer allocation
const buf = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
}

function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            setPixel(x + dx, y + dy, r, g, b, a);
        }
    }
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

// 3x5 Pixel Font for crisp 1:1 labels
const FONT_3X5 = {
    'A': [0b010, 0b101, 0b111, 0b101, 0b101],
    'B': [0b110, 0b101, 0b110, 0b101, 0b110],
    'C': [0b011, 0b100, 0b100, 0b100, 0b011],
    'D': [0b110, 0b101, 0b101, 0b101, 0b110],
    'E': [0b111, 0b100, 0b110, 0b100, 0b111],
    'F': [0b111, 0b100, 0b110, 0b100, 0b100],
    'G': [0b011, 0b100, 0b101, 0b101, 0b011],
    'H': [0b101, 0b101, 0b111, 0b101, 0b101],
    'I': [0b111, 0b010, 0b010, 0b010, 0b111],
    'J': [0b001, 0b001, 0b001, 0b101, 0b010],
    'K': [0b101, 0b110, 0b100, 0b110, 0b101],
    'L': [0b100, 0b100, 0b100, 0b100, 0b111],
    'M': [0b101, 0b111, 0b101, 0b101, 0b101],
    'N': [0b110, 0b101, 0b101, 0b101, 0b101],
    'O': [0b010, 0b101, 0b101, 0b101, 0b010],
    'P': [0b110, 0b101, 0b110, 0b100, 0b100],
    'Q': [0b010, 0b101, 0b101, 0b110, 0b011],
    'R': [0b110, 0b101, 0b110, 0b101, 0b101],
    'S': [0b011, 0b100, 0b010, 0b001, 0b110],
    'T': [0b111, 0b010, 0b010, 0b010, 0b010],
    'U': [0b101, 0b101, 0b101, 0b101, 0b010],
    'V': [0b101, 0b101, 0b101, 0b101, 0b010],
    'W': [0b101, 0b101, 0b101, 0b111, 0b101],
    'X': [0b101, 0b101, 0b010, 0b101, 0b101],
    'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
    'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
    '0': [0b010, 0b101, 0b101, 0b101, 0b010],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b110, 0b001, 0b010, 0b100, 0b111],
    '3': [0b110, 0b001, 0b010, 0b001, 0b110],
    '4': [0b101, 0b101, 0b111, 0b001, 0b001],
    '5': [0b111, 0b100, 0b110, 0b001, 0b110],
    '6': [0b011, 0b100, 0b110, 0b101, 0b010],
    '7': [0b111, 0b001, 0b010, 0b010, 0b010],
    '8': [0b010, 0b101, 0b010, 0b101, 0b010],
    '9': [0b010, 0b101, 0b011, 0b001, 0b110],
    ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
    ':': [0b000, 0b010, 0b000, 0b010, 0b000],
    '-': [0b000, 0b000, 0b111, 0b000, 0b000],
    '_': [0b000, 0b000, 0b000, 0b000, 0b111],
    '#': [0b101, 0b111, 0b101, 0b111, 0b101],
    '/': [0b001, 0b001, 0b010, 0b100, 0b100],
    '[': [0b011, 0b010, 0b010, 0b010, 0b011],
    ']': [0b110, 0b010, 0b010, 0b010, 0b110],
    '(': [0b010, 0b100, 0b100, 0b100, 0b010],
    ')': [0b010, 0b001, 0b001, 0b001, 0b010],
    '.': [0b000, 0b000, 0b000, 0b000, 0b010]
};

function drawChar(char, x, y, r, g, b, a = 255) {
    const glyph = FONT_3X5[char.toUpperCase()] || FONT_3X5[' '];
    for (let row = 0; row < 5; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 3; col++) {
            if ((bits >> (2 - col)) & 1) {
                setPixel(x + col, y + row, r, g, b, a);
            }
        }
    }
}

function drawText(str, x, y, r, g, b, a = 255) {
    let curX = x;
    for (let i = 0; i < str.length; i++) {
        drawChar(str[i], curX, y, r, g, b, a);
        curX += 4;
    }
}

function drawRampEntry(ramp, x, y) {
    // Draw Ramp Label
    drawText(ramp.rampId, x, y, 220, 225, 230);
    drawText(`[${ramp.materialFamily}]`, x + 240, y, 140, 150, 160);

    // Draw Swatches
    const swatchW = 44;
    const swatchH = 16;
    const startX = x + 340;
    const swatchY = y - 4;

    for (let i = 0; i < ramp.colorCount; i++) {
        const hex = ramp.hexColors[i];
        const rgb = hexToRgb(hex);
        const sx = startX + i * (swatchW + 4);

        // Fill swatch
        fillRect(sx, swatchY, swatchW, swatchH, rgb.r, rgb.g, rgb.b);

        // Subtle 1px border
        for (let bx = 0; bx < swatchW; bx++) {
            setPixel(sx + bx, swatchY, 10, 12, 16, 180);
            setPixel(sx + bx, swatchY + swatchH - 1, 10, 12, 16, 180);
        }
        for (let by = 0; by < swatchH; by++) {
            setPixel(sx, swatchY + by, 10, 12, 16, 180);
            setPixel(sx + swatchW - 1, swatchY + by, 10, 12, 16, 180);
        }

        // Draw hex underneath
        drawText(hex.replace('#', ''), sx + 4, swatchY + swatchH + 2, 150, 155, 160);
    }
}

function drawSectionHeader(title, x, y, width = 680) {
    fillRect(x, y, width, 18, 22, 26, 32);
    drawText(title, x + 8, y + 6, 255, 215, 110);
    // Underline
    for (let bx = 0; bx < width; bx++) {
        setPixel(x + bx, y + 17, 60, 70, 85);
    }
}

function main() {
    const reg = loadRegistry();

    // Dark technical background (#0E1014)
    fillRect(0, 0, W, H, 14, 16, 20);

    // Main Title Header
    fillRect(0, 0, W, 48, 18, 22, 28);
    drawText("PROJECT DEUS -- CANONICAL WORLD PALETTE & MATERIAL RAMPS V1", 30, 14, 255, 255, 255);
    drawText(`DW.01.05 | ${reg.masterColorCount} Active Colors | ${reg.reservedCapacity} Reserved Slots (<=240 V1 Target) | 58 Ramps | Native 1:1 Reference`, 30, 28, 160, 175, 190);

    // Subtle header border
    for (let x = 0; x < W; x++) {
        setPixel(x, 47, 45, 55, 70);
    }

    // Column coordinates
    const COL1_X = 30;
    const COL2_X = 760;

    // LEFT COLUMN SECTIONS
    let curY1 = 65;

    // 1. Shared Neutrals
    drawSectionHeader("1. SHARED NEUTRALS & VOID ANCHORS (Universal)", COL1_X, curY1);
    curY1 += 26;
    const neutRamps = ['NEUT_VOID_BLACK', 'NEUT_COOL_GRAY', 'NEUT_WARM_GRAY', 'NEUT_PALE_CREST'];
    for (const id of neutRamps) {
        drawRampEntry(reg.ramps[id], COL1_X + 10, curY1);
        curY1 += 34;
    }
    curY1 += 10;

    // 2. Temperate Biome
    drawSectionHeader("2. TEMPERATE / VERDANT MATERIAL RAMPS (TEMP)", COL1_X, curY1);
    curY1 += 26;
    const tempRamps = [
        'TEMP_GRASS_FERTILE', 'TEMP_GRASS_DRY', 'TEMP_SOIL_LOAM',
        'TEMP_WOODLAND_FLOOR', 'TEMP_BARK_OAK', 'TEMP_BARK_BIRCH',
        'TEMP_FOLIAGE_OAK', 'TEMP_STONE_FIELDSTONE', 'TEMP_STONE_LIMESTONE'
    ];
    for (const id of tempRamps) {
        drawRampEntry(reg.ramps[id], COL1_X + 10, curY1);
        curY1 += 34;
    }
    curY1 += 10;

    // 3. Wetland Biome
    drawSectionHeader("3. WETLAND / RIVERLAND MATERIAL RAMPS (WET)", COL1_X, curY1);
    curY1 += 26;
    const wetRamps = [
        'WET_GRASS_SATURATED', 'WET_REED_RUSH', 'WET_SOIL_PEAT',
        'WET_MUD_ANAEROBIC', 'WET_SILT_RIVER', 'WET_STONE_DAMP_SLATE',
        'WET_WOOD_DRIFTWOOD', 'WET_FOLIAGE_WILLOW'
    ];
    for (const id of wetRamps) {
        drawRampEntry(reg.ramps[id], COL1_X + 10, curY1);
        curY1 += 34;
    }
    curY1 += 10;

    // 4. Water & Fluid
    drawSectionHeader("4. WATER & FLUID SYSTEM (Universal / Regional)", COL1_X, curY1);
    curY1 += 26;
    const waterRamps = [
        'WATER_SHALLOW_CLEAR', 'WATER_DEEP_FRESH',
        'WATER_MURKY_WETLAND', 'WATER_FOAM_RAPIDS'
    ];
    for (const id of waterRamps) {
        drawRampEntry(reg.ramps[id], COL1_X + 10, curY1);
        curY1 += 34;
    }

    // RIGHT COLUMN SECTIONS
    let curY2 = 65;

    // 5. Arid Biome
    drawSectionHeader("5. ARID / STEPPE / DESERT MATERIAL RAMPS (ARID)", COL2_X, curY2);
    curY2 += 26;
    const aridRamps = [
        'ARID_GRASS_BUNCHGRASS', 'ARID_SOIL_HARDPAN', 'ARID_SOIL_CLAY',
        'ARID_SAND_COARSE', 'ARID_STONE_SANDSTONE', 'ARID_SCRUB_THORN',
        'ARID_WOOD_BLEACHED', 'ARID_BONE_CALICHE'
    ];
    for (const id of aridRamps) {
        drawRampEntry(reg.ramps[id], COL2_X + 10, curY2);
        curY2 += 34;
    }
    curY2 += 10;

    // 6. Highland Biome
    drawSectionHeader("6. HIGHLAND / MOUNTAIN MATERIAL RAMPS (HIGH -- NO SNOW)", COL2_X, curY2);
    curY2 += 26;
    const highRamps = [
        'HIGH_GRASS_ALPINE', 'HIGH_SOIL_STONY_LOAM', 'HIGH_GRAVEL_SCREE',
        'HIGH_STONE_GRANITE', 'HIGH_STONE_SLATE', 'HIGH_FOLIAGE_CONIFER',
        'HIGH_BARK_CONIFER'
    ];
    for (const id of highRamps) {
        drawRampEntry(reg.ramps[id], COL2_X + 10, curY2);
        curY2 += 34;
    }
    curY2 += 10;

    // 7. Volcanic Biome
    drawSectionHeader("7. VOLCANIC / ASHLAND MATERIAL RAMPS (VOLC -- LAVA ACCENT ONLY)", COL2_X, curY2);
    curY2 += 26;
    const volcRamps = [
        'VOLC_ASH_DRIFT', 'VOLC_SOIL_SCORCHED', 'VOLC_STONE_BASALT',
        'VOLC_STONE_SCORIA', 'VOLC_STONE_PUMICE', 'VOLC_STONE_OBSIDIAN',
        'VOLC_MINERAL_SULFUR', 'VOLC_WOOD_CHARRED', 'VOLC_LAVA_HAZARD'
    ];
    for (const id of volcRamps) {
        drawRampEntry(reg.ramps[id], COL2_X + 10, curY2);
        curY2 += 34;
    }
    curY2 += 10;

    // 8. Construction & Shared
    drawSectionHeader("8. CONSTRUCTION & SHARED MATERIALS", COL2_X, curY2);
    curY2 += 26;
    const constructRamps = [
        'CONSTRUCT_TIMBER_FRESH', 'CONSTRUCT_TIMBER_AGED',
        'CONSTRUCT_STONE_DRESSED', 'CONSTRUCT_METAL_IRON',
        'CONSTRUCT_FABRIC_LEATHER'
    ];
    for (const id of constructRamps) {
        drawRampEntry(reg.ramps[id], COL2_X + 10, curY2);
        curY2 += 34;
    }
    curY2 += 10;

    // 9. Supernatural / VFX
    drawSectionHeader("9. RESERVED SUPERNATURAL & VFX SPECTRUM (Special / Spells)", COL2_X, curY2);
    curY2 += 26;
    const magicRamps = [
        'MAGIC_DIVINE_GOLD', 'MAGIC_ARCANE_CYAN',
        'MAGIC_ASTRAL_VIOLET', 'MAGIC_HEALING_EMERALD'
    ];
    for (const id of magicRamps) {
        drawRampEntry(reg.ramps[id], COL2_X + 10, curY2);
        curY2 += 34;
    }

    // Save PNG
    writePNG(OUTPUT_PATH, W, H, buf);
    console.log(`=== DEUS PALETTE REFERENCE BOARD GENERATED ===`);
    console.log(`File: ${OUTPUT_PATH}`);
    console.log(`Dimensions: ${W}x${H} px (Native 1:1 RGBA)`);
}

main();
