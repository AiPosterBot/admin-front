// ══════════════════════════════════════════════════════════════════════
//  Source Service — единственная точка доступа к данным источников.
//  UI-компоненты импортируют отсюда, не из mock-data напрямую.
//  При переходе на backend: замените тела функций на HTTP-вызовы.
// ══════════════════════════════════════════════════════════════════════

import {
  mockSources,
  mockChannelSourceLinks,
  mockChannels,
  mockSourceTags,
  getSourceTags as _getSourceTags,
  deleteSource as _deleteSource,
  pauseSource as _pauseSource,
  resumeSource as _resumeSource,
  scanSourceNow as _scanSourceNow,
  reonboardSource as _reonboardSource,
  reonboardRssArticle as _reonboardRssArticle,
  applyNewConfig as _applyNewConfig,
  applyNewRssArticleConfig as _applyNewRssArticleConfig,
  createSource as _createSource,
  type Source,
  type Job,
  type Channel,
  type SourceTag,
  type AgentConfig,
  type WebsiteFullConfig,
  type RssArticleOnlyConfig,
} from '../data/mock-data';
import { ok, err, type ServiceResult } from '../types/dto';

// ── Queries ───────────────────────────────────────────────────────────

/** Возвращает все источники команды, отфильтрованные по teamId */
export async function getTeamSources(teamId: string): Promise<Source[]> {
  return mockSources.filter((s) => s.teamId === teamId);
}

/**
 * Синхронный список источников команды (для фильтров/дропдаунов).
 * Не выполняет сетевых запросов — читает из in-memory mock.
 */
export function getTeamSourcesList(teamId: string): Source[] {
  return mockSources.filter((s) => s.teamId === teamId);
}

/**
 * Синхронный поиск источника по id (без проверки команды).
 * Используется в inline-render контекстах (list.map и т.п.).
 */
export function getSourceByIdSync(sourceId: string): Source | undefined {
  return mockSources.find((s) => s.id === sourceId);
}

/**
 * Возвращает источник по id С проверкой принадлежности команде.
 * Если источник не найден или не принадл��жит команде — null.
 */
export async function getSourceById(
  sourceId: string,
  teamId: string,
): Promise<Source | null> {
  const src = mockSources.find((s) => s.id === sourceId);
  if (!src || src.teamId !== teamId) return null;
  return src;
}

/** Получить теги источника */
export function getSourceTagsById(sourceId: string): SourceTag[] {
  return _getSourceTags(sourceId);
}

/** Получить все теги источников команды */
export function getTeamSourceTags(teamId: string): SourceTag[] {
  return mockSourceTags.filter((t) => t.teamId === teamId);
}

/** Сколько каналов использует источник */
export function getChannelCountForSource(sourceId: string): number {
  return mockChannelSourceLinks.filter((l) => l.sourceId === sourceId).length;
}

/**
 * Список каналов, привязанных к источнику (в рамках команды).
 * Синхронный вспомогательный метод для UI без хуков.
 */
export function getChannelsForSource(sourceId: string, teamId: string): Channel[] {
  const channelIds = mockChannelSourceLinks
    .filter((l) => l.sourceId === sourceId)
    .map((l) => l.channelId);
  return mockChannels.filter((c) => channelIds.includes(c.id) && c.teamId === teamId);
}

// ── Мутации ──────────────────────────────────────────────────────────

export async function pauseSource(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<Source>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  _pauseSource(sourceId);
  return ok({ ...src, isActive: false });
}

export async function resumeSource(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<Source>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  _resumeSource(sourceId);
  return ok({ ...src, isActive: true, lastError: undefined, status: 'ok' });
}

export async function deleteSource(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  _deleteSource(sourceId);
  return ok(undefined);
}

export async function scanSourceNow(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<Job>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  const job = _scanSourceNow(sourceId, teamId);
  return ok(job);
}

export async function reonboardSource(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<Job>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  const job = _reonboardSource(sourceId, teamId);
  return ok(job);
}

export async function reonboardRssArticle(
  sourceId: string,
  teamId: string,
): Promise<ServiceResult<Job>> {
  const src = mockSources.find(
    (s) => s.id === sourceId && s.teamId === teamId,
  );
  if (!src) return err('Источник не найден');
  const job = _reonboardRssArticle(sourceId, teamId);
  return ok(job);
}

/**
 * Применить новый WebsiteFullConfig / AgentConfig после reonboard.
 * Синхронная операция (mock in-memory).
 */
export function applySourceConfig(
  sourceId: string,
  teamId: string,
  config: AgentConfig,
): ServiceResult<void> {
  const src = mockSources.find((s) => s.id === sourceId && s.teamId === teamId);
  if (!src) return err('Источник не найден');
  _applyNewConfig(sourceId, config);
  return ok(undefined);
}

/**
 * Применить новый RssArticleOnlyConfig после reonboard article-агента.
 * Синхронная операция (mock in-memory).
 */
export function applySourceRssConfig(
  sourceId: string,
  teamId: string,
  config: RssArticleOnlyConfig,
): ServiceResult<void> {
  const src = mockSources.find((s) => s.id === sourceId && s.teamId === teamId);
  if (!src) return err('Источник не найден');
  _applyNewRssArticleConfig(sourceId, config);
  return ok(undefined);
}

export interface CreateSourceData {
  name: string;
  type: 'telegram' | 'rss' | 'website';
  url: string;
  /** Начальный конфиг агента (для website onboarding). Применяется сразу после создания. */
  initialConfig?: AgentConfig;
}

export async function createSource(
  teamId: string,
  data: CreateSourceData,
): Promise<ServiceResult<Source>> {
  if (!teamId) return err('Не выбрана команда');
  const existing = mockSources.find((s) => s.url === data.url && s.teamId === teamId);
  if (existing) return err(`URL уже добавлен как "${existing.name}"`, 'DUPLICATE_URL');
  const src = _createSource(teamId, data);
  // Если при создании передан конфиг агента (website onboarding) — применяем сразу
  if (data.initialConfig) {
    _applyNewConfig(src.id, data.initialConfig);
  }
  return ok(src);
}