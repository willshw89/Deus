#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');

function buildPairShowcase() {
    const malePath = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Male.png');
    const femPath  = path.join(ROOT, 'game', 'img', 'characters', '$UF_Human_Female.png');
    const meadowPath = path.join(ROOT, 'art', 'masters', 'meadow.png');

    const mc = decodePNG(fs.readFileSync(malePath));
    const fc = decodePNG(fs.readFileSync(femPath));
    let meadowTile = null;
    if (fs.existsSync(meadowPath)) {
        const m = decodePNG(fs.readFileSync(meadowPath));
        meadowTile = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = (y * m.width + x) * 4;
                const didx = (y * 48 + x) * 4;
                meadowTile[didx] = m.data[sidx];
                meadowTile[didx + 1] = m.data[sidx + 1];
                meadowTile[didx + 2] = m.data[sidx + 2];
                meadowTile[didx + 3] = 255;
            }
        }
    }

    const getCell = (sheet, r, c) => {
        const buf = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const sidx = ((r * 48 + y) * sheet.width + (c * 48 + x)) * 4;
                const didx = (y * 48 + x) * 4;
                buf[didx] = sheet.data[sidx];
                buf[didx + 1] = sheet.data[sidx + 1];
                buf[didx + 2] = sheet.data[sidx + 2];
                buf[didx + 3] = sheet.data[sidx + 3];
            }
        }
        return buf;
    };

    const maleFrames = [
        getCell(mc, 0, 1), getCell(mc, 1, 1), getCell(mc, 2, 1), getCell(mc, 3, 1)
    ];
    const femFrames = [
        getCell(fc, 0, 1), getCell(fc, 1, 1), getCell(fc, 2, 1), getCell(fc, 3, 1)
    ];

    const showW = 1536;
    const showH = 640;
    const showBuf = Buffer.alloc(showW * showH * 4);

    for (let i = 0; i < showBuf.length; i += 4) {
        showBuf[i] = 0x14; showBuf[i + 1] = 0x17; showBuf[i + 2] = 0x20; showBuf[i + 3] = 255;
    }

    for (let c = 0; c < 8; c++) {
        const fBuf = c < 4 ? maleFrames[c] : femFrames[c - 4];
        const cardX = c * 192;

        // Row 1: Checkerboard
        for (let y = 0; y < 192; y++) {
            for (let x = 0; x < 192; x++) {
                const o = ((60 + y) * showW + (cardX + x)) * 4;
                const cb = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) ? 0x24 : 0x1c;
                showBuf[o] = cb; showBuf[o + 1] = cb; showBuf[o + 2] = cb; showBuf[o + 3] = 255;
            }
        }

        // Draw sprite at 4x on checkerboard
        if (fBuf) {
            for (let y = 0; y < 48; y++) {
                for (let x = 0; x < 48; x++) {
                    const sidx = (y * 48 + x) * 4;
                    if (fBuf[sidx + 3] === 255) {
                        for (let dy = 0; dy < 4; dy++) {
                            for (let dx = 0; dx < 4; dx++) {
                                const didx = ((60 + y * 4 + dy) * showW + (cardX + x * 4 + dx)) * 4;
                                showBuf[didx] = fBuf[sidx];
                                showBuf[didx + 1] = fBuf[sidx + 1];
                                showBuf[didx + 2] = fBuf[sidx + 2];
                                showBuf[didx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }

        // Registration line on checkerboard (row 47)
        for (let x = 0; x < 192; x++) {
            const o = ((60 + 188) * showW + (cardX + x)) * 4;
            showBuf[o] = 0xff; showBuf[o + 1] = 0x33; showBuf[o + 2] = 0x33; showBuf[o + 3] = 180;
        }

        // Row 2: Meadow Grass
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                let mr = 77, mg = 93, mb = 40;
                if (meadowTile) {
                    const to = (y * 48 + x) * 4;
                    mr = meadowTile[to]; mg = meadowTile[to + 1]; mb = meadowTile[to + 2];
                }
                const sidx = fBuf ? (y * 48 + x) * 4 : 0;
                const r = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx] : mr;
                const g = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx + 1] : mg;
                const b = (fBuf && fBuf[sidx + 3] === 255) ? fBuf[sidx + 2] : mb;

                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 4; dx++) {
                        const didx = ((300 + y * 4 + dy) * showW + (cardX + x * 4 + dx)) * 4;
                        showBuf[didx] = r; showBuf[didx + 1] = g; showBuf[didx + 2] = b; showBuf[didx + 3] = 255;
                    }
                }
            }
        }
    }

    const reviewPath = path.join(ROOT, 'art', 'review', 'human_settlers_pair_showcase_4x.png');
    writePNG(reviewPath, showW, showH, showBuf);
    console.log(`Saved updated pair showcase: ${reviewPath}`);
}

buildPairShowcase();
