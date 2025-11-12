import { supabase } from '../lib/supabaseClient';
import { smsService } from './smsService';
import type { Database } from '../types/database';

type Beneficiary = Database['public']['Tables']['beneficiaries']['Row'];
type BeneficiaryNotification = Database['public']['Tables']['beneficiary_notifications']['Row'];

export interface NotificationTemplate {
  type: 'package_assigned' | 'package_delivery' | 'verification_status_change' | 'qualification_status_change' | 'data_update_response' | 'general';
  title: string;
  message: string;
  smsMessage?: string;
}

export interface SendNotificationOptions {
  beneficiaryId: string;
  type: BeneficiaryNotification['notification_type'];
  title: string;
  message: string;
  sendSMS?: boolean;
  smsMessage?: string;
  packageId?: string;
  phoneNumber?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export const notificationHubService = {
  async sendNotification(options: SendNotificationOptions): Promise<{
    success: boolean;
    notificationId?: string;
    smsResult?: any;
    error?: string;
  }> {
    if (!supabase) throw new Error('Supabase not initialized');

    try {
      const { data: notification, error: notifError } = await supabase
        .from('beneficiary_notifications')
        .insert({
          beneficiary_id: options.beneficiaryId,
          notification_type: options.type,
          title: options.title,
          message: options.message,
          is_read: false,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      let smsResult = null;
      if (options.sendSMS) {
        const phoneNumber = options.phoneNumber || await this.getBeneficiaryPhone(options.beneficiaryId);
        if (phoneNumber) {
          const smsMessage = options.smsMessage || options.message;
          smsResult = await smsService.sendSMS(
            phoneNumber,
            smsMessage,
            'notification',
            options.beneficiaryId,
            options.packageId
          );
        }
      }

      return {
        success: true,
        notificationId: notification.id,
        smsResult,
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل إرسال الإشعار',
      };
    }
  },

  async sendPackageAssignedNotification(
    beneficiaryId: string,
    beneficiaryName: string,
    packageName: string,
    packageId: string,
    phoneNumber?: string
  ): Promise<any> {
    return this.sendNotification({
      beneficiaryId,
      type: 'package_assigned',
      title: 'طرد جديد',
      message: `تم تخصيص طرد جديد لك: ${packageName}`,
      sendSMS: true,
      smsMessage: smsService.templates.packageUpdate(beneficiaryName, packageName, 'تم التخصيص'),
      packageId,
      phoneNumber,
    });
  },

  async sendPackageDeliveryNotification(
    beneficiaryId: string,
    beneficiaryName: string,
    packageName: string,
    packageId: string,
    status: string,
    phoneNumber?: string
  ): Promise<any> {
    const statusMessages: Record<string, string> = {
      'in_delivery': 'في الطريق إليك',
      'delivered': 'تم التسليم بنجاح',
      'failed': 'فشل التسليم',
    };

    return this.sendNotification({
      beneficiaryId,
      type: 'package_delivery',
      title: `تحديث حالة الطرد: ${packageName}`,
      message: `الحالة الجديدة: ${statusMessages[status] || status}`,
      sendSMS: true,
      smsMessage: smsService.templates.packageUpdate(beneficiaryName, packageName, statusMessages[status] || status),
      packageId,
      phoneNumber,
    });
  },

  async sendVerificationStatusNotification(
    beneficiaryId: string,
    beneficiaryName: string,
    status: 'verified' | 'rejected',
    notes?: string,
    phoneNumber?: string
  ): Promise<any> {
    const isApproved = status === 'verified';

    return this.sendNotification({
      beneficiaryId,
      type: 'verification_status_change',
      title: isApproved ? 'تم توثيق هويتك' : 'طلب التوثيق',
      message: isApproved
        ? 'تم الموافقة على توثيق هويتك بنجاح. يمكنك الآن الوصول إلى جميع الخدمات.'
        : `تم رفض طلب التوثيق. ${notes || 'يرجى التواصل مع الدعم للمزيد من المعلومات.'}`,
      sendSMS: true,
      smsMessage: isApproved
        ? smsService.templates.identityApproved(beneficiaryName)
        : smsService.templates.identityRejected(beneficiaryName, notes || 'يرجى التواصل مع الدعم'),
      phoneNumber,
    });
  },

  async sendDataUpdateResponseNotification(
    beneficiaryId: string,
    approved: boolean,
    rejectionReason?: string,
    phoneNumber?: string
  ): Promise<any> {
    return this.sendNotification({
      beneficiaryId,
      type: 'data_update_response',
      title: approved ? 'تم قبول طلب التحديث' : 'طلب التحديث',
      message: approved
        ? 'تم الموافقة على طلب تحديث بياناتك وتطبيق التغييرات بنجاح.'
        : `تم رفض طلب التحديث. السبب: ${rejectionReason || 'غير محدد'}`,
      sendSMS: true,
      phoneNumber,
    });
  },

  async sendQualificationStatusNotification(
    beneficiaryId: string,
    status: 'qualified' | 'needs_update' | 'unqualified',
    notes?: string,
    phoneNumber?: string
  ): Promise<any> {
    const statusMessages: Record<string, { title: string; message: string }> = {
      qualified: {
        title: 'حساب مؤهل',
        message: 'حسابك مؤهل للحصول على الخدمات.',
      },
      needs_update: {
        title: 'يحتاج تحديث',
        message: 'حسابك يحتاج تحديث بعض البيانات لاستمرار الخدمات.',
      },
      unqualified: {
        title: 'حساب غير مؤهل',
        message: 'حسابك غير مؤهل حالياً. يرجى التواصل مع الدعم.',
      },
    };

    const statusInfo = statusMessages[status];

    return this.sendNotification({
      beneficiaryId,
      type: 'qualification_status_change',
      title: statusInfo.title,
      message: `${statusInfo.message}${notes ? ` ${notes}` : ''}`,
      sendSMS: status !== 'qualified',
      phoneNumber,
    });
  },

  async getNotifications(
    beneficiaryId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<BeneficiaryNotification[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    let query = supabase
      .from('beneficiary_notifications')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase
      .from('beneficiary_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  async markAllAsRead(beneficiaryId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase
      .from('beneficiary_notifications')
      .update({ is_read: true })
      .eq('beneficiary_id', beneficiaryId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async getUnreadCount(beneficiaryId: string): Promise<number> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { count, error } = await supabase
      .from('beneficiary_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('beneficiary_id', beneficiaryId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  async getStats(beneficiaryId: string): Promise<NotificationStats> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('beneficiary_notifications')
      .select('notification_type, is_read')
      .eq('beneficiary_id', beneficiaryId);

    if (error) throw error;

    const total = data?.length || 0;
    const unread = data?.filter(n => !n.is_read).length || 0;

    const byType: Record<string, number> = {};
    data?.forEach(n => {
      byType[n.notification_type] = (byType[n.notification_type] || 0) + 1;
    });

    return { total, unread, byType };
  },

  async getBeneficiaryPhone(beneficiaryId: string): Promise<string | null> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('beneficiaries')
      .select('phone')
      .eq('id', beneficiaryId)
      .maybeSingle();

    if (error) throw error;
    return data?.phone || null;
  },

  async getSMSHistory(beneficiaryId: string, limit: number = 20): Promise<any[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async deleteNotification(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase
      .from('beneficiary_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },
};
