import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ActionButton } from '../components/ActionButton';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

export default function DashboardScreen() {
  const { user, logout, busy } = useAuth();
  if (!user) return null;
  return (
    <Screen>
      <Text style={styles.label}>DONDE JUANCA · MESERAS</Text>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>Hola, {user.nombre}</Text>
        <Text style={styles.body}>Bienvenida a tu espacio de atención.</Text>
      </View>
      {[
        ['Mesas', 'Consulta y atención de las mesas.'],
        ['Pedidos', 'Registro y consulta de los pedidos.'],
      ].map(([title, description]) => (
        <View key={title} style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
          <Text style={styles.body}>{description}</Text>
          <Text style={styles.badge}>Próximamente</Text>
        </View>
      ))}
      <View style={styles.footer}><ActionButton label="Cerrar sesión" loading={busy} onPress={() => void logout()} /></View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { ...typography.body, color: colors.soft, fontSize: 12, letterSpacing: 1.5, fontWeight: '700', marginTop: 12 },
  intro: { gap: 16, paddingVertical: 16 },
  title: { ...typography.display, color: colors.text, fontSize: 32 },
  body: { ...typography.body, color: colors.muted, fontSize: 17, lineHeight: 26 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardTitle: { ...typography.body, color: colors.text, fontSize: 24, fontWeight: '700' },
  badge: { ...typography.body, color: colors.soft, fontSize: 14, fontWeight: '600' },
  footer: { marginTop: 'auto', paddingVertical: 12 },
});
