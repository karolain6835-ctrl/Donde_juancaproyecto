export default function OperacionRemoteState({ resource, empty, children }) {
  if (resource.loading) return <p role="status">Cargando información...</p>;
  if (resource.error) return <div role="alert"><p>{resource.error}</p><button className="drawer-secondary-button" onClick={resource.refresh}>Reintentar</button></div>;
  if (empty && !(Array.isArray(resource.data) ? resource.data.length : resource.data?.datos?.length)) return <p>{empty}</p>;
  return children;
}
