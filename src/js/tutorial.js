// Tutorial System
const TutorialSystem = {
    // Initialize tutorial system
    init() {
        console.log('🎓 Tutorial system initialized');
    },

    // Check if player is in tutorial levels (floors 1-5)
    isInTutorial(floor) {
        return floor >= 1 && floor <= 5;
    },

    // Start tutorial for new players
    startTutorial() {
        const game = GameState.getGame();
        if (!game) return;

        game.tutorial.active = true;
        game.tutorial.currentStep = 0;
        console.log('🎓 Tutorial started');
        
        // Show first tutorial message
        this.showTutorialStep(0);
    },

    // Show specific tutorial step
    showTutorialStep(step) {
        const game = GameState.getGame();
        if (!game) return;

        const tutorialSteps = [
            {
                title: "Welcome to the Buried Spire",
                message: `Welcome, explorer! You stand at the entrance to the ancient Burj Mubarak, now buried beneath the shifting sands of time. Your mission is to descend ${CONFIG.GAME.MAX_FLOORS} floors to find the legendary Ancient Pearl.`,
                instruction: "Use WASD or Arrow Keys to move around."
            },
            {
                title: "Your Light is Life",
                message: "Your light is your most precious resource. It slowly depletes as you explore, and when it reaches 0%, the ghouls will swarm you! Watch the light bar in the top-left corner.",
                instruction: "Your light slowly decreases over time - keep an eye on it!"
            },
            {
                title: "Collecting Orbs",
                message: "Orbs scattered throughout the spire can restore your light or grant special powers. Blue orbs restore light immediately, while other orbs go to your inventory for later use.",
                instruction: "Look for glowing orbs throughout the maze to restore light and gain powers."
            },
            {
                title: "Avoiding the Ghouls",
                message: "Dark spirits called ghouls roam these halls. They flee from bright light but will stalk you in dim areas. If they get too close, they'll drain your light faster!",
                instruction: "Stay in the center of your light radius to keep ghouls at bay."
            },
            {
                title: "Finding the Stairs",
                message: "To progress deeper, you must find the stairs (▼) on each floor. They're usually hidden in the maze, so explore thoroughly. Every 5 floors, you'll reach a checkpoint.",
                instruction: "Find the stairs (▼) to descend to the next floor."
            }
        ];

        if (step < tutorialSteps.length) {
            // Set the current step BEFORE showing the popup so the step counter is correct
            game.tutorial.currentStep = step;
            
            const stepData = tutorialSteps[step];
            this.showTutorialPopup(stepData.title, stepData.message, stepData.instruction);
        }
    },

    // Show tutorial popup that pauses the game
    showTutorialPopup(title, message, instruction = null, isOrbTutorial = false) {
        const game = GameState.getGame();
        if (!game) return;

        // Pause the game
        game.tutorial.showingOrbTutorial = true;
        
        // Remove existing popup
        this.hideTutorialPopup();

        // Use the explicit parameter to determine popup type
        const isTutorialStep = !isOrbTutorial && game.tutorial.active && this.isInTutorial(game.floor);
        const currentStep = game.tutorial.currentStep;
        const totalSteps = 5;

        // Create tutorial popup
        const popup = document.createElement('div');
        popup.id = 'tutorialPopup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 15000;
            font-family: monospace;
        `;

        popup.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #2a1810 0%, #1a0f08 50%, #0f0705 100%);
                border: 3px solid #8B4513;
                border-radius: 15px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 0 30px rgba(139, 69, 19, 0.5), inset 0 0 20px rgba(218, 165, 32, 0.1);
                position: relative;
                text-align: center;
                font-family: serif;
            ">
                <!-- Golden inner border -->
                <div style="position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 1px solid #DAA520; border-radius: 10px;"></div>
                
                <!-- Gothic corner decorations -->
                <div style="position: absolute; top: 10px; left: 10px; color: #DAA520; font-size: 16px;">╔</div>
                <div style="position: absolute; top: 10px; right: 15px; color: #DAA520; font-size: 16px;">╗</div>
                <div style="position: absolute; bottom: 10px; left: 10px; color: #DAA520; font-size: 16px;">╚</div>
                <div style="position: absolute; bottom: 10px; right: 15px; color: #DAA520; font-size: 16px;">╝</div>
                
                ${isTutorialStep ? `
                <div style="position: absolute; top: 15px; right: 15px; color: #CD853F; font-size: 12px; font-weight: bold;">
                    Lesson ${currentStep + 1} of ${totalSteps}
                </div>
                ` : ''}
                
                <h2 style="margin: 0 0 20px 0; color: #FFD700; text-shadow: 0 0 15px rgba(139, 0, 0, 0.7); font-size: 24px; font-weight: bold;">
                    ⚜ ${title}
                </h2>
                
                <div style="margin-bottom: 25px; padding: 20px; background: rgba(139, 69, 19, 0.2); border-radius: 10px; border: 2px solid #654321; line-height: 1.6;">
                    <p style="margin: 0; color: #CD853F; font-size: 16px;">
                        ${message}
                    </p>
                </div>
                
                ${instruction ? `
                <div style="margin-bottom: 25px; padding: 15px; background: rgba(139, 69, 19, 0.3); border-radius: 8px; border: 2px solid #8B4513;">
                    <p style="margin: 0; color: #DAA520; font-size: 14px; font-weight: bold;">
                        ♦ ${instruction}
                    </p>
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 15px; justify-content: center; align-items: center;">
                    <button id="tutorialContinue" style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #8B4513, #654321);
                        color: #FFD700;
                        border: 2px solid #DAA520;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-family: serif;
                        font-size: 16px;
                        text-shadow: 0 0 10px rgba(139, 0, 0, 0.5);
                        box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ♦ Continue
                    </button>
                    
                    ${isTutorialStep ? `
                    <button id="tutorialSkip" style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #654321, #3d2817);
                        color: #CD853F;
                        border: 2px solid #8B4513;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-family: serif;
                        font-size: 16px;
                        text-shadow: 0 0 10px rgba(139, 0, 0, 0.3);
                        box-shadow: 0 4px 15px rgba(101, 67, 33, 0.3);
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ♠ Skip Lessons
                    </button>
                    ` : ''}
                </div>
                
                <div style="margin-top: 15px; color: #654321; font-size: 12px;">
                    Press ESC to dismiss
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        game.tutorial.tutorialPopup = popup;

        // Add event listeners
        document.getElementById('tutorialContinue').addEventListener('click', () => {
            this.handleTutorialContinue();
        });

        // Only add skip button event listener for tutorial steps
        if (isTutorialStep) {
            document.getElementById('tutorialSkip').addEventListener('click', () => {
                this.skipTutorial();
            });
        }

        // Also allow ESC to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideTutorialPopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        console.log(`📚 Showing ${isOrbTutorial ? 'orb' : 'tutorial'}: ${title}`);
    },

    // Hide tutorial popup and resume game
    hideTutorialPopup() {
        const game = GameState.getGame();
        if (!game) return;

        const popup = document.getElementById('tutorialPopup');
        if (popup) {
            popup.remove();
        }
        
        game.tutorial.showingOrbTutorial = false;
        game.tutorial.tutorialPopup = null;
        console.log('📚 Tutorial popup hidden, game resumed');
    },

    // Show first-time orb tutorial
    showOrbTutorial(orbType) {
        const game = GameState.getGame();
        if (!game || game.tutorial.firstTimeOrbs.has(orbType)) {
            return; // Already seen this orb type
        }

        // Mark this orb type as seen
        game.tutorial.firstTimeOrbs.add(orbType);

        const orbData = ORB_TYPES[orbType];
        if (!orbData) return;

        let title, message, instruction;

        switch (orbType) {
            case 'common':
                title = "Blue Orb - Light Restoration";
                message = "You've found a Blue Orb! These orbs restore 20% of your light immediately when collected. They don't take up inventory space, so collect them whenever you see them.";
                instruction = "Blue orbs are consumed instantly - perfect for emergency light restoration!";
                break;
            
            case 'golden':
                title = "Golden Orb - Powerful Light";
                message = "A Golden Orb! This powerful orb restores 40% of your light immediately when collected, just like the blue orb but with greater power. It doesn't take up inventory space.";
                instruction = "Golden orbs are consumed instantly - perfect for major light restoration!";
                break;
            
            case 'purple':
                title = "Purple Orb - Phase Power";
                message = "You've discovered a Purple Orb! This mystical orb grants you the power to phase through walls for 5 seconds. It goes into your inventory and can be activated manually.";
                instruction = "The Purple Orb goes into your inventory (slots 1-3). Press keys 1, 2, or 3 to activate it based on which slot it's in. When activated, you can walk through walls for 5 seconds - perfect for escaping danger or finding shortcuts!";
                break;
            
            case 'green':
                title = "Green Orb - Regeneration";
                message = "A Green Orb! This nature-powered orb slowly regenerates your light over 10 seconds. It goes into your inventory and can be activated manually when needed.";
                instruction = "The Green Orb goes into your inventory (slots 1-3). Press keys 1, 2, or 3 to activate it based on which slot it's in. Perfect for long-term light management during exploration!";
                break;
            
            case 'white':
                title = "White Orb - Map Revelation";
                message = "You've found a White Orb! This illuminating orb reveals the entire floor layout for 5 seconds, showing walls, orbs, ghouls, and most importantly - the stairs! It goes into your inventory for manual activation.";
                instruction = "The White Orb goes into your inventory (slots 1-3). Press keys 1, 2, or 3 to activate it based on which slot it's in. Use it strategically to quickly navigate and find the stairs!";
                break;
            
            case 'red':
                title = "Red Orb - Lifeline";
                message = "A rare Red Orb! This goes into your inventory and serves as your lifeline. It will automatically activate when your light reaches 0%, fully restoring your light and saving you from the ghoul swarm.";
                instruction = "The Red Orb goes into your inventory (slots 1-3) and auto-activates at 0% light to save you! You can also manually activate it with keys 1, 2, or 3 for full light restoration. Keep it safe - it's your lifeline!";
                break;
            
            case 'wisp':
                title = "Light Wisp - Death Echo";
                message = "A Light Wisp appears where you previously died. These ethereal remnants of your past self restore 50% light when collected, helping you recover from setbacks.";
                instruction = "Wisps mark your death locations and provide substantial light restoration.";
                break;
            
            default:
                return; // Unknown orb type
        }

        this.showTutorialPopup(title, message, instruction, true);
    },

    // Update tutorial based on game state
    update(game) {
        if (!game || !game.tutorial.active) return;

        // Check tutorial progression for first 5 floors
        if (this.isInTutorial(game.floor)) {
            this.checkTutorialProgress(game);
        } else if (game.floor > 5) {
            // End tutorial after floor 5
            this.endTutorial();
        }
    },

    // Check if tutorial objectives are met
    checkTutorialProgress(game) {
        const step = game.tutorial.currentStep;
        
        // Only check for specific trigger conditions, don't auto-advance
        switch (step) {
            case 0: // Movement tutorial
                // Check if player has moved
                if (game.player.x !== (CONFIG.PLAYER.START_X || 100) || 
                    game.player.y !== (CONFIG.PLAYER.START_Y || 100)) {
                    // Player has moved, but don't auto-advance - wait for Continue button
                    // Just update the instruction text to acknowledge movement
                    const popup = document.getElementById('tutorialPopup');
                    if (popup) {
                        const instructionDiv = popup.querySelector('[style*="background: rgba(76, 175, 80, 0.2)"]');
                        if (instructionDiv) {
                            instructionDiv.innerHTML = `
                                <p style="margin: 0; color: #4caf50; font-size: 14px; font-weight: bold;">
                                    ✅ Great! You're moving around. Click Continue when ready to proceed.
                                </p>
                            `;
                        }
                    }
                }
                break;
                
            case 1: // Light tutorial
                // No automatic advancement - user must click Continue
                break;
                
            case 2: // Orb collection tutorial
                // This will be completed when first orb is collected via handleOrbCollection
                break;
                
            case 3: // Ghoul tutorial
                // No automatic advancement - user must click Continue
                break;
                
            case 4: // Stairs tutorial
                // Check if player has used stairs
                if (game.floor > 1) {
                    // Player has progressed, but tutorial is ending anyway
                    this.endTutorial();
                }
                break;
        }
    },

    // Complete a tutorial step (now only called by handleTutorialContinue)
    completeTutorialStep(nextStep) {
        const game = GameState.getGame();
        if (!game) return;

        // This function is now primarily used by handleOrbCollection
        // for the orb collection step completion
        if (game.tutorial.currentStep === 2 && nextStep === 3) {
            // Orb collection completed, show next step
            game.tutorial.completedSteps.add(2);
            setTimeout(() => {
                this.showTutorialStep(3);
            }, 1000);
        } else {
            console.log('🎓 Tutorial step completed');
        }
    },

    // End tutorial system
    endTutorial() {
        const game = GameState.getGame();
        if (!game) return;

        game.tutorial.active = false;
        this.hideTutorialPopup();
        
        // Show completion message
        Utils.showMessage("Tutorial complete! You're now ready to face the deeper mysteries of the Buried Spire. Good luck, explorer!", 5000);
        
        console.log('🎓 Tutorial system ended');
    },

    // Check if game should be paused for tutorial
    shouldPauseGame() {
        const game = GameState.getGame();
        if (!game) return false;
        
        // Check if any tutorial popup is currently showing
        const tutorialPopup = document.getElementById('tutorialPopup');
        const hasActivePopup = tutorialPopup !== null;
        
        // Also check the game state flags
        const showingTutorial = game.tutorial.showingOrbTutorial || hasActivePopup;
        
        // Debug logging (can be removed later)
        if (showingTutorial) {
            console.log('🎓 Tutorial pause active:', {
                hasActivePopup,
                showingOrbTutorial: game.tutorial.showingOrbTutorial,
                tutorialActive: game.tutorial.active
            });
        }
        
        return showingTutorial;
    },

    // Handle orb collection for tutorial
    handleOrbCollection(orbType) {
        const game = GameState.getGame();
        if (!game) return;

        // Show first-time orb tutorial
        this.showOrbTutorial(orbType);

        // If this is step 2 (orb collection tutorial), advance
        if (game.tutorial.active && game.tutorial.currentStep === 2) {
            this.completeTutorialStep(3);
        }
    },

    // Handle tutorial continue button
    handleTutorialContinue() {
        const game = GameState.getGame();
        if (!game) return;

        // Hide current popup
        this.hideTutorialPopup();

        // If this is a tutorial step, advance to next step
        if (game.tutorial.active && this.isInTutorial(game.floor)) {
            const currentStep = game.tutorial.currentStep;
            
            // Mark current step as completed
            game.tutorial.completedSteps.add(currentStep);
            
            // Check if there's a next step
            if (currentStep < 4) { // Steps 0-4 (5 total steps)
                // Advance to next step
                setTimeout(() => {
                    this.showTutorialStep(currentStep + 1);
                }, 500); // Small delay for better UX
            } else {
                // Tutorial completed for this floor
                console.log('🎓 Tutorial step completed');
            }
        }
    },

    // Skip entire tutorial
    skipTutorial() {
        const game = GameState.getGame();
        if (!game) return;

        // Mark all steps as completed
        for (let i = 0; i < 5; i++) {
            game.tutorial.completedSteps.add(i);
        }

        // End tutorial
        this.endTutorial();
        
        console.log('⏭️ Tutorial skipped by user');
    }
}; 