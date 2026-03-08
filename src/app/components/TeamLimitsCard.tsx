import { type Team, type TeamUsage } from "../data/mock-data";

interface LimitGaugeProps {
  label: string;
  used: number;
  max: number;
  color: string;
  suffix?: string;
}

function LimitGauge({ label, used, max, color, suffix }: LimitGaugeProps) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isOver = used >= max && max > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold tabular-nums ${isOver ? "text-red-600" : color}`}>
          {used}
        </span>
        <span className="text-sm text-gray-400">/</span>
        <span className="text-sm text-gray-500 tabular-nums">{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver
              ? "bg-red-500"
              : pct >= 80
              ? "bg-amber-500"
              : pct >= 50
              ? "bg-blue-500"
              : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface TeamLimitsDisplayProps {
  limits: Team["limits"];
  usage: TeamUsage;
}

export function TeamLimitsDisplay({ limits, usage }: TeamLimitsDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-5">
      <LimitGauge
        label="Постов в день"
        used={usage.postsToday}
        max={limits.maxPostsPerDay}
        color="text-blue-600"
        suffix="сегодня"
      />
      <LimitGauge
        label="Запуски агента парсера"
        used={usage.agentRunsToday}
        max={limits.maxAgentRuns}
        color="text-green-600"
        suffix="сегодня"
      />
      <LimitGauge
        label="Источников"
        used={usage.sourcesUsed}
        max={limits.maxSources}
        color="text-purple-600"
      />
      <LimitGauge
        label="Каналов"
        used={usage.channelsUsed}
        max={limits.maxChannels}
        color="text-cyan-600"
      />
      <LimitGauge
        label="Участников"
        used={usage.membersUsed}
        max={limits.maxMembers}
        color="text-amber-600"
      />
    </div>
  );
}