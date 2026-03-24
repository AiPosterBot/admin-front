import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ForgotPasswordPage } from '../app/pages/ForgotPasswordPage'
import { InviteAcceptPage } from '../app/pages/InviteAcceptPage'
import { LoginPage } from '../app/pages/LoginPage'
import { OnboardingPage } from '../app/pages/OnboardingPage'
import { RegisterPage } from '../app/pages/RegisterPage'
import { ThemeProvider } from '../app/context/ThemeContext'

const authMock = {
  loginUser: vi.fn(),
  registerStart: vi.fn(),
  registerVerify: vi.fn(),
  registerUser: vi.fn(),
  forgotPasswordStart: vi.fn(),
  forgotPasswordVerify: vi.fn(),
  forgotPasswordConfirm: vi.fn(),
  isLoggedIn: false,
  currentUser: null,
}

const teamMock = {
  createTeam: vi.fn(),
  setCurrentTeamId: vi.fn(),
  refreshTeams: vi.fn(),
}

const memberServiceMock = {
  acceptInvitation: vi.fn(),
}

vi.mock('../app/context/AuthContext', () => ({
  useAuth: () => authMock,
}))

vi.mock('../app/context/TeamContext', () => ({
  useTeam: () => teamMock,
}))

vi.mock('../app/services/memberService', () => ({
  acceptInvitation: (...args: unknown[]) => memberServiceMock.acceptInvitation(...args),
}))

function renderWithRouter(ui: ReactNode, initialEntry = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={ui} />
          <Route path="/register" element={ui} />
          <Route path="/forgot-password" element={ui} />
          <Route path="/onboarding" element={ui} />
          <Route path="/invite/:token" element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('public pages smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMock.isLoggedIn = false
    authMock.currentUser = null
    authMock.loginUser.mockResolvedValue(undefined)
    authMock.registerStart.mockResolvedValue(undefined)
    authMock.registerVerify.mockResolvedValue({ verificationToken: 'register-token' })
    authMock.registerUser.mockResolvedValue(undefined)
    authMock.forgotPasswordStart.mockResolvedValue(undefined)
    authMock.forgotPasswordVerify.mockResolvedValue({ verificationToken: 'verify-token' })
    authMock.forgotPasswordConfirm.mockResolvedValue(undefined)

    teamMock.createTeam.mockResolvedValue({ id: 'team-1', name: 'Team 1' })
    teamMock.setCurrentTeamId.mockImplementation(() => {})
    teamMock.refreshTeams.mockResolvedValue(undefined)

    memberServiceMock.acceptInvitation.mockResolvedValue({
      success: true,
      team: { id: 'team-1', name: 'Team 1' },
    })
  })

  it('renders login and submits credentials', async () => {
    renderWithRouter(<LoginPage />, '/login')

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(authMock.loginUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      })
    })
  })

  it('renders register and completes code verification flow', async () => {
    renderWithRouter(<RegisterPage />, '/register')

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('Подтвердите пароль'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))

    await waitFor(() => {
      expect(authMock.registerStart).toHaveBeenCalledWith('john@example.com')
    })

    fireEvent.change(screen.getByLabelText('Код подтверждения'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }))

    await waitFor(() => {
      expect(authMock.registerVerify).toHaveBeenCalledWith('john@example.com', '123456')
      expect(authMock.registerUser).toHaveBeenCalledWith({
        email: 'john@example.com',
        displayName: 'John',
        password: 'secret123',
        token: undefined,
        verificationToken: 'register-token',
      })
    })
  })

  it('renders forgot password flow and moves to code step', async () => {
    renderWithRouter(<ForgotPasswordPage />, '/forgot-password')

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'reset@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить код' }))

    await waitFor(() => {
      expect(authMock.forgotPasswordStart).toHaveBeenCalledWith('reset@example.com')
    })

    expect(screen.getByText('Введите код')).toBeInTheDocument()
  })

  it('renders onboarding and creates team', async () => {
    renderWithRouter(<OnboardingPage />, '/onboarding')

    fireEvent.change(screen.getByLabelText('Название команды'), { target: { value: 'My Team' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать команду' }))

    await waitFor(() => {
      expect(teamMock.createTeam).toHaveBeenCalledWith('My Team')
      expect(teamMock.setCurrentTeamId).toHaveBeenCalledWith('team-1')
    })
  })

  it('renders invite accept page for logged-in user and accepts invite', async () => {
    authMock.isLoggedIn = true
    authMock.currentUser = { id: 'user-1', email: 'member@example.com' } as any

    renderWithRouter(<InviteAcceptPage />, '/invite/test-token')

    fireEvent.click(screen.getByRole('button', { name: 'Принять приглашение' }))

    await waitFor(() => {
      expect(memberServiceMock.acceptInvitation).toHaveBeenCalledWith('test-token')
      expect(teamMock.refreshTeams).toHaveBeenCalled()
    })

    expect(await screen.findByText('Приглашение принято')).toBeInTheDocument()
  })
})

