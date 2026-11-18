import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, authApi, sessionEvents, tokenStore } from './api'
import type { AuthResponse, UserProfile } from './types'

interface SessionValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  startSession: (response: AuthResponse) => void
  signOut: (allSessions?: boolean) => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(tokenStore.access))

  useEffect(() => sessionEvents.subscribe(() => setHasToken(Boolean(tokenStore.access))), [])

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hasToken,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) return false
      return failureCount < 1
    },
  })

  // A stored token can be revoked server-side; drop it rather than loop.
  useEffect(() => {
    const error = meQuery.error
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      tokenStore.clear()
    }
  }, [meQuery.error])

  const startSession = useCallback(
    (response: AuthResponse) => {
      if (response.tokens) tokenStore.set(response.tokens)
      queryClient.setQueryData(['me'], response.user)
      queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const signOut = useCallback(
    async (allSessions = false) => {
      try {
        await authApi.logout(allSessions)
      } catch {
        // Signing out locally must still succeed if the API is unreachable.
      }
      tokenStore.clear()
      queryClient.clear()
    },
    [queryClient],
  )

  const value = useMemo<SessionValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: hasToken && meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      startSession,
      signOut,
    }),
    [hasToken, meQuery.data, meQuery.isLoading, signOut, startSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside SessionProvider')
  return context
}
