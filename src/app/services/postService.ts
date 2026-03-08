// ══════════════════════════════════════════════════════════════════════
//  Post Service — единственная точка доступа к опубликованным постам.
// ══════════════════════════════════════════════════════════════════════

import {
  mockPostedItems,
  mockChannels,
  mockItems,
  mockSources,
  mockJobs,
  mockLLMTraces,
  type PostedItem,
} from '../data/mock-data';

// ── Queries ───────────────────────────────────────────────────────────

/** Все публикации команды, отсортированные по дате */
export async function getTeamPosts(teamId: string): Promise<PostedItem[]> {
  return mockPostedItems
    .filter((p) => p.teamId === teamId)
    .sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
}

/**
 * Публикация по id С проверкой принадлежности команде.
 * null — если не найдена или teamId не совпадает.
 */
export async function getPostById(
  postId: string,
  teamId: string,
): Promise<PostedItem | null> {
  const post = mockPostedItems.find((p) => p.id === postId);
  if (!post || post.teamId !== teamId) return null;
  return post;
}

// ── Связанные сущности (без лишних запросов в компоненте) ─────────────

export function getPostChannel(post: PostedItem) {
  return mockChannels.find((c) => c.id === post.channelId) ?? null;
}

export function getPostItem(post: PostedItem) {
  return mockItems.find((i) => i.id === post.itemId) ?? null;
}

export function getPostSource(post: PostedItem) {
  return mockSources.find((s) => s.id === post.sourceId) ?? null;
}

export function getPostJob(post: PostedItem) {
  return mockJobs.find((j) => j.id === post.jobId) ?? null;
}

export function getPostLLMTrace(post: PostedItem) {
  if (!post.llmTraceId) return null;
  return mockLLMTraces.find((t) => t.id === post.llmTraceId) ?? null;
}

/**
 * Найти публикацию по jobId (синхронно).
 * Используется в JobDetailPage для отображения результата publish-задачи.
 */
export function getPostByJobId(jobId: string): PostedItem | null {
  return mockPostedItems.find((p) => p.jobId === jobId) ?? null;
}

/**
 * Синхронный список публикаций команды (для вычислений без хука).
 */
export function getTeamPostsList(teamId: string): PostedItem[] {
  return mockPostedItems.filter((p) => p.teamId === teamId);
}

/**
 * Все публикации конкретного канала (синхронно).
 * Замена прямого доступа к mockPostedItems.filter(p => p.channelId === ...) в UI.
 */
export function getPostsByChannelId(channelId: string): PostedItem[] {
  return mockPostedItems.filter((p) => p.channelId === channelId);
}

/**
 * Все публикации из конкретного источника (синхронно).
 */
export function getPostsBySourceId(sourceId: string): PostedItem[] {
  return mockPostedItems.filter((p) => p.sourceId === sourceId);
}

/**
 * Все публикации конкретного материала (синхронно).
 * Замена прямого доступа к mockPostedItems.filter(p => p.itemId === ...) в UI.
 */
export function getPostsByItemId(itemId: string): PostedItem[] {
  return mockPostedItems.filter((p) => p.itemId === itemId);
}