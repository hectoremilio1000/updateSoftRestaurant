const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onEmpresaExiste: (callback) =>
    ipcRenderer.on('empresa-existe', (_, data) => callback(data)),
  onEmpresaNoExiste: (callback) =>
    ipcRenderer.on('empresa-no-existe', callback),
  registrarEmpresa: (data) => ipcRenderer.invoke('registrar-empresa', data),
  getTableData: (data) => ipcRenderer.invoke('get-table-data'),
  uploadData: (data) => ipcRenderer.invoke('post-upload-data', data),
});
