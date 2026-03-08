// ══════════════════════════════════════════════════════════════════════
//  LLM Trace Service — единственная точка доступа к данным LLM-трейсов.
// ══════════════════════════════════════════════════════════════════════

import { mockLLMTraces, mockJobs, type LLMTrace } from '../data/mock-data';

// ── Queries ───────────────────────────────────────────────────────────

/** Все LLM-трейсы команды, отсортированные по дате (новые первыми) */
export async function getTeamTraces(teamId: string): Promise<LLMTrace[]> {
  return mockLLMTraces
    .filter((t) => t.teamId === teamId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/**
 * Трейс по id С проверкой принадлежности команде.
 * null — если не найден или teamId не совпадает.
 */
export async function getTraceById(
  traceId: string,
  teamId: string,
): Promise<LLMTrace | null> {
  const trace = mockLLMTraces.find((t) => t.id === traceId);
  if (!trace || trace.teamId !== teamId) return null;
  return trace;
}

/** Джоб, породивший этот трейс (если есть) */
export function getTraceJob(trace: LLMTrace) {
  if (!trace.jobId) return null;
  return mockJobs.find((j) => j.id === trace.jobId) ?? null;
}

/** Совокупная стоимость трейсов команды (USD) */
export function sumCost(traces: LLMTrace[]): number {
  return traces.reduce((acc, t) => acc + t.cost, 0);
}

/** Совокупные токены трейсов команды */
export function sumTokens(traces: LLMTrace[]): number {
  return traces.reduce((acc, t) => acc + t.totalTokens, 0);
}

/**
 * Синхронно вернуть трейсы по массиву id.
 * Используется в JobDetailPage вместо прямого доступа к mockLLMTraces.
 */
export function getTracesByIds(ids: string[]): LLMTrace[] {
  return mockLLMTraces.filter((t) => ids.includes(t.id));
}