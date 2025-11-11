import { supabase } from '../lib/supabaseClient';

interface PublicSearchResult {
  success: boolean;
  error?: string;
  message?: string;
  beneficiary?: {
    id: string;
    name: string;
    national_id: string;
    status: string;
  };
  in_delivery_package?: Array<{
    id: string;
    name: string;
    status: string;
    tracking_number: string | null;
    scheduled_delivery_date: string | null;
    created_at: string;
  }>;
  has_pin?: boolean;
}

interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  message?: string;
  hourly_remaining?: number;
  daily_remaining?: number;
  blocked_until?: string;
}

export const publicSearchService = {
  async searchBeneficiary(
    nationalId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PublicSearchResult> {
    try {
      console.log('[PublicSearch] Starting search for:', nationalId);
      console.log('[PublicSearch] IP:', ipAddress, 'UserAgent:', userAgent?.substring(0, 50));

      const { data, error } = await supabase.rpc('public_search_beneficiary', {
        p_national_id: nationalId,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null
      });

      if (error) {
        console.error('[PublicSearch] RPC Error:', error);
        console.error('[PublicSearch] Error details:', JSON.stringify(error, null, 2));
        return {
          success: false,
          error: 'search_error',
          message: 'حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى'
        };
      }

      console.log('[PublicSearch] Search result:', data);

      if (!data) {
        console.error('[PublicSearch] No data returned from RPC');
        return {
          success: false,
          error: 'no_data',
          message: 'لم يتم استرجاع أي بيانات'
        };
      }

      return data as PublicSearchResult;
    } catch (err) {
      console.error('[PublicSearch] Unexpected error:', err);
      console.error('[PublicSearch] Error stack:', err instanceof Error ? err.stack : 'No stack');
      return {
        success: false,
        error: 'unexpected_error',
        message: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً'
      };
    }
  },

  async checkRateLimit(ipAddress: string): Promise<RateLimitCheck> {
    try {
      const { data, error } = await supabase.rpc('check_search_rate_limit', {
        p_ip_address: ipAddress
      });

      if (error) {
        console.error('Error checking rate limit:', error);
        return {
          allowed: true,
          message: 'تعذر التحقق من الحد الأقصى للبحث'
        };
      }

      return data as RateLimitCheck;
    } catch (err) {
      console.error('Unexpected error in checkRateLimit:', err);
      return {
        allowed: true,
        message: 'تعذر التحقق من الحد الأقصى للبحث'
      };
    }
  },

  async getFullBeneficiaryDetails(
    beneficiaryId: string,
    nationalId: string,
    pin: string
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    beneficiary?: any;
    packages?: any[];
    stats?: any;
  }> {
    try {
      const { data: auth, error: authError } = await supabase
        .from('beneficiary_auth')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .eq('national_id', nationalId)
        .maybeSingle();

      if (authError) {
        console.error('Error fetching auth:', authError);
        return {
          success: false,
          error: 'auth_error',
          message: 'حدث خطأ في التحقق من كلمة المرور'
        };
      }

      if (!auth) {
        return {
          success: false,
          error: 'no_pin',
          message: 'لم يتم إنشاء كلمة مرور بعد'
        };
      }

      if (auth.locked_until && new Date(auth.locked_until) > new Date()) {
        return {
          success: false,
          error: 'account_locked',
          message: 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً'
        };
      }

      const hashedPin = this.hashPIN(pin);

      if (auth.password_hash !== hashedPin) {
        const newAttempts = auth.login_attempts + 1;
        const shouldLock = newAttempts >= 5;

        await supabase
          .from('beneficiary_auth')
          .update({
            login_attempts: newAttempts,
            locked_until: shouldLock
              ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
              : null
          })
          .eq('id', auth.id);

        return {
          success: false,
          error: 'wrong_pin',
          message: shouldLock
            ? 'تم قفل الحساب لمدة 30 دقيقة بسبب المحاولات الفاشلة'
            : `كلمة المرور غير صحيحة. المحاولات المتبقية: ${5 - newAttempts}`
        };
      }

      await supabase
        .from('beneficiary_auth')
        .update({
          login_attempts: 0,
          locked_until: null,
          last_login_at: new Date().toISOString()
        })
        .eq('id', auth.id);

      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', beneficiaryId)
        .single();

      if (beneficiaryError) {
        console.error('Error fetching beneficiary:', beneficiaryError);
        return {
          success: false,
          error: 'fetch_error',
          message: 'حدث خطأ في جلب بيانات المستفيد'
        };
      }

      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false });

      if (packagesError) {
        console.error('Error fetching packages:', packagesError);
      }

      const stats = {
        total: packages?.length || 0,
        delivered: packages?.filter((p) => p.status === 'delivered').length || 0,
        pending: packages?.filter((p) => p.status === 'pending').length || 0,
        in_delivery: packages?.filter((p) => p.status === 'in_delivery').length || 0,
        assigned: packages?.filter((p) => p.status === 'assigned').length || 0,
        failed: packages?.filter((p) => p.status === 'failed').length || 0
      };

      return {
        success: true,
        beneficiary,
        packages: packages || [],
        stats
      };
    } catch (err) {
      console.error('Unexpected error in getFullBeneficiaryDetails:', err);
      return {
        success: false,
        error: 'unexpected_error',
        message: 'حدث خطأ غير متوقع'
      };
    }
  },

  async createPIN(
    beneficiaryId: string,
    nationalId: string,
    pin: string
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const existing = await supabase
        .from('beneficiary_auth')
        .select('id')
        .eq('beneficiary_id', beneficiaryId)
        .maybeSingle();

      if (existing.data) {
        return {
          success: false,
          error: 'pin_exists',
          message: 'كلمة المرور موجودة بالفعل'
        };
      }

      if (!/^\d{6}$/.test(pin)) {
        return {
          success: false,
          error: 'invalid_pin',
          message: 'كلمة المرور يجب أن تكون 6 أرقام'
        };
      }

      const hashedPin = this.hashPIN(pin);

      const { error } = await supabase.from('beneficiary_auth').insert({
        beneficiary_id: beneficiaryId,
        national_id: nationalId,
        password_hash: hashedPin,
        is_first_login: true
      });

      if (error) {
        console.error('Error creating PIN:', error);
        return {
          success: false,
          error: 'create_error',
          message: 'حدث خطأ في إنشاء كلمة المرور'
        };
      }

      return {
        success: true,
        message: 'تم إنشاء كلمة المرور بنجاح'
      };
    } catch (err) {
      console.error('Unexpected error in createPIN:', err);
      return {
        success: false,
        error: 'unexpected_error',
        message: 'حدث خطأ غير متوقع'
      };
    }
  },

  async checkIfHasPIN(beneficiaryId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('beneficiary_auth')
        .select('id')
        .eq('beneficiary_id', beneficiaryId)
        .maybeSingle();

      if (error) {
        console.error('Error checking PIN:', error);
        return false;
      }

      return data !== null;
    } catch (err) {
      console.error('Unexpected error in checkIfHasPIN:', err);
      return false;
    }
  },

  async getSearchLogs(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('public_search_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching search logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Unexpected error in getSearchLogs:', err);
      return [];
    }
  },

  async getSuspiciousActivities(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_activity_log')
        .select('*')
        .eq('is_reviewed', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching suspicious activities:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Unexpected error in getSuspiciousActivities:', err);
      return [];
    }
  },

  async markActivityAsReviewed(
    activityId: string,
    reviewedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('suspicious_activity_log')
        .update({
          is_reviewed: true,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', activityId);

      if (error) {
        console.error('Error marking activity as reviewed:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error in markActivityAsReviewed:', err);
      return false;
    }
  },

  async getSearchStats(): Promise<{
    today: number;
    this_week: number;
    this_month: number;
    success_rate: number;
    suspicious_count: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: logs, error } = await supabase
        .from('public_search_logs')
        .select('*');

      if (error) {
        console.error('Error fetching stats:', error);
        return {
          today: 0,
          this_week: 0,
          this_month: 0,
          success_rate: 0,
          suspicious_count: 0
        };
      }

      const today = logs?.filter(
        (log) => new Date(log.created_at) >= todayStart
      ).length || 0;

      const thisWeek = logs?.filter(
        (log) => new Date(log.created_at) >= weekStart
      ).length || 0;

      const thisMonth = logs?.filter(
        (log) => new Date(log.created_at) >= monthStart
      ).length || 0;

      const successful = logs?.filter((log) => log.beneficiary_found).length || 0;
      const total = logs?.length || 1;
      const successRate = (successful / total) * 100;

      const { data: suspicious } = await supabase
        .from('suspicious_activity_log')
        .select('id', { count: 'exact' })
        .eq('is_reviewed', false);

      return {
        today,
        this_week: thisWeek,
        this_month: thisMonth,
        success_rate: Math.round(successRate),
        suspicious_count: suspicious?.length || 0
      };
    } catch (err) {
      console.error('Unexpected error in getSearchStats:', err);
      return {
        today: 0,
        this_week: 0,
        this_month: 0,
        success_rate: 0,
        suspicious_count: 0
      };
    }
  },

  hashPIN(pin: string): string {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  getClientIP(): string | undefined {
    return undefined;
  },

  getUserAgent(): string {
    return navigator.userAgent;
  }
};
