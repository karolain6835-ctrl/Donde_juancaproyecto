import { useCallback, useEffect, useRef, useState } from 'react';

/** Consulta un recurso remoto y expone datos, carga, error y recarga manual. */
export function useRemoteCatalog(loader) {
  // useState conserva los datos y los estados visibles entre renderizados.
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // useRef conserva el controlador de la petición sin provocar renderizados.
  const active = useRef(null);
  // useCallback estabiliza la recarga mientras loader no cambie; cancela la petición anterior.
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true); setError('');
    try {
      const result = await loader({ signal: controller.signal });
      if (!controller.signal.aborted) setData(result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error.status === 403 ? 'No tienes permiso para consultar este catálogo.' : error.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [loader]);
  // useEffect inicia la consulta y cancela peticiones al cambiar el cargador o desmontar.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) refresh(); });
    return () => { cancelled = true; active.current?.abort(); };
  }, [refresh]);
  return { data, loading, error, refresh };
}

/** Coordina escrituras y mensajes de resultado, evitando envíos simultáneos. */
export function useCatalogMutation() {
  // useRef bloquea duplicados inmediatamente; useState refleja progreso y mensajes.
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function run(operation, after, message) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setSuccess('');
    try { await operation(); setSuccess(message); await after(); }
    catch (error) { setError(error.status === 403 ? 'No tienes permiso para realizar esta acción.' : error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, success, run, reset() { setError(''); setSuccess(''); } };
}
