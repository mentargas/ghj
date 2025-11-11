/*
  # إصلاح وتحديث schema جدول sms_logs

  ## الوصف
  هذا الـ migration يقوم بالتأكد من وجود جميع الأعمدة المطلوبة في جدول sms_logs
  وإصلاح أي مشاكل في schema cache

  ## 1. التغييرات
  - التأكد من وجود العمود message_text
  - التأكد من جميع الأعمدة والفهارس
  - تحديث RLS policies إذا لزم الأمر

  ## 2. الأمان
  - الحفاظ على جميع البيانات الموجودة
  - عدم حذف أي بيانات
*/

-- ===================================
-- 1. التأكد من وجود جدول sms_logs مع جميع الأعمدة
-- ===================================

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- معلومات الرسالة
  phone_number text NOT NULL,
  message_text text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('otp', 'notification', 'alert', 'test', 'custom')),

  -- معلومات الحالة
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sms_id text,
  result_code text,
  error_message text,

  -- معلومات إضافية
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,

  -- معلومات المرسل
  sent_by text NOT NULL,
  sent_by_user_id text,

  -- تتبع المحاولات
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,

  -- التواريخ
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  failed_at timestamptz,

  -- ملاحظات
  notes text DEFAULT ''
);

-- ===================================
-- 2. التأكد من وجود جميع الأعمدة
-- ===================================

DO $$
BEGIN
  -- التأكد من وجود phone_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN phone_number text NOT NULL;
  END IF;

  -- التأكد من وجود message_text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'message_text'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN message_text text NOT NULL;
  END IF;

  -- التأكد من وجود message_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN message_type text NOT NULL CHECK (message_type IN ('otp', 'notification', 'alert', 'test', 'custom'));
  END IF;

  -- التأكد من وجود status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'status'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'));
  END IF;

  -- التأكد من وجود sms_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'sms_id'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN sms_id text;
  END IF;

  -- التأكد من وجود result_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'result_code'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN result_code text;
  END IF;

  -- التأكد من وجود error_message
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN error_message text;
  END IF;

  -- التأكد من وجود beneficiary_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'beneficiary_id'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE SET NULL;
  END IF;

  -- التأكد من وجود package_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
  END IF;

  -- التأكد من وجود sent_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN sent_by text NOT NULL;
  END IF;

  -- التأكد من وجود sent_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'sent_by_user_id'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN sent_by_user_id text;
  END IF;

  -- التأكد من وجود retry_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN retry_count integer DEFAULT 0;
  END IF;

  -- التأكد من وجود max_retries
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN max_retries integer DEFAULT 3;
  END IF;

  -- التأكد من وجود created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- التأكد من وجود sent_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN sent_at timestamptz;
  END IF;

  -- التأكد من وجود failed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN failed_at timestamptz;
  END IF;

  -- التأكد من وجود notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'notes'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- ===================================
-- 3. إنشاء أو تحديث الفهارس
-- ===================================

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_beneficiary ON sms_logs(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- ===================================
-- 4. التأكد من تفعيل RLS
-- ===================================

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 5. إعادة إنشاء RLS Policies
-- ===================================

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Authenticated users can read SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Authenticated users can insert SMS logs" ON sms_logs;
DROP POLICY IF EXISTS "Authenticated users can update SMS logs" ON sms_logs;

-- إعادة إنشاء السياسات
CREATE POLICY "Authenticated users can read SMS logs"
  ON sms_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert SMS logs"
  ON sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update SMS logs"
  ON sms_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================================
-- 6. تحديث schema cache (تعليق للمساعدة في troubleshooting)
-- ===================================

-- يمكنك تشغيل هذا الأمر من Supabase Dashboard SQL Editor:
-- NOTIFY pgrst, 'reload schema';
