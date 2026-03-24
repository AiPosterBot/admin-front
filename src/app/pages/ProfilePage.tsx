import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Globe, Link as LinkIcon, Lock, QrCode, Save, Unplug } from 'lucide-react'
import { toast } from 'sonner'

import { UserAvatar } from '../components/UserAvatar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth } from '../context/AuthContext'
import { getTimezoneOptions } from '../lib/timezones'
import { readSession, writeSession } from '../lib/session'
import { checkTelegramLink, getProfile, startTelegramLink, unlinkTelegram, updateProfile, type ProfileRecord, type TelegramLinkStartResult } from '../services/profileService'

const TIMEZONE_OPTIONS = getTimezoneOptions()

function extractBotUsername(link: string | null) {
  if (!link) {
    return null
  }

  const match = link.match(/t\.me\/([^/?]+)/i)
  return match?.[1] ?? null
}

export function ProfilePage() {
  const { currentUser, changePassword, refresh } = useAuth()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '')
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [linkData, setLinkData] = useState<TelegramLinkStartResult | null>(null)
  const [isStartingLink, setIsStartingLink] = useState(false)
  const [isCheckingLink, setIsCheckingLink] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [linkPending, setLinkPending] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        const nextProfile = await getProfile()
        if (!isMounted) {
          return
        }

        setProfile(nextProfile)
        setDisplayName(nextProfile.displayName)
        setTimezone(nextProfile.timezone)
      } catch (error) {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'Не удалось загрузить профиль')
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!linkPending) {
      return
    }

    const timer = window.setInterval(() => {
      void handleCheckTelegramLink(true)
    }, 4000)

    return () => {
      window.clearInterval(timer)
    }
  }, [linkPending])

  const selectedTimezoneLabel = useMemo(
    () => TIMEZONE_OPTIONS.find((option) => option.value === timezone)?.label ?? timezone,
    [timezone],
  )

  const botUsername = useMemo(() => extractBotUsername(linkData?.deepLink ?? null), [linkData?.deepLink])

  if (!currentUser) {
    return null
  }

  const applyProfile = (nextProfile: ProfileRecord) => {
    setProfile(nextProfile)
    setDisplayName(nextProfile.displayName)
    setTimezone(nextProfile.timezone)
  }

  async function handleCheckTelegramLink(isSilent = false) {
    try {
      setIsCheckingLink(true)
      const status = await checkTelegramLink()
      applyProfile(status.profile)
      setLinkPending(status.pending)

      if (status.linked) {
        setLinkData(null)
        setLinkPending(false)
        if (!isSilent) {
          toast.success('Telegram-аккаунт успешно привязан')
        }
      } else if (!status.pending && !isSilent) {
        toast.info('Привязка ещё не завершена')
      }
    } catch (error) {
      if (!isSilent) {
        toast.error(error instanceof Error ? error.message : 'Не удалось проверить статус привязки')
      }
    } finally {
      setIsCheckingLink(false)
    }
  }

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingProfile(true)

    try {
      const nextProfile = await updateProfile({ displayName, timezone })
      applyProfile(nextProfile)

      const session = readSession()
      if (session.user) {
        writeSession({
          ...session,
          user: {
            ...session.user,
            displayName: nextProfile.displayName,
            timezone: nextProfile.timezone,
          },
        })
        refresh()
      }

      toast.success('Профиль сохранён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить профиль')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    setIsSavingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      toast.success('Пароль изменён. Войдите заново.')
    } catch (changeError) {
      toast.error(changeError instanceof Error ? changeError.message : 'Не удалось сменить пароль')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleStartTelegramLink = async () => {
    try {
      setIsStartingLink(true)
      const nextLinkData = await startTelegramLink()
      setLinkData(nextLinkData)
      setLinkPending(true)
      toast.success('Ссылка для привязки Telegram создана')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось начать привязку Telegram')
    } finally {
      setIsStartingLink(false)
    }
  }

  const handleCopyLink = async () => {
    if (!linkData?.deepLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(linkData.deepLink)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const handleUnlinkTelegram = async () => {
    try {
      setIsUnlinking(true)
      const nextProfile = await unlinkTelegram()
      applyProfile(nextProfile)
      setLinkData(null)
      setLinkPending(false)
      toast.success('Telegram-аккаунт отвязан')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отвязать Telegram')
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Профиль</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Базовые настройки аккаунта и привязка Telegram</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={displayName || currentUser.displayName} size="xl" />
            <div>
              <h2 className="text-2xl font-bold">{displayName || currentUser.displayName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="text-gray-600 dark:text-gray-400">Email</Label>
              <div className="mt-1 font-mono text-sm">{currentUser.email}</div>
            </div>
            <div>
              <Label className="text-gray-600 dark:text-gray-400">ID пользователя</Label>
              <div className="mt-1 font-mono text-sm">{currentUser.id}</div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-gray-600 dark:text-gray-400">Текущий часовой пояс</Label>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedTimezoneLabel}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSaveProfile(event)} className="space-y-4">
            <div>
              <Label htmlFor="display-name" className="mb-2 block">
                Имя
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={isLoadingProfile || isSavingProfile}
              />
            </div>

            <div>
              <Label htmlFor="timezone" className="mb-2 block">
                Часовой пояс
              </Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={isLoadingProfile || isSavingProfile}>
                <SelectTrigger className="w-full sm:w-[420px]">
                  <SelectValue placeholder="Выберите часовой пояс" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoadingProfile || isSavingProfile}>
              <Save className="mr-2 size-4" />
              {isSavingProfile ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Привязка Telegram-аккаунта
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.telegramUsername ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-900">
                    <LinkIcon className="size-4" />
                    Telegram привязан
                  </div>
                  <div className="mt-2 text-sm text-green-800">
                    Username: <span className="font-mono">@{profile.telegramUsername}</span>
                  </div>
                  <div className="mt-1 text-xs text-green-700">
                    Связано: {profile.telegramLinkedAt ? new Date(profile.telegramLinkedAt).toLocaleString('ru-RU') : '—'}
                  </div>
                </div>
                <Button variant="outline" onClick={() => void handleUnlinkTelegram()} disabled={isUnlinking} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20">
                  <Unplug className="mr-2 size-4" />
                  {isUnlinking ? 'Отвязка...' : 'Отвязать'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Telegram-аккаунт ещё не привязан. После привязки вы сможете создавать рекламные посты через бота и сохранять их в нужную команду.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void handleStartTelegramLink()} disabled={isStartingLink}>
              <LinkIcon className="mr-2 size-4" />
              {isStartingLink ? 'Создание ссылки...' : profile?.telegramUsername ? 'Перепривязать Telegram' : 'Привязать Telegram'}
            </Button>
            <Button variant="outline" onClick={() => void handleCheckTelegramLink()} disabled={isCheckingLink}>
              {isCheckingLink ? 'Проверка...' : 'Проверить статус'}
            </Button>
          </div>

          {linkPending && !profile?.telegramUsername ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Ожидается подтверждение в Telegram. Откройте бота, нажмите старт по deep link и вернитесь сюда.
            </div>
          ) : null}

          {linkData ? (
            <div className="grid gap-4 rounded-lg border p-4 dark:border-gray-800 md:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Шаг 1. Откройте deep link</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a href={linkData.deepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-blue-900/20">
                      <ExternalLink className="size-4" />
                      {botUsername ? `Открыть @${botUsername}` : 'Открыть Telegram-бота'}
                    </a>
                    <Button variant="outline" onClick={() => void handleCopyLink()}>
                      <Copy className="mr-2 size-4" />
                      Копировать ссылку
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Шаг 2. Нажмите Start в Telegram</div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Бот подтвердит привязку и аккаунт автоматически появится в профиле.
                  </div>
                </div>

                <div className="rounded-md border bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <QrCode className="size-4" />
                    Deep link
                  </div>
                  <div className="break-all font-mono text-xs text-gray-500 dark:text-gray-400">{linkData.deepLink}</div>
                </div>
              </div>

              <div className="flex items-center justify-center rounded-lg border bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
                <img src={linkData.qrUrl} alt="Telegram link QR" className="h-48 w-48 rounded-md" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleChangePassword(event)} className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="mb-2 block">
                Текущий пароль
              </Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((state) => ({ ...state, currentPassword: event.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="new-password" className="mb-2 block">
                Новый пароль
              </Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((state) => ({ ...state, newPassword: event.target.value }))}
                required
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="mb-2 block">
                Подтвердите новый пароль
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((state) => ({ ...state, confirmPassword: event.target.value }))}
                required
              />
            </div>

            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? 'Сохранение...' : 'Изменить пароль'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
