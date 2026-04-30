/**
 * YoLauncher v1.2.0-pre · renderer.js
 * Instances, skins, settings, Java management, YoID auth.
 */

// ═══════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const btnMinimize   = $('btn-minimize');
const btnClose      = $('btn-close');
const appVersion    = $('app-version');
const sidebarVer    = $('sidebar-ver');
const updateBanner  = $('update-banner');
const updateVer     = $('update-ver');
const btnDoUpdate   = $('btn-do-update');
const btnDismissUpd = $('btn-dismiss-update');
const appLayout     = $('app-layout');
const navBtns       = document.querySelectorAll('.nav-btn');
const tabInstances  = $('tab-instances');
const tabSkins      = $('tab-skins');
const tabSettings   = $('tab-settings');
const inputUsername = $('input-username');
const statusDot     = $('status-dot');
const statusText    = $('status-text');

// Instances
const btnNewInst    = $('btn-new-instance');
const instancesGrid = $('instances-grid');
const emptyState    = $('empty-state');
const detailEmpty   = $('detail-empty');
const detailInfo    = $('detail-info');
const detailName    = $('detail-name');
const dVerBadge     = $('d-ver-badge');
const dMlBadge      = $('d-ml-badge');
const dRamBadge     = $('d-ram-badge');
const dJavaBadge    = $('d-java-badge');
const progressSec   = $('progress-section');
const progressLabel = $('progress-label');
const progressPct   = $('progress-pct');
const progressFill  = $('progress-fill');
const progressStats = $('progress-stats');
const javaWarn      = $('java-warn');
const javaWarnTxt   = $('java-warn-txt');
const javaWarnBtn   = $('java-warn-btn');
const playBtn       = $('play-btn');
const playText      = $('play-text');

// Skins
const skinCanvas    = $('skin-canvas');
const skinLabel     = $('skin-label');
const btnUploadSkin = $('btn-upload-skin');
const btnResetSkin  = $('btn-reset-skin');
const skinFile      = $('skin-file');
const linkMojang    = $('link-mojang');

// Settings
const settingsRam  = $('settings-ram');
const settingsRamV = $('settings-ram-val');
const settingsJava = $('settings-java');
const gameDirBox   = $('game-dir-box');
const sysJavaBox   = $('sys-java-box');
const aboutVer     = $('about-ver');
const btnCheckUpd  = $('btn-check-update');

// Java controls
const JAVA_VERS = [8, 17, 21];
const javaControls = {};
JAVA_VERS.forEach(v => {
  javaControls[v] = {
    status:   $(`java${v}-status`),
    dlBtn:    $(`btn-java${v}-dl`),
    progress: $(`java${v}-progress`),
    fill:     $(`java${v}-fill`),
    label:    $(`java${v}-label`),
  };
});

// Create instance modal
const modalCreate     = $('modal-create');
const modalClose      = $('modal-close');
const modalName       = $('modal-name');
const modalFilterTabs = document.querySelectorAll('#modal-filter-tabs .filter-tab');
const modalVs         = $('modal-vs');
const modalVsText     = $('modal-vs-text');
const modalVsLoad     = $('modal-vs-loading');
const modalVsList     = $('modal-vs-list');
const mlBtns          = document.querySelectorAll('.ml-btn');
const modalRam        = $('modal-ram');
const modalRamVal     = $('modal-ram-val');
const btnModalCancel  = $('btn-modal-cancel');
const btnModalCreate  = $('btn-modal-create');

// YoID modal
const modalYoid        = $('modal-yoid');
const yoidModalClose   = $('yoid-modal-close');
const yoidTabs         = document.querySelectorAll('.yoid-tab');
const yoidNameField    = $('yoid-name-field');
const yoidDisplayname  = $('yoid-displayname');
const yoidEmail        = $('yoid-email');
const yoidPassword     = $('yoid-password');
const yoidError        = $('yoid-error');
const yoidCancel       = $('yoid-cancel');
const yoidSubmit       = $('yoid-submit');
const yoidSubmitText   = $('yoid-submit-text');
const yoidSpinner      = $('yoid-spinner');
const yoidModeLbl      = $('yoid-modal-mode-label');
const btnYoidOpen      = $('btn-yoid-open');
const btnYoidLogout    = $('btn-yoid-logout');
const yoidOfflineBlock = $('yoid-offline-block');
const yoidLoggedBlock  = $('yoid-logged-block');
const yoidCardName     = $('yoid-card-name');
const yoidCardEmail    = $('yoid-card-email');
const yoidAvatar       = $('yoid-avatar');

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let allVersions     = [];
let selectedInstId  = null;
let isLaunching     = false;
let updateInfo      = null;
let javaStatus      = {};
let downloadingJava = new Set();
let yoidUser        = null;    // Firebase User object
let yoidUUID        = null;    // SHA-256 UUID для Minecraft
let yoidMode        = 'login'; // login | register

let modalFilter     = 'release';
let modalSelVersion = null;
let modalSelML      = 'none';

const DEFAULT_SETTINGS = { ram: 2048, javaPath: '', username: 'Player' };
let settings  = { ...DEFAULT_SETTINGS };
let instances = [];

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
function loadStorage() {
  try { instances = JSON.parse(localStorage.getItem('yo-instances') || '[]'); } catch { instances = []; }
  try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('yo-settings') || '{}') }; } catch { settings = { ...DEFAULT_SETTINGS }; }
}
function saveInstances() { localStorage.setItem('yo-instances', JSON.stringify(instances)); }
function saveSettings()  { localStorage.setItem('yo-settings',  JSON.stringify(settings)); }

// ═══════════════════════════════════════════════════════════
// FIREBASE / YoID
// ═══════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDGRj_yv26W782VkfQOlS000YEOiJBfuN8',
  authDomain:        'yoid-software-network.firebaseapp.com',
  projectId:         'yoid-software-network',
  storageBucket:     'yoid-software-network.firebasestorage.app',
  messagingSenderId: '562545829457',
  appId:             '1:562545829457:web:9c5b80ef8f65f1b60a3a70',
  measurementId:     'G-HCJ7D5M3T2',
};

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('[YoID] Firebase SDK не загружен (нет сети?)');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

  // Явно выставляем LOCAL persistence — сессия переживает перезапуск Electron
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => {
    console.warn('[YoID] persistence error:', e);
  });

  firebase.auth().onAuthStateChanged(async user => {
    yoidUser = user;
    yoidUUID = user ? await buildYoIDUUID(user.uid) : null;
    updateYoIDSidebar();
    updatePlayDetail();

    if (user) {
      setStatus('ready', `YoID: ${yoidDisplayName(user)}`);
    }
  });
}

/** SHA-256(YoID:{uid}) → UUID v4 формат */
async function buildYoIDUUID(uid) {
  const enc  = new TextEncoder();
  const buf  = await crypto.subtle.digest('SHA-256', enc.encode(`YoID:${uid}`));
  const hex  = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Вставляем version 4 и variant bits
  const u = hex.slice(0, 32);
  return `${u.slice(0,8)}-${u.slice(8,12)}-4${u.slice(13,16)}-${((parseInt(u.slice(16,18),16)&0x3f)|0x80).toString(16)}${u.slice(18,20)}-${u.slice(20,32)}`;
}

/** Отображаемое имя YoID пользователя для Minecraft (макс 16) */
function yoidDisplayName(user) {
  return (user.displayName || user.email.split('@')[0]).slice(0, 16);
}

/** Инициалы для аватара */
function yoidInitials(user) {
  const name = user.displayName || user.email;
  return name.slice(0, 2).toUpperCase();
}

function updateYoIDSidebar() {
  const usernameLabel = $('username-label');

  if (yoidUser) {
    // Авторизован — показываем карточку, скрываем оффлайн-блок
    yoidOfflineBlock.classList.add('hidden');
    yoidLoggedBlock.classList.remove('hidden');

    const name = yoidDisplayName(yoidUser);
    yoidCardName.textContent  = name;
    yoidCardEmail.textContent = yoidUser.email;
    yoidAvatar.textContent    = yoidInitials(yoidUser);

    // Блокируем поле ника — имя берётся из YoID
    inputUsername.value     = name;
    inputUsername.readOnly  = true;
    inputUsername.title     = 'Имя привязано к YoID аккаунту';
    inputUsername.classList.add('s-input-locked');

    // Меняем лейбл
    if (usernameLabel) usernameLabel.childNodes[usernameLabel.childNodes.length - 1].textContent = ' YoID ИМЯ';
  } else {
    // Не авторизован — показываем оффлайн-блок
    yoidOfflineBlock.classList.remove('hidden');
    yoidLoggedBlock.classList.add('hidden');

    // Разблокируем поле ника
    inputUsername.value     = settings.username;
    inputUsername.readOnly  = false;
    inputUsername.title     = '';
    inputUsername.classList.remove('s-input-locked');

    // Восстанавливаем лейбл
    if (usernameLabel) usernameLabel.childNodes[usernameLabel.childNodes.length - 1].textContent = ' ИГРОК';
  }
}

// ─── YoID Modal открыть / закрыть ────────────────────────
function openYoidModal() {
  yoidEmail.value    = '';
  yoidPassword.value = '';
  yoidDisplayname.value = '';
  yoidError.classList.add('hidden');
  yoidError.textContent = '';
  setYoidMode('login');
  modalYoid.classList.remove('hidden');
  setTimeout(() => yoidEmail.focus(), 50);
}
function closeYoidModal() { modalYoid.classList.add('hidden'); }

function setYoidMode(mode) {
  yoidMode = mode;
  yoidTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  yoidNameField.style.display = mode === 'register' ? '' : 'none';
  yoidSubmitText.textContent  = mode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ';
  yoidModeLbl.textContent     = mode === 'login' ? 'Вход' : 'Регистрация';
  yoidError.classList.add('hidden');
}

btnYoidOpen.addEventListener('click', openYoidModal);
btnYoidLogout.addEventListener('click', async () => {
  if (typeof firebase === 'undefined' || !yoidUser) return;
  try {
    btnYoidLogout.disabled = true;
    await firebase.auth().signOut();
    // onAuthStateChanged сам вызовет updateYoIDSidebar()
  } catch (err) {
    console.error('[YoID] signOut error:', err);
    setStatus('error', 'Ошибка выхода из YoID');
  } finally {
    btnYoidLogout.disabled = false;
  }
});
yoidModalClose.addEventListener('click', closeYoidModal);
yoidCancel.addEventListener('click', closeYoidModal);
modalYoid.addEventListener('click', e => { if (e.target === modalYoid) closeYoidModal(); });

yoidTabs.forEach(tab => {
  tab.addEventListener('click', () => setYoidMode(tab.dataset.mode));
});

// Firebase error code → русский текст
function firebaseErrRu(code) {
  const map = {
    'auth/user-not-found':      'Пользователь не найден',
    'auth/wrong-password':      'Неверный пароль',
    'auth/email-already-in-use':'Email уже используется',
    'auth/invalid-email':       'Некорректный email',
    'auth/weak-password':       'Пароль слишком простой (мин. 6 символов)',
    'auth/too-many-requests':   'Слишком много попыток. Попробуйте позже',
    'auth/network-request-failed': 'Ошибка сети',
    'auth/invalid-credential':  'Неверный email или пароль',
  };
  return map[code] || `Ошибка: ${code}`;
}

yoidSubmit.addEventListener('click', async () => {
  if (typeof firebase === 'undefined') {
    showYoidError('Firebase недоступен (нет сети?)');
    return;
  }

  const email = yoidEmail.value.trim();
  const pass  = yoidPassword.value;
  if (!email || !pass) { showYoidError('Заполните все поля'); return; }
  if (pass.length < 6) { showYoidError('Пароль минимум 6 символов'); return; }

  setYoidLoading(true);
  yoidError.classList.add('hidden');

  try {
    if (yoidMode === 'login') {
      await firebase.auth().signInWithEmailAndPassword(email, pass);
    } else {
      // Регистрация
      const rawName     = yoidDisplayname.value.trim();
      const displayName = (rawName || email.split('@')[0]).slice(0, 16);
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
      // Сразу прописываем displayName в профиль
      await cred.user.updateProfile({ displayName });
      // Принудительно обновляем yoidUser чтобы displayName был актуален
      await cred.user.reload();
      yoidUser = firebase.auth().currentUser;
    }
    closeYoidModal();
  } catch (err) {
    showYoidError(firebaseErrRu(err.code));
  } finally {
    setYoidLoading(false);
  }
});

function showYoidError(msg) {
  yoidError.textContent = msg;
  yoidError.classList.remove('hidden');
}

function setYoidLoading(on) {
  yoidSubmit.disabled = on;
  yoidSpinner.classList.toggle('hidden', !on);
  yoidSpinner.style.display = on ? 'inline-block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// WINDOW CONTROLS
// ═══════════════════════════════════════════════════════════
btnMinimize.addEventListener('click', () => window.launcher.minimize());
btnClose.addEventListener('click',    () => window.launcher.close());

// ═══════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════
const TABS = { instances: tabInstances, skins: tabSkins, settings: tabSettings };

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    Object.values(TABS).forEach(p => p.classList.add('hidden'));
    TABS[t].classList.remove('hidden');
    if (t === 'settings') refreshJavaStatus();
  });
});

// ═══════════════════════════════════════════════════════════
// USERNAME
// ═══════════════════════════════════════════════════════════
function loadUsername() {
  // Если YoID уже авторизован — поле заполнит updateYoIDSidebar()
  if (!yoidUser) inputUsername.value = settings.username;
}
inputUsername.addEventListener('input', () => {
  // Только если не залогинен через YoID
  if (!yoidUser) { settings.username = inputUsername.value; saveSettings(); }
});

// ═══════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════
function setStatus(type, msg) {
  statusDot.className  = `status-dot ${type}`;
  statusText.textContent = msg;
}

// ═══════════════════════════════════════════════════════════
// JAVA — STATUS PILLS
// ═══════════════════════════════════════════════════════════
function renderJavaPill(version, data) {
  const ctrl = javaControls[version];
  if (!ctrl) return;
  const pill = ctrl.status.querySelector('.jpill-dot');
  const txt  = ctrl.status.querySelector('.jpill-txt');

  if (downloadingJava.has(version)) {
    pill.className = 'jpill-dot busy';
    txt.textContent = 'Загрузка...';
    ctrl.dlBtn.style.display = 'none';
    ctrl.progress.classList.remove('hidden');
    return;
  }
  if (data?.installed) {
    pill.className = 'jpill-dot ok';
    txt.textContent = 'Установлена';
    ctrl.dlBtn.style.display = 'none';
    ctrl.progress.classList.add('hidden');
  } else {
    pill.className = 'jpill-dot miss';
    txt.textContent = 'Не найдена';
    ctrl.dlBtn.style.display = '';
    ctrl.progress.classList.add('hidden');
  }
}

async function refreshJavaStatus() {
  try {
    javaStatus = await window.launcher.getJavaStatus();
    JAVA_VERS.forEach(v => renderJavaPill(v, javaStatus[v]));
    const sys = javaStatus.system;
    sysJavaBox.textContent = sys?.version ? `Java ${sys.version} (системная)` : 'Не обнаружена';
  } catch (e) { console.error('[java status]', e); }
}

JAVA_VERS.forEach(v => {
  const ctrl = javaControls[v];
  if (!ctrl?.dlBtn) return;
  ctrl.dlBtn.addEventListener('click', async () => {
    if (downloadingJava.has(v)) return;
    downloadingJava.add(v);
    renderJavaPill(v, javaStatus[v]);
    setStatus('busy', `Скачивание Java ${v}...`);
    const result = await window.launcher.downloadJava(v);
    downloadingJava.delete(v);
    setStatus(result.success ? 'ready' : 'error',
      result.success ? `Java ${v} установлена` : `Ошибка Java ${v}: ${(result.error || '').slice(0, 40)}`);
    await refreshJavaStatus();
    updatePlayDetail();
  });
});

window.launcher.onJavaProgress(({ version, pct, status }) => {
  const ctrl = javaControls[version];
  if (!ctrl) return;
  renderJavaPill(version, null);
  ctrl.fill.style.width  = `${pct}%`;
  ctrl.label.textContent = status === 'extracting' ? 'Распаковка...' : `${pct}%`;
});

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
      const mlColor = { forge:'#e0884a', fabric:'#88aacc', optifine:'#f5c542' }[inst.modLoader] || '';
      if (mlColor) card.style.borderLeft = `3px solid ${mlColor}`;
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
          <button class="ic-delete" title="Удалить">
            <svg width="8" height="8" viewBox="0 0 8 8"><line x1="0" y1="0" x2="8" y2="8" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>`;
      card.addEventListener('click', e => { if (e.target.closest('.ic-delete')) return; selectInstance(inst.id); });
      card.querySelector('.ic-delete').addEventListener('click', e => { e.stopPropagation(); deleteInstance(inst.id); });
      instancesGrid.appendChild(card);
    });
  }
  const newCard = document.createElement('div');
  newCard.className = 'instance-card-new';
  newCard.innerHTML = `<div class="icn-plus">+</div><div class="icn-text">СОЗДАТЬ</div>`;
  newCard.addEventListener('click', openModal);
  instancesGrid.appendChild(newCard);
  updatePlayDetail();
}

function selectInstance(id) { selectedInstId = id; renderInstances(); }
function deleteInstance(id) {
  instances = instances.filter(i => i.id !== id);
  if (selectedInstId === id) selectedInstId = null;
  saveInstances(); renderInstances();
}

// ─── Java availability ────────────────────────────────────
function neededJavaMajor(mcVersion) {
  const p = (mcVersion || '').split('.').map(Number);
  const minor = p[1] || 0, patch = p[2] || 0;
  if (minor >= 21) return 21;
  if (minor === 20 && patch >= 5) return 21;
  if (minor >= 17) return 17;
  return 8;
}
function javaAvailableFor(mcVersion) {
  const needed = neededJavaMajor(mcVersion);
  for (const v of [8,17,21]) { if (v >= needed && javaStatus[v]?.installed) return true; }
  if (javaStatus.system?.version >= needed) return true;
  if (settings.javaPath?.trim()) return true;
  return false;
}

async function updatePlayDetail() {
  const inst = instances.find(i => i.id === selectedInstId);
  javaWarn.classList.add('hidden');

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

  const needed = neededJavaMajor(inst.version);
  dJavaBadge.textContent = `Java ${needed}`;
  dJavaBadge.classList.remove('hidden');

  if (!isLaunching) {
    if (!javaAvailableFor(inst.version)) {
      javaWarnTxt.textContent = `Нужна Java ${needed} — не найдена`;
      javaWarn.classList.remove('hidden');
      javaWarnBtn.onclick = () => {
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('[data-tab="settings"]').classList.add('active');
        Object.values(TABS).forEach(p => p.classList.add('hidden'));
        tabSettings.classList.remove('hidden');
        refreshJavaStatus();
      };
      playBtn.disabled = true;
    } else {
      playBtn.disabled = false;
    }

    if (updateInfo?.hasUpdate) {
      playBtn.classList.add('update-mode');
      playText.textContent = '↓ ОБНОВИТЬ';
    } else {
      playBtn.classList.remove('update-mode');
      if (!playBtn.disabled) playText.textContent = 'ИГРАТЬ';
    }
  }
}

// ═══════════════════════════════════════════════════════════
// CREATE INSTANCE MODAL
// ═══════════════════════════════════════════════════════════
function openModal() {
  modalName.value = '';
  modalSelVersion = null; modalSelML = 'none'; modalFilter = 'release';
  modalRam.value  = settings.ram;
  modalRamVal.textContent = `${settings.ram} MB`;
  modalFilterTabs.forEach(t => t.classList.toggle('active', t.dataset.filter === 'release'));
  mlBtns.forEach(b => b.classList.toggle('active', b.dataset.ml === 'none'));
  modalVsText.textContent = 'Выберите версию...';
  modalVs.classList.remove('open');
  btnModalCreate.disabled = true;
  renderModalVersionList();
  modalCreate.classList.remove('hidden');
  modalName.focus();
}
function closeModal() { modalCreate.classList.add('hidden'); modalVs.classList.remove('open'); }

modalClose.addEventListener('click', closeModal);
btnModalCancel.addEventListener('click', closeModal);
modalCreate.addEventListener('click', e => { if (e.target === modalCreate) closeModal(); });

function validateModal() { btnModalCreate.disabled = !(modalName.value.trim() && modalSelVersion); }
modalName.addEventListener('input', validateModal);

modalFilterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modalFilterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    modalFilter = tab.dataset.filter;
    if (modalSelVersion && modalSelVersion.type !== modalFilter) {
      modalSelVersion = null; modalVsText.textContent = 'Выберите версию...'; validateModal();
    }
    renderModalVersionList();
  });
});

modalVs.addEventListener('click', () => modalVs.classList.toggle('open'));
document.addEventListener('click', e => { if (!modalVs.contains(e.target)) modalVs.classList.remove('open'); });

function renderModalVersionList() {
  modalVsList.innerHTML = '';
  const filtered = allVersions.filter(v => v.type === modalFilter);
  if (allVersions.length === 0) { $('modal-vs-loading').classList.remove('hidden'); return; }
  $('modal-vs-loading').classList.add('hidden');
  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Нет версий'; li.style.cssText = 'color:#444;font-size:7px;padding:12px';
    modalVsList.appendChild(li); return;
  }
  filtered.forEach(v => {
    const li = document.createElement('li');
    if (modalSelVersion?.id === v.id) li.classList.add('selected');
    const nm = document.createElement('span'); nm.textContent = v.id;
    const badge = document.createElement('span');
    badge.className = 'ver-badge'; badge.textContent = VT_LABELS[v.type] || v.type;
    badge.style.color = typeColor(v.type);
    li.appendChild(nm); li.appendChild(badge);
    li.addEventListener('click', () => {
      modalSelVersion = v; modalVsText.textContent = v.id;
      modalVs.classList.remove('open'); validateModal();
    });
    modalVsList.appendChild(li);
  });
}

mlBtns.forEach(btn => {
  btn.addEventListener('click', () => { mlBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); modalSelML = btn.dataset.ml; });
});
modalRam.addEventListener('input', () => { modalRamVal.textContent = `${modalRam.value} MB`; });

btnModalCreate.addEventListener('click', () => {
  if (!modalName.value.trim() || !modalSelVersion) return;
  const inst = {
    id: crypto.randomUUID(), name: modalName.value.trim(),
    version: modalSelVersion.id, versionType: modalSelVersion.type,
    modLoader: modalSelML, ram: parseInt(modalRam.value, 10), createdAt: Date.now(),
  };
  instances.push(inst); saveInstances(); selectedInstId = inst.id;
  closeModal(); renderInstances();
});

// ═══════════════════════════════════════════════════════════
// LAUNCH GAME
// ═══════════════════════════════════════════════════════════
playBtn.addEventListener('click', async () => {
  if (isLaunching) return;
  if (updateInfo?.hasUpdate) { if (updateInfo.url) window.launcher.openUrl(updateInfo.url); return; }
  const inst = instances.find(i => i.id === selectedInstId);
  if (!inst) return;

  // Определяем username и uuid в зависимости от YoID
  let username, uuid;
  if (yoidUser) {
    username = yoidDisplayName(yoidUser);
    uuid     = yoidUUID;
  } else {
    username = (inputUsername.value.trim() || 'Player').slice(0, 16);
    inputUsername.value = username;
    settings.username   = username;
    saveSettings();
    uuid = undefined; // main.js сам сгенерирует offlineUUID
  }

  startLaunch();
  const result = await window.launcher.launchGame({
    version:  inst.version,
    username,
    uuid,
    ram:      inst.ram,
    javaPath: settings.javaPath,
  });
  if (!result.success) { stopLaunch(); setStatus('error', `Ошибка: ${(result.error || '').slice(0, 50)}`); }
});

function startLaunch() {
  isLaunching = true;
  playBtn.disabled = true; playBtn.classList.add('launching');
  playText.textContent = 'ЗАПУСК...';
  progressSec.classList.remove('hidden');
  progressFill.style.width = '0%'; progressPct.textContent = '0%';
  progressLabel.textContent = 'Инициализация...'; progressStats.textContent = '—';
  javaWarn.classList.add('hidden');
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
  updatePlayDetail();
}

function handleProgress(data) {
  const task  = typeof data.task  === 'number' ? data.task  : 0;
  const total = typeof data.total === 'number' ? data.total : 0;
  const pct   = total > 0 ? Math.min(100, Math.floor((task / total) * 100)) : 0;
  progressFill.style.width = `${pct}%`; progressPct.textContent = `${pct}%`;
  const names = { assets:'ресурсов игры', classes:'библиотек', natives:'нативных файлов', 'assets-copy':'распаковка ресурсов' };
  const typeRu = names[data.type] || (data.type ? String(data.type) : 'файлов');
  progressLabel.textContent = total > 0 ? `Загрузка ${typeRu}` : `Обработка ${typeRu}...`;
  progressStats.textContent = total > 0 ? `${task} из ${total} файлов` : '—';
}
function handleLog(data)   { if (data.type === 'data') setStatus('busy', 'Игра запущена ▶'); }
function handleClosed(code){ stopLaunch(); setStatus('ready', `Игра закрыта (код: ${code})`); }

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
  const file = skinFile.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    localStorage.setItem('yo-skin', b64);
    skinLabel.textContent = file.name;
    renderSkinPreview(b64);
  };
  reader.readAsDataURL(file); skinFile.value = '';
});
linkMojang?.addEventListener('click', () => window.launcher.openUrl('https://www.minecraft.net/profile/skin'));

function clearSkinCanvas() {
  const ctx = skinCanvas.getContext('2d');
  ctx.clearRect(0, 0, skinCanvas.width, skinCanvas.height);
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(20,0,40,40); ctx.fillRect(20,40,40,60);
  ctx.fillRect(0,40,20,60); ctx.fillRect(60,40,20,60);
  ctx.fillRect(20,100,20,60); ctx.fillRect(40,100,20,60);
}

function renderSkinPreview(src) {
  const img = new Image();
  img.onload = () => {
    const ctx = skinCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    skinCanvas.width = 80; skinCanvas.height = 160;
    ctx.clearRect(0,0,80,160);
    const S = 5;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    const tc = tmp.getContext('2d'); tc.drawImage(img,0,0);
    function dr(sx,sy,sw,sh,dx,dy,mirror=false){
      if(mirror){ctx.save();ctx.translate(dx+sw*S,dy);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,sw,sh,0,0,sw*S,sh*S);ctx.restore();}
      else{ctx.drawImage(img,sx,sy,sw,sh,dx,dy,sw*S,sh*S);}
    }
    const la = tc.getImageData(36,52,1,1).data, ll = tc.getImageData(20,52,1,1).data;
    dr(8,8,8,8,20,0); dr(20,20,8,12,20,40); dr(44,20,4,12,60,40);
    la[3]>0?dr(36,52,4,12,0,40):dr(44,20,4,12,0,40,true);
    dr(4,20,4,12,40,100); ll[3]>0?dr(20,52,4,12,20,100):dr(4,20,4,12,20,100,true);
  };
  img.onerror = clearSkinCanvas; img.src = src;
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
function loadSettingsUI() {
  settingsRam.value = settings.ram;
  settingsRamV.textContent = `${settings.ram} MB`;
  settingsJava.value = settings.javaPath;
  window.launcher.getGameDir().then(dir => { gameDirBox.textContent = dir; }).catch(() => { gameDirBox.textContent = '—'; });
}
settingsRam.addEventListener('input', () => { settings.ram = parseInt(settingsRam.value,10); settingsRamV.textContent = `${settings.ram} MB`; saveSettings(); });
settingsJava.addEventListener('input', () => { settings.javaPath = settingsJava.value; saveSettings(); });

btnCheckUpd.addEventListener('click', async () => {
  setStatus('busy','Проверка обновлений...');
  btnCheckUpd.textContent = '↻ ПРОВЕРКА...'; btnCheckUpd.disabled = true;
  const info = await window.launcher.checkUpdate().catch(() => null);
  btnCheckUpd.textContent = '↻ ПРОВЕРИТЬ'; btnCheckUpd.disabled = false;
  if (info?.hasUpdate) { showUpdateBanner(info); setStatus('ready', `Обновление: v${info.latest}`); }
  else setStatus('ready', 'Установлена последняя версия');
});

// ═══════════════════════════════════════════════════════════
// UPDATE BANNER
// ═══════════════════════════════════════════════════════════
function showUpdateBanner(info) {
  updateInfo = info;
  updateVer.textContent = `v${info.latest}`;
  updateBanner.classList.remove('hidden');
  appLayout.classList.add('with-banner');
  updatePlayDetail();
}
btnDoUpdate.addEventListener('click', () => { if (updateInfo?.url) window.launcher.openUrl(updateInfo.url); });
btnDismissUpd.addEventListener('click', () => { updateBanner.classList.add('hidden'); appLayout.classList.remove('with-banner'); updateInfo = null; updatePlayDetail(); });

// ═══════════════════════════════════════════════════════════
// VERSION LOADER
// ═══════════════════════════════════════════════════════════
async function loadVersions() {
  setStatus('busy', 'Загрузка версий...');
  try {
    allVersions = await window.launcher.fetchVersions();
    setStatus('ready', `Загружено ${allVersions.length} версий`);
    if (!modalCreate.classList.contains('hidden')) renderModalVersionList();
  } catch (err) { setStatus('error', 'Нет сети'); console.error('[versions]', err); }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function typeColor(type) {
  return { release:'#5ab84a', snapshot:'#f5c542', old_beta:'#e0884a', old_alpha:'#e05252' }[type] || '#888';
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
btnNewInst.addEventListener('click', openModal);

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
async function boot() {
  loadStorage();
  loadUsername();
  loadSettingsUI();

  window.launcher.getVersion().then(v => {
    appVersion.textContent = `v${v}`;
    sidebarVer.textContent = `v${v}`;
    aboutVer.textContent   = `YoLauncher v${v}`;
  }).catch(() => {});

  renderInstances();
  clearSkinCanvas();

  try {
    const sk = localStorage.getItem('yo-skin');
    if (sk) { renderSkinPreview(sk); skinLabel.textContent = 'Загруженный скин'; }
  } catch {}

  // Firebase / YoID
  initFirebase();

  // Java (non-blocking)
  refreshJavaStatus().then(() => updatePlayDetail());

  // MC versions
  loadVersions();

  // Update check
  window.launcher.checkUpdate().then(info => { if (info?.hasUpdate) showUpdateBanner(info); }).catch(() => {});
}

boot();