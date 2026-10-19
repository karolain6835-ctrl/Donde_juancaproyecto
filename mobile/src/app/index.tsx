import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { colors, typography } from '../theme';

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.topline}>
        <View style={styles.dot} />
        <Text style={styles.eyebrow}>DONDE JUANCA · MÓVIL</Text>
      </View>
      <View style={styles.hero}>
        <View style={styles.logoFrame}>
          <Image source={require('../assets/brand/logo.png')} style={styles.logo}
            resizeMode="contain" accessibilityLabel="Logo de Donde Juanca" />
        </View>
        <Text accessibilityRole="header" style={styles.brand}>Donde Juanca</Text>
        <Text style={styles.subtitle}>Buena compañía. Mejor atención.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>ESPACIO DEL EQUIPO</Text>
        <Text accessibilityRole="header" style={styles.title}>¡Bienvenida!</Text>
        <Text style={styles.body}>Un lugar para acompañarte en la atención de cada mesa.</Text>
        <View style={styles.divider} />
        <Text style={styles.detail}>Mesas · Productos · Pedidos</Text>
        <Text style={styles.caption}>Todo comienza con una buena bienvenida.</Text>
      </View>
      <View style={styles.footer}>
        <ActionButton label="Ir al inicio de sesión  →" onPress={() => router.push('/acceso')}
          hint="Abre la pantalla de acceso al sistema móvil" />
        <Text style={styles.note}>Sistema móvil para el equipo de atención</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  eyebrow: { ...typography.body, color: colors.soft, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  hero: { alignItems: 'center', paddingVertical: 12, gap: 12 },
  logoFrame: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 20, marginBottom: 8 },
  logo: { width: 180, height: 110 },
  brand: { ...typography.display, color: colors.text, fontSize: 36, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 14, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.display, color: colors.text, fontSize: 30 },
  body: { ...typography.body, color: colors.muted, fontSize: 18, lineHeight: 28 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  detail: { ...typography.body, color: colors.soft, fontSize: 16, fontWeight: '600' },
  caption: { ...typography.body, color: colors.muted, fontSize: 14, lineHeight: 21 },
  footer: { marginTop: 'auto', gap: 16, paddingBottom: 12 },
  note: { ...typography.body, color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
