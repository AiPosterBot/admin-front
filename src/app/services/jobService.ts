// ══════════════════════════════════════════════════════════════════════
//  Job Service — единственная точка доступа к данным задач.
// ══════════════════════════════════════════════════════════════════════

import { mockJobs, mockLLMTraces, mockAdsCampaigns, type Job, type AdsCampaign } from '../data/mock-data';
import type { AnyJob } from '../types/dto';

// ── Queries ───────────────────────────────────────────────────────────

export async function getTeamJobs(teamId: string): Promise<Job[]> {
  return mockJobs
    .filter((j) => j.teamId === teamId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/**
 * Возвращает джоб по id С проверкой принадлежности команде.
 * null — если не найден или не принадлежит команде.
 */
export async function getJobById(
  jobId: string,
  teamId: string,
): Promise<Job | null> {
  const job = mockJobs.find((j) => j.id === jobId);
  if (!job || job.teamId !== teamId) return null;
  return job;
}

/**
 * Синхронный список задач команды (для дропдаунов/фильтров).
 */
export function getTeamJobsList(teamId: string): Job[] {
  return mockJobs
    .filter((j) => j.teamId === teamId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/**
 * Все задачи для конкретного источника в команде (синхронно).
 */
export function getJobsBySourceId(sourceId: string, teamId: string): Job[] {
  return mockJobs
    .filter(
      (j) =>
        j.teamId === teamId &&
        (j.params as Record<string, unknown>)?.sourceId === sourceId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Все LLM-трейсы для джоба */
export function getJobTraces(job: Job) {
  return mockLLMTraces.filter((t) => job.llmTraceIds.includes(t.id));
}

/** Безопасно достаёт sourceId из params любого джоба */
export function getSourceId(job: Job): string | undefined {
  return (job.params as Record<string, unknown>)?.sourceId as string | undefined;
}

/** Безопасно достаёт channelId из params любого джоба */
export function getChannelId(job: Job): string | undefined {
  return (job.params as Record<string, unknown>)?.channelId as string | undefined;
}

/** Счётчики по типам для конкретного teamId и базового списка */
export function countByType(jobs: Job[]): Record<string, number> {
  const counts: Record<string, number> = { all: jobs.length };
  for (const job of jobs) {
    counts[job.type] = (counts[job.type] ?? 0) + 1;
  }
  return counts;
}

/**
 * Найти рекламную кампанию, связанную с ads_campaign-джобом.
 * Возвращает null если джоб не является ads_campaign или кампания не найдена.
 */
export function getRelatedCampaign(job: Job): AdsCampaign | null {
  if (job.type !== 'ads_campaign') return null;
  const campaignId = (job.params as Record<string, unknown>)?.campaignId as string | undefined;
  if (!campaignId) return null;
  return mockAdsCampaigns.find((c) => c.id === campaignId) ?? null;
}