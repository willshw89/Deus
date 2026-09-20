const http = require('http');
const fs = require('fs');

http.get('http://www.videogamesprites.net/FinalFantasy6/Party/Locke/', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const regex = /src=['"]([^'"]+\.gif|[^'"]+\.png)['"]/gi;
        let match;
        const list = [];
        while ((match = regex.exec(data)) !== null) {
            list.push(match[1]);
        }
        console.log('Found images:', list.slice(0, 10));
        if (list.length > 0) {
            const first = list.find(x => x.includes('Front') || x.includes('Walk') || x.includes('Stand')) || list[0];
            const url = 'http://www.videogamesprites.net/FinalFantasy6/Party/Locke/' + first;
            http.get(url, r => {
                const chunks = [];
                r.on('data', c => chunks.push(c));
                r.on('end', () => {
                    fs.writeFileSync('reference/locke_sample.gif', Buffer.concat(chunks));
                    console.log('Saved reference/locke_sample.gif from', url);
                });
            });
        }
    });
});

