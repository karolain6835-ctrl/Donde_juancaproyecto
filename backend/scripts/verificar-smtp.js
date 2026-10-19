// Diagnóstico sin enviar mensajes, consultar usuarios ni imprimir valores del entorno.
const path = require('node:path');
const nodemailer = require('nodemailer');
const {crearCorreo} = require('../src/services/correoRecuperacionService');

async function main() {
  require('dotenv').config({path: path.resolve(__dirname, '../.env'), quiet: true});
  let etapa = 'configuracion', codigo, respuesta;
  try {
    const correo = crearCorreo(process.env, options => {
      const transport = nodemailer.createTransport(options);
      return {
        async verify() {
          etapa = 'conexion_autenticacion';
          try { return await transport.verify(); }
          catch (error) {
            const permitidos = ['EAUTH', 'ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'EDNS', 'ETLS', 'EPROTOCOL'];
            codigo = permitidos.includes(error.code) ? error.code : 'SMTP_ERROR';
            if (Number.isInteger(error.responseCode)) respuesta = error.responseCode;
            throw error;
          } finally { transport.close(); }
        }
      };
    });
    await correo.preparar();
    console.log(JSON.stringify({smtp_verificado: true, correo_enviado: false}));
  } catch {
    console.log(JSON.stringify({smtp_verificado: false, etapa, codigo, respuesta, correo_enviado: false}));
    process.exitCode = 1;
  }
}

main();
