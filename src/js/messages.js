// Game Messages and Story Content
const MESSAGES = {
    STORY: {
        INTRO: "The ancient Burj Mubarak lies buried beneath the sands of Kuwait. Your light is your lifeline in these cursed depths.",
        PHASE_ACTIVATED: "Purple energy flows through you - walls cannot stop you now!",
        REGENERATION_ACTIVATED: "Green light pulses within you - your energy slowly returns!",
        REVEAL_ACTIVATED: "White light illuminates your mind - the path ahead is clear!",
        LIFELINE_USED: "The red orb's power courses through you - death is held at bay!",
        LIFELINE_AUTO: "The red orb automatically saves you from the darkness!",
        PHASE_ENDING: "The purple energy fades - you phase back to safety!",
        DARKNESS_CONSUMES: "The darkness closes in... the ghouls are coming for you!",
        INVENTORY_FULL: "Your hands are full - you cannot carry more orbs!",
        RESPAWN: "You awaken at the checkpoint, haunted by whispers of the deep...",
        VICTORY: "You have found the Pearl of Kuwait! The curse is broken!"
    },
    
    FLOOR: {
        PROGRESS: (floor) => `Floor ${-floor}: The darkness grows thicker as you descend...`,
        CHECKPOINT: (floor) => `CHECKPOINT Floor ${-floor}: Your progress is saved in the ancient stones.`,
        DEEP: (floor) => `Floor ${-floor}: The very air seems to whisper ancient secrets...`,
        FINAL: "Floor -50: The Pearl of Kuwait awaits in the deepest chamber!"
    },
    
    TUTORIAL: {
        MOVEMENT: "Use WASD or Arrow Keys to move through the buried halls.",
        LIGHT: "Your light is precious - it slowly fades as you explore.",
        ORBS: "Collect orbs to restore light and gain powerful abilities.",
        GHOULS: "Avoid the ghouls - they drain your light and fear your radiance.",
        STAIRS: "Find the stairs (▼) to descend deeper into the spire.",
        INVENTORY: "Press 1, 2, or 3 to use orbs from your inventory."
    },
    
    DEATH: {
        LIGHT_DEPLETED: "Your light has been extinguished...",
        SWARM_BEGINS: "The ghouls emerge from the darkness!",
        CONSUMED: "The shadows have claimed another soul...",
        CHECKPOINT_LOST: "You have lost progress since your last checkpoint."
    },
    
    ORBS: {
        COLLECTED: {
            COMMON: "A blue orb's gentle light restores your energy.",
            GOLDEN: "A golden orb blazes with restorative power!",
            PURPLE: "A purple orb hums with phase energy...",
            GREEN: "A green orb pulses with regenerative force!",
            WHITE: "A white orb reveals the hidden paths!",
            RED: "A red orb binds itself to your soul - a lifeline in the dark!",
            WISP: "A wisp of your former self grants you light..."
        }
    },
    
    UI: {
        LOADING: "Descending into the buried spire...",
        PAUSED: "Game Paused - The darkness waits...",
        HELP_PROMPT: "Press H for help",
        MENU_RETURN: "Press ESC to return to menu"
    },
    
    ACHIEVEMENTS: {
        FIRST_DEATH: "First Death: The spire claims its first victim.",
        DEEP_EXPLORER: "Deep Explorer: Reached floor -25.",
        LIGHT_MASTER: "Light Master: Maintained 90%+ light for 10 floors.",
        ORB_COLLECTOR: "Orb Collector: Collected 100 orbs.",
        SURVIVOR: "Survivor: Completed the game without dying.",
        SPEED_RUNNER: "Speed Runner: Completed in under 30 minutes."
    },
    
    LORE: {
        BURJ_MUBARAK: "Once the tallest tower in Kuwait, now buried by time and sand.",
        PEARL_OF_KUWAIT: "A legendary gem said to hold the power of the desert winds.",
        GHOULS: "Cursed spirits that fled the light when the tower fell.",
        LIGHT_ORBS: "Remnants of the tower's former glory, still holding traces of sunlight.",
        EXPLORER_MODE: "A safer path for those who dare to explore the depths gradually."
    }
};

// Dynamic message generation
const MessageGenerator = {
    // Generate floor-specific messages
    getFloorMessage(floor) {
        if (floor === 1) return MESSAGES.STORY.INTRO;
        if (floor === CONFIG.GAME.MAX_FLOORS) return MESSAGES.FLOOR.FINAL;
        if (floor % CONFIG.GAME.CHECKPOINT_INTERVAL === 0) return MESSAGES.FLOOR.CHECKPOINT(floor);
        if (floor > 30) return MESSAGES.FLOOR.DEEP(floor);
        return MESSAGES.FLOOR.PROGRESS(floor);
    },
    
    // Generate orb collection messages
    getOrbCollectionMessage(orbType) {
        const orbData = ORB_TYPES[orbType];
        if (!orbData) return "You found a mysterious orb...";
        
        if (MESSAGES.ORBS.COLLECTED[orbType.toUpperCase()]) {
            return MESSAGES.ORBS.COLLECTED[orbType.toUpperCase()];
        }
        
        return `You collected a ${orbData.name}!`;
    },
    
    // Generate death messages based on context
    getDeathMessage(cause) {
        switch (cause) {
            case 'light_depleted':
                return MESSAGES.DEATH.LIGHT_DEPLETED;
            case 'swarm':
                return MESSAGES.DEATH.CONSUMED;
            default:
                return MESSAGES.DEATH.CONSUMED;
        }
    },
    
    // Generate tutorial messages
    getTutorialMessage(step) {
        const tutorialSteps = [
            MESSAGES.TUTORIAL.MOVEMENT,
            MESSAGES.TUTORIAL.LIGHT,
            MESSAGES.TUTORIAL.ORBS,
            MESSAGES.TUTORIAL.GHOULS,
            MESSAGES.TUTORIAL.STAIRS,
            MESSAGES.TUTORIAL.INVENTORY
        ];
        
        return tutorialSteps[step % tutorialSteps.length];
    },
    
    // Generate contextual hints
    getHint(game) {
        const hints = [];
        
        if (game.player.light < 30) {
            hints.push("Your light grows dim - seek blue or golden orbs!");
        }
        
        if (game.player.inventory.every(slot => slot === null)) {
            hints.push("Collect power orbs to gain special abilities!");
        }
        
        if (game.ghouls.length > 5) {
            hints.push("Many ghouls roam this floor - be cautious!");
        }
        
        if (game.player.powers.reveal > 0) {
            hints.push("The white orb reveals all - use this knowledge wisely!");
        }
        
        return hints.length > 0 ? hints[Math.floor(Math.random() * hints.length)] : "";
    }
}; 