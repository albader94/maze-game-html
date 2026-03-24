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
- **Timing model (mixed — do NOT "fix")**: Player/particle movement uses `deltaTime / 16` scaling. Ghoul movement, power durations, swarm timers, and `game.time` are all frame-based (no deltaTime). This is intentional. Power durations use integer decrement (`--`) with exact equality checks (e.g., `=== 1`), so they must NOT be converted to floating-point deltaTime. New powers/timers should follow the frame-counter pattern. Light decays at 0.02%/frame; ghouls drain 0.3%/frame when near.
- **Orb auto-collect vs inventory**: Blue/Golden/Wisp orbs auto-collect on contact. Purple/Green/White/Red go to the 3-slot inventory. This split is handled in `entities.js` collision logic.

## Documentation Maintenance

- **CHANGELOG.md**: Follows [Keep a Changelog](https://keepachangelog.com/) format. When making notable changes, add an entry under the `[Unreleased]` section with the appropriate category (Added, Changed, Fixed, Removed, Security). The `[Unreleased]` section is **manual** — it is not auto-updated on commit. Always check and update it before committing.
- **README.md**: Keep in sync when adding user-facing features, changing controls, adding orb types, or modifying the project structure. The Firebase setup instructions in the README include the Firestore security rules — update both places if rules change.
