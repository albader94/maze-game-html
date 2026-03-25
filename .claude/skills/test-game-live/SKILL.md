---
name: test-game-live
description: Run automated gameplay tests in the browser using Chrome MCP tools and the GameDebug API. Use after changing game logic, entities, inventory, map generation, or state management.
argument-hint: [suite: all|init|gameplay|inventory|collision|light|procgen]
allowed-tools: Read, Bash, Grep, Glob, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__read_page, mcp__plugin_playwright_playwright__browser_evaluate, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_tabs, mcp__plugin_playwright_playwright__browser_console_messages, mcp__plugin_playwright_playwright__browser_install
model: opus
user-invocable: true
---

# Live Game Testing Skill

## Purpose

Run automated integration tests against the live game in a browser. Uses Chrome MCP tools (primary) or Playwright MCP tools (fallback) to inject JavaScript via the `window.GameDebug` API and game globals to verify game behavior programmatically. This is the primary testing tool for a project with no test framework.

## Variables

- **Dev server:** `npm start` serves at `http://localhost:8000` (game at `/public/`)
- **Game URL:** `http://localhost:8000/public/`
- **Debug API:** `window.GameDebug` (defined in `src/js/main.js` line 108)
  - `GameDebug.getGame()` — returns current GameState.game object
  - `GameDebug.setPlayerLight(amount)` — set light 0-100
  - `GameDebug.teleportPlayer(x, y)` — move player
  - `GameDebug.addOrb(type)` — spawn orb near player
  - `GameDebug.clearGhouls()` — remove all ghouls
  - `GameDebug.debugInventorySystem()` — log inventory state
- **Key globals:** GameState, GameLogic, CONFIG, EntityManager, InventoryManager, MapGenerator, InputManager, Renderer, Utils, SoundManager, TutorialSystem, ORB_TYPES
- **Console:** Logs work on localhost (suppressed only in production)

## Browser Backend Selection

This skill supports two browser backends. **Try Chrome MCP first; fall back to Playwright if Chrome is unavailable or fails.**

### Backend detection procedure

1. Load Chrome MCP tools via ToolSearch: `select:mcp__claude-in-chrome__tabs_context_mcp`
2. Call `mcp__claude-in-chrome__tabs_context_mcp` to test connectivity
3. **If it succeeds** → use **Chrome MCP** backend for the session
4. **If it fails** (error, timeout, no extension running) → switch to **Playwright MCP** backend

Once a backend is chosen, use it for the entire test run. Do not mix backends mid-session.

### Tool mapping

| Operation | Chrome MCP (primary) | Playwright MCP (fallback) |
|---|---|---|
| List tabs | `mcp__claude-in-chrome__tabs_context_mcp` | `mcp__plugin_playwright_playwright__browser_tabs` with `action: "list"` |
| New tab | `mcp__claude-in-chrome__tabs_create_mcp` | `mcp__plugin_playwright_playwright__browser_tabs` with `action: "new"` |
| Navigate | `mcp__claude-in-chrome__navigate` | `mcp__plugin_playwright_playwright__browser_navigate` |
| Run JS | `mcp__claude-in-chrome__javascript_tool` | `mcp__plugin_playwright_playwright__browser_evaluate` |
| Console | `mcp__claude-in-chrome__read_console_messages` | `mcp__plugin_playwright_playwright__browser_console_messages` |

### Playwright JS execution differences

Chrome's `javascript_tool` accepts raw JS expressions. Playwright's `browser_evaluate` requires an arrow function string. Wrap test snippets like this:

- **Chrome**: pass the IIFE directly as the code/expression
- **Playwright**: wrap as `() => { return (function() { /* test code */ })(); }`

Example — for the init test:
```
// Chrome: pass the IIFE directly
(function() { ... return JSON.stringify({...}); })();

// Playwright: wrap in arrow function
() => { return (function() { ... return JSON.stringify({...}); })(); }
```

### Playwright console messages

Playwright's `browser_console_messages` uses a `level` parameter (not `pattern`). Use `level: "error"` to get errors. If you need to filter further, do it manually from the returned messages.

### Playwright browser not installed

If Playwright returns an error about the browser not being installed, call `mcp__plugin_playwright_playwright__browser_install` first, then retry.

## Instructions

### Prerequisites — do these FIRST

1. **Detect browser backend** using the procedure above
2. **Start the dev server** in background: `cd /Users/baderalbader/Documents/Development/maze-game-html && npm start`
3. **Open the game page**:
   - Chrome: get tab context, create a new tab, navigate to `http://localhost:8000/public/`
   - Playwright: create a new tab, navigate to `http://localhost:8000/public/`
4. **Verify game loaded**: inject `typeof window.GameDebug !== 'undefined'` — must return `true`

### Between test suites

Reset game state between suites to ensure clean state:
```javascript
GameState.resetGame();
```

### After all tests

Read console messages filtered for errors to catch runtime exceptions.

## Workflow

Run the requested suite(s), or all suites if "all" is specified. Execute each test by injecting JavaScript via the chosen backend's JS execution tool.

### Suite 1: Initialization (`init`)

Verify all game systems loaded correctly.

```javascript
(function() {
    const systems = ['GameState', 'GameLogic', 'CONFIG', 'EntityManager',
                     'InventoryManager', 'MapGenerator', 'InputManager',
                     'Renderer', 'Utils', 'SoundManager', 'TutorialSystem',
                     'ORB_TYPES', 'MESSAGES'];
    const results = systems.map(s => ({
        system: s,
        loaded: typeof window[s] !== 'undefined'
    }));
    const failures = results.filter(r => !r.loaded);
    return JSON.stringify({
        test: 'systems-loaded',
        pass: failures.length === 0,
        total: systems.length,
        loaded: results.filter(r => r.loaded).length,
        failures: failures.map(f => f.system)
    });
})();
```

### Suite 2: Game Start (`gameplay`)

Verify game state transitions correctly when starting a new game.

```javascript
(function() {
    // Reset and start a new game
    GameState.resetGame();
    const game = GameState.getGame();
    game.state = 'playing';
    MapGenerator.generateFloor(game, 1);

    const checks = {
        stateIsPlaying: game.state === 'playing',
        playerExists: !!game.player,
        playerXValid: typeof game.player.x === 'number' && game.player.x > 0,
        playerYValid: typeof game.player.y === 'number' && game.player.y > 0,
        lightIs100: game.player.light === 100,
        wallsExist: game.walls.length > 0,
        inventoryEmpty: game.player.inventory.every(s => s === null),
        stairsExist: !!game.stairs,
        orbsExist: game.orbs.length > 0,
        ghoulsExist: game.ghouls.length > 0,
        powersAllZero: game.player.powers.phase === 0 &&
                       game.player.powers.regeneration === 0 &&
                       game.player.powers.reveal === 0
    };
    const failures = Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k);
    return JSON.stringify({
        test: 'game-start',
        pass: failures.length === 0,
        checks,
        failures,
        wallCount: game.walls.length,
        orbCount: game.orbs.length,
        ghoulCount: game.ghouls.length
    });
})();
```

### Suite 3: Floor Generation (`floors`)

Verify procedural generation across multiple floor types.

```javascript
(function() {
    const testFloors = [1, 10, 25, 50];
    const maxFloors = CONFIG.GAME.MAX_FLOORS;
    const results = testFloors.map(floor => {
        GameState.resetGame();
        const game = GameState.getGame();
        game.state = 'playing';
        MapGenerator.generateFloor(game, floor);

        const isFinal = floor === maxFloors;
        const expectedGhouls = 3 + Math.floor(floor / 2);
        const expectedOrbs = Math.min(5 + Math.floor(floor / 5), 10);

        return {
            floor,
            wallCount: game.walls.length,
            orbCount: game.orbs.length,
            ghoulCount: game.ghouls.length,
            expectedGhouls,
            expectedOrbs,
            hasStairs: !!game.stairs,
            hasPearl: game.orbs.some(o => o.type === 'pearl'),
            pass: game.walls.length > 0 &&
                  game.orbs.length > 0 &&
                  (isFinal ? (!game.stairs && game.orbs.some(o => o.type === 'pearl')) : !!game.stairs)
        };
    });
    return JSON.stringify({
        test: 'floor-generation',
        pass: results.every(r => r.pass),
        results
    });
})();
```

### Suite 4: Inventory System (`inventory`)

Verify orb inventory add, use, and level-restart restore.

```javascript
(function() {
    GameState.resetGame();
    const game = GameState.getGame();
    game.state = 'playing';
    MapGenerator.generateFloor(game, 5);

    // Test 1: Add orbs to inventory
    game.player.inventory = ['purple', 'green', 'red'];
    InventoryManager.updateDisplay();
    const afterAdd = [...game.player.inventory];
    const addOk = afterAdd[0] === 'purple' && afterAdd[1] === 'green' && afterAdd[2] === 'red';

    // Test 2: Use purple orb (slot 0) — should activate phase power
    InventoryManager.useOrb(0);
    const afterUse = [...game.player.inventory];
    const phaseActive = game.player.powers.phase > 0;
    const phaseDuration = game.player.powers.phase;
    const useOk = afterUse[0] === null && phaseActive;

    // Test 3: Verify phase duration matches config
    const expectedDuration = CONFIG.GAME.PHASE_DURATION;
    const durationOk = phaseDuration === expectedDuration;

    // Test 4: Level restart restores entry inventory
    game.levelEntryInventory = ['purple', null, 'white'];
    game.player.inventory = ['green', 'red', null];
    GameState.restartCurrentLevel();
    const afterRestart = [...GameState.getGame().player.inventory];
    const restoreOk = afterRestart[0] === 'purple' &&
                      afterRestart[1] === null &&
                      afterRestart[2] === 'white';

    return JSON.stringify({
        test: 'inventory',
        pass: addOk && useOk && durationOk && restoreOk,
        details: {
            addOk, afterAdd,
            useOk, afterUse, phaseActive, phaseDuration, expectedDuration,
            durationOk,
            restoreOk, afterRestart
        },
        failures: [
            !addOk && 'add-failed',
            !useOk && 'use-failed',
            !durationOk && 'duration-mismatch',
            !restoreOk && 'restore-failed'
        ].filter(Boolean)
    });
})();
```

### Suite 5: Collision System (`collision`)

Verify wall collision detection and phase power bypass.

```javascript
(function() {
    GameState.resetGame();
    const game = GameState.getGame();
    game.state = 'playing';
    MapGenerator.generateFloor(game, 1);

    // Find a wall position
    const wall = game.walls[0];
    if (!wall) return JSON.stringify({ test: 'collision', pass: false, error: 'No walls found' });

    // Test 1: Wall blocks movement (isValidPosition should return false at wall center)
    const wallBlocked = !GameLogic.isValidPosition(wall.x, wall.y, game);

    // Test 2: Player position is valid (not inside a wall)
    const playerValid = GameLogic.isValidPosition(game.player.x, game.player.y, game);

    // Test 3: Phase power bypasses walls
    game.player.powers.phase = 10; // Activate phase briefly
    const phaseThrough = GameLogic.isValidPosition(wall.x, wall.y, game);

    // Test 4: After phase expires, walls block again
    game.player.powers.phase = 0;
    const wallBlockedAgain = !GameLogic.isValidPosition(wall.x, wall.y, game);

    return JSON.stringify({
        test: 'collision',
        pass: wallBlocked && playerValid && phaseThrough && wallBlockedAgain,
        details: {
            wallBlocked,
            playerValid,
            phaseThrough,
            wallBlockedAgain,
            wallPos: { x: wall.x, y: wall.y },
            playerPos: { x: Math.round(game.player.x), y: Math.round(game.player.y) }
        },
        failures: [
            !wallBlocked && 'wall-not-blocking',
            !playerValid && 'player-in-wall',
            !phaseThrough && 'phase-not-bypassing',
            !wallBlockedAgain && 'wall-not-blocking-after-phase'
        ].filter(Boolean)
    });
})();
```

### Suite 6: Light & Death (`light`)

Verify light depletion, swarm trigger, and respawn cleanup.

```javascript
(function() {
    GameState.resetGame();
    const game = GameState.getGame();
    game.state = 'playing';
    MapGenerator.generateFloor(game, 5);
    game.player.light = 100;

    // Test 1: Light decays
    const startLight = game.player.light;
    for (let i = 0; i < 100; i++) {
        game.player.light -= CONFIG.PLAYER.LIGHT_DECAY_RATE;
    }
    const afterDecay = game.player.light;
    const lightDecreased = afterDecay < startLight;
    const expectedAfterDecay = 100 - (CONFIG.PLAYER.LIGHT_DECAY_RATE * 100);
    const decayAccurate = Math.abs(afterDecay - expectedAfterDecay) < 0.01;

    // Test 2: Swarm state can be set
    game.player.light = 0;
    game.swarming = true;
    game.swarmTimer = CONFIG.GAME.SWARM_DURATION;
    const swarmSet = game.swarming === true && game.swarmTimer === CONFIG.GAME.SWARM_DURATION;

    // Test 3: Respawn clears swarm state
    GameState.respawnAtCheckpoint();
    const rGame = GameState.getGame();
    const swarmCleared = !rGame.swarming;
    const timerCleared = rGame.swarmTimer === 0;
    const deathCleared = !rGame.deathScreen;
    const lightRestored = rGame.player.light > 0;
    const powersCleared = rGame.player.powers.phase === 0 &&
                          rGame.player.powers.regeneration === 0 &&
                          rGame.player.powers.reveal === 0;

    return JSON.stringify({
        test: 'light-and-death',
        pass: lightDecreased && decayAccurate && swarmSet &&
              swarmCleared && timerCleared && deathCleared && lightRestored && powersCleared,
        details: {
            lightDecreased,
            startLight: Math.round(startLight),
            afterDecay: Math.round(afterDecay * 100) / 100,
            expectedAfterDecay: Math.round(expectedAfterDecay * 100) / 100,
            decayAccurate,
            swarmSet,
            swarmCleared,
            timerCleared,
            deathCleared,
            lightRestored,
            respawnLight: rGame.player.light,
            powersCleared
        },
        failures: [
            !lightDecreased && 'no-decay',
            !decayAccurate && 'decay-inaccurate',
            !swarmSet && 'swarm-not-set',
            !swarmCleared && 'swarm-not-cleared',
            !timerCleared && 'timer-not-cleared',
            !deathCleared && 'death-not-cleared',
            !lightRestored && 'light-not-restored',
            !powersCleared && 'powers-not-cleared'
        ].filter(Boolean)
    });
})();
```

### Suite 7: Procedural Gen Statistical Validation (`procgen`)

Run multiple map generations and check structural invariants.

```javascript
(function() {
    const iterations = 10;
    const testFloors = [1, 10, 25, 50];
    const cellSize = CONFIG.MAP.CELL_SIZE;
    const mapW = CONFIG.MAP.WIDTH;
    const mapH = CONFIG.MAP.HEIGHT;
    const results = { total: 0, passed: 0, failures: [] };

    function isInWall(x, y, walls) {
        return walls.some(w =>
            Math.abs(x - w.x) < cellSize / 2 &&
            Math.abs(y - w.y) < cellSize / 2
        );
    }

    function isReachable(sx, sy, ex, ey, walls) {
        const gsx = Math.floor(sx / cellSize);
        const gsy = Math.floor(sy / cellSize);
        const gex = Math.floor(ex / cellSize);
        const gey = Math.floor(ey / cellSize);
        const wallSet = new Set();
        walls.forEach(w => {
            wallSet.add(Math.floor(w.x / cellSize) + ',' + Math.floor(w.y / cellSize));
        });
        const visited = new Set();
        const queue = [[gsx, gsy]];
        visited.add(gsx + ',' + gsy);
        while (queue.length > 0) {
            const [cx, cy] = queue.shift();
            if (cx === gex && cy === gey) return true;
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = cx + dx, ny = cy + dy;
                const key = nx + ',' + ny;
                if (nx >= 0 && nx < mapW && ny >= 0 && ny < mapH &&
                    !visited.has(key) && !wallSet.has(key)) {
                    visited.add(key);
                    queue.push([nx, ny]);
                }
            }
        }
        return false;
    }

    for (const floor of testFloors) {
        for (let i = 0; i < iterations; i++) {
            results.total++;
            GameState.resetGame();
            const game = GameState.getGame();
            game.state = 'playing';
            MapGenerator.generateFloor(game, floor);

            const errors = [];
            const isFinal = floor === CONFIG.GAME.MAX_FLOORS;

            // Connectivity check
            if (!isFinal && game.stairs) {
                if (!isReachable(game.player.x, game.player.y,
                                 game.stairs.x, game.stairs.y, game.walls)) {
                    errors.push('Stairs unreachable from spawn');
                }
            }

            // Entities not in walls
            for (const orb of game.orbs) {
                if (isInWall(orb.x, orb.y, game.walls)) {
                    errors.push('Orb (' + orb.type + ') in wall at (' +
                                Math.round(orb.x) + ',' + Math.round(orb.y) + ')');
                    break; // One example is enough
                }
            }

            // Final floor checks
            if (isFinal) {
                if (game.stairs) errors.push('Final floor has stairs');
                if (!game.orbs.some(o => o.type === 'pearl'))
                    errors.push('Final floor missing pearl');
            } else {
                if (!game.stairs) errors.push('Non-final floor missing stairs');
            }

            if (errors.length === 0) {
                results.passed++;
            } else {
                results.failures.push({ floor, iteration: i, errors });
            }
        }
    }

    return JSON.stringify({
        test: 'procgen-validation',
        pass: results.passed === results.total,
        total: results.total,
        passed: results.passed,
        failed: results.total - results.passed,
        passRate: Math.round(results.passed / results.total * 100) + '%',
        failures: results.failures.slice(0, 5) // Limit to 5 examples
    });
})();
```

### Suite 8: Console Errors (`errors`)

After running test suites, check for any runtime errors in the console.

- **Chrome MCP**: Use `mcp__claude-in-chrome__read_console_messages` with pattern `error|Error|TypeError|ReferenceError|SyntaxError`
- **Playwright MCP**: Use `mcp__plugin_playwright_playwright__browser_console_messages` with `level: "error"`

## Examples

```
/test-game-live all        — Run all 7 test suites
/test-game-live init       — Only check system initialization
/test-game-live inventory  — Only test inventory add/use/restore
/test-game-live procgen    — Only run procedural gen validation
/test-game-live collision  — Only test collision and phase bypass
```

## Report

Output a test results summary:

```
## Live Test Results

### Summary
X/7 suites passed

### Results
| Suite              | Status | Details                        |
|--------------------|--------|--------------------------------|
| Initialization     | PASS   | 13/13 systems loaded           |
| Game Start         | PASS   | All 11 state checks passed     |
| Floor Generation   | PASS   | 4/4 floors valid               |
| Inventory          | PASS   | Add/use/duration/restore all OK|
| Collision          | PASS   | Block + phase bypass + reblock |
| Light & Death      | FAIL   | swarm timer not cleared        |
| Procgen Validation | PASS   | 40/40 generations valid (100%) |

### Failures (if any)
- [Suite Name] specific failure description with values

### Console Errors (if any)
- [timestamp] error message at file:line

### Recommendations
- Specific fixes for any failures found
```
