/*
  # إصلاح جدول المصادقة للمستفيدين

  1. الوصف
    - إنشاء جدول beneficiary_auth لتخزين كلمات المرور وبيانات المصادقة للمستفيدين
    - يدعم PIN للوصول إلى البيانات الكاملة
    - يتضمن حماية من Brute Force

  2. الجدول الجديد
    - `beneficiary_auth`: بيانات المصادقة للمستفيدين
      - beneficiary_id: معرف المستفيد
      - national_id: رقم الهوية
      - password_hash: كلمة المرور المشفرة (PIN)
      - login_attempts: عدد محاولات الدخول الفاشلة
      - locked_until: وقت إلغاء القفل
      - last_login_at: آخر تسجيل دخول
      - is_first_login: أول تسجيل دخول

  3. الأمان
    - RLS مُفعل على الجدول
    - سياسات للسماح بالإدراج والتحديث
    - حماية من محاولات Brute Force
*/

-- ===================================
-- 1. إنشاء جدول beneficiary_auth
-- ===================================

CREATE TABLE IF NOT EXISTS beneficiary_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  national_id text NOT NULL,
  password_hash text NOT NULL,
  login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  is_first_login boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء فهارس للأداء
CREATE UNIQUE INDEX IF NOT EXISTS idx_beneficiary_auth_beneficiary_id 
  ON beneficiary_auth(beneficiary_id);

CREATE INDEX IF NOT EXISTS idx_beneficiary_auth_national_id 
  ON beneficiary_auth(national_id);

-- ===================================
-- 2. تفعيل RLS
-- ===================================

ALTER TABLE beneficiary_auth ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 3. سياسات RLS
-- ===================================

-- السماح للجميع بإدراج سجل جديد (لإنشاء PIN)
CREATE POLICY "allow_insert_beneficiary_auth"
  ON beneficiary_auth
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح للجميع بتحديث البيانات (لمحاولات الدخول)
CREATE POLICY "allow_update_beneficiary_auth"
  ON beneficiary_auth
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- السماح للجميع بقراءة البيانات (للتحقق من وجود PIN)
CREATE POLICY "allow_select_beneficiary_auth"
  ON beneficiary_auth
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح للمصادقين بحذف البيانات
CREATE POLICY "authenticated_delete_beneficiary_auth"
  ON beneficiary_auth
  FOR DELETE
  TO authenticated
  USING (true);

-- ===================================
-- 4. تعليقات توضيحية
-- ===================================

COMMENT ON TABLE beneficiary_auth IS 'بيانات المصادقة للمستفيدين للوصول إلى معلوماتهم الكاملة';
COMMENT ON COLUMN beneficiary_auth.beneficiary_id IS 'معرف المستفيد';
COMMENT ON COLUMN beneficiary_auth.national_id IS 'رقم الهوية الوطني';
COMMENT ON COLUMN beneficiary_auth.password_hash IS 'كلمة المرور المشفرة (PIN)';
COMMENT ON COLUMN beneficiary_auth.login_attempts IS 'عدد محاولات الدخول الفاشلة';
COMMENT ON COLUMN beneficiary_auth.locked_until IS 'وقت إلغاء القفل بعد محاولات فاشلة متعددة';
COMMENT ON COLUMN beneficiary_auth.last_login_at IS 'آخر تسجيل دخول ناجح';
COMMENT ON COLUMN beneficiary_auth.is_first_login IS 'هل هذا أول تسجيل دخول';
