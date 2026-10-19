// Entrada académica independiente: carga el entorno antes de importar la conexión.
require('dotenv').config();
const express = require('express');
const loginRoutes = require('./routes/loginRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Convierte el cuerpo JSON y monta exclusivamente el servicio de login existente.
app.use(express.json());
app.use('/api/usuarios', loginRoutes);

// Inicia el servidor local. El controlador y la conexión conservan su implementación.
app.listen(PORT, () => {
  console.log(`Servicio académico de autenticación en http://localhost:${PORT}`);
});
