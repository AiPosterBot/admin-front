import { ApiError } from "./api";
import { readSession } from "./session";
import { getTimezoneLabel } from "./timezones";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("ru-RU", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function readSessionTimezone() {
  if (typeof window === "undefined") {
    return null;
  }

  const timezone = readSession().user?.timezone ?? null;
  return timezone && isValidTimezone(timezone) ? timezone : null;
}

function readBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return "UTC";
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone && isValidTimezone(timezone) ? timezone : "UTC";
}

export function resolveViewerTimezone(preferredTimezone?: string | null) {
  if (preferredTimezone && isValidTimezone(preferredTimezone)) {
    return preferredTimezone;
  }

  return readSessionTimezone() ?? readBrowserTimezone();
}

export function getNextUtcDayResetAt(now = new Date()) {
  const startOfUtcDay = new Date(now);
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  return new Date(startOfUtcDay.getTime() + 24 * 60 * 60 * 1000);
}

export function getNextUtcMonthResetAt(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function formatResetAt(
  resetAtUtc?: string | null,
  options?: {
    fallbackDate?: Date;
    timezone?: string | null;
  },
) {
  const date = resetAtUtc ? new Date(resetAtUtc) : options?.fallbackDate ?? getNextUtcDayResetAt();
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const timezone = resolveViewerTimezone(options?.timezone);

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatResetMoment(
  resetAtUtc?: string | null,
  options?: {
    fallbackDate?: Date;
    timezone?: string | null;
  },
) {
  const timezone = resolveViewerTimezone(options?.timezone);
  const label = getTimezoneLabel(timezone);
  return `${formatResetAt(resetAtUtc, { fallbackDate: options?.fallbackDate, timezone })}`;
}

export function getCountdownParts(resetAtUtc?: string | null, fallbackDate?: Date, now = new Date()) {
  const target = resetAtUtc ? new Date(resetAtUtc) : fallbackDate ?? getNextUtcDayResetAt(now);
  const diffMs = Math.max(target.getTime() - now.getTime(), 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    isExpired: totalSeconds === 0,
  };
}


export function getLimitErrorMessageByCode(
  code?: string | null,
  meta?: Record<string, unknown> | null,
  fallback?: string | null,
  timezone?: string | null,
) {
  const typedMeta = asRecord(meta);
  const resolvedTimezone = resolveViewerTimezone(timezone);

  if (code === "channel.daily_post_limit_exceeded") {
    const used = readNumber(typedMeta?.postsToday);
    const max = readNumber(typedMeta?.maxPostsPerDay);
    const resetAtUtc = readString(typedMeta?.resetAtUtc);
    const resetText = formatResetMoment(resetAtUtc, {
      fallbackDate: getNextUtcDayResetAt(),
      timezone: resolvedTimezone,
    });

    return used !== null && max !== null
      ? `Сегодня по лимиту команды публикации закончились: ${used}/${max}. Для вас следующий сброс будет в ${resetText}.`
      : `Сегодня по лимиту команды публикации закончились. Для вас следующий сброс будет в ${resetText}.`;
  }

  if (code === "source.agent_run_limit_exceeded") {
    const used = readNumber(typedMeta?.agentRunsThisMonth);
    const max = readNumber(typedMeta?.maxAgentRuns);
    const resetAtUtc = readString(typedMeta?.resetAtUtc);
    const resetText = formatResetMoment(resetAtUtc, {
      fallbackDate: getNextUtcMonthResetAt(),
      timezone: resolvedTimezone,
    });

    return used !== null && max !== null
      ? `В этом месяце лимит задач parser-агента исчерпан: ${used}/${max}. Для вас следующий сброс будет в ${resetText}.`
      : `В этом месяце лимит задач parser-агента исчерпан. Для вас следующий сброс будет в ${resetText}.`;
  }

  if (code === "channel.limit_exceeded") {
    const max = readNumber(typedMeta?.maxChannels);
    return max !== null ? `Достигнут лимит каналов команды: ${max}.` : "Достигнут лимит каналов команды.";
  }

  if (code === "source.limit_exceeded") {
    const max = readNumber(typedMeta?.maxSources);
    return max !== null ? `Достигнут лимит источников команды: ${max}.` : "Достигнут лимит источников команды.";
  }

  if (code === "team.member_limit_exceeded") {
    const max = readNumber(typedMeta?.maxMembers);
    return max !== null
      ? `Достигнут лимит участников команды: ${max}. Pending-инвайты тоже занимают слот.`
      : "Достигнут лимит участников команды. Pending-инвайты тоже занимают слот.";
  }

  return fallback ?? null;
}

export function getLimitAwareErrorMessage(error: unknown, fallback: string, timezone?: string | null) {
  if (error instanceof ApiError) {
    return getLimitErrorMessageByCode(error.code, error.meta, error.message, timezone) ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getLimitAwareErrorCode(error: unknown) {
  return error instanceof ApiError ? error.code : undefined;
}

export function getLimitAwareErrorMeta(error: unknown) {
  return error instanceof ApiError ? error.meta ?? null : null;
}
