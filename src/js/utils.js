// Utility Functions
const Utils = {
    // Object pools for better memory management
    particlePool: [],
    ghoulPool: [],
    orbPool: [],
    
    // Performance tracking
    performanceMetrics: {
        frameTime: 0,
        renderTime: 0,
        updateTime: 0,
        avgFPS: 60,
        frameCount: 0
    },

    // Calculate distance between two points
    distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    },

    // Fast distance check (squared distance for comparison)
    fastDistance(a, b) {
        return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    },

    // Spatial hash grid for collision optimization
    spatialGrid: new Map(),
    gridSize: 100,

    // Add entity to spatial grid
    addToSpatialGrid(entity, type) {
        const gridX = Math.floor(entity.x / this.gridSize);
        const gridY = Math.floor(entity.y / this.gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, { walls: [], ghouls: [], orbs: [], particles: [] });
        }
        
        this.spatialGrid.get(key)[type].push(entity);
    },

    // Clear spatial grid
    clearSpatialGrid() {
        this.spatialGrid.clear();
    },

    // Get nearby entities from spatial grid
    getNearbyEntities(x, y, type, radius = 1) {
        const entities = [];
        const centerX = Math.floor(x / this.gridSize);
        const centerY = Math.floor(y / this.gridSize);
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const key = `${centerX + dx},${centerY + dy}`;
                const cell = this.spatialGrid.get(key);
                if (cell && cell[type]) {
                    entities.push(...cell[type]);
                }
            }
        }
        
        return entities;
    },

    // Object pool management
    getFromPool(poolName, createFn) {
        const pool = this[poolName];
        if (pool.length > 0) {
            return pool.pop();
        }
        return createFn();
    },

    returnToPool(poolName, object) {
        if (this[poolName].length < 100) { // Limit pool size
            // Reset object properties
            Object.keys(object).forEach(key => {
                if (typeof object[key] === 'number') object[key] = 0;
                if (typeof object[key] === 'boolean') object[key] = false;
                if (Array.isArray(object[key])) object[key].length = 0;
            });
            this[poolName].push(object);
        }
    },

    // Update camera position to follow player (simple centered approach)
    updateCamera(game) {
        // Center camera on player with world boundary constraints
        const targetCameraX = game.player.x - CONFIG.CANVAS.WIDTH / 2;
        const targetCameraY = game.player.y - CONFIG.CANVAS.HEIGHT / 2;

        // Apply world boundaries
        const maxCameraX = Math.max(0, game.mapWidth * CONFIG.MAP.CELL_SIZE - CONFIG.CANVAS.WIDTH);
        const maxCameraY = Math.max(0, game.mapHeight * CONFIG.MAP.CELL_SIZE - CONFIG.CANVAS.HEIGHT);

        game.camera.x = Math.max(0, Math.min(targetCameraX, maxCameraX));
        game.camera.y = Math.max(0, Math.min(targetCameraY, maxCameraY));
    },

    // Update UI elements
    updateUI(game) {
        document.getElementById('floor').textContent = -game.floor;
        document.getElementById('lightTime').textContent = Math.round(Math.max(0, game.player.light));
        document.getElementById('lightBar').style.width = `${Math.max(0, game.player.light)}%`;
        document.getElementById('orbs').textContent = game.player.orbsCollected;
        
        // Update checkpoint display - calculate checkpoint number based on current floor
        const checkpointNumber = Math.ceil(Math.abs(game.floor) / 5);
        document.getElementById('checkpoint').textContent = checkpointNumber;
        
        // Update power status
        const powerStatus = [];
        if (game.player.powers.phase > 0) 
            powerStatus.push(`Phase: ${Math.ceil(game.player.powers.phase / 60)}s`);
        if (game.player.powers.regeneration > 0) 
            powerStatus.push(`Regen: ${Math.ceil(game.player.powers.regeneration / 60)}s`);
        if (game.player.powers.reveal > 0) 
            powerStatus.push(`Reveal: ${Math.ceil(game.player.powers.reveal / 60)}s`);
        
        document.getElementById('powerStatus').textContent = powerStatus.join(' | ');
        
        // Update stalking indicator
        let stalkingGhouls = 0;
        for (const ghoul of game.ghouls) {
            const distToPlayer = this.distance(ghoul, game.player);
            if (ghoul.state === 'stalking' && distToPlayer < game.player.lightRadius * 1.5) {
                stalkingGhouls++;
            }
        }
        
        const stalkingIndicator = document.getElementById('stalkingIndicator');
        if (stalkingIndicator) {
            if (stalkingGhouls > 0) {
                stalkingIndicator.style.display = 'block';
                stalkingIndicator.textContent = stalkingGhouls === 1 ? '👁️ STALKED' : `👁️ STALKED (${stalkingGhouls})`;
            } else {
                stalkingIndicator.style.display = 'none';
            }
        }
    },

    // Mark areas as explored
    markExplored(game) {
        const px = Math.floor(game.player.x / CONFIG.MAP.CELL_SIZE);
        const py = Math.floor(game.player.y / CONFIG.MAP.CELL_SIZE);
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                game.explored.add(`${px + dx},${py + dy}`);
            }
        }
    },

    // Check if position is in bounds
    isInBounds(x, y, game) {
        return x >= 20 && x <= game.mapWidth * CONFIG.MAP.CELL_SIZE - 20 &&
               y >= 20 && y <= game.mapHeight * CONFIG.MAP.CELL_SIZE - 20;
    },

    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    // Get random element from array
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // Create particle effect with object pooling
    createParticles(game, x, y, color, count = 10, speed = 4) {
        for (let i = 0; i < count; i++) {
            const particle = this.getFromPool('particlePool', () => ({}));
            particle.x = x;
            particle.y = y;
            particle.vx = (Math.random() - 0.5) * speed;
            particle.vy = (Math.random() - 0.5) * speed;
            particle.life = 30;
            particle.color = color;
            particle.active = true;
            
            game.particles.push(particle);
        }
    },

    // Create circular particle effect
    createCircularParticles(game, x, y, color, count = 20, speed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const particle = this.getFromPool('particlePool', () => ({}));
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 60;
            particle.color = color;
            particle.active = true;
            
            game.particles.push(particle);
        }
    },

    // Find safe position near given coordinates
    findSafePosition(game, x, y, radius = 80) {
        let bestX = x;
        let bestY = y;
        let bestDist = Infinity;
        
        // Use spatial grid for faster collision checking
        const nearbyWalls = this.getNearbyEntities(x, y, 'walls', 2);
        
        // Check surrounding areas for safe spot
        for (let dx = -radius; dx <= radius; dx += 20) {
            for (let dy = -radius; dy <= radius; dy += 20) {
                const testX = x + dx;
                const testY = y + dy;
                let safe = true;
                
                // Check if this position is safe (no wall collision)
                for (const wall of nearbyWalls) {
                    if (this.fastDistance({ x: testX, y: testY }, wall) < 625) { // 25^2
                        safe = false;
                        break;
                    }
                }
                
                if (safe && this.isInBounds(testX, testY, game)) {
                    const dist = Math.abs(dx) + Math.abs(dy);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestX = testX;
                        bestY = testY;
                    }
                }
            }
        }
        
        return { x: bestX, y: bestY };
    },

    // Performance monitoring
    startPerformanceTimer(name) {
        this.performanceMetrics[`${name}Start`] = performance.now();
    },

    endPerformanceTimer(name) {
        const start = this.performanceMetrics[`${name}Start`];
        if (start) {
            this.performanceMetrics[`${name}Time`] = performance.now() - start;
        }
    },

    // Update performance metrics
    updatePerformanceMetrics(deltaTime) {
        this.performanceMetrics.frameTime = deltaTime;
        this.performanceMetrics.frameCount++;
        
        // Calculate average FPS over last 60 frames
        if (this.performanceMetrics.frameCount % 60 === 0) {
            this.performanceMetrics.avgFPS = Math.round(1000 / deltaTime);
        }
    },

    // Get performance report
    getPerformanceReport() {
        return {
            fps: this.performanceMetrics.avgFPS,
            frameTime: this.performanceMetrics.frameTime.toFixed(2),
            renderTime: this.performanceMetrics.renderTime.toFixed(2),
            updateTime: this.performanceMetrics.updateTime.toFixed(2),
            particlePoolSize: this.particlePool.length,
            spatialGridCells: this.spatialGrid.size
        };
    },

    // Message system for auto-disappearing messages
    messageTimeout: null,

    // Show a message that auto-disappears after a specified time
    showMessage(text, duration = 3000) {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #444;
            backdrop-filter: blur(5px);
            font-family: monospace;
            font-size: 14px;
            z-index: 1000;
            max-width: 600px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        `;
        notification.textContent = text;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    },

    // Hide message immediately (legacy compatibility)
    hideMessage() {
        // This function is kept for compatibility but notifications now auto-remove
        console.log('hideMessage called - notifications now auto-remove');
    }
}; 