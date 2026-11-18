import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useSession } from '../src/lib/session'
import { colors } from '../src/theme'

export default function Index() {
  const { user, loading } = useSession()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return <Redirect href={user ? '/(app)/home' : '/(auth)/sign-in'} />
}
