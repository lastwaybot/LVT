# Brawl Stars Broadcast Overlay System

## Project Structure
```
brawl-overlay/
├── overlay/
│   └── overlay.html        ← The transparent overlay (load into vMix)
├── control/
│   └── control.html        ← Your control panel (open in browser on 2nd monitor)
├── assets/
│   ├── brawlers/           ← (optional) local brawler images
│   ├── teams/              ← (optional) team logos
│   └── players/            ← (optional) player portraits
└── README.md
```

---

## QUICK START (5 minutes)

### Step 1 — Run a Local Web Server
The files MUST be served over HTTP for vMix and BroadcastChannel to work.

**Option A — Python (easiest):**
```bash
cd brawl-overlay
python -m http.server 8080
```

**Option B — Node.js:**
```bash
npx serve brawl-overlay -p 8080
```

Then open:
- Control Panel: `http://localhost:8080/control/control.html`
- Overlay: `http://localhost:8080/overlay/overlay.html`

---

### Step 2 — Add Overlay to vMix

1. Open vMix → **Add Input** → **Web Browser**
2. Set URL: `http://localhost:8080/overlay/overlay.html`
3. Set Width: **1920**, Height: **1080**
4. Check ✅ **Transparent Background**
5. Click **OK**
6. In vMix, right-click the input → **Set as Overlay 1** (or drag to overlay track)
7. Click the **Overlay 1** button to make it live — it will sit on top of your camera feeds

---

### Step 3 — Use the Control Panel

Open `http://localhost:8080/control/control.html` in Chrome on your 2nd monitor.

**To load live data from Matcherino API:**
1. Enter your **Bounty ID** (e.g. `192279`)
2. Enter your **Match ID** (e.g. `180474500`)
3. Click **LOAD FROM API** — team names, logos, players, bans will populate automatically
4. Click **START POLLING** — overlay will auto-update every 5 seconds during the match

**To control manually:**
- Edit team names, upload logos, set player names/portraits
- Click brawler ban slots to assign bans from the brawler picker
- Use +/- buttons to adjust series scores
- Use phase buttons (BAN → PICK → LIVE) to track draft state
- Use SHOW/HIDE OVERLAY buttons during broadcast

---

## API ENDPOINTS USED

| What | Endpoint | When |
|------|----------|------|
| Match info, teams, scores, bans | `/brackets/match?matchId=X` | Poll every 5s |
| Live stats, brawler picks, map | `/games/brawlstars/match/stats?bountyId=X&matchIds=Y` | Poll every 3s |
| Brawler roster | `/games/brawlstars/brawlers` | Cache on load |
| Tournament overview | `/bounties?id=X` | Once on load |
| Full bracket | `/brackets?id=X` | Once on load |

All endpoints are public — **no auth required.**

---

## HOW OVERLAY ↔ CONTROL PANEL COMMUNICATE

They use the **BroadcastChannel API** (`brawl_overlay` channel).
- Both files must be served from the **same origin** (same `localhost:8080`)
- When you click anything in the control panel, it sends a message instantly to the overlay
- If the overlay is open in vMix's built-in browser, use the **"Open Overlay"** button in the control panel to open it in a separate Chrome window and it will receive messages via `window.postMessage`

---

## FINDING YOUR IDs

**Bounty ID:**
- Go to your tournament on Matcherino
- Open DevTools (F12) → Network tab
- Reload — look for request containing `bounties?id=XXXXXX`
- That number is your Bounty ID

**Match ID:**
- Click a match in the bracket
- The URL changes or a network request appears: `brackets/match?matchId=XXXXXX`
- That number is your Match ID

**Bracket ID:**
- Found in the `/bounties?id=X` response under `bracketIds`

---

## IMAGE ASSETS

The overlay supports:
- **Team logos**: Upload via control panel, or paste a CDN URL (Matcherino provides these automatically when loaded via API)
- **Player portraits**: Upload per-player in the control panel
- **Brawler images**: Fetched automatically from Matcherino API — no manual work needed

For local assets, place images in the `assets/` folder and reference them as `../assets/teams/logo.png` in the URL field.

---

## NOTES FOR VMIX

- Set the web browser input to **no border, no scrollbars**
- The overlay is `1920×1080` — use the same resolution in vMix
- The background is fully transparent (`background: transparent`)
- The overlay slides in from the bottom when visible, hides when you click HIDE
- For best results: use vMix 4K or vMix Pro (supports transparent web overlays)
- The overlay animates in/out — control this with the SHOW/HIDE buttons in the panel
