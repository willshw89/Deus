const fs = require('fs');

global.window = global;
global.document = {
    createElement: () => ({
        getContext: () => ({
            createImageData: (w, h) => ({ data: new Uint8Array(w * h * 4) }),
            putImageData: () => {},
            drawImage: () => {}
        })
    })
};
global.Bitmap = function(w, h) {
    this.width = w; this.height = h;
    this.context = document.createElement().getContext();
    this._baseTexture = { update: () => {} };
};
global.Tilemap = {
    TILE_ID_A1: 2048,
    TILE_ID_A2: 2816,
    TILE_ID_A3: 4352,
    TILE_ID_A4: 5888,
    TILE_ID_A5: 1536,
    isTileA1: id => id >= 2048 && id < 2816,
    isTileA2: id => id >= 2816 && id < 4352
};
global.PluginManager = { parameters: () => ({}) };
global.Graphics = { boxWidth: 816, boxHeight: 624 };
global.ImageManager = { loadTileset: () => {} };
global.DataManager = { onLoad: () => {} };
global['$ufWorldCatalog'] = JSON.parse(fs.readFileSync('game/data/UF_WorldCatalog.json', 'utf8'));

require('../game/js/plugins/UF_Tiles.js');

const bmp = UF.Tiles.initShadeAtlas();
console.log('Shade atlas initialized, keys in shadeKeyMap:', UF.Tiles.shadeStats());
