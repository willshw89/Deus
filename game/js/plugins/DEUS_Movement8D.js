//=============================================================================
// RPG Maker MZ - Ultima Fortress: 8-Directional Grid Movement Engine
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Movement8D] 8-directional movement, Octile A* pathfinding, strict corner collision, and diagonal navigation.
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
 * @default false
 * @desc true = units, the view and pathfinding move in 4 directions only (the 2026-09-18 rule). false = 8 directions (VISION V3, 2026-09-19).
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
 * FourWay (default false since 2026-09-19, VISION V3: 8-way movement and
 * 8-way facing). With false, units step diagonally when both orthogonal
 * neighbours of the step are open (StrictCornerCutting: never across a
 * blocked corner). With true (the 2026-09-18 rule): no diagonal steps
 * anywhere, pathfinding uses the 4 orthogonal neighbours and diagonal
 * requests become a straight step. UF_World, UF_Jobs and UF_Anim read
 * UF_Dir8.fourWay.
 *
 * Facing: every character keeps an 8-way facing (dir8(): 1-9 on the numpad)
 * next to RPG Maker's 4-way direction(). A diagonal facing shows as its
 * horizontal part in direction() (SW, NW -> 4; SE, NE -> 6), so 4-row stock
 * sheets show the nearest side view; 8-row sheets read dir8() (UF_Anim).
 * setDirection(2/4/6/8) sets both; setDir8(d) and faceToward8(dx, dy) turn
 * in 8 directions. API: docs/systems/UF_Movement8D.md
 */

(() => {
    "use strict";

    const pluginName = "DEUS_Movement8D";
    const params = PluginManager.parameters(pluginName);
    const normalizeSpeed = (params["NormalizeSpeed"] || "true") === "true";
    const strictCornerCutting = (params["StrictCornerCutting"] || "true") === "true";
    const diagonalSlide = (params["DiagonalSlide"] || "true") === "true";
    const fourWay = (params["FourWay"] || "false") === "true";

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

        /** The 4-way direction that shows a facing on a 4-row sheet: a diagonal shows its horizontal part. */
        project4(d) {
            return d === 1 || d === 7 ? 4 : d === 3 || d === 9 ? 6 : d === 2 || d === 4 || d === 6 || d === 8 ? d : 2;
        },

        /**
         * The facing toward an offset (dx, dy): one of 8 by the octant of the angle (22.5 degrees either side of each
         * direction; a cell diagonally next to the unit is a diagonal). With FourWay, the longer axis (ties horizontal).
         * 0 for (0, 0).
         */
        toward(dx, dy) {
            if (!dx && !dy) return 0;
            const ax = Math.abs(dx), ay = Math.abs(dy);
            const h = dx > 0 ? 6 : 4, v = dy > 0 ? 2 : 8;
            if (fourWay) return ax >= ay ? h : v;
            if (ay * 2.414213562 < ax) return h;
            if (ax * 2.414213562 < ay) return v;
            return UF_Dir8.combine(h, v);
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

    // A 4-way turn (RPG Maker's setDirection: events, move routes, UF plugins) is the 8-way facing too. A diagonal
    // number passed here (1, 3, 7, 9) would break RPG Maker's sprite row, so it turns through setDir8 instead.
    const _Game_CharacterBase_setDirection = Game_CharacterBase.prototype.setDirection;
    Game_CharacterBase.prototype.setDirection = function(d) {
        if (UF_Dir8.isDiagonal(d)) {
            this.setDir8(d);
            return;
        }
        _Game_CharacterBase_setDirection.call(this, d);
        if (d && !this.isDirectionFixed()) this._dir8 = d;
    };

    /** Face one of 8 directions (numpad 1-9): dir8() is d, direction() its 4-way part (a diagonal shows its horizontal side). */
    Game_CharacterBase.prototype.setDir8 = function(d) {
        if (!(d >= 1 && d <= 9) || d === 5 || this.isDirectionFixed()) return;
        _Game_CharacterBase_setDirection.call(this, UF_Dir8.project4(d));
        this._dir8 = d;
    };

    /** Turn toward an offset (dx, dy) in 8 directions (4 with FourWay); nothing for (0, 0). Returns the facing. */
    Game_CharacterBase.prototype.faceToward8 = function(dx, dy) {
        const d = UF_Dir8.toward(dx, dy);
        if (d) this.setDir8(d);
        return d;
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

    // Geometric wall and doorway detection helpers for 8D movement
    function isWallTile(x, y) {
        if (!$gameMap || !$gameMap.isValid(x, y)) return true;
        const O = window.UF && UF.Objects;
        if (O && O.blocks && O.blocks(x, y)) {
            const D = window.UF && UF.Doors;
            if (D && D.isDoorType && D.isDoorType(O.at(x, y))) {
                const area = $gameMap.areaX ? { x: $gameMap.areaX(), y: $gameMap.areaY(), z: 0 } : null;
                const dObj = area && D.at ? D.at(area, x, y) : null;
                if (!dObj || !dObj.state || !dObj.state.locked) return false;
            }
            return true;
        }
        if (!$gameMap.isPassable(x, y, 2) && !$gameMap.isPassable(x, y, 4) &&
            !$gameMap.isPassable(x, y, 6) && !$gameMap.isPassable(x, y, 8)) {
            return true;
        }
        if (typeof Tilemap !== "undefined" && Tilemap.isWaterTile && $gameMap.tileId && Tilemap.isWaterTile($gameMap.tileId(x, y, 0))) {
            const R = window.UF && UF.Roads;
            if (!(R && R.bridgeAt && R.bridgeAt(x, y))) return true;
        }
        return false;
    }

    function hasOppositeWallsAt(x, y) {
        if (!$gameMap || !$gameMap.isValid(x, y)) return false;
        const north = isWallTile(x, $gameMap.roundY(y - 1));
        const south = isWallTile(x, $gameMap.roundY(y + 1));
        const west = isWallTile($gameMap.roundX(x - 1), y);
        const east = isWallTile($gameMap.roundX(x + 1), y);
        return (north && south) || (west && east);
    }

    function wallCountAt(x, y) {
        if (!$gameMap || !$gameMap.isValid(x, y)) return 0;
        let count = 0;
        if (isWallTile(x, $gameMap.roundY(y - 1))) count++;
        if (isWallTile(x, $gameMap.roundY(y + 1))) count++;
        if (isWallTile($gameMap.roundX(x - 1), y)) count++;
        if (isWallTile($gameMap.roundX(x + 1), y)) count++;
        return count;
    }

    function isDoorwayTile(x, y) {
        if (!$gameMap || !$gameMap.isValid(x, y)) return false;
        const O = window.UF && UF.Objects;
        const D = window.UF && UF.Doors;
        if (O && D && D.isDoorType && D.isDoorType(O.at(x, y))) return true;
        return hasOppositeWallsAt(x, y);
    }

    if (window.UF_Dir8) {
        window.UF_Dir8.isWallTile = isWallTile;
        window.UF_Dir8.hasOppositeWallsAt = hasOppositeWallsAt;
        window.UF_Dir8.wallCountAt = wallCountAt;
        window.UF_Dir8.isDoorwayTile = isDoorwayTile;
    }

    // Strict Corner-Cutting Passability & Doorway/Wall-Adjacent Navigation
    Game_CharacterBase.prototype.canPassDiagonally = function(x, y, horz, vert) {
        if (fourWay) return false;
        if (this.isThrough() || this.isDebugThrough()) return true;

        const x2 = $gameMap.roundXWithDirection(x, horz);
        const y2 = $gameMap.roundYWithDirection(y, vert);

        // Destination must be valid, walkable (not a wall/obstacle), and free of character collisions
        if (!$gameMap.isValid(x2, y2)) return false;
        if (isWallTile(x2, y2)) return false;
        if (this.isCollidedWithCharacters(x2, y2)) return false;

        const wallH = isWallTile(x2, y);
        const wallV = isWallTile(x, y2);

        // Pinch point: moving diagonally between two touching diagonal walls is strictly prohibited
        if (wallH && wallV) {
            return false;
        }

        // Open terrain / room (neither intermediate tile is a wall)
        if (!wallH && !wallV) {
            const charH = this.isCollidedWithCharacters(x2, y);
            const charV = this.isCollidedWithCharacters(x, y2);
            // If at least one flanking tile has no character, diagonal path is clear
            if (!charH || !charV) {
                return true;
            }
            // Both intermediate tiles have characters: permitted if unit has a wall on one side or opposite walls
            const startWalls = wallCountAt(x, y);
            const targetWalls = wallCountAt(x2, y2);
            if (startWalls > 0 || targetWalls > 0) {
                return true;
            }
            return false;
        }

        // Exactly one intermediate tile is a wall (wallH ^ wallV):
        // Permitted ONLY if entering or exiting a doorway or corridor with opposite walls.
        // Prohibited when cutting around an obstacle, tree, or building corner.
        const startOpp = hasOppositeWallsAt(x, y) || isDoorwayTile(x, y);
        const targetOpp = hasOppositeWallsAt(x2, y2) || isDoorwayTile(x2, y2);

        if (startOpp || targetOpp) {
            return true;
        }

        // Neither start nor target has opposite walls: this is cutting around an obstacle/wall corner (prohibited)
        return false;
    };

    // Enhanced moveDiagonally with flag tracking and dir8
    const _Game_CharacterBase_moveDiagonally = Game_CharacterBase.prototype.moveDiagonally;
    // A diagonal step faces its diagonal (dir8) and shows its horizontal side on 4-row sheets (direction()), whatever
    // the unit faced before (RPG Maker keeps the old facing unless it was opposite).
    Game_CharacterBase.prototype.moveDiagonally = function(horz, vert) {
        _Game_CharacterBase_moveDiagonally.call(this, horz, vert);
        if (this.isMovementSucceeded()) {
            this._isDiagonalMoving = true;
            this.setDir8(UF_Dir8.combine(horz, vert));
        }
    };

    // Enhanced moveStraight with dir8 update
    const _Game_CharacterBase_moveStraight = Game_CharacterBase.prototype.moveStraight;
    Game_CharacterBase.prototype.moveStraight = function(d) {
        _Game_CharacterBase_moveStraight.call(this, d);
        if (this.isMovementSucceeded()) {
            this._isDiagonalMoving = false;
            if (!this.isDirectionFixed()) this._dir8 = d;
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

    console.log(`[UF] UF_Movement8D: ${fourWay ? "4-way (FourWay on)" : "8-way"} grid movement, octile A*, strict corners ${strictCornerCutting}.`);
})();

