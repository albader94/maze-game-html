// Main Game Entry Point
class Game {
    constructor() {
        this.lastTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.settings = {
            showFPS: false,
            showDebugInfo: false,
            enableSoundEffects: true,
            graphicsQuality: 'high', // low, medium, high
            autoSave: true,
            touchSensitivity: 1.0,
            volume: 0.7
        };
    }

    // Initialize the game
    init() {
        console.log('🎮 Initializing Buried Spire of Kuwait - Explorer Mode');
        
        try {
            // Load settings from localStorage
            this.loadSettings();
            
            // Initialize all systems
            GameState.init();
            Renderer.init();
            InputManager.init();
            GameLogic.init();
            
            // Setup development tools
            this.setupDevTools();
            
            // Setup settings UI
            this.setupSettingsUI();
            
            // Start the game loop
            this.start();
            
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showCriticalError(error);
        }
    }

    // Start the game loop
    start() {
        console.log('Starting game loop');
        this.gameLoop();
    }

    // Main game loop
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= this.frameInterval) {
            try {
                // Update game logic
                this.update();
                
                // Render the game
                this.render();
                
                this.lastTime = currentTime - (deltaTime % this.frameInterval);
            } catch (error) {
                console.error('Error in game loop:', error);
                this.showError('Game encountered an error. Please refresh the page.');
                return;
            }
        }

        // Continue the loop
        requestAnimationFrame(() => this.gameLoop());
    }

    // Update game state
    update() {
        GameLogic.update();
    }

    // Render the game
    render() {
        const game = GameState.getGame();
        Renderer.render(game);
    }

    // Show error message
    showError(message) {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#f44336';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ERROR', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.textAlign = 'left';
    }

    // Get current FPS
    getFPS() {
        return Math.round(1000 / this.frameInterval);
    }

    // Get game version
    getVersion() {
        return '1.0.0';
    }

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
                const orbConfig = CONFIG.ORBS[type.toUpperCase()];
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

    // Setup settings UI
    setupSettingsUI() {
        // Add settings button to UI
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '⚙️';
        settingsBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: 1px solid #666;
            border-radius: 5px;
            padding: 8px 12px;
            cursor: pointer;
            z-index: 1001;
            font-size: 16px;
        `;
        
        settingsBtn.addEventListener('click', () => this.showSettingsModal());
        document.body.appendChild(settingsBtn);
    },

    // Show settings modal
    showSettingsModal() {
        // Remove existing modal
        const existing = document.getElementById('settingsModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: #1a1a1a;
            color: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 400px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
        `;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #ffd700;">⚙️ Settings</h2>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">Graphics Quality:</label>
                <select id="graphicsQuality" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #666;">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="showFPS" style="margin-right: 8px;">
                    Show FPS Counter
                </label>
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="showDebugInfo" style="margin-right: 8px;">
                    Show Debug Panel
                </label>
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="enableSoundEffects" style="margin-right: 8px;">
                    Enable Sound Effects
                </label>
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" id="autoSave" style="margin-right: 8px;">
                    Auto Save Progress
                </label>
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">Volume: <span id="volumeValue">${Math.round(this.settings.volume * 100)}%</span></label>
                <input type="range" id="volume" min="0" max="1" step="0.1" value="${this.settings.volume}" style="width: 100%;">
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px;">Touch Sensitivity: <span id="touchSensitivityValue">${this.settings.touchSensitivity}</span></label>
                <input type="range" id="touchSensitivity" min="0.5" max="2" step="0.1" value="${this.settings.touchSensitivity}" style="width: 100%;">
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
                <button id="resetSettings" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 5px; margin-right: 10px; cursor: pointer;">Reset to Default</button>
                <button id="closeSettings" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Set current values
        document.getElementById('graphicsQuality').value = this.settings.graphicsQuality;
        document.getElementById('showFPS').checked = this.settings.showFPS;
        document.getElementById('showDebugInfo').checked = this.settings.showDebugInfo;
        document.getElementById('enableSoundEffects').checked = this.settings.enableSoundEffects;
        document.getElementById('autoSave').checked = this.settings.autoSave;
        
        // Setup event listeners
        this.setupSettingsEventListeners(modal);
    },

    // Setup settings event listeners
    setupSettingsEventListeners(modal) {
        // Volume slider
        const volumeSlider = document.getElementById('volume');
        const volumeValue = document.getElementById('volumeValue');
        volumeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            volumeValue.textContent = `${Math.round(value * 100)}%`;
            this.settings.volume = value;
        });
        
        // Touch sensitivity slider
        const touchSlider = document.getElementById('touchSensitivity');
        const touchValue = document.getElementById('touchSensitivityValue');
        touchSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            touchValue.textContent = value;
            this.settings.touchSensitivity = value;
        });
        
        // Close button
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.applySettingsFromModal();
            modal.remove();
        });
        
        // Reset button
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            modal.remove();
            this.showSettingsModal(); // Reopen with default values
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.applySettingsFromModal();
                modal.remove();
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
        const canvas = document.getElementById('gameCanvas');
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
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            // Update game logic
            GameLogic.update(deltaTime);
            
            // Render game
            GameLogic.render();
            
            // Show FPS if enabled
            if (this.settings.showFPS) {
                this.showFPS(deltaTime);
            }
            
            // Auto-save if enabled
            if (this.settings.autoSave && Math.random() < 0.001) { // ~1% chance per frame
                this.autoSave();
            }
            
            // Continue loop
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
        console.log('🔄 Game loop started');
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
            if (game.state === 'playing' && !game.deathScreen) {
                GameState.saveGame();
                
                // Show save indicator
                this.showSaveIndicator();
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
    }
}

// Global game instance
let gameInstance = null;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Check for required elements
    const requiredElements = [
        'gameCanvas',
        'minimap',
        'ui',
        'inventory',
        'story'
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
    
    // Create and initialize game
    gameInstance = new Game();
    gameInstance.init();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Game paused (tab hidden)');
    } else {
        console.log('Game resumed (tab visible)');
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
    if (gameInstance) {
        gameInstance.showError('An unexpected error occurred.');
    }
});

// Export for debugging
window.GameDebug = {
    getGame: () => GameState.getGame(),
    getStats: () => GameLogic.getStatistics(GameState.getGame()),
    getFPS: () => gameInstance ? gameInstance.getFPS() : 0,
    getVersion: () => gameInstance ? gameInstance.getVersion() : 'Unknown',
    resetGame: () => GameLogic.resetGame(),
    teleportToFloor: (floor) => {
        const game = GameState.getGame();
        game.floor = Math.max(1, Math.min(floor, CONFIG.GAME.MAX_FLOORS));
        MapGenerator.generateFloor(game, game.floor);
    },
    giveOrb: (type) => {
        const game = GameState.getGame();
        const slot = InventoryManager.getFirstEmptySlot();
        if (slot >= 0 && ORB_TYPES[type]) {
            game.player.inventory[slot] = type;
            InventoryManager.updateDisplay();
        }
    },
    setLight: (amount) => {
        const game = GameState.getGame();
        game.player.light = Math.max(0, Math.min(amount, CONFIG.PLAYER.MAX_LIGHT));
    }
};

console.log('Main game script loaded. Game will initialize when DOM is ready.');
console.log('Debug commands available in console via window.GameDebug'); 