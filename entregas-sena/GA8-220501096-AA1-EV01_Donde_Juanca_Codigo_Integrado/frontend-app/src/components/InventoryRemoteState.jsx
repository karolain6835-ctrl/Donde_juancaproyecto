export default function InventoryRemoteState({ resource, empty, children }) {
  if (resource.loading) return <p role="status">Cargando información...</p>;
  if (resource.error) return <div role="alert"><p>{resource.error}</p><button className="text-button" onClick={resource.refresh}>Reintentar</button></div>;
  if (!resource.data?.datos.length) return <p>{empty}</p>;
  return children;
}

export function InventoryPagination({ resource, compact = false }) {
  const p = resource.data?.paginacion;
  if (!p) return null;
  return <div className="catalogo-actions" role={compact ? 'navigation' : undefined} aria-label={compact ? 'Paginación de alertas' : undefined}><button disabled={resource.loading || p.pagina <= 1} onClick={() => resource.setQuery({ ...resource.query, pagina: p.pagina - 1 })}>{compact && <span aria-hidden="true">←</span>}Anterior</button><span aria-live={compact ? 'polite' : undefined}>{compact ? `Página ${p.pagina} de ${Math.max(1,p.total_paginas)}` : `Página ${p.pagina} · ${p.total} resultados`}</span><button disabled={resource.loading || p.pagina >= p.total_paginas} onClick={() => resource.setQuery({ ...resource.query, pagina: p.pagina + 1 })}>Siguiente{compact && <span aria-hidden="true">→</span>}</button></div>;
}
