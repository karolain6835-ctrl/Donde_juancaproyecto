export default function InventoryRemoteState({ resource, empty, children }) {
  if (resource.loading) return <p role="status">Cargando información...</p>;
  if (resource.error) return <div role="alert"><p>{resource.error}</p><button className="text-button" onClick={resource.refresh}>Reintentar</button></div>;
  if (!resource.data?.datos.length) return <p>{empty}</p>;
  return children;
}

export function InventoryPagination({ resource }) {
  const p = resource.data?.paginacion;
  if (!p) return null;
  return <div className="catalogo-actions"><button disabled={resource.loading || p.pagina <= 1} onClick={() => resource.setQuery({ ...resource.query, pagina: p.pagina - 1 })}>Anterior</button><span>Página {p.pagina} · {p.total} registros</span><button disabled={resource.loading || p.pagina >= p.total_paginas} onClick={() => resource.setQuery({ ...resource.query, pagina: p.pagina + 1 })}>Siguiente</button></div>;
}
