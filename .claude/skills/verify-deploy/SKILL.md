---
name: verify-deploy
description: Verify that the live GitHub Pages deployment matches local files. Use after git push or when the live site seems stale or broken.
argument-hint: [url]
allowed-tools: Read, Bash, Grep, WebFetch
user-invocable: true
---

# Deployment Verification Skill

Use this skill to verify that the live GitHub Pages site matches the local codebase. Run after pushing changes or when the live site appears stale or broken.

## Purpose

Compare the live deployment at `albader94.github.io/maze-game-html` against local files to detect version mismatches, missing resources, CSP drift, and failed deployments. Produces a clear status: CURRENT, STALE, or BROKEN.

## Variables

| Variable | Default | Source |
|---|---|---|
| `LIVE_URL` | `https://albader94.github.io/maze-game-html/public/` | User argument or default |
| `LOCAL_SW` | `public/sw.js` | Local service worker file |
| `LOCAL_INDEX` | `public/index.html` | Local index.html file |
| `OWNER` | `albader94` | GitHub repository owner |
| `REPO` | `maze-game-html` | GitHub repository name |
| `CACHE_PREFIX` | `buried-spire-v` | CACHE_NAME version prefix in sw.js |

If the user provides a URL argument, use it as `LIVE_URL` instead of the default.

## Instructions

- Always read local files before fetching live files so you have a baseline to compare against.
- Use `WebFetch` for all live URL checks. Do not use `curl` or `wget`.
- Use `gh api` for GitHub Pages deployment status queries.
- Report exact version strings when comparing CACHE_NAME values.
- Do not modify any files. This skill is read-only / diagnostic.
- Console logs are suppressed in production (only `console.error` works), so the absence of console output is normal.

## Workflow

### Step 1: Read local expected state

1. Read `public/sw.js` line 1 to extract the local `CACHE_NAME` value (format: `buried-spire-vX.Y.Z`).
2. Read `public/index.html` line ~16 to extract the local CSP meta tag content.
3. Note the expected version string from `CACHE_NAME`.

### Step 2: Check live site availability

1. WebFetch the live base URL (`LIVE_URL`). Expect HTTP 200.
2. If the fetch fails or returns non-200, mark status as **BROKEN** and skip to Step 7.

### Step 3: Compare service worker versions

1. WebFetch `{LIVE_URL}sw.js` (the live service worker).
2. Extract the `CACHE_NAME` value from the first line.
3. Compare to the local `CACHE_NAME`:
   - **Match** — versions are in sync.
   - **Mismatch** — deployment is **STALE**. Note both versions.
   - **Missing/404** — mark as **BROKEN**.

### Step 4: Compare CSP meta tags

1. WebFetch `{LIVE_URL}index.html` (the live index page).
2. Extract the `Content-Security-Policy` meta tag content.
3. Compare to the local CSP:
   - **Match** — CSP is in sync.
   - **Mismatch** — note the differences (added/removed directives or domains).
   - **Missing** — flag as a security concern.

### Step 5: Spot-check JS file accessibility

Fetch 2-3 key JS files to confirm they are accessible (HTTP 200):
- `{LIVE_URL}../src/js/config.js`
- `{LIVE_URL}../src/js/gameLogic.js`
- `{LIVE_URL}../src/js/entities.js`

A 404 on any of these indicates a broken deployment or missing files.

### Step 6: Check GitHub Pages deployment status

Run these commands via Bash:

```bash
gh api repos/{OWNER}/{REPO}/pages
```
Check the `status` field (should be `built`).

```bash
gh api repos/{OWNER}/{REPO}/pages/builds --jq '.[0]'
```
Check the most recent build's `status` (should be `built`) and `created_at` timestamp.

### Step 7: Diagnose overall status

Based on the checks above, assign one of three statuses:

| Status | Condition |
|---|---|
| **CURRENT** | SW version matches, CSP matches, all files accessible, Pages build is `built` |
| **STALE** | SW version mismatch (local is newer than live), but site is otherwise accessible |
| **BROKEN** | Live site returns 404, key JS files missing, or Pages build failed |

## Examples

### User: `/verify-deploy`
Use the default URL `https://albader94.github.io/maze-game-html/public/` and run the full workflow.

### User: `/verify-deploy https://staging.example.com/game/`
Use the provided URL as `LIVE_URL` and run the full workflow.

### User: `/verify-deploy` (after a push)
Typical post-push check. If STALE, advise waiting a few minutes for GitHub Pages to rebuild, then re-running.

## Report

Present findings in this format:

```
## Deployment Verification Report

**Status:** CURRENT | STALE | BROKEN
**Checked at:** {timestamp}

### Version Comparison
| | Local | Live |
|---|---|---|
| CACHE_NAME | buried-spire-vX.Y.Z | buried-spire-vX.Y.Z |

### CSP Meta Tag
- Match: Yes / No
- Differences: {list any differences, or "None"}

### File Accessibility
| File | Status |
|---|---|
| index.html | 200 |
| sw.js | 200 |
| config.js | 200 |
| gameLogic.js | 200 |
| entities.js | 200 |

### GitHub Pages Build
- Status: {built / errored / queued}
- Last build: {timestamp}
- Commit: {sha}

### Next Steps
{Actionable recommendations based on status:}
- CURRENT: "Deployment is up to date. No action needed."
- STALE: "GitHub Pages has not yet picked up the latest push. Wait 2-5 minutes and re-run `/verify-deploy`. If still stale, check the Pages build log at https://github.com/{OWNER}/{REPO}/settings/pages."
- BROKEN: "Deployment is broken. {Specific diagnosis — e.g., 'sw.js returned 404, check that the file exists in the repo and the Pages source branch is correct.'}"
```
