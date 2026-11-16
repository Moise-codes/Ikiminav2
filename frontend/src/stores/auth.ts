import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  full_name: string
  phone: string
  email?: string
  phone_verified: boolean
  email_verified: boolean
  preferred_language: 'rw' | 'en' | 'fr'
  status: 'active' | 'locked' | 'deactivated' | 'anonymized'
  is_platform_admin: boolean
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (phone: string, password: string) => Promise<void>
  register: (fullName: string, phone: string, password: string, email?: string) => Promise<void>
  verifyPhone: (phone: string, code: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  getCurrentUser: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', {
            phone,
            password,
          })
          api.setToken(response.access_token)
          localStorage.setItem('refresh_token', response.refresh_token)
          await get().getCurrentUser()
          set({ isAuthenticated: true, isLoading: false })
        } catch (error: any) {
          set({ error: error.response?.data?.error?.message || 'Login failed', isLoading: false })
          throw error
        }
      },

      register: async (fullName: string, phone: string, password: string, email?: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.post('/auth/register', {
            full_name: fullName,
            phone,
            password,
            email,
          })
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.response?.data?.error?.message || 'Registration failed', isLoading: false })
          throw error
        }
      },

      verifyPhone: async (phone: string, code: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/verify-phone', {
            phone,
            code,
          })
          api.setToken(response.access_token)
          localStorage.setItem('refresh_token', response.refresh_token)
          await get().getCurrentUser()
          set({ isAuthenticated: true, isLoading: false })
        } catch (error: any) {
          set({ error: error.response?.data?.error?.message || 'Verification failed', isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await api.post('/auth/logout')
        } catch (error) {
          // Ignore logout errors
        } finally {
          api.clearToken()
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          get().logout()
          return
        }
        try {
          const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
            refresh_token: refreshToken,
          })
          api.setToken(response.access_token)
          localStorage.setItem('refresh_token', response.refresh_token)
        } catch (error) {
          get().logout()
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true })
        try {
          const user = await api.get<User>('/auth/me')
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true })
        try {
          const user = await api.patch<User>('/auth/me', data)
          set({ user, isLoading: false })
        } catch (error: any) {
          set({ error: error.response?.data?.error?.message || 'Update failed', isLoading: false })
          throw error
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
