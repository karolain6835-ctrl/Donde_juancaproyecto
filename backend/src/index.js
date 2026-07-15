require('dotenv').config(); // 1. Cargamos las variables de entorno primero
const express = require('express');
const cors = require('cors');
const categoriasRoutes = require('./routes/categoriasRoutes');
const productosRoutes = require('./routes/productosRoutes');
const mesasRoutes = require('./routes/mesasRoutes')
const pedidosRoutes = require('./routes/pedidosRoutes');;
const db = require('./config/db'); // Importa la base de datos para asegurar la conexión al inicio


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
app.use('/api/categorias', categoriasRoutes); 
app.use('/api/productos', productosRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/pedidos', pedidosRoutes);

// 4. Manejo global de errores (SIEMPRE AL FINAL, justo antes del listen)
app.use((err, req, res, next) => {
  console.error('❌ Error detectado en el servidor:', err.stack);
  res.status(500).json({ error: 'Hubo un error interno.', detalles: err.message });
});

app.listen(PORT, () => {
  console.log(`📡 Servidor backend escuchando en http://localhost:${PORT}`);
});