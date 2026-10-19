import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

export default function RootLayout() {
  return <AuthProvider><Navigation /></AuthProvider>;
}

function Navigation() {
  const { user, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><StatusBar style="light" /><ActivityIndicator accessibilityLabel="Validando sesión" color={colors.accent} size="large" /></View>;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="acceso" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="panel" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
