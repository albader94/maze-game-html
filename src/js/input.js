// Input Management
const InputManager = {
    keys: {},
    touchControls: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deadzone: 20,
        sensitivity: 0.8
    },
    isMobile: false,
    
    // Initialize input handlers
    init() {
        this.detectMobile();
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupTouchEvents();
        this.setupResponsiveCanvas();
        
        if (this.isMobile) {
            this.setupMobileUI();
        }
    },

    // Detect mobile devices
    detectMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    },

    // Setup responsive canvas
    setupResponsiveCanvas() {
        const canvas = document.getElementById('gameCanvas');
        const container = document.getElementById('gameContainer');
        
        const resizeCanvas = () => {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const aspectRatio = CONFIG.CANVAS.WIDTH / CONFIG.CANVAS.HEIGHT;
            
            let newWidth, newHeight;
            
            if (this.isMobile) {
                // Mobile: use full screen
                newWidth = Math.min(containerWidth, window.innerWidth);
                newHeight = Math.min(containerHeight, window.innerHeight);
                
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
            setTimeout(resizeCanvas, 100); // Delay for orientation change
        });
        
        resizeCanvas();
    },

    // Setup mobile UI elements
    setupMobileUI() {
        // Create virtual joystick
        const joystick = document.createElement('div');
        joystick.id = 'virtualJoystick';
        joystick.innerHTML = `
            <div class="joystick-outer">
                <div class="joystick-inner" id="joystickInner"></div>
            </div>
        `;
        document.body.appendChild(joystick);
        
        // Create mobile action buttons
        const actionButtons = document.createElement('div');
        actionButtons.id = 'mobileActions';
        actionButtons.innerHTML = `
            <button class="mobile-btn" data-action="help">?</button>
            <button class="mobile-btn orb-btn" data-action="orb1">1</button>
            <button class="mobile-btn orb-btn" data-action="orb2">2</button>
            <button class="mobile-btn orb-btn" data-action="orb3">3</button>
        `;
        document.body.appendChild(actionButtons);
        
        // Add mobile-specific CSS
        this.addMobileStyles();
        
        // Setup mobile button events
        this.setupMobileButtons();
    },

    // Add mobile-specific styles
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                body { overflow: hidden; }
                #gameContainer { 
                    width: 100vw; 
                    height: 100vh; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #ui { 
                    font-size: 12px; 
                    min-width: 180px;
                    padding: 8px;
                }
                #minimap { 
                    width: 120px; 
                    height: 120px; 
                }
                #inventory { 
                    bottom: 80px; 
                    gap: 10px;
                    padding: 10px;
                }
                .inventory-slot { 
                    width: 40px; 
                    height: 40px; 
                    font-size: 18px;
                }
            }
            
            #virtualJoystick {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 100px;
                height: 100px;
                display: ${this.isMobile ? 'block' : 'none'};
                z-index: 1000;
            }
            
            .joystick-outer {
                width: 100%;
                height: 100%;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.3);
                position: relative;
            }
            
            .joystick-inner {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.7);
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transition: all 0.1s ease;
            }
            
            #mobileActions {
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: ${this.isMobile ? 'flex' : 'none'};
                flex-direction: column;
                gap: 10px;
                z-index: 1000;
            }
            
            .mobile-btn {
                width: 50px;
                height: 50px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .mobile-btn:active {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(0.95);
            }
            
            .orb-btn {
                font-family: monospace;
            }
        `;
        document.head.appendChild(style);
    },

    // Setup mobile button events
    setupMobileButtons() {
        const buttons = document.querySelectorAll('.mobile-btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.handleMobileAction(action);
            });
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.handleMobileAction(action);
            });
        });
    },

    // Handle mobile button actions
    handleMobileAction(action) {
        const game = GameState.getGame();
        
        switch (action) {
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
                    InventoryManager.useOrb(slot);
                }
                break;
        }
    },

    // Setup keyboard event listeners
    setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.handleKeyDown(e);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    },

    // Setup mouse event listeners
    setupMouseEvents() {
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    },

    // Setup touch event listeners
    setupTouchEvents() {
        if (!this.isMobile) return;
        
        const joystickOuter = document.querySelector('.joystick-outer');
        const joystickInner = document.getElementById('joystickInner');
        
        if (!joystickOuter) return;
        
        joystickOuter.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchControls.active = true;
            const rect = joystickOuter.getBoundingClientRect();
            this.touchControls.startX = rect.left + rect.width / 2;
            this.touchControls.startY = rect.top + rect.height / 2;
        });
        
        joystickOuter.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchControls.active) return;
            
            const touch = e.touches[0];
            this.touchControls.currentX = touch.clientX;
            this.touchControls.currentY = touch.clientY;
            
            // Update joystick visual
            const deltaX = this.touchControls.currentX - this.touchControls.startX;
            const deltaY = this.touchControls.currentY - this.touchControls.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 30;
            
            if (distance > maxDistance) {
                const angle = Math.atan2(deltaY, deltaX);
                joystickInner.style.transform = `translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
            } else {
                joystickInner.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            }
        });
        
        joystickOuter.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.active = false;
            joystickInner.style.transform = 'translate(0, 0)';
        });
        
        // Prevent default touch behaviors on game canvas
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', (e) => e.preventDefault());
        canvas.addEventListener('touchmove', (e) => e.preventDefault());
        canvas.addEventListener('touchend', (e) => e.preventDefault());
    },

    // Handle key down events
    handleKeyDown(e) {
        const game = GameState.getGame();
        
        // ESC key to toggle pause
        if (e.key === 'Escape') {
            e.preventDefault();
            if (game.state === 'playing' && !game.deathScreen && !game.gameOver && !game.victory) {
                // Access the Game object from main.js
                if (window.Game) {
                    window.Game.togglePause();
                }
            }
            return;
        }
        
        // Direct orb usage (1-3 keys)
        if (e.key >= '1' && e.key <= '3' && game.state === 'playing' && !game.deathScreen && !game.showHelp && !game.victory) {
            const slot = parseInt(e.key) - 1;
            InventoryManager.useOrb(slot);
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
        
        // Start game from menu
        if (e.key === ' ' && game.state === 'menu') {
            e.preventDefault();
            GameState.startGame();
        }
    },

    // Handle mouse clicks
    handleClick(e) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
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
        }
    },

    // Handle menu clicks
    handleMenuClick(x, y) {
        const canvas = document.getElementById('gameCanvas');
        const startY = 350;
        
        // Start button
        if (x >= canvas.width / 2 - 100 && x <= canvas.width / 2 + 100 && 
            y >= startY && y <= startY + 60) {
            GameState.startGame();
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
        
        // Quit button
        if (x >= canvas.width / 2 + btnGap && 
            x <= canvas.width / 2 + 200 + btnGap &&
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
        if (this.isMobile && this.touchControls.active) {
            const deltaX = this.touchControls.currentX - this.touchControls.startX;
            const deltaY = this.touchControls.currentY - this.touchControls.startY;
            
            if (Math.abs(deltaX) > this.touchControls.deadzone) {
                movement.x = Math.sign(deltaX) * this.touchControls.sensitivity;
            }
            if (Math.abs(deltaY) > this.touchControls.deadzone) {
                movement.y = Math.sign(deltaY) * this.touchControls.sensitivity;
            }
        }
        
        return movement;
    },

    // Get device info
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            touchSupport: 'ontouchstart' in window,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
        };
    }
}; 