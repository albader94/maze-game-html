---
name: sw-hygiene
description: Audit and fix service worker cache manifest drift. Use when adding/removing JS/CSS files, before deployment, or when offline mode breaks.
argument-hint: [fix]
allowed-tools: Read, Edit, Grep, Glob, Bash
user-invocable: true
---

# Service Worker Cache Hygiene Skill

Detect and fix drift between the service worker cache manifest (`urlsToCache` in `sw.js`) and the resources actually referenced by `index.html`.

## Purpose

The service worker caches files listed in `urlsToCache` so the game works offline. When JS/CSS files are added or removed from `index.html` but the cache manifest isn't updated, the game breaks offline. This skill audits the two files, reports mismatches by severity, and optionally fixes them.

## Variables

| Variable | Default | Description |
|---|---|---|
| `SW_PATH` | `public/sw.js` | Path to the service worker file (relative to repo root) |
| `HTML_PATH` | `public/index.html` | Path to the HTML file (relative to repo root) |

## Instructions

### When to use

- After adding or removing any `<script>`, `<link>`, or icon reference in `index.html`
- Before deployment or pushing to production
- When offline mode stops working or reports missing assets
- As a pre-push sanity check

### What it checks

The skill compares two sets of local resource paths:

1. **SW cache entries** — all paths in the `urlsToCache` array in `public/sw.js`
2. **HTML resource references** — all local resource paths extracted from `public/index.html`:
   - `<script src="...">` (excluding external CDN URLs starting with `https://`)
   - `<link rel="stylesheet" href="...">`
   - `<link rel="manifest" href="...">`
   - `<link rel="icon" href="...">`
   - `<link rel="apple-touch-icon" href="...">`

External resources (CDN scripts like Firebase SDK) are excluded — they cannot be cached by the service worker.

## Workflow

Follow these steps in order:

### Step 1: Extract SW cache entries

Read `public/sw.js` and extract every string in the `urlsToCache` array. Normalize each path relative to `public/` by:
- `./foo` becomes `foo` (same directory as sw.js, which is in public/)
- `../src/js/bar.js` becomes `src/js/bar.js` (up one level from public/)

Store as the **SW set**.

### Step 2: Extract HTML resource references

Read `public/index.html` and extract all local resource paths from:
- `<script src="X">` where X does NOT start with `https://`
- `<link rel="stylesheet" href="X">`
- `<link rel="manifest" href="X">`
- `<link rel="icon" href="X">`
- `<link rel="apple-touch-icon" href="X">`

Normalize each path relative to `public/` using the same rules as Step 1:
- `./manifest.json` becomes `manifest.json`
- `../src/js/config.js` becomes `src/js/config.js`
- `./favicon-32x32.png` becomes `favicon-32x32.png`

Store as the **HTML set**.

### Step 3: Check files on disk

For every path in the union of both sets, check whether the file actually exists at the expected location on disk (resolved from the repo root).

### Step 4: Compare and classify

| Finding | Severity | Meaning |
|---|---|---|
| In HTML set but NOT in SW set | **HIGH** | File is loaded by the page but won't be available offline |
| In SW set but NOT in HTML set | **LOW** | File is cached but not referenced — wastes cache space |
| In either set but NOT on disk | **CRITICAL** | Reference points to a file that doesn't exist |

### Step 5: Fix (if `fix` argument provided)

If the user invoked `/sw-hygiene fix`:

1. **Add missing entries:** For each HIGH finding, add the path to the `urlsToCache` array in `public/sw.js` using the correct relative format (`./` for files in public/, `../` for files outside public/).
2. **Remove orphaned entries:** For each LOW finding, remove the entry from `urlsToCache`.
3. **Bump CACHE_NAME:** Increment the patch version in the `CACHE_NAME` string (e.g., `buried-spire-v2.3.0` becomes `buried-spire-v2.3.1`).
4. **Report CRITICAL findings:** Do NOT auto-fix CRITICAL issues — report them for the user to resolve manually (the file needs to be created or the reference removed from HTML).

If the user did NOT pass `fix`, only report findings — do not modify any files.

### Step 6: Report

Output a summary in this format:

```
## SW Hygiene Report

**SW file:** public/sw.js (CACHE_NAME: buried-spire-vX.Y.Z)
**HTML file:** public/index.html

### Findings

| Severity | Path | Issue |
|---|---|---|
| CRITICAL | path/to/file | Referenced but file not found on disk |
| HIGH | path/to/file | In index.html but missing from urlsToCache |
| LOW | path/to/file | In urlsToCache but not referenced by index.html |

### Summary
- X CRITICAL, Y HIGH, Z LOW issues found
- [If fix was applied] Fixed: added N entries, removed M entries, bumped cache to vX.Y.Z
- [If fix was NOT applied] Run `/sw-hygiene fix` to auto-fix HIGH and LOW issues

### Current urlsToCache (N entries)
[List all entries currently in the array]
```

If there are no findings, report:

```
## SW Hygiene Report

All clear — urlsToCache is in sync with index.html. No action needed.
```

## Examples

### Audit only (no changes)
User: `/sw-hygiene`
Action: Run Steps 1-4, then report findings. Do not modify files.

### Audit and fix
User: `/sw-hygiene fix`
Action: Run Steps 1-5, modify `sw.js`, then report what changed.

## Notes

- The `index.html` file is inside `public/`. The `sw.js` file is also inside `public/`. Resources in `src/` are referenced as `../src/` from both files.
- Always preserve the existing order of entries in `urlsToCache` when adding new ones. Append new entries at the end, before the closing `]`.
- When bumping CACHE_NAME, only bump the patch version (last number). Major/minor bumps are reserved for release workflow.
- External CDN scripts (e.g., Firebase SDK from `gstatic.com`) must NEVER be added to `urlsToCache` — they are cross-origin and cannot be cached by the service worker.
