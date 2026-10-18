const nodemailer = require('nodemailer');
const noDisponible = () => Object.assign(new Error('No fue posible enviar el código. Intenta más tarde.'), {status: 503});

// Sin configuración completa no se consulta una cuenta ni se promete envío.
function crearCorreo(env = process.env, crearTransporte = nodemailer.createTransport) {
  const {SMTP_HOST: host, SMTP_USER: user, SMTP_PASSWORD: pass, MAIL_FROM: from} = env;
  const port = Number(env.SMTP_PORT);
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535 ||
      !['true', 'false'].includes(env.SMTP_SECURE) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from || '') || /[\r\n]/.test(host + user)) throw noDisponible();
  const transport = crearTransporte({host, port, secure: env.SMTP_SECURE === 'true', requireTLS: true,
    auth: {user, pass}, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    maxRecipients: 1, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000});
  return {
    async preparar() { try { await transport.verify(); } catch { throw noDisponible(); } },
    async enviar(to, codigo) {
      const result = await transport.sendMail({from, to, subject: 'Donde Juanca — Recupera tu contraseña',
        text: `Donde Juanca\n\nTu código de recuperación es: ${codigo}\n\nVence en 10 minutos y solo puede usarse una vez.\nSi no solicitaste este cambio, ignora este correo. No compartas el código.`,
        html: `<div style="font-family:Arial,sans-serif;color:#173c2d;max-width:480px;padding:24px"><h1>Donde Juanca</h1><h2>Recupera tu contraseña</h2><p>Tu código de recuperación es:</p><p style="font-size:30px;letter-spacing:6px;font-weight:bold">${codigo}</p><p>Vence en 10 minutos y solo puede usarse una vez.</p><p>Si no solicitaste este cambio, ignora este correo. No compartas el código.</p></div>`});
      if (!result.accepted?.length || result.rejected?.length) throw noDisponible();
    }
  };
}
module.exports = {crearCorreo, noDisponible};
