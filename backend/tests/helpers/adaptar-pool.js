// Precarga de pruebas (node --require): las pruebas heredadas ejecutan los
// controladores en vm con stubs de 'mysql2' (createConnection) y '../config/db'.
// Los controladores ahora piden la conexión con db.obtenerConexion(); este
// adaptador la define sobre el stub existente (mismo createConnection(...).promise()
// por llamada) para que las pruebas sigan verificando el mismo SQL, commits,
// rollbacks y cierres. El pool real se prueba en tests/pool-conexion.test.js.
const vm = require('node:vm');
const original = vm.runInNewContext;
vm.runInNewContext = function (codigo, contexto, ...resto) {
  if (contexto && typeof contexto.require === 'function' && !contexto.require.__adaptado) {
    const base = contexto.require;
    const adaptado = (nombre) => {
      const modulo = base(nombre);
      if (typeof nombre === 'string' && /(^|\/)config\/db$/.test(nombre) && modulo && typeof modulo === 'object'
        && typeof modulo.obtenerConexion !== 'function') {
        const envoltura = Object.create(modulo);
        envoltura.obtenerConexion = async () => base('mysql2').createConnection(modulo.dbConfig).promise();
        return envoltura;
      }
      return modulo;
    };
    adaptado.__adaptado = true;
    contexto.require = adaptado;
  }
  return original.call(this, codigo, contexto, ...resto);
};
