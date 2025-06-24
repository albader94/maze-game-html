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
        
        // Handle light depletion
        if (game.player.light <= 0 && !game.swarming) {
            this.handleLightDepletion(game);
        }
    },

    // Handle what happens when light reaches 0
    handleLightDepletion(game) {
        // Check for lifeline orb
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
            // Auto-use lifeline
            game.player.light = 100;
            game.player.inventory[lifelineSlot] = null;
            InventoryManager.updateDisplay();
            document.getElementById('story').textContent = MESSAGES.STORY.LIFELINE_AUTO;
            
            // Create dramatic revival effect
            Utils.createCircularParticles(game, game.player.x, game.player.y, '#f44336', 30, 5);
            
            // Flash effect
            game.player.lightRadius = 250;
            setTimeout(() => game.player.lightRadius = CONFIG.PLAYER.LIGHT_RADIUS, 500);
        } else {
            // Start the swarm sequence
            this.startSwarmSequence(game);
        }
    },

    // Start swarm sequence when light depletes
    startSwarmSequence(game) {
        game.swarming = true;
        game.swarmTimer = CONFIG.GAME.SWARM_DURATION;
        document.getElementById('story').textContent = MESSAGES.STORY.DARKNESS_CONSUMES;
        
        // Alert all ghouls
        for (const ghoul of game.ghouls) {
            ghoul.state = 'swarming';
            ghoul.speed *= 2.5;
        }
        
        // Spawn edge ghouls
        this.spawnEdgeGhouls(game);
    },

    // Spawn ghouls from screen edges during swarm
    spawnEdgeGhouls(game) {
        for (let i = 0; i < 8; i++) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: // Top
                    x = Math.random() * CONFIG.CANVAS.WIDTH + game.camera.x;
                    y = game.camera.y - 20;
                    break;
                case 1: // Right
                    x = game.camera.x + CONFIG.CANVAS.WIDTH + 20;
                    y = Math.random() * CONFIG.CANVAS.HEIGHT + game.camera.y;
                    break;
                case 2: // Bottom
                    x = Math.random() * CONFIG.CANVAS.WIDTH + game.camera.x;
                    y = game.camera.y + CONFIG.CANVAS.HEIGHT + 20;
                    break;
                case 3: // Left
                    x = game.camera.x - 20;
                    y = Math.random() * CONFIG.CANVAS.HEIGHT + game.camera.y;
                    break;
            }
            
            game.ghouls.push({
                x: x,
                y: y,
                speed: 3,
                state: 'swarming',
                patrolTarget: { x: game.player.x, y: game.player.y }
            });
        }
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
            // Light restoration orbs
            game.player.light = Math.min(game.player.light + orbType.lightBonus, game.player.maxLight);
            if (orb.type !== 'wisp') {
                game.player.orbsCollected++;
            }
        } else if (orbType.power) {
            // Power orbs - add to inventory
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
                document.getElementById('story').textContent = MESSAGES.STORY.INVENTORY_FULL;
                orb.collected = false;
                return;
            }
        }
        
        // Create collection particle effect
        Utils.createParticles(game, orb.x, orb.y, orbType.color, 10, 4);
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

    // Update swarm timer
    updateSwarmTimer(game) {
        if (game.swarming && game.swarmTimer > 0) {
            game.swarmTimer--;
            
            if (game.swarmTimer < 60) {
                game.darknessFade = 1 - (game.swarmTimer / 60);
            }
            
            if (game.swarmTimer <= 0) {
                // Show death screen
                game.deathScreen = true;
                GameState.updateStats();
                document.getElementById('story').textContent = '';
            }
        }
    },

    // Check stairs interaction
    checkStairs(game) {
        if (game.stairs && Utils.distance(game.player, game.stairs) < 40) {
            game.floor++;
            if (game.floor >= CONFIG.GAME.MAX_FLOORS) {
                game.victory = true;
                document.getElementById('story').textContent = MESSAGES.STORY.VICTORY;
            } else {
                if (game.floor % CONFIG.GAME.CHECKPOINT_INTERVAL === 0) {
                    game.checkpoint = game.floor;
                    document.getElementById('checkpoint').textContent = game.checkpoint;
                    document.getElementById('story').textContent = MESSAGES.FLOOR.CHECKPOINT(game.floor);
                } else {
                    document.getElementById('story').textContent = MESSAGES.FLOOR.PROGRESS(game.floor);
                }
                MapGenerator.generateFloor(game, game.floor);
                game.player.light = Math.min(game.player.light + 30, 100);
            }
        }
    }
}; 