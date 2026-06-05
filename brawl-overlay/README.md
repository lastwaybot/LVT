# Brawl Stars Broadcast Overlay System

---

## ⚡ QUICK START (For Testing)

### Step 1 — Install Node.js (one time only)
Download and install from: **https://nodejs.org/** *(choose LTS version)*

### Step 2 — Download the project
Clone or download from GitHub:
```
https://github.com/lastwaybot/LVT
```

### Step 3 — Start the server
Open the `brawl-overlay` folder and **double-click `START.bat`**

> ✅ The control panel will open automatically in your browser at `http://localhost:8080`

### Step 4 — Open the Overlay
In a new browser tab, open:
```
http://localhost:8080/overlay/overlay.html
```

> ⚠️ **Important:** Always use `http://localhost:8080/...` URLs — never open the `.html` files directly

---

## 🎮 How to Use the Control Panel

| Section | What it does |
|---------|-------------|
| **API Configuration** | Enter Bounty ID + Match ID → click LOAD FROM API |
| **🌐 API BANS** | Auto-filled from Matcherino when you load from API |
| **✋ Manual BANS** | Click the `+` slots to manually assign bans |
| **Players** | Edit names, upload portraits, set brawler picks |
| **Series Score** | +/- buttons to adjust match score |
| **Draft Phase** | Switch between BAN → PICK → LIVE phases |
| **Draft Timer** | Set seconds, START/PAUSE/NEXT TURN |
| **Overlay Visibility** | SHOW / HIDE the overlay during broadcast |

---

## 📺 Ban Slots Explained

Each team has **5 ban slots** on the overlay:
- **Slots 1-2-3** → Auto-filled from the Matcherino API (read-only in control panel)
- **Slots 4-5** → Manual bans — click the `+` boxes in the control panel

---

## 🔗 Finding Your IDs

**Bounty ID & Match ID** — from the Matcherino tournament page:
1. Open your match on Matcherino
2. Press `F12` → Network tab → Reload the page
3. Look for requests containing `bounties?id=XXXXX` or `brackets/match?matchId=XXXXX`
4. Those numbers are your IDs

---

## 📁 Project Structure
```
brawl-overlay/
├── START.bat              ← Double-click this to start!
├── server.js              ← Local server (runs in background)
├── control/
│   ├── control.html       ← Control panel (open on 2nd monitor)
│   ├── control.js
│   └── control.css
├── overlay/
│   ├── overlay.html       ← Overlay (add to vMix/OBS)
│   ├── overlay.js
│   └── overlay.css
└── {overlay,control,assets}/
    └── Brawlers_Portrait/ ← Brawler images
```

---

## 📺 vMix / OBS Setup

**vMix:**
1. Add Input → Web Browser → `http://localhost:8080/overlay/overlay.html`
2. Set: **1920 × 1080**, enable **Transparent Background**
3. Layer it over your camera feeds

**OBS:**
1. Add Source → Browser → URL: `http://localhost:8080/overlay/overlay.html`
2. Width: **1920**, Height: **1080**
3. Check ✅ **Shutdown source when not visible**

---

## ⚠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Control panel not opening | Make sure `START.bat` is running (keep the terminal window open) |
| CORS errors | You opened the file directly — always use `http://localhost:8080/` |
| Bans not showing | Click **LOAD FROM API** first, then **PUSH ALL TO OVERLAY** |
| API not loading | Check your Bounty ID and Match ID are correct |
| Port 8080 in use | Close other apps using port 8080, or restart your PC |
