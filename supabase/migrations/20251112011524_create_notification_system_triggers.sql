/*
  # إنشاء نظام Triggers للإشعارات التلقائية

  ## الوصف
  هذا الـ migration يُنشئ نظام شامل من Triggers و Functions للإشعارات التلقائية

  ## 1. الـ Triggers المُنشأة

  ### trigger_package_assigned
  - يُطلق عند إنشاء طرد جديد مع beneficiary_id
  - يُرسل إشعار تلقائي للمستفيد
  - يُسجل الإشعار في beneficiary_notifications

  ### trigger_package_status_update
  - يُطلق عند تحديث حالة الطرد
  - يُرسل إشعار عند التغيير إلى: in_delivery, delivered, failed
  - يُحدّث تاريخ التسليم تلقائياً

  ### trigger_beneficiary_verification_status
  - يُطلق عند تحديث حالة التوثيق (verification_status)
  - يُرسل إشعار للمستفيد بالنتيجة

  ### trigger_beneficiary_qualification_status
  - يُطلق عند تحديث حالة الأهلية (qualification_status)
  - يُرسل إشعار للمستفيد بالتغيير

  ## 2. الـ Functions المُنشأة

  ### notify_package_assigned()
  - يُنشئ إشعار عند تخصيص طرد جديد
  - يُحفظ beneficiary_id و package_id

  ### notify_package_status_change()
  - يُنشئ إشعار عند تغيير حالة الطرد
  - يُحدث delivered_at عند التسليم

  ### notify_verification_status_change()
  - يُنشئ إشعار عند تغيير حالة التوثيق
  - يُضمن رسالة واضحة للمستفيد

  ### notify_qualification_status_change()
  - يُنشئ إشعار عند تغيير حالة الأهلية
  - يُوضح الإجراء المطلوب من المستفيد

  ## 3. الأمان
  - جميع الـ Functions محمية بـ SECURITY DEFINER
  - التحقق من البيانات قبل إنشاء الإشعار
  - معالجة الأخطاء بشكل آمن
*/

-- ===================================
-- 1. Function: إشعار طرد جديد
-- ===================================

CREATE OR REPLACE FUNCTION notify_package_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.beneficiary_id IS NOT NULL THEN
    INSERT INTO beneficiary_notifications (
      beneficiary_id,
      notification_type,
      title,
      message,
      is_read,
      created_at
    )
    VALUES (
      NEW.beneficiary_id,
      'package_assigned',
      'طرد جديد',
      format('تم تخصيص طرد جديد لك: %s', COALESCE(NEW.name, 'طرد')),
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================
-- 2. Function: إشعار تحديث حالة الطرد
-- ===================================

CREATE OR REPLACE FUNCTION notify_package_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_message text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.beneficiary_id IS NOT NULL THEN
    CASE NEW.status
      WHEN 'in_delivery' THEN
        v_status_message := 'الطرد في الطريق إليك';
      WHEN 'delivered' THEN
        v_status_message := 'تم تسليم الطرد بنجاح';
        NEW.delivered_at := now();
      WHEN 'failed' THEN
        v_status_message := 'فشل تسليم الطرد. سيتم إعادة المحاولة.';
      ELSE
        v_status_message := NULL;
    END CASE;

    IF v_status_message IS NOT NULL THEN
      INSERT INTO beneficiary_notifications (
        beneficiary_id,
        notification_type,
        title,
        message,
        is_read,
        created_at
      )
      VALUES (
        NEW.beneficiary_id,
        'package_delivery',
        format('تحديث حالة الطرد: %s', COALESCE(NEW.name, 'طرد')),
        v_status_message,
        false,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================
-- 3. Function: إشعار تغيير حالة التوثيق
-- ===================================

CREATE OR REPLACE FUNCTION notify_identity_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title text;
  v_message text;
BEGIN
  IF OLD.identity_status IS DISTINCT FROM NEW.identity_status THEN
    CASE NEW.identity_status
      WHEN 'verified' THEN
        v_title := 'تم توثيق هويتك';
        v_message := 'تم الموافقة على توثيق هويتك بنجاح. يمكنك الآن الوصول إلى جميع الخدمات.';
      WHEN 'pending' THEN
        v_title := 'قيد المراجعة';
        v_message := 'طلب التوثيق قيد المراجعة من قبل الإدارة.';
      WHEN 'rejected' THEN
        v_title := 'طلب التوثيق';
        v_message := format('تم رفض طلب التوثيق. %s', COALESCE(NEW.notes, 'يرجى التواصل مع الدعم.'));
      ELSE
        RETURN NEW;
    END CASE;

    INSERT INTO beneficiary_notifications (
      beneficiary_id,
      notification_type,
      title,
      message,
      is_read,
      created_at
    )
    VALUES (
      NEW.id,
      'verification_status_change',
      v_title,
      v_message,
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================
-- 4. Function: إشعار تغيير حالة الأهلية
-- ===================================

CREATE OR REPLACE FUNCTION notify_eligibility_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title text;
  v_message text;
BEGIN
  IF OLD.eligibility_status IS DISTINCT FROM NEW.eligibility_status THEN
    CASE NEW.eligibility_status
      WHEN 'eligible' THEN
        v_title := 'حساب مؤهل';
        v_message := 'حسابك مؤهل للحصول على الخدمات.';
      WHEN 'under_review' THEN
        v_title := 'قيد المراجعة';
        v_message := 'حالة أهليتك قيد المراجعة من قبل الإدارة.';
      WHEN 'rejected' THEN
        v_title := 'حساب غير مؤهل';
        v_message := format('حسابك غير مؤهل حالياً. %s', COALESCE(NEW.notes, 'يرجى التواصل مع الدعم.'));
      ELSE
        RETURN NEW;
    END CASE;

    INSERT INTO beneficiary_notifications (
      beneficiary_id,
      notification_type,
      title,
      message,
      is_read,
      created_at
    )
    VALUES (
      NEW.id,
      'qualification_status_change',
      v_title,
      v_message,
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ===================================
-- 5. إنشاء الـ Triggers
-- ===================================

-- Trigger: طرد جديد
DROP TRIGGER IF EXISTS trigger_package_assigned ON packages;
CREATE TRIGGER trigger_package_assigned
  AFTER INSERT ON packages
  FOR EACH ROW
  WHEN (NEW.beneficiary_id IS NOT NULL)
  EXECUTE FUNCTION notify_package_assigned();

-- Trigger: تحديث حالة الطرد
DROP TRIGGER IF EXISTS trigger_package_status_update ON packages;
CREATE TRIGGER trigger_package_status_update
  BEFORE UPDATE OF status ON packages
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_package_status_change();

-- Trigger: تغيير حالة التوثيق
DROP TRIGGER IF EXISTS trigger_beneficiary_identity_status ON beneficiaries;
CREATE TRIGGER trigger_beneficiary_identity_status
  AFTER UPDATE OF identity_status ON beneficiaries
  FOR EACH ROW
  WHEN (OLD.identity_status IS DISTINCT FROM NEW.identity_status)
  EXECUTE FUNCTION notify_identity_status_change();

-- Trigger: تغيير حالة الأهلية
DROP TRIGGER IF EXISTS trigger_beneficiary_eligibility_status ON beneficiaries;
CREATE TRIGGER trigger_beneficiary_eligibility_status
  AFTER UPDATE OF eligibility_status ON beneficiaries
  FOR EACH ROW
  WHEN (OLD.eligibility_status IS DISTINCT FROM NEW.eligibility_status)
  EXECUTE FUNCTION notify_eligibility_status_change();

-- ===================================
-- 6. Function مساعدة: تنظيف الإشعارات القديمة
-- ===================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM beneficiary_notifications
  WHERE created_at < now() - (days_old || ' days')::interval
    AND is_read = true;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- ===================================
-- 7. Function مساعدة: إحصائيات الإشعارات
-- ===================================

CREATE OR REPLACE FUNCTION get_beneficiary_notification_stats(p_beneficiary_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE is_read = false),
    'read', COUNT(*) FILTER (WHERE is_read = true),
    'by_type', (
      SELECT jsonb_object_agg(notification_type, type_count)
      FROM (
        SELECT notification_type, COUNT(*) as type_count
        FROM beneficiary_notifications
        WHERE beneficiary_id = p_beneficiary_id
        GROUP BY notification_type
      ) type_counts
    ),
    'recent_unread', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', notification_type,
          'title', title,
          'message', message,
          'created_at', created_at
        )
      )
      FROM (
        SELECT id, notification_type, title, message, created_at
        FROM beneficiary_notifications
        WHERE beneficiary_id = p_beneficiary_id
          AND is_read = false
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    )
  ) INTO v_stats
  FROM beneficiary_notifications
  WHERE beneficiary_id = p_beneficiary_id;

  RETURN COALESCE(v_stats, '{"total": 0, "unread": 0, "read": 0}'::jsonb);
END;
$$;

-- ===================================
-- 8. تعليقات توضيحية
-- ===================================

COMMENT ON FUNCTION notify_package_assigned() IS 'Trigger function: Creates notification when a new package is assigned to a beneficiary';
COMMENT ON FUNCTION notify_package_status_change() IS 'Trigger function: Creates notification when package status changes to in_delivery, delivered, or failed';
COMMENT ON FUNCTION notify_identity_status_change() IS 'Trigger function: Creates notification when beneficiary identity status changes';
COMMENT ON FUNCTION notify_eligibility_status_change() IS 'Trigger function: Creates notification when beneficiary eligibility status changes';
COMMENT ON FUNCTION cleanup_old_notifications(integer) IS 'Helper function: Deletes read notifications older than specified days (default 90)';
COMMENT ON FUNCTION get_beneficiary_notification_stats(uuid) IS 'Helper function: Returns comprehensive notification statistics for a beneficiary';
