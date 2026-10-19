import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';

type Props = { label: string; onPress: () => void; hint?: string; disabled?: boolean; loading?: boolean };

export function ActionButton({ label, onPress, hint, disabled = false, loading = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress}
      disabled={disabled || loading} accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [styles.button, (pressed || disabled || loading) && styles.pressed]}>
      {loading && <ActivityIndicator color={colors.background} />}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.accent, minHeight: 56, borderRadius: 18, padding: 18, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  label: { ...typography.body, color: colors.background, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
