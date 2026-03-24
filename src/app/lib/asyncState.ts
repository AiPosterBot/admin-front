import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code?: string }
  | { status: 'empty' }

export const idle = <T = never>(): AsyncState<T> => ({ status: 'idle' })
export const loading = <T = never>(): AsyncState<T> => ({ status: 'loading' })
export const success = <T>(data: T): AsyncState<T> => ({ status: 'success', data })
export const empty = <T = never>(): AsyncState<T> => ({ status: 'empty' })
export const failure = <T = never>(error: string, code?: string): AsyncState<T> => ({ status: 'error', error, code })

export function isIdle<T>(state: AsyncState<T>): state is { status: 'idle' } {
  return state.status === 'idle'
}

export function isLoading<T>(state: AsyncState<T>): state is { status: 'loading' } {
  return state.status === 'loading'
}

export function isSuccess<T>(state: AsyncState<T>): state is { status: 'success'; data: T } {
  return state.status === 'success'
}

export function isError<T>(state: AsyncState<T>): state is { status: 'error'; error: string } {
  return state.status === 'error'
}

export function isEmpty<T>(state: AsyncState<T>): state is { status: 'empty' } {
  return state.status === 'empty'
}

export interface UseAsyncOptions {
  immediate?: boolean
  pollMs?: number
  keepPreviousData?: boolean
}

export interface UseAsyncReturn<T> {
  state: AsyncState<T>
  invalidate: () => void
  reset: () => void
  setData: (data: T) => void
}

export function useAsync<T>(
  fetcher: () => Promise<T | null>,
  deps: unknown[] = [],
  options: UseAsyncOptions = {},
): UseAsyncReturn<T> {
  const { immediate = true, pollMs = 0, keepPreviousData = false } = options
  const [state, setState] = useState<AsyncState<T>>(immediate ? loading<T>() : idle<T>())
  const [version, setVersion] = useState(0)
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!immediate && version === 0) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!(keepPreviousData && stateRef.current.status === 'success')) {
      setState(loading<T>())
    }

    fetcher()
      .then((data) => {
        if (!isMountedRef.current || requestIdRef.current !== requestId) {
          return
        }

        if (data === null || (Array.isArray(data) && data.length === 0)) {
          setState(empty<T>())
          return
        }

        setState(success(data as T))
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current || requestIdRef.current !== requestId) {
          return
        }

        const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
        setState(failure<T>(message))
      })
  }, [...deps, immediate, keepPreviousData, version]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pollMs <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setVersion((current) => current + 1)
    }, pollMs)

    return () => window.clearInterval(timer)
  }, [pollMs, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = useCallback(() => setVersion((current) => current + 1), [])
  const reset = useCallback(() => setState(idle<T>()), [])
  const setData = useCallback((data: T) => setState(success(data)), [])

  return { state, invalidate, reset, setData }
}

export interface MutationState<T> {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: T
  error?: string
}

export interface UseAsyncMutationReturn<TInput, TOutput> {
  mutationState: MutationState<TOutput>
  execute: (input: TInput) => Promise<TOutput | null>
  reset: () => void
}

export function useAsyncMutation<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>,
): UseAsyncMutationReturn<TInput, TOutput> {
  const [mutationState, setState] = useState<MutationState<TOutput>>({ status: 'idle' })

  const execute = useCallback(async (input: TInput): Promise<TOutput | null> => {
    setState({ status: 'loading' })

    try {
      const result = await handler(input)
      setState({ status: 'success', data: result })
      return result
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка операции'
      setState({ status: 'error', error: message })
      return null
    }
  }, [handler])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { mutationState, execute, reset }
}
