---
name: add-game-system
description: Scaffold a new game system (orb, entity, power, UI element, mechanic) following established codebase patterns. Use when adding any new game feature that integrates with existing systems.
argument-hint: [type: orb|entity|power|ui|mechanic] [name/description]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
model: opus
user-invocable: true
---

# Add Game System

## Purpose

Implement a new game system by following the exact patterns established in the codebase. Ensures all integration points are covered, the correct timing model is used, and no files are missed.

## Variables

- **Source directory:** `src/js/`
- **Config:** `src/js/config.js` — CONFIG object (lines 2-41) and ORB_TYPES object (lines 44-104)
- **State shape:** `src/js/gameState.js` — GameState.game object (lines 4-58)
- **Messages:** `src/js/messages.js` — MESSAGES object
- **Script load order (from index.html lines 86-118):** config.js → messages.js → utils.js → soundManager.js → gameState.js → tutorial.js → input.js → mapGenerator.js → entities.js → inventory.js → renderer.js → gameLogic.js → storyNarration.js → main.js
- **Timing rule:** New powers and timers MUST use the frame-counter pattern (integer decrement with `--`, exact equality checks like `=== 1`). NEVER use deltaTime for power durations.
- **SW cache:** After adding/removing any source file, update `urlsToCache` in `public/sw.js` and bump `CACHE_NAME`.

## Instructions

### Step 1: Determine the system type from the user's request

Ask if unclear. The type determines which files to modify and which patterns to follow.

### Step 2: Read the relevant exemplar pattern

Before writing any code, read the existing implementation that most closely matches the new feature:
- **New orb:** Read how `purple` orb is implemented across all files (it's the best exemplar for a power orb)
- **New entity:** Read how ghouls are implemented in `entities.js` and `gameLogic.js`
- **New UI element:** Read existing HUD rendering in `renderer.js`

### Step 3: Implement following the type-specific checklist below

### Step 4: Verify all reset paths include new state fields

### Step 5: Remind about `public/sw.js` cache bump if any files changed

## Workflow

### New Orb Type — Full Checklist

Follow this exact order:

1. **`src/js/config.js`** — Add entry to `ORB_TYPES` object (after line 103):
   - For auto-collect orbs: include `lightBonus: N` (like `common`, `golden`, `wisp`)
   - For inventory power orbs: include `power: 'powerName'` (like `purple`, `green`, `white`, `red`)
   - Required fields: `symbol` (single char), `color` (hex), `name`, `description`
   - If timed power: add `CONFIG.GAME.POWER_NAME_DURATION` in frames (60 frames = 1 second)

2. **`src/js/gameState.js`** — If the orb grants a NEW timed power:
   - Add the power field to `player.powers` in the `game` object (line ~28-32): `newPower: 0`
   - **CRITICAL RESET PATHS** — Update ALL of these to include the new power field:
     - `respawnAtCheckpoint()` — resets `game.player.powers`
     - `restartCurrentLevel()` — resets `game.player.powers`
     - `quitToMenu()` — calls `resetGame()` which reinitializes `game`
   - Search for `phase: 0, regeneration: 0, reveal: 0` — that pattern appears in reset functions and must include the new power

3. **`src/js/mapGenerator.js`** — Add spawning:
   - In `getRandomOrbType()` (line ~347): add to the floor-progression logic following the pattern:
     ```js
     if (floorNum >= N) availableOrbs.push({ type: 'newType', weight: W });
     ```
   - Current schedule: blue@1, golden@2, purple@6, green@11, white@16, red@21
   - In `placeIntroductionOrb()` (line ~267): add introduction floor case:
     ```js
     if (floorNum === N) introOrbType = 'newType';
     ```
   - Orb count formula: `Math.min(5 + Math.floor(floorNum / 5), 10)` — modify only if needed

4. **`src/js/entities.js`** — Add collection logic in `collectOrb()`:
   - Auto-collect orbs (with `lightBonus`): handled automatically by existing code
   - Inventory orbs (with `power`): handled automatically by existing routing
   - Special collection behavior: add a case if needed (see `pearl` type for example)

5. **`src/js/inventory.js`** — Add activation in `useOrb()` switch (line ~9):
   ```js
   case 'newType':
       game.player.powers.newPower = CONFIG.GAME.NEW_POWER_DURATION;
       Utils.showMessage(MESSAGES.STORY.NEW_POWER_ACTIVATED, 2500);
       if (window.SoundManager) {
           SoundManager.playOrbUsage('newPower');
       }
       break;
   ```
   **TIMING MODEL:** The duration MUST be set as an integer frame count from CONFIG. Never use deltaTime here.

6. **`src/js/gameLogic.js`** — Add power update logic:
   - In `updatePlayerPowers()`: add decrement and expiry handling:
     ```js
     if (game.player.powers.newPower > 0) {
         game.player.powers.newPower--;
         if (game.player.powers.newPower === 1) {
             // Last-frame side effects (e.g., message)
             Utils.showMessage('Power fading...', 1500);
         }
     }
     ```
   - **TIMING MODEL:** Use `--` (integer decrement). Use `=== 1` for last-frame check, NOT `<= 0`.
   - In the relevant update function: add the gameplay effect while active (check `game.player.powers.newPower > 0`)

7. **`src/js/renderer.js`** — Add visual rendering:
   - Orb entity rendering in the game world (symbol + color from ORB_TYPES)
   - Active power visual effects (glow, tint, particles)
   - Account for portrait mode HUD band (195px top offset in `CONFIG.HUD.PORTRAIT_HEIGHT`)

8. **`src/js/soundManager.js`** — Add sounds:
   - Collection sound in `playOrbCollection()` or similar
   - Power activation sound in `playOrbUsage()` — use existing pattern with `window.SoundManager` guard

9. **`src/js/messages.js`** — Add message strings:
   - Collection message, activation message, tutorial text
   - Add to the `MESSAGES.STORY` object following existing pattern

10. **`src/js/tutorial.js`** — Add first-time collection tutorial:
    - Add orb type to tutorial handling so a popup appears on first collection

### New Entity Type — Checklist

1. `src/js/config.js` — Add CONFIG section with behavior parameters (speed, range, etc.)
2. `src/js/gameState.js` — Add array to game object (e.g., `game.newEntities: []`), add to all reset functions
3. `src/js/entities.js` — Add update and render methods following ghoul pattern
4. `src/js/mapGenerator.js` — Add spawn logic in `placeGhouls()` or new placement function
5. `src/js/gameLogic.js` — Add update call in the game loop, add collision/interaction logic
6. `src/js/renderer.js` — Add rendering code
7. `src/js/soundManager.js` — Add associated sounds

### New UI Element — Checklist

1. `src/js/renderer.js` — Add drawing code (all UI is canvas-rendered, not DOM)
2. `src/js/input.js` — Add click/touch handling if interactive
3. `src/js/config.js` — Add positioning/sizing constants
4. **Note:** Account for portrait mode HUD band (195px top offset) in renderer.js

### New Game Mechanic — Checklist

1. Determine which existing systems are affected
2. `src/js/config.js` — Add CONFIG values
3. `src/js/gameState.js` — Add state fields, update all reset functions
4. `src/js/gameLogic.js` — Implement logic (choose correct timing model!)
5. `src/js/renderer.js` — Add visuals
6. `src/js/input.js` — Add input bindings if needed

## Examples

```
/add-game-system orb ice        — Add a new "ice orb" power type
/add-game-system entity trap    — Add a trap tile entity
/add-game-system ui compass     — Add a compass HUD element
/add-game-system mechanic fog   — Add a fog-of-war mechanic
```

## Report

After implementation, output:
1. Checklist of all files modified with line references
2. Timing model used and why (frame-counter for powers, deltaTime/16 for movement)
3. Reset path verification (all reset functions updated)
4. Manual testing steps: `GameDebug.giveOrb('newType')` or equivalent
5. Reminder to bump `public/sw.js` CACHE_NAME if files were changed
