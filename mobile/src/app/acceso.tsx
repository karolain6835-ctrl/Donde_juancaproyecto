import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { colors, typography } from '../theme';

export default function AccessScreen() {
  const { login, logout, busy, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const passwordInput = useRef<TextInput>(null);

  async function submit() {
    if (submitting.current || busy) return;
    if (!email.trim() || !password) { setError('Escribe tu correo y contraseña.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Escribe un correo válido.'); return; }
    submitting.current = true; setError('');
    try { await login(email, password); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'No pudimos iniciar sesión. Intenta nuevamente.'); }
    finally { setPassword(''); setVisible(false); submitting.current = false; }
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen>
        <View style={styles.content}>
          <Text style={styles.label}>DONDE JUANCA · EQUIPO</Text>
          <Text accessibilityRole="header" style={styles.title}>Qué bueno verte</Text>
          <Text style={styles.body}>Inicia sesión para acceder a tu espacio de atención.</Text>
          <Text style={styles.fieldLabel}>Correo electrónico</Text>
          <TextInput accessibilityLabel="Correo electrónico" style={styles.input} value={email} onChangeText={setEmail}
            placeholder="Tu correo registrado" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}
            keyboardType="email-address" autoComplete="email" editable={!busy} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <TextInput ref={passwordInput} accessibilityLabel="Contraseña" style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Tu contraseña" placeholderTextColor={colors.muted} secureTextEntry={!visible}
            autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} returnKeyType="go" onSubmitEditing={() => void submit()} />
          <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible(v => !v)} disabled={busy} style={styles.toggle}>
            <Text style={styles.link}>{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
          </Pressable>
          {!!(error || notice) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{error || notice}</Text>}
          {!!notice && <Pressable accessibilityRole="button" onPress={() => void logout()} disabled={busy} style={styles.toggle}><Text style={styles.link}>Borrar sesión guardada</Text></Pressable>}
          <ActionButton label={busy ? 'Validando acceso…' : 'Iniciar sesión'} loading={busy} onPress={() => void submit()} />
          <Text style={styles.note}>Acceso exclusivo para cuentas con rol Mesera.</Text>
        </View>
        <ActionButton label="Volver a la bienvenida" disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 24 },
  label: { ...typography.body, color: colors.soft, fontSize: 12, letterSpacing: 1.5, fontWeight: '700' },
  title: { ...typography.display, color: colors.text, fontSize: 34 },
  body: { ...typography.body, color: colors.muted, fontSize: 17, lineHeight: 26, marginBottom: 12 },
  fieldLabel: { ...typography.body, color: colors.text, fontSize: 16, fontWeight: '600' },
  input: { ...typography.body, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, minHeight: 56, fontSize: 17 },
  toggle: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { ...typography.body, color: colors.soft, fontSize: 16, fontWeight: '600' },
  message: { ...typography.body, color: colors.soft, backgroundColor: colors.surface, padding: 16, borderRadius: 12, fontSize: 16, lineHeight: 24 },
  note: { ...typography.body, color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
