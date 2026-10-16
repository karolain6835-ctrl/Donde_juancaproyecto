require('dotenv').config(); // 1. Cargamos las variables de entorno primero
const express = require('express');
const autenticar = require('./middleware/authMiddleware');
const cors = require('cors');
const categoriasRoutes = require('./routes/categoriasRoutes');
const productosRoutes = require('./routes/productosRoutes');
const mesasRoutes = require('./routes/mesasRoutes')
const pedidosRoutes = require('./routes/pedidosRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const juegosRoutes = require('./routes/juegosRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const mermasRoutes = require('./routes/mermasRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const comprasRoutes = require('./routes/comprasRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const cierresCajaRoutes = require('./routes/cierresCajaRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const kanbanRoutes = require('./routes/kanbanRoutes');
const db = require('./config/db'); // Importa la base de datos para asegurar la conexión al inicio
const divisionesRoutes = require('./routes/divisionesRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');


const app = express();
const PORT = process.env.PORT || 5000; // Usa el puerto de .env o el 5000 por defecto

// 2. Middlewares globales de procesamiento
app.use(cors());
app.use(express.json());

// 3. Rutas de la aplicación
app.get('/', (req, res) => {
  res.send('¡El servidor de Dondejuanca está vivo, estructurado en /src y listo! 🍻');
});

// Registrar aquí las rutas de la API
app.use('/api/categorias', autenticar, categoriasRoutes);
app.use('/api/productos', autenticar, productosRoutes);
app.use('/api/mesas', autenticar, mesasRoutes);
app.use('/api/pedidos', autenticar, pedidosRoutes);
app.use('/api/pagos', autenticar, pagosRoutes);
app.use('/api/juegos', autenticar, juegosRoutes);
app.use('/api/inventario', autenticar, inventarioRoutes);
app.use('/api/mermas', autenticar, mermasRoutes);
app.use('/api/proveedores', autenticar, proveedoresRoutes);
app.use('/api/compras', autenticar, comprasRoutes);
app.use('/api/clientes', autenticar, clientesRoutes);
app.use('/api/ventas', autenticar, ventasRoutes);
app.use('/api/cierres-caja', autenticar, cierresCajaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/kanban', autenticar, kanbanRoutes);
app.use('/api/sesiones-division', autenticar, divisionesRoutes);
app.use('/api/auditoria', autenticar, auditoriaRoutes);
app.use('/api/configuracion', autenticar, configuracionRoutes);

// 4. Manejo global de errores (SIEMPRE AL FINAL, justo antes del listen)
app.use((err, req, res, next) => {
  console.error('❌ Error detectado en el servidor:', err.stack);
  res.status(500).json({ error: 'Hubo un error interno.', detalles: err.message });
});

app.listen(PORT, () => {
  console.log(`📡 Servidor backend escuchando en http://localhost:${PORT}`);
});
