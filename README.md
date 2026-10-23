# 3D Tesseract Go

A mobile-first, browser-based 3D cube Go game with a translucent neon blue cube, luminous stones, and entirely local computer opponents.

**Play:** https://Nathan-Culver.github.io/3D-Tesseract-Go/

## Play and controls

Drag to orbit, shift-drag/right-drag to pan, and scroll or pinch to zoom. Select X, Y, or Z slices to reach interior intersections. Switch to **2D layer** for a flat view. Tap a point or use the precise X/Y/Z coordinates, draft a connected Omino shape, then choose **Place turn**. Nothing is committed until confirmed.

- Board sizes: 9³, 13³, 17³, and 19³.
- Easy, Normal, and Hard AI run in a browser worker; no AI servers, keys, or dependencies.
- Two-player pass-and-play, up to eight local FFA players, and Rengo teams with interleaved or team-block scheduling.
- Omino, Borderless, Ghost, Obstacle, and Tier Stones enabled by default. Diagonals default to all 26 neighbors; disable for six face neighbors.
- Optional First Capture, Stoical, and Coin Go, including dime-style or silver pieces.
- Counting, Territory, Capture Only, and Stones Only scoring; configurable komi when Omino is off.
- Untimed, fixed total time, increment, or overtime periods; freely placed handicap stones per player/seat.
- Undo, replay, hints, score estimates, and dead-group review.
- Black, white, pink, grey, and brown board backgrounds.

The **How to play** panel explains all rules, including explicit adaptations for combined variants, Tier support/capture, 3D territory, and team scheduling. These are custom cube rules; the game does not claim certification under a national 2D Go ruleset. UI layout is inspired by [Online Go 3D](https://online-go3d.com/gogame.html); code, geometry renderer, and game rules are independently implemented. The renderer projects and depth-sorts 3D geometry using the browser canvas; it does not require WebGL.

## Offline and saves

Open the hosted game once and wait for **Ready for offline play**. The service worker caches the interface, renderer, rules, and AI for later offline visits. Local AI and pass-and-play work without a connection. Browser storage must be enabled.

- **Automatic checkpoints:** latest completed turn, ten turns earlier, and twenty turns earlier. Stored separately in IndexedDB; earlier slots remain empty until enough turns exist.
- **One manual browser slot:** localStorage.
- **Ten numbered device slots:** export `.tgo` JSON game files to your device and import them with a file picker. Imported/exported slot copies use IndexedDB.
- Save files preserve variants, opening handicap position, turn order, clocks, move history, captures, and repetition prevention.

Local clocks pause when the page is hidden, a dialog is open, or the user pauses. A completed Omino turn earns one increment. Offline/local games are not intended to provide tamper-resistant competitive timing.

Clearing browser data deletes browser saves. Export files for durable backups. Different sites on the same GitHub Pages origin share the browser's localStorage quota; keys and database names are namespaced for this game.

## Run locally

Requires Node.js 20 or later. No package installation or build step is needed.

```sh
node serve.mjs
```

Open the printed local URL. For a separate, self-contained HTML edition:

```sh
node scripts/portable.mjs
```

This writes `../3D-Tesseract-Go.html`, with renderer, rules, AI, and styles embedded. Open it directly in a modern browser. File-origin save/worker support varies by browser; the hosted edition is recommended for mobile installation and predictable storage.

## Verify

```sh
node scripts/check.mjs
node --test tests/*.test.mjs
```

Tests cover adjacency, wrapping, captures, suicide, Omino limits, Ghost/Obstacle/Tier interactions, First Capture, Stoical, repetition, team turns, handicap setup, scoring, save validation, and legal AI turns.

## GitHub Pages

The root contains directly hostable static files and `.nojekyll`. GitHub Pages can deploy **main / (root)** without a build. An optional `.github/workflows/pages.yml` also validates the code and deploys the static files when Pages uses GitHub Actions.

## Scope and limits

Online multiplayer is deliberately deferred. FFA and Rengo currently mean local same-device play. AI strength is heuristic search, with extra opponent-response search on Hard, rather than a trained professional Go engine. Its performance depends on board complexity and device speed. Hard can take several seconds; Pause stops its worker.

Undo checkpoints retain the last 21 in-memory positions. Full replay uses the saved move history. Clocks in historical replay are not reconstructed per move. Resignation or timeout ends the current local session; FFA elimination-with-continuation is not implemented.
