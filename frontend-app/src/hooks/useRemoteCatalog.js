import { useCallback, useEffect, useRef, useState } from 'react';

export function useRemoteCatalog(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const active = useRef(null);
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
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) refresh(); });
    return () => { cancelled = true; active.current?.abort(); };
  }, [refresh]);
  return { data, loading, error, refresh };
}

export function useCatalogMutation() {
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
