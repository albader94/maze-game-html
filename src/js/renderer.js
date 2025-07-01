// Rendering System
const Renderer = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,

    // Initialize renderer
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.canvas.width = CONFIG.CANVAS.WIDTH;
        this.canvas.height = CONFIG.CANVAS.HEIGHT;
        this.minimapCanvas.width = CONFIG.MINIMAP.WIDTH;
        this.minimapCanvas.height = CONFIG.MINIMAP.HEIGHT;
    },

    // Main render function
    render(game) {
        // Safety check for game object
        if (!game) {
            console.warn('⚠️ Renderer.render() called with undefined game object');
            return;
        }
        
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (game.state === 'menu') {
            this.renderMenu();
            return;
        }

        this.ctx.save();
        this.ctx.translate(-game.camera.x, -game.camera.y);

        // Render game world
        this.renderFloorTiles(game);
        this.renderWalls(game);
        this.renderStairs(game);
        this.renderOrbs(game);
        this.renderGhouls(game);
        this.renderParticles(game);
        this.renderPlayer(game);
        this.renderLightEffect(game);

        this.ctx.restore();

        // Render UI overlays
        this.renderVignette();
        this.renderDarknessFade(game);
        this.renderMinimap(game);
        this.renderHelpScreen(game);
        this.renderDeathScreen(game);
        this.renderGameOverScreen(game);
    },

    // Render floor tiles
    renderFloorTiles(game) {
        const startX = Math.floor(game.camera.x / CONFIG.MAP.CELL_SIZE);
        const endX = Math.ceil((game.camera.x + this.canvas.width) / CONFIG.MAP.CELL_SIZE);
        const startY = Math.floor(game.camera.y / CONFIG.MAP.CELL_SIZE);
        const endY = Math.ceil((game.camera.y + this.canvas.height) / CONFIG.MAP.CELL_SIZE);
        
        this.ctx.strokeStyle = '#222';
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const tileX = x * CONFIG.MAP.CELL_SIZE;
                const tileY = y * CONFIG.MAP.CELL_SIZE;
                const dist = Utils.distance({ x: tileX + 20, y: tileY + 20 }, game.player);
                
                if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0) {
                    this.ctx.globalAlpha = game.player.powers.reveal > 0 ? 0.5 : 
                                         Math.max(0, 1 - (dist / (game.player.lightRadius * 1.5)));
                    this.ctx.strokeRect(tileX, tileY, CONFIG.MAP.CELL_SIZE, CONFIG.MAP.CELL_SIZE);
                }
            }
        }
        this.ctx.globalAlpha = 1;
    },

    // Render walls
    renderWalls(game) {
        this.ctx.fillStyle = '#333';
        for (const wall of game.walls) {
            const dist = Utils.distance(wall, game.player);
            if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0) {
                this.ctx.globalAlpha = Math.max(0.3, 1 - (dist / (game.player.lightRadius * 2)));
                this.ctx.fillRect(wall.x - 15, wall.y - 15, 30, 30);
            }
        }
        this.ctx.globalAlpha = 1;
    },

    // Render stairs
    renderStairs(game) {
        if (!game.stairs) return;
        
        const dist = Utils.distance(game.stairs, game.player);
        if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0 || dist < 100) {
            // Base platform
            this.ctx.fillStyle = '#666';
            this.ctx.fillRect(game.stairs.x - 30, game.stairs.y - 30, 60, 60);
            
            // Inner platform
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(game.stairs.x - 25, game.stairs.y - 25, 50, 50);
            
            // Stair steps
            this.ctx.strokeStyle = '#888';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(game.stairs.x - 20 + i * 5, game.stairs.y - 15 + i * 5);
                this.ctx.lineTo(game.stairs.x + 20, game.stairs.y - 15 + i * 5);
                this.ctx.stroke();
            }
            
            // Down arrow
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 32px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('▼', game.stairs.x, game.stairs.y + 10);
            this.ctx.font = '12px monospace';
            this.ctx.fillText('EXIT', game.stairs.x, game.stairs.y - 20);
            this.ctx.textAlign = 'left';
            
            // Pulsing glow effect
            this.ctx.globalAlpha = 0.4 + Math.sin(game.time * 0.05) * 0.3;
            this.ctx.strokeStyle = '#ffeb3b';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(game.stairs.x - 32, game.stairs.y - 32, 64, 64);
            
            // Inner glow
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(game.stairs.x - 28, game.stairs.y - 28, 56, 56);
            this.ctx.globalAlpha = 1;
        }
    },

    // Render orbs
    renderOrbs(game) {
        for (const orb of game.orbs) {
            if (orb.collected) continue;
            
            // Validate orb position
            if (typeof orb.x !== 'number' || typeof orb.y !== 'number' || 
                !isFinite(orb.x) || !isFinite(orb.y)) {
                console.warn('Invalid orb position, skipping render:', orb);
                continue;
            }
            
            const dist = Utils.distance(orb, game.player);
            if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0) {
                const pulseSize = Math.sin(orb.pulse) * 3;
                
                try {
                    if (orb.type === 'wisp') {
                        // Death marker wisp
                        this.ctx.globalAlpha = 0.6 + Math.sin(game.time * 0.05) * 0.3;
                        const wispGlow = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 30);
                        wispGlow.addColorStop(0, 'rgba(200, 200, 255, 0.8)');
                        wispGlow.addColorStop(1, 'rgba(100, 100, 255, 0)');
                        this.ctx.fillStyle = wispGlow;
                        this.ctx.fillRect(orb.x - 30, orb.y - 30, 60, 60);
                    } else if (orb.type === 'pearl') {
                        // Special rendering for the Ancient Pearl
                        this.ctx.globalAlpha = 0.8;
                        
                        // Larger, more dramatic glow for the Pearl
                        const pearlGlow = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 40 + pulseSize * 2);
                        pearlGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                        pearlGlow.addColorStop(0.3, 'rgba(255, 235, 59, 0.6)');
                        pearlGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        this.ctx.fillStyle = pearlGlow;
                        this.ctx.fillRect(orb.x - 50, orb.y - 50, 100, 100);
                        
                        // Additional mystical aura
                        this.ctx.globalAlpha = 0.3;
                        const aura = this.ctx.createRadialGradient(orb.x, orb.y, 20, orb.x, orb.y, 60 + pulseSize * 3);
                        aura.addColorStop(0, 'rgba(255, 235, 59, 0.4)');
                        aura.addColorStop(1, 'rgba(156, 39, 176, 0)');
                        this.ctx.fillStyle = aura;
                        this.ctx.fillRect(orb.x - 70, orb.y - 70, 140, 140);
                    } else {
                        // Regular orbs
                        this.ctx.globalAlpha = 0.5;
                        const glowGradient = this.ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 20 + pulseSize);
                        glowGradient.addColorStop(0, ORB_TYPES[orb.type].color);
                        glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
                        this.ctx.fillStyle = glowGradient;
                        this.ctx.fillRect(orb.x - 30, orb.y - 30, 60, 60);
                    }
                    
                    this.ctx.globalAlpha = 1;
                    
                    if (orb.type === 'pearl') {
                        // Draw the Pearl with special styling
                        const pearlSize = 12 + pulseSize;
                        
                        // Main Pearl body (black)
                        this.ctx.fillStyle = ORB_TYPES.pearl.color;
                        this.ctx.beginPath();
                        this.ctx.arc(orb.x, orb.y, pearlSize, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // White outline
                        this.ctx.strokeStyle = ORB_TYPES.pearl.outline;
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.arc(orb.x, orb.y, pearlSize, 0, Math.PI * 2);
                        this.ctx.stroke();
                        
                        // Inner mystical glow
                        this.ctx.globalAlpha = 0.8;
                        this.ctx.fillStyle = 'rgba(255, 235, 59, 0.6)';
                        this.ctx.beginPath();
                        this.ctx.arc(orb.x - 2, orb.y - 2, 4, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // Reset line width
                        this.ctx.lineWidth = 1;
                    } else {
                        // Regular orb rendering
                        this.ctx.fillStyle = ORB_TYPES[orb.type].color;
                        this.ctx.beginPath();
                        this.ctx.arc(orb.x, orb.y, 8 + pulseSize, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // Inner shine
                        this.ctx.fillStyle = '#fff';
                        this.ctx.beginPath();
                        this.ctx.arc(orb.x - 3, orb.y - 3, 3, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } catch (error) {
                    console.error('Error rendering orb:', error, orb);
                    // Reset alpha in case of error
                    this.ctx.globalAlpha = 1;
                }
            }
        }
        this.ctx.globalAlpha = 1;
    },

    // Render ghouls
    renderGhouls(game) {
        for (const ghoul of game.ghouls) {
            const dist = Utils.distance(ghoul, game.player);
            
            if (dist < game.player.lightRadius * 2 || game.player.powers.reveal > 0 || game.swarming) {
                let alpha = 1;
                if (!game.swarming && dist < game.player.lightRadius * 0.6) {
                    alpha = 0.3;
                } else if (!game.swarming && dist < game.player.lightRadius) {
                    alpha = 0.6;
                }
                
                this.ctx.globalAlpha = alpha;
                
                // Ghoul body
                this.ctx.fillStyle = ghoul.state === 'stunned' ? '#111' : '#200';
                this.ctx.fillRect(ghoul.x - 12, ghoul.y - 20, 24, 35);
                
                // Ghoul cloak
                this.ctx.fillStyle = '#100';
                this.ctx.beginPath();
                this.ctx.moveTo(ghoul.x - 15, ghoul.y - 20);
                this.ctx.lineTo(ghoul.x + 15, ghoul.y - 20);
                this.ctx.lineTo(ghoul.x + 20, ghoul.y + 15);
                this.ctx.lineTo(ghoul.x - 20, ghoul.y + 15);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Ghoul eyes
                this.ctx.fillStyle = game.swarming ? '#ff0' : (ghoul.state === 'stalking' ? '#f00' : '#800');
                this.ctx.shadowBlur = game.swarming ? 20 : 10;
                this.ctx.shadowColor = game.swarming ? '#ff0' : '#f00';
                this.ctx.beginPath();
                this.ctx.arc(ghoul.x - 5, ghoul.y - 10, game.swarming ? 4 : 3, 0, Math.PI * 2);
                this.ctx.arc(ghoul.x + 5, ghoul.y - 10, game.swarming ? 4 : 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
        this.ctx.globalAlpha = 1;
    },

    // Render particles
    renderParticles(game) {
        for (const particle of game.particles) {
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        }
        this.ctx.globalAlpha = 1;
    },

    // Render player
    renderPlayer(game) {
        // Player body
        this.ctx.fillStyle = game.player.powers.phase > 0 ? 'rgba(255, 255, 255, 0.5)' : '#fff';
        this.ctx.beginPath();
        this.ctx.arc(game.player.x, game.player.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Player inner detail
        this.ctx.fillStyle = game.player.powers.phase > 0 ? 'rgba(200, 200, 200, 0.5)' : '#ccc';
        this.ctx.beginPath();
        this.ctx.arc(game.player.x, game.player.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Phase effect
        if (game.player.powers.phase > 0) {
            this.ctx.strokeStyle = '#9c27b0';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(game.player.x, game.player.y, 14, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Player light ring
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.globalAlpha = 0.5;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(game.player.x, game.player.y, 20, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    },

    // Render light effect
    renderLightEffect(game) {
        try {
            // Validate player and light radius values
            if (!game.player || 
                typeof game.player.x !== 'number' || 
                typeof game.player.y !== 'number' || 
                typeof game.player.lightRadius !== 'number' ||
                !isFinite(game.player.x) || 
                !isFinite(game.player.y) || 
                !isFinite(game.player.lightRadius) ||
                game.player.lightRadius <= 0) {
                console.warn('Invalid light effect values:', {
                    playerX: game.player?.x,
                    playerY: game.player?.y,
                    lightRadius: game.player?.lightRadius
                });
                return; // Skip rendering light effect
            }
            
            // Additional validation for extreme values
            if (game.player.lightRadius > 10000 || 
                Math.abs(game.player.x) > 100000 || 
                Math.abs(game.player.y) > 100000) {
                console.warn('Light effect values too extreme, skipping render');
                return;
            }
            
            const gradient = this.ctx.createRadialGradient(
                game.player.x, game.player.y, 0,
                game.player.x, game.player.y, game.player.lightRadius
            );
            gradient.addColorStop(0, 'rgba(255, 248, 200, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                game.player.x - game.player.lightRadius, 
                game.player.y - game.player.lightRadius,
                game.player.lightRadius * 2, 
                game.player.lightRadius * 2
            );
            this.ctx.globalCompositeOperation = 'source-over';
        } catch (error) {
            console.error('Error in renderLightEffect:', error);
            // Reset composite operation in case of error
            this.ctx.globalCompositeOperation = 'source-over';
        }
    },

    // Render darkness vignette
    renderVignette() {
        try {
            const vignette = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
            );
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(0.7, 'rgba(0,0,0,0.3)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
            this.ctx.fillStyle = vignette;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } catch (error) {
            console.error('Error in renderVignette:', error);
        }
    },

    // Render darkness fade during swarm
    renderDarknessFade(game) {
        if (game.darknessFade > 0) {
            // Black fade during swarm for dramatic darkness effect
            this.ctx.fillStyle = `rgba(0, 0, 0, ${game.darknessFade})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    // Render minimap
    renderMinimap(game) {
        this.minimapCtx.fillStyle = '#111';
        this.minimapCtx.fillRect(0, 0, CONFIG.MINIMAP.WIDTH, CONFIG.MINIMAP.HEIGHT);
        
        const scale = CONFIG.MINIMAP.WIDTH / Math.max(game.mapWidth * CONFIG.MAP.CELL_SIZE, game.mapHeight * CONFIG.MAP.CELL_SIZE);
        
        // Draw explored areas
        this.minimapCtx.fillStyle = '#222';
        for (const coord of game.explored) {
            const [x, y] = coord.split(',').map(Number);
            if (!isNaN(x) && !isNaN(y)) {
                this.minimapCtx.fillRect(x * CONFIG.MAP.CELL_SIZE * scale, y * CONFIG.MAP.CELL_SIZE * scale, 
                                        CONFIG.MAP.CELL_SIZE * scale, CONFIG.MAP.CELL_SIZE * scale);
            }
        }
        
        // Draw walls
        this.minimapCtx.fillStyle = '#444';
        for (const wall of game.walls) {
            const tileX = Math.floor(wall.x / CONFIG.MAP.CELL_SIZE);
            const tileY = Math.floor(wall.y / CONFIG.MAP.CELL_SIZE);
            if (game.explored.has(`${tileX},${tileY}`) || game.player.powers.reveal > 0) {
                this.minimapCtx.fillRect(
                    (wall.x - 15) * scale, 
                    (wall.y - 15) * scale, 
                    30 * scale, 
                    30 * scale
                );
            }
        }
        
        // Draw stairs
        if (game.stairs) {
            const stairTileX = Math.floor(game.stairs.x / CONFIG.MAP.CELL_SIZE);
            const stairTileY = Math.floor(game.stairs.y / CONFIG.MAP.CELL_SIZE);
            if (game.explored.has(`${stairTileX},${stairTileY}`) || game.player.powers.reveal > 0) {
                this.minimapCtx.fillStyle = '#ff0';
                this.minimapCtx.fillRect(
                    (game.stairs.x - 15) * scale,
                    (game.stairs.y - 15) * scale,
                    30 * scale,
                    30 * scale
                );
                
                // Blinking effect
                if (game.time % 60 < 30) {
                    this.minimapCtx.strokeStyle = '#fff';
                    this.minimapCtx.lineWidth = 2;
                    this.minimapCtx.strokeRect(
                        (game.stairs.x - 15) * scale,
                        (game.stairs.y - 15) * scale,
                        30 * scale,
                        30 * scale
                    );
                }
            }
        }
        
        // Draw player
        this.minimapCtx.fillStyle = '#fff';
        this.minimapCtx.fillRect(
            (game.player.x - 5) * scale,
            (game.player.y - 5) * scale,
            10 * scale,
            10 * scale
        );
        
        // Draw camera bounds
        this.minimapCtx.strokeStyle = '#666';
        this.minimapCtx.strokeRect(
            game.camera.x * scale,
            game.camera.y * scale,
            this.canvas.width * scale,
            this.canvas.height * scale
        );
    },

    // Render menu
    renderMenu() {
        // Title
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('BURIED SPIRE', this.canvas.width / 2, 150);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '24px monospace';
        this.ctx.fillText('of Kuwait', this.canvas.width / 2, 190);
        
        // Mode info
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText('EXPLORER MODE', this.canvas.width / 2, 250);
        
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('Checkpoints every 5 floors • Respawn on death', this.canvas.width / 2, 280);
        this.ctx.fillText('Keep collected orbs • Power-up inventory system', this.canvas.width / 2, 300);
        
        // Start button
        const startY = 350;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ffeb3b';
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.canvas.width / 2 - 100, startY, 200, 60);
        this.ctx.shadowBlur = 0;
        
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 100, startY, 200, 60);
        
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.fillText('PLAY', this.canvas.width / 2, startY + 38);
        
        // Instructions
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('WASD/Arrows: Move • 1/2/3: Use Orb (instant)', this.canvas.width / 2, 450);
        this.ctx.fillText('Click PLAY or press SPACE to begin', this.canvas.width / 2, 470);
        
        // Power-up guide
        this.renderOrbGuide();
        
        this.ctx.textAlign = 'left';
    },

    // Render orb guide on menu
    renderOrbGuide() {
        this.ctx.fillStyle = '#888';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        const guideX = 150;
        const guideY = 520;
        
        this.ctx.fillText('ORBS:', guideX, guideY);
        this.ctx.fillStyle = '#64b5f6';
        this.ctx.fillText('O Blue: +20% Light', guideX + 50, guideY);
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.fillText('@ Gold: +40% Light', guideX + 200, guideY);
        this.ctx.fillStyle = '#9c27b0';
        this.ctx.fillText('P Purple: Phase through walls', guideX + 350, guideY);
        
        this.ctx.fillStyle = '#4caf50';
        this.ctx.fillText('G Green: Light regeneration', guideX + 50, guideY + 15);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('W White: Reveal map', guideX + 200, guideY + 15);
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillText('♥ Red: Auto-revive at 0%', guideX + 350, guideY + 15);
        
        this.ctx.textAlign = 'center';
    },

    // Render help screen
    renderHelpScreen(game) {
        if (!game.showHelp) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME HELP', this.canvas.width / 2, 50);
        
        // Help content
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('OBJECTIVE', this.canvas.width / 2, 90);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Descend to floor -50 and find the Pearl of Kuwait', this.canvas.width / 2, 110);
        this.ctx.fillText('Find the stairs (▼) on each floor to go deeper', this.canvas.width / 2, 130);
        
        // Controls
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('CONTROLS', this.canvas.width / 2, 170);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Arrow Keys / WASD: Move', this.canvas.width / 2, 190);
        this.ctx.fillText('1-3: Use orb from inventory slot', this.canvas.width / 2, 210);
        this.ctx.fillText('H: Toggle this help', this.canvas.width / 2, 230);
        
        // Orb guide
        this.renderHelpOrbGuide();
        
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('Press H to close', this.canvas.width / 2, 520);
        this.ctx.textAlign = 'left';
    },

    // Render orb guide in help screen
    renderHelpOrbGuide() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ORB TYPES', this.canvas.width / 2, 290);
        
        this.ctx.textAlign = 'left';
        const orbX = 200;
        this.ctx.font = '12px monospace';
        
        // Light orbs
        this.ctx.fillStyle = '#64b5f6';
        this.ctx.fillText('O  Blue Orb: Restores 20% light', orbX, 320);
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.fillText('@  Golden Orb: Restores 40% light', orbX, 340);
        this.ctx.fillStyle = '#ccccff';
        this.ctx.fillText('*  Light Wisp: Death marker - Restores 50% light', orbX, 360);
        
        // Power orbs
        this.ctx.fillStyle = '#9c27b0';
        this.ctx.fillText('P  Purple Orb: Phase through walls for 5 seconds', orbX, 390);
        this.ctx.fillStyle = '#4caf50';
        this.ctx.fillText('G  Green Orb: Regenerate light for 10 seconds', orbX, 410);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('W  White Orb: Reveal entire map for 5 seconds', orbX, 430);
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillText('♥  Red Orb: LIFELINE - Auto-revives you at 0% light!', orbX, 450);
    },

    // Render death screen
    renderDeathScreen(game) {
        if (!game.deathScreen) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = '#f44336';
        this.ctx.font = 'bold 36px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CONSUMED BY DARKNESS', this.canvas.width / 2, 100);
        
        // Stats
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '18px monospace';
        this.ctx.fillText('SESSION STATISTICS', this.canvas.width / 2, 160);
        
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        const statsX = this.canvas.width / 2 - 150;
        this.ctx.fillText(`Current Floor: ${-game.floor}`, statsX, 200);
        this.ctx.fillText(`Checkpoint: Floor ${-game.checkpoint}`, statsX, 220);
        this.ctx.fillText(`Orbs Collected: ${game.player.orbsCollected}`, statsX, 240);
        this.ctx.fillText(`Deaths This Run: ${GameState.stats.totalDeaths}`, statsX, 260);
        this.ctx.fillText(`Best Floor Reached: ${-GameState.stats.deepestFloor}`, statsX, 280);
        
        // Leaderboard preview
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('EXPLORER MODE RANKINGS', this.canvas.width / 2, 330);
        
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('1. Shadow_Walker - Floor 47', this.canvas.width / 2, 355);
        this.ctx.fillText('2. LightKeeper - Floor 42', this.canvas.width / 2, 375);
        this.ctx.fillText('3. DuneRunner - Floor 38', this.canvas.width / 2, 395);
        this.ctx.fillText(`... You - Floor ${-GameState.stats.deepestFloor}`, this.canvas.width / 2, 415);
        
        // Buttons
        this.renderDeathScreenButtons();
        
        this.ctx.textAlign = 'left';
    },

    // Render death screen buttons
    renderDeathScreenButtons() {
        const btnY = 460;
        const btnHeight = 50;
        const btnGap = 20;
        
        // Respawn button
        this.ctx.fillStyle = '#4caf50';
        this.ctx.fillRect(this.canvas.width / 2 - 200 - btnGap, btnY, 180, btnHeight);
        this.ctx.strokeStyle = '#66bb6a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 200 - btnGap, btnY, 180, btnHeight);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('RESPAWN', this.canvas.width / 2 - 110 - btnGap, btnY + 30);
        
        // Quit button
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillRect(this.canvas.width / 2 + btnGap, btnY, 180, btnHeight);
        this.ctx.strokeStyle = '#ef5350';
        this.ctx.strokeRect(this.canvas.width / 2 + btnGap, btnY, 180, btnHeight);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('QUIT TO MENU', this.canvas.width / 2 + 110 + btnGap, btnY + 30);
    },

    // Render game over/victory screen
    renderGameOverScreen(game) {
        if (!game.gameOver && !game.victory) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = game.victory ? '#ffeb3b' : '#f44336';
        this.ctx.font = '48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(game.victory ? 'VICTORY!' : 'GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Press R to return to menu', this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.textAlign = 'left';
    }
}; 