// ══════════════════════════════════════════════════════════════════════
//  Channel Service — единственная точка доступа к данным каналов.
// ══════════════════════════════════════════════════════════════════════

import {
  mockChannels,
  mockChannelSourceLinks,
  mockPostedItems,
  mockChannelTags,
  addChannel,
  deleteChannel as _deleteChannel,
  getChannelTags as _getChannelTags,
  linkSource as _linkSource,
  unlinkSource as _unlinkSource,
  type Channel,
  type ChannelTag,
} from '../data/mock-data';
import { ok, err, type ServiceResult } from '../types/dto';

// ── Queries ───────────────────────────────────────────────────────────

export async function getTeamChannels(teamId: string): Promise<Channel[]> {
  return mockChannels.filter((c) => c.teamId === teamId);
}

/**
 * Синхронный список каналов команды (для фильтров/дропдаунов).
 * Не выполняет сетевых запросов — читает из in-memory mock.
 */
export function getTeamChannelsList(teamId: string): Channel[] {
  return mockChannels.filter((c) => c.teamId === teamId);
}

/**
 * Возвращает канал по id С проверкой принадлежности команде.
 * null — если не найден или не принадлежит команде.
 */
export async function getChannelById(
  channelId: string,
  teamId: string,
): Promise<Channel | null> {
  const ch = mockChannels.find((c) => c.id === channelId);
  if (!ch || ch.teamId !== teamId) return null;
  return ch;
}

/** Количество связанных источников */
export function getLinkedSourceCount(channelId: string): number {
  return mockChannelSourceLinks.filter((l) => l.channelId === channelId).length;
}

/**
 * Список id источников, привязанных к каналу (синхронный).
 * Используется как замена прямого доступа к mockChannelSourceLinks в UI.
 */
export function getLinkedSourceIds(channelId: string): string[] {
  return mockChannelSourceLinks
    .filter((l) => l.channelId === channelId)
    .map((l) => l.sourceId);
}

/** Количество опубликованных постов */
export function getPostedItemCount(channelId: string): number {
  return mockPostedItems.filter((p) => p.channelId === channelId).length;
}

/** Получить теги конкретного канала */
export function getChannelTagsById(channelId: string): ChannelTag[] {
  return _getChannelTags(channelId);
}

/** Получить все теги каналов команды */
export function getTeamChannelTags(teamId: string): ChannelTag[] {
  return mockChannelTags.filter((t) => t.teamId === teamId);
}

// ── Мутации ──────────────────────────────────────────────────────────

export interface CreateChannelData {
  name: string;
  telegramId: string;
}

export async function createChannel(
  teamId: string,
  data: CreateChannelData,
): Promise<ServiceResult<Channel>> {
  if (!teamId) return err('Не выбрана команда');
  const duplicate = mockChannels.find(
    (c) => c.telegramId === data.telegramId && c.teamId === teamId,
  );
  if (duplicate) return err(`Канал уже добавлен как "${duplicate.name}"`, 'DUPLICATE');

  const ch = addChannel(teamId, data);
  return ok(ch);
}

export async function deleteChannel(
  channelId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const ch = mockChannels.find(
    (c) => c.id === channelId && c.teamId === teamId,
  );
  if (!ch) return err('Канал не найден');
  _deleteChannel(channelId);
  return ok(undefined);
}

// ── Новые мутации ─────────────────────────────────────────────────────

/** Переключить isActive канала */
export async function toggleChannelActive(
  channelId: string,
  teamId: string,
  active: boolean,
): Promise<ServiceResult<Channel>> {
  const ch = mockChannels.find((c) => c.id === channelId && c.teamId === teamId);
  if (!ch) return err('Канал не найден');
  ch.isActive = active;
  return ok({ ...ch });
}

export interface ChannelSettingsData {
  postStyle?: string;
  agentInstructions?: string;
  contentStrategy?: 'newest' | 'agent';
  publishMode?: 'instant' | 'scheduled';
  cron?: string;
  timezone?: string;
}

/** Сохранить настройки канала (стиль, расписание, стратегия) */
export async function updateChannelSettings(
  channelId: string,
  teamId: string,
  data: ChannelSettingsData,
): Promise<ServiceResult<Channel>> {
  const ch = mockChannels.find((c) => c.id === channelId && c.teamId === teamId);
  if (!ch) return err('Канал не найден');
  if (data.postStyle !== undefined) ch.postStyle = data.postStyle;
  if (data.agentInstructions !== undefined) ch.agentInstructions = data.agentInstructions;
  if (data.contentStrategy !== undefined) ch.contentStrategy = data.contentStrategy;
  if (data.publishMode !== undefined) ch.publishMode = data.publishMode;
  if (data.cron !== undefined) ch.cron = data.cron;
  if (data.timezone !== undefined) ch.timezone = data.timezone;
  return ok({ ...ch });
}

// ── Мутации связанных источников ──────────────────────────────────────

/** Привязать источник к каналу */
export async function linkSource(
  channelId: string,
  sourceId: string,
): Promise<ServiceResult<void>> {
  _linkSource(channelId, sourceId);
  return ok(undefined);
}

/** Отвязать источник от канала */
export async function unlinkSource(
  channelId: string,
  sourceId: string,
): Promise<ServiceResult<void>> {
  _unlinkSource(channelId, sourceId);
  return ok(undefined);
}