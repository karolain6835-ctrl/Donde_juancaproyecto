import {useRef, useState} from 'react';
import {solicitarRecuperacion, verificarRecuperacion, restablecerPassword, validarPasswordRecuperacion} from '../services/recuperacionService';

// El token y las contraseñas viven solo en memoria; cerrar el panel los descarta.
export default function RecuperacionPassword({onClose}) {
  const [paso, setPaso] = useState('correo');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [token, setToken] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const lock = useRef(false);
  async function enviar(e) {
    e.preventDefault();
    if (lock.current) return;
    setError(''); setMensaje('');
    if (paso === 'codigo' && !/^\d{6}$/.test(codigo)) { setError('Ingresa el código de 6 dígitos.'); return; }
    if (paso === 'password') {
      const problem = validarPasswordRecuperacion(nueva, confirmar);
      if (problem) { setError(problem); return; }
    }
    lock.current = true; setBusy(true);
    try {
      if (paso === 'correo') {
        const r = await solicitarRecuperacion(correo.trim());
        setMensaje(r.mensaje); setPaso('codigo');
      } else if (paso === 'codigo') {
        const r = await verificarRecuperacion(correo.trim(), codigo);
        if (!/^[a-f0-9]{64}$/.test(r.token_recuperacion || '')) throw new Error('No fue posible verificar el código. Intenta nuevamente.');
        setToken(r.token_recuperacion); setCodigo(''); setMensaje('Código verificado.'); setPaso('password');
      } else {
        await restablecerPassword(token, nueva, confirmar);
        setToken(''); setNueva(''); setConfirmar(''); setPaso('exito');
      }
    } catch (e) {
      const seguro = [400, 429, 503].includes(e.status);
      setError(e.status === 503 ? 'La recuperación de contraseña no está disponible actualmente. Intenta más tarde.' : seguro ? e.message : 'No fue posible completar la recuperación. Intenta nuevamente.');
    } finally { lock.current = false; setBusy(false); }
  }
  function empezar() { setToken(''); setCodigo(''); setNueva(''); setConfirmar(''); setError(''); setMensaje(''); setPaso('correo'); }
  return <section className="login-recovery" aria-label="Recuperar contraseña">
    <div className="login-form-header"><p className="login-form-eyebrow">DONDE JUANCA</p><h2>Recupera tu contraseña</h2>
      <p>{paso === 'correo' ? 'Te enviaremos un código para recuperar el acceso.' : paso === 'codigo' ? 'Escribe el código que recibiste. Vence en 10 minutos.' : paso === 'password' ? 'Elige una nueva contraseña. Tienes 5 minutos para completar el cambio.' : 'Ya puedes iniciar sesión con tu nueva contraseña.'}</p></div>
    {paso === 'exito' ? <><p className="login-recovery-success" role="status">Contraseña actualizada correctamente.</p><button className="login-submit" type="button" onClick={onClose}>Volver a iniciar sesión</button></> :
      <form className="login-form" onSubmit={enviar}>
        <fieldset className="login-recovery-fields" disabled={busy}>
          {paso === 'correo' && <label>Correo electrónico<div className="login-input-wrapper"><input type="email" required autoComplete="email" maxLength={150} value={correo} onChange={e => setCorreo(e.target.value)} /></div></label>}
          {paso === 'codigo' && <label>Código de recuperación<div className="login-input-wrapper"><input type="text" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={codigo} onChange={e => setCodigo(e.target.value)} /></div></label>}
          {paso === 'password' && <><label>Nueva contraseña<div className="login-input-wrapper"><input type="password" required autoComplete="new-password" value={nueva} onChange={e => setNueva(e.target.value)} /></div></label><label>Confirmar nueva contraseña<div className="login-input-wrapper"><input type="password" required autoComplete="new-password" value={confirmar} onChange={e => setConfirmar(e.target.value)} /></div></label></>}
          {mensaje && <p role="status" className="login-recovery-success">{mensaje}</p>}
          {error && <div role="alert" className="login-error">{error}</div>}
          <button type="submit" className="login-submit" aria-busy={busy}>{busy ? 'Procesando…' : paso === 'correo' ? 'Enviar código' : paso === 'codigo' ? 'Verificar código' : 'Guardar contraseña'}</button>
          {paso !== 'correo' && <button type="button" className="login-recovery-link" onClick={empezar}>Solicitar un nuevo código</button>}
          <button type="button" className="login-recovery-link" onClick={onClose}>Volver a iniciar sesión</button>
        </fieldset>
      </form>}
  </section>;
}
