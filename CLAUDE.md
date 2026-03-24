# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

```bash
npm start          # Python HTTP server at http://localhost:8000 (game at /public/)
npm run dev        # live-server with auto-reload (requires npm install first)
```

No build step — all JS is loaded directly via `<script>` tags in `public/index.html`.

## Testing

Manual testing only. Open browser console and use `window.GameDebug`:
- `GameDebug.getGame()` — current game state
- `GameDebug.getStats()` — statistics
- `GameDebug.teleportToFloor(n)` — jump to floor
- `GameDebug.giveOrb('type')` — add orb to inventory
- `GameDebug.setLight(amount)` — set light 0-100

Test on both desktop (keyboard) and mobile (touch/joystick) when changing input or UI code.

## Architecture

```
GameState (central state)
    ↓
GameLogic (orchestrator)
    ├── EntityManager (player, ghouls, orbs)
    ├── InventoryManager (3-slot orb inventory)
    ├── MapGenerator (procedural maze)
    ├── Renderer (canvas + minimap)
    ├── InputManager (keyboard/mouse/touch)
    ├── TutorialSystem (step-based)
    ├── SoundManager (Web Audio API)
    └── LeaderboardService (Firebase)
```

**Game loop**: Input → Update → Render → State. All systems read/write `GameState`. 60 FPS via `requestAnimationFrame`.

**Dual canvas**: Main game canvas + minimap canvas. Camera follows player with smooth movement.

## Configuration

All game constants live in `config.js`:
- `CONFIG.PLAYER` — speed, light mechanics, collision size
- `CONFIG.MAP` — dimensions (30x20 cells, 40px each), generation params
- `CONFIG.ORBS` — orb types, effects, spawn rates
- `CONFIG.GHOULS` — AI behavior, speeds, aggression

## Adding Features

- **New orb**: Add to `CONFIG.ORBS` in `config.js`, implement effect in `inventory.js`
- **New entity**: Add update/render methods in `entities.js`
- **New UI element**: Add drawing in `renderer.js`, styles in `src/css/`
- **New game mode**: Extend `GameState` initialization in `gameState.js`
- **Game balance**: Modify values in `config.js`

## Gotchas

- **CSP headers**: `index.html` has a strict Content Security Policy for Firebase. If adding external scripts/resources, update the CSP meta tag.
- **Firebase placeholder check**: `leaderboard.js` checks for `YOUR_API_KEY` in config — if values are placeholders, leaderboard silently disables itself.
- **Mobile HUD band**: Portrait mode uses a 195px HUD band at top. Changes to HUD elements must account for this in `renderer.js`.
- **Service Worker caching**: After changing files, the SW may serve stale versions. Update the cache version in `sw.js` when deploying changes.
- **Timing model (mixed — do NOT "fix")**: Player/particle movement uses `deltaTime / 16` scaling. Ghoul movement, power durations, swarm timers, and `game.time` are all frame-based (no deltaTime). This is intentional. Power durations use integer decrement (`--`) with exact equality checks (e.g., `=== 1`), so they must NOT be converted to floating-point deltaTime. New powers/timers should follow the frame-counter pattern. Light decays at 0.035%/frame; ghouls drain 0.5%/frame when near.
- **Orb auto-collect vs inventory**: Blue/Golden/Wisp orbs auto-collect on contact. Purple/Green/White/Red go to the 3-slot inventory. This split is handled in `entities.js` collision logic.

## Commit & Release Workflow (MANDATORY)

When the user asks to commit, push, or deploy, follow these steps **in order**. Do NOT skip steps or combine commit+push into one action.

1. **Update CHANGELOG.md** — Add entries under `[Unreleased]` using [Keep a Changelog](https://keepachangelog.com/) categories (Added, Changed, Fixed, Removed, Security). Read the file first to avoid duplicates.
2. **Update README.md** — If the changes affect user-facing features, controls, orb types, project structure, or Firebase/Firestore rules, update the README to match.
3. **Commit** — Stage and commit the changes (including changelog/readme updates).
4. **STOP and ask about a release** — If `[Unreleased]` has entries, ask the user: *"There are unreleased changelog entries. Would you like to cut a new version release?"* If yes: bump the version in CHANGELOG, create a git tag, and publish a GitHub release. If no: proceed.
5. **Push** — Only push after step 4 is resolved.

**Do NOT push without completing step 4.** This is a blocking step.
