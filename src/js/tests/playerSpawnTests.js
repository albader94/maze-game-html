/**
 * Test Suite for Player Starting Position Edge Cases
 * Tests for bugs in player spawn points during restarts and checkpoints
 */

class PlayerSpawnTests {
    constructor() {
        this.testResults = [];
        this.game = null;
    }

    /**
     * Initialize test environment with a mock game state
     */
    initTestGame() {
        // Create minimal game state for testing
        this.game = {
            mapWidth: 25,
            mapHeight: 25,
            floor: 1,
            checkpoint: 1,
            walls: [],
            player: {
                x: 100,
                y: 100,
                size: 15,
                light: 100,
                powers: { phase: 0 },
                inventory: [],
                deathMarkers: []
            }
        };
    }

    /**
     * Test Case 1: Player spawn on wall edges during new floor generation
     */
    testNewFloorSpawn() {
        console.log("🧪 Testing new floor spawn positioning...");
        
        const testCases = [
            { floor: 1, description: "First floor spawn" },
            { floor: 5, description: "Checkpoint floor spawn" },
            { floor: 10, description: "Deep floor spawn" },
            { floor: 25, description: "Very deep floor spawn" }
        ];

        for (const testCase of testCases) {
            this.initTestGame();
            this.game.floor = testCase.floor;
            
            // Simulate floor generation with wall placement
            this.generateTestMaze();
            
            // Test player position after spawn
            const result = this.validatePlayerPosition('new_floor', testCase);
            this.testResults.push(result);
        }
    }

    /**
     * Test Case 2: Checkpoint respawn positioning
     */
    testCheckpointRespawn() {
        console.log("🧪 Testing checkpoint respawn positioning...");
        
        const testCases = [
            { checkpoint: 1, currentFloor: 3, description: "Early checkpoint respawn" },
            { checkpoint: 5, currentFloor: 8, description: "Mid-game checkpoint respawn" },
            { checkpoint: 10, currentFloor: 12, description: "Late checkpoint respawn" },
            { checkpoint: 15, currentFloor: 18, description: "Deep checkpoint respawn" }
        ];

        for (const testCase of testCases) {
            this.initTestGame();
            this.game.floor = testCase.currentFloor;
            this.game.checkpoint = testCase.checkpoint;
            
            // Simulate checkpoint respawn
            this.simulateCheckpointRespawn();
            
            const result = this.validatePlayerPosition('checkpoint_respawn', testCase);
            this.testResults.push(result);
        }
    }

    /**
     * Test Case 3: Level restart positioning
     */
    testLevelRestart() {
        console.log("🧪 Testing level restart positioning...");
        
        const testCases = [
            { floor: 1, playerPos: { x: 500, y: 600 }, description: "Floor 1 restart from center" },
            { floor: 5, playerPos: { x: 200, y: 800 }, description: "Checkpoint floor restart" },
            { floor: 12, playerPos: { x: 750, y: 300 }, description: "Mid-game floor restart" },
            { floor: 8, playerPos: { x: 50, y: 950 }, description: "Restart from edge position" }
        ];

        for (const testCase of testCases) {
            this.initTestGame();
            this.game.floor = testCase.floor;
            this.game.player.x = testCase.playerPos.x;
            this.game.player.y = testCase.playerPos.y;
            
            // Simulate level restart
            this.simulateLevelRestart();
            
            const result = this.validatePlayerPosition('level_restart', testCase);
            this.testResults.push(result);
        }
    }

    /**
     * Test Case 4: Edge maze configurations
     */
    testEdgeMazeConfigurations() {
        console.log("🧪 Testing edge maze configurations...");
        
        const testCases = [
            { mazeType: 'no_bottom_left_spaces', description: "No valid spaces in bottom-left" },
            { mazeType: 'walls_at_spawn', description: "Walls blocking spawn area" },
            { mazeType: 'minimal_empty_spaces', description: "Very few empty spaces" },
            { mazeType: 'corner_blocked', description: "All corner spaces blocked" }
        ];

        for (const testCase of testCases) {
            this.initTestGame();
            
            // Generate problematic maze configurations
            this.generateProblematicMaze(testCase.mazeType);
            
            const result = this.validatePlayerPosition('edge_maze', testCase);
            this.testResults.push(result);
        }
    }

    /**
     * Test Case 5: Boundary collision detection
     */
    testBoundaryCollisions() {
        console.log("🧪 Testing boundary collision edge cases...");
        
        const testCases = [
            { x: 20, y: 20, description: "Top-left boundary" },
            { x: 980, y: 20, description: "Top-right boundary" },
            { x: 20, y: 980, description: "Bottom-left boundary" },
            { x: 980, y: 980, description: "Bottom-right boundary" },
            { x: 19, y: 500, description: "Left boundary violation" },
            { x: 981, y: 500, description: "Right boundary violation" },
            { x: 500, y: 19, description: "Top boundary violation" },
            { x: 500, y: 981, description: "Bottom boundary violation" }
        ];

        for (const testCase of testCases) {
            this.initTestGame();
            this.game.player.x = testCase.x;
            this.game.player.y = testCase.y;
            
            const result = this.validateBoundaryPosition(testCase);
            this.testResults.push(result);
        }
    }

    /**
     * Generate a test maze with walls
     */
    generateTestMaze() {
        const cellSize = 40;
        this.game.walls = [];
        
        // Create typical maze walls including problematic edge cases
        for (let y = 0; y < this.game.mapHeight; y++) {
            for (let x = 0; x < this.game.mapWidth; x++) {
                // Create walls around borders and some internal walls
                if (x === 0 || x === this.game.mapWidth - 1 || 
                    y === 0 || y === this.game.mapHeight - 1 ||
                    (x % 3 === 0 && y % 3 === 0)) {
                    this.game.walls.push({
                        x: x * cellSize + cellSize / 2,
                        y: y * cellSize + cellSize / 2
                    });
                }
            }
        }
    }

    /**
     * Generate problematic maze configurations for edge case testing
     */
    generateProblematicMaze(mazeType) {
        const cellSize = 40;
        this.game.walls = [];
        
        switch (mazeType) {
            case 'no_bottom_left_spaces':
                // Fill bottom-left quadrant with walls
                for (let y = Math.floor(this.game.mapHeight / 2); y < this.game.mapHeight; y++) {
                    for (let x = 0; x < Math.floor(this.game.mapWidth / 2); x++) {
                        this.game.walls.push({
                            x: x * cellSize + cellSize / 2,
                            y: y * cellSize + cellSize / 2
                        });
                    }
                }
                break;
                
            case 'walls_at_spawn':
                // Place walls specifically at typical spawn locations
                const spawnPositions = [
                    { x: 2, y: this.game.mapHeight - 3 },
                    { x: 3, y: this.game.mapHeight - 3 },
                    { x: 2, y: this.game.mapHeight - 4 },
                    { x: 3, y: this.game.mapHeight - 4 }
                ];
                spawnPositions.forEach(pos => {
                    this.game.walls.push({
                        x: pos.x * cellSize + cellSize / 2,
                        y: pos.y * cellSize + cellSize / 2
                    });
                });
                break;
                
            case 'minimal_empty_spaces':
                // Fill most of the map with walls, leaving only a few spaces
                for (let y = 1; y < this.game.mapHeight - 1; y++) {
                    for (let x = 1; x < this.game.mapWidth - 1; x++) {
                        if (Math.random() > 0.1) { // 90% wall coverage
                            this.game.walls.push({
                                x: x * cellSize + cellSize / 2,
                                y: y * cellSize + cellSize / 2
                            });
                        }
                    }
                }
                break;
                
            case 'corner_blocked':
                // Block all four corners
                const corners = [
                    { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
                    { x: this.game.mapWidth - 2, y: 1 }, { x: this.game.mapWidth - 3, y: 1 }, { x: this.game.mapWidth - 2, y: 2 },
                    { x: 1, y: this.game.mapHeight - 2 }, { x: 2, y: this.game.mapHeight - 2 }, { x: 1, y: this.game.mapHeight - 3 },
                    { x: this.game.mapWidth - 2, y: this.game.mapHeight - 2 }
                ];
                corners.forEach(corner => {
                    this.game.walls.push({
                        x: corner.x * cellSize + cellSize / 2,
                        y: corner.y * cellSize + cellSize / 2
                    });
                });
                break;
        }
    }

    /**
     * Simulate checkpoint respawn logic
     */
    simulateCheckpointRespawn() {
        const cellSize = 40;
        this.game.floor = this.game.checkpoint;
        this.game.player.light = 75;
        
        // Fixed position calculation from respawnAtCheckpoint
        this.game.player.x = cellSize + cellSize / 2;
        this.game.player.y = (this.game.mapHeight - 2) * cellSize + cellSize / 2;
        
        this.generateTestMaze();
    }

    /**
     * Simulate level restart logic
     */
    simulateLevelRestart() {
        const cellSize = 40;
        
        // Fixed position calculation from restartCurrentLevel
        this.game.player.x = cellSize + cellSize / 2;
        this.game.player.y = (this.game.mapHeight - 2) * cellSize + cellSize / 2;
        
        this.generateTestMaze();
    }

    /**
     * Validate player position against walls and boundaries
     */
    validatePlayerPosition(testType, testCase) {
        const result = {
            testType,
            testCase: testCase.description,
            playerPos: { x: this.game.player.x, y: this.game.player.y },
            issues: [],
            passed: true
        };

        // Check boundary violations
        if (!this.isInBounds(this.game.player.x, this.game.player.y)) {
            result.issues.push('Player spawned outside map boundaries');
            result.passed = false;
        }

        // Check wall collisions
        const wallCollision = this.checkWallCollisions(this.game.player.x, this.game.player.y);
        if (wallCollision) {
            result.issues.push(`Player spawned inside wall at (${wallCollision.x}, ${wallCollision.y})`);
            result.passed = false;
        }

        // Check if position is in expected spawn area (bottom-left quadrant)
        const expectedArea = this.isInExpectedSpawnArea(this.game.player.x, this.game.player.y);
        if (!expectedArea) {
            result.issues.push('Player spawned outside expected bottom-left spawn area');
            result.passed = false;
        }

        // Check minimum distance from walls
        const minWallDistance = this.getMinimumWallDistance(this.game.player.x, this.game.player.y);
        if (minWallDistance < this.game.player.size) {
            result.issues.push(`Player spawned too close to wall (distance: ${minWallDistance.toFixed(2)})`);
            result.passed = false;
        }

        return result;
    }

    /**
     * Validate boundary position specifically
     */
    validateBoundaryPosition(testCase) {
        const result = {
            testType: 'boundary_test',
            testCase: testCase.description,
            playerPos: { x: testCase.x, y: testCase.y },
            issues: [],
            passed: true
        };

        const inBounds = this.isInBounds(testCase.x, testCase.y);
        const shouldBeInBounds = testCase.x >= 20 && testCase.x <= 980 && testCase.y >= 20 && testCase.y <= 980;

        if (inBounds !== shouldBeInBounds) {
            result.issues.push(`Boundary check mismatch: expected ${shouldBeInBounds}, got ${inBounds}`);
            result.passed = false;
        }

        return result;
    }

    /**
     * Utility: Check if position is within map bounds
     */
    isInBounds(x, y) {
        const mapWidth = this.game.mapWidth * 40;
        const mapHeight = this.game.mapHeight * 40;
        return x >= 20 && x <= mapWidth - 20 && y >= 20 && y <= mapHeight - 20;
    }

    /**
     * Utility: Check for wall collisions at position
     */
    checkWallCollisions(x, y) {
        for (const wall of this.game.walls) {
            const dx = x - wall.x;
            const dy = y - wall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.game.player.size + 12) {
                return wall;
            }
        }
        return null;
    }

    /**
     * Utility: Check if position is in expected spawn area (bottom-left)
     */
    isInExpectedSpawnArea(x, y) {
        const cellSize = 40;
        const mapWidth = this.game.mapWidth * cellSize;
        const mapHeight = this.game.mapHeight * cellSize;
        
        return x < mapWidth / 2 && y >= mapHeight / 2;
    }

    /**
     * Utility: Get minimum distance to any wall
     */
    getMinimumWallDistance(x, y) {
        let minDistance = Infinity;
        
        for (const wall of this.game.walls) {
            const dx = x - wall.x;
            const dy = y - wall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }

    /**
     * Run all test cases
     */
    runAllTests() {
        console.log("🔬 Starting Player Spawn Position Test Suite");
        console.log("=" .repeat(50));
        
        this.testResults = [];
        
        this.testNewFloorSpawn();
        this.testCheckpointRespawn();
        this.testLevelRestart();
        this.testEdgeMazeConfigurations();
        this.testBoundaryCollisions();
        
        this.generateTestReport();
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log("\n📊 TEST RESULTS SUMMARY");
        console.log("=" .repeat(50));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log("\n❌ FAILED TESTS:");
            console.log("-" .repeat(30));
            
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`\n🚨 ${result.testType}: ${result.testCase}`);
                console.log(`   Position: (${result.playerPos.x}, ${result.playerPos.y})`);
                result.issues.forEach(issue => {
                    console.log(`   ❌ ${issue}`);
                });
            });
        }
        
        // Group issues by type for analysis
        const issueTypes = {};
        this.testResults.forEach(result => {
            result.issues.forEach(issue => {
                issueTypes[issue] = (issueTypes[issue] || 0) + 1;
            });
        });
        
        if (Object.keys(issueTypes).length > 0) {
            console.log("\n📈 ISSUE FREQUENCY ANALYSIS:");
            console.log("-" .repeat(30));
            Object.entries(issueTypes)
                .sort(([,a], [,b]) => b - a)
                .forEach(([issue, count]) => {
                    console.log(`${count}x: ${issue}`);
                });
        }
        
        // Provide recommendations
        this.generateRecommendations();
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        console.log("\n💡 RECOMMENDATIONS:");
        console.log("-" .repeat(30));
        
        const issues = this.testResults.flatMap(r => r.issues);
        
        if (issues.some(i => i.includes('spawned inside wall'))) {
            console.log("🔧 Fix wall collision detection in spawn positioning");
            console.log("   - Validate spawn position against all walls before placing player");
            console.log("   - Implement fallback positioning when preferred spawn is blocked");
        }
        
        if (issues.some(i => i.includes('outside map boundaries'))) {
            console.log("🔧 Fix boundary validation in spawn logic");
            console.log("   - Ensure all spawn calculations respect map boundaries");
            console.log("   - Add boundary checks before setting player position");
        }
        
        if (issues.some(i => i.includes('too close to wall'))) {
            console.log("🔧 Increase minimum distance from walls at spawn");
            console.log("   - Use player.size + safety margin for spawn validation");
            console.log("   - Implement safe position finding algorithm");
        }
        
        if (issues.some(i => i.includes('outside expected bottom-left'))) {
            console.log("🔧 Review spawn area selection logic");
            console.log("   - Ensure fallback positions still prefer bottom-left area");
            console.log("   - Consider expanding valid spawn area if bottom-left is blocked");
        }
        
        console.log("\n🎯 PRIORITY FIXES:");
        console.log("1. Implement comprehensive spawn position validation");
        console.log("2. Add safe position finding with multiple fallback options");
        console.log("3. Ensure consistent positioning across restart/respawn scenarios");
        console.log("4. Add runtime validation to catch spawn issues in production");
    }
}

// Export for use in browser console or testing framework
if (typeof window !== 'undefined') {
    window.PlayerSpawnTests = PlayerSpawnTests;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerSpawnTests;
}