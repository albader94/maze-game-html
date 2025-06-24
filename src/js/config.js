// Game Configuration
const CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600
    },
    MINIMAP: {
        WIDTH: 150,
        HEIGHT: 150
    },
    MAP: {
        WIDTH: 30,
        HEIGHT: 20,
        CELL_SIZE: 40,
        MIN_SIZE: 15 // Minimum map size
    },
    PLAYER: {
        SPEED: 3,
        SIZE: 15, // Player collision radius
        MAX_LIGHT: 100,
        LIGHT_RADIUS: 150,
        LIGHT_DECAY_RATE: 0.02, // Reduced from 0.05 to 0.02 (60% slower)
        LIGHT_DRAIN_FROM_GHOULS: 0.3 // Reduced from 0.5
    },
    LIGHT: {
        DEPLETION_RATE: 0.02 // Light depletion rate per frame
    },
    GAME: {
        MAX_FLOORS: 50,
        CHECKPOINT_INTERVAL: 5,
        SWARM_DURATION: 180, // 3 seconds at 60fps
        PHASE_DURATION: 300, // 5 seconds
        REGENERATION_DURATION: 600, // 10 seconds
        REVEAL_DURATION: 300 // 5 seconds
    }
};

// Orb Types Configuration
const ORB_TYPES = {
    common: { 
        symbol: 'O', 
        color: '#64b5f6', 
        lightBonus: 20,
        name: 'Blue Orb',
        description: 'Restores 20% light'
    },
    golden: { 
        symbol: '@', 
        color: '#ffeb3b', 
        lightBonus: 40,
        name: 'Golden Orb',
        description: 'Restores 40% light'
    },
    purple: { 
        symbol: 'P', 
        color: '#9c27b0', 
        power: 'phase',
        name: 'Purple Orb',
        description: 'Phase through walls for 5 seconds'
    },
    green: { 
        symbol: 'G', 
        color: '#4caf50', 
        power: 'regeneration',
        name: 'Green Orb',
        description: 'Regenerate light for 10 seconds'
    },
    white: { 
        symbol: 'W', 
        color: '#ffffff', 
        power: 'reveal',
        name: 'White Orb',
        description: 'Reveal entire map for 5 seconds'
    },
    red: { 
        symbol: '♥', 
        color: '#f44336', 
        power: 'lifeline',
        name: 'Red Orb',
        description: 'Auto-revives you at 0% light!'
    },
    wisp: { 
        symbol: '*', 
        color: '#ccccff', 
        lightBonus: 50,
        name: 'Light Wisp',
        description: 'Death marker - Restores 50% light'
    }
};

// Game Messages
const MESSAGES = {
    STORY: {
        INTRO: 'The Burj Mubarak stretches below you, buried in sand and darkness...',
        PHASE_ACTIVATED: 'Phase shift activated! Walk through walls!',
        REGENERATION_ACTIVATED: 'Light regeneration activated!',
        REVEAL_ACTIVATED: 'Map revealed!',
        LIFELINE_USED: 'Lifeline used! Light fully restored!',
        LIFELINE_AUTO: 'LIFELINE ACTIVATED! Your red orb saved you!',
        DARKNESS_CONSUMES: 'The darkness consumes you... The ghouls are coming!',
        PHASE_ENDING: 'Phase shift ending - moved to safe location!',
        INVENTORY_FULL: 'Inventory full!',
        RESPAWN: 'Respawned at checkpoint. Look for your light wisp!',
        VICTORY: 'You found the Pearl of Kuwait!'
    },
    FLOOR: {
        CHECKPOINT: (floor) => `Floor -${floor}: Checkpoint saved!`,
        PROGRESS: (floor) => `Floor -${floor}: Deeper into darkness...`
    }
}; 