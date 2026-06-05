// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let state = {
  visible: true,
  badgeVisible: true,
  bountyId: null,
  matchId: null,
  matchStatus: 'waiting',
  teamA: { name: 'TEAM A', logo: null, score: 0, players: [], bans: [] },
  teamB: { name: 'TEAM B', logo: null, score: 0, players: [], bans: [] },
  format: 'BO3',
  map: '',
  phase: 'waiting',
  timer: { duration: 30, remaining: 30, running: false, turnIndex: 0, draftComplete: false },
  brawlerCache: {},
  pollInterval: null,
  pollStatsInterval: null
};

let timerInterval = null;
let lastPhase = state.phase;

// Snake draft order: A1 → B1 → B2 → A2 → A3 → B3
const draftTurns = [
  { side: 'a', playerIndex: 0 },  // Turn 1: Team A — Player 1
  { side: 'b', playerIndex: 0 },  // Turn 2: Team B — Player 1
  { side: 'b', playerIndex: 1 },  // Turn 3: Team B — Player 2
  { side: 'a', playerIndex: 1 },  // Turn 4: Team A — Player 2
  { side: 'a', playerIndex: 2 },  // Turn 5: Team A — Player 3
  { side: 'b', playerIndex: 2 }   // Turn 6: Team B — Player 3
];

// ─────────────────────────────────────────────
//  VIEWPORT SCALING
// ─────────────────────────────────────────────
function fitOverlayToViewport() {
  const visual = window.visualViewport;
  const viewportWidth = visual?.width || document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = visual?.height || document.documentElement.clientHeight || window.innerHeight;

  const scaleX = viewportWidth / 1920;
  const scaleY = viewportHeight / 1080;

  const el = document.getElementById('overlay');
  if (el) {
    el.style.transform = `scale(${scaleX}, ${scaleY})`;
    el.style.transformOrigin = 'top left';
  }
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function safeText(value, fallback) {
  const text = (value || fallback || '').toString().trim();
  return text || fallback || '';
}

function getTeam(side) {
  return side === 'a' ? state.teamA : state.teamB;
}

// ─────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────
function render() {
  document.getElementById('overlay').classList.toggle('visible', state.visible);
  document.getElementById('tournament-badge').style.display = state.badgeVisible ? 'grid' : 'none';

  document.getElementById('team-a-name').textContent = safeText(state.teamA.name, 'TEAM A');
  document.getElementById('team-b-name').textContent = safeText(state.teamB.name, 'TEAM B');
  document.getElementById('score-a-num').textContent = state.teamA.score || 0;
  document.getElementById('score-b-num').textContent = state.teamB.score || 0;
  document.getElementById('format-label').textContent = safeText(state.format, 'BO3');
  document.getElementById('info-map').textContent = safeText(state.map || state.phase, 'DRAFT').toUpperCase();
  document.getElementById('match-status-badge').textContent = safeText(state.matchStatus, 'WAITING').toUpperCase();

  setTeamLogo('a', state.teamA.logo, state.teamA.name);
  setTeamLogo('b', state.teamB.logo, state.teamB.name);
  renderPlayers('a', state.teamA.players || []);
  renderPlayers('b', state.teamB.players || []);
  renderBans('a', state.teamA.bans || [], state.teamA.manualBans || []);
  renderBans('b', state.teamB.bans || [], state.teamB.manualBans || []);
  renderFeaturedPlayer('a', state.teamA.players && state.teamA.players[0]);
  renderFeaturedPlayer('b', state.teamB.players && state.teamB.players[0]);
}

function setTeamLogo(side, url, name) {
  const wrap = document.getElementById(`team-${side}-logo-wrap`);
  const placeholder = document.getElementById(`team-${side}-logo-placeholder`);
  let img = wrap.querySelector('img');
  if (url) {
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.onerror = () => {
        img.style.display = 'none';
        placeholder.style.display = 'grid';
      };
      wrap.appendChild(img);
    }
    img.src = url;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    placeholder.style.display = 'grid';
    placeholder.textContent = safeText(name, side).charAt(0).toUpperCase();
  }
}

function renderPlayers(side, players) {
  const container = document.getElementById(`players-${side}`);
  container.innerHTML = '';
  const turn = getCurrentDraftTurn();

  for (let i = 0; i < 3; i++) {
    const p = players[i] || {};
    const card = document.createElement('div');
    const hasTimerSlot = turn && side === turn.side && i === turn.playerIndex;
    const hasMysterySlot = (side === 'a' && i === 2) || (side === 'b' && i === 2);

    if (hasTimerSlot) {
      card.className = `timer-card ${side === 'b' ? 'red' : 'blue'}`;
      card.id = 'timer-card';

      const timerNumber = document.createElement('div');
      timerNumber.className = 'timer-number';
      timerNumber.id = 'timer-number';
      timerNumber.textContent = state.timer.remaining;
      card.appendChild(timerNumber);

      const timerPlayerName = document.createElement('div');
      timerPlayerName.className = 'timer-player-name';
      timerPlayerName.textContent = safeText(p.name, side === 'a' ? `PLAYER${i + 1}` : `PLAYER${i + 4}`);
      card.appendChild(timerPlayerName);

      container.appendChild(card);
      updateTimerDisplay();
      continue;
    }

    if (hasMysterySlot && !p.brawlerImg) {
      card.className = `mystery-card ${side === 'b' ? 'red' : ''}`;
      card.innerHTML = '<span>?</span>';
      container.appendChild(card);
      continue;
    }

    card.className = 'pick-card';
    const art = document.createElement('div');
    art.className = 'pick-art';
    if (p.brawlerImg) {
      const img = document.createElement('img');
      img.src = p.brawlerImg;
      img.alt = p.brawlerName || p.name || '';
      img.onerror = () => {
        img.remove();
        art.classList.add('empty');
        art.innerHTML = '<span>?</span>';
      };
      art.appendChild(img);
    } else {
      art.classList.add('empty');
      art.innerHTML = '<span>?</span>';
    }

    const label = document.createElement('div');
    label.className = 'pick-name';
    // Display the hero (brawler) name if selected, otherwise fallback to player name
    label.textContent = safeText(p.brawlerName || p.name, side === 'a' ? `PLAYER${i + 1}` : `PLAYER${i + 4}`);
    card.appendChild(art);
    card.appendChild(label);
    container.appendChild(card);
  }
}

function renderBans(side, bans, manualBans) {
  // Slots 0-2: API bans (auto from Matcherino)
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`ban-${side}-${i}`);
    if (!slot) continue;
    const ban = (bans || [])[i] || {};
    slot.className = 'ban-card empty';
    slot.innerHTML = '';
    if (ban.img) {
      const img = document.createElement('img');
      img.src = ban.img;
      img.alt = ban.name || '';
      img.onerror = () => img.remove();
      slot.classList.remove('empty');
      slot.appendChild(img);
    }
  }
  // Slots 3-4: Manual bans (set from control panel)
  for (let i = 0; i < 2; i++) {
    const slot = document.getElementById(`ban-${side}-${3 + i}`);
    if (!slot) continue;
    const ban = (manualBans || [])[i] || {};
    slot.className = 'ban-card empty ban-manual';
    slot.innerHTML = '';
    if (ban.img) {
      const img = document.createElement('img');
      img.src = ban.img;
      img.alt = ban.name || '';
      img.onerror = () => img.remove();
      slot.classList.remove('empty');
      slot.appendChild(img);
    }
  }
}

function renderFeaturedPlayer(side, player) {
  const p = player || {};
  const frame = document.getElementById(`camera-${side}`);
  const label = document.getElementById(`feature-${side}-name`);
  label.textContent = safeText(p.name, side === 'a' ? 'PLAYER1' : 'PLAYER4');
  frame.innerHTML = '';

  if (p.avatar) {
    const img = document.createElement('img');
    img.src = p.avatar;
    img.alt = p.name || '';
    img.onerror = () => {
      img.remove();
      frame.innerHTML = `<div class="camera-placeholder">${safeText(p.name, 'PLAYER')}</div>`;
    };
    frame.appendChild(img);
  } else {
    frame.innerHTML = `<div class="camera-placeholder">${safeText(p.name, side === 'a' ? 'PLAYER1' : 'PLAYER4')}</div>`;
  }
}

// ─────────────────────────────────────────────
//  TIMER
// ─────────────────────────────────────────────
function getCurrentDraftTurn() {
  if (state.timer.draftComplete) return null;
  return draftTurns[state.timer.turnIndex % draftTurns.length] || draftTurns[0];
}

function getDraftTurnPlayer(turn) {
  if (!turn) return {};
  return (getTeam(turn.side).players || [])[turn.playerIndex] || {};
}

function hasDraftPick(turn) {
  const player = getDraftTurnPlayer(turn);
  return Boolean(player.brawlerImg || player.brawlerName);
}

function getNextOpenDraftTurnIndex() {
  return draftTurns.findIndex(turn => !hasDraftPick(turn));
}

function syncTimerToDraftPicks() {
  if (!state.timer) return;

  const nextTurnIndex = getNextOpenDraftTurnIndex();

  if (nextTurnIndex === -1) {
    state.timer.draftComplete = true;
    state.timer.running = false;
    state.timer.remaining = 0;
    stopTimerInterval();
    return;
  }

  const shouldMoveTimer = state.timer.draftComplete || state.timer.turnIndex !== nextTurnIndex;
  state.timer.draftComplete = false;

  if (!shouldMoveTimer) return;

  state.timer.turnIndex = nextTurnIndex;
  state.timer.remaining = state.timer.duration;
  if (state.timer.running) startTimer();
}

function resetTimer(duration, shouldRun = false, turnIndex = state.timer.turnIndex || 0) {
  const seconds = Number.isFinite(Number(duration)) ? Number(duration) : state.timer.duration;
  state.timer.duration = Math.max(1, seconds);
  state.timer.remaining = state.timer.duration;
  state.timer.turnIndex = Math.max(0, Number(turnIndex) || 0) % draftTurns.length;
  state.timer.draftComplete = false;
  state.timer.running = shouldRun;
  if (state.timer.running) startTimer();
  else stopTimerInterval();
  updateTimerDisplay();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  if (!state.timer.running) return;
  timerInterval = setInterval(() => {
    if (!state.timer.running) return;
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    updateTimerDisplay();
    if (state.timer.remaining <= 0) {
      advanceTimerTurn();
    }
  }, 1000);
}

function stopTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function advanceTimerTurn() {
  const keepRunning = state.timer.running;
  state.timer.turnIndex = (state.timer.turnIndex + 1) % draftTurns.length;
  state.timer.remaining = state.timer.duration;
  state.timer.draftComplete = false;
  state.timer.running = keepRunning;
  render();
  if (keepRunning) startTimer();
}

function updateTimerDisplay() {
  const timerNumber = document.getElementById('timer-number');
  const timerCard = document.getElementById('timer-card');
  if (!timerNumber || !timerCard) return;
  timerNumber.textContent = String(state.timer.remaining).padStart(2, '0');
  timerCard.classList.toggle('warning', state.timer.remaining <= 5 && state.timer.remaining > 0);
}

function maybeResetTimerForPhase() {
  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    if (state.phase === 'ban' || state.phase === 'pick' || state.phase === 'waiting') {
      resetTimer(30, false, 0);
    }
  }
}

// ─────────────────────────────────────────────
//  API
// ─────────────────────────────────────────────
const API = 'https://matcherino.com/__api';
// Use built-in server proxy when running via localhost — no CORS issues
function getProxy() {
  if (window.location.protocol !== 'file:') {
    return '/api/proxy?url=';
  }
  return 'https://corsproxy.io/?url=';
}

async function apiFetch(path) {
  try {
    const url = `${API}${path}`;
    const resp = await fetch(getProxy() + encodeURIComponent(url));
    if (!resp.ok) throw new Error(resp.status);
    return await resp.json();
  } catch (e) {
    console.warn('API fetch failed:', e);
    return null;
  }
}

async function loadBrawlerCache() {
  if (Object.keys(state.brawlerCache).length > 0) return;
  const data = await apiFetch('/games/brawlstars/brawlers');
  if (data && data.body) {
    (data.body.brawlers || data.body || []).forEach(b => {
      state.brawlerCache[b.id] = { name: b.name, img: b.imageUrl || b.image };
    });
  }
}

async function pollMatch() {
  if (!state.matchId) return;
  await loadBrawlerCache();
  const data = await apiFetch(`/brackets/match?matchId=${state.matchId}`);
  if (!data || !data.body) return;
  const m = data.body;

  state.matchStatus = m.status || 'waiting';
  if (!m.banPhaseComplete) state.phase = 'ban';
  else if (!m.pickPhaseComplete) state.phase = 'pick';
  else if (m.status === 'in-progress') state.phase = 'live';
  else if (m.status === 'done') state.phase = 'done';

  state.teamA.score = m.entrantA?.score ?? state.teamA.score;
  state.teamB.score = m.entrantB?.score ?? state.teamB.score;

  const eA = m.entrantA?.entrant;
  const eB = m.entrantB?.entrant;
  if (eA) {
    state.teamA.name = eA.name || state.teamA.name;
    state.teamA.logo = eA.team?.team?.avatar || state.teamA.logo;
    state.teamA.players = (eA.team?.team?.members || []).slice(0, 3).map((mem, i) => ({
      name: mem.displayName || `PLAYER${i + 1}`,
      userId: mem.userId,
      avatar: mem.avatar,
      brawlerImg: state.teamA.players[i]?.brawlerImg || null,
      brawlerName: state.teamA.players[i]?.brawlerName || null
    }));
  }
  if (eB) {
    state.teamB.name = eB.name || state.teamB.name;
    state.teamB.logo = eB.team?.team?.avatar || state.teamB.logo;
    state.teamB.players = (eB.team?.team?.members || []).slice(0, 3).map((mem, i) => ({
      name: mem.displayName || `PLAYER${i + 4}`,
      userId: mem.userId,
      avatar: mem.avatar,
      brawlerImg: state.teamB.players[i]?.brawlerImg || null,
      brawlerName: state.teamB.players[i]?.brawlerName || null
    }));
  }

  // Only update bans from overlay's own API poll if:
  // 1. The brawlerCache is populated (CORS proxy succeeded)
  // 2. At least one ban ID resolves to a real brawler with image
  // Otherwise keep whatever the control panel sent via FULL_STATE
  const cacheLoaded = Object.keys(state.brawlerCache).length > 0;
  const apiBansA = (m.bannedBrawlersEntrantA || []);
  if (apiBansA.length > 0 && cacheLoaded) {
    const resolvedA = apiBansA.map(id => state.brawlerCache[id] ? {
      name: state.brawlerCache[id].name,
      img: state.brawlerCache[id].img
    } : null);
    if (resolvedA.some(b => b && b.img)) {
      state.teamA.bans = resolvedA.map(b => b || {});
    }
  }
  const apiBansB = (m.bannedBrawlersEntrantB || []);
  if (apiBansB.length > 0 && cacheLoaded) {
    const resolvedB = apiBansB.map(id => state.brawlerCache[id] ? {
      name: state.brawlerCache[id].name,
      img: state.brawlerCache[id].img
    } : null);
    if (resolvedB.some(b => b && b.img)) {
      state.teamB.bans = resolvedB.map(b => b || {});
    }
  }

  maybeResetTimerForPhase();
  syncTimerToDraftPicks();
  render();
}

async function pollStats() {
  if (!state.matchId || !state.bountyId) return;
  const data = await apiFetch(`/games/brawlstars/match/stats?bountyId=${state.bountyId}&matchIds=${state.matchId}`);
  if (!data || !data.body) return;
  const matches = data.body.matches || [];
  if (!matches.length) return;
  const match = matches[0];
  const reports = match.reports || [];
  if (!reports.length) return;

  const latest = reports[reports.length - 1];
  if (latest.properties?.location) {
    state.map = latest.properties.location.name || '';
  }

  const teams = latest.properties?.teams || [];
  teams.forEach((team, ti) => {
    const targetTeam = ti === 0 ? state.teamA : state.teamB;
    (team.players || []).slice(0, 3).forEach((gp, pi) => {
      if (targetTeam.players[pi]) {
        targetTeam.players[pi].brawlerImg = gp.brawler?.image || targetTeam.players[pi].brawlerImg || null;
        targetTeam.players[pi].brawlerName = gp.brawler?.name || targetTeam.players[pi].brawlerName || null;
      }
    });
  });
  syncTimerToDraftPicks();
  render();
}

// ─────────────────────────────────────────────
//  CONTROL MESSAGE HANDLER
// ─────────────────────────────────────────────
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || msg.source !== 'brawl-control') return;
  handleControlMessage(msg);
});

let lastMsgId = null;
function handleControlMessage(msg) {
  if (msg && msg.msgId) {
    if (msg.msgId === lastMsgId) return;
    lastMsgId = msg.msgId;
  }
  switch (msg.type) {
    case 'SET_IDS':
      state.bountyId = msg.bountyId || state.bountyId;
      state.matchId = msg.matchId || state.matchId;
      startPolling();
      break;
    case 'SET_TEAM':
      Object.assign(getTeam(msg.side), msg.data);
      break;
    case 'SET_SCORE':
      getTeam(msg.side).score = msg.score;
      break;
    case 'SET_FORMAT':
      state.format = msg.format;
      break;
    case 'SET_PHASE':
      state.phase = msg.phase;
      state.matchStatus = msg.status || state.matchStatus;
      maybeResetTimerForPhase();
      break;
    case 'SET_VISIBILITY':
      state.visible = msg.visible;
      state.badgeVisible = msg.badgeVisible ?? state.badgeVisible;
      break;
    case 'SET_BADGE':
      document.getElementById('badge-title').innerHTML = `<strong>${safeText(msg.title, 'Brawl Stars')}</strong> Challengers`;
      document.getElementById('badge-subtitle').textContent = safeText(msg.subtitle, 'South Asia');
      break;
    case 'SET_TIMER':
      state.timer.remaining = Math.max(0, Number(msg.remaining ?? state.timer.remaining));
      state.timer.duration = Math.max(1, Number(msg.duration ?? state.timer.duration));
      state.timer.turnIndex = Math.max(0, Number(msg.turnIndex ?? state.timer.turnIndex ?? 0)) % draftTurns.length;
      state.timer.draftComplete = Boolean(msg.draftComplete);
      state.timer.running = Boolean(msg.running);
      if (state.timer.running) startTimer();
      else stopTimerInterval();
      updateTimerDisplay();
      break;
    case 'TIMER_RESET':
      resetTimer(msg.duration || 30, false, msg.turnIndex ?? 0);
      break;
    case 'TIMER_START':
      state.timer.running = true;
      startTimer();
      break;
    case 'TIMER_PAUSE':
      state.timer.running = false;
      stopTimerInterval();
      break;
    case 'TIMER_NEXT':
      advanceTimerTurn();
      break;
    case 'FULL_STATE':
      Object.assign(state, msg.state);
      state.timer = Object.assign({ duration: 30, remaining: 30, running: false, turnIndex: 0, draftComplete: false }, state.timer || {});
      maybeResetTimerForPhase();
      syncTimerToDraftPicks();
      if (state.timer.running) startTimer();
      else stopTimerInterval();
      startPolling();
      break;
  }
  render();
}

// ─────────────────────────────────────────────
//  POLLING
// ─────────────────────────────────────────────
function startPolling() {
  if (state.pollInterval) clearInterval(state.pollInterval);
  if (state.pollStatsInterval) clearInterval(state.pollStatsInterval);
  if (!state.matchId) return;
  pollMatch();
  state.pollInterval = setInterval(pollMatch, 5000);
  if (state.bountyId) {
    pollStats();
    state.pollStatsInterval = setInterval(pollStats, 3000);
  }
}

// ─────────────────────────────────────────────
//  BROADCAST CHANNEL (control panel ↔ overlay)
// ─────────────────────────────────────────────
try {
  const bc = new BroadcastChannel('brawl_overlay');
  bc.onmessage = (e) => handleControlMessage(e.data);
} catch (e) { }

// ─────────────────────────────────────────────
//  LOCALSTORAGE FALLBACK (for vMix / independent windows)
// ─────────────────────────────────────────────
let lastStorageState = null;
setInterval(() => {
  try {
    const stored = localStorage.getItem('brawl_overlay_state');
    if (stored && stored !== lastStorageState) {
      lastStorageState = stored;
      const data = JSON.parse(stored);
      handleControlMessage({ type: 'FULL_STATE', state: data });
    }
  } catch (e) { }
}, 500);

// ─────────────────────────────────────────────
//  SERVER-SIDE FALLBACK (for vMix / cross-process OBS browser sources)
// ─────────────────────────────────────────────
if (window.location.protocol !== 'file:') {
  // Initial fetch of full state
  fetch('/api/state')
    .then(resp => resp.json())
    .then(data => {
      if (data && Object.keys(data).length > 0) {
        handleControlMessage({ type: 'FULL_STATE', state: data });
      }
    })
    .catch(e => console.warn('Failed to fetch initial state from server:', e));

  // Periodically poll for new messages/commands
  setInterval(() => {
    fetch('/api/messages')
      .then(resp => resp.json())
      .then(messages => {
        if (Array.isArray(messages)) {
          messages.forEach(msg => handleControlMessage(msg));
        }
      })
      .catch(e => console.warn('Failed to poll messages from server:', e));
  }, 500);
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
window.addEventListener('resize', fitOverlayToViewport);
window.visualViewport?.addEventListener('resize', fitOverlayToViewport);
window.addEventListener('DOMContentLoaded', () => {
  fitOverlayToViewport();
  if (window.location.protocol === 'file:') {
    const alertDiv = document.createElement('div');
    alertDiv.style.background = '#ff3d40';
    alertDiv.style.color = '#fff';
    alertDiv.style.padding = '15px';
    alertDiv.style.fontWeight = 'bold';
    alertDiv.style.textAlign = 'center';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '0';
    alertDiv.style.left = '0';
    alertDiv.style.width = '100vw';
    alertDiv.style.zIndex = '99999';
    alertDiv.innerHTML = '⚠️ WARNING: Opened directly from file system. You MUST access this overlay via <a href="http://localhost:8080/overlay/overlay.html" style="color:#fff;text-decoration:underline;">http://localhost:8080/overlay/overlay.html</a> for Broadcast/Server synchronization to work!';
    document.body.prepend(alertDiv);
  }
});
fitOverlayToViewport();
render();
resetTimer(30, false, 0);
