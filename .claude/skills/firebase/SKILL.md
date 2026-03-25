---
name: firebase
description: Diagnose and fix Firebase issues (CSP, auth, Firestore, API keys, leaderboard). Use when encountering Firebase errors, configuring CSP headers, or troubleshooting authentication/database connectivity.
argument-hint: [describe the error or what you want to configure]
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, WebFetch
---

# Firebase Troubleshooting & Configuration Skill

Use this skill to diagnose Firebase errors, configure CSP headers, fix authentication issues, and manage Firestore connectivity for this project.

## Project-Specific Context

- **Firebase project:** `maze-game-html-184c8`
- **Auth method:** Anonymous authentication (`signInAnonymously`)
- **Database:** Cloud Firestore (collection: `leaderboard`)
- **Hosting:** GitHub Pages at `albader94.github.io`
- **SDK:** Firebase compat (namespaced) loaded via CDN `<script>` tags — no build step
- **Config location:** `src/js/leaderboard.js` (lines 1-11)
- **CSP meta tag:** `public/index.html` (line 16)
- **Service worker cache:** `public/sw.js` (line 1, `CACHE_NAME`)
- **Console log suppression:** `public/index.html` (lines 64-76) — `console.log`/`warn`/`debug`/`info` are nooped in production; only `console.error` works

## Diagnostic Steps

When the user reports a Firebase error, follow this order:

### 1. Identify the error type

| Error pattern | Category | Jump to |
|---|---|---|
| `Refused to load ... script-src` | CSP | Section: CSP Configuration |
| `Refused to load ... frame-src` | CSP | Section: CSP Configuration |
| `Refused to connect ... connect-src` | CSP | Section: CSP Configuration |
| `Refused to execute ... unsafe-inline` | CSP | Section: CSP Configuration |
| `API_KEY_HTTP_REFERRER_BLOCKED` / 403 | API Key | Section: API Key Restrictions |
| `auth/unauthorized-domain` | OAuth | Section: Authorized Domains |
| `auth/operation-not-allowed` | Auth config | Enable anonymous auth in Firebase Console |
| `auth/network-request-failed` | Network/CSP | Check CSP connect-src and ad blockers |
| `PERMISSION_DENIED` on Firestore | Rules | Section: Firestore Security Rules |
| Leaderboard silently disabled | Config | Check for `YOUR_API_KEY` placeholder in config |
| Changes not taking effect | Caching | Section: Service Worker Cache |
| No console output visible | Logging | Section: Console Log Suppression |

### 2. Read the current state

Before making changes, always read these files first:
- `public/index.html` (CSP meta tag, line ~16)
- `src/js/leaderboard.js` (Firebase config, lines 1-11)
- `public/sw.js` (cache version, line 1)

### 3. Apply the fix (see sections below)

### 4. Bump the service worker cache version

**CRITICAL:** After ANY change to `public/index.html` or Firebase-related files, bump the `CACHE_NAME` version in `public/sw.js`. Without this, the service worker serves stale cached files and fixes won't reach users.

```javascript
// public/sw.js line 1
const CACHE_NAME = 'buried-spire-vX.Y.Z'; // Increment version
```

## CSP Configuration

The Content Security Policy meta tag in `public/index.html` must include all Firebase domains. Here is the complete required CSP:

### script-src
```
'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com
```
- `www.gstatic.com` — Firebase SDK CDN
- `apis.google.com` — Google API client (gapi)
- `'unsafe-inline'` — Required by Firebase auth for injected scripts

### connect-src
```
https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com wss://firestore.googleapis.com
```
- `firestore.googleapis.com` — Firestore REST + WebSocket
- `identitytoolkit.googleapis.com` — Firebase Auth sign-in
- `securetoken.googleapis.com` — Firebase Auth token refresh
- `www.googleapis.com` — General Google APIs

### frame-src
```
https://apis.google.com https://*.firebaseauth.com https://*.firebaseapp.com
```
- `apis.google.com` — Google sign-in iframe
- `*.firebaseauth.com` — Firebase Auth handler
- `*.firebaseapp.com` — Firebase Auth redirect handler (e.g., `maze-game-html-184c8.firebaseapp.com`)

### Full CSP template
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com; connect-src https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com wss://firestore.googleapis.com; frame-src https://apis.google.com https://*.firebaseauth.com https://*.firebaseapp.com; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self';">
```

## API Key Restrictions

If you see `API_KEY_HTTP_REFERRER_BLOCKED` (403), the API key's HTTP referrer restrictions in Google Cloud Console need updating.

**Required referrers:**
- `https://albader94.github.io/*` (production)
- `https://maze-game-html-184c8.firebaseapp.com/*` (Firebase auth iframe)
- `http://localhost:*/*` (development)

**Required API allowlist on the key:**
- Identity Toolkit API
- Token Service API
- Cloud Firestore API

**Console path:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials) > project `maze-game-html-184c8` > API key > Application restrictions

## Authorized Domains

If you see `auth/unauthorized-domain`, add the domain in Firebase Console:

**Path:** [Firebase Console](https://console.firebase.google.com) > `maze-game-html-184c8` > Authentication > Settings > Authorized Domains

**Required domains:**
- `localhost` (default)
- `albader94.github.io` (production)
- `maze-game-html-184c8.firebaseapp.com` (auto-added)

## Firestore Security Rules

Current rules enforce:
- Authenticated users only (`request.auth != null`)
- Write-only-increase on `deepestFloor` (prevents score tampering)
- UID enforcement (users can only write their own document)
- Field validation on write

If `PERMISSION_DENIED` on reads/writes, check rules in Firebase Console > Firestore > Rules.

Reference for the rules deployed to this project is in `README.md`.

## Service Worker Cache

The service worker (`public/sw.js`) caches all game files including `index.html`. After changing ANY file, bump the cache version:

1. Read `public/sw.js` line 1
2. Increment the version string in `CACHE_NAME`
3. This forces browsers to re-download all cached files on next visit

**Users may need to hard-refresh (Cmd+Shift+R) or clear site data if the old SW is still active.**

## Console Log Suppression

`public/index.html` (lines 64-76) suppresses `console.log`, `console.warn`, `console.debug`, and `console.info` in production (any host that isn't `localhost` / `127.0.0.1`). Only `console.error` works.

This means Firebase success logs (like "Initialized successfully") are invisible in production. When debugging Firebase issues in production, either:
- Temporarily remove the suppression block
- Use `console.error` for critical debug output
- Check for the absence of `console.error` messages (no errors = likely working)

## Firebase Documentation Reference

| Topic | URL |
|---|---|
| Web Setup | https://firebase.google.com/docs/web/setup |
| CDN/Script Setup | https://firebase.google.com/docs/web/alt-setup |
| Anonymous Auth | https://firebase.google.com/docs/auth/web/anonymous-auth |
| Auth Getting Started | https://firebase.google.com/docs/auth/web/start |
| Firestore Rules | https://firebase.google.com/docs/firestore/security/get-started |
| Rules Conditions | https://firebase.google.com/docs/firestore/security/rules-conditions |
| Fix Insecure Rules | https://firebase.google.com/docs/firestore/security/insecure-rules |
| API Keys | https://firebase.google.com/docs/projects/api-keys |
| CSP Reference | https://firebase.google.com/docs/auth/web/chrome-extension |
| Security Checklist | https://firebase.google.com/support/guides/security-checklist |
| Launch Checklist | https://firebase.google.com/support/guides/launch-checklist |
| Redirect Best Practices | https://firebase.google.com/docs/auth/web/redirect-best-practices |
| JS SDK Best Practices | https://firebase.google.com/docs/web/best-practices |
| Firestore Error Codes | https://firebase.google.com/docs/firestore/enterprise/understand-error-codes |
| Auth Error Codes | https://firebase.google.com/docs/auth/admin/errors |
