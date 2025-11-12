import { supabase } from '../lib/supabaseClient';
import { APIErrorHandler } from '../utils/apiErrorHandler';
import { withRetry } from '../utils/apiHelpers';

export interface SMSSettings {
  id: string;
  api_key: string;
  sender_name: string;
  api_url: string;
  max_daily_limit: number;
  current_daily_count: number;
  low_balance_threshold: number;
  low_balance_alert_enabled: boolean;
  is_active: boolean;
  last_balance_amount: number;
}

export interface SMSLog {
  id: string;
  phone_number: string;
  message_text: string;
  message_type: 'otp' | 'notification' | 'alert' | 'test' | 'custom';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sms_id?: string;
  result_code?: string;
  error_message?: string;
  beneficiary_id?: string;
  package_id?: string;
  sent_by: string;
  retry_count: number;
  created_at: string;
  sent_at?: string;
}

export interface VerificationCode {
  id: string;
  code: string;
  phone_number: string;
  beneficiary_id?: string;
  expires_at: string;
  is_used: boolean;
  verification_type: 'registration' | 'login' | 'password_reset' | 'phone_change' | 'data_update';
  attempt_count: number;
  max_attempts: number;
  is_locked: boolean;
}

export interface SMSResponse {
  success: boolean;
  sms_id?: string;
  result_code?: string;
  error?: string;
  message?: string;
}

export interface BalanceResponse {
  success: boolean;
  balance?: number;
  error?: string;
}

export const smsService = {
  async encrypt(text: string): Promise<string> {
    try {
      if (!text || text.trim() === '') {
        throw APIErrorHandler.createEncryptionError('encrypt', new Error('نص فارغ'));
      }

      // Use TextEncoder to properly handle UTF-8 characters including Arabic
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      // Convert to base64 using a safe method that handles all characters
      let binary = '';
      const len = data.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(data[i]);
      }
      return btoa(binary);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw APIErrorHandler.createEncryptionError('encrypt', error);
      }
      throw error;
    }
  },

  async decrypt(encrypted: string): Promise<string> {
    try {
      if (!encrypted || encrypted.trim() === '') {
        throw APIErrorHandler.createEncryptionError('decrypt', new Error('بيانات مشفرة فارغة'));
      }

      // Decode from base64
      const binary = atob(encrypted);

      // Convert binary string to Uint8Array
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Use TextDecoder to properly decode UTF-8 characters including Arabic
      const decoder = new TextDecoder();
      const decrypted = decoder.decode(bytes);

      if (!decrypted) {
        throw APIErrorHandler.createEncryptionError('decrypt', new Error('فشل فك التشفير'));
      }
      return decrypted;
    } catch (error) {
      if (error instanceof Error && !error.message.includes('فشل')) {
        throw APIErrorHandler.createEncryptionError('decrypt', error);
      }
      throw error;
    }
  },

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    if (cleaned.startsWith('972')) {
      return cleaned;
    } else if (cleaned.startsWith('+972')) {
      return cleaned.substring(1);
    } else if (cleaned.startsWith('05')) {
      return '972' + cleaned.substring(1);
    } else if (cleaned.startsWith('5')) {
      return '972' + cleaned;
    }

    return cleaned;
  },

  validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(?:\+?972|0)?5[0-9]{8}$/.test(cleaned);
  },

  generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async getSettings(): Promise<SMSSettings | null> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('sms_api_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return data as SMSSettings;
  },

  async saveSettings(settings: Partial<SMSSettings>): Promise<SMSSettings> {
    if (!supabase) throw new Error('Supabase not initialized');

    try {
      const { data, error } = await supabase.rpc('upsert_sms_settings', {
        p_api_key_encrypted: settings.api_key || '',
        p_sender_name: settings.sender_name || '',
        p_api_url: settings.api_url || 'https://tweetsms.ps/api.php/maan',
        p_max_daily_limit: settings.max_daily_limit || 1000,
        p_low_balance_threshold: settings.low_balance_threshold || 100,
        p_low_balance_alert_enabled: settings.low_balance_alert_enabled !== false,
        p_is_active: settings.is_active !== false,
        p_notes: settings.notes || '',
      });

      if (error) {
        console.error('Error calling upsert_sms_settings:', error);
        throw new Error(`Failed to save settings: ${error.message}`);
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Unknown error occurred';
        console.error('upsert_sms_settings returned error:', errorMsg);
        throw new Error(`Failed to save settings: ${errorMsg}`);
      }

      return data.data as SMSSettings;
    } catch (error) {
      console.error('Exception in saveSettings:', error);
      throw error instanceof Error ? error : new Error('Failed to save settings');
    }
  },

  async checkBalance(): Promise<BalanceResponse> {
    const settings = await this.getSettings();

    if (!settings) {
      return { success: false, error: 'خدمة SMS غير مُعدة. يرجى إدخال بيانات الاتصال أولاً.' };
    }

    if (!settings.is_active) {
      return { success: false, error: 'خدمة SMS غير مفعلة. يرجى تفعيلها من الإعدادات.' };
    }

    try {
      const apiKey = await this.decrypt(settings.api_key);

      const response = await APIErrorHandler.fetchWithErrorHandling(
        'https://tweetsms.ps/api.php/maan/chk_balance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            api_key: apiKey,
          }),
          timeout: 15000,
          serviceName: 'TweetSMS',
        }
      );

      const result = await response.json();

      if (result.code === 999 && result.balance !== undefined) {
        const balance = parseInt(result.balance);

        await supabase
          .from('sms_api_settings')
          .update({
            last_balance_amount: balance,
            last_balance_check: new Date().toISOString(),
          })
          .eq('id', settings.id);

        return { success: true, balance };
      } else {
        const errorInfo = APIErrorHandler.translateTweetSMSError(result.code?.toString() || '-999');
        return {
          success: false,
          error: `${errorInfo.message}. ${errorInfo.suggestion}`
        };
      }
    } catch (error: any) {
      const userMessage = APIErrorHandler.getUserFriendlyMessage(error);
      const suggestion = APIErrorHandler.getSuggestion(error);
      return {
        success: false,
        error: suggestion ? `${userMessage}. ${suggestion}` : userMessage
      };
    }
  },

  async sendSMS(
    phoneNumber: string,
    message: string,
    messageType: SMSLog['message_type'] = 'custom',
    beneficiaryId?: string,
    packageId?: string
  ): Promise<SMSResponse> {
    const settings = await this.getSettings();

    if (!settings || !settings.is_active) {
      return { success: false, error: 'خدمة SMS غير مُعدة أو غير مفعلة' };
    }

    if (!this.validatePhoneNumber(phoneNumber)) {
      return { success: false, error: 'صيغة رقم الهاتف غير صحيحة. يجب أن يبدأ بـ 05 أو 972' };
    }

    await supabase?.rpc('reset_daily_sms_count');

    if (settings.current_daily_count >= settings.max_daily_limit) {
      return { success: false, error: `تم الوصول للحد اليومي (${settings.max_daily_limit} رسالة). يرجى المحاولة غداً.` };
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const logEntry = {
      phone_number: formattedPhone,
      message_text: message,
      message_type: messageType,
      status: 'pending' as const,
      beneficiary_id: beneficiaryId,
      package_id: packageId,
      sent_by: 'system',
      retry_count: 0,
    };

    const { data: logData, error: logError } = await supabase!
      .from('sms_logs')
      .insert(logEntry)
      .select()
      .single();

    if (logError) {
      return { success: false, error: `فشل حفظ سجل الرسالة: ${logError.message}` };
    }

    try {
      const apiKey = await this.decrypt(settings.api_key);
      const sender = settings.sender_name;

      const response = await APIErrorHandler.fetchWithErrorHandling(
        'https://tweetsms.ps/api.php/maan/sendsms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            api_key: apiKey,
            to: formattedPhone,
            message: message,
            sender: sender,
          }),
          timeout: 20000,
          serviceName: 'TweetSMS',
        }
      );

      const result = await response.json();
      const resultCode = result.code?.toString() || '-999';
      const smsId = result.message_id?.toString();

      let status: 'sent' | 'failed' = 'failed';
      let errorMessage: string | undefined;

      if (resultCode === '999') {
        status = 'sent';
        await supabase!
          .from('sms_api_settings')
          .update({
            current_daily_count: settings.current_daily_count + 1,
          })
          .eq('id', settings.id);
      } else {
        const errorInfo = APIErrorHandler.translateTweetSMSError(resultCode);
        errorMessage = `${errorInfo.message} - ${errorInfo.suggestion}`;

        if (resultCode === '-113' && settings.low_balance_alert_enabled) {
          await this.checkBalance();
        }
      }

      await supabase!
        .from('sms_logs')
        .update({
          status,
          sms_id: smsId || undefined,
          result_code: resultCode,
          error_message: errorMessage,
          sent_at: status === 'sent' ? new Date().toISOString() : undefined,
          failed_at: status === 'failed' ? new Date().toISOString() : undefined,
        })
        .eq('id', logData.id);

      return {
        success: status === 'sent',
        sms_id: smsId,
        result_code: resultCode,
        error: errorMessage,
        message: status === 'sent' ? 'SMS sent successfully' : errorMessage,
      };

    } catch (error: any) {
      const userMessage = APIErrorHandler.getUserFriendlyMessage(error);
      const suggestion = APIErrorHandler.getSuggestion(error);
      const fullError = suggestion ? `${userMessage}. ${suggestion}` : userMessage;

      await supabase!
        .from('sms_logs')
        .update({
          status: 'failed',
          error_message: fullError,
          failed_at: new Date().toISOString(),
        })
        .eq('id', logData.id);

      return { success: false, error: fullError };
    }
  },

  async createVerificationCode(
    phoneNumber: string,
    verificationType: VerificationCode['verification_type'] = 'registration',
    beneficiaryId?: string
  ): Promise<{ code: string; id: string } | null> {
    if (!supabase) throw new Error('Supabase not initialized');

    const code = this.generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { data, error } = await supabase
      .from('verification_codes')
      .insert({
        code,
        phone_number: this.formatPhoneNumber(phoneNumber),
        beneficiary_id: beneficiaryId,
        expires_at: expiresAt.toISOString(),
        verification_type: verificationType,
      })
      .select()
      .single();

    if (error) throw error;
    return { code, id: data.id };
  },

  async sendOTP(
    phoneNumber: string,
    name: string,
    verificationType: VerificationCode['verification_type'] = 'registration',
    beneficiaryId?: string
  ): Promise<SMSResponse> {
    const verification = await this.createVerificationCode(
      phoneNumber,
      verificationType,
      beneficiaryId
    );

    if (!verification) {
      return { success: false, error: 'Failed to create verification code' };
    }

    const message = `مرحباً ${name}،\n\nرمز التحقق الخاص بك هو:\n\n🔢 ${verification.code}\n\n⏰ صالح لمدة 5 دقائق.\n\nفريق الدعم`;

    const result = await this.sendSMS(
      phoneNumber,
      message,
      'otp',
      beneficiaryId
    );

    if (result.success && supabase) {
      await supabase
        .from('verification_codes')
        .update({ notes: `SMS ID: ${result.sms_id}` })
        .eq('id', verification.id);
    }

    return result;
  },

  async verifyOTP(
    phoneNumber: string,
    code: string
  ): Promise<{ success: boolean; error?: string; beneficiaryId?: string }> {
    if (!supabase) throw new Error('Supabase not initialized');

    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const { data, error } = await supabase
      .rpc('verify_otp_code', {
        p_phone_number: formattedPhone,
        p_code: code,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && typeof data === 'object' && 'success' in data) {
      return {
        success: data.success,
        error: data.error || data.message,
        beneficiaryId: data.beneficiary_id,
      };
    }

    return { success: false, error: 'Invalid response from server' };
  },

  async getSMSLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
      status?: string;
      messageType?: string;
      phoneNumber?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<SMSLog[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    let query = supabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.messageType) {
      query = query.eq('message_type', filters.messageType);
    }
    if (filters?.phoneNumber) {
      query = query.ilike('phone_number', `%${filters.phoneNumber}%`);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as SMSLog[];
  },

  async getSMSStatistics(days: number = 30): Promise<any> {
    if (!supabase) throw new Error('Supabase not initialized');

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const { data, error } = await supabase
      .rpc('get_sms_statistics', {
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) throw error;
    return data;
  },

  async cleanupExpiredCodes(): Promise<number> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .rpc('cleanup_expired_verification_codes');

    if (error) throw error;
    return data || 0;
  },

  templates: {
    welcome: (name: string): string => {
      return `مرحباً ${name}،\n\n🎉 تم استلام طلب تسجيلك بنجاح!\n\nطلبك الآن قيد المراجعة من قبل فريقنا. سنتواصل معك قريباً.\n\nفريق الدعم`;
    },

    packageUpdate: (name: string, packageName: string, status: string): string => {
      return `مرحباً ${name}،\n\nتم تحديث حالة طردك:\n\n📦 ${packageName}\n📍 الحالة: ${status}\n\nفريق الدعم`;
    },

    identityApproved: (name: string): string => {
      return `مرحباً ${name}،\n\n✅ تم الموافقة على توثيق هويتك بنجاح!\n\nيمكنك الآن الوصول إلى جميع خدمات النظام.\n\nفريق الدعم`;
    },

    identityRejected: (name: string, reason: string): string => {
      return `مرحباً ${name}،\n\n❌ نأسف لإبلاغك أن طلب التوثيق قد تم رفضه.\n\nالسبب: ${reason}\n\nيرجى التواصل مع الدعم.\n\nفريق الدعم`;
    },

    passwordReset: (name: string, code: string): string => {
      return `مرحباً ${name}،\n\nرمز إعادة تعيين كلمة المرور:\n\n🔑 ${code}\n\n⏰ صالح لمدة 5 دقائق.\n\nفريق الدعم`;
    },
  },
};
