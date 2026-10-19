// Configuración cerrada por defecto: solamente el perfil preview-local habilita HTTP.
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const localHttp = profile === 'preview-local';
  const api = process.env.EXPO_PUBLIC_API_URL;
  if (profile) {
    let url;
    try { url = new URL(api); } catch { throw new Error('Define EXPO_PUBLIC_API_URL para el entorno EAS seleccionado.'); }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('La API debe ser un origen sin ruta ni credenciales.');
    }
    if (url.protocol !== 'https:' && !(localHttp && api === 'http://192.168.2.232:5000')) {
      throw new Error('Este perfil exige HTTPS; solo preview-local admite el origen LAN autorizado.');
    }
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('La API debe ser accesible desde el teléfono.');
  }
  // Expo incorpora este valor al JS. No se acepta una bandera pública externa.
  process.env.EXPO_PUBLIC_LOCAL_API_ALLOWED = localHttp ? 'true' : 'false';
  return {
    ...config,
    plugins: [...(config.plugins || []), ['./plugins/withNetworkSecurity', { localHttp }]],
  };
};
