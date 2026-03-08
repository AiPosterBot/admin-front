// ══════════════════════════════════════════════════════════════════════
//  Item Service — единственная точка доступа к данным материалов.
// ══════════════════════════════════════════════════════════════════════

import { mockItems, mockSources, type Item } from '../data/mock-data';
import { ok, err, type ServiceResult } from '../types/dto';

// ── Queries ───────────────────────────────────────────────────────────

/** Возвращает все материалы команды */
export async function getTeamItems(teamId: string): Promise<Item[]> {
  return mockItems.filter((i) => i.teamId === teamId);
}

/**
 * Синхронный список материалов команды (для вычислений без хука).
 */
export function getTeamItemsList(teamId: string): Item[] {
  return mockItems.filter((i) => i.teamId === teamId);
}

/**
 * Все материалы из конкретного источника (синхронно, по sourceId).
 */
export function getItemsBySourceId(sourceId: string): Item[] {
  return mockItems.filter((i) => i.sourceId === sourceId);
}

/**
 * Возвращает материал по id С проверкой принадлежности команде.
 * null — если не найден или teamId не совпадает.
 */
export async function getItemById(
  itemId: string,
  teamId: string,
): Promise<Item | null> {
  const item = mockItems.find((i) => i.id === itemId);
  if (!item || item.teamId !== teamId) return null;
  return item;
}

/** Удалить материал (заглушка — в реальном API HTTP DELETE) */
export async function deleteItem(
  itemId: string,
  teamId: string,
): Promise<ServiceResult<void>> {
  const item = mockItems.find((i) => i.id === itemId && i.teamId === teamId);
  if (!item) return err('Материал не найден');
  const idx = mockItems.indexOf(item);
  if (idx !== -1) mockItems.splice(idx, 1);
  return ok(undefined);
}

/** Источник материала с проверкой принадлежности команде */
export function getItemSource(item: Item) {
  return mockSources.find((s) => s.id === item.sourceId) ?? null;
}