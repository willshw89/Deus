//=============================================================================
// RPG Maker MZ - Ultima Fortress: 8-Directional Grid Movement Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Movement8D] True 8-directional grid movement, octile A* pathfinding, and corner-cutting collision control.
 * @author Deepdelve Architect
 *
 * @param NormalizeSpeed
 * @text Normalize Diagonal Speed
 * @type boolean
 * @default true
 * @desc Maintain uniform screen velocity during diagonal movement (scaled by 1/sqrt(2)).
 *
 * @param StrictCornerCutting
 * @text Strict Corner-Cutting Check
 * @type boolean
 * @default true
 * @desc Prevent moving diagonally through pinched corners where either orthogonal tile is impassable.
 *
 * @param FourWay
 * @text 4-way movement
 * @type boolean
 * @default true
 * @desc Units, the view and pathfinding move in 4 directions only (user decision 2026-09-18). false = 8 directions.
 *
 * @param DiagonalSlide
 * @text Smart Diagonal Slide
 * @type boolean
 * @default true
 * @desc Slide along passable cardinal direction if full diagonal move is blocked.
 *
 * @help
 * ============================================================================
 * Ultima Fortress 8-Directional Movement Engine (UF_Movement8D)
 * ============================================================================
 * Features:
 * - Full 8-directional grid movement for player, colonists, and NPCs
 * - Input handling: Numpad (1-9), Arrow Key combinations, Analog Gamepad stick
 * - True Octile A* Pathfinding for mouse/touch clicks and autonomous AI
 * - Strict corner-cutting collision prevention
 * - Velocity normalization (1/sqrt(2)) for identical screen speed
 * - Zero modification to vanilla RMMZ core files
 *
 * FourWay (default true, VISION V3 as revised 2026-09-18): no diagonal steps
 * anywhere. Pathfinding uses the 4 orthogonal neighbors, diagonal requests
 * become a straight step, and the view moves with the arrow keys in 4
 * directions. UF_World and UF_Jobs read UF_Dir8.fourWay.
 */

(() => {
    "use strict";

    const pluginName = "UF_Movement8D";
    const params = PluginManager.parameters(pluginName);
    const normalizeSpeed = (params["NormalizeSpeed"] || "true") === "true";
    const strictCornerCutting = (params["StrictCornerCutting"] || "true") === "true";
    const diagonalSlide = (params["DiagonalSlide"] || "true") === "true";
    const fourWay = (params["FourWay"] || "true") === "true";

    const SQRT2_INV = 1.0 / Math.SQRT2; // ~0.70710678

    //-----------------------------------------------------------------------------
    // Helper: Direction Conversions
    //-----------------------------------------------------------------------------
    const UF_Dir8 = {
        fourWay,
        SW: 1, S: 2, SE: 3,
        W:  4, C: 5, E:  6,
        NW: 7, N: 8, NE: 9,

        isDiagonal(d) {
            return d === 1 || d === 3 || d === 7 || d === 9;
        },

        isCardinal(d) {
            return d === 2 || d === 4 || d === 6 || d === 8;
        },

        splitDiagonal(d) {
            switch (d) {
                case 1: return { horz: 4, vert: 2 }; // SW
                case 3: return { horz: 6, vert: 2 }; // SE
                case 7: return { horz: 4, vert: 8 }; // NW
                case 9: return { horz: 6, vert: 8 }; // NE
                default: return null;
            }
        },

        combine(horz, vert) {
            if (horz === 4 && vert === 2) return 1;
            if (horz === 6 && vert === 2) return 3;
            if (horz === 4 && vert === 8) return 7;
            if (horz === 6 && vert === 8) return 9;
            return horz || vert || 0;
        },

        delta(d) {
            switch (d) {
                case 1: return { x: -1, y:  1 };
                case 2: return { x:  0, y:  1 };
                case 3: return { x:  1, y:  1 };
                case 4: return { x: -1, y:  0 };
                case 6: return { x:  1, y:  0 };
                case 7: return { x: -1, y: -1 };
                case 8: return { x:  0, y: -1 };
                case 9: return { x:  1, y: -1 };
                default: return { x: 0, y: 0 };
            }
        }
    };

    window.UF_Dir8 = UF_Dir8;

    //-----------------------------------------------------------------------------
    // Game_CharacterBase Extensions
    //-----------------------------------------------------------------------------
    const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        _Game_CharacterBase_initMembers.call(this);
        this._isDiagonalMoving = false;
        this._dir8 = 2;
    };

    Game_CharacterBase.prototype.dir8 = function() {
        return this._dir8 || this._direction;
    };

    Game_CharacterBase.prototype.setDir8 = function(d) {
        this._dir8 = d;
        const split = UF_Dir8.splitDiagonal(d);
        if (split) {
            // For 4-dir sprite representation, face horizontal for clear profile in 3/4 perspective
            this.setDirection(split.horz);
        } else if (UF_Dir8.isCardinal(d)) {
            this.setDirection(d);
        }
    };

    // Velocity normalization during diagonal movement
    const _Game_CharacterBase_distancePerFrame = Game_CharacterBase.prototype.distancePerFrame;
    Game_CharacterBase.prototype.distancePerFrame = function() {
        const dist = _Game_CharacterBase_distancePerFrame.call(this);
        if (normalizeSpeed && this._isDiagonalMoving) {
            return dist * SQRT2_INV;
        }
        return dist;
    };

    // Update diagonal moving state on position catch-up
    const _Game_CharacterBase_updateMove = Game_CharacterBase.prototype.updateMove;
    Game_CharacterBase.prototype.updateMove = function() {
        _Game_CharacterBase_updateMove.call(this);
        if (!this.isMoving()) {
            this._isDiagonalMoving = false;
        }
    };

    // Strict Corner-Cutting Passability
    Game_CharacterBase.prototype.canPassDiagonally = function(x, y, horz, vert) {
        if (fourWay) return false;
        const x2 = $gameMap.roundXWithDirection(x, horz);
        const y2 = $gameMap.roundYWithDirection(y, vert);

        // Destination must be passable from both directions and have no normal priority events
        if (!this.canPass(x, y2, horz) && !this.canPass(x2, y, vert)) {
            return false;
        }

        if (strictCornerCutting) {
            // Both flanking orthogonal tiles must be passable to avoid clipping diagonal corners
            const canHorz = this.canPass(x, y, horz);
            const canVert = this.canPass(x, y, vert);
            if (!canHorz || !canVert) {
                return false;
            }
        } else {
            // Standard check: at least one path around corner must be open
            if (!this.canPass(x, y, vert) && !this.canPass(x, y, horz)) {
                return false;
            }
        }

        // Target tile collision check
        if (this.isCollidedWithCharacters(x2, y2)) {
            return false;
        }

        return true;
    };

    // Enhanced moveDiagonally with flag tracking and dir8
    const _Game_CharacterBase_moveDiagonally = Game_CharacterBase.prototype.moveDiagonally;
    Game_CharacterBase.prototype.moveDiagonally = function(horz, vert) {
        const successBefore = this.canPassDiagonally(this._x, this._y, horz, vert);
        _Game_CharacterBase_moveDiagonally.call(this, horz, vert);
        if (this.isMovementSucceeded()) {
            this._isDiagonalMoving = true;
            this._dir8 = UF_Dir8.combine(horz, vert);
        }
    };

    // Enhanced moveStraight with dir8 update
    const _Game_CharacterBase_moveStraight = Game_CharacterBase.prototype.moveStraight;
    Game_CharacterBase.prototype.moveStraight = function(d) {
        _Game_CharacterBase_moveStraight.call(this, d);
        if (this.isMovementSucceeded()) {
            this._isDiagonalMoving = false;
            this._dir8 = d;
        }
    };

    // 8-Directional Move by Direction Code (1-9)
    Game_CharacterBase.prototype.moveInDirection8D = function(d) {
        if (fourWay && UF_Dir8.isDiagonal(d)) {
            // 4-way: take the horizontal part if it's open, otherwise the vertical part.
            const split = UF_Dir8.splitDiagonal(d);
            this.moveStraight(this.canPass(this._x, this._y, split.horz) ? split.horz : split.vert);
            return;
        }
        if (UF_Dir8.isDiagonal(d)) {
            const split = UF_Dir8.splitDiagonal(d);
            this.moveDiagonally(split.horz, split.vert);
            if (!this.isMovementSucceeded() && diagonalSlide) {
                // Try sliding cardinally along the open axis
                if (this.canPass(this._x, this._y, split.horz)) {
                    this.moveStraight(split.horz);
                } else if (this.canPass(this._x, this._y, split.vert)) {
                    this.moveStraight(split.vert);
                }
            }
        } else if (UF_Dir8.isCardinal(d)) {
            this.moveStraight(d);
        }
    };

    //-----------------------------------------------------------------------------
    // Game_Player 8-Directional Input & Execution
    //-----------------------------------------------------------------------------
    Game_Player.prototype.getInputDirection = function() {
        return fourWay ? Input.dir4 : Input.dir8;
    };

    Game_Player.prototype.executeMove = function(direction) {
        this.moveInDirection8D(direction);
    };

    const NEIGHBORS_8 = [
        { d: 1, horz: 4, vert: 2, cost: 14 },
        { d: 2, horz: 0, vert: 2, cost: 10 },
        { d: 3, horz: 6, vert: 2, cost: 14 },
        { d: 4, horz: 4, vert: 0, cost: 10 },
        { d: 6, horz: 6, vert: 0, cost: 10 },
        { d: 7, horz: 4, vert: 8, cost: 14 },
        { d: 8, horz: 0, vert: 8, cost: 10 },
        { d: 9, horz: 6, vert: 8, cost: 14 }
    ];
    const NEIGHBORS_4 = NEIGHBORS_8.filter(n => !UF_Dir8.isDiagonal(n.d));

    // Enhanced findDirectionTo with 8-Directional Octile A* Pathfinding (4 neighbors when FourWay)
    Game_Character.prototype.findDirection8DTo = function(goalX, goalY) {
        const startX = this.x;
        const startY = this.y;

        if (startX === goalX && startY === goalY) return 0;

        // Fast direct line test if distance is 1 tile
        const dx = $gameMap.deltaX(goalX, startX);
        const dy = $gameMap.deltaY(goalY, startY);
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !(fourWay && dx !== 0 && dy !== 0)) {
            const directDir = UF_Dir8.combine(dx < 0 ? 4 : dx > 0 ? 6 : 0, dy < 0 ? 8 : dy > 0 ? 2 : 0);
            if (UF_Dir8.isDiagonal(directDir)) {
                const split = UF_Dir8.splitDiagonal(directDir);
                if (this.canPassDiagonally(startX, startY, split.horz, split.vert)) return directDir;
            } else if (UF_Dir8.isCardinal(directDir)) {
                if (this.canPass(startX, startY, directDir)) return directDir;
            }
        }

        // Octile A* Search over a localized 24x24 grid window
        const mapW = $gameMap.width();
        const mapH = $gameMap.height();
        const openList = [];
        const closedSet = new Set();
        const nodeMap = new Map();

        const encode = (x, y) => (y * mapW + x);
        const octileDist = (x1, y1, x2, y2) => {
            const adx = Math.abs($gameMap.deltaX(x2, x1));
            const ady = Math.abs($gameMap.deltaY(y2, y1));
            return fourWay ? 10 * (adx + ady) : 10 * (adx + ady) + (14 - 20) * Math.min(adx, ady);
        };

        const startNode = {
            x: startX,
            y: startY,
            g: 0,
            h: octileDist(startX, startY, goalX, goalY),
            f: octileDist(startX, startY, goalX, goalY),
            firstDir: 0,
            parent: null
        };

        openList.push(startNode);
        nodeMap.set(encode(startX, startY), startNode);

        const neighbors = (fourWay ? NEIGHBORS_4 : NEIGHBORS_8);

        let bestNode = startNode;
        let bestH = startNode.h;
        let iterations = 0;
        const maxIterations = 200; // Fast cutoff for 60 FPS performance

        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            // Pop node with lowest f
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift();
            const currKey = encode(current.x, current.y);
            closedSet.add(currKey);

            if (current.x === goalX && current.y === goalY) {
                return current.firstDir;
            }

            if (current.h < bestH) {
                bestH = current.h;
                bestNode = current;
            }

            for (const nb of neighbors) {
                const nx = $gameMap.roundXWithDirection(current.x, nb.horz || nb.vert);
                const ny = nb.vert && nb.horz ? $gameMap.roundYWithDirection(current.y, nb.vert) : (nb.vert ? $gameMap.roundYWithDirection(current.y, nb.vert) : current.y);
                const nKey = encode(nx, ny);

                if (closedSet.has(nKey)) continue;

                // Passability check
                let passable = false;
                if (UF_Dir8.isDiagonal(nb.d)) {
                    passable = this.canPassDiagonally(current.x, current.y, nb.horz, nb.vert);
                } else {
                    passable = this.canPass(current.x, current.y, nb.d);
                }

                if (!passable && !(nx === goalX && ny === goalY)) continue;

                const tentativeG = current.g + nb.cost;
                let neighborNode = nodeMap.get(nKey);

                if (!neighborNode || tentativeG < neighborNode.g) {
                    const h = octileDist(nx, ny, goalX, goalY);
                    const firstDir = (current === startNode) ? nb.d : current.firstDir;

                    if (!neighborNode) {
                        neighborNode = {
                            x: nx,
                            y: ny,
                            g: tentativeG,
                            h: h,
                            f: tentativeG + h,
                            firstDir: firstDir,
                            parent: current
                        };
                        nodeMap.set(nKey, neighborNode);
                        openList.push(neighborNode);
                    } else {
                        neighborNode.g = tentativeG;
                        neighborNode.f = tentativeG + h;
                        neighborNode.firstDir = firstDir;
                        neighborNode.parent = current;
                    }
                }
            }
        }

        return bestNode.firstDir || 0;
    };

    // Override findDirectionTo on Player and Characters to use 8D
    const _Game_Character_findDirectionTo = Game_Character.prototype.findDirectionTo;
    Game_Character.prototype.findDirectionTo = function(goalX, goalY) {
        const dir8 = this.findDirection8DTo(goalX, goalY);
        return dir8 > 0 ? dir8 : _Game_Character_findDirectionTo.call(this, goalX, goalY);
    };

    //-----------------------------------------------------------------------------
    // Followers 8-Directional Tracking
    //-----------------------------------------------------------------------------
    Game_Follower.prototype.chaseCharacter = function(character) {
        const sx = this.deltaXFrom(character.x);
        const sy = this.deltaYFrom(character.y);

        if (Math.abs(sx) >= 1 && Math.abs(sy) >= 1) {
            const horz = sx > 0 ? 4 : 6;
            const vert = sy > 0 ? 8 : 2;
            this.moveDiagonally(horz, vert);
        } else if (sx !== 0) {
            this.moveStraight(sx > 0 ? 4 : 6);
        } else if (sy !== 0) {
            this.moveStraight(sy > 0 ? 8 : 2);
        }
        this.setMoveSpeed($gamePlayer.realMoveSpeed());
    };

    console.log("[UF] UF_Movement8D initialized: 8-directional grid movement, octile A*, velocity normalization active.");
})();

