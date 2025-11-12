import { errorLogger } from './errorLogger';

export interface APIRequestDetails {
  url: string;
  method: string;
  timestamp: string;
  headers?: Record<string, string>;
  bodySize?: number;
  timeout?: number;
}

export interface APIResponseDetails {
  status?: number;
  statusText?: string;
  responseTime?: number;
  body?: any;
  headers?: Record<string, string>;
}

export interface APIError {
  type: 'network' | 'timeout' | 'authentication' | 'validation' | 'server_error' | 'encryption' | 'unknown';
  message: string;
  userMessage: string;
  suggestion?: string;
  request?: APIRequestDetails;
  response?: APIResponseDetails;
  originalError?: any;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  serviceName?: string;
  sanitizeHeaders?: boolean;
}

export class APIErrorHandler {
  private static DEFAULT_TIMEOUT = 30000;

  static async fetchWithErrorHandling(
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      serviceName = 'API',
      sanitizeHeaders = true,
      ...fetchOptions
    } = options;

    const startTime = Date.now();
    const requestDetails: APIRequestDetails = {
      url: this.sanitizeURL(url),
      method: fetchOptions.method || 'GET',
      timestamp: new Date().toISOString(),
      timeout,
    };

    if (fetchOptions.headers && !sanitizeHeaders) {
      requestDetails.headers = this.sanitizeHeaders(fetchOptions.headers as Record<string, string>);
    }

    if (fetchOptions.body) {
      requestDetails.bodySize = new Blob([fetchOptions.body as any]).size;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseDetails: APIResponseDetails = {
        status: response.status,
        statusText: response.statusText,
        responseTime,
      };

      if (!response.ok) {
        let responseBody;
        try {
          responseBody = await response.clone().json();
        } catch {
          responseBody = await response.clone().text();
        }

        responseDetails.body = responseBody;

        const error = this.createAPIError(
          response.status,
          responseBody,
          requestDetails,
          responseDetails,
          serviceName
        );

        this.logError(error, serviceName);
        throw error;
      }

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        const timeoutError = this.createTimeoutError(
          requestDetails,
          { responseTime },
          timeout,
          serviceName
        );
        this.logError(timeoutError, serviceName);
        throw timeoutError;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = this.createNetworkError(
          requestDetails,
          { responseTime },
          error,
          serviceName
        );
        this.logError(networkError, serviceName);
        throw networkError;
      }

      if (error.type) {
        throw error;
      }

      const unknownError = this.createUnknownError(
        requestDetails,
        { responseTime },
        error,
        serviceName
      );
      this.logError(unknownError, serviceName);
      throw unknownError;
    }
  }

  private static createAPIError(
    status: number,
    responseBody: any,
    request: APIRequestDetails,
    response: APIResponseDetails,
    serviceName: string
  ): APIError {
    let type: APIError['type'] = 'server_error';
    let message = 'فشل طلب الـ API';
    let userMessage = 'حدث خطأ في الاتصال بالخادم';
    let suggestion = 'يرجى المحاولة مرة أخرى بعد قليل';

    if (status === 401 || status === 403) {
      type = 'authentication';
      message = 'خطأ في المصادقة';
      userMessage = 'بيانات الاعتماد غير صحيحة أو منتهية الصلاحية';
      suggestion = 'يرجى التحقق من API Key والمحاولة مرة أخرى';
    } else if (status === 400 || status === 422) {
      type = 'validation';
      message = 'خطأ في البيانات المرسلة';
      userMessage = 'البيانات المدخلة غير صحيحة';
      suggestion = 'يرجى التحقق من جميع الحقول المطلوبة';
    } else if (status >= 500) {
      type = 'server_error';
      message = 'خطأ في الخادم';
      userMessage = 'الخادم لا يستجيب حالياً';
      suggestion = 'يرجى المحاولة مرة أخرى بعد قليل';
    }

    if (responseBody?.message) {
      message += `: ${responseBody.message}`;
    }

    return {
      type,
      message,
      userMessage,
      suggestion,
      request,
      response: { ...response, body: responseBody },
      originalError: responseBody,
    };
  }

  private static createTimeoutError(
    request: APIRequestDetails,
    response: APIResponseDetails,
    timeout: number,
    serviceName: string
  ): APIError {
    return {
      type: 'timeout',
      message: `انتهت مهلة الطلب بعد ${timeout}ms`,
      userMessage: 'استغرق الطلب وقتاً طويلاً ولم يكتمل',
      suggestion: 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى',
      request,
      response,
    };
  }

  private static createNetworkError(
    request: APIRequestDetails,
    response: APIResponseDetails,
    originalError: any,
    serviceName: string
  ): APIError {
    return {
      type: 'network',
      message: 'فشل الاتصال بالشبكة',
      userMessage: 'لا يمكن الاتصال بالخادم',
      suggestion: 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى',
      request,
      response,
      originalError,
    };
  }

  private static createUnknownError(
    request: APIRequestDetails,
    response: APIResponseDetails,
    originalError: any,
    serviceName: string
  ): APIError {
    return {
      type: 'unknown',
      message: originalError?.message || 'خطأ غير معروف',
      userMessage: 'حدث خطأ غير متوقع',
      suggestion: 'يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني',
      request,
      response,
      originalError,
    };
  }

  private static logError(error: APIError, serviceName: string): void {
    errorLogger.logError(
      new Error(error.message),
      `${serviceName}.API`,
      {
        type: error.type,
        userMessage: error.userMessage,
        suggestion: error.suggestion,
        request: error.request,
        response: error.response,
      }
    );
  }

  private static sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      if (params.has('api_key')) {
        params.set('api_key', '***');
      }
      if (params.has('key')) {
        params.set('key', '***');
      }

      urlObj.search = params.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'api-key', 'api_key', 'x-api-key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      }
    }

    return sanitized;
  }

  static createEncryptionError(operation: 'encrypt' | 'decrypt', originalError?: any): APIError {
    return {
      type: 'encryption',
      message: `فشل ${operation === 'encrypt' ? 'تشفير' : 'فك تشفير'} البيانات`,
      userMessage: operation === 'encrypt'
        ? 'فشل تشفير API Key. البيانات قد تكون تالفة.'
        : 'فشل فك تشفير API Key. المفتاح المحفوظ قد يكون تالفاً.',
      suggestion: operation === 'encrypt'
        ? 'يرجى إدخال API Key صحيح والمحاولة مرة أخرى'
        : 'يرجى إعادة إدخال API Key وحفظ الإعدادات مرة أخرى',
      originalError,
    };
  }

  static translateTweetSMSError(code: string): { message: string; suggestion: string } {
    const errorMap: Record<string, { message: string; suggestion: string }> = {
      '-100': {
        message: 'معلمات الطلب ناقصة',
        suggestion: 'يرجى التأكد من إدخال جميع البيانات المطلوبة (API Key، اسم المرسل، رقم الهاتف)',
      },
      '-110': {
        message: 'API Key غير صحيح',
        suggestion: 'يرجى التحقق من API Key والتأكد من نسخه بشكل صحيح من حساب TweetSMS',
      },
      '-113': {
        message: 'الرصيد غير كافٍ',
        suggestion: 'يرجى شحن رصيد الحساب من موقع TweetSMS',
      },
      '-115': {
        message: 'اسم المرسل غير متاح',
        suggestion: 'يرجى التحقق من اسم المرسل المسموح به في حسابك على TweetSMS',
      },
      '-116': {
        message: 'اسم المرسل غير صحيح',
        suggestion: 'يرجى استخدام اسم مرسل صحيح (حروف إنجليزية أو أرقام فقط)',
      },
      '-2': {
        message: 'رقم الهاتف غير صحيح أو البلد غير مدعوم',
        suggestion: 'يرجى التحقق من رقم الهاتف والتأكد من أنه بالصيغة الصحيحة (مثال: 972599123456)',
      },
      '-999': {
        message: 'فشل الإرسال من خادم TweetSMS',
        suggestion: 'يرجى المحاولة مرة أخرى بعد قليل أو الاتصال بدعم TweetSMS',
      },
    };

    return errorMap[code] || {
      message: `خطأ غير معروف: ${code}`,
      suggestion: 'يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني',
    };
  }

  static getUserFriendlyMessage(error: any): string {
    if (error?.type && error?.userMessage) {
      return error.userMessage;
    }

    if (error?.message?.includes('Failed to fetch')) {
      return 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    }

    if (error?.message?.includes('NetworkError')) {
      return 'خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.';
    }

    if (error?.message?.includes('timeout')) {
      return 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
    }

    if (error?.code === 'ECONNREFUSED') {
      return 'تم رفض الاتصال بالخادم.';
    }

    return error?.message || 'حدث خطأ غير متوقع';
  }

  static getSuggestion(error: any): string | undefined {
    if (error?.suggestion) {
      return error.suggestion;
    }

    if (error?.type === 'network') {
      return 'تأكد من اتصالك بالإنترنت وأن جدار الحماية لا يحجب الاتصال';
    }

    if (error?.type === 'timeout') {
      return 'قد يكون الخادم مشغولاً. حاول مرة أخرى بعد دقيقة';
    }

    return undefined;
  }
}
