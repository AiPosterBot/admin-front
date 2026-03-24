// ══════════════════════════════════════════════════════════════════════
//  TeamScopeGuard — компонент-обёртка для route-level проверки.
//  Используй на детальных страницах: Source, Channel, Job.
//  Пока данные загружаются — показывает skeleton.
//  Если сущность не принадлежит команде — делает редирект.
// ══════════════════════════════════════════════════════════════════════

import { Loader2 } from 'lucide-react';
import type { AsyncState } from '../lib/asyncState';

interface Props<T> {
  state: AsyncState<T>;
  children: (data: T) => React.ReactNode;
  /** Текст для пустого состояния (на случай если редирект не произошёл) */
  notFoundLabel?: string;
}

/**
 * Рендерит `children` только когда данные успешно загружены.
 * В состоянии loading показывает спиннер.
 * В состоянии error/empty — сообщение (редирект уже выполнен хуком).
 *
 * @example
 * <TeamScopeGuard state={state}>
 *   {(source) => <SourceDetailContent source={source} />}
 * </TeamScopeGuard>
 */
export function TeamScopeGuard<T>({ state, children, notFoundLabel }: Props<T>) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === 'error' || state.status === 'empty') {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-muted-foreground">
          {notFoundLabel ?? 'Объект не найден или недоступен в этой команде'}
        </p>
      </div>
    );
  }

  return <>{children(state.data)}</>;
}
