// Main Game Initialization and Loop
const Game = {
    lastTime: 0,
    targetFPS: 60,
    frameInterval: 1000 / 60,
    isPaused: false,
    lastAutoSave: 0, // Track last auto-save time to prevent infinite saving
    settings: {
        showFPS: false,
        showDebugInfo: false,
        enableSoundEffects: true,
        graphicsQuality: 'high', // low, medium, high
        autoSave: true,
        touchSensitivity: 1.0,
        volume: 0.7
    },
    
    // Initialize the game
    init() {
        console.log('🎮 Initializing Buried Spire Quest - Explorer Mode');
        
        try {
            // Make Game object globally accessible
            window.Game = this;
            
            // Load settings from localStorage
            this.loadSettings();
            
            // Initialize all game systems
            GameState.init();
            Renderer.init();
            InputManager.init();
            GameLogic.init();
            TutorialSystem.init();
            
            // Setup development tools
            this.setupDevTools();
            
            // Setup settings UI
            this.setupSettingsUI();
            
            // Start the game loop
            this.startGameLoop();
            
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showCriticalError(error);
        }
    },

    // Pause/unpause the game
    togglePause() {
        const game = GameState.getGame();
        if (game.state === 'playing' && !game.deathScreen && !game.gameOver && !game.victory) {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.showPauseMenu();
            } else {
                this.hidePauseMenu();
            }
        }
    },

    // Show pause menu
    showPauseMenu() {
        // Remove existing pause menu if any
        const existingMenu = document.getElementById('pauseMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        this.showSettingsModal(true); // Pass true to indicate this is a pause menu
    },

    // Hide pause menu
    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.remove();
        }
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.remove();
        }
    },

    // Setup development tools
    setupDevTools() {
        // Add debug panel
        if (this.settings.showDebugInfo) {
            this.createDebugPanel();
        }
        
        // Setup global debug object
        window.GameDebug = {
            // Game state access
            getGame: () => GameState.getGame(),
            getSettings: () => this.settings,
            
            // Performance tools
            getPerformance: () => Utils.getPerformanceReport(),
            toggleFPS: () => {
                this.settings.showFPS = !this.settings.showFPS;
                this.saveSettings();
            },
            
            // Debug info
            getDebugInfo: () => GameLogic.getDebugInfo(),
            toggleDebugPanel: () => {
                this.settings.showDebugInfo = !this.settings.showDebugInfo;
                this.saveSettings();
                if (this.settings.showDebugInfo) {
                    this.createDebugPanel();
                } else {
                    this.removeDebugPanel();
                }
            },
            
            // Game manipulation
            setPlayerLight: (amount) => {
                const game = GameState.getGame();
                game.player.light = Math.max(0, Math.min(100, amount));
            },
            
            teleportPlayer: (x, y) => {
                const game = GameState.getGame();
                game.player.x = x;
                game.player.y = y;
            },
            
            addOrb: (type) => {
                const game = GameState.getGame();
                const orbConfig = ORB_TYPES[type];
                if (orbConfig) {
                    game.orbs.push({
                        x: game.player.x + 50,
                        y: game.player.y,
                        type: type,
                        color: orbConfig.color,
                        size: 8
                    });
                }
            },
            
            clearGhouls: () => {
                const game = GameState.getGame();
                game.ghouls.length = 0;
            },
            
            // Settings
            updateSetting: (key, value) => {
                this.settings[key] = value;
                this.saveSettings();
                this.applySettings();
            },
            
            // Error testing
            triggerError: (type = 'test') => {
                throw new Error(`Debug error: ${type}`);
            },
            
            // Performance testing
            stressTest: (duration = 5000) => {
                console.log(`Starting ${duration}ms stress test...`);
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const game = GameState.getGame();
                    // Add lots of particles
                    Utils.createParticles(game, 
                        Math.random() * CONFIG.CANVAS.WIDTH,
                        Math.random() * CONFIG.CANVAS.HEIGHT,
                        '#ff0000', 50, 10);
                    
                    if (Date.now() - startTime > duration) {
                        clearInterval(interval);
                        console.log('Stress test completed');
                    }
                }, 100);
            },
            
            // Debug function to test inventory system
            debugInventorySystem: () => {
                const game = GameState.getGame();
                console.log('🔍 INVENTORY DEBUG:');
                console.log('Current player inventory:', [...game.player.inventory]);
                console.log('Level entry inventory:', game.levelEntryInventory);
                console.log('Current floor:', game.floor);
                console.log('Checkpoint floor:', game.checkpoint);
                
                // Add some test orbs to inventory if empty
                if (!game.player.inventory.some(item => item !== null)) {
                    console.log('🧪 Adding test orbs to inventory...');
                    game.player.inventory = ['common', 'golden', 'purple'];
                    if (typeof InventoryManager !== 'undefined' && InventoryManager.updateDisplay) {
                        InventoryManager.updateDisplay();
                    }
                }
            },
            
            addTestOrbs: () => {
                const game = GameState.getGame();
                game.player.inventory = ['common', 'golden', 'purple'];
                if (typeof InventoryManager !== 'undefined' && InventoryManager.updateDisplay) {
                    InventoryManager.updateDisplay();
                }
                console.log('🧪 Added test orbs to inventory');
            },
            
            showInventoryState: () => {
                const game = GameState.getGame();
                console.log('🔍 INVENTORY STATE:');
                console.log('Current inventory:', [...game.player.inventory]);
                console.log('Level entry inventory:', game.levelEntryInventory);
                console.log('Floor:', game.floor);
                console.log('Checkpoint:', game.checkpoint);
            },
            
            simulateFloorTransition: () => {
                const game = GameState.getGame();
                console.log('🚪 Simulating floor transition...');
                console.log('Before - Current inventory:', [...game.player.inventory]);
                console.log('Before - Level entry inventory:', game.levelEntryInventory);
                
                // Simulate stairs interaction
                game.levelEntryInventory = [...game.player.inventory];
                game.floor++;
                
                console.log('After - Level entry inventory stored:', game.levelEntryInventory);
                console.log('After - New floor:', game.floor);
            },
            
            testRestartLevel: () => {
                console.log('🔄 Testing level restart...');
                GameState.restartCurrentLevel();
            },
            
            testInventoryScenarios: () => {
                const game = GameState.getGame();
                console.log('🧪 TESTING INVENTORY SCENARIOS:');
                
                // Scenario 1: Test restart on level 1 (should have empty inventory)
                console.log('\\n--- Scenario 1: Level 1 Restart (Empty Inventory) ---');
                game.floor = 1;
                game.levelEntryInventory = [null, null, null]; // Level 1 entry inventory
                game.player.inventory = ['blue', 'gold', 'purple']; // Current inventory
                console.log('1. Before restart - Current inventory:', [...game.player.inventory]);
                console.log('1. Before restart - Level entry inventory:', game.levelEntryInventory);
                GameState.restartCurrentLevel();
                console.log('1. After restart - Final inventory:', [...game.player.inventory]);
                console.log('1. Expected: [null, null, null] - Should be empty');
                
                // Scenario 2: Test with level entry inventory containing items
                console.log('\\n--- Scenario 2: Level with Entry Inventory ---');
                game.floor = 5;
                game.levelEntryInventory = ['blue', null, 'green']; // Had blue and green when entering level 5
                game.player.inventory = ['blue', 'gold', 'purple']; // Current inventory (different)
                console.log('2. Before restart - Current inventory:', [...game.player.inventory]);
                console.log('2. Before restart - Level entry inventory:', game.levelEntryInventory);
                GameState.restartCurrentLevel();
                console.log('2. After restart - Final inventory:', [...game.player.inventory]);
                console.log('2. Expected: ["blue", null, "green"] - Should match entry inventory');
                
                // Scenario 3: Test level entry inventory tracking when using stairs
                console.log('\\n--- Scenario 3: Level Entry Inventory Tracking ---');
                game.floor = 3;
                game.player.inventory = ['gold', 'purple', null]; // Current inventory before stairs
                console.log('3. Before using stairs - Current inventory:', [...game.player.inventory]);
                
                // Simulate using stairs (this should set levelEntryInventory for the NEW floor)
                game.floor = 4; // Simulate going to floor 4
                game.levelEntryInventory = [...game.player.inventory]; // This is what checkStairs does
                console.log('3. After using stairs to floor 4 - Level entry inventory set to:', game.levelEntryInventory);
                console.log('3. This should be: ["gold", "purple", null]');
                
                // Now test restart on floor 4
                game.player.inventory = ['blue', 'red', 'white']; // Player collected different items
                console.log('3. Player then collected different items:', [...game.player.inventory]);
                GameState.restartCurrentLevel();
                console.log('3. After restart - Final inventory:', [...game.player.inventory]);
                console.log('3. Expected: ["gold", "purple", null] - Should match what player had when entering floor 4');
                
                console.log('\\n🧪 INVENTORY TEST COMPLETE');
            },
            
            testLevelEntryTracking: () => {
                const game = GameState.getGame();
                console.log('🔍 TESTING LEVEL ENTRY INVENTORY TRACKING:');
                
                // Reset to known state
                game.floor = 1;
                game.player.inventory = [null, null, null];
                game.levelEntryInventory = [null, null, null];
                
                console.log('\\nStarting at floor 1 with empty inventory');
                console.log('Floor 1 - Entry inventory:', game.levelEntryInventory);
                console.log('Floor 1 - Current inventory:', [...game.player.inventory]);
                
                // Simulate collecting items on floor 1
                game.player.inventory = ['blue', null, 'green'];
                console.log('\\nCollected items on floor 1:', [...game.player.inventory]);
                
                // Simulate going to floor 2 (this should set entry inventory for floor 2)
                console.log('\\nUsing stairs to go to floor 2...');
                game.floor = 2;
                game.levelEntryInventory = [...game.player.inventory]; // What checkStairs does
                console.log('Floor 2 - Entry inventory set to:', game.levelEntryInventory);
                
                // Simulate collecting more items on floor 2
                game.player.inventory = ['blue', 'gold', 'green'];
                console.log('\\nCollected more items on floor 2:', [...game.player.inventory]);
                
                // Test restart on floor 2
                console.log('\\nRestarting floor 2...');
                GameState.restartCurrentLevel();
                console.log('After restart - Inventory should be entry inventory:', [...game.player.inventory]);
                console.log('Expected: ["blue", null, "green"] (what player had when entering floor 2)');
                
                console.log('\\n🔍 LEVEL ENTRY TRACKING TEST COMPLETE');
            },
            
            simulateProperLevelTransition: () => {
                const game = GameState.getGame();
                console.log('🚪 SIMULATING PROPER LEVEL TRANSITION:');
                
                // Start fresh
                game.floor = 1;
                game.player.inventory = [null, null, null];
                game.levelEntryInventory = [null, null, null]; // Empty when starting level 1
                console.log('\n📍 Level 1 - Entry inventory (empty):', game.levelEntryInventory);
                
                // Player collects items on level 1
                game.player.inventory = ['blue', 'gold', null];
                console.log('🎒 Player collected items on level 1:', [...game.player.inventory]);
                
                // Player uses stairs to go to level 2
                console.log('\n🚪 Using stairs from level 1 to level 2...');
                game.floor = 2;
                // This is what checkStairs() does - set entry inventory for NEW level
                game.levelEntryInventory = [...game.player.inventory];
                console.log('📍 Level 2 - Entry inventory set to:', game.levelEntryInventory);
                console.log('📍 This means: when player entered level 2, they had:', game.levelEntryInventory);
                
                // Player collects different items on level 2
                game.player.inventory = ['blue', 'gold', 'purple'];
                console.log('\n🎒 Player collected more items on level 2:', [...game.player.inventory]);
                
                // Now test restart - should restore level 2 entry inventory
                console.log('\n🔄 Player restarts level 2...');
                GameState.restartCurrentLevel();
                console.log('✅ After restart - Player inventory:', [...game.player.inventory]);
                console.log('✅ Expected: ["blue", "gold", null] (what they had when entering level 2)');
                
                console.log('\n🚪 LEVEL TRANSITION SIMULATION COMPLETE');
            },
            
            // Test the exact scenario the user reported
            testUserScenario: () => {
                const game = GameState.getGame();
                console.log('🧪 TESTING USER SCENARIO: Level 2 with purple, green, purple');
                
                // Set up level 1 first
                game.floor = 1;
                game.player.inventory = [null, null, null];
                game.levelEntryInventory = [null, null, null]; // Level 1 starts empty
                console.log('\n📍 Level 1 - Starting with empty inventory');
                
                // Player collects purple, green, purple on level 1
                game.player.inventory = ['purple', 'green', 'purple'];
                console.log('🎒 Player collected on level 1:', [...game.player.inventory]);
                
                // Player goes to level 2 (simulate stairs)
                console.log('\n🚪 Player uses stairs to go to level 2...');
                game.floor = 2;
                game.levelEntryInventory = [...game.player.inventory]; // Set entry inventory for level 2
                console.log('📍 Level 2 - Entry inventory set to:', game.levelEntryInventory);
                
                // Player does something on level 2 (maybe collects more items or uses items)
                game.player.inventory = ['purple', 'green', null]; // Maybe used one purple
                console.log('🎒 Player inventory changed on level 2:', [...game.player.inventory]);
                
                // Player restarts level 2
                console.log('\n🔄 Player restarts level 2...');
                console.log('Before restart - Current inventory:', [...game.player.inventory]);
                console.log('Before restart - Level entry inventory:', game.levelEntryInventory);
                
                GameState.restartCurrentLevel();
                
                console.log('After restart - Final inventory:', [...game.player.inventory]);
                console.log('Expected: ["purple", "green", "purple"] (what they had entering level 2)');
                
                if (JSON.stringify(game.player.inventory) === JSON.stringify(['purple', 'green', 'purple'])) {
                    console.log('✅ TEST PASSED: Inventory correctly restored');
                } else {
                    console.log('❌ TEST FAILED: Inventory not correctly restored');
                    console.log('Expected: ["purple", "green", "purple"]');
                    console.log('Actual:', [...game.player.inventory]);
                }
                
                console.log('\n🧪 USER SCENARIO TEST COMPLETE');
            },
            
            testInventorySystem: () => {
                const game = GameState.getGame();
                console.log('🧪 TESTING COMPLETE INVENTORY SYSTEM:');
                
                // Test 1: Fresh game start
                console.log('\\n📍 TEST 1: Fresh Game Start');
                GameState.startGame(); // This should set levelEntryInventory to [null, null, null]
                console.log('Level 1 entry inventory:', game.levelEntryInventory);
                console.log('Player inventory:', [...game.player.inventory]);
                
                // Test 2: Collect items on level 1
                console.log('\\n📍 TEST 2: Collecting Items on Level 1');
                game.player.inventory = ['purple', 'green', 'blue'];
                console.log('Player collected items:', [...game.player.inventory]);
                console.log('Level entry inventory (should still be empty):', game.levelEntryInventory);
                
                // Test 3: Transition to level 2 (simulate stairs)
                console.log('\\n📍 TEST 3: Transitioning to Level 2');
                const originalFloor = game.floor;
                
                // Simulate the stairs transition logic from gameLogic.js
                game.floor++;
                game.levelEntryInventory = [...game.player.inventory]; // This is what the fix does
                console.log(`Transitioned from floor ${originalFloor} to floor ${game.floor}`);
                console.log('Level entry inventory for level 2:', game.levelEntryInventory);
                console.log('Player inventory:', [...game.player.inventory]);
                
                // Test 4: Player uses/loses items on level 2
                console.log('\\n📍 TEST 4: Player Uses Items on Level 2');
                game.player.inventory[2] = null; // Used blue orb
                console.log('Player used blue orb, current inventory:', [...game.player.inventory]);
                console.log('Level entry inventory (should be unchanged):', game.levelEntryInventory);
                
                // Test 5: Restart level 2
                console.log('\\n📍 TEST 5: Restart Level 2');
                GameState.restartCurrentLevel();
                console.log('After restart - Player inventory:', [...game.player.inventory]);
                console.log('After restart - Level entry inventory:', game.levelEntryInventory);
                
                console.log('\\n✅ INVENTORY SYSTEM TEST COMPLETE');
                console.log('Expected: Player inventory should be restored to ["purple", "green", "blue"]');
            }
        };
        
        console.log('🔧 Debug tools available via window.GameDebug');
    },

    // Create debug panel
    createDebugPanel() {
        if (document.getElementById('debugPanel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 9999;
            min-width: 200px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        document.body.appendChild(panel);
        
        // Update debug info every second
        this.debugUpdateInterval = setInterval(() => {
            this.updateDebugPanel();
        }, 1000);
    },

    // Remove debug panel
    removeDebugPanel() {
        const panel = document.getElementById('debugPanel');
        if (panel) {
            panel.remove();
        }
        
        if (this.debugUpdateInterval) {
            clearInterval(this.debugUpdateInterval);
        }
    },

    // Update debug panel content
    updateDebugPanel() {
        const panel = document.getElementById('debugPanel');
        if (!panel) return;
        
        const debugInfo = GameLogic.getDebugInfo();
        const game = GameState.getGame();
        
        panel.innerHTML = `
            <div style="color: #ffff00; font-weight: bold;">🔍 DEBUG INFO</div>
            <div>FPS: ${debugInfo.performance.fps}</div>
            <div>Frame: ${debugInfo.performance.frameTime}ms</div>
            <div>Render: ${debugInfo.performance.renderTime}ms</div>
            <div>Update: ${debugInfo.performance.updateTime}ms</div>
            <div>---</div>
            <div>Floor: ${game.floor}</div>
            <div>Light: ${Math.round(game.player.light)}%</div>
            <div>Pos: ${Math.round(game.player.x)}, ${Math.round(game.player.y)}</div>
            <div>Ghouls: ${game.ghouls.length}</div>
            <div>Orbs: ${game.orbs.length}</div>
            <div>Particles: ${game.particles.length}</div>
            <div>---</div>
            <div>Errors: ${debugInfo.errors.errorCount}</div>
            <div>Pool Size: ${debugInfo.performance.particlePoolSize}</div>
            <div>Spatial Cells: ${debugInfo.performance.spatialGridCells}</div>
            <div>---</div>
            <div>Device: ${debugInfo.device.isMobile ? 'Mobile' : 'Desktop'}</div>
            <div>Screen: ${debugInfo.device.screenSize}</div>
            <div>Orientation: ${debugInfo.device.orientation}</div>
        `;
    },

    // Show confirmation dialog
    showConfirmationDialog(title, message, onConfirm, onCancel) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: linear-gradient(135deg, #111 0%, #222 50%, #111 100%);
            border: 3px solid #ffeb3b;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            position: relative;
        `;
        
        // Add corner decorations
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const decoration = document.createElement('div');
            decoration.style.cssText = `
                position: absolute;
                width: 20px;
                height: 20px;
                border: 2px solid #ffeb3b;
                ${corner.includes('top') ? 'top: -10px;' : 'bottom: -10px;'}
                ${corner.includes('left') ? 'left: -10px;' : 'right: -10px;'}
                ${corner.includes('top') && corner.includes('left') ? 'border-right: none; border-bottom: none;' : ''}
                ${corner.includes('top') && corner.includes('right') ? 'border-left: none; border-bottom: none;' : ''}
                ${corner.includes('bottom') && corner.includes('left') ? 'border-right: none; border-top: none;' : ''}
                ${corner.includes('bottom') && corner.includes('right') ? 'border-left: none; border-top: none;' : ''}
                background: #111;
            `;
            dialog.appendChild(decoration);
        });
        
        // Title
        const titleElement = document.createElement('h2');
        titleElement.style.cssText = `
            color: #ffeb3b;
            margin: 0 0 20px 0;
            font-family: monospace;
            font-size: 24px;
            text-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
        `;
        titleElement.innerHTML = title;
        
        // Message
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            color: #fff;
            margin: 0 0 30px 0;
            font-family: monospace;
            font-size: 16px;
            line-height: 1.5;
            text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
        `;
        messageElement.innerHTML = message;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;
        
        // Confirm button
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'CONFIRM';
        confirmButton.style.cssText = `
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 12px 24px;
            font-family: monospace;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        `;
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'CANCEL';
        cancelButton.style.cssText = `
            background: linear-gradient(135deg, #f44336, #da190b);
            color: white;
            border: 2px solid #f44336;
            border-radius: 8px;
            padding: 12px 24px;
            font-family: monospace;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        `;
        
        // Add hover effects
        confirmButton.addEventListener('mouseenter', () => {
            confirmButton.style.transform = 'translateY(-2px)';
            confirmButton.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
        });
        confirmButton.addEventListener('mouseleave', () => {
            confirmButton.style.transform = 'translateY(0)';
            confirmButton.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
        });
        
        cancelButton.addEventListener('mouseenter', () => {
            cancelButton.style.transform = 'translateY(-2px)';
            cancelButton.style.boxShadow = '0 6px 20px rgba(244, 67, 54, 0.4)';
        });
        cancelButton.addEventListener('mouseleave', () => {
            cancelButton.style.transform = 'translateY(0)';
            cancelButton.style.boxShadow = '0 4px 15px rgba(244, 67, 54, 0.3)';
        });
        
        // Event listeners
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });
        
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        });
        
        // Escape key to cancel
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                // Safety check to ensure overlay exists before removing
                if (overlay && overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
                document.removeEventListener('keydown', escapeHandler);
                if (onCancel) onCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Assemble dialog
        buttonContainer.appendChild(confirmButton);
        buttonContainer.appendChild(cancelButton);
        dialog.appendChild(titleElement);
        dialog.appendChild(messageElement);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus confirm button
        confirmButton.focus();
    },

    // Setup settings UI
    setupSettingsUI() {
        // Create settings button
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️';
        settingsBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: 2px solid #8B4513;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 16px;
            z-index: 1000;
        `;
        // Settings button now acts like ESC key - shows pause menu if in game
        settingsBtn.addEventListener('click', () => {
            const game = GameState.getGame();
            if (game && game.state === 'playing') {
                // Act like ESC key - toggle pause
                this.togglePause();
            } else {
                // Show regular settings if not in game
                this.showSettingsModal();
            }
        });
        document.body.appendChild(settingsBtn);
    },

    // Show settings modal
    showSettingsModal(isPauseMenu = false) {
        // Remove existing modal if present
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) {
            existingModal.remove();
        }

        const stats = GameState.getFormattedStats();
        
        // Generate achievements list with all achievements visible
        let achievementsList = '';
        const unlockedAchievements = GameState.stats.achievements;
        
        Object.entries(GameState.achievements).forEach(([id, achievement]) => {
            const isUnlocked = unlockedAchievements.has(id);
            const opacity = isUnlocked ? '1' : '0.3';
            const bgColor = isUnlocked ? 'rgba(255, 235, 59, 0.2)' : 'rgba(255, 235, 59, 0.05)';
            const borderColor = isUnlocked ? '#ffeb3b' : '#666';
            
            achievementsList += `
                <div style="display: flex; align-items: center; gap: 15px; padding: 12px; background: ${bgColor}; border-radius: 8px; margin-bottom: 8px; opacity: ${opacity}; border: 1px solid ${borderColor}; box-shadow: ${isUnlocked ? '0 2px 8px rgba(255, 235, 59, 0.2)' : 'none'};">
                    <div style="font-size: 24px; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">${achievement.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: ${isUnlocked ? '#ffeb3b' : '#888'}; text-shadow: ${isUnlocked ? '0 0 10px rgba(255, 235, 59, 0.3)' : 'none'};">${achievement.name}</div>
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 2px; color: ${isUnlocked ? '#fff' : '#666'};">${achievement.description}</div>
                        ${isUnlocked ? '<div style="font-size: 10px; color: #4caf50; margin-top: 2px; font-weight: bold;">✓ UNLOCKED</div>' : '<div style="font-size: 10px; color: #666; margin-top: 2px;">🔒 LOCKED</div>'}
                    </div>
                </div>
            `;
        });

        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: monospace;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #111 0%, #222 50%, #111 100%);
                border: 3px solid #ffeb3b;
                border-radius: 15px;
                padding: 30px;
                max-width: 700px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(255, 235, 59, 0.3), inset 0 0 20px rgba(255, 235, 59, 0.1);
                position: relative;
            ">
                <!-- Golden corner decorations -->
                <div style="position: absolute; top: -3px; left: -3px; width: 20px; height: 20px; background: #ffeb3b; transform: rotate(45deg);"></div>
                <div style="position: absolute; top: -3px; right: -3px; width: 20px; height: 20px; background: #ffeb3b; transform: rotate(45deg);"></div>
                <div style="position: absolute; bottom: -3px; left: -3px; width: 20px; height: 20px; background: #ffeb3b; transform: rotate(45deg);"></div>
                <div style="position: absolute; bottom: -3px; right: -3px; width: 20px; height: 20px; background: #ffeb3b; transform: rotate(45deg);"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #ffeb3b; text-shadow: 0 0 15px rgba(255, 235, 59, 0.7); font-size: 24px; font-weight: bold;">
                        ${isPauseMenu ? '⏸️ GAME PAUSED' : '⚙️ SETTINGS & STATISTICS'}
                    </h2>
                    <button id="closeModal" style="background: none; border: 2px solid #ffeb3b; color: #ffeb3b; font-size: 20px; cursor: pointer; padding: 8px 12px; border-radius: 5px; font-weight: bold; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5);">✕</button>
                </div>
                
                ${isPauseMenu ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 25px;">
                    <button id="resumeGame" style="padding: 15px; background: linear-gradient(135deg, #333, #555); color: #ffeb3b; border: 2px solid #ffeb3b; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5); box-shadow: 0 4px 15px rgba(255, 235, 59, 0.2);">▶️ RESUME</button>
                    <button id="restartGame" style="padding: 15px; background: linear-gradient(135deg, #333, #555); color: #ff9800; border: 2px solid #ff9800; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(255, 152, 0, 0.5); box-shadow: 0 4px 15px rgba(255, 152, 0, 0.2);">🔄 RESTART</button>
                    <button id="replayFromCheckpoint" style="padding: 15px; background: linear-gradient(135deg, #333, #555); color: #9c27b0; border: 2px solid #9c27b0; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(156, 39, 176, 0.5); box-shadow: 0 4px 15px rgba(156, 39, 176, 0.2);">📍 CHECKPOINT</button>
                    <button id="quitToMenu" style="padding: 15px; background: linear-gradient(135deg, #333, #555); color: #f44336; border: 2px solid #f44336; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(244, 67, 54, 0.5); box-shadow: 0 4px 15px rgba(244, 67, 54, 0.2);">🏠 MENU</button>
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 3px; margin-bottom: 25px; border-radius: 10px; overflow: hidden; background: #222; border: 2px solid #333;">
                    <button id="settingsTab" class="tab-btn active" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ffeb3b, #ff9800); color: #000; border: none; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 5px rgba(0,0,0,0.5);">⚙️ SETTINGS</button>
                    <button id="statsTab" class="tab-btn" style="flex: 1; padding: 15px; background: #333; color: #aaa; border: none; cursor: pointer; font-weight: bold; font-family: monospace;">📊 STATS</button>
                    <button id="achievementsTab" class="tab-btn" style="flex: 1; padding: 15px; background: #333; color: #aaa; border: none; cursor: pointer; font-weight: bold; font-family: monospace;">🏆 ACHIEVEMENTS</button>
                    <button id="helpTab" class="tab-btn" style="flex: 1; padding: 15px; background: #333; color: #aaa; border: none; cursor: pointer; font-weight: bold; font-family: monospace;">❓ HELP</button>
                </div>
                
                <!-- Settings Panel -->
                <div id="settingsPanel" class="tab-panel">
                    <div style="display: grid; gap: 25px;">
                        <h3 style="margin: 0; color: #ffeb3b; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5); font-size: 20px;">⚙️ Game Settings</h3>
                        
                        <div style="display: grid; gap: 20px;">
                            <div style="background: rgba(255, 235, 59, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                                <label style="display: block; margin-bottom: 10px; color: #ffeb3b; font-weight: bold;">Graphics Quality:</label>
                                <select id="graphicsQuality" style="width: 100%; padding: 10px; background: #222; color: #fff; border: 2px solid #333; border-radius: 5px; font-family: monospace;">
                                    <option value="low">Low (Better Performance)</option>
                                    <option value="medium">Medium (Balanced)</option>
                                    <option value="high">High (Best Quality)</option>
                                </select>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <label style="display: flex; align-items: center; gap: 10px; color: #fff; background: rgba(255, 235, 59, 0.1); padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer;">
                                    <input type="checkbox" id="showFPS" style="accent-color: #ffeb3b; transform: scale(1.2);">
                                    <span style="font-weight: bold;">Show FPS Counter</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; color: #fff; background: rgba(255, 235, 59, 0.1); padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer;">
                                    <input type="checkbox" id="showDebugInfo" style="accent-color: #ffeb3b; transform: scale(1.2);">
                                    <span style="font-weight: bold;">Debug Information</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; color: #fff; background: rgba(255, 235, 59, 0.1); padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer;">
                                    <input type="checkbox" id="enableSoundEffects" style="accent-color: #ffeb3b; transform: scale(1.2);">
                                    <span style="font-weight: bold;">Sound Effects</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; color: #fff; background: rgba(255, 235, 59, 0.1); padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer;">
                                    <input type="checkbox" id="autoSave" style="accent-color: #ffeb3b; transform: scale(1.2);">
                                    <span style="font-weight: bold;">Auto Save</span>
                                </label>
                            </div>
                            
                            <div style="background: rgba(255, 235, 59, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                                <label style="display: block; margin-bottom: 8px; color: #ffeb3b; font-weight: bold;">Volume: <span id="volumeValue" style="color: #fff;">${Math.round(this.settings.volume * 100)}%</span></label>
                                <input type="range" id="volume" min="0" max="1" step="0.1" value="${this.settings.volume}" style="width: 100%; accent-color: #ffeb3b; height: 8px;">
                            </div>
                            
                            <div style="background: rgba(255, 235, 59, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                                <label style="display: block; margin-bottom: 8px; color: #ffeb3b; font-weight: bold;">Touch Sensitivity: <span id="touchSensitivityValue" style="color: #fff;">${this.settings.touchSensitivity}x</span></label>
                                <input type="range" id="touchSensitivity" min="0.5" max="2" step="0.1" value="${this.settings.touchSensitivity}" style="width: 100%; accent-color: #ffeb3b; height: 8px;">
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 15px; margin-top: 10px;">
                            <button id="applySettings" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #4caf50, #66bb6a); color: white; border: 2px solid #4caf50; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(76, 175, 80, 0.5); box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);">✅ APPLY SETTINGS</button>
                            <button id="resetSettings" style="flex: 1; padding: 15px; background: linear-gradient(135deg, #ff9800, #ffb74d); color: white; border: 2px solid #ff9800; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px rgba(255, 152, 0, 0.5); box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);">🔄 RESET DEFAULTS</button>
                        </div>
                        
                        <div id="settingsMessage" style="display: none; padding: 15px; background: rgba(76, 175, 80, 0.2); border: 2px solid #4caf50; border-radius: 8px; color: #4caf50; text-align: center; font-weight: bold; text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);">
                            ✅ Settings have been applied successfully!
                        </div>
                    </div>
                </div>
                
                <!-- Statistics Panel -->
                <div id="statsPanel" class="tab-panel" style="display: none;">
                    <div style="display: grid; gap: 20px;">
                        <h3 style="margin: 0; color: #ffeb3b; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5); font-size: 20px;">📊 Game Statistics</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 14px;">
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Total Play Time:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.totalPlayTime}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Games Played:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.gamesPlayed}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Deepest Floor:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.deepestFloor}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Total Deaths:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.totalDeaths}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Orbs Collected:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.totalOrbsCollected}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Distance Traveled:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.totalDistanceTraveled}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Fastest Completion:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.fastestCompletion}</span>
                            </div>
                            <div style="padding: 15px; background: rgba(255, 235, 59, 0.1); border-radius: 8px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Achievements:</strong><br>
                                <span style="color: #fff; font-size: 16px;">${stats.achievementsUnlocked}/${stats.totalAchievements}</span>
                            </div>
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong style="color: #ffeb3b; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5);">Achievement Progress</strong>
                                <span style="color: #fff; font-weight: bold;">${Math.round((stats.achievementsUnlocked / stats.totalAchievements) * 100)}%</span>
                            </div>
                            <div style="width: 100%; background: #222; border-radius: 10px; overflow: hidden; border: 2px solid #333; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">
                                <div style="width: ${(stats.achievementsUnlocked / stats.totalAchievements) * 100}%; height: 25px; background: linear-gradient(90deg, #ffeb3b, #ff9800); transition: width 0.5s ease; box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Achievements Panel -->
                <div id="achievementsPanel" class="tab-panel" style="display: none;">
                    <h3 style="margin: 0 0 20px 0; color: #ffeb3b; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5); font-size: 20px;">🏆 Achievements</h3>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                        ${achievementsList || '<div style="text-align: center; opacity: 0.6; padding: 30px; color: #aaa; font-size: 16px;">No achievements data available!</div>'}
                    </div>
                    <div style="margin-top: 20px; padding: 20px; background: rgba(255, 235, 59, 0.1); border-radius: 10px; border: 2px solid #333; font-size: 13px; color: #fff; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                        💡 <strong style="color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">Tip:</strong> Unlocked achievements glow with golden light, while locked achievements remain in shadow. Explore the depths to unlock them all!
                    </div>
                </div>
                
                <!-- Help Panel -->
                <div id="helpPanel" class="tab-panel" style="display: none;">
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                        <h3 style="margin: 0 0 20px 0; color: #ffeb3b; text-shadow: 0 0 10px rgba(255, 235, 59, 0.5); font-size: 20px;">❓ Game Help & Guide</h3>
                        
                        <div style="margin-bottom: 25px; padding: 20px; background: rgba(255, 235, 59, 0.1); border-radius: 10px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                            <h4 style="margin: 0 0 12px 0; color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">🎯 Mission</h4>
                            <p style="margin: 0; color: #fff; line-height: 1.5; font-size: 14px;">
                                Descend through the mysterious Buried Spire to reach floor -${CONFIG.GAME.MAX_FLOORS} and find the legendary Ancient Pearl. Navigate through dark corridors of the ancient Burj Mubarak while managing your light and avoiding the lurking ghouls.
                            </p>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding: 20px; background: rgba(255, 235, 59, 0.1); border-radius: 10px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                            <h4 style="margin: 0 0 12px 0; color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">🎮 Controls</h4>
                            <div style="color: #fff; line-height: 1.7; font-size: 14px;">
                                <strong style="color: #ffeb3b;">Movement:</strong> WASD or Arrow Keys<br>
                                <strong style="color: #ffeb3b;">Use Orbs:</strong> Press 1, 2, or 3 keys<br>
                                <strong style="color: #ffeb3b;">Help:</strong> Press H to toggle help overlay<br>
                                <strong style="color: #ffeb3b;">Pause:</strong> Press ESC to pause the game<br>
                                <strong style="color: #ffeb3b;">Settings:</strong> Click ⚙️ button (top-right)
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding: 20px; background: rgba(255, 235, 59, 0.1); border-radius: 10px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                            <h4 style="margin: 0 0 15px 0; color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">🔮 Orb Types</h4>
                            <div style="display: grid; gap: 10px; color: #fff; font-size: 13px;">
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(100, 181, 246, 0.2); border-radius: 5px; border: 1px solid #64b5f6;">
                                    <span style="color: #64b5f6; font-size: 18px; text-shadow: 0 0 8px #64b5f6;">O</span>
                                    <span><strong style="color: #64b5f6;">Blue Orb:</strong> Restores 20% light - collect immediately</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255, 235, 59, 0.2); border-radius: 5px; border: 1px solid #ffeb3b;">
                                    <span style="color: #ffeb3b; font-size: 18px; text-shadow: 0 0 8px #ffeb3b;">@</span>
                                    <span><strong style="color: #ffeb3b;">Golden Orb:</strong> Restores 40% light - collect immediately</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(156, 39, 176, 0.2); border-radius: 5px; border: 1px solid #9c27b0;">
                                    <span style="color: #9c27b0; font-size: 18px; text-shadow: 0 0 8px #9c27b0;">P</span>
                                    <span><strong style="color: #9c27b0;">Purple Orb:</strong> Phase through walls for 5 seconds</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(76, 175, 80, 0.2); border-radius: 5px; border: 1px solid #4caf50;">
                                    <span style="color: #4caf50; font-size: 18px; text-shadow: 0 0 8px #4caf50;">G</span>
                                    <span><strong style="color: #4caf50;">Green Orb:</strong> Regenerate light for 10 seconds</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255, 255, 255, 0.2); border-radius: 5px; border: 1px solid #ffffff;">
                                    <span style="color: #ffffff; font-size: 18px; text-shadow: 0 0 8px #ffffff;">W</span>
                                    <span><strong style="color: #ffffff;">White Orb:</strong> Reveal entire map for 5 seconds</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(244, 67, 54, 0.2); border-radius: 5px; border: 1px solid #f44336;">
                                    <span style="color: #f44336; font-size: 18px; text-shadow: 0 0 8px #f44336;">♥</span>
                                    <span><strong style="color: #f44336;">Red Orb:</strong> Auto-revives you when light reaches 0%</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(204, 204, 255, 0.2); border-radius: 5px; border: 1px solid #ccccff;">
                                    <span style="color: #ccccff; font-size: 18px; text-shadow: 0 0 8px #ccccff;">*</span>
                                    <span><strong style="color: #ccccff;">Light Wisp:</strong> Death marker - Restores 50% light</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding: 20px; background: rgba(255, 235, 59, 0.1); border-radius: 10px; border: 2px solid #333; box-shadow: 0 2px 8px rgba(255, 235, 59, 0.1);">
                            <h4 style="margin: 0 0 12px 0; color: #ffeb3b; text-shadow: 0 0 8px rgba(255, 235, 59, 0.5);">👻 Ghouls & Survival</h4>
                            <div style="color: #fff; line-height: 1.7; font-size: 14px;">
                                • <strong style="color: #ffeb3b;">Ghouls flee from bright light</strong> - stay near the center of your light radius<br>
                                • <strong style="color: #ffeb3b;">Ghouls stalk you in dim light</strong> - they increase light depletion when near<br>
                                • <strong style="color: #ffeb3b;">When light reaches 0%</strong> - ghouls swarm! Use a lifeline orb or face death<br>
                                • <strong style="color: #ffeb3b;">Checkpoints every 5 floors</strong> - you'll respawn at the last checkpoint<br>
                                • <strong style="color: #ffeb3b;">Light radius shrinks</strong> as your light depletes - manage it carefully!
                            </div>
                        </div>
                        
                        <div style="padding: 20px; background: rgba(255, 152, 0, 0.1); border-radius: 10px; border: 2px solid #ff9800; box-shadow: 0 2px 8px rgba(255, 152, 0, 0.1);">
                            <h4 style="margin: 0 0 12px 0; color: #ff9800; text-shadow: 0 0 8px rgba(255, 152, 0, 0.5);">💡 Pro Tips</h4>
                            <div style="color: #fff; line-height: 1.7; font-size: 13px;">
                                • Collect blue orbs immediately - they don't take inventory space<br>
                                • Save red lifeline orbs for emergencies - they auto-activate at 0% light<br>
                                • Use purple phase orbs to escape tight situations or find shortcuts<br>
                                • Green regeneration orbs are great for long-term light management<br>
                                • White reveal orbs help you navigate efficiently and find stairs quickly
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Setup tab switching
        this.setupTabSwitching(modal);
        
        // Setup event listeners
        this.setupSettingsEventListeners(modal, isPauseMenu);
        
        // Load current settings
        this.loadSettingsIntoModal();
    },

    // Setup tab switching functionality
    setupTabSwitching(modal) {
        const tabs = modal.querySelectorAll('.tab-btn');
        const panels = modal.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panels
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = '#333';
                    t.style.color = '#aaa';
                });
                panels.forEach(p => p.style.display = 'none');
                
                // Add active class to clicked tab
                tab.classList.add('active');
                tab.style.background = 'linear-gradient(135deg, #ffeb3b, #ff9800)';
                tab.style.color = '#000';
                tab.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
                
                // Show corresponding panel
                const panelId = tab.id.replace('Tab', 'Panel');
                const panel = modal.querySelector(`#${panelId}`);
                if (panel) {
                    panel.style.display = 'block';
                }
            });
        });
    },

    // Setup settings event listeners
    setupSettingsEventListeners(modal, isPauseMenu) {
        // Pause menu buttons (only if this is a pause menu)
        if (isPauseMenu) {
            document.getElementById('resumeGame').addEventListener('click', () => {
                this.isPaused = false;
                this.hidePauseMenu();
            });
            
            document.getElementById('restartGame').addEventListener('click', () => {
                const game = GameState.getGame();
                const currentFloor = Math.abs(game.floor);
                
                // Create inventory summary
                const inventoryItems = [];
                for (let i = 0; i < game.player.inventory.length; i++) {
                    const orb = game.player.inventory[i];
                    if (orb) {
                        if (typeof ORB_TYPES !== 'undefined' && ORB_TYPES[orb]) {
                            inventoryItems.push(`${ORB_TYPES[orb].symbol} ${ORB_TYPES[orb].name}`);
                        } else {
                            inventoryItems.push(`${orb} orb`);
                        }
                    }
                }
                const inventoryText = inventoryItems.length > 0 ? 
                    `<br><br><strong>Your current inventory:</strong><br>${inventoryItems.join('<br>')}` : 
                    '<br><br><strong>Your inventory is empty.</strong>';
                
                this.showConfirmationDialog(
                    '🔄 RESTART LEVEL',
                    `Are you sure you want to restart Floor ${currentFloor}?<br><br>You will restart this level with the inventory you had when you first entered it.${inventoryText}`,
                    () => {
                        this.isPaused = false;
                        this.hidePauseMenu();
                        GameState.restartCurrentLevel();
                    }
                );
            });
            
            document.getElementById('replayFromCheckpoint').addEventListener('click', () => {
                const game = GameState.getGame();
                const checkpointFloor = Math.abs(game.checkpoint);
                const checkpointNumber = Math.ceil(checkpointFloor / 5);
                
                // Create inventory summary
                const inventoryItems = [];
                for (let i = 0; i < game.player.inventory.length; i++) {
                    const orb = game.player.inventory[i];
                    if (orb) {
                        if (typeof ORB_TYPES !== 'undefined' && ORB_TYPES[orb]) {
                            inventoryItems.push(`${ORB_TYPES[orb].symbol} ${ORB_TYPES[orb].name}`);
                        } else {
                            inventoryItems.push(`${orb} orb`);
                        }
                    }
                }
                const inventoryText = inventoryItems.length > 0 ? 
                    `<br><br><strong>Your current inventory will be retained:</strong><br>${inventoryItems.join('<br>')}` : 
                    '<br><br><strong>Your inventory is currently empty.</strong>';
                
                this.showConfirmationDialog(
                    '📍 RETURN TO CHECKPOINT',
                    `Are you sure you want to return to Checkpoint ${checkpointNumber}?<br><br>You will be taken to Floor ${checkpointFloor} and retain your current inventory.${inventoryText}`,
                    () => {
                        this.isPaused = false;
                        this.hidePauseMenu();
                        GameState.respawnAtCheckpoint();
                    }
                );
            });
            
            document.getElementById('quitToMenu').addEventListener('click', () => {
                this.isPaused = false;
                this.hidePauseMenu();
                GameState.quitToMenu();
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('volume');
        const volumeValue = document.getElementById('volumeValue');
        volumeSlider.addEventListener('input', (e) => {
            volumeValue.textContent = `${Math.round(e.target.value * 100)}%`;
        });
        
        // Touch sensitivity slider
        const touchSlider = document.getElementById('touchSensitivity');
        const touchValue = document.getElementById('touchSensitivityValue');
        touchSlider.addEventListener('input', (e) => {
            touchValue.textContent = `${e.target.value}x`;
        });
        
        // Apply settings button
        document.getElementById('applySettings').addEventListener('click', () => {
            this.applySettingsFromModal();
            // Show confirmation message
            const message = document.getElementById('settingsMessage');
            if (message) {
                message.style.display = 'block';
                setTimeout(() => {
                    message.style.display = 'none';
                }, 3000);
            }
        });
        
        // Reset settings button
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            this.loadSettingsIntoModal();
        });
        
        // Close button
        document.getElementById('closeModal').addEventListener('click', () => {
            if (isPauseMenu) {
                this.isPaused = false;
                this.hidePauseMenu();
            } else {
                modal.remove();
            }
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (isPauseMenu) {
                    this.isPaused = false;
                    this.hidePauseMenu();
                } else {
                    modal.remove();
                }
            }
        });
    },

    // Apply settings from modal
    applySettingsFromModal() {
        this.settings.graphicsQuality = document.getElementById('graphicsQuality').value;
        this.settings.showFPS = document.getElementById('showFPS').checked;
        this.settings.showDebugInfo = document.getElementById('showDebugInfo').checked;
        this.settings.enableSoundEffects = document.getElementById('enableSoundEffects').checked;
        this.settings.autoSave = document.getElementById('autoSave').checked;
        
        this.saveSettings();
        this.applySettings();
    },

    // Apply current settings
    applySettings() {
        // Apply debug panel setting
        if (this.settings.showDebugInfo) {
            this.createDebugPanel();
        } else {
            this.removeDebugPanel();
        }
        
        // Apply touch sensitivity
        if (InputManager.touchControls) {
            InputManager.touchControls.sensitivity = this.settings.touchSensitivity;
        }
        
        // Apply graphics quality
        this.applyGraphicsQuality();
        
        console.log('Settings applied:', this.settings);
    },

    // Apply graphics quality settings
    applyGraphicsQuality() {
        const quality = this.settings.graphicsQuality;
        
        switch (quality) {
            case 'low':
                // Reduce particle count, disable some effects
                CONFIG.GRAPHICS = { particleMultiplier: 0.5, shadowQuality: 'low' };
                break;
            case 'medium':
                CONFIG.GRAPHICS = { particleMultiplier: 0.75, shadowQuality: 'medium' };
                break;
            case 'high':
                CONFIG.GRAPHICS = { particleMultiplier: 1.0, shadowQuality: 'high' };
                break;
        }
    },

    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('buriedSpireSettings');
            if (saved) {
                const parsedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsedSettings };
                console.log('Settings loaded from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    },

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('buriedSpireSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    },

    // Reset settings to default
    resetSettings() {
        this.settings = {
            showFPS: false,
            showDebugInfo: false,
            enableSoundEffects: true,
            graphicsQuality: 'high',
            autoSave: true,
            touchSensitivity: 1.0,
            volume: 0.7
        };
        this.saveSettings();
        this.applySettings();
    },

    // Show critical error
    showCriticalError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff0000;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 99999;
            text-align: center;
            max-width: 500px;
        `;
        
        errorDiv.innerHTML = `
            <h2>❌ Critical Error</h2>
            <p>The game failed to initialize properly.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <button onclick="location.reload()" style="background: white; color: #ff0000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                Reload Game
            </button>
        `;
        
        document.body.appendChild(errorDiv);
    },

    // Start the main game loop
    startGameLoop() {
        const gameLoop = (currentTime) => {
            try {
                // Calculate delta time
                const deltaTime = currentTime - this.lastTime;
                this.lastTime = currentTime;
                
                // Skip frame if delta time is too large (tab was inactive)
                if (deltaTime > 100) {
                    requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Skip updates if game is paused, but still render
                const isTutorialPaused = TutorialSystem.shouldPauseGame();
                if (!this.isPaused && !isTutorialPaused) {
                    // Update game logic
                    Utils.startPerformanceTimer('update');
                    GameLogic.update(deltaTime);
                    Utils.endPerformanceTimer('update');
                    
                    // Update performance metrics
                    Utils.updatePerformanceMetrics(deltaTime);
                } else {
                    // When paused, still update performance metrics but with 0 delta
                    Utils.updatePerformanceMetrics(0);
                }
                
                // Always render (even when paused to show pause overlay)
                Utils.startPerformanceTimer('render');
                const game = GameState.getGame();
                if (game) {
                    Renderer.render(game);
                    
                    // Show pause overlay if paused
                    if (this.isPaused && game.state === 'playing') {
                        this.renderPauseOverlay();
                    }
                }
                Utils.endPerformanceTimer('render');
                
                // Show FPS if enabled
                if (this.settings.showFPS) {
                    this.showFPS(deltaTime);
                }
                
                // Auto-save periodically (only when not paused)
                if (!this.isPaused && this.settings.autoSave) {
                    this.autoSave();
                }
                
            } catch (error) {
                console.error('❌ Game loop error:', error);
                this.showCriticalError(error);
                return; // Stop the game loop on critical error
            }
            
            // Continue the loop
            requestAnimationFrame(gameLoop);
        };
        
        // Start the loop
        this.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    },

    // Render pause overlay on canvas
    renderPauseOverlay() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Pause text
        ctx.fillStyle = '#87CEEB';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸️ PAUSED', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#B0C4DE';
        ctx.font = '24px monospace';
        ctx.fillText('Press ESC to resume or open settings', canvas.width / 2, canvas.height / 2 + 20);
    },

    // Show FPS counter
    showFPS(deltaTime) {
        let fpsDisplay = document.getElementById('fpsDisplay');
        if (!fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.id = 'fpsDisplay';
            fpsDisplay.style.cssText = `
                position: fixed;
                top: 50px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: #00ff00;
                padding: 5px 10px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                z-index: 9998;
            `;
            document.body.appendChild(fpsDisplay);
        }
        
        const fps = Math.round(1000 / deltaTime);
        const color = fps >= 50 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000';
        fpsDisplay.style.color = color;
        fpsDisplay.textContent = `${fps} FPS`;
    },

    // Auto-save game progress
    autoSave() {
        try {
            const game = GameState.getGame();
            if (game.state === 'playing' && !game.deathScreen && !game.victory) {
                // Only save every 10 seconds to avoid infinite save loop
                const now = Date.now();
                if (!this.lastAutoSave || (now - this.lastAutoSave) >= 10000) {
                    this.lastAutoSave = now;
                    GameState.saveGame();
                    
                    // Show save indicator
                    this.showSaveIndicator();
                }
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    },

    // Show save indicator
    showSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 10px;
            background: rgba(0, 255, 0, 0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            z-index: 9997;
        `;
        indicator.textContent = '💾 Saved';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    },

    // Load settings into modal
    loadSettingsIntoModal() {
        // Set current values
        document.getElementById('graphicsQuality').value = this.settings.graphicsQuality;
        document.getElementById('showFPS').checked = this.settings.showFPS;
        document.getElementById('showDebugInfo').checked = this.settings.showDebugInfo;
        document.getElementById('enableSoundEffects').checked = this.settings.enableSoundEffects;
        document.getElementById('autoSave').checked = this.settings.autoSave;
        document.getElementById('volume').value = this.settings.volume;
        document.getElementById('touchSensitivity').value = this.settings.touchSensitivity;
        
        // Update display values
        document.getElementById('volumeValue').textContent = `${Math.round(this.settings.volume * 100)}%`;
        document.getElementById('touchSensitivityValue').textContent = `${this.settings.touchSensitivity}x`;
    }
};

// Handle page visibility changes (pause/resume)
document.addEventListener('visibilitychange', () => {
    try {
        const game = GameState.getGame();
        if (game && game.state) {
            if (document.hidden) {
                game.paused = true;
                console.log('Game paused (tab hidden)');
            } else {
                game.paused = false;
                console.log('Game resumed (tab visible)');
            }
        }
    } catch (error) {
        console.warn('Failed to handle visibility change:', error);
    }
});

// Handle beforeunload for auto-save
window.addEventListener('beforeunload', (e) => {
    if (Game.settings && Game.settings.autoSave) {
        try {
            GameState.saveGame();
        } catch (error) {
            console.warn('Failed to save on page unload:', error);
        }
    }
});

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Check for required elements
    const requiredElements = [
        'gameCanvas',
        'minimap',
        'ui',
        'inventory'
    ];
    
    let missingElements = [];
    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            missingElements.push(elementId);
        }
    }
    
    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements);
        alert('Game cannot start - missing required elements: ' + missingElements.join(', '));
        return;
    }
    
    // Initialize the game
    try {
        Game.init();
        console.log('✅ Game initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        alert('Failed to initialize game: ' + error.message);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    // Game uses fixed canvas size, but we could add responsive handling here
    console.log('Window resized');
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Game object handles its own errors through GameLogic
});

// Export for debugging
window.GameDebug = {
    getGame: () => GameState.getGame(),
    getStats: () => {
        try {
            const game = GameState.getGame();
            return GameState.getFormattedStats();
        } catch (error) {
            return { error: 'Could not get stats' };
        }
    },
    resetGame: () => {
        try {
            GameState.resetGame();
            console.log('Game reset');
        } catch (error) {
            console.error('Failed to reset game:', error);
        }
    },
    teleportToFloor: (floor) => {
        try {
            const game = GameState.getGame();
            game.floor = Math.max(1, Math.min(floor, CONFIG.GAME.MAX_FLOORS));
            MapGenerator.generateFloor(game, game.floor);
        } catch (error) {
            console.error('Failed to teleport:', error);
        }
    },
    giveOrb: (type) => {
        try {
            const game = GameState.getGame();
            const slot = InventoryManager.getFirstEmptySlot();
            if (slot >= 0 && ORB_TYPES[type]) {
                game.player.inventory[slot] = type;
                InventoryManager.updateDisplay();
            }
        } catch (error) {
            console.error('Failed to give orb:', error);
        }
    },
    setLight: (amount) => {
        try {
            const game = GameState.getGame();
            game.player.light = Math.max(0, Math.min(amount, CONFIG.PLAYER.MAX_LIGHT));
        } catch (error) {
            console.error('Failed to set light:', error);
        }
    }
};

console.log('Main game script loaded. Game will initialize when DOM is ready.');
console.log('Debug commands available in console via window.GameDebug');

// Handle key down events
document.addEventListener('keydown', (e) => {
    if (Game.game && Game.game.state === 'playing') {
        // Movement keys
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
            Game.keys.up = true;
        }
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
            Game.keys.down = true;
        }
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
            Game.keys.left = true;
        }
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
            Game.keys.right = true;
        }
        
        // Inventory slots
        if (e.key >= '1' && e.key <= '3') {
            const slot = parseInt(e.key) - 1;
            if (typeof InventoryManager !== 'undefined') {
                InventoryManager.useOrb(slot);
            }
        }
        
        // Help
        if (e.key === 'h' || e.key === 'H') {
            Game.game.showHelp = !Game.game.showHelp;
        }
        
        // Pause/Settings
        if (e.key === 'Escape') {
            Game.togglePause();
        }
        
        // Debug inventory (Ctrl+D)
        if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            Game.debugInventorySystem();
        }
    }
}); 