# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Game
```bash
# Start local development server (Python)
npm run start
# OR
npm run serve

# Alternative with live-server (if available)
npm run dev
```

The game runs at `http://localhost:8000` and loads from `public/index.html`.

### Testing the Game
- Open browser console and use `window.GameDebug` for debugging:
  - `GameDebug.getGame()` - Get current game state
  - `GameDebug.getStats()` - View game statistics  
  - `GameDebug.teleportToFloor(n)` - Jump to specific floor
  - `GameDebug.giveOrb('type')` - Add orb to inventory
  - `GameDebug.setLight(amount)` - Set light level

## Architecture Overview

This is a modular JavaScript game with canvas-based rendering. The architecture follows a component-based pattern where each system is self-contained.

### Core Game Loop
- **main.js**: Entry point, initializes all systems and runs the main game loop at 60 FPS
- **gameLogic.js**: Central controller that orchestrates all game systems and handles error management
- **gameState.js**: Global state management with nested objects for game, player, entities, and UI state

### Key System Dependencies
```
GameState (central state) 
    ↓
GameLogic (main controller)
    ↓
├── EntityManager (player, ghouls, orbs)
├── InventoryManager (orb collection/usage)
├── MapGenerator (procedural maze generation)
├── Renderer (canvas drawing)
└── InputManager (keyboard/mouse)
```

### Data Flow Pattern
1. **Input** → InputManager captures and normalizes input
2. **Update** → GameLogic calls entity managers to update state
3. **Render** → Renderer draws current game state to canvas
4. **State** → All systems read/write to centralized GameState

### Entity System
- **EntityManager** handles all game objects (player, ghouls, orbs)
- Entities are stored as arrays in GameState (e.g. `game.ghouls`, `game.orbs`)
- Each entity type has dedicated update methods that modify position, behavior, and collision
- Collision detection uses distance-based circular collision

### Map and Level Generation
- **MapGenerator** creates procedural mazes using recursive backtracking
- Maps are grid-based (`CONFIG.MAP.WIDTH` x `CONFIG.MAP.HEIGHT`)  
- Each floor has unique layout with walls, orbs, and ghoul spawn points
- Checkpoints every 5 floors save player progress

### Rendering Architecture
- **Renderer** uses HTML5 Canvas with 2D context
- Dual canvas setup: main game canvas + minimap canvas
- Camera system follows player with smooth movement
- Light system creates dynamic visibility using radial gradients
- UI elements rendered as overlays on top of game world

## Configuration System

All game constants are centralized in `config.js`:
- **CONFIG.PLAYER**: Movement speed, light mechanics, collision size
- **CONFIG.MAP**: Dimensions, cell size, generation parameters  
- **CONFIG.ORBS**: All orb types, effects, spawn rates
- **CONFIG.GHOULS**: AI behavior, speeds, aggression levels

## State Management Patterns

### Game State Structure
```javascript
GameState.game = {
    state: 'menu'|'playing'|'paused',
    mode: 'explorer',
    player: { x, y, light, powers, inventory },
    ghouls: [...], orbs: [...], walls: [...],
    floor: number, lastCheckpoint: number
}
```

### Tutorial System Integration
- Tutorial state tracked in `GameState.game.tutorial`
- Step-based progression with completion tracking
- Contextual popups triggered by game events (first orb collection, death, etc.)

## Power/Orb System

Orbs provide temporary powers managed by **InventoryManager**:
- **Collection**: Orbs auto-collect on collision, added to 3-slot inventory
- **Usage**: Numeric keys (1-3) instantly consume orbs from inventory slots
- **Effects**: Powers have duration timers (phase, regen, reveal) or instant effects (light restore)

## Debug and Development Tools

### Available Debug Functions
Access via browser console with `window.GameDebug`:
- State inspection, floor teleportation, inventory manipulation
- Error logging system in GameLogic tracks game errors with context
- Settings system in main.js allows runtime configuration changes

### Adding New Features
- **New Orb**: Add to `CONFIG.ORBS` object and implement effect in InventoryManager
- **New Entity**: Extend EntityManager with new update/render methods
- **New UI**: Add to Renderer and update CSS in `src/css/`
- **New Game Mode**: Extend GameState initialization and add mode-specific logic

### File Modification Guidelines
- **config.js**: Modify for game balance, new constants, orb definitions
- **gameState.js**: Extend for new persistent state, player properties
- **entities.js**: Add new entity types, modify AI behavior, collision logic
- **renderer.js**: Add visual effects, UI elements, drawing optimizations
- **mapGenerator.js**: Modify maze generation, floor layouts, spawn logic