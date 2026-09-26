'use strict';

/**
 * tools/generate_nano_banana_pro.js
 *
 * Dedicated generator utility calling Google Nano Banana Pro (gemini-3-pro-image)
 * with support for text prompts and multi-modal image reference conditioning.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// The API key comes from the environment only. There is no hard-coded fallback
// (OPS.70.02 security finding, 2026-09-26; see docs/telemetry/security_incidents.json).
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3-pro-image';

function requireApiKey() {
    if (!API_KEY || !String(API_KEY).trim()) {
        console.error('ERROR: GEMINI_API_KEY is not set. Export it in your shell environment before running this tool (never commit a key; see docs/SECURITY_AND_SECRETS.md).');
        process.exit(1);
    }
    return API_KEY;
}

function generateWithNanoBananaPro({ prompt, outputPath, referenceImagePaths = [] }) {
    requireApiKey();
    return new Promise((resolve, reject) => {
        const parts = [];

        // Attach reference images if provided
        for (const refPath of referenceImagePaths) {
            if (fs.existsSync(refPath)) {
                const buf = fs.readFileSync(refPath);
                const ext = path.extname(refPath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: buf.toString('base64')
                    }
                });
                console.log(`Attached reference image: ${refPath} (${mimeType}, ${buf.length} bytes)`);
            } else {
                console.warn(`Reference image not found: ${refPath}`);
            }
        }

        // Attach prompt
        parts.push({ text: prompt });

        const payload = JSON.stringify({
            contents: [{ parts }],
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
        const u = new URL(url);

        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`API Error ${res.statusCode}: ${body}`));
                }

                try {
                    const data = JSON.parse(body);
                    const candidate = data.candidates && data.candidates[0];
                    if (!candidate || !candidate.content || !candidate.content.parts) {
                        return reject(new Error(`Invalid API response structure: ${body}`));
                    }

                    // Find image part
                    let imageBuffer = null;
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.data) {
                            imageBuffer = Buffer.from(part.inlineData.data, 'base64');
                            break;
                        }
                    }

                    if (!imageBuffer) {
                        // Sometimes the model returns text
                        const textParts = candidate.content.parts.map(p => p.text).filter(Boolean).join('\n');
                        return reject(new Error(`No image part returned in response. Text: ${textParts}`));
                    }

                    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                    if (outputPath.toLowerCase().endsWith('.png')) {
                        const jpgPath = outputPath.replace(/\.png$/i, '.jpg');
                        fs.writeFileSync(jpgPath, imageBuffer);
                        const { convertJpgToPng } = require('./jpg_to_png');
                        convertJpgToPng(jpgPath, outputPath);
                    } else {
                        fs.writeFileSync(outputPath, imageBuffer);
                    }
                    console.log(`Successfully generated and saved: ${outputPath} (${imageBuffer.length} bytes)`);
                    resolve(outputPath);
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${err.message}\n${body}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node tools/generate_nano_banana_pro.js <output_path> "<prompt>" [reference_image_path]');
        process.exit(1);
    }
    const outputPath = path.resolve(args[0]);
    const prompt = args[1];
    const refPaths = args.slice(2).map(p => path.resolve(p));

    generateWithNanoBananaPro({ prompt, outputPath, referenceImagePaths: refPaths })
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { generateWithNanoBananaPro };

