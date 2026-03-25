---
name: config-impact
description: Trace all effects of changing a game config value before committing the change. Use when proposing to modify any value in config.js, or when asking "what if I changed X to Y?"
argument-hint: <CONFIG.PATH> <current_value> <proposed_value>
allowed-tools: Read, Grep, Glob
model: opus
user-invocable: true
---

# Config Change Impact Analysis

## Purpose

Before changing any game config value, trace every code path that references it and produce a complete impact analysis showing all affected systems, before/after behavior, and potential edge cases. This prevents cascading balance breakage from "simple" config tweaks.

## Variables

- **Config source:** `src/js/config.js` (lines 1-104)
- **CONFIG object:** lines 2-41 — CANVAS, HUD, MINIMAP, MAP, PLAYER, GAME sections
- **ORB_TYPES object:** lines 44-104 — all orb definitions
- **All game source files:** `src/js/*.js` (15 files, all may reference CONFIG)
- **Key balance constants:**
  - `PLAYER.SPEED`: 3 — player movement pixels/frame
  - `PLAYER.LIGHT_DECAY_RATE`: 0.035 — light loss per frame (~47.6s from 100%)
  - `PLAYER.LIGHT_DRAIN_FROM_GHOULS`: 0.5 — drain per frame when near ghoul
  - `PLAYER.LIGHT_RADIUS`: 150 — visibility radius in pixels
  - `GAME.PHASE_DURATION`: 300 — 5 seconds at 60fps
  - `GAME.REGENERATION_DURATION`: 600 — 10 seconds
  - `GAME.REVEAL_DURATION`: 300 — 5 seconds
  - `GAME.SWARM_DURATION`: 180 — 3 seconds
  - `GAME.MAX_FLOORS`: 50
  - `GAME.CHECKPOINT_INTERVAL`: 5
- **Scaling formulas (in mapGenerator.js):**
  - Ghoul count: `3 + Math.floor(floorNum / 2)`
  - Orb count: `Math.min(5 + Math.floor(floorNum / 5), 10)`
  - Room count: `3 + Math.floor(floorNum / 10)`

## Instructions

Accept a proposed config change in the format: `CONFIG.PATH current_value -> proposed_value` (or infer from context). Trace ALL references to that value and produce a structured impact report. Never assume — always grep.

## Workflow

### 1. Confirm the current value

Read `src/js/config.js` and verify the config key exists and has the stated current value. If the key does not exist, report this immediately.

### 2. Find all references

- Grep for the config key name across all `src/js/*.js` files (e.g., `CONFIG.PLAYER.SPEED`)
- Also grep for the shorthand (e.g., `PLAYER.SPEED`, `player.speed`)
- Check for local variable aliases: patterns like `const speed = CONFIG.PLAYER.SPEED` or destructuring
- Check for the literal numeric value in arithmetic context if relevant

### 3. Classify each reference

For each file that references the value, read the surrounding code (5-10 lines) and classify:

| Classification | Description | Example |
|---|---|---|
| **Direct use** | Value used as-is | `game.player.speed = CONFIG.PLAYER.SPEED` |
| **Arithmetic** | Value in a formula | `dx = movement.x * game.player.speed * deltaTime / 16` |
| **Comparison** | Value in a threshold | `if (distance < CONFIG.PLAYER.LIGHT_RADIUS * 0.6)` |
| **Initialization** | Sets initial state | `light: CONFIG.PLAYER.MAX_LIGHT` in gameState.js |
| **Downstream** | Indirect effect | Speed affects time-to-clear which affects light consumption |

### 4. Compute before/after behavior

For each usage:
- **Arithmetic:** Show formula output with old vs new value
- **Comparisons:** Show what the threshold was vs what it becomes
- **Game feel:** Describe qualitative change (e.g., "player moves 67% faster")
- **Duration conversions:** For frame-counter values, compute real-time equivalent (frames / 60 = seconds)

If the effect scales with floor, compute at floors 1, 10, 25, 50.

### 5. Check edge cases

- Division by zero: does the new value cause any `/ value` to divide by zero?
- Negative/zero values: does a radius or speed become zero or negative?
- Frame-counter integrity: does the change break any `=== 1` or `=== 0` exact equality check? (Powers use integer decrement with exact checks — fractional values break them)
- Cap saturation: does a capped value always hit its cap, making the mechanic meaningless?
- Overflow: for durations, does the frame count become unreasonably large (>3600 = 60 seconds)?

### 6. Check system interactions

Trace cascading effects through interconnected systems:
- **Light economy:** Decay rate, ghoul drain, orb restoration, regeneration rate
- **Ghoul AI:** Flee threshold (0.6x light radius), stalk threshold (1.2x light radius), stalking drain multiplier
- **Power viability:** Does the change make any power type useless or overpowered?
- **Checkpoint value:** Harder floors make checkpoints more valuable; easier floors make them less meaningful
- **Strategy balance:** "Speed run past ghouls" vs "carefully clear each floor" — does the change favor one?
- **Inventory pressure:** 4 power orb types but only 3 slots — does the change alter which orbs are worth carrying?

## Examples

```
/config-impact PLAYER.SPEED 3 5
→ "Player moves 67% faster. Ghoul escape becomes trivial. Floor traversal time drops from ~20s to ~12s, reducing light pressure significantly. Floors 1-20 become EASY. Phase orb loses strategic value since you can outrun ghouls."

/config-impact PLAYER.LIGHT_DECAY_RATE 0.035 0.05
→ "Light budget drops from 47.6s to 33.3s. Floors 25+ become nearly impossible without green orb. Swarm frequency increases ~40%."

/config-impact GAME.PHASE_DURATION 300 600
→ "Phase power lasts 10s instead of 5s. Player can traverse half the map phased. Purple orb becomes dominant strategy. Consider reducing spawn weight."

/config-impact GAME.MAX_FLOORS 50 100
→ "Ghoul count at floor 100: 53 ghouls. Orb count caps at 10 (unchanged). Ghoul-to-orb ratio at floor 100 is 5.3:1 — likely impossible. Scaling formulas need adjustment."
```

## Report

Output a structured report:

```
## Impact Analysis: CONFIG.PATH (current → proposed)

### All References Found
| File | Line | Usage Type | Code Context |
|------|------|------------|-------------|

### Before/After Behavior
| System | Before | After | Change |
|--------|--------|-------|--------|

### Edge Cases
- [SAFE / WARNING / BREAKING] Description

### Cascading Effects
- Light economy: ...
- Ghoul AI: ...
- Power balance: ...

### Recommendation
[SAFE TO CHANGE / CHANGE WITH CAUTION / DO NOT CHANGE]
Reasoning: ...
```
