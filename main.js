const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();
// Configuración SQL Server
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT),
  options: {
    encrypt: false, // Cambiar según configuración
    trustServerCertificate: true, // Solo para desarrollo local
  },
};
const API_URL = process.env.urlupdata || 'http://localhost:8080/apidataup'; // URL de la API
const EXECUTION_HOUR = '23:20'; // Hora específica en formato 24h (HH:mm)

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    verificarEmpresa();
  });
}

app.whenReady().then(createWindow);

async function verificarEmpresa() {
  try {
    const pool = await sql.connect(config);
    const result = await sql.query(`
      IF NOT EXISTS (
        SELECT * FROM sysobjects WHERE name='configadonisempresa' AND xtype='U'
      )
      BEGIN
        CREATE TABLE dbo.configadonisempresa (
          id INT IDENTITY(1,1) PRIMARY KEY,
          empresa_id INT NOT NULL,
          razon_social VARCHAR(255) NOT NULL
        )
      END;

      SELECT * FROM dbo.configadonisempresa;
    `);

    const empresa = result.recordset[0];
    console.log(empresa);
    if (empresa) {
      mainWindow.webContents.send('empresa-existe', empresa);
    } else {
      mainWindow.webContents.send('empresa-no-existe');
    }
  } catch (err) {
    console.error('Error al verificar empresa:', err);
  } finally {
    sql.close();
  }
}

ipcMain.handle('registrar-empresa', async (event, datos) => {
  try {
    const pool = await sql.connect(config);
    const insert = await pool
      .request()
      .input('empresa_id', sql.Int, datos.empresa_id)
      .input('razon_social', sql.VarChar(255), datos.razon_social)
      .query(
        'INSERT INTO dbo.configadonisempresa (empresa_id, razon_social) OUTPUT INSERTED.* VALUES (@empresa_id, @razon_social)'
      );

    return insert.recordset[0];
  } catch (err) {
    console.error('Error al registrar empresa:', err);
    throw err;
  } finally {
    sql.close();
  }
});
// Manejo de eventos para obtener datos desde la base de datos
ipcMain.handle('get-table-data', async (event) => {
  try {
    console.log('Ejecutando consulta SQL...');

    const pool = await sql.connect(config);
    const result = await sql.query(`
      SELECT TOP 100 c.cantidad, c.descuento, p.descripcion as name_producto, 
             c.precio, c.impuesto1, c.preciosinimpuestos, c.preciocatalogo, c.comentario, c.idestacion, c.idmeseroproducto, m.nombre as name_mesero, t.apertura, t.cierre, t.cajero, t.efectivo, t.vales, t.tarjeta, t.credito, t.fondo
      FROM cheqdet as c 
      INNER JOIN productos as p ON c.idproducto = p.idproducto INNER JOIN turnos as t ON c.idturno_cierre = t.idturno LEFT JOIN meseros as m ON c.idmeseroproducto=m.idmesero   ORDER BY c.hora DESC
    `);

    const data = result.recordset;

    return data;
  } catch (err) {
    console.error('SQL Error:', err);
    return { error: err.message };
  } finally {
    sql.close();
  }
});
// Manejo de eventos para enviar datos desde la base de datos
ipcMain.handle('post-upload-data', async (_event, payload) => {
  const { company_id, ventas_softs } = payload;
  try {
    console.log('Enviando datos a la API...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id, ventas_softs }),
    });
    const json = await response.json();
    console.log('Respuesta de la API:', json);
    return json; // opcional, para que renderer vea algo
  } catch (err) {
    console.error('Error en el proceso:', err);
    throw err;
  }
});
