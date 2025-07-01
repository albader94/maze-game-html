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
            console.log('🔮 Ancient Pearl collected! Victory achieved!');
            game.victory = true;
            game.pearlCollected = true;
            
            // Make all ghouls flee in terror
            for (const ghoul of game.ghouls) {
                ghoul.state = 'fleeing';
                ghoul.speed = 6; // Make them run away fast
                ghoul.fleeStartTime = Date.now();
            }
            
            // Show victory message
            Utils.showMessage(MESSAGES.STORY.VICTORY, 5000);
            
            // Create special victory particle effect
            Utils.createParticles(game, orb.x, orb.y, '#ffffff', 30, 8);
            Utils.createParticles(game, orb.x, orb.y, '#ffeb3b', 20, 6);
            
            // Trigger victory sequence after a brief delay
            setTimeout(() => {
                this.triggerVictorySequence(game);
            }, 2000);
            
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
            if (game.floor >= CONFIG.GAME.MAX_FLOORS) {
                game.victory = true;
                Utils.showMessage(MESSAGES.STORY.VICTORY, 5000);
            } else {
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

    // Trigger victory sequence when Pearl is collected
    triggerVictorySequence(game) {
        console.log('🎉 Triggering victory sequence...');
        
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
            background: linear-gradient(45deg, rgba(0,0,0,0.9), rgba(26,26,26,0.95));
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
                    color: #ffeb3b; 
                    font-size: 3em; 
                    margin-bottom: 20px; 
                    text-shadow: 0 0 20px rgba(255,235,59,0.8);
                    animation: glow 2s ease-in-out infinite alternate;
                ">🔮 VICTORY! 🔮</h1>
                
                <h2 style="
                    color: #ffffff; 
                    font-size: 1.8em; 
                    margin-bottom: 30px;
                    text-shadow: 0 0 10px rgba(255,255,255,0.5);
                ">The Ancient Pearl is Found!</h2>
                
                <div style="
                    background: rgba(255,235,59,0.1); 
                    border: 2px solid #ffeb3b; 
                    border-radius: 10px; 
                    padding: 30px; 
                    margin: 30px 0;
                    box-shadow: 0 0 30px rgba(255,235,59,0.3);
                ">
                    <p style="font-size: 1.3em; line-height: 1.6; color: #fff;">
                        You have successfully retrieved the <strong style="color: #ffeb3b;">Ancient Pearl</strong> 
                        from the depths of Burj Mubarak! Its radiant light will protect your community 
                        from the ghouls that prowl the night.
                    </p>
                    <br>
                    <p style="font-size: 1.1em; color: #ccc;">
                        The curse that plagued the buried spire is broken. The ghouls flee in terror 
                        before the Pearl's divine light, and your people are safe once more.
                    </p>
                </div>
                
                <div style="margin: 30px 0; color: #aaa;">
                    <p>🏆 <strong>Explorer</strong> - You conquered all ${Math.abs(game.floor)} floors!</p>
                    <p>💎 <strong>Light Bearer</strong> - You collected ${game.player.orbsCollected || 0} orbs!</p>
                    <p>⚡ <strong>Legend</strong> - Your courage saved an entire civilization!</p>
                </div>
                
                <button id="victory-menu-btn" style="
                    background: linear-gradient(45deg, #4caf50, #45a049);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 1.2em;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 10px;
                    box-shadow: 0 4px 15px rgba(76,175,80,0.4);
                    transition: all 0.3s ease;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Return to Menu
                </button>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes glow {
                    from { text-shadow: 0 0 20px rgba(255,235,59,0.8); }
                    to { text-shadow: 0 0 30px rgba(255,235,59,1), 0 0 40px rgba(255,235,59,0.8); }
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

        console.log('🎊 Victory screen displayed!');
    }
}; 