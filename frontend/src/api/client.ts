export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Strip trailing slash
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem('eventsnap_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    let responseData: any = {};
    const text = await response.text();
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { text };
      }
    }

    if (!response.ok) {
      const errorObj = responseData?.error;
      const errorMessage =
        errorObj?.message ||
        responseData?.message ||
        `Request failed with status ${response.status} (${response.statusText})`;
      const errorCode = errorObj?.code || `HTTP_${response.status}`;
      const errorDetails = errorObj?.details;

      throw new ApiError(response.status, errorMessage, errorCode, errorDetails);
    }

    // Backend wraps success in { data: ..., message: ... }
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as T;
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network error (e.g. backend server not started or unreachable)
    throw new ApiError(
      0,
      `Network connection failed: Unable to reach backend server at ${baseUrl}. Ensure backend runner is active.`,
      'NETWORK_UNAVAILABLE'
    );
  }
}
