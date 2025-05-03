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
    const columns = Object.keys(data[0]); // ✅ ESTA ES LA CORRECCIÓN
    let grid;

    function renderTable(limit) {
      const container = document.getElementById('table-wrapper');
      container.innerHTML = ''; // limpiar antes de volver a renderizar

      grid = new gridjs.Grid({
        columns,
        data: data.map((row) => Object.values(row)), // convertir objetos a arrays de valores
        pagination: {
          enabled: true,
          limit: limit,
          summary: true,
        },
        search: true,
        sort: true,
        className: {
          table: 'w-full text-sm text-left text-gray-700',
        },
      });

      grid.render(container);
    }

    renderTable(10);

    document.getElementById('pageSize').addEventListener('change', (e) => {
      const newLimit = parseInt(e.target.value);
      renderTable(newLimit);
    });

    dataupload = data;
    buttonUplopad.classList.remove('hidden');
  }
});
document.getElementById('upload_btn').addEventListener('click', async () => {
  const data = await ipcRenderer.invoke('post-upload-data', dataupload);
  console.log(data);
});
