import { Alert } from 'react-native';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ErrorMessages: Record<ErrorCode, string> = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  API_ERROR: '서버 요청 처리 중 오류가 발생했습니다.',
  VALIDATION_ERROR: '입력한 정보를 다시 확인해주세요.',
  AUTHENTICATION_ERROR: '인증이 필요합니다. 다시 로그인해주세요.',
  PERMISSION_ERROR: '권한이 없습니다.',
  NOT_FOUND: '요청한 정보를 찾을 수 없습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
};

export function handleApiError(error: any): AppError {
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      return new AppError(
        ErrorMessages.AUTHENTICATION_ERROR,
        ErrorCodes.AUTHENTICATION_ERROR,
        status,
        data
      );
    } else if (status === 403) {
      return new AppError(
        ErrorMessages.PERMISSION_ERROR,
        ErrorCodes.PERMISSION_ERROR,
        status,
        data
      );
    } else if (status === 404) {
      return new AppError(ErrorMessages.NOT_FOUND, ErrorCodes.NOT_FOUND, status, data);
    } else if (status >= 500) {
      return new AppError(ErrorMessages.SERVER_ERROR, ErrorCodes.SERVER_ERROR, status, data);
    } else {
      return new AppError(
        data?.message || ErrorMessages.API_ERROR,
        ErrorCodes.API_ERROR,
        status,
        data
      );
    }
  } else if (error.request) {
    // Request made but no response
    return new AppError(ErrorMessages.NETWORK_ERROR, ErrorCodes.NETWORK_ERROR);
  } else {
    // Something else happened
    return new AppError(error.message || ErrorMessages.UNKNOWN_ERROR, ErrorCodes.UNKNOWN_ERROR);
  }
}

export function showErrorAlert(error: AppError | Error | string): void {
  let message: string;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = ErrorMessages.UNKNOWN_ERROR;
  }

  Alert.alert(
    '오류',
    message,
    [
      {
        text: '확인',
        style: 'default',
      },
    ],
    { cancelable: true }
  );
}

export async function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options?: {
    showAlert?: boolean;
    fallbackValue?: T;
    onError?: (error: AppError) => void;
  }
): Promise<T | undefined> {
  try {
    return await asyncFn();
  } catch (error) {
    const appError = error instanceof AppError ? error : handleApiError(error);

    if (options?.onError) {
      options.onError(appError);
    }

    if (options?.showAlert !== false) {
      showErrorAlert(appError);
    }

    return options?.fallbackValue;
  }
}
