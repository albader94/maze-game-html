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

        // Render victory light animation (before UI overlays for dramatic effect)
        if (game.victoryAnimation && game.victoryAnimation.active) {
            EntityManager.renderVictoryAnimation(game, this.ctx, this.canvas);
        }

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
        // Dark mystical background
        this.ctx.fillStyle = '#0a0505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dark red vignette effect for mystical atmosphere
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(20, 5, 0, 0)');
        gradient.addColorStop(0.6, 'rgba(30, 10, 5, 0.3)');
        gradient.addColorStop(1, 'rgba(15, 0, 0, 0.7)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Subtle flame-like texture overlay
        this.ctx.globalAlpha = 0.02;
        this.ctx.fillStyle = '#4a1a0a';
        for (let y = 0; y < this.canvas.height; y += 4) {
            if (Math.random() > 0.7) {
                this.ctx.fillRect(0, y, this.canvas.width, 1);
            }
        }
        this.ctx.globalAlpha = 1;
        
        // Main title with gothic styling
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#8B0000';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 52px serif';
        this.ctx.fillText('BURIED SPIRE', this.canvas.width / 2, 90);
        
        // Enhanced subtitle with red glow
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#8B0000';
        this.ctx.fillStyle = '#CD853F';
        this.ctx.font = 'italic 22px serif';
        this.ctx.fillText('Quest for the Ancient Pearl', this.canvas.width / 2, 120);
        this.ctx.shadowBlur = 0;
        
        // Atmospheric flavor text
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '14px serif';
        this.ctx.fillText('Deep beneath the sands, darkness awaits...', this.canvas.width / 2, 150);
        
        // Gothic decorative elements
        this.ctx.fillStyle = '#4a1a0a';
        this.ctx.font = '16px serif';
        this.ctx.fillText('⚜ ═══════════════════════════════════ ⚜', this.canvas.width / 2, 175);
        
        // Menu buttons
        this.renderMenuButtons();
        
        // Gothic footer with mystical symbols
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '11px serif';
        this.ctx.fillText('⚔ WASD: Move • 1-3: Use Orb • ESC: Pause ⚔', this.canvas.width / 2, 520);
        
        // Build info with gothic styling
        this.ctx.fillStyle = '#654321';
        this.ctx.font = '9px serif';
        this.ctx.fillText('Ancient Codex v1.0 • Forged in Darkness', this.canvas.width / 2, 545);
        
        this.ctx.textAlign = 'left';
    },
    
    // Render main menu buttons
    renderMenuButtons() {
        const centerX = this.canvas.width / 2;
        const buttonWidth = 300;
        const buttonHeight = 45;
        const buttonSpacing = 55;
        const startY = 200;
        
        const buttons = [
            { text: 'NEW GAME', y: startY, icon: '♦' },
            { text: 'LEADERBOARDS', y: startY + buttonSpacing, icon: '♠' },
            { text: 'SETTINGS', y: startY + buttonSpacing * 2, icon: '♣' }
        ];
        
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const isHovered = false; // Could add hover logic later
            
            // Gothic button background with stone-like texture
            const buttonGradient = this.ctx.createLinearGradient(
                centerX - buttonWidth/2, button.y,
                centerX + buttonWidth/2, button.y + buttonHeight
            );
            buttonGradient.addColorStop(0, '#2a1810');
            buttonGradient.addColorStop(0.5, '#1a0f08');
            buttonGradient.addColorStop(1, '#0f0705');
            this.ctx.fillStyle = buttonGradient;
            this.ctx.fillRect(centerX - buttonWidth/2, button.y, buttonWidth, buttonHeight);
            
            // Ornate border with gold/bronze styling
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - buttonWidth/2, button.y, buttonWidth, buttonHeight);
            
            // Inner golden highlight
            this.ctx.strokeStyle = '#DAA520';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(centerX - buttonWidth/2 + 3, button.y + 3, buttonWidth - 6, buttonHeight - 6);
            
            // Button icon with golden glow
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = '20px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(button.icon, centerX - 80, button.y + 28);
            this.ctx.shadowBlur = 0;
            
            // Button text with bronze styling
            this.ctx.fillStyle = '#CD853F';
            this.ctx.font = 'bold 18px serif';
            this.ctx.fillText(button.text, centerX + 10, button.y + 28);
            
            // Add mystical corner decorations
            this.ctx.fillStyle = '#8B4513';
            this.ctx.font = '12px serif';
            this.ctx.fillText('╔', centerX - buttonWidth/2 + 5, button.y + 12);
            this.ctx.fillText('╗', centerX + buttonWidth/2 - 12, button.y + 12);
            this.ctx.fillText('╚', centerX - buttonWidth/2 + 5, button.y + buttonHeight - 5);
            this.ctx.fillText('╝', centerX + buttonWidth/2 - 12, button.y + buttonHeight - 5);
        }
        
        // Add mystical glow effect around buttons
        this.ctx.shadowBlur = 3;
        this.ctx.shadowColor = '#8B0000';
        this.ctx.strokeStyle = '#4a1a0a';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            this.ctx.strokeRect(centerX - buttonWidth/2 - 2, button.y - 2, buttonWidth + 4, buttonHeight + 4);
        }
        this.ctx.shadowBlur = 0;
        
        this.ctx.textAlign = 'left';
    },


    // Render help screen
    renderHelpScreen(game) {
        if (!game.showHelp) return;
        
        // Dark mystical background
        this.ctx.fillStyle = 'rgba(10, 5, 5, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Decorative border
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(50, 30, this.canvas.width - 100, this.canvas.height - 60);
        
        // Inner golden border
        this.ctx.strokeStyle = '#DAA520';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(55, 35, this.canvas.width - 110, this.canvas.height - 70);
        
        // Title with gothic styling
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#8B0000';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 28px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚜ ADVENTURER\'S GUIDE ⚜', this.canvas.width / 2, 70);
        this.ctx.shadowBlur = 0;
        
        // Section headers with bronze styling
        this.ctx.fillStyle = '#CD853F';
        this.ctx.font = 'bold 18px serif';
        this.ctx.fillText('SACRED QUEST', this.canvas.width / 2, 110);
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '14px serif';
        this.ctx.fillText('Descend the cursed tower to floor -50', this.canvas.width / 2, 130);
        this.ctx.fillText('Seek the Ancient Pearl to break the curse', this.canvas.width / 2, 150);
        
        // Controls section
        this.ctx.fillStyle = '#CD853F';
        this.ctx.font = 'bold 18px serif';
        this.ctx.fillText('MYSTIC CONTROLS', this.canvas.width / 2, 190);
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '14px serif';
        this.ctx.fillText('Arrow Keys / WASD: Navigate the darkness', this.canvas.width / 2, 210);
        this.ctx.fillText('1-3: Channel orb powers from inventory', this.canvas.width / 2, 230);
        this.ctx.fillText('H: Summon this guide', this.canvas.width / 2, 250);
        
        // Orb guide
        this.renderHelpOrbGuide();
        
        // Footer
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#654321';
        this.ctx.font = '16px serif';
        this.ctx.fillText('Press H to dismiss this guide', this.canvas.width / 2, 520);
        this.ctx.textAlign = 'left';
    },

    // Render orb guide in help screen
    renderHelpOrbGuide() {
        this.ctx.fillStyle = '#CD853F';
        this.ctx.font = 'bold 18px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MYSTICAL ORBS', this.canvas.width / 2, 290);
        
        this.ctx.textAlign = 'left';
        const orbX = 180;
        this.ctx.font = '14px serif';
        
        // Light orbs section
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillText('Light Restoration:', orbX, 320);
        this.ctx.fillStyle = '#64b5f6';
        this.ctx.fillText('O  Blue Orb: Restores 20% illumination', orbX + 20, 340);
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.fillText('@  Golden Orb: Restores 40% illumination', orbX + 20, 360);
        this.ctx.fillStyle = '#ccccff';
        this.ctx.fillText('*  Light Wisp: Soul marker - Restores 50% illumination', orbX + 20, 380);
        
        // Power orbs section
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillText('Arcane Powers:', orbX, 410);
        this.ctx.fillStyle = '#9c27b0';
        this.ctx.fillText('P  Purple Orb: Ethereal form - pass through walls', orbX + 20, 430);
        this.ctx.fillStyle = '#4caf50';
        this.ctx.fillText('G  Green Orb: Regenerative aura - restore light over time', orbX + 20, 450);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('W  White Orb: Divine sight - reveal the entire floor', orbX + 20, 470);
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillText('♥  Crimson Orb: Soul anchor - defies death itself!', orbX + 20, 490);
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

    // Render game over screen (victory has its own overlay)
    renderGameOverScreen(game) {
        if (!game.gameOver || game.victory) return; // Skip if victory (has its own overlay)
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f44336';
        this.ctx.font = '48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Press R to return to menu', this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.textAlign = 'left';
    }
}; 