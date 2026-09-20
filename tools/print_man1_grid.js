const { readPNG } = require('./read_png');
const p = readPNG('game/test_output/ff5_Man1-Front_native.png');

for (let y = 0; y < p.height; y++) {
    let row = '';
    for (let x = 0; x < p.width; x++) {
        const idx = (y * p.width + x) * 4;
        const r = p.rgba[idx], g = p.rgba[idx+1], b = p.rgba[idx+2], a = p.rgba[idx+3];
        if (a === 0) row += '.';
        else {
            const hex = '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
            if (hex === '#282828') row += 'O'; // outline
            else if (hex === '#f8f8f8') row += 'W'; // white
            else if (hex === '#f8c8a0') row += 'S'; // skin light
            else if (hex === '#f8a078') row += 's'; // skin dark
            else if (hex === '#7070f8') row += 'H'; // hair light
            else if (hex === '#1838d8') row += 'h'; // hair dark
            else if (hex === '#f85000') row += 'C'; // collar/vest
            else if (hex === '#00a000') row += 'T'; // tunic dark
            else if (hex === '#88c038') row += 't'; // tunic light
            else if (hex === '#a05800') row += 'B'; // belt dark
            else if (hex === '#c08800') row += 'b'; // belt light
            else if (hex === '#f878f8') row += 'L'; // boots light
            else row += '?';
        }
    }
    console.log(`${y.toString().padStart(2, ' ')}: "${row}"`);
}
