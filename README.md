# Buried Spire of Kuwait - Explorer Mode

A 2D dungeon crawler survival game with a unique Middle Eastern theme. Explore the buried "Burj Mubarak" tower while managing a depleting light source and avoiding deadly ghouls.

## 🎮 Game Overview

**Objective**: Descend 50 floors deep to find the "Pearl of Kuwait"
**Setting**: The buried Burj Mubarak tower in Kuwait
**Mode**: Explorer Mode (checkpoint-based progression)

## 🚀 Quick Start

1. Open `public/index.html` in a web browser
2. Click "PLAY" or press SPACE to start
3. Use WASD/Arrow keys to move
4. Press 1-3 to use orbs from inventory
5. Press H for help

## 📁 Project Structure

```
maze-game-html/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── css/
│   │   ├── styles.css      # Base styles and layout
│   │   └── ui.css          # UI-specific styling
│   └── js/
│       ├── config.js       # Game configuration and constants
│       ├── gameState.js    # Game state management
│       ├── input.js        # Input handling (keyboard/mouse)
│       ├── utils.js        # Utility functions
│       ├── mapGenerator.js # Maze generation and floor setup
│       ├── entities.js     # Entity management (player, ghouls, orbs)
│       ├── inventory.js    # Inventory system
│       ├── renderer.js     # Rendering system
│       ├── gameLogic.js    # Main game logic controller
│       └── main.js         # Game entry point and initialization
└── README.md
```

## 🎯 Core Mechanics

### Light System

- **Primary Resource**: Light constantly depletes over time
- **Death Condition**: When light reaches 0%, ghouls swarm the player
- **Restoration**: Collect light orbs to restore energy

### Orb Types

- **🔵 Blue Orb (O)**: Restores 20% light
- **🟡 Golden Orb (@)**: Restores 40% light
- **🟣 Purple Orb (P)**: Phase through walls for 5 seconds
- **🟢 Green Orb (G)**: Regenerate light for 10 seconds
- **⚪ White Orb (W)**: Reveal entire map for 5 seconds
- **🔴 Red Orb (♥)**: LIFELINE - Auto-revives at 0% light
- **💫 Light Wisp (\*)**: Death marker - Restores 50% light

### Explorer Mode Features

- **Checkpoints**: Save progress every 5 floors
- **Death Recovery**: Respawn at last checkpoint with 50% light
- **Death Markers**: Light wisps appear where you died
- **Inventory System**: Hold up to 3 power orbs

## 🎮 Controls

- **Movement**: WASD or Arrow Keys
- **Use Orbs**: 1, 2, 3 (instant use from inventory slots)
- **Help**: H (toggle help screen)
- **Menu**: Click buttons or use mouse
- **Start Game**: SPACE (from menu)

## 🏗️ Technical Features

### Modular Architecture

- **Separation of Concerns**: Each system has its own file
- **Easy Maintenance**: Clean, organized codebase
- **Extensible**: Easy to add new features

### Game Systems

- **Procedural Generation**: Unique maze layouts each floor
- **AI Behavior**: Smart ghoul AI with multiple states
- **Particle Effects**: Visual feedback for actions
- **Minimap**: Real-time exploration tracking
- **Statistics Tracking**: Performance metrics

### Performance

- **60 FPS Target**: Smooth gameplay experience
- **Efficient Rendering**: Optimized drawing operations
- **Memory Management**: Proper cleanup of game objects

## 🛠️ Development

### File Organization

- **HTML**: Single entry point in `public/`
- **CSS**: Modular stylesheets in `src/css/`
- **JavaScript**: Component-based modules in `src/js/`

### Debug Features

Open browser console and use `window.GameDebug`:

- `GameDebug.getGame()` - Get current game state
- `GameDebug.getStats()` - View game statistics
- `GameDebug.teleportToFloor(n)` - Jump to specific floor
- `GameDebug.giveOrb('type')` - Add orb to inventory
- `GameDebug.setLight(amount)` - Set light level

### Adding New Features

1. **New Orb Type**: Add to `ORB_TYPES` in `config.js`
2. **New Enemy**: Extend `EntityManager` in `entities.js`
3. **New Power**: Add logic to `InventoryManager` in `inventory.js`
4. **New UI Element**: Update `renderer.js` and CSS files

## 🎨 Styling & Theme

### Visual Design

- **Dark Atmosphere**: Black background with warm light effects
- **Middle Eastern Theme**: Kuwait-inspired naming and setting
- **Retro Aesthetic**: Monospace fonts and pixel-perfect graphics
- **Color Palette**: Warm yellows/golds for light, cool blues for UI

### UI Design

- **Minimalist HUD**: Essential information only
- **Inventory Slots**: Visual orb management
- **Minimap**: Real-time exploration view
- **Status Indicators**: Light bar and power timers

## 🚀 Future Enhancements

### Potential Features

- **Multiple Difficulty Modes**: Hardcore, Casual variants
- **Leaderboards**: Online score tracking
- **Sound Effects**: Audio feedback system
- **Mobile Support**: Touch controls
- **Save System**: Persistent progress
- **Multiplayer**: Co-op exploration

### Technical Improvements

- **WebGL Rendering**: Enhanced graphics performance
- **Service Worker**: Offline gameplay capability
- **Progressive Web App**: Install as native app
- **Analytics**: Player behavior tracking

## 📄 License

This project is open source. Feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Enjoy exploring the Buried Spire of Kuwait!** 🏺✨
