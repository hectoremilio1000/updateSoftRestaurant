const sql = require('mssql');
const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain } = require('electron');

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

  // Manejo de eventos para obtener datos desde la base de datos
  ipcMain.handle('get-table-data', async (event, tableName) => {
    try {
      const pool = await sql.connect(config);
      const result = await sql.query(
        `SELECT cantidad, descuento, descripcion as name_producto, precio, impuesto1, preciosinimpuestos, preciocatalogo FROM ${tableName} as c inner join productos as p on c.idproducto=p.idproducto`
      );
      return result.recordset;
    } catch (err) {
      console.error('SQL Error:', err);
      return { error: err.message };
    } finally {
      sql.close();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
