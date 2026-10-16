# Orbit Run — built by Shoyemi Maria

Orbit Run is a browser-based 3D endless runner built by Shoyemi Maria with Three.js and Start.ng integration. Switch between three lanes, collect cyan energy orbs (+10), dodge red hazards, and chase your personal best. The game supports keyboard and touch controls, pause/restart, Start.ng player identity and character styling, score submission, and the shared leaderboard.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

## Build and verify

```bash
npm run build
npm run preview
```

Vite outputs a static build to `dist/`. Asset URLs are relative so the build can be hosted from a subpath. If `cover.png` exists in the project root, the build copies it to `dist/cover.png`.

## Start.ng integration

- Requests `startng:whoami` through the documented hidden `https://start.ng/connect` iframe.
- Checks message origin, source window, reply type, and request ID.
- Uses the returned `user` or `guest`, including `face` for the profile avatar and `style` for the Three.js runner.
- Provides a sign-in link for guests and refreshes identity when the page regains focus.
- Sends signed-in scores and reads the shared leaderboard.
- Declares the `score` leaderboard statistic in `startng.json`.

The Start.ng identity protocol must be verified on the published `*.start.ng` game URL; a localhost preview cannot prove account identity works.

## Publishing checklist

Start.ng serves static files and does not run the Vite build. Commit the built `dist/` output, including `dist/cover.png`, and publish that static directory according to the Start.ng dashboard/docs.

1. Confirm `cover.png` is in the project root and is under 2 MB, at least 640×400, ideally 16:10.
2. Run `npm run build` and confirm `dist/index.html`, `dist/assets/`, and `dist/cover.png` exist.
3. Verify the built HTML uses relative paths (for example, `./assets/...`, not `/assets/...`).
4. Run the Start.ng check endpoint with `{ "repo_url": "https://github.com/Mariahnikee/orbit-run", "name": "orbit-run" }`, resolve reported errors/warnings, then publish.
5. Test on the live Start.ng URL signed in and as a guest. Confirm the profile face, character style, sign-in action, and score submission.

## Controls

- Left/right arrows or A/D: move lanes.
- Space or Escape: pause/resume, or start from the title screen.
- Touch: swipe left/right or use the on-screen arrows.
