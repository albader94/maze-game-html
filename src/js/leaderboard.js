// Firebase Configuration
// Replace these placeholder values with your actual Firebase project details.
// You can find these in your Firebase Console > Project Settings > General > Your apps.
const firebaseConfig = {
    apiKey: "AIzaSyC51aXH-ZIycyRRXOMZkN0jOGpo2bo8tO4",
    authDomain: "maze-game-html-184c8.firebaseapp.com",
    projectId: "maze-game-html-184c8",
    storageBucket: "maze-game-html-184c8.firebasestorage.app",
    messagingSenderId: "503722963410",
    appId: "1:503722963410:web:6fac53e2a9b8222585580b"
};


// Leaderboard Service
const LeaderboardService = {
    // State
    initialized: false,
    cachedScores: [],
    playerName: null,
    playerUID: null,
    isConfigured: false,
    playerBestFloor: 0,
    playerBestTimeMs: null,
    playerBestDeaths: null,

    // Firebase references (set during init)
    _db: null,
    _auth: null,

    /**
     * Initialize Firebase, sign in anonymously, load player name, and fetch initial scores.
     * If Firebase config has placeholder values, gracefully skip initialization.
     */
    async init() {
        try {
            // Check if Firebase config has been filled in
            if (this._hasPlaceholderConfig()) {
                console.error('LeaderboardService: Firebase config contains placeholder values. Leaderboard disabled.');
                this.isConfigured = false;
                this.initialized = false;
                return;
            }

            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                console.error('LeaderboardService: Firebase SDK not loaded. Check if an ad blocker is blocking gstatic.com.');
                this.isConfigured = false;
                this.initialized = false;
                return;
            }

            // Initialize Firebase app (only once)
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            this._db = firebase.firestore();
            this._db.settings({ experimentalAutoDetectLongPolling: true });
            this._auth = firebase.auth();

            // Sign in anonymously
            const userCredential = await this._auth.signInAnonymously();
            this.playerUID = userCredential.user.uid;
            console.log('LeaderboardService: Signed in anonymously');

            // Load player name from localStorage (re-sanitize on load)
            const savedName = localStorage.getItem('maze_leaderboard_name');
            if (savedName) {
                this.setPlayerName(savedName);
            }

            this.isConfigured = true;
            this.initialized = true;

            // Fetch initial scores
            await this.fetchTopScores();

            console.log('LeaderboardService: Initialized successfully');

        } catch (error) {
            console.error('LeaderboardService: Failed to initialize:', error);
            this.isConfigured = false;
            this.initialized = false;
        }
    },

    /**
     * Check if the Firebase config still has placeholder values.
     */
    _hasPlaceholderConfig() {
        return (
            firebaseConfig.apiKey === "YOUR_API_KEY" ||
            firebaseConfig.projectId === "YOUR_PROJECT_ID" ||
            firebaseConfig.appId === "YOUR_APP_ID"
        );
    },

    /**
     * Fetch the top scores from Firestore, ordered by deepestFloor descending.
     * Updates cachedScores for synchronous access by the renderer.
     */
    async fetchTopScores(limit = 10) {
        if (!this.isReady()) {
            return [];
        }

        try {
            const snapshot = await this._db
                .collection('leaderboard')
                .orderBy('deepestFloor', 'desc')
                .limit(limit)
                .get();

            this.cachedScores = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    name: data.name,
                    deepestFloor: data.deepestFloor,
                    orbsCollected: data.orbsCollected,
                    completionTimeMs: data.completionTimeMs || null,
                    deaths: data.deaths != null ? data.deaths : null,
                    timestamp: data.timestamp,
                    playerUID: data.playerUID
                };
            });

            // Sync player's best stats from cached scores
            const playerScore = this.cachedScores.find(s => s.playerUID === this.playerUID);
            if (playerScore) {
                this.playerBestFloor = playerScore.deepestFloor;
                this.playerBestTimeMs = playerScore.completionTimeMs;
                this.playerBestDeaths = playerScore.deaths;
            }

            // If player's score wasn't in top results, fetch their document directly
            if (this.playerUID && !playerScore) {
                try {
                    const playerDoc = await this._db.collection('leaderboard').doc(this.playerUID).get();
                    if (playerDoc.exists) {
                        const data = playerDoc.data();
                        this.playerBestFloor = data.deepestFloor || 0;
                        this.playerBestTimeMs = data.completionTimeMs || null;
                        this.playerBestDeaths = data.deaths != null ? data.deaths : null;
                    }
                } catch (e) {
                    // Non-critical, just skip
                }
            }

            return this.cachedScores;

        } catch (error) {
            console.error('LeaderboardService: Failed to fetch scores:', error);
            return this.cachedScores;
        }
    },

    /**
     * Return cached scores synchronously. Used by the renderer for display.
     */
    getCachedScores() {
        return this.cachedScores;
    },

    /**
     * Submit the player's score to Firestore.
     * Floors come from the game as negative numbers (e.g., -15 means floor 15).
     * Converts to positive deepestFloor for storage and sorting.
     * Uses the player's anonymous UID as the document ID (one entry per player).
     * Only updates if the new score is deeper than the existing one.
     * @param {number} floor - Current floor (negative number)
     * @param {number} orbsCollected - Total orbs collected
     * @param {object} [extra] - Optional extra fields: { completionTimeMs, deaths }
     */
    async submitScore(floor, orbsCollected, extra) {
        if (!this.isReady()) {
            return;
        }

        if (!this.playerName) {
            console.warn('LeaderboardService: Cannot submit score without a player name.');
            return;
        }

        try {
            // Validate score values
            const deepestFloor = Math.abs(Math.round(Number(floor)));
            if (!Number.isFinite(deepestFloor) || deepestFloor < 0 || deepestFloor > 200) {
                console.warn('LeaderboardService: Invalid floor value:', floor);
                return;
            }
            const validOrbsCollected = Math.max(0, Math.round(Number(orbsCollected)));
            if (!Number.isFinite(validOrbsCollected)) {
                console.warn('LeaderboardService: Invalid orbsCollected value:', orbsCollected);
                return;
            }

            // Skip submission if score is not better than known best
            // Priority: floor (higher is better) > time (lower is better) > deaths (lower is better)
            if (deepestFloor < this.playerBestFloor) {
                console.log('LeaderboardService: Floor not better than current best (' + this.playerBestFloor + '), skipping submission');
                return;
            }
            if (deepestFloor === this.playerBestFloor) {
                const newTimeMs = (extra && extra.completionTimeMs != null) ? Math.round(extra.completionTimeMs) : null;
                const newDeaths = (extra && extra.deaths != null) ? Math.max(0, Math.round(extra.deaths)) : null;
                // Same floor: check if time is faster
                if (newTimeMs != null && this.playerBestTimeMs != null && newTimeMs > this.playerBestTimeMs) {
                    console.log('LeaderboardService: Same floor but slower time, skipping submission');
                    return;
                }
                // Same floor and same/no time: check if deaths are fewer
                if (newTimeMs === this.playerBestTimeMs && newDeaths != null && this.playerBestDeaths != null && newDeaths >= this.playerBestDeaths) {
                    console.log('LeaderboardService: Same floor, same time, deaths not better, skipping submission');
                    return;
                }
            }

            // Build document data
            const docData = {
                name: this.playerName,
                deepestFloor: deepestFloor,
                orbsCollected: validOrbsCollected,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                playerUID: this.playerUID
            };

            // Add optional fields if provided
            if (extra) {
                if (extra.completionTimeMs != null && Number.isFinite(extra.completionTimeMs)) {
                    docData.completionTimeMs = Math.round(extra.completionTimeMs);
                }
                if (extra.deaths != null && Number.isFinite(extra.deaths)) {
                    docData.deaths = Math.max(0, Math.round(extra.deaths));
                }
            }

            // Always attempt to write - Firestore security rules enforce that
            // deepestFloor can only increase, so worse scores are rejected server-side
            const docRef = this._db.collection('leaderboard').doc(this.playerUID);
            await docRef.set(docData, { merge: true });

            this.playerBestFloor = deepestFloor;
            if (docData.completionTimeMs != null) {
                this.playerBestTimeMs = docData.completionTimeMs;
            }
            if (docData.deaths != null) {
                this.playerBestDeaths = docData.deaths;
            }
            console.log('LeaderboardService: Score submitted, floor:', deepestFloor);

            // Re-fetch top scores after submitting
            await this.fetchTopScores();

        } catch (error) {
            console.error('LeaderboardService: Failed to submit score:', error);
        }
    },

    /**
     * Set the player's display name.
     * Returns true on success, false if rejected.
     */
    setPlayerName(name) {
        if (!name || typeof name !== 'string') return false;

        // Sanitize: strip dangerous characters but allow Unicode letters (Arabic, etc.)
        let sanitized = name.trim()
            .replace(/[<>&"'`\/\\{}()\[\]#$%^*=+|~;:!?@,]/g, '')
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim();

        // Strip zero-width and bidirectional control characters
        sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

        // Enforce max length
        sanitized = sanitized.substring(0, 20);

        // Don't accept empty names
        if (sanitized.length === 0) {
            console.warn('LeaderboardService: Name is empty after sanitization');
            return false;
        }

        // Profanity filter with leet-speak normalization
        const lowerName = sanitized.toLowerCase();
        const leetMap = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't'
        };
        const normalized = lowerName.split('').map(c => leetMap[c] || c).join('')
            .replace(/[^a-z]/g, '');

        const profanityList = [
            'fuck', 'shit', 'ass', 'bitch', 'damn', 'dick', 'pussy', 'cock',
            'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut', 'cunt',
            'كس', 'طيز', 'شرموط', 'زب', 'منيك'
        ];

        const hasProfanity = profanityList.some(word => {
            if (/[a-z]/.test(word)) {
                return normalized.includes(word);
            }
            return lowerName.includes(word);
        });

        if (hasProfanity) {
            console.warn('LeaderboardService: Name contains inappropriate content');
            return false;
        }

        this.playerName = sanitized;
        localStorage.setItem('maze_leaderboard_name', sanitized);
        return true;
    },

    /**
     * Get the player's display name.
     */
    getPlayerName() {
        return this.playerName;
    },

    /**
     * Check if the player has set a name.
     */
    hasPlayerName() {
        return this.playerName !== null && this.playerName.length > 0;
    },

    /**
     * Check if a name is already taken by another player.
     * Returns true if taken, false if available.
     */
    async isNameTaken(name) {
        if (!this.isReady() || !name) return false;
        try {
            const snapshot = await this._db.collection('leaderboard')
                .where('name', '==', name)
                .limit(1)
                .get();
            // Name is taken if any document exists with a different UID
            return snapshot.docs.some(doc => doc.id !== this.playerUID);
        } catch (e) {
            // If the check fails, allow the name to avoid blocking the player
            return false;
        }
    },

    /**
     * Check if the leaderboard service is fully ready (initialized and configured).
     */
    isReady() {
        return this.initialized && this.isConfigured;
    }
};

// Make LeaderboardService globally accessible
window.LeaderboardService = LeaderboardService;
