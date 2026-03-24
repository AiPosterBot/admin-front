import { useEffect, useState } from 'react'
import { History, Save } from 'lucide-react'
import { toast } from 'sonner'

import {
  createAdminSchedulerSettings,
  getAdminSchedulerSettings,
  type AdminSchedulerSettingsValue,
  type AdminSchedulerSettingsView,
} from '../services/adminService'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { NumericInput } from '../components/ui/numeric-input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU')
}

export function AdminSchedulerSettingsPage() {
  const [view, setView] = useState<AdminSchedulerSettingsView | null>(null)
  const [draft, setDraft] = useState<AdminSchedulerSettingsValue>({
    schedulerHeartbeatSec: 30,
    sourceScanIntervalSec: 300,
    channelMetadataRefreshIntervalSec: 300,
  })
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const result = await getAdminSchedulerSettings()
      setView(result)
      setDraft(result.current)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить настройки scheduler')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await createAdminSchedulerSettings({
        ...draft,
        note: note.trim() || undefined,
      })
      setNote('')
      await load()
      toast.success('Новая версия настроек scheduler сохранена')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить настройки scheduler')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !view) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка настроек scheduler...</div>
  }

  if (!view) {
    return <div className="text-sm text-red-500">Не удалось загрузить настройки scheduler</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Настройки scheduler</h1>
        <p className="text-gray-600 dark:text-gray-400">Версионируемые глобальные интервалы для heartbeat планировщика, сканирования источников и refresh метаданных каналов.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Текущая версия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Heartbeat scheduler, сек</Label>
                <NumericInput
                  min={1}
                  value={draft.schedulerHeartbeatSec}
                  fallbackValue={1}
                  onValueChange={(value) => setDraft((current) => ({ ...current, schedulerHeartbeatSec: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Скан источников, сек</Label>
                <NumericInput
                  min={1}
                  value={draft.sourceScanIntervalSec}
                  fallbackValue={1}
                  onValueChange={(value) => setDraft((current) => ({ ...current, sourceScanIntervalSec: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Refresh каналов, сек</Label>
                <NumericInput
                  min={1}
                  value={draft.channelMetadataRefreshIntervalSec}
                  fallbackValue={1}
                  onValueChange={(value) => setDraft((current) => ({ ...current, channelMetadataRefreshIntervalSec: value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Комментарий к изменению</Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Например: снизили нагрузку на Telegram API перед ростом числа каналов"
                className="min-h-[88px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => void handleSave()} disabled={isSaving}>
                <Save className="mr-2 size-4" />
                Сохранить новой версией
              </Button>
              <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
                Обновить
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Активная запись</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="text-xs text-gray-500 dark:text-gray-400">Текущие effective values</div>
              <div className="mt-2 space-y-1">
                <div>Heartbeat: <strong>{view.current.schedulerHeartbeatSec}</strong> сек</div>
                <div>Source scan: <strong>{view.current.sourceScanIntervalSec}</strong> сек</div>
                <div>Channel refresh: <strong>{view.current.channelMetadataRefreshIntervalSec}</strong> сек</div>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
              <div className="text-xs text-gray-500 dark:text-gray-400">DB entry</div>
              {view.activeEntry ? (
                <div className="mt-2 space-y-1">
                  <div>Версия: <strong>v{view.activeEntry.version}</strong></div>
                  <div>Создана: <strong>{formatDateTime(view.activeEntry.createdAt)}</strong></div>
                  <div>Автор: <strong>{view.activeEntry.createdByAdminNickname ?? 'неизвестно'}</strong></div>
                  <div>Комментарий: <strong>{view.activeEntry.note ?? '—'}</strong></div>
                </div>
              ) : (
                <div className="mt-2 text-gray-500 dark:text-gray-400">Используются только дефолты из env.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="size-5 text-gray-500 dark:text-gray-400" />
            <CardTitle>История версий</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {view.history.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">История пока пустая, используются дефолты из env.</div>
          ) : (
            view.history.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Версия v{entry.version}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(entry.createdAt)}</div>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-3">
                  <div>Heartbeat: {entry.value.schedulerHeartbeatSec} сек</div>
                  <div>Source scan: {entry.value.sourceScanIntervalSec} сек</div>
                  <div>Channel refresh: {entry.value.channelMetadataRefreshIntervalSec} сек</div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Автор: {entry.createdByAdminNickname ?? 'неизвестно'} · Комментарий: {entry.note ?? '—'}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
