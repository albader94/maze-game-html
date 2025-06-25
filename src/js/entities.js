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
                    document.getElementById('story').textContent = MESSAGES.STORY.PHASE_ENDING;
                }
            }
        }
        
        // Regeneration power
        if (game.player.powers.regeneration > 0) {
            game.player.powers.regeneration--;
            game.player.light = Math.min(game.player.light + 0.1, game.player.maxLight);
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
        
        if (orbType.lightBonus) {
            // Light restoration orbs - always collectible
            game.player.light = Math.min(game.player.light + orbType.lightBonus, game.player.maxLight);
            if (orb.type !== 'wisp') {
                game.player.orbsCollected++;
            }
        } else if (orbType.power) {
            // Power orbs - add to inventory only if space available
            let added = false;
            for (let i = 0; i < 3; i++) {
                if (!game.player.inventory[i]) {
                    game.player.inventory[i] = orb.type;
                    added = true;
                    InventoryManager.updateDisplay();
                    document.getElementById('story').textContent = 
                        `Collected ${orbType.name}! Press ${i + 1} to use.`;
                    break;
                }
            }
            
            if (!added) {
                // Inventory is full - don't collect the orb
                document.getElementById('story').textContent = MESSAGES.STORY.INVENTORY_FULL;
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
                document.getElementById('story').textContent = MESSAGES.STORY.VICTORY;
            } else {
                if (game.floor % CONFIG.GAME.CHECKPOINT_INTERVAL === 0) {
                    game.checkpoint = game.floor;
                    // Calculate and display the correct checkpoint number
                    const checkpointNumber = Math.ceil(Math.abs(game.floor) / 5);
                    document.getElementById('checkpoint').textContent = checkpointNumber;
                    document.getElementById('story').textContent = MESSAGES.FLOOR.CHECKPOINT(game.floor);
                } else {
                    document.getElementById('story').textContent = MESSAGES.FLOOR.PROGRESS(game.floor);
                }
                MapGenerator.generateFloor(game, game.floor);
                game.player.light = Math.min(game.player.light + 30, 100);
                
                // Store current inventory as level entry inventory for the NEW floor
                // This represents what the player has when they ENTER this level
                game.levelEntryInventory = [...game.player.inventory];
                console.log(`🎒 Level entry inventory set for floor ${game.floor}:`, game.levelEntryInventory);
            }
        }
    }
}; 