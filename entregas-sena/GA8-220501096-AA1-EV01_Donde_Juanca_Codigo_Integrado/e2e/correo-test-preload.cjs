// Doble de transporte exclusivo del proceso E2E. Nunca cargar en producción.
const fs = require('node:fs');
const path = require('node:path');
if (process.env.NODE_ENV !== 'test' || !/^dj_v1_e2e_[a-f0-9]{32}$/.test(process.env.DB_NAME || '')) throw Error('Transporte permitido solo en E2E aislada.');
const file = path.resolve(process.env.E2E_MAIL_FILE || '');
if (path.dirname(file) !== path.join(__dirname, 'test-results') || !/^correo-[a-f0-9]{32}\.log$/.test(path.basename(file))) throw Error('Buzón E2E inválido.');
require('../backend/node_modules/nodemailer').createTransport = () => ({
  verify: async () => true,
  sendMail: async mail => {
    fs.appendFileSync(file, JSON.stringify({to: mail.to, text: mail.text}) + '\n', {mode: 0o600});
    return {accepted: [mail.to], rejected: []};
  }
});
