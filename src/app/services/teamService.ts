// ══════════════════════════════════════════════════════════════════════
//  Team Service — единственная точка доступа к данным команд.
//  UI-компоненты импортируют отсюда, не из mock-data напрямую.
// ══════════════════════════════════════════════════════════════════════

import { mockTeams, type Team } from '../data/mock-data';

// ── Queries ───────────────────────────────────────────────────────────

/**
 * Найти команду по id. Возвращает null если не найдена или id не передан.
 */
export function getTeamById(teamId: string | null | undefined): Team | null {
  if (!teamId) return null;
  return mockTeams.find((t) => t.id === teamId) ?? null;
}

/** Все команды (для admin-панели) */
export function getAllTeams(): Team[] {
  return mockTeams;
}
