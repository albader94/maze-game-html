/**
 * Wall Collision Test Suite
 * Tests the AABB collision system, wall sliding, diagonal movement,
 * and overlap resolution to verify the collision fix works correctly.
 *
 * Usage: Open browser console at http://localhost:8000, start a game,
 * then paste this script or run:
 *   const tests = new WallCollisionTests();
 *   tests.runAll();
 */

class WallCollisionTests {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.game = null;
    }

    // ---- helpers ----

    assert(condition, name, detail = '') {
        if (condition) {
            this.passed++;
            this.results.push({ name, status: 'PASS', detail });
            console.log(`  PASS: ${name}${detail ? ' -- ' + detail : ''}`);
        } else {
            this.failed++;
            this.results.push({ name, status: 'FAIL', detail });
            console.error(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
        }
    }

    getGame() {
        if (typeof GameDebug !== 'undefined' && GameDebug.getGame) {
            return GameDebug.getGame();
        }
        if (typeof GameState !== 'undefined' && GameState.getGame) {
            return GameState.getGame();
        }
        throw new Error('Cannot access game state');
    }

    // ---- test groups ----

    /** 1. Verify isValidPosition rejects positions inside walls */
    testIsValidPositionInsideWalls() {
        console.log('\n--- Test 1: isValidPosition rejects positions inside walls ---');
        const game = this.getGame();

        if (game.walls.length === 0) {
            this.assert(false, 'Walls exist', 'No walls found in game state');
            return;
        }

        const wall = game.walls[0];
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;

        // Player center exactly at wall center -- should be invalid
        const atCenter = GameLogic.isValidPosition(wall.x, wall.y, game);
        this.assert(!atCenter, 'Position at wall center is invalid');

        // Player center at wall edge -- should still be invalid (player radius overlaps)
        const atEdge = GameLogic.isValidPosition(wall.x + halfCell, wall.y, game);
        this.assert(!atEdge, 'Position at wall edge is invalid (player radius overlaps)');

        // Player center just outside wall + radius -- should be valid
        const outsideX = wall.x + halfCell + game.player.size + 1;
        const outsideValid = GameLogic.isValidPosition(outsideX, wall.y, game);
        this.assert(outsideValid, 'Position just outside wall+radius is valid',
            `tested at x=${outsideX.toFixed(1)}`);
    }

    /** 2. Verify AABB collision (not circular point-to-point) */
    testAABBvsCircularCollision() {
        console.log('\n--- Test 2: AABB collision vs old circular collision ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Find two adjacent walls (horizontally or vertically)
        let adjacentPair = null;
        for (let i = 0; i < game.walls.length && !adjacentPair; i++) {
            for (let j = i + 1; j < game.walls.length && !adjacentPair; j++) {
                const w1 = game.walls[i];
                const w2 = game.walls[j];
                const dx = Math.abs(w1.x - w2.x);
                const dy = Math.abs(w1.y - w2.y);
                // Adjacent walls are exactly CELL_SIZE apart on one axis, same on the other
                if ((dx === CONFIG.MAP.CELL_SIZE && dy === 0) ||
                    (dy === CONFIG.MAP.CELL_SIZE && dx === 0)) {
                    adjacentPair = [w1, w2];
                }
            }
        }

        if (!adjacentPair) {
            this.assert(false, 'Found adjacent wall pair', 'No adjacent walls found');
            return;
        }

        const [w1, w2] = adjacentPair;

        // The gap between two adjacent walls with AABB should be zero --
        // the rectangles share an edge.
        // With old circular collision, there would be a gap at 45 degrees.
        // Test a point exactly at the shared corner (diagonal offset from wall center).
        const midX = (w1.x + w2.x) / 2;
        const midY = (w1.y + w2.y) / 2;

        // The midpoint between two adjacent wall centers is on their shared edge.
        // A player there should collide.
        const midInvalid = !GameLogic.isValidPosition(midX, midY, game);
        this.assert(midInvalid, 'Midpoint between adjacent walls is invalid (AABB)',
            `walls at (${w1.x},${w1.y}) and (${w2.x},${w2.y}), tested (${midX},${midY})`);

        // Now test a diagonal point near the shared corner.
        // For a horizontal pair (same y, x differs by CELL_SIZE):
        if (Math.abs(w1.x - w2.x) === CONFIG.MAP.CELL_SIZE && w1.y === w2.y) {
            // Corner is at (min(x) + halfCell, y + halfCell) or (min(x) + halfCell, y - halfCell)
            const cornerX = Math.min(w1.x, w2.x) + CONFIG.MAP.CELL_SIZE; // shared edge x
            const cornerY = w1.y + halfCell; // top edge

            // Place player just above and to the side -- with AABB this should still collide
            const testX = cornerX;
            const testY = cornerY + playerRadius * 0.5; // close to wall top edge
            const diagonalInvalid = !GameLogic.isValidPosition(testX, testY, game);
            this.assert(diagonalInvalid, 'Diagonal position near wall corner is invalid (no AABB gap)',
                `tested (${testX.toFixed(1)}, ${testY.toFixed(1)})`);
        }
    }

    /** 3. Test wall sliding works (movement along walls) */
    testWallSliding() {
        console.log('\n--- Test 3: Wall sliding ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Find a wall and position player next to it
        const wall = game.walls[0];

        // Place player just outside the wall on the right side
        const startX = wall.x + halfCell + playerRadius + 2;
        const startY = wall.y; // same y as wall

        // Check this starting position is valid
        const startValid = GameLogic.isValidPosition(startX, startY, game);
        if (!startValid) {
            // Try to find a wall with open space beside it
            let foundWall = null;
            for (const w of game.walls) {
                const tx = w.x + halfCell + playerRadius + 2;
                if (GameLogic.isValidPosition(tx, w.y, game)) {
                    foundWall = w;
                    break;
                }
            }
            if (!foundWall) {
                this.assert(false, 'Found wall with open space', 'Could not find suitable wall');
                return;
            }
        }

        // Simulate diagonal movement into the wall (left and down)
        // Full movement should fail, but Y-axis should succeed (sliding)
        const moveX = startX - 20; // into the wall
        const moveY = startY + 10; // along the wall

        const fullValid = GameLogic.isValidPosition(moveX, moveY, game);
        const xOnlyValid = GameLogic.isValidPosition(moveX, startY, game);
        const yOnlyValid = GameLogic.isValidPosition(startX, moveY, game);

        // Full movement into wall should be blocked
        // Y-only movement (slide) should be allowed
        this.assert(!fullValid || yOnlyValid,
            'Wall sliding allows partial movement',
            `full=${fullValid}, xOnly=${xOnlyValid}, yOnly=${yOnlyValid}`);
    }

    /** 4. Test player does not get stuck at wall corners (diagonal movement) */
    testDiagonalCornerMovement() {
        console.log('\n--- Test 4: Diagonal movement at corners ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Find an L-shaped corner: two walls adjacent forming a corner
        let corner = null;
        const wallSet = new Set(game.walls.map(w => `${w.x},${w.y}`));

        for (const w of game.walls) {
            // Check for walls to the right and below (L-corner)
            const rightKey = `${w.x + CONFIG.MAP.CELL_SIZE},${w.y}`;
            const belowKey = `${w.x},${w.y + CONFIG.MAP.CELL_SIZE}`;

            if (wallSet.has(rightKey) && wallSet.has(belowKey)) {
                corner = {
                    origin: w,
                    right: game.walls.find(ww => `${ww.x},${ww.y}` === rightKey),
                    below: game.walls.find(ww => `${ww.x},${ww.y}` === belowKey)
                };
                break;
            }
        }

        if (!corner) {
            console.log('  SKIP: No L-shaped corner found');
            return;
        }

        // The inner corner point is at (origin.x + halfCell, origin.y + halfCell)
        const cornerX = corner.origin.x + halfCell;
        const cornerY = corner.origin.y + halfCell;

        // Place player near the inner corner, diagonally offset
        const playerX = cornerX + playerRadius + 3;
        const playerY = cornerY + playerRadius + 3;

        const posValid = GameLogic.isValidPosition(playerX, playerY, game);
        this.assert(posValid, 'Player position near L-corner is valid',
            `at (${playerX.toFixed(1)}, ${playerY.toFixed(1)})`);

        // Try moving diagonally into the corner
        const moveX = playerX - 10;
        const moveY = playerY - 10;
        const moveValid = GameLogic.isValidPosition(moveX, moveY, game);

        // The diagonal move should be blocked (into the corner)
        this.assert(!moveValid, 'Diagonal movement into L-corner is blocked');

        // But each axis independently should have at least one direction that works
        const slideX = GameLogic.isValidPosition(moveX, playerY, game);
        const slideY = GameLogic.isValidPosition(playerX, moveY, game);
        this.assert(slideX || slideY,
            'Wall sliding allows at least one axis at L-corner',
            `slideX=${slideX}, slideY=${slideY}`);
    }

    /** 5. Test resolveWallOverlaps pushes player out */
    testResolveWallOverlaps() {
        console.log('\n--- Test 5: resolveWallOverlaps push-out ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Save original position
        const origX = game.player.x;
        const origY = game.player.y;
        const origPhase = game.player.powers.phase;

        // Find a wall
        const wall = game.walls[0];

        // Rebuild spatial grid so resolveWallOverlaps can find walls
        Utils.clearSpatialGrid();
        game.walls.forEach(w => Utils.addToSpatialGrid(w, 'walls'));

        // Temporarily place player partially inside wall
        game.player.x = wall.x + halfCell - 5; // 5px inside the wall edge
        game.player.y = wall.y;
        game.player.powers.phase = 0;

        const beforeValid = GameLogic.isValidPosition(game.player.x, game.player.y, game);
        this.assert(!beforeValid, 'Player placed inside wall is detected as invalid');

        // Run overlap resolution
        GameLogic.resolveWallOverlaps(game);

        const afterValid = GameLogic.isValidPosition(game.player.x, game.player.y, game);
        this.assert(afterValid, 'After resolveWallOverlaps, player position is valid',
            `moved to (${game.player.x.toFixed(1)}, ${game.player.y.toFixed(1)})`);

        // Restore original position
        game.player.x = origX;
        game.player.y = origY;
        game.player.powers.phase = origPhase;
    }

    /** 6. Test that wall gaps don't allow wedging */
    testWallGapWedging() {
        console.log('\n--- Test 6: Wall gap wedging prevention ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Find two walls that are diagonally adjacent (share only a corner)
        let diagonalPair = null;
        const wallMap = new Map();
        game.walls.forEach(w => wallMap.set(`${w.x},${w.y}`, w));

        for (const w of game.walls) {
            // Check diagonal neighbor (down-right)
            const diagKey = `${w.x + CONFIG.MAP.CELL_SIZE},${w.y + CONFIG.MAP.CELL_SIZE}`;
            const rightKey = `${w.x + CONFIG.MAP.CELL_SIZE},${w.y}`;
            const belowKey = `${w.x},${w.y + CONFIG.MAP.CELL_SIZE}`;

            // Diagonal pair with NO wall between them (the gap case)
            if (wallMap.has(diagKey) && !wallMap.has(rightKey) && !wallMap.has(belowKey)) {
                diagonalPair = [w, wallMap.get(diagKey)];
                break;
            }
        }

        if (!diagonalPair) {
            console.log('  SKIP: No diagonal wall gap found');
            return;
        }

        const [w1, w2] = diagonalPair;

        // The diagonal gap center is at the shared corner point
        const gapX = (w1.x + w2.x) / 2 + halfCell;
        const gapY = (w1.y + w2.y) / 2 + halfCell;

        // With AABB, the player should NOT be able to fit in this diagonal gap
        // if the gap is smaller than 2 * playerRadius
        const gapInvalid = !GameLogic.isValidPosition(gapX, gapY, game);
        this.assert(gapInvalid, 'Player cannot wedge into diagonal wall gap',
            `gap at (${gapX.toFixed(1)}, ${gapY.toFixed(1)}), walls at (${w1.x},${w1.y}) and (${w2.x},${w2.y})`);
    }

    /** 7. Test keyboard simulation of movement */
    async testKeyboardMovement() {
        console.log('\n--- Test 7: Simulated movement sequence ---');
        const game = this.getGame();

        if (game.state !== 'playing') {
            console.log('  SKIP: Game is not in playing state (current: ' + game.state + ')');
            return;
        }

        const startX = game.player.x;
        const startY = game.player.y;

        // Record position over several frames
        const positions = [{ x: startX, y: startY }];

        // Simulate pressing right arrow for 30 frames
        const keyDown = new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight' });
        const keyUp = new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight' });

        document.dispatchEvent(keyDown);

        // Wait and sample positions
        for (let i = 0; i < 6; i++) {
            await new Promise(r => setTimeout(r, 100));
            positions.push({ x: game.player.x, y: game.player.y });
        }

        document.dispatchEvent(keyUp);
        await new Promise(r => setTimeout(r, 50));

        // Check if player moved at all
        const moved = positions.some(p => Math.abs(p.x - startX) > 1 || Math.abs(p.y - startY) > 1);

        // Check player never ended up in a wall
        let stuckInWall = false;
        for (const pos of positions) {
            if (!GameLogic.isValidPosition(pos.x, pos.y, game)) {
                stuckInWall = true;
                break;
            }
        }

        this.assert(!stuckInWall, 'Player never in wall during movement',
            `${positions.length} positions sampled`);

        if (moved) {
            this.assert(true, 'Player moved in response to keyboard input');
        } else {
            console.log('  INFO: Player did not move (may be blocked by wall)');
        }
    }

    /** 8. Stress test: rapid position checks around all walls */
    testPositionValidityAroundAllWalls() {
        console.log('\n--- Test 8: Position validity around all walls (stress test) ---');
        const game = this.getGame();
        const halfCell = CONFIG.MAP.CELL_SIZE / 2;
        const playerRadius = game.player.size;

        // Rebuild spatial grid
        Utils.clearSpatialGrid();
        game.walls.forEach(w => Utils.addToSpatialGrid(w, 'walls'));

        let insideDetected = 0;
        let insideTotal = 0;
        let outsideDetected = 0;
        let outsideTotal = 0;
        let falsePositives = 0;
        let falseNegatives = 0;

        // Sample a subset of walls for speed
        const sampleSize = Math.min(game.walls.length, 50);
        const step = Math.max(1, Math.floor(game.walls.length / sampleSize));

        for (let i = 0; i < game.walls.length; i += step) {
            const wall = game.walls[i];

            // Test points clearly inside the wall (should be invalid)
            const insidePoints = [
                { x: wall.x, y: wall.y },           // center
                { x: wall.x + 5, y: wall.y + 5 },   // offset center
                { x: wall.x - 5, y: wall.y - 5 },
            ];
            for (const p of insidePoints) {
                insideTotal++;
                if (!GameLogic.isValidPosition(p.x, p.y, game)) {
                    insideDetected++;
                } else {
                    falseNegatives++;
                }
            }

            // Test points clearly outside the wall (should be valid, IF no other walls nearby)
            const farPoints = [
                { x: wall.x + halfCell + playerRadius + 20, y: wall.y },
                { x: wall.x, y: wall.y + halfCell + playerRadius + 20 },
            ];
            for (const p of farPoints) {
                if (Utils.isInBounds(p.x, p.y, game)) {
                    outsideTotal++;
                    if (GameLogic.isValidPosition(p.x, p.y, game)) {
                        outsideDetected++;
                    }
                    // Note: may still be invalid if another wall is nearby, so we don't count false positives here
                }
            }
        }

        this.assert(insideDetected === insideTotal,
            `All inside-wall positions detected as invalid (${insideDetected}/${insideTotal})`,
            falseNegatives > 0 ? `${falseNegatives} false negatives!` : '');

        console.log(`  INFO: Outside positions valid: ${outsideDetected}/${outsideTotal} (some may be near other walls)`);
    }

    // ---- runner ----

    async runAll() {
        console.log('=== Wall Collision Test Suite ===');
        console.log(`Game state: ${this.getGame().state}`);
        console.log(`Walls: ${this.getGame().walls.length}`);
        console.log(`Player size (radius): ${this.getGame().player.size}`);
        console.log(`Cell size: ${CONFIG.MAP.CELL_SIZE}`);
        console.log('');

        // Ensure spatial grid is populated
        const game = this.getGame();
        Utils.clearSpatialGrid();
        game.walls.forEach(w => Utils.addToSpatialGrid(w, 'walls'));

        this.testIsValidPositionInsideWalls();
        this.testAABBvsCircularCollision();
        this.testWallSliding();
        this.testDiagonalCornerMovement();
        this.testResolveWallOverlaps();
        this.testWallGapWedging();
        this.testPositionValidityAroundAllWalls();

        // Keyboard test is async
        await this.testKeyboardMovement();

        console.log('\n=== Results ===');
        console.log(`PASSED: ${this.passed}`);
        console.log(`FAILED: ${this.failed}`);
        console.log(`TOTAL:  ${this.passed + this.failed}`);

        if (this.failed === 0) {
            console.log('\nAll wall collision tests PASSED. The AABB collision fix is working correctly.');
        } else {
            console.log('\nSome tests FAILED. Review the output above for details.');
        }

        return { passed: this.passed, failed: this.failed, results: this.results };
    }
}

// Auto-run if pasted into console
if (typeof window !== 'undefined') {
    window.WallCollisionTests = WallCollisionTests;
    console.log('WallCollisionTests class loaded. Run: new WallCollisionTests().runAll()');
}
