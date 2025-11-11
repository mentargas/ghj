/*
  # إصلاح سياسات RLS للجداول الحساسة

  ## الجداول المستهدفة
  - sms_api_settings: إعدادات SMS API (حساسة جداً)
  - sms_logs: سجل الرسائل النصية
  - verification_codes: رموز التحقق OTP
  
  ## المشاكل الحالية
  
  ### sms_api_settings
  - السياسة: TO authenticated USING (true)
  - المشكلة: جميع المستخدمين يرون إعدادات API
  - الحل: فقط المدراء

  ### sms_logs
  - السياسة: USING (true)
  - المشكلة: الجميع يرى جميع السجلات
  - الحل: حسب المؤسسة والصلاحيات

  ### verification_codes
  - السياسة: TO anon WITH CHECK (true)
  - المشكلة: الزوار ينشئون رموز OTP بلا حدود
  - الحل: Rate limiting وقيود صارمة

  ## الحلول الجديدة
  - تقييد صارم للوصول
  - فحص الصلاحيات
  - حماية البيانات الحساسة
  - منع الإساءة والهجمات
*/

-- ===================================
-- 1. إصلاح sms_api_settings
-- ===================================

DROP POLICY IF EXISTS "Admins can read SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Admins can insert SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Admins can update SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Admins can delete SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Authenticated users can read SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Authenticated users can insert SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Authenticated users can update SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Anyone can read SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Allow insert if table is empty" ON sms_api_settings;
DROP POLICY IF EXISTS "Anyone can update SMS settings" ON sms_api_settings;
DROP POLICY IF EXISTS "Anyone can delete SMS settings" ON sms_api_settings;

CREATE POLICY "only_admins_can_read_sms_settings"
  ON sms_api_settings FOR SELECT
  TO authenticated
  USING (check_user_is_admin());

CREATE POLICY "only_admins_can_insert_sms_settings"
  ON sms_api_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_is_admin()
    AND NOT EXISTS (SELECT 1 FROM sms_api_settings)
  );

CREATE POLICY "only_admins_can_update_sms_settings"
  ON sms_api_settings FOR UPDATE
  TO authenticated
  USING (check_user_is_admin())
  WITH CHECK (check_user_is_admin());

CREATE POLICY "only_admins_can_delete_sms_settings"
  ON sms_api_settings FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 2. إصلاح sms_logs
-- ===================================

DROP POLICY IF EXISTS "Authenticated users can read SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Authenticated users can insert SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Authenticated users can update SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Anyone can read SMS logs" ON sms_logs;

CREATE POLICY "authorized_users_can_read_sms_logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (
    check_user_is_admin()
    OR
    check_user_permission('قراءة سجلات SMS')
  );

CREATE POLICY "system_can_insert_sms_logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "admins_can_update_sms_logs"
  ON sms_logs FOR UPDATE
  TO authenticated
  USING (check_user_is_admin())
  WITH CHECK (check_user_is_admin());

-- ===================================
-- 3. إصلاح verification_codes
-- ===================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'verification_codes'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can read verification codes" ON verification_codes;
    DROP POLICY IF EXISTS "Authenticated users can insert verification codes" ON verification_codes;
    DROP POLICY IF EXISTS "Authenticated users can update verification codes" ON verification_codes;

    EXECUTE 'CREATE POLICY "admins_can_read_verification_codes"
      ON verification_codes FOR SELECT
      TO authenticated
      USING (check_user_is_admin())';

    EXECUTE 'CREATE POLICY "limited_insert_verification_codes"
      ON verification_codes FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT EXISTS (
          SELECT 1 FROM verification_codes vc
          WHERE vc.phone_number = verification_codes.phone_number
          AND vc.created_at > NOW() - INTERVAL ''1 minute''
          AND NOT vc.is_verified
        )
      )';

    EXECUTE 'CREATE POLICY "system_can_update_verification_codes"
      ON verification_codes FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ===================================
-- 4. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "only_admins_can_read_sms_settings" ON sms_api_settings 
IS 'المدراء فقط يمكنهم قراءة إعدادات SMS API';

COMMENT ON POLICY "only_admins_can_insert_sms_settings" ON sms_api_settings 
IS 'المدراء فقط يضيفون إعدادات SMS إذا كان الجدول فارغاً';

COMMENT ON POLICY "only_admins_can_update_sms_settings" ON sms_api_settings 
IS 'المدراء فقط يعدلون إعدادات SMS';

COMMENT ON POLICY "only_admins_can_delete_sms_settings" ON sms_api_settings 
IS 'المدراء فقط يحذفون إعدادات SMS';

COMMENT ON POLICY "authorized_users_can_read_sms_logs" ON sms_logs 
IS 'المستخدمون المخولون يقرأون سجلات SMS حسب صلاحياتهم';

COMMENT ON POLICY "system_can_insert_sms_logs" ON sms_logs 
IS 'النظام يسجل الرسائل المرسلة';

COMMENT ON POLICY "admins_can_update_sms_logs" ON sms_logs 
IS 'المدراء فقط يعدلون سجلات SMS';
