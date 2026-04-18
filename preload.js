const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close:    () => ipcRenderer.send('window-close'),

  // Minecraft API
  fetchVersions: () => ipcRenderer.invoke('fetch-versions'),
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Events FROM main → renderer
  onLaunchLog:      (cb) => ipcRenderer.on('launch-log',      (_e, d) => cb(d)),
  onLaunchProgress: (cb) => ipcRenderer.on('launch-progress', (_e, d) => cb(d)),
  onLaunchClosed:   (cb) => ipcRenderer.on('launch-closed',   (_e, d) => cb(d)),

  // Remove listeners (cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
