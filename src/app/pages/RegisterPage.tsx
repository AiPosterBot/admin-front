import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router'
import { Sparkles, Eye, EyeOff, CheckCircle, Mail } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { PublicThemeToggle } from '../components/PublicThemeToggle'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { registerStart, registerVerify, registerUser } = useAuth()

  const rawToken = searchParams.get('token') || ''
  const prefillEmail = searchParams.get('email') || ''

  const [step, setStep] = useState<'form' | 'code' | 'done'>('form')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResendingCode, setIsResendingCode] = useState(false)
  const [resendCooldownSec, setResendCooldownSec] = useState(0)

  useEffect(() => {
    if (resendCooldownSec <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setResendCooldownSec((current) => Math.max(0, current - 1))
    }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [resendCooldownSec])

  const validateForm = () => {
    if (!displayName.trim()) {
      setError('Введите имя')
      return false
    }

    if (!email.trim()) {
      setError('Введите email')
      return false
    }

    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return false
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return false
    }

    return true
  }

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await registerStart(email.trim())
      setStep('code')
      setResendCooldownSec(30)
    } catch (registerError: any) {
      setError(registerError.message || 'Не удалось отправить код подтверждения')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setIsResendingCode(true)

    try {
      await registerStart(email.trim())
      setResendCooldownSec(30)
    } catch (resendError: any) {
      setError(resendError.message || 'Не удалось отправить код повторно')
    } finally {
      setIsResendingCode(false)
    }
  }

  const handleVerifyAndCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await registerVerify(email.trim(), code.trim())

      await registerUser({
        email: email.trim(),
        displayName: displayName.trim(),
        password,
        token: rawToken || undefined,
        verificationToken: result.verificationToken,
      })

      setStep('done')
      navigate('/', { replace: true })
    } catch (verifyError: any) {
      setError(verifyError.message || 'Не удалось подтвердить email')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Аккаунт создан</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Переходим в рабочее пространство...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <PublicThemeToggle />
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              {step === 'form' ? <Sparkles className="size-8 text-blue-600 dark:text-blue-400" /> : <Mail className="size-8 text-blue-600 dark:text-blue-400" />}
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{step === 'form' ? 'Регистрация' : 'Подтвердите email'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {step === 'form'
                ? rawToken
                  ? 'Создайте аккаунт по приглашению'
                  : 'Создайте аккаунт AI Poster'
                : `Мы отправили код на ${email}`}
            </p>
          </div>

          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {step === 'form' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="mb-1 block">Имя</Label>
                <Input id="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoFocus />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="mb-1 block">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(prefillEmail)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="mb-1 block">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="mb-1 block">Подтвердите пароль</Label>
                <Input id="confirm" type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Отправка кода...' : 'Продолжить'}
              </Button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="mb-1 block">Код подтверждения</Label>
                <Input id="code" placeholder="123456" value={code} onChange={(event) => setCode(event.target.value)} autoFocus className="text-center text-lg tracking-widest" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                <span>Код не пришел?</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleResendCode()}
                  disabled={isSubmitting || isResendingCode || resendCooldownSec > 0}
                  className="h-auto px-0 text-blue-600 hover:bg-transparent hover:text-blue-700 dark:text-blue-300 dark:hover:bg-transparent dark:hover:text-blue-200"
                >
                  {isResendingCode ? 'Отправляем...' : resendCooldownSec > 0 ? `Отправить повторно через ${resendCooldownSec}с` : 'Отправить повторно'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('form')} disabled={isSubmitting}>
                  Назад
                </Button>
                <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting || !code.trim()}>
                  {isSubmitting ? 'Проверка...' : 'Подтвердить и создать'}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

