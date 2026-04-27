// (c) 2026 wyou25f. Licensed under YESL-2026.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path  = require('path');
const fs    = require('fs');
const https = require('https');
const os    = require('os');

const APP_VERSION = '1.1.0';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1150,
    height:    700,
    minWidth:  1150,
    minHeight: 700,
    resizable: false,
    frame:     false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window controls ─────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close',    () => app.quit());
ipcMain.on('open-url', (_, url) => shell.openExternal(url));

// ─── App meta ─────────────────────────────────────────────────
ipcMain.handle('get-version', () => APP_VERSION);

ipcMain.handle('get-game-dir', () => {
  return path.join(app.getPath('appData'), '.yolauncher');
});

// ─── Check launcher updates (GitHub) ─────────────────────────
ipcMain.handle('check-update', () => new Promise((resolve) => {
  const req = https.get({
    hostname: 'api.github.com',
    path:     '/repos/wyou25f/yolauncher/releases/latest',
    headers:  { 'User-Agent': `YoLauncher/${APP_VERSION}` },
  }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const j      = JSON.parse(raw);
        const latest = (j.tag_name || '').replace(/^v/, '');
        resolve({
          current:   APP_VERSION,
          latest:    latest || APP_VERSION,
          hasUpdate: !!latest && latest !== APP_VERSION,
          url:       j.html_url || '',
        });
      } catch {
        resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' });
      }
    });
  });
  req.on('error', () => resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' }));
  req.setTimeout(6000, () => { req.destroy(); resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' }); });
}));

// ─── Fetch Minecraft version list ────────────────────────────
ipcMain.handle('fetch-versions', () => new Promise((resolve, reject) => {
  const req = https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const { versions } = JSON.parse(raw);
        resolve(versions.map(v => ({ id: v.id, type: v.type })));
      } catch (e) {
        reject(e.message);
      }
    });
  });
  req.on('error', e => reject(e.message));
  req.setTimeout(12000, () => { req.destroy(); reject('Timeout'); });
}));

// ─── Launch Minecraft ─────────────────────────────────────────
ipcMain.handle('launch-game', async (_, { version, username, ram, javaPath, modLoader }) => {
  try {
    const { Client, Authenticator } = require('minecraft-launcher-core');
    const launcher = new Client();

    const gameDir = path.join(app.getPath('appData'), '.yolauncher');
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

    const ramMB = Math.max(512, parseInt(ram, 10) || 2048);

    // Resolve actual version string (Forge/Fabric require pre-installation)
    let launchVersion = version;
    if (modLoader && modLoader !== 'none') {
      // mod-loaded instances require the user to pre-install the loader.
      // Launcher-core will use whatever version ID is passed; if loader
      // isn't installed the error will surface naturally from launcher-core.
    }

    // ... внутри ipcMain.handle('launch-game')

    // Формируем "фейковую" авторизацию для оффлайн-режима
    const offlineAuth = {
      access_token: 'dummy_token', // Майн проверяет наличие этой строки
      client_token: 'dummy_token',
      uuid: '00000000-0000-0000-0000-000000000000', // Формат UUID важен для разблокировки UI
      name: username || 'Player',
      user_properties: '{}'
    };

    const opts = {
      // Это база для оффлайна
      authorization: {
        access_token: 'dummy',
        client_token: 'dummy',
        uuid: '00000000-0000-0000-0000-000000000000',
        name: username || 'Player',
        user_properties: '{}'
      },
      root:    gameDir,
      version: { 
        number: launchVersion, 
        type: 'release' 
      },
      memory: {
        max: `${ramMB}M`,
        min: `${Math.max(256, Math.floor(ramMB / 4))}M`,
      },
      // ПРИНУДИТЕЛЬНО ПЕРЕДАЕМ ПАРАМЕТРЫ, ЧТОБЫ УБРАТЬ DEMO
      overrides: {
        detached: false,
        // Эти аргументы отключают Demo-режим и проверки Microsoft
        extraArgs: [
          "--username", username || 'Player',
          "--uuid", "00000000-0000-0000-0000-000000000000",
          "--accessToken", "dummy",
          "--userType", "legacy" // Для старых версий (как 1.16.5) это критично!
        ]
      }
    };

    if (javaPath && javaPath.trim()) opts.javaPath = javaPath.trim();

    // ── Progress relay ──────────────────────────────────────
    launcher.on('progress', e => mainWindow.webContents.send('launch-progress', e));
    launcher.on('debug',    e => mainWindow.webContents.send('launch-log', { type: 'debug', msg: String(e) }));
    launcher.on('data',     e => mainWindow.webContents.send('launch-log', { type: 'data',  msg: String(e) }));
    launcher.on('close',    c => mainWindow.webContents.send('launch-closed', c));

    await launcher.launch(opts);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
