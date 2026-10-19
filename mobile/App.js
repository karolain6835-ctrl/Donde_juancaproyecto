// Conserva el componente raíz y el registro existente en index.js.
import { ExpoRoot } from 'expo-router';

const routes = require.context('./src/app');

export default function App() {
  return <ExpoRoot context={routes} />;
}
