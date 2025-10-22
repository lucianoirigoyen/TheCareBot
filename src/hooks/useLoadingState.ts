import { useCallback } from 'react';
import { useUiStore } from '@/store/ui.store';
import type { LoadingState } from '@/types/medical';

/**
 * Hook for managing loading states with consistent behavior across the application
 * @param key - Unique identifier for the loading state
 */
export function useLoadingState<T>(key: string) {
  const { loadingStates, setLoadingState, clearLoadingState } = useUiStore();
  const currentState = loadingStates[key] as LoadingState<T> | undefined;

  const setState = useCallback(
    (state: LoadingState<T>) => {
      setLoadingState(key, state);
    },
    [key, setLoadingState]
  );

  const setLoading = useCallback(
    (data: T | null = null) => {
      setState({ status: 'loading', data, error: null });
    },
    [setState]
  );

  const setSuccess = useCallback(
    (data: T) => {
      setState({ status: 'success', data, error: null });
    },
    [setState]
  );

  const setError = useCallback(
    (error: string, data: T | null = null) => {
      setState({ status: 'error', data, error });
    },
    [setState]
  );

  const setIdle = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, [setState]);

  const clear = useCallback(() => {
    clearLoadingState(key);
  }, [key, clearLoadingState]);

  const reset = useCallback(() => {
    setIdle();
  }, [setIdle]);

  return {
    state: currentState ?? { status: 'idle' as const, data: null, error: null },
    setLoading,
    setSuccess,
    setError,
    setIdle,
    reset,
    clear,
    isLoading: currentState?.status === 'loading',
    isSuccess: currentState?.status === 'success',
    isError: currentState?.status === 'error',
    isIdle: currentState?.status === 'idle' || !currentState,
    hasData: currentState?.data !== null && currentState?.data !== undefined,
    hasError: currentState?.error !== null && currentState?.error !== undefined,
  } as const;
}