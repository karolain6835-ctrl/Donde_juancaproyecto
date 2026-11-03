// Conserva las conexiones/consultas con fallos inyectados de los arneses existentes.
// La aplicación recibe el contrato acquire/release; end solo pertenece al fixture.
module.exports = function poolRequire(resolve) {
  return name => {
    const value = resolve(name);
    if (!name.endsWith('/config/db') || typeof value.acquire === 'function') return value;
    return {...value, acquire: async () => {
      const connection = await resolve('mysql2').createConnection(value.dbConfig).promise();
      const lease = Object.create(connection);
      lease.release = () => connection.end();
      return lease;
    }};
  };
};
