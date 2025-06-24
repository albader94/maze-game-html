// Game State Management
const GameState = {
    // Main game object
    game: {
        state: 'menu',
        mode: 'explorer',
        deathScreen: false,
        showHelp: false,
        stats: {
            totalOrbs: 0,
            totalFloors: 0,
            totalDeaths: 0,
            bestFloor: 1,
            sessionTime: 0
        },
        player: {
            x: 400,
            y: 300,
            speed: CONFIG.PLAYER.SPEED,
            light: CONFIG.PLAYER.MAX_LIGHT,
            maxLight: CONFIG.PLAYER.MAX_LIGHT,
            lightRadius: CONFIG.PLAYER.LIGHT_RADIUS,
            orbsCollected: 0,
            inventory: [null, null, null],
            selectedSlot: 0,
            powers: {
                phase: 0,
                regeneration: 0,
                reveal: 0
            },
            deathMarkers: []
        },
        camera: {
            x: 0,
            y: 0
        },
        floor: 1,
        checkpoint: 1,
        ghouls: [],
        orbs: [],
        walls: [],
        stairs: null,
        particles: [],
        explored: new Set(),
        gameOver: false,
        victory: false,
        swarming: false,
        swarmTimer: 0,
        darknessFade: 0,
        time: 0,
        mapWidth: CONFIG.MAP.WIDTH,
        mapHeight: CONFIG.MAP.HEIGHT
    },

    // Initialize game state
    init() {
        this.resetGame();
    },

    // Reset game to initial state
    resetGame() {
        this.game.state = 'menu';
        this.game.floor = 1;
        this.game.checkpoint = 1;
        this.game.player.light = CONFIG.PLAYER.MAX_LIGHT;
        this.game.player.orbsCollected = 0;
        this.game.player.inventory = [null, null, null];
        this.game.player.powers = { phase: 0, regeneration: 0, reveal: 0 };
        this.game.player.deathMarkers = [];
        this.game.gameOver = false;
        this.game.victory = false;
        this.game.swarming = false;
        this.game.swarmTimer = 0;
        this.game.darknessFade = 0;
        this.game.deathScreen = false;
        this.game.showHelp = false;
    },

    // Start new game
    startGame() {
        this.game.state = 'playing';
        this.resetGame();
        this.game.state = 'playing'; // Override the menu state from resetGame
        
        // Show UI elements
        document.getElementById('ui').style.display = 'block';
        document.getElementById('minimap').style.display = 'block';
        document.getElementById('inventory').style.display = 'flex';
        document.getElementById('story').style.display = 'block';
        document.getElementById('story').textContent = MESSAGES.STORY.INTRO;
        document.getElementById('checkpoint').textContent = '1';
    },

    // Quit to menu
    quitToMenu() {
        this.game.state = 'menu';
        this.game.deathScreen = false;
        this.game.swarming = false;
        this.game.swarmTimer = 0;
        this.game.darknessFade = 0;
        
        // Hide UI elements
        document.getElementById('ui').style.display = 'none';
        document.getElementById('minimap').style.display = 'none';
        document.getElementById('inventory').style.display = 'none';
        document.getElementById('story').style.display = 'none';
        document.getElementById('powerStatus').textContent = '';
    },

    // Respawn at checkpoint
    respawnAtCheckpoint() {
        // Add death marker
        this.game.player.deathMarkers.push({
            x: this.game.player.x,
            y: this.game.player.y,
            floor: this.game.floor
        });
        
        // Reset to checkpoint
        this.game.floor = this.game.checkpoint;
        this.game.player.light = 50;
        this.game.swarming = false;
        this.game.swarmTimer = 0;
        this.game.darknessFade = 0;
        this.game.deathScreen = false;
        
        document.getElementById('story').textContent = MESSAGES.STORY.RESPAWN;
    },

    // Update game statistics
    updateStats() {
        this.game.stats.totalDeaths++;
        this.game.stats.totalOrbs += this.game.player.orbsCollected;
        this.game.stats.totalFloors += this.game.floor - 1;
        if (this.game.floor > this.game.stats.bestFloor) {
            this.game.stats.bestFloor = this.game.floor;
        }
    },

    // Get current game state
    getGame() {
        return this.game;
    }
}; 