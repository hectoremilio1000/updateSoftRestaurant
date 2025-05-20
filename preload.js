const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onEmpresaExiste: (cb) => ipcRenderer.on('empresa-existe', (_, d) => cb(d)),
  onEmpresaNoExiste: (cb) => ipcRenderer.on('empresa-no-existe', cb),
  registrarEmpresa: (d) => ipcRenderer.invoke('registrar-empresa', d),
  getTableData: () => ipcRenderer.invoke('get-table-data'),
  // ahora acepta un objeto { company_id, ventas_softs }
  uploadData: (d) => ipcRenderer.invoke('post-upload-data', d),
});
