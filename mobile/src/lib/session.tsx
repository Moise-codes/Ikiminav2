import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, tokenStore, type User } from './api'

interface SessionValue {
  user: User | null
  loading: boolean
  signIn: (phone: string, password: string) => Promise<void>
  verify: (phone: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      const profile = await api.me()
      setUser(profile)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      await tokenStore.hydrate()
      if (!active) return
      if (tokenStore.access) await loadUser()
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [loadUser])

  const signIn = useCallback(
    async (phone: string, password: string) => {
      const response = await api.login(phone, password)
      await tokenStore.set(response.tokens)
      setUser(response.user)
    },
    [],
  )

  const verify = useCallback(async (phone: string, code: string) => {
    const response = await api.verifyPhone(phone, code)
    await tokenStore.set(response.tokens)
    setUser(response.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Local sign-out must succeed even when the API is unreachable.
    }
    await tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo<SessionValue>(
    () => ({ user, loading, signIn, verify, signOut, reload: loadUser }),
    [user, loading, signIn, verify, signOut, loadUser],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside SessionProvider')
  return context
}
