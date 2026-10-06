const mysql = require('mysql2');
require('dotenv').config();

// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ==========================================
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// ==========================================
// CONEXIÓN PRINCIPAL
// ==========================================
const connection = mysql.createConnection(dbConfig);

// Probar conexión con XAMPP
connection.connect((err) => {
  if (err) {
    console.error(
      '❌ Error al conectar a la base de datos:',
      err.message
    );
    return;
  }

  console.log(
    '🌸 ¡Conexión exitosa a la base de datos de XAMPP para el sistema de Juanca!'
  );
});

// ==========================================
// EXPORTACIONES
// ==========================================

// Mantiene tu conexión existente:
module.exports = connection;

// IMPORTANTE:
// usamos "dbConfig" y NO "config",
// porque "config" ya pertenece internamente a mysql2.
module.exports.dbConfig = dbConfig;