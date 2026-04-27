/**
 * YoLauncher v1.1.0 · renderer.js
 * Instances, skins, settings, fixed progress, update check.
 */

// ═══════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

// Window
const btnMinimize   = $('btn-minimize');
const btnClose      = $('btn-close');

// Titlebar / sidebar versions
const appVersion    = $('app-version');
const sidebarVer    = $('sidebar-ver');

// Update banner
const updateBanner  = $('update-banner');
const updateVer     = $('update-ver');
const btnDoUpdate   = $('btn-do-update');
const btnDismissUpd = $('btn-dismiss-update');

// App layout (shifts down with banner)
const appLayout     = $('app-layout');

// Tabs
const navBtns       = document.querySelectorAll('.nav-btn');
const tabInstances  = $('tab-instances');
const tabSkins      = $('tab-skins');
const tabSettings   = $('tab-settings');

// Username
const inputUsername = $('input-username');

// Status
const statusDot     = $('status-dot');
const statusText    = $('status-text');

// ── Instances tab ──────────────────────────────────────────
const btnNewInst    = $('btn-new-instance');
const instancesGrid = $('instances-grid');
const emptyState    = $('empty-state');
const detailEmpty   = $('detail-empty');
const detailInfo    = $('detail-info');
const detailName    = $('detail-name');
const dVerBadge     = $('d-ver-badge');
const dMlBadge      = $('d-ml-badge');
const dRamBadge     = $('d-ram-badge');
const progressSec   = $('progress-section');
const progressLabel = $('progress-label');
const progressPct   = $('progress-pct');
const progressFill  = $('progress-fill');
const progressStats = $('progress-stats');
const playBtn       = $('play-btn');
const playText      = $('play-text');

// ── Skins tab ──────────────────────────────────────────────
const skinCanvas    = $('skin-canvas');
const skinLabel     = $('skin-label');
const btnUploadSkin = $('btn-upload-skin');
const btnResetSkin  = $('btn-reset-skin');
const skinFile      = $('skin-file');
const linkMojang    = $('link-mojang');

// ── Settings tab ───────────────────────────────────────────
const settingsRam   = $('settings-ram');
const settingsRamV  = $('settings-ram-val');
const settingsJava  = $('settings-java');
const gameDirBox    = $('game-dir-box');
const aboutVer      = $('about-ver');
const btnCheckUpd   = $('btn-check-update');

// ── Modal ──────────────────────────────────────────────────
const modalCreate   = $('modal-create');
const modalClose    = $('modal-close');
const modalName     = $('modal-name');
const modalFilterTabs = document.querySelectorAll('#modal-filter-tabs .filter-tab');
const modalVs       = $('modal-vs');
const modalVsText   = $('modal-vs-text');
const modalVsDrop   = $('modal-vs-drop');
const modalVsLoad   = $('modal-vs-loading');
const modalVsList   = $('modal-vs-list');
const mlGrid        = $('ml-grid');
const mlBtns        = document.querySelectorAll('.ml-btn');
const modalRam      = $('modal-ram');
const modalRamVal   = $('modal-ram-val');
const btnModalCancel= $('btn-modal-cancel');
const btnModalCreate= $('btn-modal-create');

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let allVersions     = [];
let selectedInstId  = null;
let isLaunching     = false;
let updateInfo      = null;

// Modal state
let modalFilter     = 'release';
let modalSelVersion = null;
let modalSelML      = 'none';

// Settings object (persisted to localStorage)
const DEFAULT_SETTINGS = { ram: 2048, javaPath: '', username: 'Player' };
let settings = { ...DEFAULT_SETTINGS };

// Instances array (persisted to localStorage)
let instances = [];

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
function loadStorage() {
  try {
    const raw = localStorage.getItem('yo-instances');
    instances = raw ? JSON.parse(raw) : [];
  } catch { instances = []; }
  try {
    const raw = localStorage.getItem('yo-settings');
    settings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch { settings = { ...DEFAULT_SETTINGS }; }
  try {
    const sk = localStorage.getItem('yo-skin');
    if (sk) renderSkinPreview(sk);
  } catch {}
}

function saveInstances() {
  localStorage.setItem('yo-instances', JSON.stringify(instances));
}
function saveSettings() {
  localStorage.setItem('yo-settings', JSON.stringify(settings));
}

// ═══════════════════════════════════════════════════════════
// WINDOW CONTROLS
// ═══════════════════════════════════════════════════════════
btnMinimize.addEventListener('click', () => window.launcher.minimize());
btnClose.addEventListener('click',    () => window.launcher.close());

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════
const TABS = {
  instances: tabInstances,
  skins:     tabSkins,
  settings:  tabSettings,
};

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    Object.values(TABS).forEach(p => p.classList.add('hidden'));
    TABS[t].classList.remove('hidden');
  });
});

// ═══════════════════════════════════════════════════════════
// USERNAME
// ═══════════════════════════════════════════════════════════
function loadUsername() {
  inputUsername.value = settings.username;
}
inputUsername.addEventListener('input', () => {
  settings.username = inputUsername.value;
  saveSettings();
});

// ═══════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════
function setStatus(type, msg) {
  statusDot.className = `status-dot ${type}`;
  statusText.textContent = msg;
}

// ═══════════════════════════════════════════════════════════
// INSTANCES — RENDER
// ═══════════════════════════════════════════════════════════
const ML_LABELS = { none:'Vanilla', forge:'Forge', fabric:'Fabric', optifine:'OptiFine' };
const VT_LABELS = { release:'REL', snapshot:'SNAP', old_beta:'BETA', old_alpha:'ALPHA' };
const VT_CLASS  = { release:'badge-release', snapshot:'badge-snapshot', old_beta:'badge-old_beta', old_alpha:'badge-old_alpha' };

function renderInstances() {
  instancesGrid.innerHTML = '';

  if (instances.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    instances.forEach(inst => {
      const card = document.createElement('div');
      card.className = 'instance-card' + (inst.id === selectedInstId ? ' selected' : '');
      card.dataset.id = inst.id;
      card.innerHTML = `
        <div class="ic-top">
          <div class="ic-name">${escHtml(inst.name)}</div>
          <div class="ic-badges">
            <span class="badge ${VT_CLASS[inst.versionType] || 'badge-release'}">${VT_LABELS[inst.versionType] || 'REL'}</span>
            <span class="badge badge-ml">${ML_LABELS[inst.modLoader] || 'Vanilla'}</span>
            <span class="badge badge-ram">${inst.ram} MB</span>
          </div>
        </div>
        <div class="ic-bottom">
          <span class="ic-ver-text">${escHtml(inst.version)}</span>
          <button class="ic-delete" data-id="${inst.id}" title="Удалить">✕</button>
        </div>`;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('ic-delete')) return;
        selectInstance(inst.id);
      });
      card.querySelector('.ic-delete').addEventListener('click', e => {
        e.stopPropagation();
        deleteInstance(inst.id);
      });
      instancesGrid.appendChild(card);
    });
  }

  // Always append "new" card
  const newCard = document.createElement('div');
  newCard.className = 'instance-card-new';
  newCard.innerHTML = `<div class="icn-plus">+</div><div class="icn-text">СОЗДАТЬ</div>`;
  newCard.addEventListener('click', openModal);
  instancesGrid.appendChild(newCard);

  updatePlayDetail();
}

function selectInstance(id) {
  selectedInstId = id;
  renderInstances();
  updatePlayDetail();
}

function deleteInstance(id) {
  instances = instances.filter(i => i.id !== id);
  if (selectedInstId === id) {
    selectedInstId = null;
  }
  saveInstances();
  renderInstances();
  updatePlayDetail();
}

function updatePlayDetail() {
  const inst = instances.find(i => i.id === selectedInstId);
  if (!inst) {
    detailEmpty.classList.remove('hidden');
    detailInfo.classList.add('hidden');
    playBtn.disabled = true;
    playBtn.classList.remove('update-mode');
    return;
  }
  detailEmpty.classList.add('hidden');
  detailInfo.classList.remove('hidden');
  detailName.textContent = inst.name;
  dVerBadge.textContent  = inst.version;
  dVerBadge.className    = `badge ${VT_CLASS[inst.versionType] || 'badge-release'}`;
  dMlBadge.textContent   = ML_LABELS[inst.modLoader] || 'Vanilla';
  dRamBadge.textContent  = `${inst.ram} MB`;

  if (!isLaunching) {
    playBtn.disabled = false;

    // Check if this is an "update available" case — repurpose button
    if (updateInfo?.hasUpdate) {
      playBtn.classList.add('update-mode');
      playText.textContent = '↓ ОБНОВИТЬ';
    } else {
      playBtn.classList.remove('update-mode');
      playText.textContent = 'ИГРАТЬ';
    }
  }
}

// ═══════════════════════════════════════════════════════════
// INSTANCES — CREATE (modal)
// ═══════════════════════════════════════════════════════════
function openModal() {
  modalName.value = '';
  modalSelVersion = null;
  modalSelML = 'none';
  modalFilter = 'release';
  modalRam.value = settings.ram;
  modalRamVal.textContent = `${settings.ram} MB`;

  // Reset filter tabs
  modalFilterTabs.forEach(t => t.classList.toggle('active', t.dataset.filter === 'release'));

  // Reset ML buttons
  mlBtns.forEach(b => b.classList.toggle('active', b.dataset.ml === 'none'));

  // Reset version display
  modalVsText.textContent = 'Выберите версию...';
  modalVs.classList.remove('open');
  btnModalCreate.disabled = true;

  renderModalVersionList();
  modalCreate.classList.remove('hidden');
  modalName.focus();
}

function closeModal() {
  modalCreate.classList.add('hidden');
  modalVs.classList.remove('open');
}

modalClose.addEventListener('click', closeModal);
btnModalCancel.addEventListener('click', closeModal);
modalCreate.addEventListener('click', e => {
  if (e.target === modalCreate) closeModal();
});

// Validate create button
function validateModal() {
  btnModalCreate.disabled = !(modalName.value.trim() && modalSelVersion);
}
modalName.addEventListener('input', validateModal);

// Modal version filter tabs
modalFilterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modalFilterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    modalFilter = tab.dataset.filter;
    // Reset selection if type changed
    if (modalSelVersion && modalSelVersion.type !== modalFilter) {
      modalSelVersion = null;
      modalVsText.textContent = 'Выберите версию...';
      validateModal();
    }
    renderModalVersionList();
  });
});

// Modal version select dropdown
modalVs.addEventListener('click', () => {
  modalVs.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!modalVs.contains(e.target)) modalVs.classList.remove('open');
});

function renderModalVersionList() {
  modalVsList.innerHTML = '';
  const filtered = allVersions.filter(v => v.type === modalFilter);

  if (allVersions.length === 0) {
    modalVsLoad.classList.remove('hidden');
    return;
  }
  modalVsLoad.classList.add('hidden');

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Нет версий';
    li.style.cssText = 'color:#444;font-size:7px;padding:12px';
    modalVsList.appendChild(li);
    return;
  }

  filtered.forEach(v => {
    const li = document.createElement('li');
    if (modalSelVersion?.id === v.id) li.classList.add('selected');

    const nm = document.createElement('span');
    nm.textContent = v.id;

    const badge = document.createElement('span');
    badge.className = 'ver-badge';
    badge.textContent = VT_LABELS[v.type] || v.type;
    badge.style.color = typeColor(v.type);

    li.appendChild(nm);
    li.appendChild(badge);
    li.addEventListener('click', () => {
      modalSelVersion = v;
      modalVsText.textContent = v.id;
      modalVs.classList.remove('open');
      validateModal();
    });
    modalVsList.appendChild(li);
  });
}

// ML buttons
mlBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    mlBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    modalSelML = btn.dataset.ml;
  });
});

// RAM slider in modal
modalRam.addEventListener('input', () => {
  modalRamVal.textContent = `${modalRam.value} MB`;
});

// Create instance
btnModalCreate.addEventListener('click', () => {
  if (!modalName.value.trim() || !modalSelVersion) return;

  const inst = {
    id:          crypto.randomUUID(),
    name:        modalName.value.trim(),
    version:     modalSelVersion.id,
    versionType: modalSelVersion.type,
    modLoader:   modalSelML,
    ram:         parseInt(modalRam.value, 10),
    createdAt:   Date.now(),
  };
  instances.push(inst);
  saveInstances();
  selectedInstId = inst.id;
  closeModal();
  renderInstances();
});

// ═══════════════════════════════════════════════════════════
// LAUNCH GAME
// ═══════════════════════════════════════════════════════════
playBtn.addEventListener('click', async () => {
  if (isLaunching) return;

  // If update-mode, open browser instead of launching
  if (updateInfo?.hasUpdate) {
    if (updateInfo.url) window.launcher.openUrl(updateInfo.url);
    return;
  }

  const inst = instances.find(i => i.id === selectedInstId);
  if (!inst) return;

  const username = (inputUsername.value.trim() || 'Player').slice(0, 16);
  inputUsername.value = username;
  settings.username = username;
  saveSettings();

  startLaunch();

  const result = await window.launcher.launchGame({
    version:   inst.version,
    username,
    ram:       inst.ram,
    javaPath:  settings.javaPath,
    modLoader: inst.modLoader,
  });

  if (!result.success) {
    stopLaunch();
    setStatus('error', `Ошибка: ${(result.error || '').slice(0, 50)}`);
  }
});

function startLaunch() {
  isLaunching = true;
  playBtn.disabled = true;
  playBtn.classList.add('launching');
  playText.textContent = 'ЗАПУСК...';
  progressSec.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressPct.textContent = '0%';
  progressLabel.textContent = 'Инициализация...';
  progressStats.textContent = '—';
  setStatus('busy', 'Запуск Minecraft...');

  window.launcher.onLaunchProgress(handleProgress);
  window.launcher.onLaunchLog(handleLog);
  window.launcher.onLaunchClosed(handleClosed);
}

function stopLaunch() {
  isLaunching = false;
  playBtn.classList.remove('launching');
  progressSec.classList.add('hidden');
  window.launcher.removeAllListeners('launch-progress');
  window.launcher.removeAllListeners('launch-log');
  window.launcher.removeAllListeners('launch-closed');
  updatePlayDetail(); // restore play button state
}

// ─── FIXED progress handler ───────────────────────────────
// minecraft-launcher-core emits: { type: string, task: number, total: number }
// task/total are NUMBERS, not strings.
function handleProgress(data) {
  const task  = typeof data.task  === 'number' ? data.task  : 0;
  const total = typeof data.total === 'number' ? data.total : 0;

  let pct = 0;
  if (total > 0) pct = Math.min(100, Math.floor((task / total) * 100));

  progressFill.style.width = `${pct}%`;
  progressPct.textContent  = `${pct}%`;

  const typeNames = {
    'assets':      'ресурсов игры',
    'classes':     'библиотек',
    'natives':     'нативных файлов',
    'assets-copy': 'распаковка ресурсов',
  };
  const typeRu = typeNames[data.type] || (data.type ? String(data.type) : 'файлов');

  progressLabel.textContent = total > 0
    ? `Загрузка ${typeRu}`
    : `Обработка ${typeRu}...`;

  progressStats.textContent = total > 0
    ? `${task} из ${total} файлов`
    : '—';
}

function handleLog(data) {
  if (data.type === 'data') {
    setStatus('busy', 'Игра запущена ▶');
  }
}

function handleClosed(code) {
  stopLaunch();
  setStatus('ready', `Игра закрыта (код: ${code})`);
}

// ═══════════════════════════════════════════════════════════
// SKINS
// ═══════════════════════════════════════════════════════════
btnUploadSkin.addEventListener('click', () => skinFile.click());
btnResetSkin.addEventListener('click', () => {
  localStorage.removeItem('yo-skin');
  skinLabel.textContent = 'Нет скина (Steve)';
  clearSkinCanvas();
});
skinFile.addEventListener('change', () => {
  const file = skinFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    localStorage.setItem('yo-skin', b64);
    skinLabel.textContent = file.name;
    renderSkinPreview(b64);
  };
  reader.readAsDataURL(file);
  skinFile.value = '';
});
linkMojang?.addEventListener('click', () => {
  window.launcher.openUrl('https://www.minecraft.net/profile/skin');
});

function clearSkinCanvas() {
  const ctx = skinCanvas.getContext('2d');
  ctx.clearRect(0, 0, skinCanvas.width, skinCanvas.height);
  // Draw placeholder silhouette
  ctx.fillStyle = '#1e1e1e';
  const S = 5;
  // Head
  ctx.fillRect(20, 0,  40, 40);
  // Body
  ctx.fillRect(20, 40, 40, 60);
  // Arms
  ctx.fillRect(0,  40, 20, 60);
  ctx.fillRect(60, 40, 20, 60);
  // Legs
  ctx.fillRect(20, 100,20, 60);
  ctx.fillRect(40, 100,20, 60);
}

function renderSkinPreview(src) {
  const img = new Image();
  img.onload = () => {
    const ctx = skinCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    skinCanvas.width  = 80;
    skinCanvas.height = 160;
    ctx.clearRect(0, 0, 80, 160);

    const S = 5; // each MC pixel → 5 canvas pixels

    // Create temp canvas to inspect pixels
    const tmp = document.createElement('canvas');
    tmp.width  = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const tc = tmp.getContext('2d');
    tc.drawImage(img, 0, 0);

    // Helper: draw a skin region at canvas position
    function dr(sx, sy, sw, sh, dx, dy, mirror = false) {
      if (mirror) {
        ctx.save();
        ctx.translate(dx + sw * S, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw * S, sh * S);
        ctx.restore();
      } else {
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw * S, sh * S);
      }
    }

    // Check if skin has new-format left arm/leg data (alpha > 0)
    const laPixel = tc.getImageData(36, 52, 1, 1).data;
    const llPixel = tc.getImageData(20, 52, 1, 1).data;
    const hasLeftArm = laPixel[3] > 0;
    const hasLeftLeg = llPixel[3] > 0;

    // ── HEAD (face: x=8, y=8, size 8×8) ──────────────────
    dr(8, 8, 8, 8, 20, 0);

    // ── BODY (front: x=20, y=20, size 8×12) ──────────────
    dr(20, 20, 8, 12, 20, 40);

    // ── RIGHT ARM (front: x=44, y=20, size 4×12) ─────────
    dr(44, 20, 4, 12, 60, 40);

    // ── LEFT ARM ─────────────────────────────────────────
    if (hasLeftArm) {
      dr(36, 52, 4, 12, 0, 40);
    } else {
      dr(44, 20, 4, 12, 0, 40, true);
    }

    // ── RIGHT LEG (front: x=4, y=20, size 4×12) ──────────
    dr(4, 20, 4, 12, 40, 100);

    // ── LEFT LEG ─────────────────────────────────────────
    if (hasLeftLeg) {
      dr(20, 52, 4, 12, 20, 100);
    } else {
      dr(4, 20, 4, 12, 20, 100, true);
    }
  };
  img.onerror = clearSkinCanvas;
  img.src = src;
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
function loadSettingsUI() {
  settingsRam.value    = settings.ram;
  settingsRamV.textContent = `${settings.ram} MB`;
  settingsJava.value   = settings.javaPath;
  aboutVer.textContent = 'YoLauncher v1.1.0';

  window.launcher.getGameDir().then(dir => {
    gameDirBox.textContent = dir;
  }).catch(() => {
    gameDirBox.textContent = '—';
  });
}

settingsRam.addEventListener('input', () => {
  settings.ram = parseInt(settingsRam.value, 10);
  settingsRamV.textContent = `${settings.ram} MB`;
  saveSettings();
});

settingsJava.addEventListener('input', () => {
  settings.javaPath = settingsJava.value;
  saveSettings();
});

btnCheckUpd.addEventListener('click', async () => {
  setStatus('busy', 'Проверка обновлений...');
  btnCheckUpd.textContent = '↻ ПРОВЕРКА...';
  btnCheckUpd.disabled = true;

  const info = await window.launcher.checkUpdate().catch(() => null);
  btnCheckUpd.textContent = '↻ ПРОВЕРИТЬ';
  btnCheckUpd.disabled = false;

  if (info?.hasUpdate) {
    showUpdateBanner(info);
    setStatus('ready', `Обновление: v${info.latest}`);
  } else {
    setStatus('ready', 'Установлена последняя версия');
  }
});

// ═══════════════════════════════════════════════════════════
// UPDATE BANNER
// ═══════════════════════════════════════════════════════════
function showUpdateBanner(info) {
  updateInfo = info;
  updateVer.textContent = `v${info.latest}`;
  updateBanner.classList.remove('hidden');
  appLayout.classList.add('with-banner');
  updatePlayDetail(); // re-render play button (blue mode)
}

btnDoUpdate.addEventListener('click', () => {
  if (updateInfo?.url) window.launcher.openUrl(updateInfo.url);
});

btnDismissUpd.addEventListener('click', () => {
  updateBanner.classList.add('hidden');
  appLayout.classList.remove('with-banner');
  // Don't clear updateInfo — play button stays blue, but banner hidden
  // Actually restore normal play:
  updateInfo = null;
  updatePlayDetail();
});

// ═══════════════════════════════════════════════════════════
// VERSION LOADER
// ═══════════════════════════════════════════════════════════
async function loadVersions() {
  setStatus('busy', 'Загрузка версий...');
  try {
    allVersions = await window.launcher.fetchVersions();
    const releaseCount = allVersions.filter(v => v.type === 'release').length;
    setStatus('ready', `Загружено ${allVersions.length} версий`);
    // If modal is open, re-render its list
    if (!modalCreate.classList.contains('hidden')) {
      renderModalVersionList();
    }
  } catch (err) {
    setStatus('error', 'Нет сети');
    console.error('[versions]', err);
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function typeColor(type) {
  return { release:'#5ab84a', snapshot:'#f5c542', old_beta:'#e0884a', old_alpha:'#e05252' }[type] || '#888';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

btnNewInst.addEventListener('click', openModal);

// ═══════════════════════════════════════════════════════════
// BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════
async function boot() {
  // Load storage first
  loadStorage();
  loadUsername();
  loadSettingsUI();

  // Set version labels
  window.launcher.getVersion().then(v => {
    appVersion.textContent  = `v${v}`;
    sidebarVer.textContent  = `v${v}`;
    aboutVer.textContent    = `YoLauncher v${v}`;
  }).catch(() => {});

  // Render instances (may be empty)
  renderInstances();
  clearSkinCanvas();

  // Load stored skin
  try {
    const sk = localStorage.getItem('yo-skin');
    if (sk) {
      renderSkinPreview(sk);
      skinLabel.textContent = 'Загруженный скин';
    }
  } catch {}

  // Load Minecraft versions (async, non-blocking)
  loadVersions();

  // Check for launcher updates silently
  window.launcher.checkUpdate().then(info => {
    if (info?.hasUpdate) showUpdateBanner(info);
  }).catch(() => {});
}

boot();
