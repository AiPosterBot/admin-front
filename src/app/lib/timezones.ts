export interface TimezoneOption {
  value: string
  label: string
  offsetMinutes: number
}

interface CanonicalTimezoneDefinition {
  value: string
  title: string
}

const CANONICAL_TIMEZONES: CanonicalTimezoneDefinition[] = [
  { value: 'UTC', title: 'UTC' },
  { value: 'Europe/London', title: 'Лондон' },
  { value: 'Europe/Berlin', title: 'Берлин' },
  { value: 'Europe/Athens', title: 'Афины' },
  { value: 'Europe/Moscow', title: 'Москва' },
  { value: 'Asia/Tbilisi', title: 'Тбилиси' },
  { value: 'Asia/Dubai', title: 'Дубай' },
  { value: 'Asia/Karachi', title: 'Карачи' },
  { value: 'Asia/Almaty', title: 'Алматы' },
  { value: 'Asia/Bangkok', title: 'Бангкок' },
  { value: 'Asia/Shanghai', title: 'Пекин' },
  { value: 'Asia/Tokyo', title: 'Токио' },
  { value: 'Australia/Sydney', title: 'Сидней' },
  { value: 'America/New_York', title: 'Нью-Йорк' },
  { value: 'America/Chicago', title: 'Чикаго' },
  { value: 'America/Denver', title: 'Денвер' },
  { value: 'America/Los_Angeles', title: 'Лос-Анджелес' },
  { value: 'America/Sao_Paulo', title: 'Сан-Паулу' },
]

function normalizeOffsetLabel(value: string) {
  if (value === 'GMT' || value === 'UTC') {
    return 'GMT+00:00'
  }

  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) {
    return value
  }

  const [, sign, hoursRaw, minutesRaw] = match
  const hours = hoursRaw.padStart(2, '0')
  const minutes = (minutesRaw ?? '00').padStart(2, '0')
  return `GMT${sign}${hours}:${minutes}`
}

function parseOffsetMinutes(offsetLabel: string) {
  const match = offsetLabel.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!match) {
    return 0
  }

  const [, sign, hoursRaw, minutesRaw] = match
  const minutes = Number(hoursRaw) * 60 + Number(minutesRaw)
  return sign === '-' ? -minutes : minutes
}

export function formatTimezoneOffset(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  })

  const raw = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  return normalizeOffsetLabel(raw)
}

export function getTimezoneOptions(): TimezoneOption[] {
  return CANONICAL_TIMEZONES.map((timezone) => {
    const offsetLabel = formatTimezoneOffset(timezone.value)
    return {
      value: timezone.value,
      label: `${offsetLabel} ${timezone.title}`,
      offsetMinutes: parseOffsetMinutes(offsetLabel),
    }
  }).sort((left, right) => left.offsetMinutes - right.offsetMinutes)
}

export function getTimezoneLabel(timezone: string) {
  const matched = CANONICAL_TIMEZONES.find((option) => option.value === timezone)
  const title = matched?.title ?? timezone
  return `${formatTimezoneOffset(timezone)} ${title}`
}

export function getZonedDateParts(timezone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''

  return {
    weekdayShort: read('weekday').toLowerCase(),
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  }
}
