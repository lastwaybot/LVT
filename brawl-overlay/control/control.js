// STATE
const state = {
  bountyId: '',
  matchId: '',
  teamA: {
    name: 'TEAM A', logo: null,
    players: [
      {name:'PLAYER1', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER2', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER3', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
    ],
    bans: [{},{},{}],      // Auto from API
    manualBans: [{},{}],   // Set manually
    score: 0
  },
  teamB: {
    name: 'TEAM B', logo: null,
    players: [
      {name:'PLAYER4', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER5', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER6', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
    ],
    bans: [{},{},{}],      // Auto from API
    manualBans: [{},{}],   // Set manually
    score: 0
  },
  phase: 'live',
  matchStatus: 'waiting',
  format: 'BO3',
  map: '',
  visible: true,
  badgeVisible: true,
  brawlerCache: [],
  pollTimer: null,
  overlayWindow: null,
  currentBanTarget: null,
};

let bc;
try { bc = new BroadcastChannel('brawl_overlay'); } catch(e) {}

// INIT
window.addEventListener('DOMContentLoaded', () => {
  buildPlayerEditors('a');
  buildPlayerEditors('b');
  updateScoreDisplay();
  updateMatchSummary();
  loadBrawlers();

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
    alertDiv.innerHTML = '⚠️ WARNING: You opened this file directly. You MUST access the control panel via <a href="http://localhost:8080/control/control.html" style="color:#fff;text-decoration:underline;">http://localhost:8080/control/control.html</a> for CORS and synchronization to work!';
    document.body.prepend(alertDiv);
    log('WARNING: Opened via file:// protocol! Please use http://localhost:8080/', 'err');
  }

  // Update static guide URL display if we are running over HTTP
  const urlDisplay = document.getElementById('overlay-url-display');
  if (urlDisplay) {
    urlDisplay.textContent = getOverlayUrl();
  }
});

// PLAYER EDITORS
function buildPlayerEditors(side) {
  const container = document.getElementById(`players-${side}-edit`);
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = state[side === 'a' ? 'teamA' : 'teamB'].players[i];
    const div = document.createElement('div');
    div.className = 'player-edit-row';
    div.id = `player-${side}-${i}-row`;
    div.innerHTML = `
      <div class="player-edit-header">
        <span class="player-num">PLAYER ${i+1}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <div class="img-preview" id="player-${side}-${i}-prev" style="width:32px;height:32px;font-size:13px;">👤</div>
          <label for="player-${side}-${i}-file" class="btn btn-outline btn-sm">Portrait</label>
          <input type="file" id="player-${side}-${i}-file" accept="image/*" onchange="handlePlayerUpload('${side}',${i},this)">
        </div>
      </div>
      <div class="player-fields">
        <input type="text" id="player-${side}-${i}-name" placeholder="Display Name" value="${p.name}" oninput="updatePlayerField('${side}',${i},'name',this.value)">
        <input type="text" id="player-${side}-${i}-uid" placeholder="User ID" value="${p.userId}" oninput="updatePlayerField('${side}',${i},'userId',this.value)">
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
        <div id="player-${side}-${i}-brawler-prev" style="width:28px;height:28px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">?</div>
        <button class="btn btn-outline btn-sm" onclick="openPickBrawler('${side}',${i})">Set Pick</button>
        <button class="btn btn-outline btn-sm" onclick="clearPick('${side}',${i})">Clear</button>
      </div>
    `;
    container.appendChild(div);
  }
}

function updatePlayerField(side, idx, field, val) {
  const team = side === 'a' ? state.teamA : state.teamB;
  team.players[idx][field] = val;
  pushToOverlay();
}

function handlePlayerUpload(side, idx, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target.result;
    const team = side === 'a' ? state.teamA : state.teamB;
    team.players[idx].avatar = url;
    const prev = document.getElementById(`player-${side}-${idx}-prev`);
    prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;">`;
    pushToOverlay();
  };
  reader.readAsDataURL(file);
}

function handleLogoUpload(side, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target.result;
    const team = side === 'a' ? state.teamA : state.teamB;
    team.logo = url;
    document.getElementById(`t${side}-logo-prev`).innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;">`;
    pushToOverlay();
  };
  reader.readAsDataURL(file);
}

function updateTeamLogoUrl(side) {
  const url = document.getElementById(`t${side}-logo-url`).value;
  const team = side === 'a' ? state.teamA : state.teamB;
  team.logo = url || null;
  if (url) {
    document.getElementById(`t${side}-logo-prev`).innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'">`;
  }
  pushToOverlay();
}

function updateTeam(side) {
  const name = document.getElementById(`t${side}-name`).value;
  const team = side === 'a' ? state.teamA : state.teamB;
  team.name = name;
  document.getElementById(`score-t${side}-name`).textContent = name.toUpperCase();
  pushToOverlay();
}

// SCORE
function adjustScore(side, delta) {
  const team = side === 'a' ? state.teamA : state.teamB;
  team.score = Math.max(0, team.score + delta);
  updateScoreDisplay();
  send({ type: 'SET_SCORE', side, score: team.score });
}

function updateScoreDisplay() {
  document.getElementById('score-a-display').textContent = state.teamA.score;
  document.getElementById('score-b-display').textContent = state.teamB.score;
}

function resetScores() {
  state.teamA.score = 0;
  state.teamB.score = 0;
  updateScoreDisplay();
  pushToOverlay();
}

function updateFormat() {
  state.format = document.getElementById('format-select').value;
  send({ type: 'SET_FORMAT', format: state.format });
}

function updateStatus() {
  state.matchStatus = document.getElementById('status-select').value;
  send({ type: 'SET_PHASE', phase: state.phase, status: state.matchStatus });
}

function updateMap() {
  state.map = document.getElementById('map-input').value;
  pushToOverlay();
}

// PHASE
function setPhase(phase) {
  state.phase = phase;
  document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  send({ type: 'SET_PHASE', phase, status: state.matchStatus });
}

function getDraftTimerDuration() {
  const input = document.getElementById('timer-duration');
  return Math.max(1, parseInt(input.value, 10) || 30);
}

function resetDraftTimer() {
  send({ type: 'TIMER_RESET', duration: getDraftTimerDuration() });
}

function startDraftTimer() {
  send({ type: 'TIMER_START' });
}

function pauseDraftTimer() {
  send({ type: 'TIMER_PAUSE' });
}

function nextDraftTimer() {
  send({ type: 'TIMER_NEXT' });
}

// BRAWLER PICKER
const API = 'https://matcherino.com/__api';
// Use built-in server proxy when running via localhost — no CORS issues
// Falls back to corsproxy.io only if opened directly as file://
function getProxy() {
  if (window.location.protocol !== 'file:') {
    return '/api/proxy?url=';
  }
  return 'https://corsproxy.io/?url=';
}

async function loadBrawlers() {
  if (state.brawlerCache.length > 0) { renderBrawlerGrid(); return; }
  log('Loading brawler roster...', 'info');
  try {
    const resp = await fetch(getProxy() + encodeURIComponent(`${API}/games/brawlstars/brawlers`));
    const data = await resp.json();
    const list = data.body?.brawlers || data.body || [];
    state.brawlerCache = list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    log(`Loaded ${state.brawlerCache.length} brawlers ✓`, 'ok');
    renderBrawlerGrid();
    renderModalGrid();
  } catch(e) {
    log(`Brawler load failed: ${e.message}`, 'err');
  }
}

function renderBrawlerGrid() {
  const query = document.getElementById('brawler-search')?.value.toLowerCase() || '';
  const grid = document.getElementById('brawler-grid');
  grid.innerHTML = '';
  const filtered = state.brawlerCache.filter(b => !query || (b.name||'').toLowerCase().includes(query));
  filtered.slice(0, 80).forEach(b => {
    const img = document.createElement('img');
    img.className = 'brawler-thumb';
    img.src = b.imageUrl || b.image || '';
    img.title = b.name;
    img.onclick = () => assignBrawler(b);
    grid.appendChild(img);
  });
  if (filtered.length === 0) grid.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:8px;grid-column:1/-1;">No brawlers found.</div>';
}

function filterBrawlers() { renderBrawlerGrid(); }

function renderModalGrid() {
  const query = document.getElementById('modal-search')?.value.toLowerCase() || '';
  const grid = document.getElementById('modal-brawler-grid');
  grid.innerHTML = '';
  const filtered = state.brawlerCache.filter(b => !query || (b.name||'').toLowerCase().includes(query));
  filtered.forEach(b => {
    const img = document.createElement('img');
    img.className = 'brawler-thumb';
    img.src = b.imageUrl || b.image || '';
    img.title = b.name;
    img.onclick = () => { assignBanFromModal(b); closeBanModal(); };
    grid.appendChild(img);
  });
}

function filterModalBrawlers() { renderModalGrid(); }

function assignBrawler(b) {
  const target = document.getElementById('brawler-target').value;
  const [type, side, idx] = target.split('-');
  if (type === 'ban') {
    const team = side === 'a' ? state.teamA : state.teamB;
    team.bans[parseInt(idx)] = { name: b.name, img: b.imageUrl || b.image };
    updateBanSlotUI(side, parseInt(idx), b);
  } else if (type === 'pick') {
    const team = side === 'a' ? state.teamA : state.teamB;
    team.players[parseInt(idx)].brawlerImg = b.imageUrl || b.image;
    team.players[parseInt(idx)].brawlerName = b.name;
    updatePickSlotUI(side, parseInt(idx), b);
  }
  pushToOverlay();
}

let pendingBan = null;
function openBanPicker(side, slot) {
  pendingBan = { side, slot };
  document.getElementById('modal-search').value = '';
  renderModalGrid();
  document.getElementById('ban-picker-modal').style.display = 'flex';
}
function closeBanModal() {
  document.getElementById('ban-picker-modal').style.display = 'none';
  pendingBan = null;
}
function assignBanFromModal(b) {
  if (!pendingBan) return;
  const { side, slot } = pendingBan;
  const team = side === 'a' ? state.teamA : state.teamB;
  team.manualBans[slot] = { name: b.name, img: b.imageUrl || b.image };
  updateManualBanSlotUI(side, slot, b);
  pushToOverlay();
}

function openPickBrawler(side, idx) {
  pendingBan = { side, idx, type: 'pick' };
  document.getElementById('modal-search').value = '';
  renderModalGrid();
  document.getElementById('ban-picker-modal').style.display = 'flex';
  document.querySelectorAll('#modal-brawler-grid .brawler-thumb').forEach(img => {
    img.onclick = () => {
      const b = state.brawlerCache.find(br => br.name === img.title);
      if (b && pendingBan?.type === 'pick') {
        const team = pendingBan.side === 'a' ? state.teamA : state.teamB;
        team.players[pendingBan.idx].brawlerImg = b.imageUrl || b.image;
        team.players[pendingBan.idx].brawlerName = b.name;
        updatePickSlotUI(pendingBan.side, pendingBan.idx, b);
        pushToOverlay();
      }
      closeBanModal();
    };
  });
}

function clearPick(side, idx) {
  const team = side === 'a' ? state.teamA : state.teamB;
  team.players[idx].brawlerImg = null;
  team.players[idx].brawlerName = null;
  const prev = document.getElementById(`player-${side}-${idx}-brawler-prev`);
  prev.innerHTML = '?';
  pushToOverlay();
}

function updateManualBanSlotUI(side, slot, b) {
  const el = document.getElementById(`ban-${side}-slot-${slot}`);
  if (!el) return;
  el.innerHTML = `<img src="${b.imageUrl || b.image || b.img}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;"><div class="remove-ban" onclick="clearBan('${side}',${slot},event)">✕</div>`;
}

function updateApiBanDisplay(side, slot, b) {
  const el = document.getElementById(`api-ban-${side}-slot-${slot}`);
  if (!el) return;
  el.innerHTML = `<img src="${b.imageUrl || b.image || b.img}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;opacity:1;">`;
  el.style.opacity = '1';
}

function updatePickSlotUI(side, idx, b) {
  const prev = document.getElementById(`player-${side}-${idx}-brawler-prev`);
  prev.innerHTML = `<img class="player-brawler-preview" src="${b.imageUrl||b.image}" alt="${b.name}" onerror="this.style.display='none'">`;
}

function clearBan(side, slot, e) {
  e.stopPropagation();
  const team = side === 'a' ? state.teamA : state.teamB;
  team.manualBans[slot] = {};
  const el = document.getElementById(`ban-${side}-slot-${slot}`);
  if (el) el.innerHTML = `<span style="font-size:20px;color:rgba(255,255,255,0.2)">+</span><div class="remove-ban" onclick="clearBan('${side}',${slot},event)">✕</div>`;
  pushToOverlay();
}

// API INTEGRATION
async function loadFromAPI() {
  const bountyId = document.getElementById('bounty-id').value.trim();
  const matchId = document.getElementById('match-id').value.trim();
  if (!bountyId && !matchId) { log('Enter Bounty ID and/or Match ID first.', 'err'); return; }
  state.bountyId = bountyId;
  state.matchId = matchId;
  setApiStatus('polling');
  log(`Fetching match ${matchId}...`, 'info');
  await loadBrawlers();
  if (matchId) {
    try {
      const resp = await fetch(getProxy() + encodeURIComponent(`${API}/brackets/match?matchId=${matchId}`));
      const data = await resp.json();
      if (!data.body) throw new Error('No body in response');
      applyMatchData(data.body);
      log(`Match data loaded ✓`, 'ok');
    } catch(e) {
      log(`Match fetch failed: ${e.message}`, 'err');
    }
  }
  if (bountyId && matchId) {
    try {
      const resp = await fetch(getProxy() + encodeURIComponent(`${API}/games/brawlstars/match/stats?bountyId=${bountyId}&matchIds=${matchId}`));
      const data = await resp.json();
      const matches = data.body?.matches || [];
      if (matches.length) applyStatsData(matches[0]);
      log(`Stats data loaded ✓`, 'ok');
    } catch(e) {
      log(`Stats fetch failed: ${e.message}`, 'err');
    }
  }
  setApiStatus('ok');
  pushToOverlay();
  updateMatchSummary();
}

function applyMatchData(m) {
  state.matchStatus = m.status || 'waiting';
  document.getElementById('status-select').value = state.matchStatus;
  if (!m.banPhaseComplete) state.phase = 'ban';
  else if (!m.pickPhaseComplete) state.phase = 'pick';
  else if (m.status === 'in-progress') state.phase = 'live';
  else if (m.status === 'done') state.phase = 'done';
  state.teamA.score = m.entrantA?.score ?? 0;
  state.teamB.score = m.entrantB?.score ?? 0;
  updateScoreDisplay();
  const eA = m.entrantA?.entrant;
  const eB = m.entrantB?.entrant;
  if (eA) {
    state.teamA.name = eA.name || state.teamA.name;
    state.teamA.logo = eA.team?.team?.avatar || null;
    document.getElementById('ta-name').value = state.teamA.name;
    if (state.teamA.logo) document.getElementById('ta-logo-url').value = state.teamA.logo;
    const members = eA.team?.team?.members || [];
    members.slice(0,3).forEach((mem,i) => {
      state.teamA.players[i].name = mem.displayName || `PLAYER ${i+1}`;
      state.teamA.players[i].userId = mem.userId || '';
      state.teamA.players[i].avatar = mem.avatar || null;
      document.getElementById(`player-a-${i}-name`).value = state.teamA.players[i].name;
      document.getElementById(`player-a-${i}-uid`).value = state.teamA.players[i].userId;
      if (mem.avatar) {
        document.getElementById(`player-a-${i}-prev`).innerHTML = `<img src="${mem.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;">`;
      }
    });
  }
  if (eB) {
    state.teamB.name = eB.name || state.teamB.name;
    state.teamB.logo = eB.team?.team?.avatar || null;
    document.getElementById('tb-name').value = state.teamB.name;
    if (state.teamB.logo) document.getElementById('tb-logo-url').value = state.teamB.logo;
    const members = eB.team?.team?.members || [];
    members.slice(0,3).forEach((mem,i) => {
      state.teamB.players[i].name = mem.displayName || `PLAYER ${i+1}`;
      state.teamB.players[i].userId = mem.userId || '';
      state.teamB.players[i].avatar = mem.avatar || null;
      document.getElementById(`player-b-${i}-name`).value = state.teamB.players[i].name;
      document.getElementById(`player-b-${i}-uid`).value = state.teamB.players[i].userId;
      if (mem.avatar) {
        document.getElementById(`player-b-${i}-prev`).innerHTML = `<img src="${mem.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;">`;
      }
    });
  }
  const brawlerById = {};
  state.brawlerCache.forEach(b => brawlerById[b.id] = b);
  (m.bannedBrawlersEntrantA || []).slice(0,3).forEach((id,i) => {
    const b = brawlerById[id];
    if (b) { state.teamA.bans[i] = { name: b.name, img: b.imageUrl||b.image }; updateApiBanDisplay('a',i,b); }
  });
  (m.bannedBrawlersEntrantB || []).slice(0,3).forEach((id,i) => {
    const b = brawlerById[id];
    if (b) { state.teamB.bans[i] = { name: b.name, img: b.imageUrl||b.image }; updateApiBanDisplay('b',i,b); }
  });
  document.getElementById('score-ta-name').textContent = state.teamA.name.toUpperCase();
  document.getElementById('score-tb-name').textContent = state.teamB.name.toUpperCase();
}

function applyStatsData(match) {
  const reports = match.reports || [];
  if (!reports.length) return;
  const latest = reports[reports.length-1];
  if (latest.properties?.location) {
    state.map = latest.properties.location.name || '';
    document.getElementById('map-input').value = state.map;
  }
  const nameMap = match.populateBrawlerNames || {};
  const teams = latest.properties?.teams || [];
  teams.forEach((team, ti) => {
    const targetTeam = ti === 0 ? state.teamA : state.teamB;
    const side = ti === 0 ? 'a' : 'b';
    (team.players || []).slice(0,3).forEach((gp, pi) => {
      if (gp.brawler) {
        targetTeam.players[pi].brawlerImg = gp.brawler.image || null;
        targetTeam.players[pi].brawlerName = gp.brawler.name || null;
        const b = { name: gp.brawler.name, imageUrl: gp.brawler.image };
        if (b.imageUrl) updatePickSlotUI(side, pi, b);
      }
    });
  });
}

// POLLING
function startPolling() {
  stopPolling();
  const interval = parseInt(document.getElementById('poll-interval').value) * 1000 || 5000;
  log(`Polling every ${interval/1000}s...`, 'info');
  setApiStatus('polling');
  state.pollTimer = setInterval(async () => {
    await loadFromAPI();
    pushToOverlay();
  }, interval);
}

function stopPolling() {
  if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  setApiStatus('idle');
  log('Polling stopped.', 'info');
}

// PUSH TO OVERLAY
let msgCount = 0;
function send(msg) {
  msg.source = 'brawl-control';
  msg.msgId = Date.now() + '_' + (++msgCount);
  if (bc) bc.postMessage(msg);
  if (state.overlayWindow && !state.overlayWindow.closed) {
    state.overlayWindow.postMessage(msg, '*');
  }
  setConnStatus(true);

  // Send to server API if serving over HTTP
  if (window.location.protocol !== 'file:') {
    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(e => console.warn('Failed to send message to server:', e));
  }
}

function pushToOverlay() {
  const stateData = {
    bountyId: state.bountyId,
    matchId: state.matchId,
    teamA: JSON.parse(JSON.stringify(state.teamA)),
    teamB: JSON.parse(JSON.stringify(state.teamB)),
    phase: state.phase,
    matchStatus: state.matchStatus,
    format: state.format,
    map: state.map,
    visible: state.visible,
    badgeVisible: state.badgeVisible,
  };
  send({ type: 'FULL_STATE', state: stateData });
  try { localStorage.setItem('brawl_overlay_state', JSON.stringify(stateData)); } catch(e) {}
  
  // Send state to server API if serving over HTTP
  if (window.location.protocol !== 'file:') {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateData)
    }).catch(e => console.warn('Failed to push state to server:', e));
  }

  updateMatchSummary();
}

function setOverlayVisible(v) {
  state.visible = v;
  send({ type: 'SET_VISIBILITY', visible: v, badgeVisible: state.badgeVisible });
}

function updateBadge() {
  send({
    type: 'SET_BADGE',
    title: document.getElementById('badge-title').value,
    subtitle: document.getElementById('badge-subtitle').value
  });
}

function getOverlayUrl() {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:8080/overlay/overlay.html';
  }
  return `${window.location.origin}/overlay/overlay.html`;
}

function openOverlay() {
  state.overlayWindow = window.open(getOverlayUrl(), 'brawl_overlay', 'width=1920,height=1080');
  setTimeout(() => { pushToOverlay(); setConnStatus(true); }, 1000);
}

function copyOverlayUrl() {
  navigator.clipboard.writeText(getOverlayUrl()).catch(() => {});
  log('Overlay URL copied to clipboard ✓', 'ok');
}

function swapTeams() {
  const tmp = JSON.parse(JSON.stringify(state.teamA));
  state.teamA = JSON.parse(JSON.stringify(state.teamB));
  state.teamB = tmp;
  document.getElementById('ta-name').value = state.teamA.name;
  document.getElementById('tb-name').value = state.teamB.name;
  buildPlayerEditors('a');
  buildPlayerEditors('b');
  updateScoreDisplay();
  pushToOverlay();
}

function resetAll() {
  if (!confirm('Reset all data?')) return;
  
  // Stop polling first
  stopPolling();
  
  // Reset state variables
  state.bountyId = '';
  state.matchId = '';
  state.map = '';
  state.phase = 'waiting';
  state.matchStatus = 'waiting';
  state.teamA = { 
    name: 'TEAM A', 
    logo: null, 
    players: [
      {name:'PLAYER1', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER2', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER3', userId:'', avatar:null, brawlerImg:null, brawlerName:null}
    ], 
    bans: [{},{},{}],
    manualBans: [{},{}],
    score: 0 
  };
  state.teamB = { 
    name: 'TEAM B', 
    logo: null, 
    players: [
      {name:'PLAYER4', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER5', userId:'', avatar:null, brawlerImg:null, brawlerName:null},
      {name:'PLAYER6', userId:'', avatar:null, brawlerImg:null, brawlerName:null}
    ], 
    bans: [{},{},{}],
    manualBans: [{},{}],
    score: 0 
  };

  // Clear HTML input fields
  document.getElementById('bounty-id').value = '';
  document.getElementById('match-id').value = '';
  document.getElementById('bracket-id').value = '';
  document.getElementById('ta-name').value = '';
  document.getElementById('tb-name').value = '';
  document.getElementById('map-input').value = '';
  document.getElementById('ta-logo-url').value = '';
  document.getElementById('tb-logo-url').value = '';
  
  // Reset logo previews
  document.getElementById('ta-logo-prev').innerHTML = '🛡';
  document.getElementById('tb-logo-prev').innerHTML = '🛡';
  
  // Reset manual ban slots UI (2 per team)
  for (let i = 0; i < 2; i++) {
    const elA = document.getElementById(`ban-a-slot-${i}`);
    if (elA) elA.innerHTML = `<span style="font-size:20px;color:rgba(255,255,255,0.2)">+</span><div class="remove-ban" onclick="clearBan('a',${i},event)">✕</div>`;
    const elB = document.getElementById(`ban-b-slot-${i}`);
    if (elB) elB.innerHTML = `<span style="font-size:20px;color:rgba(255,255,255,0.2)">+</span><div class="remove-ban" onclick="clearBan('b',${i},event)">✕</div>`;
  }
  // Reset API ban display slots (3 per team)
  for (let i = 0; i < 3; i++) {
    const apiA = document.getElementById(`api-ban-a-slot-${i}`);
    if (apiA) { apiA.innerHTML = `<span style="font-size:10px;color:rgba(255,255,255,0.3)">API</span>`; apiA.style.opacity = '0.5'; }
    const apiB = document.getElementById(`api-ban-b-slot-${i}`);
    if (apiB) { apiB.innerHTML = `<span style="font-size:10px;color:rgba(255,255,255,0.3)">API</span>`; apiB.style.opacity = '0.5'; }
  }

  // Clear API log and reset status
  document.getElementById('api-log').innerHTML = '<span class="log-info">Control panel reset. ready. Enter IDs and click LOAD FROM API.</span>';
  document.getElementById('score-ta-name').textContent = 'TEAM A';
  document.getElementById('score-tb-name').textContent = 'TEAM B';
  
  // Rebuild player editors & update layout
  buildPlayerEditors('a');
  buildPlayerEditors('b');
  updateScoreDisplay();
  
  // Sync to overlay (overwrites localStorage with clean state)
  pushToOverlay();
}

// UI HELPERS
function log(msg, type='info') {
  const logEl = document.getElementById('api-log');
  const span = document.createElement('div');
  span.className = type === 'ok' ? 'log-ok' : type === 'err' ? 'log-err' : 'log-info';
  const time = new Date().toLocaleTimeString();
  span.textContent = `[${time}] ${msg}`;
  logEl.appendChild(span);
  logEl.scrollTop = logEl.scrollHeight;
}

function setApiStatus(s) {
  const el = document.getElementById('api-status');
  const lbl = document.getElementById('api-label');
  el.className = 'status-pill ' + (s==='polling'?'polling':s==='ok'?'connected':'disconnected');
  lbl.textContent = s==='polling'?'POLLING':s==='ok'?'API OK':'API IDLE';
}
function setConnStatus(ok) {
  const el = document.getElementById('conn-status');
  const lbl = document.getElementById('conn-label');
  el.className = 'status-pill ' + (ok?'connected':'disconnected');
  lbl.textContent = ok?'OVERLAY LIVE':'NO OVERLAY';
}

function updateMatchSummary() {
  const el = document.getElementById('match-summary');
  el.innerHTML = `
    <b style="color:var(--text)">Match:</b> ${state.matchId || '—'} &nbsp; <b style="color:var(--text)">Bounty:</b> ${state.bountyId || '—'}<br>
    <b style="color:#4a9fff">${state.teamA.name}</b> ${state.teamA.score} — ${state.teamB.score} <b style="color:#ff6b6b">${state.teamB.name}</b><br>
    <b style="color:var(--text)">Phase:</b> ${state.phase} &nbsp; <b style="color:var(--text)">Status:</b> ${state.matchStatus}<br>
    <b style="color:var(--text)">Map:</b> ${state.map || '—'} &nbsp; <b style="color:var(--text)">Format:</b> ${state.format}
  `;
}

// Close modal on outside click
document.getElementById('ban-picker-modal').addEventListener('click', function(e) {
  if (e.target === this) closeBanModal();
});
