const { ipcRenderer } = require('electron');
const { rmdir } = require('original-fs');
var dataupload = [];
document.getElementById('fetch-data').addEventListener('click', async () => {
  console.log('click');
  const data = await ipcRenderer.invoke('get-table-data');

  if (data.error) {
    alert('Error al obtener datos: ' + data.error);
    return;
  }

  const headers = document.getElementById('table-headers');
  const body = document.getElementById('table-body');
  const buttonUplopad = document.getElementById('upload_btn');

  // Limpia la tabla anterior
  headers.innerHTML = '';
  body.innerHTML = '';

  if (data.length > 0) {
    // Construye encabezados
    Object.keys(data[0]).forEach((key) => {
      const th = document.createElement('th');
      th.classList.add('px-3');
      th.innerText = key;
      headers.appendChild(th);
    });

    // Construye filas
    data.forEach((row) => {
      const tr = document.createElement('tr');
      Object.values(row).forEach((value) => {
        const td = document.createElement('td');
        td.classList.add('px-3');
        td.innerText = value;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    dataupload = data;
    buttonUplopad.classList.remove('hidden');
  } else {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.classList.add('px-3');
    td.innerText = 'No hay datos disponibles.';
    td.colSpan = Object.keys(data[0] || {}).length || 1;
    tr.appendChild(td);
    body.appendChild(tr);
  }
});
document.getElementById('upload_btn').addEventListener('click', async () => {
  const data = await ipcRenderer.invoke('post-upload-data', dataupload);
  console.log(data);
});
