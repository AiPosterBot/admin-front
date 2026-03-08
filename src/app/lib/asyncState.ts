// ══════════════════════════════════════════════════════════════════════
//  Единая модель асинхронных состояний.
//  Заменяет разрозненные isLoading/data/error в компонентах.
//  При подключении реального API меняются только сервисы —
//  AsyncState остаётся контрактом между UI и данными.
// ══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Типы состояний ───────────────────────────────────────────────────

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code?: string }
  | { status: 'empty' };

// Алиасы-конструкторы
export const idle   = <T = never>(): AsyncState<T> => ({ status: 'idle' });
export const loading = <T = never>(): AsyncState<T> => ({ status: 'loading' });
export const success = <T>(data: T): AsyncState<T> => ({ status: 'success', data });
export const empty  = <T = never>(): AsyncState<T> => ({ status: 'empty' });
export const failure = <T = never>(error: string, code?: string): AsyncState<T> =>
  ({ status: 'error', error, code });

// ── Type guards ──────────────────────────────────────────────────────

export function isIdle<T>(s: AsyncState<T>): s is { status: 'idle' } {
  return s.status === 'idle';
}
export function isLoading<T>(s: AsyncState<T>): s is { status: 'loading' } {
  return s.status === 'loading';
}
export function isSuccess<T>(s: AsyncState<T>): s is { status: 'success'; data: T } {
  return s.status === 'success';
}
export function isError<T>(s: AsyncState<T>): s is { status: 'error'; error: string } {
  return s.status === 'error';
}
export function isEmpty<T>(s: AsyncState<T>): s is { status: 'empty' } {
  return s.status === 'empty';
}

// ── useAsync — fetch с invalidation ──────────────────────────────────

export interface UseAsyncOptions {
  /** Если false — автозапрос при mount не выполняется */
  immediate?: boolean;
}

export interface UseAsyncReturn<T> {
  state: AsyncState<T>;
  /** Принудительно перечитать данные (инвалидация) */
  invalidate: () => void;
  /** Сбросить в idle */
  reset: () => void;
}

/**
 * Хук для чтения данных через промис-фабрику.
 * `fetcher` — функция без аргументов, возвращает Promise<T>.
 * Перевызывается при изменении `deps` или вызове `invalidate()`.
 */
export function useAsync<T>(
  fetcher: () => Promise<T | null>,
  deps: unknown[] = [],
  options: UseAsyncOptions = {},
): UseAsyncReturn<T> {
  const { immediate = true } = options;
  const [state, setState] = useState<AsyncState<T>>(
    immediate ? loading<T>() : idle<T>(),
  );
  const [version, setVersion] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!immediate && version === 0) return;
    abortRef.current = false;
    setState(loading<T>());

    fetcher()
      .then((data) => {
        if (abortRef.current) return;
        if (data === null || (Array.isArray(data) && data.length === 0)) {
          setState(empty<T>());
        } else {
          setState(success(data as T));
        }
      })
      .catch((e: unknown) => {
        if (abortRef.current) return;
        const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
        setState(failure<T>(msg));
      });

    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const reset = useCallback(() => setState(idle<T>()), []);

  return { state, invalidate, reset };
}

// ── useAsyncMutation — CRUD-операции ─────────────────────────────────

export interface MutationState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
}

export interface UseAsyncMutationReturn<TInput, TOutput> {
  mutationState: MutationState<TOutput>;
  execute: (input: TInput) => Promise<TOutput | null>;
  reset: () => void;
}

/**
 * Хук для мутаций (create/update/delete).
 * При переходе на реальный API замените `handler` на HTTP-вызов.
 */
export function useAsyncMutation<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>,
): UseAsyncMutationReturn<TInput, TOutput> {
  const [mutationState, setState] = useState<MutationState<TOutput>>({
    status: 'idle',
  });

  const execute = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setState({ status: 'loading' });
      try {
        const result = await handler(input);
        setState({ status: 'success', data: result });
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка операции';
        setState({ status: 'error', error: msg });
        return null;
      }
    },
    [handler],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { mutationState, execute, reset };
}
