// (c) 2026 wyou25f. Licensed under YESL-2026.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  // Window
  minimize:  ()      => ipcRenderer.send('window-minimize'),
  close:     ()      => ipcRenderer.send('window-close'),
  openUrl:   (url)   => ipcRenderer.send('open-url', url),

  // App meta
  getVersion:  ()    => ipcRenderer.invoke('get-version'),
  getGameDir:  ()    => ipcRenderer.invoke('get-game-dir'),
  checkUpdate: ()    => ipcRenderer.invoke('check-update'),

  // Minecraft
  fetchVersions: ()      => ipcRenderer.invoke('fetch-versions'),
  launchGame:    (opts)  => ipcRenderer.invoke('launch-game', opts),

  // Launch events
  onLaunchProgress: (cb) => ipcRenderer.on('launch-progress', (_, d) => cb(d)),
  onLaunchLog:      (cb) => ipcRenderer.on('launch-log',      (_, d) => cb(d)),
  onLaunchClosed:   (cb) => ipcRenderer.on('launch-closed',   (_, d) => cb(d)),
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),
});
