import { useState, useCallback } from 'react';
import { AppError, handleApiError, showErrorAlert } from '../utils/errorHandler';

interface UseAsyncOperationOptions {
  showErrorAlert?: boolean;
  onSuccess?: () => void;
  onError?: (error: AppError) => void;
}

export function useAsyncOperation<T = any>(options?: UseAsyncOperationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (asyncOperation: () => Promise<T>) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncOperation();
        setData(result);

        if (options?.onSuccess) {
          options.onSuccess();
        }

        return result;
      } catch (err) {
        const appError = err instanceof AppError ? err : handleApiError(err);

        setError(appError);

        if (options?.onError) {
          options.onError(appError);
        }

        if (options?.showErrorAlert !== false) {
          showErrorAlert(appError);
        }

        throw appError;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}
