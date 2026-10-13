import { Link } from 'react-router-dom';

export default function AccessDenied() {
  return (
    <section className="inventario-empty-section" role="alert">
      <p className="page-eyebrow">403 · ACCESO DENEGADO</p>
      <h1 className="page-title">No tienes permiso para acceder</h1>
      <p>Tu sesión sigue activa. Selecciona una opción disponible en el menú.</p>
      <Link to="/dashboard" className="primary-button">Volver al inicio</Link>
    </section>
  );
}
