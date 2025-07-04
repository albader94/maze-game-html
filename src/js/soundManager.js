// Sound Manager for Buried Spire Quest
const SoundManager = {
    sounds: {},
    ambientSounds: [],
    currentAmbient: null,
    crossfadeStarted: false,
    nextAmbient: null,
    volume: 0.7,
    ambientVolume: 0.15,  // Reduced for subtlety
    sfxVolume: 0.3,      // Reduced for less intrusive SFX
    initialized: false,
    isPaused: false,
    
    // Initialize sound system
    init() {
        if (this.initialized) return;
        
        console.log('🔊 Initializing Sound Manager');
        
        // Load all sounds with correct paths relative to public/index.html
        // Load underground ambience
        this.loadSound('ambient', '../assets/sound/Underground_ambience.mp3');
        
        // Load wind sounds
        this.loadSound('wind1', '../assets/sound/Wind through passages/Wind_through_passage-1.mp3');
        this.loadSound('wind2', '../assets/sound/Wind through passages/Wind_through_passage-2.mp3');
        
        this.initialized = true;
        
        // Don't start ambient sounds automatically - wait for user interaction
    },
    
    // Load individual sound
    loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.addEventListener('error', (e) => {
                console.warn(`⚠️ Failed to load sound: ${name} from ${path}`);
            });
            this.sounds[name] = audio;
        } catch (error) {
            console.warn(`⚠️ Error loading sound ${name}:`, error);
        }
    },
    
    // Play a sound effect
    playSFX(soundName, volume = null) {
        if (!this.initialized || !this.sounds[soundName]) return;
        
        try {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = (volume !== null ? volume : this.sfxVolume) * this.volume;
            sound.play().catch(e => {
                console.warn(`Could not play sound ${soundName}:`, e);
            });
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    },
    
    
    
    // Start ambient sound loop
    startAmbientSounds() {
        if (!this.initialized) return;
        
        // Start with underground ambience
        this.playAmbientLoop();
        
        // Occasionally play wind sounds
        this.scheduleWindSounds();
    },
    
    // Play looping ambient sound - crossfade to handle fade-out
    playAmbientLoop() {
        if (this.sounds.ambient && !this.currentAmbient) {
            try {
                // Clone the audio to avoid issues
                this.currentAmbient = this.sounds.ambient.cloneNode();
                this.currentAmbient.volume = this.ambientVolume * this.volume;
                this.currentAmbient.loop = false; // Don't use native loop due to fade-out
                
                // Preload to avoid gaps
                this.currentAmbient.preload = 'auto';
                
                // Handle crossfade before track ends (account for fade-out)
                this.currentAmbient.addEventListener('timeupdate', () => {
                    if (this.currentAmbient) {
                        const timeLeft = this.currentAmbient.duration - this.currentAmbient.currentTime;
                        // Start crossfade 2 seconds before end (during fade-out)
                        if (timeLeft <= 2 && timeLeft > 0 && !this.crossfadeStarted) {
                            this.crossfadeStarted = true;
                            this.startAmbientCrossfade();
                        }
                    }
                });
                
                this.currentAmbient.addEventListener('ended', () => {
                    this.currentAmbient = null;
                    this.crossfadeStarted = false;
                    // Start next loop if not paused
                    if (!this.isPaused) {
                        this.playAmbientLoop();
                    }
                });
                
                this.currentAmbient.play().catch(e => {
                    console.warn('Could not play ambient sound:', e);
                });
            } catch (error) {
                console.warn('Error playing ambient sound:', error);
            }
        }
    },
    
    
    // Start crossfade for ambient sound to handle fade-out
    startAmbientCrossfade() {
        if (this.sounds.ambient && !this.nextAmbient) {
            try {
                // Create next ambient sound
                this.nextAmbient = this.sounds.ambient.cloneNode();
                this.nextAmbient.volume = 0; // Start silent
                this.nextAmbient.preload = 'auto';
                
                // Start playing the next sound
                this.nextAmbient.play().catch(e => {
                    console.warn('Could not play crossfade ambient sound:', e);
                });
                
                // Crossfade: fade out current, fade in next
                const fadeInterval = setInterval(() => {
                    if (this.currentAmbient && this.nextAmbient) {
                        // Fade out current
                        this.currentAmbient.volume = Math.max(0, this.currentAmbient.volume - 0.05);
                        // Fade in next
                        this.nextAmbient.volume = Math.min(this.ambientVolume * this.volume, this.nextAmbient.volume + 0.05);
                        
                        // When crossfade complete
                        if (this.currentAmbient.volume <= 0 && this.nextAmbient.volume >= this.ambientVolume * this.volume) {
                            clearInterval(fadeInterval);
                            // Switch to next sound
                            if (this.currentAmbient) {
                                this.currentAmbient.pause();
                            }
                            this.currentAmbient = this.nextAmbient;
                            this.nextAmbient = null;
                            this.crossfadeStarted = false;
                            
                            // Setup next crossfade
                            this.currentAmbient.addEventListener('timeupdate', () => {
                                if (this.currentAmbient) {
                                    const timeLeft = this.currentAmbient.duration - this.currentAmbient.currentTime;
                                    if (timeLeft <= 2 && timeLeft > 0 && !this.crossfadeStarted) {
                                        this.crossfadeStarted = true;
                                        this.startAmbientCrossfade();
                                    }
                                }
                            });
                        }
                    } else {
                        clearInterval(fadeInterval);
                    }
                }, 100); // Crossfade every 100ms
            } catch (error) {
                console.warn('Error starting ambient crossfade:', error);
            }
        }
    },
    
    // Schedule random wind sounds (only during gameplay)
    scheduleWindSounds() {
        const playWind = () => {
            // Only play wind if game is in playing state and not paused
            if (window.GameState && window.GameState.getGame) {
                const game = window.GameState.getGame();
                const isPaused = window.Game && window.Game.isPaused;
                
                if (game.state === 'playing' && !isPaused && !game.deathScreen && !game.gameOver && !game.victory) {
                    if (Math.random() < 0.1) { // 10% chance
                        const windSounds = ['wind1', 'wind2'];
                        const randomWind = windSounds[Math.floor(Math.random() * windSounds.length)];
                        this.playSFX(randomWind, 0.2);
                    }
                }
            }
            
            // Schedule next wind check (15-45 seconds)
            setTimeout(playWind, 15000 + Math.random() * 30000);
        };
        
        // Start first wind sound after 10-30 seconds
        setTimeout(playWind, 10000 + Math.random() * 20000);
    },
    
    
    // Set master volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update current ambient sound volume
        if (this.currentAmbient) {
            this.currentAmbient.volume = this.ambientVolume * this.volume;
        }
    },
    
    // Pause all sounds (for menus)
    pauseAll() {
        if (this.currentAmbient) {
            this.currentAmbient.pause();
        }
        if (this.nextAmbient) {
            this.nextAmbient.pause();
        }
        this.isPaused = true;
    },
    
    // Resume all sounds (when returning to game)
    resumeAll() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        
        // If sounds were playing, resume them
        if (this.currentAmbient) {
            this.currentAmbient.play().catch(e => {
                console.warn('Could not resume ambient sound:', e);
            });
        }
        
        if (this.nextAmbient) {
            this.nextAmbient.play().catch(e => {
                console.warn('Could not resume crossfade ambient sound:', e);
            });
        }
    },
    
    // Stop all sounds completely
    stopAll() {
        if (this.currentAmbient) {
            this.currentAmbient.pause();
            this.currentAmbient = null;
        }
        if (this.nextAmbient) {
            this.nextAmbient.pause();
            this.nextAmbient = null;
        }
        this.crossfadeStarted = false;
        this.isPaused = false;
    },
    
    // Handle user interaction to enable audio (browsers require user gesture)
    handleUserInteraction() {
        if (!this.initialized) {
            this.init();
        }
        
        // Start ambient sounds on first interaction if not already playing
        if (!this.currentAmbient && this.initialized) {
            this.startAmbientSounds();
        }
    }
};

// Make globally accessible
window.SoundManager = SoundManager;