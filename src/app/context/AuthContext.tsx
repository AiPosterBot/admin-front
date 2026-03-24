import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiPost } from '../lib/api'
import { clearSession, getEmptySession, readSession, writeSession, type AuthSession } from '../lib/session'

interface LoginUserInput {
  email: string
  password: string
}

interface RegisterVerifyResult {
  verificationToken: string
}

interface RegisterUserInput {
  email: string
  displayName: string
  password: string
  token?: string
  verificationToken: string
}

interface LoginAdminInput {
  nickname: string
  password: string
}

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

interface ForgotPasswordVerifyResult {
  verificationToken: string
}

interface AuthContextType {
  session: AuthSession
  authType: AuthSession['mode']
  currentUser: AuthSession['user']
  currentAdmin: AuthSession['admin']
  isLoggedIn: boolean
  isAdminLoggedIn: boolean
  isReady: boolean
  loginUser: (input: LoginUserInput) => Promise<void>
  registerStart: (email: string) => Promise<void>
  registerVerify: (email: string, code: string) => Promise<RegisterVerifyResult>
  registerUser: (input: RegisterUserInput) => Promise<void>
  loginAdmin: (input: LoginAdminInput) => Promise<void>
  logout: () => Promise<void>
  changePassword: (input: ChangePasswordInput) => Promise<void>
  forgotPasswordStart: (email: string) => Promise<void>
  forgotPasswordVerify: (email: string, code: string) => Promise<ForgotPasswordVerifyResult>
  forgotPasswordConfirm: (email: string, verificationToken: string, newPassword: string) => Promise<void>
  refresh: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toUserSession(body: any): AuthSession {
  return {
    mode: 'user',
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user,
    admin: null,
  }
}

function toAdminSession(body: any): AuthSession {
  return {
    mode: 'admin',
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: null,
    admin: body.admin,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(() => readSession())
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setSession(readSession())
    setIsReady(true)
  }, [])

  const persistSession = useCallback((nextSession: AuthSession) => {
    writeSession(nextSession)
    setSession(nextSession)
  }, [])

  const refresh = useCallback(() => {
    setSession(readSession())
  }, [])

  const loginUser = useCallback(async (input: LoginUserInput) => {
    const body = await apiPost<any>('/api/auth/user/login', input, { skipAuth: true })
    persistSession(toUserSession(body))
  }, [persistSession])

  const registerStart = useCallback(async (email: string) => {
    await apiPost('/api/auth/user/register/start', { email }, { skipAuth: true })
  }, [])

  const registerVerify = useCallback(async (email: string, code: string) => {
    return apiPost<RegisterVerifyResult>('/api/auth/user/register/verify', { email, code }, { skipAuth: true })
  }, [])

  const registerUser = useCallback(async (input: RegisterUserInput) => {
    const body = await apiPost<any>('/api/auth/user/register', input, { skipAuth: true })
    persistSession(toUserSession(body))
  }, [persistSession])

  const loginAdmin = useCallback(async (input: LoginAdminInput) => {
    const body = await apiPost<any>('/api/auth/admin/login', input, { skipAuth: true })
    persistSession(toAdminSession(body))
  }, [persistSession])

  const logout = useCallback(async () => {
    const currentSession = readSession()

    try {
      if (currentSession.refreshToken) {
        await apiPost('/api/auth/logout', { refreshToken: currentSession.refreshToken }, { skipAuth: true, retryOnUnauthorized: false })
      }
    } finally {
      clearSession()
      setSession(getEmptySession())
    }
  }, [])

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await apiPost('/api/auth/change-password', input)
    await logout()
  }, [logout])

  const forgotPasswordStart = useCallback(async (email: string) => {
    await apiPost('/api/auth/forgot-password/start', { email }, { skipAuth: true })
  }, [])

  const forgotPasswordVerify = useCallback(async (email: string, code: string) => {
    return apiPost<ForgotPasswordVerifyResult>('/api/auth/forgot-password/verify', { email, code }, { skipAuth: true })
  }, [])

  const forgotPasswordConfirm = useCallback(async (email: string, verificationToken: string, newPassword: string) => {
    await apiPost('/api/auth/forgot-password/confirm', { email, verificationToken, newPassword }, { skipAuth: true })
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    session,
    authType: session.mode,
    currentUser: session.user,
    currentAdmin: session.admin,
    isLoggedIn: session.mode === 'user' && Boolean(session.accessToken) && Boolean(session.user),
    isAdminLoggedIn: session.mode === 'admin' && Boolean(session.accessToken) && Boolean(session.admin),
    isReady,
    loginUser,
    registerStart,
    registerVerify,
    registerUser,
    loginAdmin,
    logout,
    changePassword,
    forgotPasswordStart,
    forgotPasswordVerify,
    forgotPasswordConfirm,
    refresh,
  }), [session, isReady, loginUser, registerStart, registerVerify, registerUser, loginAdmin, logout, changePassword, forgotPasswordStart, forgotPasswordVerify, forgotPasswordConfirm, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

