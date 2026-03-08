// ══════════════════════════════════════════════════════════════════════
//  useTeamScopedEntity — защита route на уровне принадлежности команде.
//  Детальные страницы (Source/Channel/Job) вызывают этот хук:
//  если сущность не принадлежит currentTeamId — хук вернёт null
//  и выполнит редирект, предотвращая утечку данных между командами.
// ══════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTeam } from '../context/TeamContext';
import { useAsync } from '../lib/asyncState';
import type { AsyncState } from '../lib/asyncState';

/** Минимальный контракт: любая сущность с teamId */
interface TeamOwned {
  teamId: string;
  id: string;
}

export interface UseTeamScopedEntityReturn<T extends TeamOwned> {
  state: AsyncState<T>;
  /** true, пока идёт загрузка */
  isLoading: boolean;
  /** true, если сущность найдена и принадлежит команде */
  isFound: boolean;
}

/**
 * Загружает сущность через `fetcher` и проверяет, что она принадлежит
 * текущей команде. Если нет — перенаправляет на `fallbackPath`.
 *
 * @param fetcher    Функция, возвращающая сущность или null
 * @param deps       Массив зависимостей (обычно [entityId])
 * @param fallbackPath Куда редиректить при отсутствии доступа
 *
 * @example
 * const { state } = useTeamScopedEntity(
 *   () => sourceService.getSourceById(sourceId!, currentTeamId!),
 *   [sourceId, currentTeamId],
 *   '/sources',
 * );
 */
export function useTeamScopedEntity<T extends TeamOwned>(
  fetcher: () => Promise<T | null>,
  deps: unknown[],
  fallbackPath = '/',
): UseTeamScopedEntityReturn<T> {
  const { currentTeamId } = useTeam();
  const navigate = useNavigate();

  const { state } = useAsync<T>(
    async () => {
      if (!currentTeamId) return null;
      const entity = await fetcher();
      // Двойная проверка: сервис должен уже фильтровать по teamId,
      // но мы верифицируем это ещё раз на уровне хука
      if (!entity || entity.teamId !== currentTeamId) return null;
      return entity;
    },
    deps,
  );

  useEffect(() => {
    // После загрузки: если не нашли — редирект
    if (state.status === 'empty' || state.status === 'error') {
      navigate(fallbackPath, { replace: true });
    }
  }, [state.status, navigate, fallbackPath]);

  return {
    state,
    isLoading: state.status === 'loading',
    isFound: state.status === 'success',
  };
}
