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
            deathMarkers: [],
            lastPosition: { x: 100, y: 100 },
            survivalTime: 0
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
        mapHeight: CONFIG.MAP.HEIGHT,
        gameStartTime: Date.now(),
        distanceTraveled: 0,
        ghoulsDefeated: 0
    },

    // Game statistics
    stats: {
        totalPlayTime: 0,
        gamesPlayed: 0,
        deepestFloor: 0,
        totalOrbsCollected: 0,
        totalGhoulsDefeated: 0,
        totalDistanceTraveled: 0,
        totalDeaths: 0,
        fastestCompletion: null,
        lastPlayed: null,
        achievements: new Set()
    },

    // Achievement definitions
    achievements: {
        'first_death': { name: 'First Steps', description: 'Die for the first time', icon: '💀' },
        'orb_collector': { name: 'Orb Collector', description: 'Collect 10 orbs in a single run', icon: '🔮' },
        'deep_explorer': { name: 'Deep Explorer', description: 'Reach floor -25', icon: '⬇️' },
        'ghoul_slayer': { name: 'Ghoul Slayer', description: 'Defeat 50 ghouls', icon: '⚔️' },
        'marathon_runner': { name: 'Marathon Runner', description: 'Play for 30 minutes total', icon: '🏃' },
        'speed_runner': { name: 'Speed Runner', description: 'Complete the game in under 10 minutes', icon: '⚡' },
        'survivor': { name: 'Survivor', description: 'Survive for 5 minutes without dying', icon: '🛡️' },
        'explorer': { name: 'Explorer', description: 'Travel 10,000 units total', icon: '🗺️' },
        'persistent': { name: 'Persistent', description: 'Play 10 games', icon: '💪' },
        'completionist': { name: 'Completionist', description: 'Reach the final floor (-50)', icon: '🏆' }
    },

    // Initialize game state
    init() {
        console.log('🎮 GameState.init() called');
        
        try {
            this.loadStats();
            console.log('✅ Stats loaded');
            
            this.resetGame();
            console.log('✅ Game reset completed');
            
            this.stats.gamesPlayed++;
            this.stats.lastPlayed = Date.now();
            this.saveStats();
            console.log('✅ Stats updated and saved');
            
            // Don't auto-start the game, show menu first
            console.log('✅ GameState initialized - showing menu');
            
        } catch (error) {
            console.error('❌ GameState.init() failed:', error);
            // Create a minimal game object as fallback
            this.game = {
                state: 'menu',
                player: { x: 100, y: 100, light: 100 },
                floor: 1,
                ghouls: [],
                orbs: [],
                walls: [],
                particles: [],
                explored: new Set()
            };
            throw error;
        }
    },

    // Reset game to initial state
    resetGame() {
        console.log('🔄 Resetting game state...');
        
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG is not defined! Cannot reset game properly.');
            // Create a minimal fallback config
            window.CONFIG = {
                PLAYER: { SIZE: 15, SPEED: 3, MAX_LIGHT: 100, LIGHT_RADIUS: 150 },
                MAP: { WIDTH: 30, HEIGHT: 20 }
            };
        }
        
        this.game = {
            state: 'menu', // Start in menu state
            mode: 'explorer',
            deathScreen: false,
            showHelp: false,
            player: {
                x: 400, // Center of canvas
                y: 300,
                size: CONFIG.PLAYER.SIZE || 15,
                speed: CONFIG.PLAYER.SPEED || 3,
                light: CONFIG.PLAYER.MAX_LIGHT || 100,
                maxLight: CONFIG.PLAYER.MAX_LIGHT || 100,
                lightRadius: CONFIG.PLAYER.LIGHT_RADIUS || 150,
                orbsCollected: 0,
                inventory: [null, null, null],
                selectedSlot: 0,
                powers: { phase: 0, regeneration: 0, reveal: 0 },
                deathMarkers: [],
                lastPosition: { x: 400, y: 300 }
            },
            camera: { x: 0, y: 0 },
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
            mapWidth: CONFIG.MAP.WIDTH || 30,
            mapHeight: CONFIG.MAP.HEIGHT || 20,
            gameStartTime: Date.now(),
            distanceTraveled: 0,
            ghoulsDefeated: 0,
            survivalTime: 0
        };
        
        console.log('✅ Game state reset completed');
    },

    // Start new game
    startGame() {
        console.log('🚀 Starting new game...');
        
        this.resetGame();
        this.game.state = 'playing'; // Set to playing after reset
        
        // Generate the first floor
        if (typeof MapGenerator !== 'undefined' && MapGenerator.generateFloor) {
            try {
                MapGenerator.generateFloor(this.game, 1);
                console.log('✅ First floor generated');
            } catch (error) {
                console.warn('⚠️ Failed to generate first floor:', error);
            }
        } else {
            console.warn('⚠️ MapGenerator not available');
        }
        
        // Show UI elements with safety checks
        const elements = ['ui', 'minimap', 'inventory', 'story'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === 'inventory' ? 'flex' : 'block';
            } else {
                console.warn(`⚠️ Element '${id}' not found`);
            }
        });
        
        // Set story text with safety check
        const storyElement = document.getElementById('story');
        if (storyElement) {
            if (typeof MESSAGES !== 'undefined' && MESSAGES.STORY && MESSAGES.STORY.INTRO) {
                storyElement.textContent = MESSAGES.STORY.INTRO;
            } else {
                storyElement.textContent = 'Welcome to the Buried Spire of Kuwait. Navigate the darkness and find the stairs to descend deeper.';
                console.warn('⚠️ MESSAGES.STORY.INTRO not available, using fallback text');
            }
        }
        
        // Set checkpoint with safety check
        const checkpointElement = document.getElementById('checkpoint');
        if (checkpointElement) {
            checkpointElement.textContent = '1'; // Checkpoint 1 for floor 1
        }
        
        console.log('🎮 Game started - Floor 1');
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
        console.log(`🔄 Respawning at checkpoint floor ${this.game.checkpoint}...`);
        
        // Add death marker at current location
        this.game.player.deathMarkers.push({
            x: this.game.player.x,
            y: this.game.player.y,
            floor: this.game.floor
        });
        
        // Reset to checkpoint floor
        this.game.floor = this.game.checkpoint;
        this.game.player.light = 75; // Give some light at respawn
        
        // IMPORTANT: Clear ALL swarm-related state
        this.game.swarming = false;
        this.game.swarmTimer = 0;
        this.game.darknessFade = 0;
        this.game.deathScreen = false;
        
        // Clear powers and reset player state
        this.game.player.powers = { phase: 0, regeneration: 0, reveal: 0 };
        this.game.player.lightRadius = CONFIG.PLAYER.LIGHT_RADIUS;
        
        // Regenerate the checkpoint floor
        if (typeof MapGenerator !== 'undefined' && MapGenerator.generateFloor) {
            try {
                MapGenerator.generateFloor(this.game, this.game.floor);
                
                // Ensure player is positioned at the start of the floor (bottom-left area)
                const cellSize = CONFIG.MAP.CELL_SIZE || 40;
                this.game.player.x = cellSize + cellSize / 2; // Left side
                this.game.player.y = (this.game.mapHeight - 2) * cellSize + cellSize / 2; // Bottom
                
                // Reset ALL ghouls to normal state after respawn
                for (const ghoul of this.game.ghouls) {
                    ghoul.state = 'patrol';
                    ghoul.speed = 2; // Reset to normal speed
                }
                
                // Update camera to follow player
                if (typeof Utils !== 'undefined' && Utils.updateCamera) {
                    Utils.updateCamera(this.game);
                }
                
                console.log(`✅ Respawned at checkpoint floor ${this.game.floor} at position (${this.game.player.x}, ${this.game.player.y})`);
                console.log(`🔄 Reset ${this.game.ghouls.length} ghouls to normal state`);
            } catch (error) {
                console.warn('⚠️ Failed to generate checkpoint floor:', error);
            }
        }
        
        // Update UI
        const checkpointElement = document.getElementById('checkpoint');
        if (checkpointElement) {
            // Calculate and display the correct checkpoint number
            const checkpointNumber = Math.ceil(Math.abs(this.game.checkpoint) / 5);
            checkpointElement.textContent = checkpointNumber;
        }
        
        // Show respawn message
        const storyElement = document.getElementById('story');
        if (storyElement) {
            if (typeof MESSAGES !== 'undefined' && MESSAGES.STORY && MESSAGES.STORY.RESPAWN) {
                storyElement.textContent = MESSAGES.STORY.RESPAWN;
            } else {
                storyElement.textContent = `Respawned at checkpoint floor ${this.game.floor}. The darkness claimed you, but you persist.`;
            }
        }
    },

    // Update statistics with deltaTime
    updateStats(deltaTime) {
        if (!this.game) {
            console.warn('⚠️ Game object is null/undefined in updateStats');
            return;
        }
        
        this.stats.totalPlayTime += deltaTime;
        
        // Only update survival time when playing
        if (this.game.state === 'playing') {
            this.game.survivalTime += deltaTime;
        }
        
        // Track distance traveled
        const player = this.game.player;
        if (player && player.lastPosition) {
            const lastPos = player.lastPosition;
            const distance = Math.sqrt(
                Math.pow(player.x - lastPos.x, 2) + 
                Math.pow(player.y - lastPos.y, 2)
            );
            
            if (distance > 0) {
                this.stats.totalDistanceTraveled += distance;
                this.game.distanceTraveled += distance;
                player.lastPosition = { x: player.x, y: player.y };
            }
        }
        
        // Update deepest floor
        if (this.game.floor > this.stats.deepestFloor) {
            this.stats.deepestFloor = this.game.floor;
        }
        
        // Check achievements
        this.checkAchievements();
    },

    // Check and unlock achievements
    checkAchievements() {
        const newAchievements = [];
        
        // First death
        if (this.stats.totalDeaths >= 1 && !this.stats.achievements.has('first_death')) {
            newAchievements.push('first_death');
        }
        
        // Orb collector
        if (this.game.player.orbsCollected >= 10 && !this.stats.achievements.has('orb_collector')) {
            newAchievements.push('orb_collector');
        }
        
        // Deep explorer
        if (this.game.floor >= 25 && !this.stats.achievements.has('deep_explorer')) {
            newAchievements.push('deep_explorer');
        }
        
        // Ghoul slayer
        if (this.stats.totalGhoulsDefeated >= 50 && !this.stats.achievements.has('ghoul_slayer')) {
            newAchievements.push('ghoul_slayer');
        }
        
        // Marathon runner (30 minutes = 1,800,000 ms)
        if (this.stats.totalPlayTime >= 1800000 && !this.stats.achievements.has('marathon_runner')) {
            newAchievements.push('marathon_runner');
        }
        
        // Survivor (5 minutes = 300,000 ms)
        if (this.game.survivalTime >= 300000 && !this.stats.achievements.has('survivor')) {
            newAchievements.push('survivor');
        }
        
        // Explorer
        if (this.stats.totalDistanceTraveled >= 10000 && !this.stats.achievements.has('explorer')) {
            newAchievements.push('explorer');
        }
        
        // Persistent
        if (this.stats.gamesPlayed >= 10 && !this.stats.achievements.has('persistent')) {
            newAchievements.push('persistent');
        }
        
        // Completionist
        if (this.game.floor >= 50 && !this.stats.achievements.has('completionist')) {
            newAchievements.push('completionist');
        }
        
        // Unlock new achievements
        newAchievements.forEach(achievementId => {
            this.stats.achievements.add(achievementId);
            this.showAchievementUnlocked(achievementId);
        });
        
        if (newAchievements.length > 0) {
            this.saveStats();
        }
    },

    // Show achievement unlocked notification
    showAchievementUnlocked(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-weight: bold;
            animation: achievementSlide 0.5s ease-out;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${achievement.icon}</span>
                <div>
                    <div style="font-size: 16px;">Achievement Unlocked!</div>
                    <div style="font-size: 14px; margin-top: 2px;">${achievement.name}</div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">${achievement.description}</div>
                </div>
            </div>
        `;
        
        // Add animation CSS if not already added
        if (!document.getElementById('achievementStyles')) {
            const style = document.createElement('style');
            style.id = 'achievementStyles';
            style.textContent = `
                @keyframes achievementSlide {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'achievementSlide 0.5s ease-in reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 500);
            }
        }, 4000);
        
        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
    },

    // Record player death
    recordDeath() {
        this.stats.totalDeaths++;
        this.saveStats();
    },

    // Record orb collection
    recordOrbCollection() {
        this.stats.totalOrbsCollected++;
        this.game.player.orbsCollected++;
    },

    // Record ghoul defeat
    recordGhoulDefeat() {
        this.stats.totalGhoulsDefeated++;
        this.game.ghoulsDefeated++;
    },

    // Record game completion
    recordGameCompletion() {
        const completionTime = Date.now() - this.game.gameStartTime;
        
        if (!this.stats.fastestCompletion || completionTime < this.stats.fastestCompletion) {
            this.stats.fastestCompletion = completionTime;
        }
        
        // Speed runner achievement (10 minutes = 600,000 ms)
        if (completionTime <= 600000 && !this.stats.achievements.has('speed_runner')) {
            this.stats.achievements.add('speed_runner');
            this.showAchievementUnlocked('speed_runner');
        }
        
        this.saveStats();
    },

    // Get formatted statistics
    getFormattedStats() {
        const formatTime = (ms) => {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        return {
            totalPlayTime: formatTime(this.stats.totalPlayTime),
            gamesPlayed: this.stats.gamesPlayed,
            deepestFloor: `-${this.stats.deepestFloor}`,
            totalOrbsCollected: this.stats.totalOrbsCollected,
            totalGhoulsDefeated: this.stats.totalGhoulsDefeated,
            totalDistanceTraveled: Math.round(this.stats.totalDistanceTraveled),
            totalDeaths: this.stats.totalDeaths,
            fastestCompletion: this.stats.fastestCompletion ? formatTime(this.stats.fastestCompletion) : 'N/A',
            achievementsUnlocked: this.stats.achievements.size,
            totalAchievements: Object.keys(this.achievements).length
        };
    },

    // Load statistics from localStorage
    loadStats() {
        try {
            const saved = localStorage.getItem('buriedSpireStats');
            if (saved) {
                const parsedStats = JSON.parse(saved);
                this.stats = {
                    ...this.stats,
                    ...parsedStats,
                    achievements: new Set(parsedStats.achievements || [])
                };
            }
        } catch (error) {
            console.warn('Failed to load stats:', error);
        }
    },

    // Save statistics to localStorage
    saveStats() {
        try {
            const statsToSave = {
                ...this.stats,
                achievements: Array.from(this.stats.achievements)
            };
            localStorage.setItem('buriedSpireStats', JSON.stringify(statsToSave));
        } catch (error) {
            console.warn('Failed to save stats:', error);
        }
    },

    // Save game progress
    saveGame() {
        try {
            const gameToSave = {
                ...this.game,
                explored: Array.from(this.game.explored)
            };
            localStorage.setItem('buriedSpireGame', JSON.stringify(gameToSave));
            console.log('Game saved');
        } catch (error) {
            console.warn('Failed to save game:', error);
        }
    },

    // Load game progress
    loadGame() {
        try {
            const saved = localStorage.getItem('buriedSpireGame');
            if (saved) {
                const parsedGame = JSON.parse(saved);
                this.game = {
                    ...parsedGame,
                    explored: new Set(parsedGame.explored || [])
                };
                console.log('Game loaded');
                return true;
            }
        } catch (error) {
            console.warn('Failed to load game:', error);
        }
        return false;
    },

    // Get current game state
    getGame() {
        return this.game;
    },

    setGame(gameData) {
        this.game = gameData;
    },

    // Save checkpoint
    saveCheckpoint() {
        this.game.checkpoint = this.game.floor;
        this.saveGame();
        console.log(`Checkpoint saved at floor ${this.game.floor}`);
    },

    // Load game from checkpoint
    loadCheckpoint() {
        try {
            const savedGame = this.loadGame();
            if (savedGame && savedGame.checkpoint) {
                this.game.floor = savedGame.checkpoint;
                this.game.player.light = 75; // Restore some light at checkpoint
                MapGenerator.generateFloor(this.game, this.game.floor);
                console.log(`Loaded checkpoint at floor ${this.game.floor}`);
            }
        } catch (error) {
            console.error('Failed to load checkpoint:', error);
        }
    }
}; 