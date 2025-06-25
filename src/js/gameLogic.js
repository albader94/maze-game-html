// Main Game Logic Controller
const GameLogic = {
    errorHandler: {
        errors: [],
        maxErrors: 10,
        
        // Log error with context
        logError(error, context = '') {
            try {
                const timestamp = new Date().toISOString();
                const errorInfo = {
                    timestamp,
                    context,
                    message: error && error.message ? error.message : String(error),
                    stack: error && error.stack ? error.stack : 'No stack trace available',
                    gameState: this.getGameStateSnapshot()
                };
                
                this.errors.push(errorInfo);
                
                // Keep only last 50 errors
                if (this.errors.length > 50) {
                    this.errors.shift();
                }
                
                console.error('Game Error:', {
                    context: errorInfo.context,
                    message: errorInfo.message,
                    timestamp: errorInfo.timestamp
                });
                
                // Show user-friendly error message for critical errors
                if (this.isCriticalError(error)) {
                    this.showErrorMessage(errorInfo.message);
                }
            } catch (logError) {
                // Fallback error logging if main error logging fails
                console.error('Error in error handler:', logError.message || String(logError));
                console.error('Original error:', error && error.message ? error.message : String(error));
            }
        },
        
        // Check if error is critical
        isCriticalError(error) {
            try {
                const criticalPatterns = [
                    'Cannot read property',
                    'Cannot access before initialization',
                    'is not a function',
                    'Network Error'
                ];
                
                return criticalPatterns.some(pattern => 
                    error.message && error.message.includes(pattern)
                );
            } catch (e) {
                console.error('Error checking if error is critical:', e);
                return false;
            }
        },
        
        // Show error message to user
        showErrorMessage(message) {
            try {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 0, 0, 0.9);
                    color: white;
                    padding: 15px;
                    border-radius: 5px;
                    z-index: 10000;
                    max-width: 300px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                `;
                errorDiv.textContent = `Error: ${message}`;
                
                document.body.appendChild(errorDiv);
                
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.parentNode.removeChild(errorDiv);
                    }
                }, 5000);
            } catch (e) {
                console.error('Error showing error message:', e);
            }
        },
        
        // Get game state snapshot for debugging
        getGameStateSnapshot() {
            try {
                if (typeof GameState === 'undefined' || !GameState.getGame) {
                    return { error: 'GameState not available' };
                }
                
                const game = GameState.getGame();
                if (!game) {
                    return { error: 'Game object is null' };
                }
                
                return {
                    state: game.state || 'unknown',
                    floor: game.floor || 0,
                    playerPos: game.player ? { x: game.player.x, y: game.player.y } : { x: 0, y: 0 },
                    playerLight: game.player ? game.player.light : 0,
                    ghoulCount: game.ghouls ? game.ghouls.length : 0,
                    orbCount: game.orbs ? game.orbs.length : 0,
                    particleCount: game.particles ? game.particles.length : 0
                };
            } catch (e) {
                return { error: 'Could not capture game state: ' + e.message };
            }
        },
        
        // Get error report
        getErrorReport() {
            try {
                return {
                    errorCount: this.errors.length,
                    recentErrors: this.errors.slice(-5),
                    performance: typeof Utils !== 'undefined' && Utils.getPerformanceReport ? Utils.getPerformanceReport() : null,
                    device: typeof InputManager !== 'undefined' && InputManager.getDeviceInfo ? InputManager.getDeviceInfo() : null
                };
            } catch (e) {
                return { error: 'Could not generate error report: ' + e.message };
            }
        }
    },

    // Initialize game logic with error handling
    init() {
        try {
            console.log('🎮 Initializing GameLogic...');
            
            // Set up global error handler
            window.addEventListener('error', (e) => {
                this.errorHandler.logError(e.error, 'Global Error');
            });
            
            window.addEventListener('unhandledrejection', (e) => {
                this.errorHandler.logError(e.reason, 'Unhandled Promise Rejection');
            });
            
            // Validate that required systems are available
            this.validateSystems();
            
            // Validate configuration
            this.validateConfig();
            
            console.log('✅ GameLogic initialized successfully');
            
        } catch (error) {
            this.errorHandler.logError(error, 'Game Initialization');
            throw error; // Re-throw to prevent broken initialization
        }
    },

    // Validate that required systems are available
    validateSystems() {
        const requiredSystems = [
            { name: 'CONFIG', obj: typeof CONFIG !== 'undefined' && CONFIG },
            { name: 'GameState', obj: typeof GameState !== 'undefined' && GameState },
            { name: 'InputManager', obj: typeof InputManager !== 'undefined' && InputManager },
            { name: 'Renderer', obj: typeof Renderer !== 'undefined' && Renderer },
            { name: 'Utils', obj: typeof Utils !== 'undefined' && Utils }
        ];

        const missingSystems = requiredSystems.filter(system => !system.obj);
        
        if (missingSystems.length > 0) {
            const missingNames = missingSystems.map(s => s.name).join(', ');
            throw new Error(`Missing required systems: ${missingNames}`);
        }
        
        console.log('✓ All required systems are available');
    },

    // Validate configuration
    validateConfig() {
        const requiredConfigs = [
            'CANVAS.WIDTH', 'CANVAS.HEIGHT',
            'PLAYER.SPEED', 'PLAYER.SIZE',
            'MAP.CELL_SIZE', 'MAP.MIN_SIZE'
        ];

        requiredConfigs.forEach(path => {
            const value = this.getNestedProperty(CONFIG, path);
            if (value === undefined || value === null) {
                throw new Error(`Missing required config: ${path}`);
            }
        });
    },

    // Get nested property safely
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => 
            current && current[key] !== undefined ? current[key] : undefined, obj);
    },

    // Update game with error handling
    update(deltaTime) {
        try {
            // Validate deltaTime
            if (typeof deltaTime !== 'number' || deltaTime < 0 || deltaTime > 1000) {
                console.warn('Invalid deltaTime:', deltaTime);
                return; // Skip this frame
            }
            
            Utils.startPerformanceTimer('update');
            
            const game = GameState.getGame();
            if (!this.validateGameState(game)) {
                console.warn('Invalid game state detected, attempting recovery...');
                this.handleGameplayError(new Error('Invalid game state detected'));
                return;
            }
            
            // Check if game is paused - if so, skip all gameplay updates
            const isPaused = (typeof Main !== 'undefined' && Main.isPaused) || false;
            
            if (game.state === 'playing' && !game.deathScreen && !game.showHelp && !isPaused) {
                this.updateGameplay(game, deltaTime);
            }
            
            // Update statistics if playing (but not if paused)
            if (game.state === 'playing' && !isPaused) {
                GameState.updateStats(deltaTime);
            }
            
            Utils.endPerformanceTimer('update');
            Utils.updatePerformanceMetrics(deltaTime);
            
        } catch (error) {
            this.errorHandler.logError(error, 'Game Update');
            this.handleGameplayError(error);
        }
    },

    // Validate game state
    validateGameState(game) {
        try {
            if (!game) {
                console.warn('Game object is null or undefined');
                return false;
            }
            
            if (!game.player) {
                console.warn('Game player object is missing');
                return false;
            }
            
            if (typeof game.player.x !== 'number' || typeof game.player.y !== 'number') {
                console.warn('Player position is invalid - not numbers:', {
                    x: game.player.x, 
                    y: game.player.y,
                    xType: typeof game.player.x,
                    yType: typeof game.player.y
                });
                return false;
            }
            
            if (isNaN(game.player.x) || isNaN(game.player.y)) {
                console.warn('Player position contains NaN:', {
                    x: game.player.x, 
                    y: game.player.y
                });
                return false;
            }
            
            if (!isFinite(game.player.x) || !isFinite(game.player.y)) {
                console.warn('Player position is not finite:', {
                    x: game.player.x, 
                    y: game.player.y
                });
                return false;
            }
            
            if (!Array.isArray(game.ghouls)) {
                console.warn('Game ghouls is not an array');
                return false;
            }
            
            if (!Array.isArray(game.orbs)) {
                console.warn('Game orbs is not an array');
                return false;
            }
            
            if (!Array.isArray(game.particles)) {
                console.warn('Game particles is not an array');
                return false;
            }
            
            if (!Array.isArray(game.walls)) {
                console.warn('Game walls is not an array');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('Error validating game state:', e);
            return false;
        }
    },

    // Handle gameplay errors gracefully
    handleGameplayError(error) {
        console.warn('Handling gameplay error:', error.message);
        
        const game = GameState.getGame();
        if (!game) {
            console.error('Cannot handle gameplay error: game object is null');
            return;
        }
        
        // Try to recover from common errors
        if (error.message.includes('player') || error.message.includes('position') || error.message.includes('Invalid game state')) {
            this.recoverPlayerState(game);
        } else if (error.message.includes('entities') || error.message.includes('ghouls') || error.message.includes('orbs')) {
            this.recoverEntityStates(game);
        } else if (error.message.includes('render') || error.message.includes('gradient')) {
            // For rendering errors, try to reset player light radius
            if (game.player) {
                game.player.lightRadius = CONFIG.PLAYER.LIGHT_RADIUS || 150;
                console.log('Reset player light radius due to rendering error');
            }
        } else {
            // For severe errors, pause the game
            this.isPaused = true;
            this.errorHandler.showErrorMessage('Game paused due to error. Press R to restart.');
        }
    },

    // Recover player state
    recoverPlayerState(game) {
        try {
            console.log('Attempting to recover player state...');
            
            // If player object is missing or invalid, recreate it
            if (!game.player || typeof game.player !== 'object') {
                console.warn('Player object missing, recreating...');
                game.player = {};
            }
            
            // Ensure all required player properties exist with valid values
            const playerDefaults = {
                x: CONFIG.PLAYER.START_X || 100,
                y: CONFIG.PLAYER.START_Y || 100,
                speed: CONFIG.PLAYER.SPEED || 3,
                light: CONFIG.PLAYER.MAX_LIGHT || 100,
                maxLight: CONFIG.PLAYER.MAX_LIGHT || 100,
                lightRadius: CONFIG.PLAYER.LIGHT_RADIUS || 150,
                size: CONFIG.PLAYER.SIZE || 15,
                orbsCollected: 0,
                inventory: [null, null, null],
                selectedSlot: 0,
                deathMarkers: [],
                lastPosition: { x: 100, y: 100 },
                survivalTime: 0,
                powers: { phase: 0, regeneration: 0, reveal: 0 }
            };
            
            // Apply defaults for missing or invalid properties
            for (const [key, defaultValue] of Object.entries(playerDefaults)) {
                if (game.player[key] === undefined || game.player[key] === null) {
                    game.player[key] = defaultValue;
                    console.log(`Reset player.${key} to default:`, defaultValue);
                } else if (key === 'x' || key === 'y') {
                    // Special handling for coordinates
                    if (typeof game.player[key] !== 'number' || !isFinite(game.player[key])) {
                        game.player[key] = defaultValue;
                        console.log(`Fixed invalid player.${key}:`, defaultValue);
                    }
                }
            }
            
            // Ensure arrays are actually arrays
            if (!Array.isArray(game.player.inventory)) {
                game.player.inventory = [null, null, null];
            }
            if (!Array.isArray(game.player.deathMarkers)) {
                game.player.deathMarkers = [];
            }
            
            // Ensure powers object exists
            if (!game.player.powers || typeof game.player.powers !== 'object') {
                game.player.powers = { phase: 0, regeneration: 0, reveal: 0 };
            }
            
            console.log('✅ Player state recovered successfully');
            console.log('Player position:', game.player.x, game.player.y);
            
        } catch (e) {
            console.error('Failed to recover player state:', e);
            this.errorHandler.logError(e, 'Player Recovery');
        }
    },

    // Recover entity states
    recoverEntityStates(game) {
        try {
            if (!Array.isArray(game.ghouls)) game.ghouls = [];
            if (!Array.isArray(game.orbs)) game.orbs = [];
            if (!Array.isArray(game.particles)) game.particles = [];
            if (!Array.isArray(game.walls)) game.walls = [];
            
            // Remove invalid entities
            game.ghouls = game.ghouls.filter(g => g && typeof g.x === 'number' && typeof g.y === 'number');
            game.orbs = game.orbs.filter(o => o && typeof o.x === 'number' && typeof o.y === 'number');
            game.particles = game.particles.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
            
            console.log('Entity states recovered');
        } catch (e) {
            this.errorHandler.logError(e, 'Entity Recovery');
        }
    },

    // Update gameplay with error boundaries
    updateGameplay(game, deltaTime) {
        // Update player with error handling
        this.safeUpdate(() => this.updatePlayer(game, deltaTime), 'Player Update');
        
        // Update entities with error handling
        this.safeUpdate(() => this.updateEntities(game, deltaTime), 'Entity Update');
        
        // Update physics with error handling
        this.safeUpdate(() => this.updatePhysics(game), 'Physics Update');
        
        // Update game logic with error handling
        this.safeUpdate(() => this.updateGameRules(game, deltaTime), 'Game Rules Update');
    },

    // Safe update wrapper
    safeUpdate(updateFn, context) {
        try {
            updateFn();
        } catch (error) {
            this.errorHandler.logError(error, context);
            // Continue execution for non-critical errors
        }
    },

    // Update player
    updatePlayer(game, deltaTime) {
        const movement = InputManager.getMovementInput();
        
        // Validate movement input
        if (typeof movement.x !== 'number' || typeof movement.y !== 'number') {
            throw new Error('Invalid movement input');
        }
        
        // Apply movement
        if (movement.x !== 0 || movement.y !== 0) {
            const newX = game.player.x + movement.x * game.player.speed * deltaTime / 16;
            const newY = game.player.y + movement.y * game.player.speed * deltaTime / 16;
            
            // Validate new position
            if (this.isValidPosition(newX, newY, game)) {
                game.player.x = newX;
                game.player.y = newY;
                Utils.markExplored(game);
            }
        }
        
        // Update player powers with validation
        this.updatePlayerPowers(game, deltaTime);
        
        // Calculate light depletion rate based on ghoul presence
        let lightDepletionRate = CONFIG.LIGHT.DEPLETION_RATE;
        
        // Count stalking ghouls nearby
        let stalkingGhouls = 0;
        for (const ghoul of game.ghouls) {
            const distToPlayer = Utils.distance(ghoul, game.player);
            if (ghoul.state === 'stalking' && distToPlayer < game.player.lightRadius * 1.5) {
                stalkingGhouls++;
            }
        }
        
        // Increase light depletion based on stalking ghouls
        if (stalkingGhouls > 0) {
            // Each stalking ghoul increases depletion by 50%
            lightDepletionRate *= (1 + (stalkingGhouls * 0.5));
            console.log(`⚡ ${stalkingGhouls} ghouls stalking - increased light depletion: ${lightDepletionRate.toFixed(3)}`);
        }
        
        // Update light with bounds checking
        if (game.player.powers.regeneration > 0) {
            game.player.light = Math.min(100, game.player.light + 0.5);
        } else {
            game.player.light = Math.max(0, game.player.light - lightDepletionRate * deltaTime / 16);
        }
        
        // Update light radius based on current light level (dynamic radius)
        const baseLightRadius = CONFIG.PLAYER.LIGHT_RADIUS || 150;
        const lightPercentage = game.player.light / 100;
        
        // Light radius scales from 30% to 100% of base radius based on light level
        const minRadiusPercent = 0.3;
        const radiusScale = minRadiusPercent + (lightPercentage * (1 - minRadiusPercent));
        game.player.lightRadius = Math.floor(baseLightRadius * radiusScale);
        
        // Light depletion handling is done in updateGameRules() to allow for lifeline logic
    },

    // Validate position
    isValidPosition(x, y, game) {
        if (!Utils.isInBounds(x, y, game)) return false;
        
        // Allow walking through walls when phase power is active
        if (game.player.powers.phase > 0) {
            return true;
        }
        
        // Check wall collisions - walls are positioned at their center
        for (const wall of game.walls) {
            const dx = x - wall.x;
            const dy = y - wall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Player size + wall collision radius (walls are 30x30, so radius ~12 for tighter collision)
            if (distance < game.player.size + 12) {
                return false;
            }
        }
        
        return true;
    },

    // Update player powers
    updatePlayerPowers(game, deltaTime) {
        // Update powers like in original game
        if (game.player.powers.phase > 0) {
            game.player.powers.phase--;
            
            // Check if phase is about to end while player is in a wall
            if (game.player.powers.phase === 1) {
                let inWall = false;
                for (const wall of game.walls) {
                    if (Utils.distance(game.player, wall) < 25) {
                        inWall = true;
                        break;
                    }
                }
                
                // If ending in wall, find nearest safe spot
                if (inWall) {
                    let bestX = game.player.x;
                    let bestY = game.player.y;
                    let bestDist = Infinity;
                    
                    // Check surrounding areas for safe spot
                    for (let dx = -80; dx <= 80; dx += 20) {
                        for (let dy = -80; dy <= 80; dy += 20) {
                            const testX = game.player.x + dx;
                            const testY = game.player.y + dy;
                            let safe = true;
                            
                            // Check if this position is safe
                            for (const wall of game.walls) {
                                if (Utils.distance({ x: testX, y: testY }, wall) < 25) {
                                    safe = false;
                                    break;
                                }
                            }
                            
                            if (safe) {
                                const dist = Math.abs(dx) + Math.abs(dy);
                                if (dist < bestDist) {
                                    bestDist = dist;
                                    bestX = testX;
                                    bestY = testY;
                                }
                            }
                        }
                    }
                    
                    game.player.x = bestX;
                    game.player.y = bestY;
                }
            }
        }
        
        if (game.player.powers.regeneration > 0) {
            game.player.powers.regeneration--;
            game.player.light = Math.min(game.player.light + 0.1, game.player.maxLight);
        }
        
        if (game.player.powers.reveal > 0) {
            game.player.powers.reveal--;
        }
    },

    // Update entities
    updateEntities(game, deltaTime) {
        // Clear spatial grid
        Utils.clearSpatialGrid();
        
        // Add walls to spatial grid
        game.walls.forEach(wall => Utils.addToSpatialGrid(wall, 'walls'));
        
        // Update orb pulse animations
        for (const orb of game.orbs) {
            if (!orb.collected) {
                orb.pulse += 0.1;
            }
        }
        
        // Update ghouls
        this.updateGhouls(game, deltaTime);
        
        // Update particles
        this.updateParticles(game, deltaTime);
        
        // Check orb collection
        this.checkOrbCollection(game);
    },

    // Update ghouls with improved AI and defeat mechanism
    updateGhouls(game, deltaTime) {
        for (const ghoul of game.ghouls) {
            const distToPlayer = Utils.distance(ghoul, game.player);
            
            if (game.swarming) {
                // During swarm - move directly toward player
                const angle = Math.atan2(game.player.y - ghoul.y, game.player.x - ghoul.x);
                ghoul.x += Math.cos(angle) * ghoul.speed;
                ghoul.y += Math.sin(angle) * ghoul.speed;
            } else if (distToPlayer < game.player.lightRadius * 0.6) {
                // Flee from bright light
                const angle = Math.atan2(ghoul.y - game.player.y, ghoul.x - game.player.x);
                ghoul.x += Math.cos(angle) * ghoul.speed * 2;
                ghoul.y += Math.sin(angle) * ghoul.speed * 2;
                ghoul.state = 'fleeing';
            } else if (distToPlayer < game.player.lightRadius * 1.2) {
                // Stalk in dim light
                const angle = Math.atan2(game.player.y - ghoul.y, game.player.x - ghoul.x);
                ghoul.x += Math.cos(angle) * ghoul.speed * 0.7;
                ghoul.y += Math.sin(angle) * ghoul.speed * 0.7;
                ghoul.state = 'stalking';
            } else {
                // Patrol behavior
                if (!ghoul.patrolTarget || Utils.distance(ghoul, ghoul.patrolTarget) < 20) {
                    ghoul.patrolTarget = { 
                        x: Math.random() * game.mapWidth * 40, 
                        y: Math.random() * game.mapHeight * 40 
                    };
                }
                const angle = Math.atan2(ghoul.patrolTarget.y - ghoul.y, ghoul.patrolTarget.x - ghoul.x);
                ghoul.x += Math.cos(angle) * ghoul.speed;
                ghoul.y += Math.sin(angle) * ghoul.speed;
                ghoul.state = 'patrol';
            }
            
            // Ghoul damage to player when close but not in bright light
            if (!game.swarming && distToPlayer < 30 && distToPlayer > game.player.lightRadius * 0.8) {
                game.player.light -= 0.3;
                game.player.light = Math.max(0, game.player.light);
            }
        }
    },

    // Update particles with pooling
    updateParticles(game, deltaTime) {
        for (let i = game.particles.length - 1; i >= 0; i--) {
            try {
                const particle = game.particles[i];
                
                particle.x += particle.vx * deltaTime / 16;
                particle.y += particle.vy * deltaTime / 16;
                particle.life -= deltaTime / 16;
                
                if (particle.life <= 0) {
                    // Return to pool and remove from active list
                    Utils.returnToPool('particlePool', particle);
                    game.particles.splice(i, 1);
                }
            } catch (error) {
                this.errorHandler.logError(error, `Particle Update ${i}`);
                game.particles.splice(i, 1);
            }
        }
    },

    // Check orb collection
    checkOrbCollection(game) {
        for (let i = game.orbs.length - 1; i >= 0; i--) {
            try {
                const orb = game.orbs[i];
                const dist = Utils.distance(orb, game.player);
                
                if (dist < game.player.size + orb.size) {
                    // Try to collect orb using EntityManager
                    const collected = EntityManager.collectOrb(game, orb);
                    
                    if (collected) {
                        // Only remove and create particles if successfully collected
                        Utils.createCircularParticles(game, orb.x, orb.y, orb.color, 15, 6);
                        game.orbs.splice(i, 1);
                        
                        // Track statistics
                        GameState.recordOrbCollection();
                    }
                }
            } catch (error) {
                this.errorHandler.logError(error, `Orb Collection ${i}`);
                game.orbs.splice(i, 1);
            }
        }
    },

    // Update physics (placeholder for future physics system)
    updatePhysics(game) {
        // Future: Add collision resolution, physics simulation, etc.
    },

    // Update game rules
    updateGameRules(game, deltaTime) {
        // Check stairs detection - use same logic as original
        if (game.stairs && Utils.distance(game.player, game.stairs) < 40) {
            console.log(`🚪 Player using stairs to go from floor ${game.floor} to ${game.floor + 1}`);
            
            game.floor++;
            if (game.floor >= 50) {
                game.victory = true;
                GameState.recordGameCompletion();
            } else {
                if (game.floor % 5 === 0) {
                    game.checkpoint = game.floor;
                    GameState.saveCheckpoint();
                }
                
                // IMPORTANT: Set level entry inventory BEFORE generating new floor
                // This represents what the player has when they ENTER the new level
                game.levelEntryInventory = [...game.player.inventory];
                console.log(`🎒 Level entry inventory set for floor ${game.floor}:`, game.levelEntryInventory);
                
                MapGenerator.generateFloor(game);
                game.player.light = Math.min(game.player.light + 30, 100);
            }
        }
        
        // Handle light depletion and swarm mechanics - trigger immediately when light hits 0
        if (game.player.light <= 0 && !game.swarming && !game.deathScreen) {
            // Check for lifeline orb first
            let hasLifeline = false;
            let lifelineSlot = -1;
            
            for (let i = 0; i < 3; i++) {
                if (game.player.inventory[i] === 'red') {
                    hasLifeline = true;
                    lifelineSlot = i;
                    break;
                }
            }
            
            if (hasLifeline) {
                // Auto-use lifeline immediately - stay in same position and level
                game.player.light = 100;
                game.player.inventory[lifelineSlot] = null;
                
                // Update inventory display
                if (typeof InventoryManager !== 'undefined' && InventoryManager.updateDisplay) {
                    InventoryManager.updateDisplay();
                }
                
                // Create dramatic revival effect
                if (typeof Utils !== 'undefined' && Utils.createCircularParticles) {
                    Utils.createCircularParticles(game, game.player.x, game.player.y, '#f44336', 30, 8);
                }
                
                // Temporary light boost effect
                game.player.lightRadius = 250;
                setTimeout(() => game.player.lightRadius = CONFIG.PLAYER.LIGHT_RADIUS || 150, 500);
                
                // Show lifeline message
                const storyElement = document.getElementById('story');
                if (storyElement) {
                    if (typeof MESSAGES !== 'undefined' && MESSAGES.STORY && MESSAGES.STORY.LIFELINE_AUTO) {
                        storyElement.textContent = MESSAGES.STORY.LIFELINE_AUTO;
                    } else {
                        storyElement.textContent = 'Lifeline orb activated! Light restored automatically.';
                    }
                }
                
                console.log('🔴 Lifeline orb auto-used, light restored to 100');
            } else {
                // No lifeline available - start the swarm sequence immediately
                console.log('💀 No lifeline available, starting swarm sequence');
                this.startSwarmSequence(game);
            }
        }
        
        // Handle swarm timer and effects
        if (game.swarming && game.swarmTimer > 0) {
            game.swarmTimer--;
            
            // Create black fade effect during final 2 seconds (longer fade)
            if (game.swarmTimer < 120) {
                game.darknessFade = Math.min(1, 1 - (game.swarmTimer / 120));
            }
            
            if (game.swarmTimer <= 0) {
                // Show death screen after swarm completes
                game.deathScreen = true;
                game.swarming = false;
                game.darknessFade = 0;
                GameState.recordDeath();
                console.log('💀 Swarm completed, showing death screen');
            }
        }
        
        // Update camera
        Utils.updateCamera(game);
        
        // Update UI
        Utils.updateUI(game);
    },

    // Start swarm sequence when light depletes
    startSwarmSequence(game) {
        console.log('🌊 Starting swarm sequence...');
        
        game.swarming = true;
        game.swarmTimer = 300; // 5 seconds at 60fps
        
        // Show swarm message
        const storyElement = document.getElementById('story');
        if (storyElement) {
            if (typeof MESSAGES !== 'undefined' && MESSAGES.STORY && MESSAGES.STORY.DARKNESS_CONSUMES) {
                storyElement.textContent = MESSAGES.STORY.DARKNESS_CONSUMES;
            } else {
                storyElement.textContent = 'The darkness consumes you! Ghouls swarm from all directions!';
            }
        }
        
        // Alert all existing ghouls and make them faster
        for (const ghoul of game.ghouls) {
            ghoul.state = 'swarming';
            ghoul.speed *= 2.5;
        }
        
        // Spawn dramatic edge ghouls for swarm effect
        const canvas = document.getElementById('gameCanvas');
        const canvasWidth = canvas ? canvas.width : 800;
        const canvasHeight = canvas ? canvas.height : 600;
        
        for (let i = 0; i < 8; i++) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: // Top
                    x = Math.random() * canvasWidth + (game.camera ? game.camera.x : 0);
                    y = (game.camera ? game.camera.y : 0) - 20;
                    break;
                case 1: // Right
                    x = (game.camera ? game.camera.x : 0) + canvasWidth + 20;
                    y = Math.random() * canvasHeight + (game.camera ? game.camera.y : 0);
                    break;
                case 2: // Bottom
                    x = Math.random() * canvasWidth + (game.camera ? game.camera.x : 0);
                    y = (game.camera ? game.camera.y : 0) + canvasHeight + 20;
                    break;
                case 3: // Left
                    x = (game.camera ? game.camera.x : 0) - 20;
                    y = Math.random() * canvasHeight + (game.camera ? game.camera.y : 0);
                    break;
            }
            
            game.ghouls.push({
                x: x,
                y: y,
                speed: 4,
                state: 'swarming',
                size: 15,
                patrolTarget: { x: game.player.x, y: game.player.y }
            });
        }
        
        console.log(`🌊 Swarm started: ${game.ghouls.length} total ghouls, timer: ${game.swarmTimer}`);
    },

    // Proceed to next floor
    proceedToNextFloor(game) {
        try {
            game.floor--;
            
            // Save checkpoint every 5 floors
            if (game.floor % 5 === 0) {
                GameState.saveCheckpoint();
            }
            
            // Generate new floor
            MapGenerator.generateFloor(game);
            
            // Create floor transition effect
            Utils.createCircularParticles(game, game.player.x, game.player.y, '#00ff00', 30, 8);
            
        } catch (error) {
            this.errorHandler.logError(error, 'Floor Transition');
            // Fallback: regenerate current floor
            MapGenerator.generateFloor(game);
        }
    },

    // Render game with error handling
    render() {
        try {
            Utils.startPerformanceTimer('render');
            Renderer.render();
            Utils.endPerformanceTimer('render');
        } catch (error) {
            this.errorHandler.logError(error, 'Rendering');
            // Try to recover rendering
            this.recoverRendering();
        }
    },

    // Recover rendering system
    recoverRendering() {
        try {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            
            // Clear canvas and show error message
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Rendering Error - Press R to restart', canvas.width / 2, canvas.height / 2);
            
        } catch (e) {
            console.error('Failed to recover rendering:', e);
        }
    },

    // Get debug info
    getDebugInfo() {
        return {
            errors: this.errorHandler.getErrorReport(),
            performance: Utils.getPerformanceReport(),
            gameState: this.errorHandler.getGameStateSnapshot(),
            device: InputManager.getDeviceInfo()
        };
    }
}; 