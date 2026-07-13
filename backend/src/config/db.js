const mysql = require('mysql2');
require('dotenv').config();

// Configuración de la conexión usando tu archivo .env
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Probar la conexión con XAMPP
connection.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    return;
  }
  console.log('🌸 ¡Conexión exitosa a la base de datos de XAMPP para el sistema de Juanca!');
});

module.exports = connection;