/**
 * YoLauncher · renderer.js
 * Все взаимодействие с UI + IPC вызовы к main process
 */

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const btnMinimize     = document.getElementById('btn-minimize');
const btnClose        = document.getElementById('btn-close');
const inputUsername   = document.getElementById('input-username');
const filterTabs      = document.querySelectorAll('.filter-tab');
const pixelSelect     = document.getElementById('pixel-select');
const selectText      = document.getElementById('select-text');
const selectArrow     = document.getElementById('select-arrow');
const selectDropdown  = document.getElementById('select-dropdown');
const dropdownLoading = document.getElementById('dropdown-loading');
const dropdownList    = document.getElementById('dropdown-list');
const versionHint     = document.getElementById('version-hint');
const playBtn         = document.getElementById('play-btn');
const playText        = document.getElementById('play-text');
const playVersionLabel= document.getElementById('play-version-label');
const progressSection = document.getElementById('progress-section');
const progressLabel   = document.getElementById('progress-label');
const progressFill    = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const statusDot       = document.getElementById('status-dot');
const statusText      = document.getElementById('status-text');

// ─── State ───────────────────────────────────────────────────────────────────
let allVersions    = [];
let currentFilter  = 'release';
let selectedVersion = null;
let isLaunching    = false;

// ─── Window controls ─────────────────────────────────────────────────────────
btnMinimize.addEventListener('click', () => window.launcher.minimize());
btnClose.addEventListener('click',    () => window.launcher.close());

// ─── Username persistence ─────────────────────────────────────────────────────
const savedName = localStorage.getItem('yolauncher-username');
if (savedName) inputUsername.value = savedName;
inputUsername.addEventListener('input', () => {
  localStorage.setItem('yolauncher-username', inputUsername.value);
});

// ─── Filter tabs ──────────────────────────────────────────────────────────────
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderDropdownList();
    // Reset selection if it doesn't match new filter
    if (selectedVersion && selectedVersion.type !== currentFilter) {
      selectedVersion = null;
      selectText.textContent = 'Выберите версию';
      updatePlayButton();
    }
  });
});

// ─── Custom dropdown logic ────────────────────────────────────────────────────
pixelSelect.addEventListener('click', (e) => {
  if (isLaunching) return;
  toggleDropdown();
});

pixelSelect.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(); }
  if (e.key === 'Escape') closeDropdown();
});

document.addEventListener('click', (e) => {
  if (!pixelSelect.contains(e.target)) closeDropdown();
});

function toggleDropdown() {
  pixelSelect.classList.toggle('open');
}
function closeDropdown() {
  pixelSelect.classList.remove('open');
}

function renderDropdownList() {
  dropdownList.innerHTML = '';

  const filtered = allVersions.filter(v => v.type === currentFilter);

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.style.color = '#444';
    li.style.fontSize = '7px';
    li.style.padding = '10px';
    li.textContent = 'Нет версий';
    dropdownList.appendChild(li);
    return;
  }

  filtered.forEach(v => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    if (selectedVersion && selectedVersion.id === v.id) {
      li.classList.add('selected');
    }

    const badge = document.createElement('span');
    badge.className = 'version-type-badge';
    badge.textContent = typeLabel(v.type);
    badge.style.color = typeColor(v.type);

    const name = document.createElement('span');
    name.textContent = v.id;

    li.appendChild(name);
    li.appendChild(badge);

    li.addEventListener('click', () => {
      selectVersion(v);
      closeDropdown();
    });
    dropdownList.appendChild(li);
  });
}

function selectVersion(v) {
  selectedVersion = v;
  selectText.textContent = v.id;
  versionHint.textContent = `Тип: ${typeLabel(v.type)}`;

  // Highlight in list
  dropdownList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
  const lis = dropdownList.querySelectorAll('li');
  const filtered = allVersions.filter(x => x.type === currentFilter);
  const idx = filtered.findIndex(x => x.id === v.id);
  if (lis[idx]) lis[idx].classList.add('selected');

  updatePlayButton();
}

function typeLabel(type) {
  const map = { release: 'REL', snapshot: 'SNAP', old_beta: 'BETA', old_alpha: 'ALPHA' };
  return map[type] || type;
}
function typeColor(type) {
  const map = {
    release: '#5ab84a',
    snapshot: '#f5c542',
    old_beta: '#e0884a',
    old_alpha: '#e05252',
  };
  return map[type] || '#888';
}

// ─── Update play button state ─────────────────────────────────────────────────
function updatePlayButton() {
  if (selectedVersion && !isLaunching) {
    playBtn.disabled = false;
    playVersionLabel.textContent = `Minecraft ${selectedVersion.id}`;
  } else if (!selectedVersion) {
    playBtn.disabled = true;
    playVersionLabel.textContent = 'Версия не выбрана';
  }
}

// ─── Fetch versions on load ───────────────────────────────────────────────────
async function loadVersions() {
  setStatus('busy', 'Загрузка версий...');
  dropdownLoading.classList.remove('hidden');
  dropdownList.innerHTML = '';

  try {
    const versions = await window.launcher.fetchVersions();
    allVersions = versions;

    dropdownLoading.classList.add('hidden');

    // Auto-select latest release
    const latestRelease = allVersions.find(v => v.type === 'release');
    renderDropdownList();

    if (latestRelease) {
      selectVersion(latestRelease);
    }

    const releaseCount = allVersions.filter(v => v.type === 'release').length;
    setStatus('ready', `Загружено ${versions.length} версий`);
  } catch (err) {
    dropdownLoading.classList.add('hidden');
    selectText.textContent = 'Ошибка загрузки';
    setStatus('error', 'Нет подключения к сети');
    console.error('[versions]', err);
  }
}

// ─── Launch game ──────────────────────────────────────────────────────────────
playBtn.addEventListener('click', async () => {
  if (isLaunching || !selectedVersion) return;

  const username = (inputUsername.value.trim() || 'Player').substring(0, 16);
  inputUsername.value = username;

  startLaunch();

  const result = await window.launcher.launchGame({
    version: selectedVersion.id,
    username,
  });

  if (!result.success) {
    stopLaunch();
    setStatus('error', `Ошибка: ${result.error?.slice(0, 40)}`);
  }
});

function startLaunch() {
  isLaunching = true;
  playBtn.classList.add('launching');
  playBtn.disabled = true;
  playText.textContent = 'ЗАПУСК...';
  progressSection.classList.add('visible');
  setStatus('busy', 'Запуск игры...');

  // Register event listeners
  window.launcher.onLaunchProgress(handleProgress);
  window.launcher.onLaunchLog(handleLog);
  window.launcher.onLaunchClosed(handleClosed);
}

function stopLaunch() {
  isLaunching = false;
  playBtn.classList.remove('launching');
  playText.textContent = 'ИГРАТЬ';
  progressSection.classList.remove('visible');
  updatePlayButton();

  window.launcher.removeAllListeners('launch-progress');
  window.launcher.removeAllListeners('launch-log');
  window.launcher.removeAllListeners('launch-closed');
}

function handleProgress(data) {
  // data от minecraft-launcher-core выглядит так:
  // { type: 'assets', task: 12, total: 100 }
  
  let pct = 0;
  // Берем текущий прогресс из data.task
  let current = typeof data.task === 'number' ? data.task : 0; 
  let total = typeof data.total === 'number' ? data.total : 0;

  if (total > 0) {
    pct = Math.floor((current / total) * 100);
  }

  // На всякий случай ограничиваем диапазон 0-100
  pct = Math.max(0, Math.min(100, pct));

  progressFill.style.width = pct + '%';
  progressPercent.textContent = pct + '%';
  
  // Словарь для красивых названий этапов загрузки
  const typeNames = {
    'assets': 'ресурсов игры',
    'classes': 'библиотек',
    'natives': 'нативных файлов',
    'assets-copy': 'распаковка ресурсов'
  };
  
  let typeRu = typeNames[data.type] || data.type || 'файлов';

  // Выводим подробную статистику (например: "Скачивание библиотек: 45 из 120")
  if (total > 0) {
    progressLabel.textContent = `Загрузка ${typeRu}: ${current} из ${total}`;
  } else {
    progressLabel.textContent = `Обработка ${typeRu}...`;
  }
}

function handleLog(data) {
  console.log(`[MC ${data.type}]`, data.msg);
  if (data.type === 'data') {
    setStatus('busy', 'Игра запущена');
  }
}

function handleClosed(code) {
  stopLaunch();
  setStatus('ready', `Игра закрыта (код: ${code})`);
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function setStatus(type, msg) {
  statusDot.className = `status-indicator ${type}`;
  statusText.textContent = msg;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadVersions();
