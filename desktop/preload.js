const { contextBridge, ipcRenderer } = require('electron');

// Exposed as window.macrash in the React app. Its presence is how the client
// knows it's running inside the desktop app instead of a browser.
contextBridge.exposeInMainWorld('macrash', {
  compressPdf: (bytes, options) => ipcRenderer.invoke('compress-pdf', bytes, options),
});
