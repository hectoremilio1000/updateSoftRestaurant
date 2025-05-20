/* -------------- NUEVO renderer.js -------------- */
let dataupload = [];
let empresainfolist; // se llena cuando llega “empresa-existe”

window.addEventListener('DOMContentLoaded', () => {
  /* ----- 1.  Lógica de empresa (sin cambios) ----- */
  const interfaz1 = document.getElementById('interfaz1');
  const interfaz2 = document.getElementById('interfaz2');
  const form = document.getElementById('formEmpresa');
  const empresaInfo = document.getElementById('empresaInfo');

  window.electronAPI.onEmpresaNoExiste(() =>
    interfaz1.classList.remove('hidden')
  );

  window.electronAPI.onEmpresaExiste((empresa) => {
    empresainfolist = empresa; // <-- guardamos para después
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
    } catch {
      alert('Error al guardar la empresa');
    }
  });

  function mostrarEmpresa(emp) {
    interfaz1.classList.add('hidden');
    interfaz2.classList.remove('hidden');
    empresaInfo.innerHTML = `
      <p><strong>ID:</strong> ${emp.id}</p>
      <p><strong>Empresa ID:</strong> ${emp.empresa_id}</p>
      <p><strong>Razón Social:</strong> ${emp.razon_social}</p>`;
  }

  /* ----- 2.  Nueva tabla con Tabulator ----- */
  const tableWrapper = document.getElementById('table-wrapper');
  const pageSizeInput = document.getElementById('pageSize');
  let tabulator; // referencia global

  document.getElementById('fetch-data').addEventListener('click', async () => {
    const data = await window.electronAPI.getTableData();
    if (data.error) return alert('Error al obtener datos: ' + data.error);

    // Si ya existía, destruimos instancia anterior
    if (tabulator) tabulator.destroy();

    // Construimos columnas dinámicamente
    const columns = Object.keys(data[0]).map((field) => ({
      title: field.replace(/_/g, ' ').toUpperCase(),
      field,
      headerSort: true,
    }));

    tabulator = new Tabulator(tableWrapper, {
      data,
      layout: 'fitDataFill',
      columns,
      pagination: 'local',
      paginationSize: parseInt(pageSizeInput.value),
      paginationSizeSelector: [10, 25, 50],
      movableColumns: true,
      height: '500px',
    });

    dataupload = data;
    document.getElementById('upload_btn').classList.remove('hidden');
  });

  // Cambiar tamaño de página al vuelo
  pageSizeInput.addEventListener('change', () => {
    if (tabulator) tabulator.setPageSize(parseInt(pageSizeInput.value));
  });

  /* ----- 3.  Subir datos con empresa_id real ----- */
  document.getElementById('upload_btn').addEventListener('click', async () => {
    if (!empresainfolist) return alert('Aún no hay empresa registrada.');
    const payload = {
      company_id: empresainfolist.empresa_id,
      ventas_softs: dataupload,
    };
    const resp = await window.electronAPI.uploadData(payload);
    console.log(resp);
  });
});
