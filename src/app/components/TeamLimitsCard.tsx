import { useEffect, useState } from "react";
import {
  formatResetMoment,
  getCountdownParts,
  getNextUtcDayResetAt,
  getNextUtcMonthResetAt,
  resolveViewerTimezone,
} from "../lib/team-limit-messages";
import { getTimezoneLabel } from "../lib/timezones";

interface TeamLimits {
  maxPostsPerDay: number;
  maxChannels: number;
  maxSources: number;
  maxAgentRuns: number;
  maxMembers: number;
}

interface TeamUsage {
  postsToday: number;
  postsResetAtUtc?: string | null;
  agentRunsThisMonth: number;
  agentRunsResetAtUtc?: string | null;
  sourcesUsed: number;
  channelsUsed: number;
  membersUsed: number;
}

interface ResetSummaryProps {
  label: string;
  resetAtUtc?: string | null;
  fallbackDate: Date;
  accentClassName: string;
  timezone: string;
}

interface MetricProps {
  label: string;
  used: number;
  max: number;
  accentClassName: string;
  progressClassName: string;
  meta?: string;
}

function formatCountdown(parts: ReturnType<typeof getCountdownParts>) {
  if (parts.days > 0) {
    return `${parts.days}д ${parts.hours.toString().padStart(2, "0")}ч ${parts.minutes.toString().padStart(2, "0")}м`;
  }

  return [parts.hours, parts.minutes, parts.seconds].map((value) => value.toString().padStart(2, "0")).join(":");
}

function ResetSummary({ label, resetAtUtc, fallbackDate, accentClassName, timezone }: ResetSummaryProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const countdown = getCountdownParts(resetAtUtc, fallbackDate, now);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`size-2 rounded-full ${accentClassName}`} />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {formatCountdown(countdown)}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {formatResetMoment(resetAtUtc, { fallbackDate, timezone })}
      </div>
    </div>
  );
}

function Metric({ label, used, max, accentClassName, progressClassName, meta }: MetricProps) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isOver = max > 0 && used >= max;

  return (
    <div className="rounded-xl bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {meta ? <div className="text-[11px] text-muted-foreground">{meta}</div> : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className={`text-3xl font-semibold tabular-nums ${isOver ? "text-red-500" : accentClassName}`}>{used}</div>
        <div className="text-sm text-muted-foreground">/ {max}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : progressClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface TeamLimitsDisplayProps {
  limits: TeamLimits;
  usage: TeamUsage;
}

export function TeamLimitsDisplay({ limits, usage }: TeamLimitsDisplayProps) {
  const timezone = resolveViewerTimezone();

  return (
    <div className="space-y-4">

      <div className="grid gap-3 md:grid-cols-2">
        <Metric
          label="Посты / день"
          used={usage.postsToday}
          max={limits.maxPostsPerDay}
          accentClassName="text-sky-500"
          progressClassName="bg-gradient-to-r from-sky-500 to-cyan-400"
          meta="сегодня"
        />
        <Metric
          label="Запуски AI агента"
          used={usage.agentRunsThisMonth}
          max={limits.maxAgentRuns}
          accentClassName="text-rose-500"
          progressClassName="bg-gradient-to-r from-rose-500 to-amber-400"
          meta="месяц"
        />
        <Metric
          label="Источники"
          used={usage.sourcesUsed}
          max={limits.maxSources}
          accentClassName="text-violet-500"
          progressClassName="bg-gradient-to-r from-violet-500 to-blue-500"
        />
        <Metric
          label="Каналы"
          used={usage.channelsUsed}
          max={limits.maxChannels}
          accentClassName="text-cyan-500"
          progressClassName="bg-gradient-to-r from-cyan-500 to-sky-500"
        />
        <Metric
          label="Участники"
          used={usage.membersUsed}
          max={limits.maxMembers}
          accentClassName="text-emerald-500"
          progressClassName="bg-gradient-to-r from-emerald-500 to-lime-400"
        />
      </div>

      <div className="rounded-2xl bg-white/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-foreground">Сброс лимитов через</div>
          <div className="text-xs text-muted-foreground">{getTimezoneLabel(timezone)}</div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ResetSummary
            label="Посты в день"
            resetAtUtc={usage.postsResetAtUtc}
            fallbackDate={getNextUtcDayResetAt()}
            accentClassName="bg-cyan-400"
            timezone={timezone}
          />
          <ResetSummary
            label="Запуски AI агента"
            resetAtUtc={usage.agentRunsResetAtUtc}
            fallbackDate={getNextUtcMonthResetAt()}
            accentClassName="bg-amber-400"
            timezone={timezone}
          />
        </div>
      </div>

   </div>
  );
}
