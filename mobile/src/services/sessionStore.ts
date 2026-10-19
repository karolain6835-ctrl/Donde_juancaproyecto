import * as SecureStore from 'expo-secure-store';
import { parseSession, type Session } from './auth';

const key = 'dondejuanca.session.v1';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function available() {
  if (!await SecureStore.isAvailableAsync()) throw new Error('El almacenamiento seguro no está disponible en este dispositivo.');
}
export async function readSession() {
  await available();
  const raw = await SecureStore.getItemAsync(key, options);
  return raw ? parseSession(JSON.parse(raw)) : null;
}
export async function saveSession(session: Session) {
  await available();
  await SecureStore.setItemAsync(key, JSON.stringify(session), options);
}
export async function deleteSession() {
  await available();
  await SecureStore.deleteItemAsync(key, options);
}
