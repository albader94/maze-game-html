// Main Game Initialization and Loop
const Game = {
    lastTime: 0,
    targetFPS: 60,
    frameInterval: 1000 / 60,
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
        console.log('🎮 Initializing Buried Spire of Kuwait - Explorer Mode');
        
        try {
            // Load settings from localStorage
            this.loadSettings();
            
            // Initialize all game systems
            GameState.init();
            Renderer.init();
            InputManager.init();
            GameLogic.init();
            
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
        settingsBtn.addEventListener('click', () => this.showSettingsModal());
        document.body.appendChild(settingsBtn);
    },

    // Show settings modal
    showSettingsModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) {
            existingModal.remove();
        }

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
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const stats = GameState.getFormattedStats();
        const achievements = Array.from(GameState.stats.achievements);
        const achievementsList = achievements.map(id => {
            const achievement = GameState.achievements[id];
            return achievement ? `<div style="margin: 5px 0; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">${achievement.icon}</span>
                <div>
                    <div style="font-weight: bold;">${achievement.name}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${achievement.description}</div>
                </div>
            </div>` : '';
        }).join('');

        modal.innerHTML = `
            <div style="background: #2c1810; border: 3px solid #8B4513; border-radius: 10px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #D2691E;">⚙️ Game Settings & Stats</h2>
                    <button id="closeModal" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
                </div>
                
                <!-- Tabs -->
                <div style="display: flex; margin-bottom: 20px; border-bottom: 2px solid #8B4513;">
                    <button id="settingsTab" class="tab-btn active" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; cursor: pointer;">Settings</button>
                    <button id="statsTab" class="tab-btn" style="flex: 1; padding: 10px; background: #2c1810; color: white; border: none; cursor: pointer;">Statistics</button>
                    <button id="achievementsTab" class="tab-btn" style="flex: 1; padding: 10px; background: #2c1810; color: white; border: none; cursor: pointer;">Achievements</button>
                </div>
                
                <!-- Settings Panel -->
                <div id="settingsPanel" class="tab-panel">
                    <div style="display: grid; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px;">Graphics Quality:</label>
                            <select id="graphicsQuality" style="width: 100%; padding: 5px; background: #1a1a1a; color: white; border: 1px solid #8B4513;">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="showFPS" style="transform: scale(1.2);">
                                Show FPS Counter
                            </label>
                        </div>
                        
                        <div>
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="showDebugInfo" style="transform: scale(1.2);">
                                Show Debug Panel
                            </label>
                        </div>
                        
                        <div>
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="enableSoundEffects" style="transform: scale(1.2);">
                                Sound Effects
                            </label>
                        </div>
                        
                        <div>
                            <label style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" id="autoSave" style="transform: scale(1.2);">
                                Auto-save Progress
                            </label>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 5px;">Volume: <span id="volumeValue">${Math.round(this.settings.volume * 100)}%</span></label>
                            <input type="range" id="volume" min="0" max="1" step="0.1" value="${this.settings.volume}" style="width: 100%;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 5px;">Touch Sensitivity: <span id="touchSensitivityValue">${this.settings.touchSensitivity}x</span></label>
                            <input type="range" id="touchSensitivity" min="0.5" max="2" step="0.1" value="${this.settings.touchSensitivity}" style="width: 100%;">
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button id="applySettings" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 5px; cursor: pointer;">Apply Settings</button>
                            <button id="resetSettings" style="flex: 1; padding: 10px; background: #8B4513; color: white; border: none; border-radius: 5px; cursor: pointer;">Reset to Defaults</button>
                        </div>
                    </div>
                </div>
                
                <!-- Statistics Panel -->
                <div id="statsPanel" class="tab-panel" style="display: none;">
                    <div style="display: grid; gap: 15px;">
                        <h3 style="margin: 0; color: #D2691E;">📊 Game Statistics</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                            <div><strong>Total Play Time:</strong> ${stats.totalPlayTime}</div>
                            <div><strong>Games Played:</strong> ${stats.gamesPlayed}</div>
                            <div><strong>Deepest Floor:</strong> ${stats.deepestFloor}</div>
                            <div><strong>Total Deaths:</strong> ${stats.totalDeaths}</div>
                            <div><strong>Orbs Collected:</strong> ${stats.totalOrbsCollected}</div>
                            <div><strong>Ghouls Defeated:</strong> ${stats.totalGhoulsDefeated}</div>
                            <div><strong>Distance Traveled:</strong> ${stats.totalDistanceTraveled}</div>
                            <div><strong>Fastest Completion:</strong> ${stats.fastestCompletion}</div>
                        </div>
                        <div style="margin-top: 15px;">
                            <strong>Achievements: ${stats.achievementsUnlocked}/${stats.totalAchievements}</strong>
                            <div style="width: 100%; background: #1a1a1a; border-radius: 10px; overflow: hidden; margin-top: 5px;">
                                <div style="width: ${(stats.achievementsUnlocked / stats.totalAchievements) * 100}%; height: 20px; background: linear-gradient(90deg, #8B4513, #D2691E); transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Achievements Panel -->
                <div id="achievementsPanel" class="tab-panel" style="display: none;">
                    <h3 style="margin: 0 0 15px 0; color: #D2691E;">🏆 Achievements</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${achievementsList || '<div style="text-align: center; opacity: 0.6; padding: 20px;">No achievements unlocked yet!</div>'}
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background: rgba(139, 69, 19, 0.2); border-radius: 5px; font-size: 12px; opacity: 0.8;">
                        💡 Tip: Play the game to unlock achievements and track your progress!
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Setup tab switching
        this.setupTabSwitching(modal);
        
        // Setup event listeners
        this.setupSettingsEventListeners(modal);
        
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
                    t.style.background = '#2c1810';
                });
                panels.forEach(p => p.style.display = 'none');
                
                // Add active class to clicked tab
                tab.classList.add('active');
                tab.style.background = '#8B4513';
                
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
    setupSettingsEventListeners(modal) {
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
        });
        
        // Reset settings button
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
            this.loadSettingsIntoModal();
        });
        
        // Close button
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
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
            
            try {
                // Get game state with safety check
                const game = GameState.getGame();
                if (!game) {
                    console.warn('Game object is null/undefined, skipping frame');
                    requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Update game state and statistics
                GameLogic.update(deltaTime);
                GameState.updateStats(deltaTime);
                
                // Render the game
                Renderer.render(game);
                
                // Show FPS if enabled
                if (this.settings.showFPS) {
                    this.showFPS(deltaTime);
                }
                
                // Auto-save periodically
                if (this.settings.autoSave && currentTime % 30000 < 100) { // Every 30 seconds
                    this.autoSave();
                }
                
            } catch (error) {
                console.error('Game loop error:', error);
                // Continue the loop even if there's an error
            }
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
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