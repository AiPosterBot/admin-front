import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { CheckCircle, AlertCircle, Bot, Loader2, ArrowRight, ExternalLink, Radio } from 'lucide-react'
import type { Channel } from '../types/domain'
import { useTeam } from '../context/TeamContext'
import * as channelService from '../services/channelService'

function isNumericTelegramTarget(value: string) {
  return /^-?\d+$/.test(value.trim())
}

function normalizeChannelInput(input: string): { id: string; display: string } | null {
  const normalizedInput = input.trim()
  if (!normalizedInput) {
    return null
  }

  if (isNumericTelegramTarget(normalizedInput)) {
    return { id: normalizedInput, display: normalizedInput }
  }

  if (normalizedInput.startsWith('@')) {
    const username = normalizedInput.slice(1).trim()
    if (!username) {
      return null
    }

    if (isNumericTelegramTarget(username)) {
      return { id: username, display: username }
    }

    return { id: `@${username}`, display: `@${username}` }
  }

  const tmeMatch = normalizedInput.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)/i)
  if (tmeMatch) {
    const pathPart = tmeMatch[1].trim()
    if (isNumericTelegramTarget(pathPart)) {
      return { id: pathPart, display: pathPart }
    }

    return { id: `@${pathPart}`, display: `@${pathPart}` }
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(normalizedInput)) {
    return { id: `@${normalizedInput}`, display: `@${normalizedInput}` }
  }

  return null
}

type Step = 'input' | 'verify' | 'done'
type VerifyStatus = 'idle' | 'checking' | 'success' | 'error'

interface AddChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (channel: Omit<Channel, 'id' | 'createdAt' | 'teamId'>) => void
}

export function AddChannelDialog({ open, onOpenChange, onCreated }: AddChannelDialogProps) {
  const { currentTeamId } = useTeam()
  const [step, setStep] = useState<Step>('input')
  const [channelInput, setChannelInput] = useState('')
  const [normalizedChannel, setNormalizedChannel] = useState<{ id: string; display: string } | null>(null)
  const [inputError, setInputError] = useState('')
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')
  const [verifyError, setVerifyError] = useState('')
  const [botUsername, setBotUsername] = useState<string | null>(null)

  const handleReset = () => {
    setStep('input')
    setChannelInput('')
    setNormalizedChannel(null)
    setInputError('')
    setVerifyStatus('idle')
    setVerifyError('')
    setBotUsername(null)
  }

  useEffect(() => {
    if (!open || !currentTeamId) {
      return
    }

    let isMounted = true
    void channelService
      .getTelegramBotInfo(currentTeamId)
      .then((result) => {
        if (isMounted) {
          setBotUsername(result.botUsername ?? null)
        }
      })
      .catch(() => {
        if (isMounted) {
          setBotUsername(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentTeamId, open])

  const botName = useMemo(() => (botUsername ? `@${botUsername}` : 'бот'), [botUsername])
  const botLink = useMemo(() => (botUsername ? `https://t.me/${botUsername}` : null), [botUsername])
  const isNumericChannelId = useMemo(() => isNumericTelegramTarget(normalizedChannel?.id ?? ''), [normalizedChannel?.id])

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(handleReset, 300)
  }

  const handleNext = () => {
    const parsed = normalizeChannelInput(channelInput)
    if (!parsed) {
      setInputError('Неверный формат. Введите @username, t.me/username, ссылку https://t.me/... или числовой ID канала. Для numeric id префикс -100 можно не добавлять.')
      return
    }

    setInputError('')
    setNormalizedChannel(parsed)
    setStep('verify')
    setVerifyStatus('idle')
    setVerifyError('')
  }

  const handleVerify = async () => {
    if (!normalizedChannel || !currentTeamId) {
      setVerifyStatus('error')
      setVerifyError('Не выбрана команда для добавления канала.')
      return
    }

    setVerifyStatus('checking')
    setVerifyError('')

    try {
      const result = await channelService.checkChannelAccess(currentTeamId, normalizedChannel.id)
      if (!result.botCanPost) {
        setVerifyStatus('error')
        setVerifyError(`${botName} найден, но не может публиковать в ${normalizedChannel.display}. Проверьте права администратора.`)
        return
      }

      setVerifyStatus('success')
      setStep('done')
    } catch (error) {
      setVerifyStatus('error')
      setVerifyError(
        error instanceof Error
          ? error.message
          : `Не удалось проверить канал ${normalizedChannel.display}. Убедитесь, что ${botName} добавлен и назначен администратором.`,
      )
    }
  }

  const handleCreate = () => {
    if (!normalizedChannel) {
      return
    }

    const channelName = normalizedChannel.display.replace('@', '')
    onCreated({
      name: channelName.charAt(0).toUpperCase() + channelName.slice(1),
      telegramTarget: normalizedChannel.display,
      isActive: false,
      botCanPost: true,
      publishMode: 'periodic',
      publishIntervalSec: 1800,
      contentStrategy: 'newest',
      linkedSourcesCount: 0,
      subscribersCount: 0,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="-mx-6 -mt-6 mb-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-6 pt-6 pb-4 dark:border-sky-500/25 dark:from-sky-500/15 dark:via-slate-950 dark:to-indigo-500/15">
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/75 text-blue-600 shadow-sm dark:bg-slate-950/40 dark:text-sky-300"><Radio className="size-5" /></span>
            {step === 'input' && 'Добавить Telegram-канал'}
            {step === 'verify' && 'Подключение бота'}
            {step === 'done' && 'Канал подключен'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {step === 'input' && 'Введите ссылку, username или ID вашего Telegram-канала'}
            {step === 'verify' && `Добавьте ${botName} в канал ${normalizedChannel?.display}`}
            {step === 'done' && `Канал ${normalizedChannel?.display} успешно подготовлен к публикации`}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          {['input', 'verify', 'done'].map((currentStep, index) => {
            const activeIndex = ['input', 'verify', 'done'].indexOf(step)
            const stepIndex = ['input', 'verify', 'done'].indexOf(currentStep)
            const isCompleted = stepIndex < activeIndex
            const isActive = currentStep === step

            return (
              <div key={currentStep} className="flex items-center gap-2">
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-green-500 text-white dark:bg-green-500/80'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="size-3.5" /> : index + 1}
                </div>
                {index < 2 ? <div className={`h-0.5 w-8 transition-colors ${isCompleted ? 'bg-green-500 dark:bg-green-500/80' : 'bg-border'}`} /> : null}
              </div>
            )
          })}
          <span className="basis-full text-xs text-muted-foreground sm:ml-2 sm:basis-auto">
            {step === 'input' ? 'Ввод канала' : step === 'verify' ? 'Проверка бота' : 'Готово'}
          </span>
        </div>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-url" className="mb-2 block">Канал</Label>
              <Input
                id="channel-url"
                placeholder="@mychannel или https://t.me/mychannel"
                value={channelInput}
                onChange={(event) => {
                  setChannelInput(event.target.value)
                  setInputError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && channelInput.trim()) {
                    handleNext()
                  }
                }}
                autoFocus
                className={inputError ? 'border-red-400' : ''}
              />
              {inputError ? (
                <p className="text-xs text-red-500">{inputError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Поддерживается формат: @channel, t.me/channel, https://t.me/channel и числовой ID канала. Для numeric id префикс -100 можно не добавлять.</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={handleClose}>Отмена</Button>
              <Button onClick={handleNext} disabled={!channelInput.trim()} className="w-full sm:w-auto">
                Далее <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'verify' ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-950/20">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-200">Подключите бота к каналу за 4 шага:</div>
              <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-100">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">1</span>
                  <span>
                    {isNumericChannelId ? (
                      <>
                        Откройте нужный приватный канал в Telegram. Вы указали chat id{' '}
                        <span className="font-semibold">{normalizedChannel?.display}</span>.
                      </>
                    ) : (
                      <>
                        Откройте настройки канала{' '}
                        <a
                          href={`https://t.me/${normalizedChannel?.display.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline underline-offset-2 transition-colors hover:text-blue-600 dark:hover:text-blue-300"
                        >
                          {normalizedChannel?.display}
                        </a>
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">2</span>
                  <span>
                    Добавьте нашего бота{' '}
                    {botLink ? (
                      <a
                        href={botLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors hover:text-blue-600 dark:hover:text-blue-300"
                      >
                        <Bot className="size-3.5" />
                        {botName}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Bot className="size-3.5" />
                        {botName}
                      </span>
                    )}{' '}
                    в участники канала
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">3</span>
                  <span>В разделе <strong>Администраторы</strong> назначьте бота администратором канала.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">4</span>
                  <span>Дайте боту все нужные права, кроме разрешения на добавление новых администраторов.</span>
                </li>
              </ol>
            </div>

            {verifyStatus === 'error' ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-sm">{verifyError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStep('input')
                  setVerifyStatus('idle')
                  setVerifyError('')
                }}
              >
                Назад
              </Button>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {botLink ? (
                  <a href={botLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ExternalLink className="mr-1.5 size-3.5" />
                      Открыть бота
                    </Button>
                  </a>
                ) : null}
                <Button onClick={handleVerify} disabled={verifyStatus === 'checking'} className="w-full sm:w-auto">
                  {verifyStatus === 'checking' ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Проверяем...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 size-4" />
                      Проверить доступ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800/40 dark:bg-green-950/20">
              <CheckCircle className="mx-auto mb-2 size-10 text-green-500 dark:text-green-400" />
              <div className="font-medium text-green-900 dark:text-green-200">Бот успешно подключен</div>
              <div className="mt-1 text-sm text-green-700 dark:text-green-300">Канал <strong>{normalizedChannel?.display}</strong> готов к публикации.</div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              <p className="mb-1 font-medium">Следующие шаги:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• настройте стратегию публикации для канала;</li>
                <li>• привяжите источники контента;</li>
                <li>• выберите режим публикации: periodic, scheduled или every_material.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Закрыть</Button>
              <Button onClick={handleCreate}>Сохранить канал</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
