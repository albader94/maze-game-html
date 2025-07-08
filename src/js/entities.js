// Entity Management
const EntityManager = {
    // Update player
    updatePlayer(game) {
        if (game.gameOver || game.victory || game.deathScreen || game.showHelp) return;

        const movement = InputManager.getMovementInput();
        const oldX = game.player.x;
        const oldY = game.player.y;
        
        // Apply movement
        game.player.x += movement.x * game.player.speed;
        game.player.y += movement.y * game.player.speed;

        // Bounds check
        game.player.x = Utils.clamp(game.player.x, 20, game.mapWidth * CONFIG.MAP.CELL_SIZE - 20);
        game.player.y = Utils.clamp(game.player.y, 20, game.mapHeight * CONFIG.MAP.CELL_SIZE - 20);

        // Wall collision (unless phasing)
        if (game.player.powers.phase <= 0) {
            for (const wall of game.walls) {
                if (Utils.distance(game.player, wall) < 25) {
                    game.player.x = oldX;
                    game.player.y = oldY;
                    break;
                }
            }
        }

        // Update powers
        this.updatePlayerPowers(game);

        // Update light
        this.updatePlayerLight(game);
    },

    // Update player powers
    updatePlayerPowers(game) {
        // Phase power
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
                    const safePos = Utils.findSafePosition(game, game.player.x, game.player.y);
                    game.player.x = safePos.x;
                    game.player.y = safePos.y;
                    Utils.showMessage(MESSAGES.STORY.PHASE_ENDING, 2500);
                }
            }
        }
        
        // Regeneration power
        if (game.player.powers.regeneration > 0) {
            game.player.powers.regeneration--;
            game.player.light = Math.min(CONFIG.PLAYER.MAX_LIGHT, game.player.light + 0.15);
        }
        
        // Reveal power
        if (game.player.powers.reveal > 0) {
            game.player.powers.reveal--;
        }
    },

    // Update player light
    updatePlayerLight(game) {
        // Light decay (unless regenerating)
        if (game.player.powers.regeneration <= 0) {
            game.player.light -= CONFIG.PLAYER.LIGHT_DECAY_RATE;
        }
        
        // Clamp light to minimum 0
        game.player.light = Math.max(0, game.player.light);
        
        // Light depletion is now handled in GameLogic.updateGameRules()
    },

    // Update ghouls
    updateGhouls(game) {
        for (const ghoul of game.ghouls) {
            const distToPlayer = Utils.distance(ghoul, game.player);
            
            if (game.swarming) {
                // Swarm behavior - move directly toward player
                const angle = Math.atan2(game.player.y - ghoul.y, game.player.x - ghoul.x);
                ghoul.x += Math.cos(angle) * ghoul.speed;
                ghoul.y += Math.sin(angle) * ghoul.speed;
            } else if (distToPlayer < game.player.lightRadius * 0.6) {
                // Flee from light
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
                        x: Math.random() * game.mapWidth * CONFIG.MAP.CELL_SIZE, 
                        y: Math.random() * game.mapHeight * CONFIG.MAP.CELL_SIZE 
                    };
                }
                const angle = Math.atan2(ghoul.patrolTarget.y - ghoul.y, ghoul.patrolTarget.x - ghoul.x);
                ghoul.x += Math.cos(angle) * ghoul.speed;
                ghoul.y += Math.sin(angle) * ghoul.speed;
                ghoul.state = 'patrol';
            }
            
            // Drain light when close to player in darkness
            if (!game.swarming && distToPlayer < 30 && distToPlayer > game.player.lightRadius * 0.8) {
                game.player.light -= CONFIG.PLAYER.LIGHT_DRAIN_FROM_GHOULS;
                game.player.light = Math.max(0, game.player.light);
            }
        }
    },

    // Update orbs
    updateOrbs(game) {
        for (const orb of game.orbs) {
            if (orb.collected) continue;
            
            // Update pulse animation
            orb.pulse += 0.1;
            
            // Check for collection
            if (Utils.distance(game.player, orb) < 25) {
                this.collectOrb(game, orb);
            }
        }
    },

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

    // Update particles
    updateParticles(game) {
        game.particles = game.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life--;
            
            return particle.life > 0;
        });
    },

    // Check stairs interaction
    checkStairs(game) {
        if (game.stairs && Utils.distance(game.player, game.stairs) < 40) {
            console.log(`🚪 Player using stairs to go from floor ${game.floor} to ${game.floor + 1}`);
            
            game.floor++;
            // Generate new floor or proceed normally
            {
                if (game.floor % CONFIG.GAME.CHECKPOINT_INTERVAL === 0) {
                    game.checkpoint = game.floor;
                    // Calculate and display the correct checkpoint number
                    const checkpointNumber = Math.ceil(Math.abs(game.floor) / 5);
                    Utils.showMessage(MESSAGES.FLOOR.CHECKPOINT(game.floor), 3000);
                } else {
                    Utils.showMessage(MESSAGES.FLOOR.PROGRESS(game.floor), 2500);
                }
                MapGenerator.generateFloor(game, game.floor);
                game.player.light = Math.min(game.player.light + 30, 100);
                
                // Store current inventory as level entry inventory for the NEW floor
                // This represents what the player has when they ENTER this level
                game.levelEntryInventory = [...game.player.inventory];
                console.log(`🎒 Level entry inventory set for floor ${game.floor}:`, game.levelEntryInventory);
            }
        }
    },

    // Handle orb collection
    handleOrbCollection(game, orb) {
        const orbType = ORB_TYPES[orb.type];
        if (!orbType) return;

        // Play collection sound effect if available
        // TODO: Add sound effects

        // Handle different orb types
        if (orbType.lightBonus) {
            // Direct light restoration (blue, golden, wisp orbs)
            game.player.light = Math.min(CONFIG.PLAYER.MAX_LIGHT, game.player.light + orbType.lightBonus);
            game.player.orbsCollected++;
            
            Utils.showMessage(`${orbType.name}: +${orbType.lightBonus}% light restored!`, 2000);
            
            // Create light particles
            Utils.createParticles(game, orb.x, orb.y, orbType.color, 8, 3);
        } else if (orbType.power) {
            // Power orbs go to inventory
            const added = this.addToInventory(game, orb.type);
            if (added) {
                game.player.orbsCollected++;
                Utils.showMessage(`${orbType.name} added to inventory!`, 2500);
                // Create power particles
                Utils.createCircularParticles(game, orb.x, orb.y, orbType.color, 12, 4);
            } else {
                Utils.showMessage(MESSAGES.STORY.INVENTORY_FULL, 2000);
                return false; // Don't collect if inventory is full
            }
        }

        // Tutorial system - handle orb collection
        if (typeof TutorialSystem !== 'undefined') {
            TutorialSystem.handleOrbCollection(orb.type);
        }

        return true;
    },

    // Check win condition
    checkWinCondition(game) {
        // No stairs on final level - only Pearl can trigger victory
        if (!game.stairs) return false;
        
        const distToStairs = Utils.distance(game.player, game.stairs);
        if (distToStairs < 30) {
            if (Math.abs(game.floor) >= CONFIG.GAME.MAX_FLOORS) {
                // Player reached the bottom floor
                Utils.showMessage(MESSAGES.STORY.VICTORY, 5000);
                return true;
            } else {
                // Progress to next floor
                if (Math.abs(game.floor) % CONFIG.GAME.CHECKPOINT_INTERVAL === 0) {
                    Utils.showMessage(MESSAGES.FLOOR.CHECKPOINT(game.floor), 3000);
                } else {
                    Utils.showMessage(MESSAGES.FLOOR.PROGRESS(game.floor), 2500);
                }
                return false;
            }
        }
        return false;
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
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add intense bright flash at center
        if (animation.lightRadius > 50) {
            const centerGradient = ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, 100
            );
            centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = centerGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
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
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: #ffffff;
            text-align: center;
            animation: fadeIn 2s ease-in;
        `;

        const victoryContent = `
            <div style="max-width: 600px; padding: 40px;">
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
                    box-shadow: 0 6px 20px rgba(139,69,19,0.5);
                    transition: all 0.3s ease;
                    font-family: serif;
                    font-weight: bold;
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

        // Add event listener for menu button
        document.getElementById('victory-menu-btn').addEventListener('click', () => {
            // Return to main menu
            window.location.reload();
        });

        console.log('Victory screen displayed!');
    }
}; 