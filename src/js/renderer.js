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

    // Helper function to draw rounded rectangles
    drawRoundedRect(x, y, width, height, radius, fillColor = null, strokeColor = null, lineWidth = 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        
        if (fillColor) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }
        
        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }
    },

    // Main render function
    render(game) {
        // Safety check for game object
        if (!game) {
            console.warn('⚠️ Renderer.render() called with undefined game object');
            return;
        }
        
        // Manage sounds based on game state
        if (window.SoundManager) {
            const isPaused = window.Game && window.Game.isPaused;
            if (game.state === 'menu' || game.deathScreen || game.victory || game.showHelp || game.gameOver || isPaused) {
                // Pause sounds in menus
                SoundManager.pauseAll();
            } else if (game.state === 'playing' && SoundManager.isPaused) {
                // Resume sounds when playing
                SoundManager.resumeAll();
            }
        }
        
        // Dark underground atmosphere
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
        // this.renderSandParticles(game); // Atmospheric sand particles - temporarily disabled
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

        // Render UI overlays (behind help/death screens)
        this.renderVignette();
        this.renderDarknessFade(game);
        this.renderGameUI(game);
        this.renderMinimap(game);
        this.renderInventory(game);
        
        // Render modal overlays (on top of everything)
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
        
        // Very dark underground floor grid lines
        this.ctx.strokeStyle = '#0a0a0a';
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
        // Very dark underground wall color
        this.ctx.fillStyle = '#111';
        for (const wall of game.walls) {
            const dist = Utils.distance(wall, game.player);
            if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0) {
                this.ctx.globalAlpha = Math.max(0.3, 1 - (dist / (game.player.lightRadius * 2)));
                
                // Sandstone wall with texture gradient
                const wallGradient = this.ctx.createLinearGradient(wall.x - 15, wall.y - 15, wall.x + 15, wall.y + 15);
                wallGradient.addColorStop(0, '#9b8365'); // Lighter sandstone
                wallGradient.addColorStop(0.5, '#8b7355'); // Base sandstone
                wallGradient.addColorStop(1, '#7b6345'); // Darker shadow
                this.ctx.fillStyle = wallGradient;
                this.ctx.fillRect(wall.x - 15, wall.y - 15, 30, 30);
                
                // Subtle weathered edge
                this.ctx.strokeStyle = '#6b5335';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(wall.x - 15, wall.y - 15, 30, 30);
            }
        }
        this.ctx.globalAlpha = 1;
    },

    // Render stairs with Gothic design
    renderStairs(game) {
        if (!game.stairs) return;
        
        const dist = Utils.distance(game.stairs, game.player);
        if (dist < game.player.lightRadius * 1.5 || game.player.powers.reveal > 0 || dist < 100) {
            const time = game.time || 0; // Default to 0 if time is undefined
            const pulseSize = Math.sin(time * 0.08) * 3;
            const glowIntensity = 0.5 + Math.sin(time * 0.06) * 0.3;
            
            // Mystical glow background
            this.ctx.globalAlpha = glowIntensity * 0.6;
            const glowGradient = this.ctx.createRadialGradient(
                game.stairs.x, game.stairs.y, 0,
                game.stairs.x, game.stairs.y, 50 + pulseSize * 2
            );
            // Mystical Gothic glow
            glowGradient.addColorStop(0, 'rgba(218, 165, 32, 0.8)'); // Golden glow
            glowGradient.addColorStop(0.5, 'rgba(139, 69, 19, 0.4)'); // Gothic brown
            glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.fillRect(game.stairs.x - 60, game.stairs.y - 60, 120, 120);
            this.ctx.globalAlpha = 1;
            
            // Main Gothic platform with rounded corners
            const platformSize = 35;
            this.ctx.save();
            this.ctx.translate(game.stairs.x, game.stairs.y);
            
            // Outer platform with Gothic gradient
            const outerGradient = this.ctx.createLinearGradient(-platformSize, -platformSize, platformSize, platformSize);
            outerGradient.addColorStop(0, '#654321'); // Gothic brown
            outerGradient.addColorStop(0.5, '#8B4513'); // Medium brown
            outerGradient.addColorStop(1, '#2A1810'); // Dark brown
            
            this.ctx.restore();
            // Draw outer platform with rounded corners
            this.drawRoundedRect(
                game.stairs.x - platformSize,
                game.stairs.y - platformSize,
                platformSize * 2,
                platformSize * 2,
                8,
                outerGradient
            );
            
            // Inner platform with weathered stone
            const innerSize = platformSize - 6;
            const innerGradient = this.ctx.createLinearGradient(
                game.stairs.x - innerSize, 
                game.stairs.y - innerSize, 
                game.stairs.x + innerSize, 
                game.stairs.y + innerSize
            );
            innerGradient.addColorStop(0, '#2A1810'); // Dark Gothic
            innerGradient.addColorStop(0.5, '#1A0F08'); // Deeper shadow
            innerGradient.addColorStop(1, '#654321'); // Medium Gothic
            
            this.drawRoundedRect(
                game.stairs.x - innerSize,
                game.stairs.y - innerSize,
                innerSize * 2,
                innerSize * 2,
                6,
                innerGradient
            );
            
            this.ctx.save();
            this.ctx.translate(game.stairs.x, game.stairs.y);
            
            // Gothic stair steps with golden color
            this.ctx.strokeStyle = '#DAA520';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(-20 + i * 6, -10 + i * 6);
                this.ctx.lineTo(20 - i * 2, -10 + i * 6);
                this.ctx.stroke();
            }
            
            // Gothic down arrow
            this.ctx.fillStyle = '#DAA520';
            this.ctx.font = 'bold 28px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⬇', 0, 8);
            
            // EXIT text with Gothic styling
            this.ctx.fillStyle = '#8B4513';
            this.ctx.font = 'bold 11px serif';
            this.ctx.fillText('EXIT', 0, -22);
            
            this.ctx.restore();
            
            // Pulsing ancient golden border
            this.ctx.globalAlpha = glowIntensity;
            this.drawRoundedRect(
                game.stairs.x - platformSize - 2, 
                game.stairs.y - platformSize - 2, 
                (platformSize + 2) * 2, 
                (platformSize + 2) * 2, 
                10,
                null,
                '#FFD700',
                3
            );
            
            // Inner sandy glow border
            this.drawRoundedRect(
                game.stairs.x - platformSize + 2, 
                game.stairs.y - platformSize + 2, 
                (platformSize - 2) * 2, 
                (platformSize - 2) * 2, 
                6,
                null,
                '#FFE4B5',
                1
            );
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
        // Calculate player visibility based on light level
        const lightPercent = game.player.light / 100;
        const minVisibility = 0.6; // Never go below 60% visibility
        const playerAlpha = Math.max(minVisibility, 0.4 + (lightPercent * 0.6));
        
        // Player body with light-based dimming
        if (game.player.powers.phase > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * playerAlpha})`;
        } else {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${playerAlpha})`;
        }
        this.ctx.beginPath();
        this.ctx.arc(game.player.x, game.player.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Player inner detail with light-based dimming
        if (game.player.powers.phase > 0) {
            this.ctx.fillStyle = `rgba(200, 200, 200, ${0.5 * playerAlpha})`;
        } else {
            this.ctx.fillStyle = `rgba(200, 200, 200, ${playerAlpha})`;
        }
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
            
            // Add subtle flicker effect using time and light level
            const time = game.time || 0;
            const lightPercent = game.player.light / 100;
            const flickerIntensity = 0.04; // Subtle flicker
            const flicker = 1 + Math.sin(time * 0.08) * flickerIntensity + Math.sin(time * 0.17) * flickerIntensity * 0.6;
            
            // Adjust flicker based on light level - more flicker when light is low
            const lowLightFlicker = Math.max(0, (1 - lightPercent) * 0.08);
            const totalFlicker = flicker + lowLightFlicker;
            
            const flickeredRadius = game.player.lightRadius * totalFlicker;
            
            const gradient = this.ctx.createRadialGradient(
                game.player.x, game.player.y, 0,
                game.player.x, game.player.y, flickeredRadius
            );
            
            // Warm torch fire light effect with flicker intensity
            const baseIntensity = 0.5 * totalFlicker;
            const midIntensity = 0.3 * totalFlicker;
            const edgeIntensity = 0.15 * totalFlicker;
            
            gradient.addColorStop(0, `rgba(255, 200, 100, ${baseIntensity})`); // Bright warm center
            gradient.addColorStop(0.3, `rgba(255, 150, 50, ${midIntensity})`); // Orange glow
            gradient.addColorStop(0.7, `rgba(255, 100, 0, ${edgeIntensity})`); // Red-orange fade
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                game.player.x - flickeredRadius, 
                game.player.y - flickeredRadius,
                flickeredRadius * 2, 
                flickeredRadius * 2
            );
            this.ctx.globalCompositeOperation = 'source-over';
        } catch (error) {
            console.error('Error in renderLightEffect:', error);
            // Reset composite operation in case of error
            this.ctx.globalCompositeOperation = 'source-over';
        }
    },

    // Render atmospheric sand particles
    renderSandParticles(game) {
        // Create floating sand/dust particles for atmosphere
        this.ctx.save();
        this.ctx.globalAlpha = 0.15;
        this.ctx.fillStyle = '#d4a574';
        
        // Use game time for animation
        const time = game.time || 0;
        
        // Generate particles based on camera position for consistency
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const seed = i * 1000;
            const x = ((game.camera.x + seed + time * 0.2) % (this.canvas.width + 100)) - 50;
            const y = ((game.camera.y + seed * 0.7 + Math.sin(time * 0.001 + i) * 100) % (this.canvas.height + 100)) - 50;
            const size = 1 + Math.sin(seed) * 2;
            
            this.ctx.beginPath();
            this.ctx.arc(game.camera.x + x, game.camera.y + y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    },

    // Render darkness vignette
    renderVignette() {
        try {
            const vignette = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
            );
            // Dark underground vignette effect
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(0.6, 'rgba(0,0,0,0.2)');
            vignette.addColorStop(0.8, 'rgba(0,0,0,0.4)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
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

    // Render game UI elements on canvas
    renderGameUI(game) {
        if (game.state !== 'playing') return;
        
        // UI background panel with proper spacing
        const uiX = 10;
        const uiY = 10;
        const uiWidth = 200;
        const uiHeight = 115; // Adjusted for better spacing
        
        // Gothic UI background with rounded corners
        this.drawRoundedRect(uiX, uiY, uiWidth, uiHeight, 10, 'rgba(42, 24, 16, 0.9)', '#8B4513', 2);
        
        // Inner golden border with rounded corners
        this.drawRoundedRect(uiX + 2, uiY + 2, uiWidth - 4, uiHeight - 4, 8, null, '#DAA520', 1);
        
        // Text styling
        this.ctx.fillStyle = '#DAA520';
        this.ctx.font = '13px serif';
        this.ctx.textAlign = 'left';
        
        let textY = uiY + 20;
        const lineHeight = 16;
        
        // Floor info
        this.ctx.fillText(`Floor: ${game.floor} / -50`, uiX + 10, textY);
        textY += lineHeight;
        
        // Light percentage
        const lightPercent = Math.round(game.player.light);
        this.ctx.fillText(`Light: ${lightPercent}%`, uiX + 10, textY);
        textY += lineHeight;
        
        // Light bar
        const barX = uiX + 10;
        const barY = textY;
        const barWidth = 170;
        const barHeight = 12;
        
        // Light bar background
        this.ctx.fillStyle = '#1a0f08';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Light bar border
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Light bar fill
        const fillWidth = (game.player.light / 100) * (barWidth - 2);
        if (fillWidth > 0) {
            const gradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            gradient.addColorStop(0, '#DAA520');
            gradient.addColorStop(1, '#8B4513');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(barX + 1, barY + 1, fillWidth, barHeight - 2);
        }
        
        textY += lineHeight + 12; // Extra space after light bar
        
        // Checkpoint
        const checkpointNum = Math.ceil(Math.abs(game.checkpoint || game.floor) / 5);
        this.ctx.fillStyle = '#DAA520';
        this.ctx.fillText(`Checkpoint: ${checkpointNum}`, uiX + 10, textY);
        textY += lineHeight;
        
        // Power status
        if (game.player.powers.phase > 0) {
            this.ctx.fillStyle = '#9c27b0';
            this.ctx.fillText('♦ PHASE ACTIVE', uiX + 10, textY);
        } else if (game.player.powers.regeneration > 0) {
            this.ctx.fillStyle = '#4caf50';
            this.ctx.fillText('♦ REGENERATING', uiX + 10, textY);
        } else if (game.player.powers.reveal > 0) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText('♦ MAP REVEALED', uiX + 10, textY);
        }
        
        // Ensure consistent bottom padding (match top padding)
        // The UI height should accommodate the content with equal top/bottom spacing
    },
    
    // Render inventory on canvas (matching reference image)
    renderInventory(game) {
        if (game.state !== 'playing') return;
        
        const slotSize = 48;
        const slotGap = 8;
        const totalSlotsWidth = (slotSize * 3) + (slotGap * 2);
        
        // Position inventory at bottom center, moved down
        const invX = (this.canvas.width - totalSlotsWidth) / 2;
        const invY = this.canvas.height - 70;
        
        // Render each inventory slot individually (like in reference image)
        for (let i = 0; i < 3; i++) {
            const slotX = invX + (i * (slotSize + slotGap));
            const slotY = invY;
            
            // Slot background with Gothic styling
            this.drawRoundedRect(
                slotX, slotY, slotSize, slotSize, 
                10, 
                'rgba(26, 15, 8, 0.8)', 
                '#654321', 
                2
            );
            
            // Inner slot border for depth
            this.drawRoundedRect(
                slotX + 2, slotY + 2, slotSize - 4, slotSize - 4, 
                8, 
                null, 
                '#8B4513', 
                1
            );
            
            // Active slot highlighting (only when explicitly selected and has an item)
            if (game.player.selectedSlot === i && game.player.inventory[i]) {
                this.drawRoundedRect(
                    slotX, slotY, slotSize, slotSize, 
                    10, 
                    null, 
                    '#DAA520', 
                    2
                );
                
                // Subtle inner glow for active slot
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = '#DAA520';
                this.drawRoundedRect(
                    slotX + 1, slotY + 1, slotSize - 2, slotSize - 2, 
                    9, 
                    null, 
                    '#DAA520', 
                    1
                );
                this.ctx.shadowBlur = 0;
            }
            
            // Key indicator above slot - sand colored
            this.ctx.fillStyle = '#d4a574';
            this.ctx.font = 'bold 11px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(String(i + 1), slotX + slotSize / 2, slotY - 6);
            
            // Orb in slot
            const orbType = game.player.inventory[i];
            if (orbType && ORB_TYPES[orbType]) {
                const orb = ORB_TYPES[orbType];
                this.ctx.fillStyle = orb.color;
                this.ctx.font = 'bold 22px serif';
                this.ctx.textAlign = 'center';
                
                // Add subtle glow to orb
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = orb.color;
                this.ctx.fillText(orb.symbol, slotX + slotSize / 2, slotY + slotSize / 2 + 8);
                this.ctx.shadowBlur = 0;
            }
        }
    },

    // Render minimap on main canvas
    renderMinimap(game) {
        if (game.state !== 'playing') return;
        
        // Calculate actual map dimensions
        const mapWorldWidth = game.mapWidth * CONFIG.MAP.CELL_SIZE;
        const mapWorldHeight = game.mapHeight * CONFIG.MAP.CELL_SIZE;
        const mapAspectRatio = mapWorldWidth / mapWorldHeight;
        
        // Set minimap size to match stats menu height (115px) for consistency
        const mapHeight = 115; // Match stats menu height
        const mapWidth = mapHeight * mapAspectRatio;
        
        const mapX = this.canvas.width - mapWidth - 10;
        const mapY = 10;
        
        // Minimap background with rounded corners and extra padding
        this.drawRoundedRect(mapX, mapY, mapWidth, mapHeight, 12, 'rgba(42, 24, 16, 0.9)', '#8B4513', 3);
        
        // Inner content area with more padding
        const contentPadding = 8;
        const contentWidth = mapWidth - (contentPadding * 2);
        const contentHeight = mapHeight - (contentPadding * 2);
        const contentX = mapX + contentPadding;
        const contentY = mapY + contentPadding;
        
        // Very dark underground background for minimap
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(contentX, contentY, contentWidth, contentHeight);
        
        const scaleX = contentWidth / mapWorldWidth;
        const scaleY = contentHeight / mapWorldHeight;
        
        // Draw explored areas
        this.ctx.fillStyle = '#0f0f0f';
        for (const coord of game.explored) {
            const [x, y] = coord.split(',').map(Number);
            if (!isNaN(x) && !isNaN(y)) {
                this.ctx.fillRect(
                    contentX + (x * CONFIG.MAP.CELL_SIZE * scaleX), 
                    contentY + (y * CONFIG.MAP.CELL_SIZE * scaleY), 
                    CONFIG.MAP.CELL_SIZE * scaleX, 
                    CONFIG.MAP.CELL_SIZE * scaleY
                );
            }
        }
        
        // Draw walls
        this.ctx.fillStyle = '#222';
        for (const wall of game.walls) {
            const tileX = Math.floor(wall.x / CONFIG.MAP.CELL_SIZE);
            const tileY = Math.floor(wall.y / CONFIG.MAP.CELL_SIZE);
            if (game.explored.has(`${tileX},${tileY}`) || game.player.powers.reveal > 0) {
                this.ctx.fillRect(
                    contentX + ((wall.x - 15) * scaleX), 
                    contentY + ((wall.y - 15) * scaleY), 
                    30 * scaleX, 
                    30 * scaleY
                );
            }
        }
        
        // Draw stairs with Gothic styling
        if (game.stairs) {
            const stairTileX = Math.floor(game.stairs.x / CONFIG.MAP.CELL_SIZE);
            const stairTileY = Math.floor(game.stairs.y / CONFIG.MAP.CELL_SIZE);
            if (game.explored.has(`${stairTileX},${stairTileY}`) || game.player.powers.reveal > 0) {
                const stairX = contentX + ((game.stairs.x - 15) * scaleX);
                const stairY = contentY + ((game.stairs.y - 15) * scaleY);
                const stairSize = 30;
                
                // Golden stairs
                this.ctx.fillStyle = '#ff0';
                this.ctx.fillRect(stairX, stairY, stairSize * scaleX, stairSize * scaleY);
                
                // Pulsing Gothic border
                if ((game.time || 0) % 60 < 30) {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = Math.max(1, 2 * scaleX);
                    this.ctx.strokeRect(stairX, stairY, stairSize * scaleX, stairSize * scaleY);
                }
            }
        }
        
        // Draw player
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(
            contentX + ((game.player.x - 5) * scaleX),
            contentY + ((game.player.y - 5) * scaleY),
            10 * scaleX,
            10 * scaleY
        );
        
        // Draw camera bounds
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            contentX + (game.camera.x * scaleX),
            contentY + (game.camera.y * scaleY),
            this.canvas.width * scaleX,
            this.canvas.height * scaleY
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
        
        // Main title with Gothic styling
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#8B0000'; // Dark red shadow
        this.ctx.fillStyle = '#DAA520';
        this.ctx.font = 'bold 52px serif';
        this.ctx.fillText('BURIED SPIRE', this.canvas.width / 2, 90);
        
        // Subtitle with mystical glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#654321'; // Gothic brown shadow
        this.ctx.fillStyle = '#8B4513'; // Gothic brown
        this.ctx.font = 'italic 22px serif';
        this.ctx.fillText('Quest Into the Depths', this.canvas.width / 2, 120);
        this.ctx.shadowBlur = 0;
        
        // Atmospheric flavor text
        this.ctx.fillStyle = '#654321'; // Gothic brown
        this.ctx.font = '14px serif';
        this.ctx.fillText('Ancient depths await the brave...', this.canvas.width / 2, 150);
        
        // Desert decorative elements
        this.ctx.fillStyle = '#a68654';
        this.ctx.font = '16px serif';
        this.ctx.fillText('☥ ═══════════════════════════════════ ☥', this.canvas.width / 2, 175);
        
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
            
            // Dark Gothic button background
            const buttonGradient = this.ctx.createLinearGradient(
                centerX - buttonWidth/2, button.y,
                centerX + buttonWidth/2, button.y + buttonHeight
            );
            buttonGradient.addColorStop(0, '#654321'); // Gothic brown
            buttonGradient.addColorStop(0.5, '#2A1810'); // Dark brown
            buttonGradient.addColorStop(1, '#1A0F08'); // Darkest brown
            this.ctx.fillStyle = buttonGradient;
            this.ctx.fillRect(centerX - buttonWidth/2, button.y, buttonWidth, buttonHeight);
            
            // Dark Gothic border styling
            this.ctx.strokeStyle = '#8B4513'; // Gothic brown
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - buttonWidth/2, button.y, buttonWidth, buttonHeight);
            
            // Inner golden highlight
            this.ctx.strokeStyle = '#DAA520'; // Golden
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(centerX - buttonWidth/2 + 3, button.y + 3, buttonWidth - 6, buttonHeight - 6);
            
            // Button icon with golden glow
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = '#DAA520';
            this.ctx.fillStyle = '#DAA520';
            this.ctx.font = '20px serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(button.icon, centerX - 80, button.y + 28);
            this.ctx.shadowBlur = 0;
            
            // Button text with Gothic styling
            this.ctx.fillStyle = '#DAA520'; // Golden for readability
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
        
        // Dark background overlay
        this.ctx.fillStyle = 'rgba(42, 24, 16, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Decorative Gothic border
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
        this.ctx.fillStyle = '#DAA520';
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
        
        // Dark death screen background
        this.ctx.fillStyle = 'rgba(42, 24, 16, 0.98)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Gothic decorative border
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(30, 30, this.canvas.width - 60, this.canvas.height - 60);
        
        // Inner golden border
        this.ctx.strokeStyle = '#DAA520';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(35, 35, this.canvas.width - 70, this.canvas.height - 70);
        
        // Title with gothic styling
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#8B0000';
        this.ctx.fillStyle = '#DC143C';
        this.ctx.font = 'bold 40px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚜ CLAIMED BY THE VOID ⚜', this.canvas.width / 2, 100);
        this.ctx.shadowBlur = 0;
        
        // Stats with gothic styling
        this.ctx.fillStyle = '#CD853F';
        this.ctx.font = 'bold 20px serif';
        this.ctx.fillText('⚰ MORTAL CHRONICLE ⚰', this.canvas.width / 2, 160);
        
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '16px serif';
        this.ctx.textAlign = 'left';
        const statsX = this.canvas.width / 2 - 160;
        this.ctx.fillText(`⚔ Final Depth: Floor ${-game.floor}`, statsX, 200);
        this.ctx.fillText(`⚜ Last Sanctuary: Floor ${-game.checkpoint}`, statsX, 220);
        this.ctx.fillText(`💎 Orbs Gathered: ${game.player.orbsCollected}`, statsX, 240);
        this.ctx.fillText(`💀 Deaths This Quest: ${GameState.stats.totalDeaths}`, statsX, 260);
        this.ctx.fillText(`🏆 Deepest Descent: Floor ${-GameState.stats.deepestFloor}`, statsX, 280);
        
        // Leaderboard with gothic theme
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#DAA520';
        this.ctx.font = 'bold 18px serif';
        this.ctx.fillText('⚔ HALL OF LEGENDS ⚔', this.canvas.width / 2, 330);
        
        this.ctx.fillStyle = '#654321';
        this.ctx.font = '14px serif';
        this.ctx.fillText('♦ Shadow_Walker - Floor 47', this.canvas.width / 2, 355);
        this.ctx.fillText('♠ LightKeeper - Floor 42', this.canvas.width / 2, 375);
        this.ctx.fillText('♣ DuneRunner - Floor 38', this.canvas.width / 2, 395);
        this.ctx.fillText(`♥ Your Legacy - Floor ${-GameState.stats.deepestFloor}`, this.canvas.width / 2, 415);
        
        // Buttons
        this.renderDeathScreenButtons();
        
        this.ctx.textAlign = 'left';
    },

    // Render death screen buttons
    renderDeathScreenButtons() {
        const btnY = 460;
        const btnHeight = 50;
        const btnGap = 20;
        
        // Respawn button with gothic styling
        const gradient1 = this.ctx.createLinearGradient(this.canvas.width / 2 - 200 - btnGap, btnY, this.canvas.width / 2 - 20 - btnGap, btnY + btnHeight);
        gradient1.addColorStop(0, '#8B4513');
        gradient1.addColorStop(1, '#654321');
        this.ctx.fillStyle = gradient1;
        this.ctx.fillRect(this.canvas.width / 2 - 200 - btnGap, btnY, 180, btnHeight);
        this.ctx.strokeStyle = '#DAA520';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.canvas.width / 2 - 200 - btnGap, btnY, 180, btnHeight);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('♦ RISE AGAIN', this.canvas.width / 2 - 110 - btnGap, btnY + 32);
        
        // Quit button with gothic styling
        const gradient2 = this.ctx.createLinearGradient(this.canvas.width / 2 + btnGap, btnY, this.canvas.width / 2 + 200 + btnGap, btnY + btnHeight);
        gradient2.addColorStop(0, '#654321');
        gradient2.addColorStop(1, '#3d2817');
        this.ctx.fillStyle = gradient2;
        this.ctx.fillRect(this.canvas.width / 2 + btnGap, btnY, 180, btnHeight);
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.strokeRect(this.canvas.width / 2 + btnGap, btnY, 180, btnHeight);
        
        this.ctx.fillStyle = '#CD853F';
        this.ctx.fillText('♠ RETREAT', this.canvas.width / 2 + 110 + btnGap, btnY + 32);
    },

    // Render game over screen (victory has its own overlay)
    renderGameOverScreen(game) {
        if (!game.gameOver || game.victory) return; // Skip if victory (has its own overlay)
        
        // Desert sand game over background
        this.ctx.fillStyle = 'rgba(61, 43, 31, 1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desert game over styling
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#8b5a2b'; // Sandy brown shadow
        this.ctx.fillStyle = '#DC143C';
        this.ctx.font = 'bold 52px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('☥ QUEST FAILED ☥', this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.shadowBlur = 0;
        
        this.ctx.font = '18px serif';
        this.ctx.fillStyle = '#d4a574'; // Light sand
        this.ctx.fillText('Press R to retreat to the sanctum', this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.textAlign = 'left';
    }
}; 