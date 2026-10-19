import { Platform } from 'react-native';

// Usar body en formularios y en futuros datos de mesas, pedidos y precios.
export const typography = {
  body: { fontFamily: Platform.select({ android: 'sans-serif', ios: 'Helvetica Neue', default: 'Arial' }) },
  display: { fontFamily: Platform.select({ android: 'cursive', ios: 'Snell Roundhand', default: 'cursive' }), fontWeight: '400' as const },
};

export const colors = {
  background: '#18181B',
  surface: '#27272A',
  accent: '#A78BFA',
  soft: '#E9C9FF',
  text: '#FFFFFF',
  muted: '#C4C4CD',
  border: '#3F3F46',
};
