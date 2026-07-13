const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // 👈 ¡Esta línea cambió! Ahora busca dentro de config
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('¡El servidor de Dondejuanca está vivo, estructurado en /src y listo! 🍻');
});

app.use((err, req, res, next) => {
  console.error('❌ Error detectado en el servidor:', err.stack);
  res.status(500).json({ error: 'Hubo un error interno.', detalles: err.message });
});

app.listen(PORT, () => {
  console.log(`📡 Servidor backend escuchando en http://localhost:${PORT}`);
});