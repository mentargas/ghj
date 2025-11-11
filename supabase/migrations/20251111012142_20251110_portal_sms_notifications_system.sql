/*
  # نظام البوابة والإشعارات والـ SMS المتكامل
  
  ## الوصف
  إضافة جداول البوابة، نظام SMS، والإشعارات
  
  ## 1. جداول البوابة
  - verification_codes: رموز التحقق OTP
  - beneficiary_otp: رموز OTP للمستفيدين
  - system_features: ميزات النظام
  
  ## 2. جداول SMS
  - sms_api_settings: إعدادات خدمة SMS
  - sms_logs: سجل الرسائل المرسلة
  
  ## 3. جداول التحديثات
  - data_update_requests: طلبات تحديث البيانات
  - account_status_history: سجل تغييرات حالة الحساب
  
  ## 4. الأمان
  - تفعيل RLS على جميع الجداول
*/

-- جدول رموز التحقق
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code text NOT NULL,
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset', 'data_update', 'phone_verification')),
  is_verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read verification codes"
  ON verification_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert verification codes"
  ON verification_codes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update verification codes"
  ON verification_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- جدول ميزات النظام
CREATE TABLE IF NOT EXISTS system_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  is_enabled boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb,
  updated_by text DEFAULT 'system',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read system features"
  ON system_features FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage features"
  ON system_features FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- جدول إعدادات SMS API
CREATE TABLE IF NOT EXISTS sms_api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  sender_name text NOT NULL,
  api_url text DEFAULT 'http://www.tweetsms.ps/api.php',
  is_active boolean DEFAULT true,
  max_daily_limit integer DEFAULT 1000,
  current_daily_count integer DEFAULT 0,
  daily_count_reset_date date DEFAULT CURRENT_DATE,
  last_balance_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SMS settings"
  ON sms_api_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert SMS settings"
  ON sms_api_settings FOR INSERT TO authenticated 
  WITH CHECK (NOT EXISTS (SELECT 1 FROM sms_api_settings));

CREATE POLICY "Authenticated users can update SMS settings"
  ON sms_api_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- جدول سجل الرسائل SMS
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sms_id text,
  error_code text,
  error_message text,
  sent_at timestamptz DEFAULT now(),
  beneficiary_id uuid REFERENCES beneficiaries(id) ON DELETE SET NULL,
  purpose text,
  cost numeric DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read SMS logs"
  ON sms_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert SMS logs"
  ON sms_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update SMS logs"
  ON sms_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- جدول طلبات تحديث البيانات
CREATE TABLE IF NOT EXISTS data_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

CREATE INDEX IF NOT EXISTS idx_data_update_requests_beneficiary ON data_update_requests(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_data_update_requests_status ON data_update_requests(status);

ALTER TABLE data_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read update requests"
  ON data_update_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert update requests"
  ON data_update_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update requests"
  ON data_update_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- جدول سجل حالة الحساب
CREATE TABLE IF NOT EXISTS account_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  reason text,
  changed_by text DEFAULT 'system',
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_status_history_beneficiary ON account_status_history(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_account_status_history_date ON account_status_history(changed_at DESC);

ALTER TABLE account_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read status history"
  ON account_status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert status history"
  ON account_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- إضافة حقول التحقق لجدول المستفيدين
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN whatsapp_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN account_status text DEFAULT 'active' 
      CHECK (account_status IN ('active', 'suspended', 'deactivated', 'pending_review'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'can_request_data_updates'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN can_request_data_updates boolean DEFAULT true;
  END IF;
END $$;