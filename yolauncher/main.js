// (c) 2026 wyou25f. Licensed under YESL-2026.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path   = require('path');
const fs     = require('fs');
const https  = require('https');
const http   = require('http');
const os     = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');

const APP_VERSION = '1.2.0';
let mainWindow;

// ─── MD5 UUID helper (офлайн без YoID) ───────────────────
function offlineUUID(username) {
  const hash = crypto.createHash('md5')
    .update(`OfflinePlayer:${username}`)
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

// ─── Java version → MC mapping ────────────────────────────
function requiredJavaForMC(version) {
  const parts = version.split('.').map(Number);
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  if (minor >= 21) return 21;
  if (minor === 20 && patch >= 5) return 21;
  if (minor >= 17) return 17;
  return 8;
}

// ─── Java paths ───────────────────────────────────────────
function javaBaseDir() {
  return path.join(app.getPath('appData'), '.yolauncher', 'java');
}

function javaExePath(majorVersion) {
  const dir = path.join(javaBaseDir(), `jdk-${majorVersion}`);
  const isWin = process.platform === 'win32';
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const candidate = path.join(dir, entry, 'bin', isWin ? 'java.exe' : 'java');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function systemJavaVersion() {
  try {
    const out = execSync('java -version 2>&1', { timeout: 3000 }).toString();
    const m = out.match(/version "(\d+)(?:\.(\d+))?/);
    if (!m) return null;
    const major = parseInt(m[1]);
    return major === 1 ? parseInt(m[2]) : major;
  } catch { return null; }
}

// ─── Adoptium download URL ────────────────────────────────
function adoptiumUrl(majorVersion) {
  const plat    = { win32: 'windows', linux: 'linux', darwin: 'mac' }[process.platform] || 'linux';
  const archMap = { x64: 'x64', arm64: 'aarch64', ia32: 'x32' };
  const arch    = archMap[os.arch()] || 'x64';
  return `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/${plat}/${arch}/jre/hotspot/normal/eclipse`;
}

// ─── Follow redirects helper ──────────────────────────────
function httpsFollowRedirects(url, onData, onEnd, onError, n = 0) {
  if (n > 10) { onError(new Error('Too many redirects')); return; }
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, { headers: { 'User-Agent': `YoLauncher/${APP_VERSION}` } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      httpsFollowRedirects(res.headers.location, onData, onEnd, onError, n + 1);
      return;
    }
    if (res.statusCode !== 200) { onError(new Error(`HTTP ${res.statusCode}`)); return; }
    res.on('data', onData);
    res.on('end', onEnd);
  });
  req.on('error', onError);
  req.setTimeout(30000, () => { req.destroy(); onError(new Error('Timeout')); });
}

// ─── Window ───────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150, height: 700,
    minWidth: 1150, minHeight: 700,
    resizable: false, frame: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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

// ─── Window controls ─────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close',    () => app.quit());
ipcMain.on('open-url', (_, url) => shell.openExternal(url));

// ─── App meta ────────────────────────────────────────────
ipcMain.handle('get-version',  () => APP_VERSION);
ipcMain.handle('get-game-dir', () => path.join(app.getPath('appData'), '.yolauncher'));

// ─── Update check (Yo-software/yolauncher) ───────────────
ipcMain.handle('check-update', () => new Promise((resolve) => {
  const req = https.get({
    hostname: 'api.github.com',
    path:     '/repos/Yo-software/yolauncher/releases/latest',
    headers:  { 'User-Agent': `YoLauncher/${APP_VERSION}` },
  }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const j      = JSON.parse(raw);
        const latest = (j.tag_name || '').replace(/^v/, '');
        resolve({ current: APP_VERSION, latest: latest || APP_VERSION, hasUpdate: !!latest && latest !== APP_VERSION, url: j.html_url || '' });
      } catch {
        resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' });
      }
    });
  });
  req.on('error', () => resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' }));
  req.setTimeout(8000, () => { req.destroy(); resolve({ current: APP_VERSION, latest: APP_VERSION, hasUpdate: false, url: '' }); });
}));

// ─── Java status ─────────────────────────────────────────
ipcMain.handle('get-java-status', () => {
  const result = {};
  for (const v of [8, 17, 21]) {
    const p = javaExePath(v);
    result[v] = { installed: !!p, path: p || null };
  }
  result.system = { version: systemJavaVersion() };
  return result;
});

// ─── Java download ────────────────────────────────────────
ipcMain.handle('download-java', async (_, majorVersion) => {
  const url     = adoptiumUrl(majorVersion);
  const destDir = path.join(javaBaseDir(), `jdk-${majorVersion}`);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const isWin   = process.platform === 'win32';
  const tmpFile = path.join(os.tmpdir(), `yolauncher-java${majorVersion}${isWin ? '.zip' : '.tar.gz'}`);

  return new Promise((resolve) => {
    const fileStream  = fs.createWriteStream(tmpFile);
    const sendProgress = (pct, status) =>
      mainWindow.webContents.send('java-download-progress', { version: majorVersion, pct, status });

    httpsFollowRedirects(url,
      chunk => fileStream.write(chunk),
      () => {
        fileStream.close(async () => {
          sendProgress(80, 'extracting');
          try {
            if (isWin) {
              execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tmpFile}' -DestinationPath '${destDir}' -Force"`, { timeout: 120000 });
            } else {
              execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { timeout: 120000 });
            }
            fs.unlinkSync(tmpFile);
            sendProgress(100, 'done');
            resolve({ success: true, path: javaExePath(majorVersion) });
          } catch (e) { resolve({ success: false, error: e.message }); }
        });
      },
      (err) => { fileStream.close(); resolve({ success: false, error: err.message }); }
    );
  });
});

// ─── Detect Java for MC version ───────────────────────────
ipcMain.handle('detect-java-for-version', (_, mcVersion) => {
  const needed = requiredJavaForMC(mcVersion);
  const local  = javaExePath(needed);
  if (local) return { found: true, path: local, source: 'local', needed };
  for (const v of [8, 17, 21].filter(x => x >= needed)) {
    const p = javaExePath(v);
    if (p) return { found: true, path: p, source: 'local', needed };
  }
  const sysVer = systemJavaVersion();
  if (sysVer && sysVer >= needed) return { found: true, path: null, source: 'system', needed, systemVersion: sysVer };
  return { found: false, needed };
});

// ─── Fetch Minecraft versions ─────────────────────────────
ipcMain.handle('fetch-versions', () => new Promise((resolve, reject) => {
  const req = https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const { versions } = JSON.parse(raw);
        resolve(versions.map(v => ({ id: v.id, type: v.type })));
      } catch (e) { reject(e.message); }
    });
  });
  req.on('error', e => reject(e.message));
  req.setTimeout(12000, () => { req.destroy(); reject('Timeout'); });
}));

// ─── Launch Minecraft ─────────────────────────────────────
// uuid — может быть передан из renderer (YoID SHA-256 UUID)
ipcMain.handle('launch-game', async (_, { version, username, uuid: providedUuid, ram, javaPath }) => {
  try {
    const { Client } = require('minecraft-launcher-core');
    const launcher   = new Client();
    const gameDir    = path.join(app.getPath('appData'), '.yolauncher');
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

    const ramMB = Math.max(512, parseInt(ram, 10) || 2048);
    const name  = (username || 'Player').slice(0, 16);
    const uuid  = providedUuid || offlineUUID(name);

    // Авто-Java
    let resolvedJava = javaPath?.trim() || null;
    if (!resolvedJava) {
      const needed = requiredJavaForMC(version);
      const local  = javaExePath(needed);
      if (local) {
        resolvedJava = local;
      } else {
        for (const v of [8, 17, 21].filter(x => x >= needed)) {
          const p = javaExePath(v);
          if (p) { resolvedJava = p; break; }
        }
      }
    }

    const opts = {
      authorization: {
        access_token: providedUuid || 'dummy',
        client_token: 'yolauncher',
        uuid, name,
        user_properties: '{}',
      },
      root:    gameDir,
      version: { number: version, type: 'release' },
      memory:  { max: `${ramMB}M`, min: `${Math.max(256, Math.floor(ramMB / 4))}M` },
      overrides: {
        detached: false,
        extraArgs: ['--username', name, '--uuid', uuid, '--accessToken', providedUuid || 'dummy', '--userType', 'legacy'],
      },
    };
    if (resolvedJava) opts.javaPath = resolvedJava;

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