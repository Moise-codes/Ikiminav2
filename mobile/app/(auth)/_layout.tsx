import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useSession } from '../../src/lib/session'
import { colors } from '../../src/theme'

export default function AuthLayout() {
  const { user, loading } = useSession()
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }
  if (user) return <Redirect href="/(app)/home" />
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: 'slide_from_right',
      }}
    />
  )
}
