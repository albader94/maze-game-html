// Story Narration System
const StoryNarration = {
    currentPart: 0,
    isPlaying: false,
    skipPressed: false,
    currentNarrationAudio: null,
    narrationTexts: [
        // Part 1
        "In the heart of an ancient desert, where the sun's rage turns sand to glass, lies a secret buried for millennia. The Spire of Shadows - a cursed monument that descends deep into the earth's forgotten depths.",
        
        // Part 2
        "You are an explorer, drawn by whispers of untold treasures and mystical orbs of power. But as you descended the spiral stairs, the entrance collapsed behind you. Now, only one path remains... down.",
        
        // Part 3
        "Light is life in these depths. The darkness hungers, and ancient guardians stalk the shadows. Gather the orbs, preserve your flame, and descend ever deeper. For at the bottom of this buried spire, legend speaks of the Ancient Pearl - your only escape from this tomb of shadows.",
        
        // Part 4
        "Remember, brave soul: when your light fades, the darkness consumes all. Begin your descent."
    ],
    
    narrationDurations: [18000, 16000, 23000, 10000], // in milliseconds
    
    // Start the story narration
    start() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.currentPart = 0;
        this.skipPressed = false;
        
        // Handle user interaction for audio
        if (window.SoundManager && window.SoundManager.handleUserInteraction) {
            window.SoundManager.handleUserInteraction();
        }
        
        // Create story overlay
        this.createStoryOverlay();
        
        // Load narration sounds
        this.loadNarrationSounds();
        
        // Give sounds time to load before starting
        setTimeout(() => {
            // Start first narration
            this.playNextPart();
        }, 500);
    },
    
    // Load all narration sound files
    loadNarrationSounds() {
        if (window.SoundManager) {
            console.log('Loading narration sounds...');
            SoundManager.loadSound('narration1', '../assets/sound/Story/part1.mp3');
            SoundManager.loadSound('narration2', '../assets/sound/Story/part2.mp3');
            SoundManager.loadSound('narration3', '../assets/sound/Story/part3.mp3');
            SoundManager.loadSound('narration4', '../assets/sound/Story/part4.mp3');
            console.log('Narration sounds loaded');
        }
    },
    
    // Create the black overlay with text
    createStoryOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'storyOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 1s ease-in-out;
        `;
        
        // Create text container
        const textContainer = document.createElement('div');
        textContainer.id = 'storyText';
        textContainer.style.cssText = `
            max-width: 800px;
            padding: 40px;
            text-align: center;
            color: #d4af37;
            font-size: 24px;
            line-height: 1.8;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
            opacity: 0;
            transition: opacity 1.5s ease-in-out;
        `;
        
        // Create skip button
        const skipButton = document.createElement('button');
        skipButton.textContent = 'Skip (ESC)';
        skipButton.style.cssText = `
            position: absolute;
            bottom: 30px;
            right: 30px;
            padding: 10px 20px;
            background: rgba(212, 175, 55, 0.2);
            border: 1px solid #d4af37;
            color: #d4af37;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: 0.5;
        `;
        skipButton.onmouseover = () => skipButton.style.opacity = '1';
        skipButton.onmouseout = () => skipButton.style.opacity = '0.5';
        skipButton.onclick = () => this.skip();
        
        overlay.appendChild(textContainer);
        overlay.appendChild(skipButton);
        document.body.appendChild(overlay);
        
        // Fade in overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);
        
        // Listen for ESC key
        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.skip();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    },
    
    // Play the next part of the narration
    playNextPart() {
        if (this.skipPressed || this.currentPart >= this.narrationTexts.length) {
            this.complete();
            return;
        }
        
        const textElement = document.getElementById('storyText');
        if (!textElement) return;
        
        // Fade out previous text
        textElement.style.opacity = '0';
        
        setTimeout(() => {
            // Update text
            textElement.textContent = this.narrationTexts[this.currentPart];
            
            // Fade in new text
            setTimeout(() => {
                textElement.style.opacity = '1';
            }, 100);
            
            // Play narration audio and store reference
            if (window.SoundManager && window.SoundManager.sounds[`narration${this.currentPart + 1}`]) {
                // Stop any previous narration
                this.stopCurrentNarration();
                
                // Clone and play new narration
                this.currentNarrationAudio = window.SoundManager.sounds[`narration${this.currentPart + 1}`].cloneNode();
                this.currentNarrationAudio.volume = 0.8 * (window.SoundManager.volume || 1);
                
                // Wait for audio to end before moving to next part
                this.currentNarrationAudio.addEventListener('ended', () => {
                    console.log(`Part ${this.currentPart + 1} audio ended`);
                    if (!this.skipPressed) {
                        // Add a small pause between narrations
                        setTimeout(() => {
                            this.currentPart++;
                            this.playNextPart();
                        }, 1000);
                    }
                });
                
                this.currentNarrationAudio.play().catch(e => {
                    console.warn('Could not play narration:', e);
                    // If audio fails, fall back to timer
                    setTimeout(() => {
                        if (!this.skipPressed) {
                            this.currentPart++;
                            this.playNextPart();
                        }
                    }, this.narrationDurations[this.currentPart]);
                });
            } else {
                // No audio available, use timer
                setTimeout(() => {
                    if (!this.skipPressed) {
                        this.currentPart++;
                        this.playNextPart();
                    }
                }, this.narrationDurations[this.currentPart]);
            }
            
        }, 1500); // Wait for fade out
    },
    
    // Skip the narration
    skip() {
        this.skipPressed = true;
        this.stopCurrentNarration();
        this.complete();
    },
    
    // Stop current narration audio
    stopCurrentNarration() {
        if (this.currentNarrationAudio) {
            this.currentNarrationAudio.pause();
            this.currentNarrationAudio.currentTime = 0;
            this.currentNarrationAudio = null;
        }
    },
    
    // Complete the narration and start the game
    complete() {
        const overlay = document.getElementById('storyOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
                document.removeEventListener('keydown', this.escHandler);
                
                // Stop any playing narration
                this.stopCurrentNarration();
                
                // Start the game after story
                this.isPlaying = false;
                
                // Start the game using GameState.startGame()
                if (window.GameState && window.GameState.startGame) {
                    console.log('Story complete - calling GameState.startGame()...');
                    
                    // Call the official startGame method
                    window.GameState.startGame();
                    
                    // Verify the game started
                    const game = window.GameState.getGame();
                    console.log('Game state after startGame:', game.state);
                    
                    // Start tutorial after game loads
                    setTimeout(() => {
                        if (window.TutorialSystem && window.TutorialSystem.startTutorial) {
                            window.TutorialSystem.startTutorial();
                        }
                    }, 500);
                } else {
                    console.error('GameState.startGame not found!');
                }
                
            }, 1000);
        }
    }
};

// Make globally accessible
window.StoryNarration = StoryNarration;