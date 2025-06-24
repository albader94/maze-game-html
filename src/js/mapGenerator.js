// Map Generation
const MapGenerator = {
    // Generate a new floor
    generateFloor(game, floorNum) {
        // Clear existing floor data
        game.walls = [];
        game.orbs = [];
        game.ghouls = [];
        game.particles = [];
        game.explored.clear();
        
        const cellSize = CONFIG.MAP.CELL_SIZE;
        const grid = this.createGrid(game.mapWidth, game.mapHeight);
        
        // Generate maze structure
        this.generateMaze(grid, game.mapWidth, game.mapHeight);
        
        // Add rooms for variety
        this.addRooms(grid, game.mapWidth, game.mapHeight, floorNum);
        
        // Convert grid to walls
        this.createWalls(grid, game, cellSize);
        
        // Find empty spaces for entities
        const emptySpaces = this.findEmptySpaces(grid, game.mapWidth, game.mapHeight, cellSize);
        
        // Place game entities
        this.placeDeathMarkers(game, floorNum);
        this.placeOrbs(game, emptySpaces);
        this.placeGhouls(game, emptySpaces, floorNum);
        this.placeStairs(game, emptySpaces);
        
        // Reset player position
        this.resetPlayerPosition(game, cellSize);
        
        Utils.updateCamera(game);
        
        console.log('Floor generated:', floorNum, 'Stairs at:', game.stairs);
    },

    // Create initial grid
    createGrid(width, height) {
        const grid = [];
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                grid[y][x] = 1; // 1 = wall, 0 = empty
            }
        }
        return grid;
    },

    // Generate maze using recursive backtracking
    generateMaze(grid, width, height) {
        const stack = [];
        const startCell = { x: 1, y: height - 2 };
        grid[startCell.y][startCell.x] = 0;
        stack.push(startCell);
        
        const directions = [
            { dx: 0, dy: -2 },  // Up
            { dx: 2, dy: 0 },   // Right
            { dx: 0, dy: 2 },   // Down
            { dx: -2, dy: 0 }   // Left
        ];
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            
            // Find valid neighbors
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                
                if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
                    neighbors.push({ x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2 });
                }
            }
            
            if (neighbors.length > 0) {
                const next = Utils.randomElement(neighbors);
                grid[next.y][next.x] = 0;
                grid[current.y + next.dy][current.x + next.dx] = 0;
                stack.push(next);
            } else {
                stack.pop();
            }
        }
    },

    // Add rooms to make the maze more interesting
    addRooms(grid, width, height, floorNum) {
        const numRooms = 3 + Math.floor(floorNum / 10);
        
        for (let i = 0; i < numRooms; i++) {
            const roomX = 2 + Math.floor(Math.random() * (width - 6));
            const roomY = 2 + Math.floor(Math.random() * (height - 6));
            const roomW = 2 + Math.floor(Math.random() * 3);
            const roomH = 2 + Math.floor(Math.random() * 3);
            
            // Create room
            for (let ry = 0; ry < roomH; ry++) {
                for (let rx = 0; rx < roomW; rx++) {
                    if (roomX + rx < width - 1 && roomY + ry < height - 1) {
                        grid[roomY + ry][roomX + rx] = 0;
                    }
                }
            }
        }
    },

    // Convert grid to wall objects
    createWalls(grid, game, cellSize) {
        for (let y = 0; y < game.mapHeight; y++) {
            for (let x = 0; x < game.mapWidth; x++) {
                if (grid[y][x] === 1) {
                    game.walls.push({
                        x: x * cellSize + cellSize / 2,
                        y: y * cellSize + cellSize / 2
                    });
                }
            }
        }
    },

    // Find all empty spaces in the grid
    findEmptySpaces(grid, width, height, cellSize) {
        const emptySpaces = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (grid[y][x] === 0) {
                    emptySpaces.push({ 
                        x: x * cellSize + cellSize / 2, 
                        y: y * cellSize + cellSize / 2 
                    });
                }
            }
        }
        return emptySpaces;
    },

    // Place death markers from previous attempts
    placeDeathMarkers(game, floorNum) {
        for (const marker of game.player.deathMarkers) {
            if (marker.floor === floorNum) {
                game.orbs.push({
                    x: marker.x,
                    y: marker.y,
                    type: 'wisp',
                    collected: false,
                    pulse: 0
                });
            }
        }
    },

    // Place orbs on the floor
    placeOrbs(game, emptySpaces) {
        const orbCount = 12;
        const availableSpaces = [...emptySpaces];
        
        for (let i = 0; i < Math.min(orbCount, availableSpaces.length - 2); i++) {
            const idx = Math.floor(Math.random() * availableSpaces.length);
            const space = availableSpaces.splice(idx, 1)[0];
            
            const orbType = this.getRandomOrbType();
            
            game.orbs.push({
                x: space.x,
                y: space.y,
                type: orbType,
                collected: false,
                pulse: Math.random() * Math.PI * 2
            });
        }
    },

    // Get random orb type based on rarity
    getRandomOrbType() {
        const roll = Math.random();
        if (roll > 0.95) return 'red';      // Very rare (5% chance)
        if (roll > 0.75) return 'white';    // Rare (20% chance)
        if (roll > 0.55) return 'green';    // Uncommon (20% chance)
        if (roll > 0.35) return 'purple';   // Uncommon (20% chance)
        if (roll > 0.15) return 'golden';   // Common (20% chance)
        return 'common';                    // Most common (15% chance)
    },

    // Place ghouls on the floor
    placeGhouls(game, emptySpaces, floorNum) {
        const ghoulCount = 2 + Math.floor(floorNum / 3);
        const availableSpaces = [...emptySpaces];
        
        for (let i = 0; i < Math.min(ghoulCount, availableSpaces.length); i++) {
            const idx = Math.floor(Math.random() * availableSpaces.length);
            const space = availableSpaces.splice(idx, 1)[0];
            
            game.ghouls.push({
                x: space.x,
                y: space.y,
                speed: 0.8 + Math.random() * 0.4,
                state: 'patrol',
                patrolTarget: { 
                    x: Math.random() * game.mapWidth * CONFIG.MAP.CELL_SIZE, 
                    y: Math.random() * game.mapHeight * CONFIG.MAP.CELL_SIZE 
                }
            });
        }
    },

    // Place stairs to next floor
    placeStairs(game, emptySpaces) {
        if (emptySpaces.length === 0) {
            // Fallback position if no empty spaces
            game.stairs = {
                x: (game.mapWidth - 2) * CONFIG.MAP.CELL_SIZE,
                y: 2 * CONFIG.MAP.CELL_SIZE
            };
            return;
        }

        // Try to place stairs in top-right area first
        let stairsPlaced = false;
        for (const space of emptySpaces) {
            if (space.x > game.mapWidth * 30 && space.y < game.mapHeight * 10) {
                game.stairs = { x: space.x, y: space.y };
                stairsPlaced = true;
                break;
            }
        }
        
        // If no top-right space, use a random empty space
        if (!stairsPlaced) {
            const stairSpace = Utils.randomElement(emptySpaces);
            game.stairs = { x: stairSpace.x, y: stairSpace.y };
        }
    },

    // Reset player to starting position
    resetPlayerPosition(game, cellSize) {
        game.player.x = cellSize + cellSize / 2;
        game.player.y = (game.mapHeight - 2) * cellSize + cellSize / 2;
    }
}; 