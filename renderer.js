/* ------------------------ renderer.js ------------------------ */
/*  Este archivo supone que Tabulator ya está disponible en
    window.Tabulator porque lo cargaste en index.html antes
    que este script (sin atributo defer).                       */

let dataupload = []; // datos que luego se enviarán a la API
let empresainfolist = null; // la empresa activa (llega desde main)
let tabulator = null; // instancia de Tabulator

window.addEventListener('DOMContentLoaded', () => {
  /* ---------- 1. Referencias de elementos ---------- */
  const interfaz1 = document.getElementById('interfaz1');
  const interfaz2 = document.getElementById('interfaz2');
  const formEmpresa = document.getElementById('formEmpresa');
  const empresaInfoDiv = document.getElementById('empresaInfo');

  const btnFetchData = document.getElementById('fetch-data');
  const btnUpload = document.getElementById('upload_btn');
  const tableWrapper = document.getElementById('table-wrapper');
  const pageSizeSelect = document.getElementById('pageSize');

  /* ---------- 2. Gestión de la empresa ---------- */
  window.electronAPI.onEmpresaNoExiste(() => {
    interfaz1.classList.remove('hidden');
  });

  window.electronAPI.onEmpresaExiste((empresa) => {
    empresainfolist = empresa;
    mostrarEmpresa(empresa);
  });

  formEmpresa.addEventListener('submit', async (e) => {
    e.preventDefault();

    const empresa_id = parseInt(
      document.getElementById('empresa_id').value,
      10
    );
    const razon_social = document.getElementById('razon_social').value;

    try {
      const nuevaEmpresa = await window.electronAPI.registrarEmpresa({
        empresa_id,
        razon_social,
      });
      empresainfolist = nuevaEmpresa;
      mostrarEmpresa(nuevaEmpresa);
    } catch {
      alert('Error al guardar la empresa');
    }
  });

  function mostrarEmpresa(emp) {
    interfaz1.classList.add('hidden');
    interfaz2.classList.remove('hidden');
    empresaInfoDiv.innerHTML = `
          <p><strong>ID interno:</strong> ${emp.id}</p>
          <p><strong>Empresa ID:</strong> ${emp.empresa_id}</p>
          <p><strong>Razón Social:</strong> ${emp.razon_social}</p>
        `;
  }

  /* ---------- 3. Obtener y mostrar datos en Tabulator ---------- */
  btnFetchData.addEventListener('click', async () => {
    const result = await window.electronAPI.getTableData();

    if (result.error) {
      return alert('Error al obtener datos: ' + result.error);
    }

    // destruimos instancia previa si existe
    if (tabulator) {
      tabulator.destroy();
      tabulator = null;
    }

    if (!result.length) {
      return alert('La consulta no devolvió registros.');
    }

    // columnas dinámicas
    const columns = Object.keys(result[0]).map((field) => ({
      title: field.replace(/_/g, ' ').toUpperCase(),
      field,
      headerSort: true,
    }));

    tabulator = new Tabulator(tableWrapper, {
      data: result,
      columns,
      height: '500px',
      layout: 'fitDataFill',
      movableColumns: true,
      pagination: 'local',
      paginationSize: parseInt(pageSizeSelect.value, 10),
      paginationSizeSelector: [10, 25, 50],
    });

    dataupload = result; // guardamos para subir
    btnUpload.classList.remove('hidden');
  });

  // cambiar tamaño de página
  pageSizeSelect.addEventListener('change', () => {
    if (tabulator) {
      tabulator.setPageSize(parseInt(pageSizeSelect.value, 10));
    }
  });

  /* ---------- 4. Subir datos a la API ---------- */
  btnUpload.addEventListener('click', async () => {
    if (!empresainfolist) {
      return alert('Aún no hay empresa registrada.');
    }
    if (!dataupload.length) {
      return alert('No hay datos para subir.');
    }

    const payload = {
      company_id: empresainfolist.empresa_id,
      ventas_softs: dataupload,
    };

    try {
      const respuesta = await window.electronAPI.uploadData(payload);
      console.log('Respuesta API:', respuesta);
      alert('Datos enviados correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al enviar datos a la API.');
    }
  });
});
