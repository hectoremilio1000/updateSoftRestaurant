var dataupload = [];
var empresainfolist;
window.addEventListener('DOMContentLoaded', () => {
  const interfaz1 = document.getElementById('interfaz1');
  const interfaz2 = document.getElementById('interfaz2');
  const form = document.getElementById('formEmpresa');
  const empresaInfo = document.getElementById('empresaInfo');

  window.electronAPI.onEmpresaNoExiste(() => {
    interfaz1.classList.remove('hidden');
  });

  window.electronAPI.onEmpresaExiste((empresa) => {
    empresainfolist = empresa;
    mostrarEmpresa(empresa);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empresa_id = parseInt(document.getElementById('empresa_id').value);
    const razon_social = document.getElementById('razon_social').value;

    try {
      const nuevaEmpresa = await window.electronAPI.registrarEmpresa({
        empresa_id,
        razon_social,
      });
      mostrarEmpresa(nuevaEmpresa);
    } catch (error) {
      alert('Error al guardar la empresa');
    }
  });

  function mostrarEmpresa(empresa) {
    interfaz1.classList.add('hidden');
    interfaz2.classList.remove('hidden');
    empresaInfo.innerHTML = `
      <p><strong>ID:</strong> ${empresa.id}</p>
      <p><strong>Empresa ID:</strong> ${empresa.empresa_id}</p>
      <p><strong>Razón Social:</strong> ${empresa.razon_social}</p>
    `;
  }
  document.getElementById('fetch-data').addEventListener('click', async () => {
    console.log('click');
    const data = await window.electronAPI.getTableData();

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
    const data = await window.electronAPI.uploadData(dataupload);
    console.log(data);
  });
});
