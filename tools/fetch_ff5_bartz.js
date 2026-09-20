const http = require('http');
const fs = require('fs');

http.get('http://www.videogamesprites.net/FinalFantasy5/Party/Freelancer/Bartz.html', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const regex = /src=["']([^"']+\.gif|[^"']+\.png)["']/gi;
        let match;
        const imgs = [];
        while ((match = regex.exec(data)) !== null) {
            imgs.push(match[1]);
        }
        console.log('Images found:', imgs);
        if (imgs.length > 0) {
            const firstImg = imgs.find(img => img.includes('Walk') || img.includes('Map') || img.includes('Bartz')) || imgs[0];
            const fullUrl = firstImg.startsWith('http') ? firstImg : 'http://www.videogamesprites.net/FinalFantasy5/Party/Freelancer/' + firstImg;
            console.log('Downloading:', fullUrl);
            http.get(fullUrl, imgRes => {
                const chunks = [];
                imgRes.on('data', c => chunks.push(c));
                imgRes.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    fs.writeFileSync('game/test_output/ff5_bartz_sample.gif', buf);
                    console.log('Saved ff5_bartz_sample.gif, length:', buf.length);
                });
            });
        }
    });
});
