/*
  # إصلاح جدول وإضافة دالة upsert_sms_settings
  
  ## المشكلة
  - الدالة upsert_sms_settings غير موجودة في قاعدة البيانات
  - جدول sms_api_settings يفتقد بعض الحقول المطلوبة
  
  ## الحل
  1. إضافة الحقول المفقودة إلى جدول sms_api_settings
  2. إنشاء دالة upsert_sms_settings مع جميع المعاملات المطلوبة
  3. منح صلاحيات التنفيذ للمستخدمين
  
  ## الحقول المضافة
  - low_balance_threshold: حد تنبيه الرصيد المنخفض
  - low_balance_alert_enabled: تفعيل تنبيه الرصيد
  - last_balance_check: آخر فحص للرصيد
  - notes: ملاحظات إضافية
  - created_by: من أنشأ السجل
  - updated_by: من حدث السجل
  
  ## الأمان
  - الدالة تستخدم SECURITY DEFINER لتجاوز RLS بشكل آمن
  - السماح بسجل واحد فقط في الجدول
*/

-- ===================================
-- 1. إضافة الحقول المفقودة
-- ===================================

DO $$
BEGIN
  -- إضافة low_balance_threshold
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'low_balance_threshold'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN low_balance_threshold integer DEFAULT 100;
  END IF;
  
  -- إضافة low_balance_alert_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'low_balance_alert_enabled'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN low_balance_alert_enabled boolean DEFAULT true;
  END IF;
  
  -- إضافة last_balance_check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'last_balance_check'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN last_balance_check timestamptz;
  END IF;
  
  -- إضافة notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN notes text DEFAULT '';
  END IF;
  
  -- إضافة created_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN created_by text DEFAULT 'system';
  END IF;
  
  -- إضافة updated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_api_settings' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE sms_api_settings ADD COLUMN updated_by text DEFAULT 'system';
  END IF;
END $$;

-- ===================================
-- 2. إنشاء دالة upsert_sms_settings
-- ===================================

CREATE OR REPLACE FUNCTION upsert_sms_settings(
  p_api_key_encrypted text,
  p_sender_name text,
  p_api_url text DEFAULT 'https://tweetsms.ps/api.php/maan',
  p_max_daily_limit integer DEFAULT 1000,
  p_low_balance_threshold integer DEFAULT 100,
  p_low_balance_alert_enabled boolean DEFAULT true,
  p_is_active boolean DEFAULT true,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_result record;
BEGIN
  -- البحث عن السجل الموجود
  SELECT id INTO v_existing_id
  FROM sms_api_settings
  LIMIT 1;
  
  -- إذا وجد سجل، قم بالتحديث
  IF v_existing_id IS NOT NULL THEN
    UPDATE sms_api_settings
    SET 
      api_key = p_api_key_encrypted,
      sender_name = p_sender_name,
      api_url = p_api_url,
      max_daily_limit = p_max_daily_limit,
      low_balance_threshold = p_low_balance_threshold,
      low_balance_alert_enabled = p_low_balance_alert_enabled,
      is_active = p_is_active,
      notes = p_notes,
      updated_at = now(),
      updated_by = COALESCE(current_user, 'system')
    WHERE id = v_existing_id
    RETURNING * INTO v_result;
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'updated',
      'data', row_to_json(v_result)
    );
  
  -- إذا لم يوجد، قم بالإدراج
  ELSE
    INSERT INTO sms_api_settings (
      api_key,
      sender_name,
      api_url,
      max_daily_limit,
      low_balance_threshold,
      low_balance_alert_enabled,
      is_active,
      notes,
      created_by,
      updated_by
    )
    VALUES (
      p_api_key_encrypted,
      p_sender_name,
      p_api_url,
      p_max_daily_limit,
      p_low_balance_threshold,
      p_low_balance_alert_enabled,
      p_is_active,
      p_notes,
      COALESCE(current_user, 'system'),
      COALESCE(current_user, 'system')
    )
    RETURNING * INTO v_result;
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'inserted',
      'data', row_to_json(v_result)
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'action', 'failed'
    );
END;
$$;

-- ===================================
-- 3. دالة للحصول على الإعدادات
-- ===================================

CREATE OR REPLACE FUNCTION get_sms_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
BEGIN
  SELECT * INTO v_settings
  FROM sms_api_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_settings IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'data', null,
      'message', 'No settings found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(v_settings)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ===================================
-- 4. منح الصلاحيات
-- ===================================

GRANT EXECUTE ON FUNCTION upsert_sms_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_sms_settings TO anon, authenticated;

-- ===================================
-- 5. تعليقات توضيحية
-- ===================================

COMMENT ON FUNCTION upsert_sms_settings IS 'دالة آمنة لإنشاء أو تحديث إعدادات SMS. تسمح بسجل واحد فقط.';
COMMENT ON FUNCTION get_sms_settings IS 'دالة آمنة للحصول على إعدادات SMS الحالية.';
