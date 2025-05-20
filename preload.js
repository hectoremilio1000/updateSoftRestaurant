// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Exponemos solo las funciones que usa renderer.js
contextBridge.exposeInMainWorld('electronAPI', {
  onEmpresaNoExiste: (cb) => ipcRenderer.on('empresa-no-existe', cb),
  onEmpresaExiste: (cb) => ipcRenderer.on('empresa-existe', (_e, d) => cb(d)),
  registrarEmpresa: (d) => ipcRenderer.invoke('empresa-registrar', d),
  getTableData: () => ipcRenderer.invoke('get-table-data'),
  uploadData: (p) => ipcRenderer.invoke('post-upload-data', p),
});
