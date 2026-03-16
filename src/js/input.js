// Input Management
const InputManager = {
    keys: {},
    touchControls: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deadzone: 15,
        sensitivity: 1.0,
        identifier: null
    },
    isMobile: false,
    hasTouchSupport: false,
    canvasScale: null,

    // Initialize input handlers
    init() {
        this.detectMobile();
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupResponsiveCanvas();

        // Setup mobile UI and touch events if touch-capable device
        if (this.isMobile || this.hasTouchSupport) {
            this.setupMobileUI();
            // Touch events are set up AFTER mobile UI creates the DOM elements
            this.setupTouchEvents();
            this.setupCanvasTouchEvents();
        }
    },

    // Detect mobile devices and touch support
    detectMobile() {
        this.hasTouchSupport = ('ontouchstart' in window) ||
                               (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (this.hasTouchSupport && (window.innerWidth <= 1024));
    },

    // Setup responsive canvas
    setupResponsiveCanvas() {
        const canvas = document.getElementById('gameCanvas');
        const container = document.getElementById('gameContainer');

        const resizeCanvas = () => {
            const containerWidth = container.clientWidth || window.innerWidth;
            const containerHeight = container.clientHeight || window.innerHeight;
            const aspectRatio = CONFIG.CANVAS.WIDTH / CONFIG.CANVAS.HEIGHT;

            let newWidth, newHeight;

            if (this.isMobile) {
                // Mobile: use full available screen
                newWidth = window.innerWidth;
                newHeight = window.innerHeight;

                // Maintain aspect ratio
                if (newWidth / newHeight > aspectRatio) {
                    newWidth = newHeight * aspectRatio;
                } else {
                    newHeight = newWidth / aspectRatio;
                }
            } else {
                // Desktop: maintain fixed size or scale down if needed
                newWidth = Math.min(CONFIG.CANVAS.WIDTH, containerWidth);
                newHeight = Math.min(CONFIG.CANVAS.HEIGHT, containerHeight);

                if (newWidth / newHeight > aspectRatio) {
                    newWidth = newHeight * aspectRatio;
                } else {
                    newHeight = newWidth / aspectRatio;
                }
            }

            canvas.style.width = `${newWidth}px`;
            canvas.style.height = `${newHeight}px`;

            // Update canvas scale factor for input calculations
            this.canvasScale = {
                x: CONFIG.CANVAS.WIDTH / newWidth,
                y: CONFIG.CANVAS.HEIGHT / newHeight
            };
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 150);
        });

        // Also handle visual viewport changes (iOS keyboard, etc.)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resizeCanvas);
        }

        resizeCanvas();
    },

    // Setup mobile UI elements
    setupMobileUI() {
        // Prevent duplicate setup
        if (document.getElementById('virtualJoystick')) return;

        // Create virtual joystick
        const joystick = document.createElement('div');
        joystick.id = 'virtualJoystick';
        joystick.innerHTML = `
            <div class="joystick-outer">
                <div class="joystick-inner" id="joystickInner"></div>
            </div>
        `;
        document.body.appendChild(joystick);

        // Create mobile action buttons (right side)
        const actionButtons = document.createElement('div');
        actionButtons.id = 'mobileActions';
        actionButtons.innerHTML = `
            <button class="mobile-btn mobile-pause-btn" data-action="pause">| |</button>
            <button class="mobile-btn orb-btn" data-action="orb1">1</button>
            <button class="mobile-btn orb-btn" data-action="orb2">2</button>
            <button class="mobile-btn orb-btn" data-action="orb3">3</button>
        `;
        document.body.appendChild(actionButtons);

        // Create a mobile help/close button (for help screen and game-over)
        const helpBtn = document.createElement('button');
        helpBtn.id = 'mobileHelpBtn';
        helpBtn.className = 'mobile-btn';
        helpBtn.dataset.action = 'help';
        helpBtn.textContent = '?';
        helpBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(helpBtn);

        // Add mobile-specific CSS
        this.addMobileStyles();

        // Setup mobile button events
        this.setupMobileButtons();
    },

    // Add mobile-specific styles
    addMobileStyles() {
        const style = document.createElement('style');
        style.id = 'mobileInputStyles';
        style.textContent = `
            #virtualJoystick {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 120px;
                height: 120px;
                display: none;
                z-index: 1000;
                touch-action: none;
            }

            .joystick-outer {
                width: 100%;
                height: 100%;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.4);
                position: relative;
                touch-action: none;
            }

            .joystick-inner {
                width: 46px;
                height: 46px;
                background: rgba(255, 255, 255, 0.6);
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
                touch-action: none;
            }

            #mobileActions {
                position: fixed;
                bottom: 20px;
                right: 15px;
                display: none;
                flex-direction: column;
                gap: 10px;
                z-index: 1000;
                touch-action: none;
            }

            .mobile-btn {
                width: 52px;
                height: 52px;
                min-width: 44px;
                min-height: 44px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mobile-btn:active, .mobile-btn.active {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(0.92);
            }

            .mobile-pause-btn {
                background: rgba(139, 69, 19, 0.7);
                border-color: rgba(218, 165, 32, 0.5);
                font-size: 12px;
                letter-spacing: 2px;
            }

            .orb-btn {
                font-family: monospace;
                font-size: 18px;
            }

            /* Show/hide mobile controls based on game state */
            body.mobile-active #virtualJoystick,
            body.mobile-active #mobileActions {
                display: flex;
            }

            body.mobile-active #mobileHelpBtn {
                display: flex;
            }

            /* Hide joystick and action buttons during menus/death */
            body.mobile-menu #virtualJoystick,
            body.mobile-menu #mobileActions,
            body.mobile-menu #mobileHelpBtn {
                display: none;
            }

            /* Ensure tutorial and story overlays have touch-friendly buttons */
            #tutorialPopup button,
            #storyOverlay button,
            #victory-overlay button,
            #settingsModal button {
                min-width: 44px;
                min-height: 44px;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            /* Mobile-friendly story overlay text */
            @media (max-width: 768px) {
                #storyOverlay #storyText {
                    font-size: 18px !important;
                    padding: 20px !important;
                    max-width: 90vw !important;
                }

                #tutorialPopup > div > div {
                    max-width: 95vw !important;
                    padding: 20px !important;
                }

                #victory-overlay > div {
                    max-width: 95vw !important;
                    padding: 20px !important;
                }

                /* Larger tap targets for mobile */
                #tutorialPopup button,
                #storyOverlay button {
                    min-height: 48px;
                    padding: 14px 28px !important;
                    font-size: 18px !important;
                }
            }

            /* Landscape adjustments for mobile controls */
            @media (max-height: 500px) and (orientation: landscape) {
                #virtualJoystick {
                    width: 90px;
                    height: 90px;
                    bottom: 10px;
                    left: 10px;
                }

                .joystick-inner {
                    width: 36px;
                    height: 36px;
                }

                #mobileActions {
                    bottom: 10px;
                    right: 10px;
                    gap: 6px;
                }

                .mobile-btn {
                    width: 44px;
                    height: 44px;
                }
            }
        `;
        document.head.appendChild(style);
    },

    // Setup mobile button events
    setupMobileButtons() {
        const buttons = document.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            // Use touchstart for immediate response
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.classList.add('active');
                const action = btn.dataset.action;
                if (action) {
                    this.handleMobileAction(action);
                }

                // Enable audio on first user interaction
                if (window.SoundManager) {
                    SoundManager.handleUserInteraction();
                }
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('active');
            }, { passive: false });

            // Fallback click for non-touch
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                if (action) {
                    this.handleMobileAction(action);
                }
            });
        });
    },

    // Handle mobile button actions
    handleMobileAction(action) {
        const game = GameState.getGame();

        switch (action) {
            case 'pause':
                if (game.state === 'playing' && !game.deathScreen && !game.victory) {
                    if (window.Game) {
                        window.Game.togglePause();
                    }
                }
                break;
            case 'help':
                if (game.state === 'playing' && !game.deathScreen && !game.victory) {
                    game.showHelp = !game.showHelp;
                }
                break;
            case 'orb1':
            case 'orb2':
            case 'orb3':
                if (game.state === 'playing' && !game.deathScreen && !game.showHelp && !game.victory) {
                    const slot = parseInt(action.slice(-1)) - 1;
                    if (typeof InventoryManager !== 'undefined') {
                        InventoryManager.useOrb(slot);
                    }
                }
                break;
        }
    },

    // Setup keyboard event listeners
    setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleKeyDown(e);

            // Enable audio on first user interaction
            if (window.SoundManager) {
                SoundManager.handleUserInteraction();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    },

    // Setup mouse event listeners
    setupMouseEvents() {
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('click', (e) => {
            this.handleCanvasInteraction(e.clientX, e.clientY);

            // Enable audio on first user interaction
            if (window.SoundManager) {
                SoundManager.handleUserInteraction();
            }
        });
    },

    // Setup touch events for the virtual joystick
    setupTouchEvents() {
        const joystickOuter = document.querySelector('.joystick-outer');
        const joystickInner = document.getElementById('joystickInner');

        if (!joystickOuter || !joystickInner) {
            console.warn('Joystick elements not found, skipping touch event setup');
            return;
        }

        const outerRadius = 60; // half of 120px joystick
        const maxKnobTravel = 35; // max pixels the inner knob can move

        joystickOuter.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches[0];
            this.touchControls.active = true;
            this.touchControls.identifier = touch.identifier;
            const rect = joystickOuter.getBoundingClientRect();
            this.touchControls.startX = rect.left + rect.width / 2;
            this.touchControls.startY = rect.top + rect.height / 2;
            this.touchControls.currentX = touch.clientX;
            this.touchControls.currentY = touch.clientY;

            // Enable audio on first touch
            if (window.SoundManager) {
                SoundManager.handleUserInteraction();
            }
        }, { passive: false });

        joystickOuter.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.touchControls.active) return;

            // Find the correct touch by identifier
            let touch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchControls.identifier) {
                    touch = e.touches[i];
                    break;
                }
            }
            if (!touch) return;

            this.touchControls.currentX = touch.clientX;
            this.touchControls.currentY = touch.clientY;

            // Calculate delta from center of joystick
            const deltaX = this.touchControls.currentX - this.touchControls.startX;
            const deltaY = this.touchControls.currentY - this.touchControls.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Update joystick visual - clamp to max travel
            let displayX, displayY;
            if (distance > maxKnobTravel) {
                const angle = Math.atan2(deltaY, deltaX);
                displayX = Math.cos(angle) * maxKnobTravel;
                displayY = Math.sin(angle) * maxKnobTravel;
            } else {
                displayX = deltaX;
                displayY = deltaY;
            }

            // Position inner knob relative to center
            joystickInner.style.left = `${outerRadius + displayX}px`;
            joystickInner.style.top = `${outerRadius + displayY}px`;
            joystickInner.style.transform = 'translate(-50%, -50%)';
        }, { passive: false });

        const endTouch = (e) => {
            // Check if the ended touch matches our tracked one
            if (e.changedTouches) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.touchControls.identifier) {
                        this.touchControls.active = false;
                        this.touchControls.identifier = null;
                        // Reset joystick visual to center
                        joystickInner.style.left = '50%';
                        joystickInner.style.top = '50%';
                        joystickInner.style.transform = 'translate(-50%, -50%)';
                        break;
                    }
                }
            }
        };

        joystickOuter.addEventListener('touchend', (e) => {
            e.preventDefault();
            endTouch(e);
        }, { passive: false });

        joystickOuter.addEventListener('touchcancel', (e) => {
            endTouch(e);
        }, { passive: false });

        console.log('Virtual joystick touch events initialized');
    },

    // Setup touch events on the canvas for menu/UI interactions
    setupCanvasTouchEvents() {
        const canvas = document.getElementById('gameCanvas');

        // Prevent all default touch behaviors on canvas
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();

            // Enable audio on first touch
            if (window.SoundManager) {
                SoundManager.handleUserInteraction();
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Use the last changed touch position as a "click"
            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                this.handleCanvasInteraction(touch.clientX, touch.clientY);
            }
        }, { passive: false });
    },

    // Unified handler for canvas interactions (both click and touch)
    handleCanvasInteraction(clientX, clientY) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;

        // Apply canvas scaling if responsive
        if (this.canvasScale) {
            x *= this.canvasScale.x;
            y *= this.canvasScale.y;
        }

        const game = GameState.getGame();

        if (game.state === 'menu') {
            this.handleMenuClick(x, y);
        } else if (game.deathScreen) {
            this.handleDeathScreenClick(x, y);
        } else if (game.gameOver && !game.victory) {
            // Game over screen: treat any tap as "R" key (return to menu)
            GameState.quitToMenu();
        } else if (game.showHelp) {
            // Tap anywhere to dismiss help screen on mobile
            game.showHelp = false;
        }
    },

    // Handle key down events
    handleKeyDown(e) {
        const game = GameState.getGame();

        // ESC key to toggle pause
        if (e.key === 'Escape') {
            e.preventDefault();
            if (game.state === 'playing' && !game.deathScreen && !game.gameOver && !game.victory) {
                if (window.Game) {
                    window.Game.togglePause();
                }
            }
            return;
        }

        // Direct orb usage (1-3 keys)
        if (e.key >= '1' && e.key <= '3' && game.state === 'playing' && !game.deathScreen && !game.showHelp && !game.victory) {
            const slot = parseInt(e.key) - 1;
            if (typeof InventoryManager !== 'undefined') {
                InventoryManager.useOrb(slot);
            }
        }

        // Help toggle
        if (e.key.toLowerCase() === 'h') {
            if (game.state === 'playing' && !game.deathScreen && !game.victory) {
                game.showHelp = !game.showHelp;
            }
        }

        // Return to menu from game over/victory
        if (e.key.toLowerCase() === 'r' && (game.gameOver || game.victory)) {
            GameState.quitToMenu();
        }

        // Start game from menu (but not if story narration is playing)
        if (e.key === ' ' && game.state === 'menu' && !(window.StoryNarration && window.StoryNarration.isPlaying)) {
            e.preventDefault();
            GameState.startGame();
        }
    },

    // Handle mouse clicks (legacy - now uses handleCanvasInteraction)
    handleClick(e) {
        this.handleCanvasInteraction(e.clientX, e.clientY);
    },

    // Handle menu clicks
    handleMenuClick(x, y) {
        const canvas = document.getElementById('gameCanvas');
        const centerX = canvas.width / 2;
        const buttonWidth = 300;
        const buttonHeight = 45;
        const buttonSpacing = 55;
        const startY = 200;

        const buttons = [
            { text: 'NEW GAME', y: startY, action: 'newGame' },
            { text: 'LEADERBOARDS', y: startY + buttonSpacing, action: 'leaderboards' },
            { text: 'SETTINGS', y: startY + buttonSpacing * 2, action: 'settings' }
        ];

        // Check which button was clicked/tapped
        for (const button of buttons) {
            if (x >= centerX - buttonWidth/2 && x <= centerX + buttonWidth/2 &&
                y >= button.y && y <= button.y + buttonHeight) {
                this.handleMenuAction(button.action);
                break;
            }
        }
    },

    // Handle menu button actions
    handleMenuAction(action) {
        // Play button select sound
        if (window.SoundManager) {
            SoundManager.playButtonSelect();
        }

        switch (action) {
            case 'newGame':
                // Start story narration first, which will then start the game
                if (window.StoryNarration) {
                    StoryNarration.start();
                } else {
                    // Fallback if story system not available
                    GameState.startGame();
                }
                break;
            case 'leaderboards':
                // Open settings modal to the stats/achievements tab as a placeholder
                if (window.Game && window.Game.showSettingsModal) {
                    window.Game.showSettingsModal(false);
                    // Switch to stats tab after modal opens
                    setTimeout(() => {
                        const statsTab = document.getElementById('statsTab');
                        if (statsTab) statsTab.click();
                    }, 100);
                }
                break;
            case 'settings':
                if (window.Game && window.Game.showSettingsModal) {
                    window.Game.showSettingsModal(false);
                }
                break;
        }
    },

    // Handle death screen clicks
    handleDeathScreenClick(x, y) {
        const canvas = document.getElementById('gameCanvas');
        const btnY = 460;
        const btnHeight = 50;
        const btnGap = 20;

        // Respawn button
        if (x >= canvas.width / 2 - 200 - btnGap &&
            x <= canvas.width / 2 - 20 - btnGap &&
            y >= btnY && y <= btnY + btnHeight) {
            GameState.respawnAtCheckpoint();
        }

        // Quit button (starts at center + btnGap, width 180)
        if (x >= canvas.width / 2 + btnGap &&
            x <= canvas.width / 2 + btnGap + 180 &&
            y >= btnY && y <= btnY + btnHeight) {
            GameState.quitToMenu();
        }
    },

    // Check if key is pressed
    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] || false;
    },

    // Get movement input (supports both keyboard and touch)
    getMovementInput() {
        const movement = { x: 0, y: 0 };

        // Keyboard input
        if (this.isKeyPressed('arrowup') || this.isKeyPressed('w')) movement.y = -1;
        if (this.isKeyPressed('arrowdown') || this.isKeyPressed('s')) movement.y = 1;
        if (this.isKeyPressed('arrowleft') || this.isKeyPressed('a')) movement.x = -1;
        if (this.isKeyPressed('arrowright') || this.isKeyPressed('d')) movement.x = 1;

        // Touch input (virtual joystick)
        if (this.touchControls.active) {
            const deltaX = this.touchControls.currentX - this.touchControls.startX;
            const deltaY = this.touchControls.currentY - this.touchControls.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > this.touchControls.deadzone) {
                // Normalize and apply sensitivity
                // Scale movement from 0 to 1 based on distance (deadzone to max range)
                const maxRange = 60; // pixels for full speed
                const magnitude = Math.min((distance - this.touchControls.deadzone) / (maxRange - this.touchControls.deadzone), 1.0);
                const angle = Math.atan2(deltaY, deltaX);

                movement.x = Math.cos(angle) * magnitude * this.touchControls.sensitivity;
                movement.y = Math.sin(angle) * magnitude * this.touchControls.sensitivity;
            }
        }

        return movement;
    },

    // Update mobile UI visibility based on game state
    updateMobileUI() {
        if (!this.isMobile && !this.hasTouchSupport) return;

        const game = GameState.getGame();
        if (!game) return;

        const isPlaying = game.state === 'playing' && !game.deathScreen && !game.showHelp && !game.victory && !game.gameOver;
        const isPaused = window.Game && window.Game.isPaused;
        const isTutorialShowing = document.getElementById('tutorialPopup') !== null;

        if (isPlaying && !isPaused && !isTutorialShowing) {
            document.body.classList.add('mobile-active');
            document.body.classList.remove('mobile-menu');
        } else {
            document.body.classList.remove('mobile-active');
            document.body.classList.add('mobile-menu');
        }
    },

    // Get device info
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            hasTouchSupport: this.hasTouchSupport,
            touchSupport: 'ontouchstart' in window,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        };
    }
};