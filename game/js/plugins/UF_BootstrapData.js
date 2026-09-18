// Pre-populate container contents
(() => {
    window.$ufContainers = window.$ufContainers || {};
    window.$ufContainers["smith_chest"] = {
        type: "chest",
        items: [
            { id: 2, amount: 2 }, // Steel Broadsword
            { id: 1, amount: 1 }, // Dwarven Battleaxe
            { id: 3, amount: 5 }  // Hematite Chunk
        ]
    };
    window.$ufContainers["tavern_keg"] = {
        type: "barrel",
        items: [
            { id: 1, amount: 12 }, // Sunshine Stout
            { id: 2, amount: 4 }   // Plump Helmet Roast
        ]
    };
    window.$ufContainers["dorm_chest"] = {
        type: "chest",
        items: [
            { id: 1, amount: 2 }, // Sunshine Stout
            { id: 2, amount: 1 }  // Plump Helmet Roast
        ]
    };
    window.$ufContainers["noble_chest"] = {
        type: "chest",
        items: [
            { id: 4, amount: 3 }, // Adamantine Thread
            { id: 2, amount: 1 }  // Steel Broadsword
        ]
    };
    window.$ufContainers["mine_bin"] = {
        type: "sack",
        items: [
            { id: 3, amount: 10 } // Hematite Chunk
        ]
    };
})();
