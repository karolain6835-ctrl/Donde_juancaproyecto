import { useCallback, useState } from 'react';
import { can } from '../utils/permissions';
import { useRemoteCatalog } from './useRemoteCatalog';
import { listarMovimientos } from '../services/inventarioService';
import { listarMermas, listarMotivos, listarRefrigeradoresMerma } from '../services/mermasService';
import { listarAlertas } from '../services/alertasInventarioService';

export function useInventoryResources(user) {
  const [movementQuery, setMovementQuery] = useState({ pagina: 1 });
  const [mermaQuery, setMermaQuery] = useState({ pagina: 1 });
  const [alertQuery, setAlertQuery] = useState({ pagina: 1 });
  const movementsAllowed = can(user, 'inventario.movimientos');
  const mermasAllowed = can(user, 'mermas.ver');
  const alertsAllowed = can(user, 'alertas.ver');
  const registrationAllowed = can(user, 'mermas.registrar');
  const movementLoader = useCallback(options => movementsAllowed ? listarMovimientos(movementQuery, options) : Promise.resolve(null), [movementsAllowed, movementQuery]);
  const mermaLoader = useCallback(options => mermasAllowed ? listarMermas(mermaQuery, options) : Promise.resolve(null), [mermasAllowed, mermaQuery]);
  const alertLoader = useCallback(options => alertsAllowed ? listarAlertas(alertQuery, options) : Promise.resolve(null), [alertsAllowed, alertQuery]);
  const motiveLoader = useCallback(options => mermasAllowed ? listarMotivos(options) : Promise.resolve(null), [mermasAllowed]);
  const movements = useRemoteCatalog(movementLoader);
  const mermas = useRemoteCatalog(mermaLoader);
  const alerts = useRemoteCatalog(alertLoader);
  const motives = useRemoteCatalog(motiveLoader);
  const fridgeLoader = useCallback(options => registrationAllowed ? listarRefrigeradoresMerma(options) : Promise.resolve(null), [registrationAllowed]);
  const fridges = useRemoteCatalog(fridgeLoader);
  return { movements: { ...movements, query: movementQuery, setQuery: setMovementQuery }, mermas: { ...mermas, query: mermaQuery, setQuery: setMermaQuery }, alerts: { ...alerts, query: alertQuery, setQuery: setAlertQuery }, motives, fridges };
}
