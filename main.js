const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 560,
    minWidth: 900,
    minHeight: 560,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Uncomment for dev tools
  mainWindow.webContents.openDevTools();
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

// ─── IPC: Window controls ────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close', () => app.quit());

// ─── IPC: Fetch Minecraft versions ───────────────────────────────────────────
ipcMain.handle('fetch-versions', async () => {
  return new Promise((resolve, reject) => {
    https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const manifest = JSON.parse(data);
          const versions = manifest.versions.map(v => ({
            id: v.id,
            type: v.type,  // release | snapshot | old_beta | old_alpha
          }));
          resolve(versions);
        } catch (e) {
          reject(e.message);
        }
      });
    }).on('error', (e) => reject(e.message));
  });
});

// ─── IPC: Launch Minecraft ────────────────────────────────────────────────────
ipcMain.handle('launch-game', async (event, { version, username }) => {
  try {
    // Dynamic require so app doesn't crash if package not installed yet
    const { Client, Authenticator } = require('minecraft-launcher-core');
    const launcher = new Client();

    const gameDir = path.join(app.getPath('appData'), '.yolauncher');
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

  const opts = {
      authorization: Authenticator.getAuth(username || 'Player'),
      root: gameDir,
      version: {
        number: version,
        type: 'release',
      },
      memory: {
        max: '2G',
        min: '512M',
      },
      javaPath: '/usr/bin/java', 
      customArgs: [
        "--add-modules", "jdk.naming.dns",
        "--add-exports", "jdk.naming.dns/com.sun.jndi.dns=java.naming",
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        "--add-opens", "java.base/java.util=ALL-UNNAMED",
        "--add-opens", "java.base/java.io=ALL-UNNAMED",
        "--add-opens", "java.base/java.lang.reflect=ALL-UNNAMED",
        "--add-opens", "java.base/java.text=ALL-UNNAMED",
        "--add-opens", "java.desktop/sun.awt=ALL-UNNAMED",
        "-Djava.net.preferIPv4Stack=true",
        "-DignoreList=bootstap,jline,jutils,jopt-simple" // Пробуем игнорировать проверку некоторых либ
      ]
    };

    launcher.on('debug', (e) => {
      mainWindow.webContents.send('launch-log', { type: 'debug', msg: e });
    });

    launcher.on('data', (e) => {
      mainWindow.webContents.send('launch-log', { type: 'data', msg: e });
    });

    launcher.on('progress', (e) => {
      mainWindow.webContents.send('launch-progress', e);
    });

    launcher.on('close', (code) => {
      mainWindow.webContents.send('launch-closed', code);
    });

    await launcher.launch(opts);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
