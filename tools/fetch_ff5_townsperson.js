const http = require('http');
const fs = require('fs');

http.get('http://www.videogamesprites.net/FinalFantasy5/NPCs/Townsfolk/Men.html', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const regex = /src=['"]([^'"]+\.gif|[^'"]+\.png)['"]/gi;
        let match;
        const imgs = [];
        while ((match = regex.exec(data)) !== null) {
            imgs.push(match[1]);
        }
        console.log('Men images:', imgs);
        const targets = ['Man1-Front.gif', 'Man2-Front.gif', 'Man3-Front.gif', 'Merchant-Front.gif'];
        targets.forEach(name => {
            const url = 'http://www.videogamesprites.net/FinalFantasy5/NPCs/Townsfolk/' + name;
            http.get(url, imgRes => {
                const chunks = [];
                imgRes.on('data', c => chunks.push(c));
                imgRes.on('end', () => {
                    const filename = `game/test_output/ff5_${name}`;
                    fs.writeFileSync(filename, Buffer.concat(chunks));
                    console.log('Saved', filename);
                });
            });
        });
    });
});
