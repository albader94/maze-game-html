// Entity Management
const EntityManager = {
    // Collect an orb
    collectOrb(game, orb) {
        orb.collected = true;

        // Play orb collection sound based on type
        if (window.SoundManager) {
            SoundManager.playOrbCollection(orb.type);
        }

        const orbType = ORB_TYPES[orb.type];
        if (!orbType) return;

        // Show tutorial for first-time orb collection
        if (typeof TutorialSystem !== 'undefined') {
            TutorialSystem.handleOrbCollection(orb.type);
        }

        if (orbType.lightBonus) {
            // Light restoration orbs - always collectible
            game.player.light = Math.min(game.player.light + orbType.lightBonus, game.player.maxLight);
            if (orb.type !== 'wisp') {
                game.player.orbsCollected++;
            }
        } else if (orb.type === 'pearl') {
            // Special handling for the Ancient Pearl - triggers victory!
            console.log('Ancient Pearl collected! Victory achieved!');
            game.victory = true;
            game.pearlCollected = true;
            game.pearlPosition = { x: orb.x, y: orb.y }; // Store Pearl position for animation

            // Make all ghouls flee in terror
            for (const ghoul of game.ghouls) {
                ghoul.state = 'fleeing';
                ghoul.speed = 6; // Make them run away fast
                ghoul.fleeStartTime = Date.now();
            }

            // Start the dramatic white light animation sequence
            this.startVictoryLightAnimation(game, orb.x, orb.y);

        } else if (orbType.power) {
            // Power orbs - add to inventory only if space available
            let added = false;
            for (let i = 0; i < 3; i++) {
                if (!game.player.inventory[i]) {
                    game.player.inventory[i] = orb.type;
                    added = true;
                    InventoryManager.updateDisplay();
                    Utils.showMessage(`${orbType.name} added to inventory!`, 2500);
                    break;
                }
            }

            if (!added) {
                // Inventory is full - don't collect the orb
                Utils.showMessage(MESSAGES.STORY.INVENTORY_FULL, 2000);
                orb.collected = false;
                return false; // Indicate collection failed
            }
        }

        // Create collection particle effect only if successfully collected
        Utils.createParticles(game, orb.x, orb.y, orbType.color, 10, 4);
        return true; // Indicate collection succeeded
    },

    // Start the white light animation from Pearl position
    startVictoryLightAnimation(game, pearlX, pearlY) {
        console.log('Starting victory light animation...');

        // Initialize animation state
        game.victoryAnimation = {
            active: true,
            startTime: Date.now(),
            pearlX: pearlX,
            pearlY: pearlY,
            lightRadius: 0,
            phase: 'expanding', // 'expanding' -> 'complete'
            duration: 3000 // 3 seconds total animation
        };

        // Pause normal game updates during animation
        game.animatingVictory = true;
    },

    // Update victory light animation
    updateVictoryAnimation(game) {
        if (!game.victoryAnimation || !game.victoryAnimation.active) return;

        const animation = game.victoryAnimation;
        const elapsed = Date.now() - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);

        if (animation.phase === 'expanding') {
            // Exponential expansion of white light
            const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.5;
            animation.lightRadius = maxRadius * (progress * progress); // Quadratic easing

            if (progress >= 1) {
                // Animation complete - trigger victory screen
                animation.active = false;
                game.animatingVictory = false;
                this.triggerVictorySequence(game);
            }
        }
    },

    // Render the victory light animation
    renderVictoryAnimation(game, ctx, canvas) {
        if (!game.victoryAnimation || !game.victoryAnimation.active) return;

        const animation = game.victoryAnimation;

        // Save context
        ctx.save();

        // Convert world coordinates to screen coordinates
        const camera = game.camera || { x: 0, y: 0 };
        const screenX = animation.pearlX - camera.x;
        const screenY = animation.pearlY - camera.y;

        // Create radial gradient for expanding light
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, animation.lightRadius
        );

        // Bright white center fading to transparent
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Fill the entire canvas with the expanding light
        ctx.globalCompositeOperation = 'screen'; // Additive blending for bright effect
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

        // Add intense bright flash at center
        if (animation.lightRadius > 50) {
            const centerGradient = ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, 100
            );
            centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = centerGradient;
            ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
        }

        // Restore context
        ctx.restore();
    },

    // Trigger victory sequence when Pearl is collected
    triggerVictorySequence(game) {
        console.log('Triggering victory sequence...');

        // Pause the game
        game.state = 'victory';

        // Show victory screen
        this.showVictoryScreen(game);
    },

    // Show the victory screen
    showVictoryScreen(game) {
        // Create victory overlay
        const victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'victory-overlay';
        victoryOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, rgba(10,5,5,0.95), rgba(42,24,16,0.98));
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            z-index: 1000;
            color: #ffffff;
            text-align: center;
            animation: fadeIn 2s ease-in;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;

        const victoryContent = `
            <div style="max-width: 600px; padding: 40px 40px 60px; margin: auto 0;">
                <h1 style="
                    color: #FFD700;
                    font-size: 3.5em;
                    margin-bottom: 20px;
                    text-shadow: 0 0 25px rgba(139,0,0,0.8);
                    animation: glow 2s ease-in-out infinite alternate;
                    font-family: serif;
                ">⚜ TRIUMPH ⚜</h1>

                <h2 style="
                    color: #CD853F;
                    font-size: 2em;
                    margin-bottom: 30px;
                    text-shadow: 0 0 15px rgba(139,0,0,0.5);
                    font-family: serif;
                ">The Sacred Pearl is Reclaimed!</h2>

                <div style="
                    background: rgba(139,69,19,0.2);
                    border: 3px solid #8B4513;
                    border-radius: 15px;
                    padding: 35px;
                    margin: 30px 0;
                    box-shadow: 0 0 35px rgba(139,69,19,0.4);
                ">
                    <p style="font-size: 1.4em; line-height: 1.7; color: #DAA520; font-family: serif;">
                        Through courage and determination, you have retrieved the <strong style="color: #FFD700;">Sacred Pearl</strong>
                        from the cursed depths of the Buried Spire! Its divine radiance shall protect your realm
                        from the shadow beasts that haunt the darkness.
                    </p>
                    <br>
                    <p style="font-size: 1.2em; color: #8B4513; font-family: serif;">
                        The ancient curse is shattered. The creatures of the void retreat in terror
                        before the Pearl's holy light, and your people shall know peace once more.
                    </p>
                </div>

                <div style="margin: 35px 0; color: #8B4513; font-family: serif;">
                    <p style="font-size: 1.1em;"><strong style="color: #DAA520;">⚔ Conqueror</strong> - You descended all ${Math.abs(game.floor)} treacherous floors!</p>
                    <p style="font-size: 1.1em;"><strong style="color: #DAA520;">💎 Seeker</strong> - You gathered ${game.player.orbsCollected || 0} mystical orbs!</p>
                    <p style="font-size: 1.1em;"><strong style="color: #DAA520;">⚜ Champion</strong> - Your valor has saved an entire realm!</p>
                </div>

                <button id="victory-menu-btn" style="
                    background: linear-gradient(45deg, #8B4513, #654321);
                    color: #FFD700;
                    border: 3px solid #DAA520;
                    padding: 18px 36px;
                    font-size: 1.3em;
                    border-radius: 10px;
                    cursor: pointer;
                    margin: 15px;
                    min-height: 48px;
                    box-shadow: 0 6px 20px rgba(139,69,19,0.5);
                    transition: all 0.3s ease;
                    font-family: serif;
                    font-weight: bold;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    ♦ Return to Sanctum
                </button>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes glow {
                    from { text-shadow: 0 0 25px rgba(139,0,0,0.8); }
                    to { text-shadow: 0 0 35px rgba(139,0,0,1), 0 0 45px rgba(255,215,0,0.8); }
                }
            </style>
        `;

        victoryOverlay.innerHTML = victoryContent;
        document.body.appendChild(victoryOverlay);

        // Add event listener for menu button (both click and touch)
        const victoryMenuBtn = document.getElementById('victory-menu-btn');
        if (victoryMenuBtn) {
            victoryMenuBtn.addEventListener('click', () => {
                window.location.reload();
            });
            victoryMenuBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                window.location.reload();
            }, { passive: false });
        }

        console.log('Victory screen displayed!');
    }
};