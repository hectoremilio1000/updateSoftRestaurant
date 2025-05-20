/* ------------------------ renderer.js ------------------------ */

let rawData = []; // datos originales
let empresainfolist = null;
let currentPage = 1;
let pageSize = 10;

/* --- helpers ------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const statusMsg = $('statusMsg'); // 🆕 nuevo elemento

function totalPages() {
  return Math.max(1, Math.ceil(rawData.length / pageSize));
}

function renderTable() {
  // cabeceras
  const headers = $('table-headers');
  const body = $('table-body');
  headers.innerHTML = body.innerHTML = '';

  if (!rawData.length) return;

  // crear cabecera
  Object.keys(rawData[0]).forEach((key) => {
    const th = document.createElement('th');
    th.className = 'border px-2 py-1';
    th.textContent = key.replace(/_/g, ' ').toUpperCase();
    headers.appendChild(th);
  });

  // filas según página
  const start = (currentPage - 1) * pageSize;
  const slice = rawData.slice(start, start + pageSize);

  slice.forEach((row) => {
    const tr = document.createElement('tr');
    Object.values(row).forEach((value) => {
      const td = document.createElement('td');
      td.className = 'border px-2 py-1';
      td.textContent = value;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function updatePaginationControls() {
  $('pageIndicator').textContent = `Página ${currentPage} de ${totalPages()}`;

  $('prevPage').disabled = currentPage === 1;
  $('nextPage').disabled = currentPage === totalPages();
}

function refreshView() {
  renderTable();
  updatePaginationControls();
}

/* --- eventos DOMContentLoaded ------------------------------ */
window.addEventListener('DOMContentLoaded', () => {
  /* referencias de elementos */
  const interfaz1 = $('interfaz1');
  const interfaz2 = $('interfaz2');

  /* ---------- empresa ---------- */
  window.electronAPI.onEmpresaNoExiste(() => {
    interfaz1.classList.remove('hidden');
  });

  window.electronAPI.onEmpresaExiste((empresa) => {
    empresainfolist = empresa;
    mostrarEmpresa(empresa);
  });

  $('formEmpresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const empresa_id = parseInt($('empresa_id').value, 10);
    const razon_social = $('razon_social').value;

    try {
      const nueva = await window.electronAPI.registrarEmpresa({
        empresa_id,
        razon_social,
      });
      empresainfolist = nueva;
      mostrarEmpresa(nueva);
    } catch {
      alert('Error al guardar la empresa');
    }
  });

  function mostrarEmpresa(emp) {
    interfaz1.classList.add('hidden');
    interfaz2.classList.remove('hidden');
    $('empresaInfo').innerHTML = `
      <p><strong>ID interno:</strong> ${emp.id}</p>
      <p><strong>Empresa ID:</strong> ${emp.empresa_id}</p>
      <p><strong>Razón Social:</strong> ${emp.razon_social}</p>
    `;
  }

  /* ---------- obtener datos ---------- */
  $('fetch-data').addEventListener('click', async () => {
    const result = await window.electronAPI.getTableData();

    if (result.error) return alert('Error: ' + result.error);
    if (!result.length) return alert('Sin registros.');

    rawData = result;
    currentPage = 1;
    pageSize = parseInt($('pageSize').value, 10);

    refreshView();
    $('upload_btn').classList.remove('hidden');
  });

  /* ---------- paginación ---------- */
  $('pageSize').addEventListener('change', () => {
    pageSize = parseInt($('pageSize').value, 10);
    currentPage = 1;
    refreshView();
  });

  $('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      refreshView();
    }
  });

  $('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages()) {
      currentPage++;
      refreshView();
    }
  });

  async function subirEnChunks(registros, size = 10000) {
    const total = registros.length;
    for (let i = 0; i < total; i += size) {
      const chunk = registros.slice(i, i + size);

      await window.electronAPI.uploadData({
        company_id: empresainfolist.empresa_id,
        ventas_softs: chunk,
      });

      statusMsg.textContent = `Subidos ${Math.min(i + size, total)} / ${total}`;
    }
  }

  /* ---------- subir datos ---------- */
  /* ---------- subir datos ---------- */
  $('upload_btn').addEventListener('click', async (e) => {
    if (!empresainfolist) return alert('Aún no hay empresa registrada.');
    if (!rawData.length) return alert('No hay datos para subir.');

    // desactivar botón y mostrar estado
    const btn = e.currentTarget;
    btn.disabled = true;
    statusMsg.textContent = 'Subiendo dat 0%';

    try {
      await subirEnChunks(rawData, 10000);
      statusMsg.textContent = '✔ Todo listo';
    } catch (err) {
      console.error(err);
      statusMsg.textContent = '✖ Error al enviar datos';
    } finally {
      btn.disabled = false;
    }
  });
});
