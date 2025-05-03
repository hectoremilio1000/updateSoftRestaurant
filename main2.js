const sql = require('mssql');
const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain } = require('electron');
const fetch = require('node-fetch');

dotenv.config();

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

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Función para obtener datos de SQL y enviarlos a la API
  async function fetchAndSendData() {
    try {
      console.log('Ejecutando consulta SQL...');

      const pool = await sql.connect(config);
      const result = await sql.query(`
        SELECT c.cantidad, c.descuento, p.descripcion as name_producto, 
               c.precio, c.impuesto1, c.preciosinimpuestos, c.preciocatalogo, c.comentario, c.idestacion, c.idmeseroproducto, m.nombre as nombre_mesero, t.apertura, t.cierre, t.cajero, t.efectivo, t.vales, t.tarjeta, t.credito, t.fondo
        FROM cheqdet as c 
        INNER JOIN productos as p ON c.idproducto = p.idproducto INNER JOIN turnos as t ON c.idturno_cierre = t.idturno LEFT JOIN meseros as m ON c.idmeseroproducto=m.idmesero
      `);

      const data = result.recordset;

      if (data.length === 0) {
        console.log('No hay datos para enviar.');
        return;
      }

      console.log('Enviando datos a la API...');
      console.log(data);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log('Respuesta de la API:', responseData);
    } catch (err) {
      console.error('Error en el proceso:', err);
    } finally {
      sql.close();
    }
  }

  // Manejo de eventos para obtener datos desde la base de datos
  ipcMain.handle('get-table-data', async (event) => {
    try {
      console.log('Ejecutando consulta SQL...');

      const pool = await sql.connect(config);
      const result = await sql.query(`
        SELECT c.cantidad, c.descuento, p.descripcion as name_producto, 
               c.precio, c.impuesto1, c.preciosinimpuestos, c.preciocatalogo, c.comentario, c.idestacion, c.idmeseroproducto, m.nombre as nombre_mesero, t.apertura, t.cierre, t.cajero, t.efectivo, t.vales, t.tarjeta, t.credito, t.fondo
        FROM cheqdet as c 
        INNER JOIN productos as p ON c.idproducto = p.idproducto INNER JOIN turnos as t ON c.idturno_cierre = t.idturno LEFT JOIN meseros as m ON c.idmeseroproducto=m.idmesero
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
  ipcMain.handle('post-upload-data', async (event, data) => {
    try {
      console.log('Enviando datos a la API...');
      console.log(data);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_id: 1, ventas_softs: data }),
      });

      const responseData = await response.json();
      console.log('Respuesta de la API:', responseData);
    } catch (err) {
      console.error('Error en el proceso:', err);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
