import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AlertCircle, CheckCircle, UserPlus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { PublicThemeToggle } from '../components/PublicThemeToggle'
import { useAuth } from '../context/AuthContext'
import { useTeam } from '../context/TeamContext'
import { acceptInvitation } from '../services/memberService'

export function InviteAcceptPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, currentUser } = useAuth()
  const { refreshTeams } = useTeam()
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
        <PublicThemeToggle />
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertCircle className="size-8 text-red-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Некорректная ссылка</h1>
          <Button asChild>
            <Link to="/login">Перейти ко входу</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleAccept = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      await acceptInvitation(token)
      await refreshTeams()
      setAccepted(true)
    } catch (acceptError: any) {
      setError(acceptError.message || 'Не удалось принять приглашение')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
        <PublicThemeToggle />
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Приглашение принято</h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Команда добавлена в ваш рабочий контекст.</p>
          <Button onClick={() => navigate('/')}>Перейти к команде</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-950 dark:to-gray-900">
      <PublicThemeToggle />
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl dark:shadow-black/40">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <UserPlus className="size-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Приглашение в команду</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLoggedIn && currentUser
              ? `Вы вошли как ${currentUser.email}`
              : 'Войдите или зарегистрируйтесь, затем подтвердите приглашение'}
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoggedIn ? (
          <Button onClick={() => void handleAccept()} className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Подтверждение...' : 'Принять приглашение'}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                Войти и принять
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to={`/register?token=${encodeURIComponent(token)}`}>
                Зарегистрироваться
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

