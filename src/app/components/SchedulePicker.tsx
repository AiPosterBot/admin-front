import { useEffect, useMemo, useState } from 'react'
import { Clock3, Info, Plus, Trash2, X } from 'lucide-react'

import type { ChannelSchedule } from '../types/domain'
import { getTimezoneOptions } from '../lib/timezones'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const WEEKDAYS = [
  { key: 'mon', label: 'Пн', order: 0 },
  { key: 'tue', label: 'Вт', order: 1 },
  { key: 'wed', label: 'Ср', order: 2 },
  { key: 'thu', label: 'Чт', order: 3 },
  { key: 'fri', label: 'Пт', order: 4 },
  { key: 'sat', label: 'Сб', order: 5 },
  { key: 'sun', label: 'Вс', order: 6 },
] as const

const TIMEZONE_OPTIONS = getTimezoneOptions()

type SchedulePreset = 'everyday' | 'weekdays' | 'weekend'

const PRESET_DAYS: Record<SchedulePreset, string[]> = {
  everyday: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  weekend: ['sat', 'sun'],
}

export function createDefaultSchedule(timezone = 'UTC'): ChannelSchedule {
  return {
    timezone,
    slots: [
      {
        days: [...PRESET_DAYS.everyday],
        times: ['09:00'],
      },
    ],
  }
}

export function scheduleToHuman(schedule: ChannelSchedule): string {
  if (schedule.slots.length === 0) {
    return 'Не настроено'
  }

  return schedule.slots.map((slot) => `${formatDays(slot.days)} в ${slot.times.join(', ')}`).join(' · ')
}

interface SchedulePickerProps {
  value?: ChannelSchedule
  onChange?: (value: ChannelSchedule) => void
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [schedule, setSchedule] = useState<ChannelSchedule>(value ?? createDefaultSchedule())
  const [pendingTimes, setPendingTimes] = useState<Record<number, string>>({})

  useEffect(() => {
    setSchedule(value ?? createDefaultSchedule())
  }, [value])

  useEffect(() => {
    onChange?.(schedule)
  }, [onChange, schedule])

  const humanSummary = useMemo(() => scheduleToHuman(schedule), [schedule])

  const setTimezone = (timezone: string) => {
    setSchedule((current) => ({ ...current, timezone }))
  }

  const updateSlot = (slotIndex: number, updater: (slot: ChannelSchedule['slots'][number]) => ChannelSchedule['slots'][number]) => {
    setSchedule((current) => ({
      ...current,
      slots: current.slots.map((slot, index) => (index === slotIndex ? updater(slot) : slot)),
    }))
  }

  const toggleDay = (slotIndex: number, day: string) => {
    updateSlot(slotIndex, (slot) => {
      const nextDays = slot.days.includes(day) ? slot.days.filter((entry) => entry !== day) : [...slot.days, day]
      return {
        ...slot,
        days: nextDays.sort((left, right) => dayOrder(left) - dayOrder(right)),
      }
    })
  }

  const applyPreset = (slotIndex: number, preset: SchedulePreset) => {
    updateSlot(slotIndex, (slot) => ({
      ...slot,
      days: [...PRESET_DAYS[preset]],
    }))
  }

  const addTime = (slotIndex: number) => {
    const candidate = pendingTimes[slotIndex] ?? '12:00'
    updateSlot(slotIndex, (slot) => {
      if (slot.times.includes(candidate)) {
        return slot
      }

      return {
        ...slot,
        times: [...slot.times, candidate].sort(),
      }
    })
  }

  const removeTime = (slotIndex: number, time: string) => {
    updateSlot(slotIndex, (slot) => {
      if (slot.times.length === 1) {
        return slot
      }

      return {
        ...slot,
        times: slot.times.filter((entry) => entry !== time),
      }
    })
  }

  const addSlot = (preset?: SchedulePreset) => {
    setSchedule((current) => ({
      ...current,
      slots: [
        ...current.slots,
        {
          days: preset ? [...PRESET_DAYS[preset]] : ['mon', 'tue', 'wed', 'thu', 'fri'],
          times: ['09:00'],
        },
      ],
    }))
  }

  const removeSlot = (slotIndex: number) => {
    setSchedule((current) => {
      if (current.slots.length === 1) {
        return current
      }

      return {
        ...current,
        slots: current.slots.filter((_, index) => index !== slotIndex),
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Часовой пояс</Label>
        <Select value={schedule.timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_OPTIONS.map((timezone) => (
              <SelectItem key={timezone.value} value={timezone.value}>
                {timezone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addSlot()}>
          <Plus className="mr-2 size-4" />
          Добавить слот
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSlot('weekdays')}>
          Рабочие дни
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addSlot('weekend')}>
          Выходные
        </Button>
      </div>

      <div className="space-y-4">
        {schedule.slots.map((slot, slotIndex) => (
          <div key={`${slot.days.join('-')}-${slot.times.join('-')}-${slotIndex}`} className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Слот {slotIndex + 1}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDays(slot.days)} · {slot.times.join(', ')}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(slotIndex)} disabled={schedule.slots.length === 1}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Дни недели</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(slotIndex, day.key)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      slot.days.includes(day.key)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => applyPreset(slotIndex, 'everyday')} className="text-primary hover:text-primary/80">
                  Каждый день
                </button>
                <button type="button" onClick={() => applyPreset(slotIndex, 'weekdays')} className="text-primary hover:text-primary/80">
                  Рабочие дни
                </button>
                <button type="button" onClick={() => applyPreset(slotIndex, 'weekend')} className="text-primary hover:text-primary/80">
                  Выходные
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Время публикации</Label>
              <div className="flex flex-wrap gap-2">
                {slot.times.map((time) => (
                  <Badge key={time} variant="secondary" className="gap-1 px-2 py-1">
                    <Clock3 className="size-3.5" />
                    {time}
                    <button type="button" onClick={() => removeTime(slotIndex, time)} disabled={slot.times.length === 1}>
                      <X className="size-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={pendingTimes[slotIndex] ?? '12:00'}
                  onChange={(event) => setPendingTimes((current) => ({ ...current, [slotIndex]: event.target.value }))}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTime(slotIndex)}
                  disabled={slot.times.includes(pendingTimes[slotIndex] ?? '12:00')}
                >
                  <Plus className="mr-2 size-4" />
                  Добавить время
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Итог: </span>
            {humanSummary}
          </div>
        </div>
      </div>
    </div>
  )
}

function dayOrder(day: string) {
  return WEEKDAYS.find((entry) => entry.key === day)?.order ?? 99
}

function formatDays(days: string[]) {
  const normalized = [...days].sort((left, right) => dayOrder(left) - dayOrder(right))
  const labels = normalized.map((day) => WEEKDAYS.find((entry) => entry.key === day)?.label ?? day)

  if (normalized.join(',') === PRESET_DAYS.everyday.join(',')) {
    return 'Каждый день'
  }

  if (normalized.join(',') === PRESET_DAYS.weekdays.join(',')) {
    return 'Рабочие дни'
  }

  if (normalized.join(',') === PRESET_DAYS.weekend.join(',')) {
    return 'Выходные'
  }

  return labels.join(', ')
}
