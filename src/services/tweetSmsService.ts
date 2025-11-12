export interface SendSMSRequest {
  to: string;
  message: string;
  sender: string;
}

export interface SendSMSResponse {
  success: boolean;
  result: string | number;
  smsId?: string;
  mobile?: string;
  errorCode?: string;
  errorMessage?: string;
  errorMessageAr?: string;
}

export interface BalanceResponse {
  success: boolean;
  balance?: number;
  errorCode?: string;
  errorMessage?: string;
}

const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  '-100': { en: 'Missing parameters', ar: 'معاملات مفقودة' },
  '-110': { en: 'Wrong username or password', ar: 'اسم المستخدم أو كلمة المرور خاطئة' },
  '-111': { en: 'Wrong mobile number', ar: 'رقم الهاتف خاطئ' },
  '-112': { en: 'Duplicate mobile number', ar: 'رقم الهاتف مكرر' },
  '-113': { en: 'Not enough balance or invalid ID', ar: 'رصيد غير كافٍ أو معرف غير صالح' },
  '-114': { en: 'Group name exists or not for user', ar: 'اسم المجموعة موجود أو لا تخص المستخدم' },
  '-115': { en: 'Sender not available', ar: 'المرسل غير متاح' },
  '-116': { en: 'Invalid sender name', ar: 'اسم المرسل غير صالح' },
  '-2': { en: 'Invalid destination or unsupported country', ar: 'وجهة غير صالحة أو دولة غير مدعومة' },
  '-999': { en: 'Failed to send by SMS provider', ar: 'فشل الإرسال من مزود الرسائل' },
  'u': { en: 'Unknown message status', ar: 'حالة الرسالة غير معروفة' },
};

function getErrorMessage(code: string, lang: 'en' | 'ar' = 'ar'): string {
  const error = ERROR_MESSAGES[code];
  if (!error) return lang === 'ar' ? `خطأ غير معروف: ${code}` : `Unknown error: ${code}`;
  return error[lang];
}

function isSuccessCode(code: string | number): boolean {
  const codeStr = String(code);
  return codeStr === '1' || codeStr === '999';
}

export function validateMobileNumber(mobile: string): { valid: boolean; error?: string } {
  if (!mobile || mobile.trim() === '') {
    return { valid: false, error: 'رقم الهاتف مطلوب' };
  }

  const cleanNumber = mobile.replace(/\s+/g, '');
  const mobileRegex = /^(972|00972|\+972|0)?5[0-9]{8}$/;

  if (!mobileRegex.test(cleanNumber)) {
    return { valid: false, error: 'صيغة رقم الهاتف غير صحيحة. مثال: 972592106099 أو 0592106099' };
  }

  return { valid: true };
}

export function formatMobileNumber(mobile: string): string {
  let cleanNumber = mobile.replace(/\s+/g, '').replace(/^00/, '');

  if (cleanNumber.startsWith('+972')) {
    cleanNumber = cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('0')) {
    cleanNumber = '972' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('972')) {
    cleanNumber = '972' + cleanNumber;
  }

  return cleanNumber;
}

export function validateSenderName(sender: string): { valid: boolean; error?: string } {
  if (!sender || sender.trim() === '') {
    return { valid: false, error: 'اسم المرسل مطلوب' };
  }

  if (sender.length > 11) {
    return { valid: false, error: 'اسم المرسل يجب ألا يتجاوز 11 حرف' };
  }

  return { valid: true };
}

export function validateMessage(message: string): { valid: boolean; error?: string; parts?: number } {
  if (!message || message.trim() === '') {
    return { valid: false, error: 'نص الرسالة مطلوب' };
  }

  const hasArabic = /[\u0600-\u06FF]/.test(message);
  const maxLength = hasArabic ? 70 : 160;
  const parts = Math.ceil(message.length / maxLength);

  if (message.length > maxLength * 10) {
    return { valid: false, error: `الرسالة طويلة جداً. الحد الأقصى ${maxLength * 10} حرف.` };
  }

  return { valid: true, parts };
}

export class TweetSmsService {
  private apiKey: string;
  private baseUrl = 'https://tweetsms.ps/api.php';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
    const mobileValidation = validateMobileNumber(request.to);
    if (!mobileValidation.valid) {
      return {
        success: false,
        result: -111,
        errorCode: '-111',
        errorMessage: mobileValidation.error,
        errorMessageAr: mobileValidation.error
      };
    }

    const senderValidation = validateSenderName(request.sender);
    if (!senderValidation.valid) {
      return {
        success: false,
        result: -116,
        errorCode: '-116',
        errorMessage: senderValidation.error,
        errorMessageAr: senderValidation.error
      };
    }

    const messageValidation = validateMessage(request.message);
    if (!messageValidation.valid) {
      return {
        success: false,
        result: -100,
        errorCode: '-100',
        errorMessage: messageValidation.error,
        errorMessageAr: messageValidation.error
      };
    }

    const formattedMobile = formatMobileNumber(request.to);

    const params = new URLSearchParams({
      comm: 'sendsms',
      api_key: this.apiKey,
      to: formattedMobile,
      message: request.message,
      sender: request.sender
    });

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        return {
          success: false,
          result: -999,
          errorCode: '-999',
          errorMessage: 'فشل الاتصال بالخادم',
          errorMessageAr: 'فشل الاتصال بالخادم'
        };
      }

      const responseText = await response.text();
      const responseParts = responseText.trim().split(':');

      if (responseParts.length >= 3) {
        const [result, smsId, mobile] = responseParts;
        const resultCode = result.trim();

        if (isSuccessCode(resultCode)) {
          return {
            success: true,
            result: resultCode,
            smsId: smsId.trim(),
            mobile: mobile.trim()
          };
        } else {
          return {
            success: false,
            result: resultCode,
            errorCode: resultCode,
            errorMessage: getErrorMessage(resultCode, 'en'),
            errorMessageAr: getErrorMessage(resultCode, 'ar')
          };
        }
      }

      const resultCode = responseText.trim();
      if (resultCode.startsWith('-') || resultCode === 'u') {
        return {
          success: false,
          result: resultCode,
          errorCode: resultCode,
          errorMessage: getErrorMessage(resultCode, 'en'),
          errorMessageAr: getErrorMessage(resultCode, 'ar')
        };
      }

      return {
        success: false,
        result: responseText,
        errorCode: 'unknown',
        errorMessage: 'استجابة غير متوقعة من الخادم',
        errorMessageAr: 'استجابة غير متوقعة من الخادم'
      };
    } catch (error) {
      console.error('TweetSMS API Error:', error);
      return {
        success: false,
        result: -999,
        errorCode: '-999',
        errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف',
        errorMessageAr: 'حدث خطأ أثناء إرسال الرسالة'
      };
    }
  }

  async checkBalance(): Promise<BalanceResponse> {
    const params = new URLSearchParams({
      comm: 'chk_balance',
      api_key: this.apiKey
    });

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        return {
          success: false,
          errorCode: '-999',
          errorMessage: 'فشل الاتصال بالخادم'
        };
      }

      const responseText = await response.text();
      const responseStr = responseText.trim();

      if (responseStr.startsWith('-')) {
        return {
          success: false,
          errorCode: responseStr,
          errorMessage: getErrorMessage(responseStr, 'ar')
        };
      }

      const balance = parseFloat(responseStr);
      if (!isNaN(balance)) {
        return {
          success: true,
          balance
        };
      }

      return {
        success: false,
        errorCode: 'unknown',
        errorMessage: 'استجابة غير صحيحة للرصيد'
      };
    } catch (error) {
      console.error('Balance Check Error:', error);
      return {
        success: false,
        errorCode: '-999',
        errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  async getMessageDetails(messageId: string): Promise<any> {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams();
    urlencoded.append('api_key', this.apiKey);
    urlencoded.append('message_id', messageId);

    try {
      const response = await fetch('https://tweetsms.ps/api.php/maan/messagedetails', {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded
      });

      if (!response.ok) {
        throw new Error('فشل الحصول على تفاصيل الرسالة');
      }

      const text = await response.text();

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (error) {
      console.error('Get Message Details Error:', error);
      throw error;
    }
  }

  async getArchive(params: {
    mobile?: string;
    fromTime: string;
    toTime: string;
    sender?: string;
    displayLength?: number;
    displayStart?: number;
  }): Promise<any> {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    const raw = JSON.stringify({
      api_key: this.apiKey,
      mobile: params.mobile || '',
      from_time: params.fromTime,
      to_time: params.toTime,
      sender: params.sender || '',
      DisplayLength: String(params.displayLength || 20),
      DisplayStart: String(params.displayStart || 0)
    });

    try {
      const response = await fetch('https://www.tweetsms.ps/api.php/office/get_archive', {
        method: 'POST',
        headers: myHeaders,
        body: raw
      });

      if (!response.ok) {
        throw new Error('فشل الحصول على الأرشيف');
      }

      const text = await response.text();

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (error) {
      console.error('Get Archive Error:', error);
      throw error;
    }
  }
}

export const createTweetSmsService = (apiKey: string) => new TweetSmsService(apiKey);
