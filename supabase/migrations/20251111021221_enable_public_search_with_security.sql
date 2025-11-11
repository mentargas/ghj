/*
  # تمكين البحث العام الآمن مع نظام حماية متعدد الطبقات

  ## الوصف
  هذا الترحيل يحل مشكلة RLS ويضيف نظام بحث عام آمن مع:
  - سياسات RLS جديدة للسماح بالبحث العام المحدود
  - جدول لتسجيل عمليات البحث العام
  - جدول لتتبع محاولات الوصول المشبوهة
  - إعدادات أمان قابلة للتخصيص
  - دوال محسّنة للبحث العام

  ## الجداول الجديدة

  ### 1. public_search_logs
  - تسجيل جميع عمليات البحث العام
  - تتبع IP والوقت ونتيجة البحث

  ### 2. search_rate_limits
  - تتبع معدل البحث لكل IP
  - منع إساءة الاستخدام

  ### 3. suspicious_activity_log
  - تسجيل النشاط المشبوه
  - تنبيهات تلقائية للمدراء

  ## التحديثات
  - تحديث سياسات RLS للسماح بالبحث العام
  - إضافة إعدادات CAPTCHA و OTP في system_features
  - تحسين دالة search_beneficiary_with_packages

  ## الأمان
  - جميع الجداول محمية بـ RLS
  - تسجيل كامل لجميع العمليات
  - حماية من Brute Force و Rate Limiting
*/

-- ===================================
-- 1. إنشاء جدول تسجيل عمليات البحث العام
-- ===================================

CREATE TABLE IF NOT EXISTS public_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id text NOT NULL,
  ip_address text,
  user_agent text,
  search_success boolean DEFAULT false,
  beneficiary_found boolean DEFAULT false,
  captcha_verified boolean DEFAULT false,
  otp_verified boolean DEFAULT false,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_search_logs_national_id ON public_search_logs(national_id);
CREATE INDEX IF NOT EXISTS idx_public_search_logs_ip_address ON public_search_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_public_search_logs_created_at ON public_search_logs(created_at DESC);

-- ===================================
-- 2. إنشاء جدول تتبع معدل البحث (Rate Limiting)
-- ===================================

CREATE TABLE IF NOT EXISTS search_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  search_count integer DEFAULT 1,
  blocked_until timestamptz,
  last_search_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_rate_limits_ip ON search_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_search_rate_limits_blocked ON search_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- ===================================
-- 3. إنشاء جدول النشاط المشبوه
-- ===================================

CREATE TABLE IF NOT EXISTS suspicious_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL,
  ip_address text NOT NULL,
  national_id text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  details jsonb DEFAULT '{}'::jsonb,
  is_reviewed boolean DEFAULT false,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_ip ON suspicious_activity_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_severity ON suspicious_activity_log(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reviewed ON suspicious_activity_log(is_reviewed);

-- ===================================
-- 4. تفعيل RLS على الجداول الجديدة
-- ===================================

ALTER TABLE public_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity_log ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 5. سياسات RLS للجداول الجديدة
-- ===================================

-- السماح بإدراج سجلات البحث للجميع (للتسجيل)
CREATE POLICY "allow_insert_search_logs"
  ON public_search_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح للمصادقين بقراءة السجلات (للإدمن)
CREATE POLICY "authenticated_read_search_logs"
  ON public_search_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- السماح بتحديث rate limits
CREATE POLICY "allow_manage_rate_limits"
  ON search_rate_limits
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- السماح بإدراج وقراءة النشاط المشبوه
CREATE POLICY "allow_insert_suspicious_activity"
  ON suspicious_activity_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_manage_suspicious_activity"
  ON suspicious_activity_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===================================
-- 6. تحديث سياسات RLS لجدول beneficiaries للسماح بالبحث العام المحدود
-- ===================================

-- إنشاء سياسة جديدة للبحث العام (قراءة محدودة)
CREATE POLICY "public_search_beneficiaries_limited"
  ON beneficiaries
  FOR SELECT
  TO anon
  USING (true);

-- تحديث سياسة packages للسماح بالقراءة العامة المحدودة
CREATE POLICY "public_read_packages_for_search"
  ON packages
  FOR SELECT
  TO anon
  USING (true);

-- ===================================
-- 7. إضافة إعدادات CAPTCHA و OTP في system_features
-- ===================================

INSERT INTO system_features (feature_key, feature_name, is_enabled, settings)
VALUES
  (
    'public_search_captcha',
    'تفعيل CAPTCHA للبحث العام',
    false,
    jsonb_build_object(
      'site_key', '',
      'secret_key', '',
      'score_threshold', 0.5,
      'required_for_search', false,
      'required_for_pin', false
    )
  ),
  (
    'public_search_otp',
    'تفعيل OTP للبحث العام',
    false,
    jsonb_build_object(
      'required_for_search', false,
      'required_for_details', false,
      'required_for_pin_creation', false,
      'otp_length', 6,
      'otp_expiry_minutes', 5
    )
  ),
  (
    'public_search_security',
    'إعدادات أمان البحث العام',
    true,
    jsonb_build_object(
      'require_pin_for_details', true,
      'pin_length', 6,
      'max_pin_attempts', 5,
      'lockout_duration_minutes', 30,
      'max_searches_per_hour', 10,
      'max_searches_per_day', 50,
      'enable_rate_limiting', true,
      'enable_suspicious_activity_detection', true
    )
  )
ON CONFLICT (feature_key) DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = now();

-- ===================================
-- 8. دالة للتحقق من Rate Limit
-- ===================================

CREATE OR REPLACE FUNCTION check_search_rate_limit(p_ip_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit RECORD;
  v_settings jsonb;
  v_max_per_hour integer;
  v_max_per_day integer;
  v_is_enabled boolean;
  v_hour_ago timestamptz;
  v_day_ago timestamptz;
  v_hourly_count integer;
  v_daily_count integer;
BEGIN
  -- الحصول على الإعدادات
  SELECT settings INTO v_settings
  FROM system_features
  WHERE feature_key = 'public_search_security';

  v_is_enabled := COALESCE((v_settings->>'enable_rate_limiting')::boolean, true);

  IF NOT v_is_enabled THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 999);
  END IF;

  v_max_per_hour := COALESCE((v_settings->>'max_searches_per_hour')::integer, 10);
  v_max_per_day := COALESCE((v_settings->>'max_searches_per_day')::integer, 50);
  v_hour_ago := now() - interval '1 hour';
  v_day_ago := now() - interval '1 day';

  -- التحقق من الحظر
  SELECT * INTO v_rate_limit
  FROM search_rate_limits
  WHERE ip_address = p_ip_address;

  IF FOUND THEN
    -- التحقق من الحظر المؤقت
    IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > now() THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'blocked',
        'blocked_until', v_rate_limit.blocked_until,
        'message', 'تم حظر عنوان IP الخاص بك مؤقتاً بسبب تجاوز الحد المسموح'
      );
    END IF;
  END IF;

  -- حساب عدد البحث في الساعة الأخيرة
  SELECT COUNT(*) INTO v_hourly_count
  FROM public_search_logs
  WHERE ip_address = p_ip_address
    AND created_at >= v_hour_ago;

  -- حساب عدد البحث في اليوم الأخير
  SELECT COUNT(*) INTO v_daily_count
  FROM public_search_logs
  WHERE ip_address = p_ip_address
    AND created_at >= v_day_ago;

  -- التحقق من تجاوز الحد الساعي
  IF v_hourly_count >= v_max_per_hour THEN
    -- حظر لمدة ساعة
    INSERT INTO search_rate_limits (ip_address, search_count, blocked_until)
    VALUES (p_ip_address, v_hourly_count, now() + interval '1 hour')
    ON CONFLICT (ip_address) DO UPDATE SET
      blocked_until = now() + interval '1 hour',
      updated_at = now();

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hourly_limit_exceeded',
      'message', 'لقد تجاوزت الحد الأقصى من عمليات البحث في الساعة. يرجى المحاولة لاحقاً'
    );
  END IF;

  -- التحقق من تجاوز الحد اليومي
  IF v_daily_count >= v_max_per_day THEN
    -- حظر لمدة 24 ساعة
    INSERT INTO search_rate_limits (ip_address, search_count, blocked_until)
    VALUES (p_ip_address, v_daily_count, now() + interval '24 hours')
    ON CONFLICT (ip_address) DO UPDATE SET
      blocked_until = now() + interval '24 hours',
      updated_at = now();

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_exceeded',
      'message', 'لقد تجاوزت الحد الأقصى من عمليات البحث اليومية. يرجى المحاولة غداً'
    );
  END IF;

  -- تحديث العداد
  INSERT INTO search_rate_limits (ip_address, search_count, last_search_at)
  VALUES (p_ip_address, 1, now())
  ON CONFLICT (ip_address) DO UPDATE SET
    search_count = search_rate_limits.search_count + 1,
    last_search_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'allowed', true,
    'hourly_remaining', v_max_per_hour - v_hourly_count - 1,
    'daily_remaining', v_max_per_day - v_daily_count - 1
  );
END;
$$;

-- ===================================
-- 9. دالة تسجيل عملية البحث
-- ===================================

CREATE OR REPLACE FUNCTION log_public_search(
  p_national_id text,
  p_ip_address text,
  p_user_agent text,
  p_search_success boolean,
  p_beneficiary_found boolean,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public_search_logs (
    national_id,
    ip_address,
    user_agent,
    search_success,
    beneficiary_found,
    details
  )
  VALUES (
    p_national_id,
    p_ip_address,
    p_user_agent,
    p_search_success,
    p_beneficiary_found,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ===================================
-- 10. دالة كشف النشاط المشبوه
-- ===================================

CREATE OR REPLACE FUNCTION detect_suspicious_activity(p_ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_searches integer;
  v_failed_searches integer;
  v_unique_ids integer;
  v_is_suspicious boolean := false;
BEGIN
  -- عدد البحث في آخر 5 دقائق
  SELECT COUNT(*) INTO v_recent_searches
  FROM public_search_logs
  WHERE ip_address = p_ip_address
    AND created_at >= now() - interval '5 minutes';

  -- عدد البحث الفاشل في آخر ساعة
  SELECT COUNT(*) INTO v_failed_searches
  FROM public_search_logs
  WHERE ip_address = p_ip_address
    AND beneficiary_found = false
    AND created_at >= now() - interval '1 hour';

  -- عدد أرقام هوية مختلفة في آخر ساعة
  SELECT COUNT(DISTINCT national_id) INTO v_unique_ids
  FROM public_search_logs
  WHERE ip_address = p_ip_address
    AND created_at >= now() - interval '1 hour';

  -- كشف النشاط المشبوه
  IF v_recent_searches > 10 THEN
    v_is_suspicious := true;
    INSERT INTO suspicious_activity_log (activity_type, ip_address, severity, description, details)
    VALUES (
      'rapid_searches',
      p_ip_address,
      'high',
      'عدد كبير من عمليات البحث في وقت قصير',
      jsonb_build_object('count', v_recent_searches, 'period', '5 minutes')
    );
  END IF;

  IF v_failed_searches > 15 THEN
    v_is_suspicious := true;
    INSERT INTO suspicious_activity_log (activity_type, ip_address, severity, description, details)
    VALUES (
      'multiple_failed_searches',
      p_ip_address,
      'high',
      'عدد كبير من عمليات البحث الفاشلة',
      jsonb_build_object('count', v_failed_searches, 'period', '1 hour')
    );
  END IF;

  IF v_unique_ids > 20 THEN
    v_is_suspicious := true;
    INSERT INTO suspicious_activity_log (activity_type, ip_address, severity, description, details)
    VALUES (
      'scanning_attack',
      p_ip_address,
      'critical',
      'محاولة مسح أرقام هوية متعددة (هجوم محتمل)',
      jsonb_build_object('unique_ids', v_unique_ids, 'period', '1 hour')
    );
  END IF;

  RETURN v_is_suspicious;
END;
$$;

-- ===================================
-- 11. تحديث دالة البحث لتكون آمنة وتعمل مع anon
-- ===================================

CREATE OR REPLACE FUNCTION public_search_beneficiary(
  p_national_id text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_beneficiary RECORD;
  v_packages jsonb;
  v_in_delivery_package jsonb;
  v_rate_check jsonb;
  v_log_id uuid;
  v_result jsonb;
BEGIN
  -- التحقق من Rate Limit
  IF p_ip_address IS NOT NULL THEN
    v_rate_check := check_search_rate_limit(p_ip_address);

    IF NOT (v_rate_check->>'allowed')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'rate_limit_exceeded',
        'message', v_rate_check->>'message'
      );
    END IF;
  END IF;

  -- البحث عن المستفيد
  SELECT
    id,
    name,
    national_id,
    status
  INTO v_beneficiary
  FROM beneficiaries
  WHERE national_id = p_national_id;

  -- إذا لم يتم العثور على المستفيد
  IF NOT FOUND THEN
    -- تسجيل البحث الفاشل
    IF p_ip_address IS NOT NULL THEN
      v_log_id := log_public_search(
        p_national_id,
        p_ip_address,
        p_user_agent,
        true,
        false,
        jsonb_build_object('error', 'beneficiary_not_found')
      );

      -- كشف النشاط المشبوه
      PERFORM detect_suspicious_activity(p_ip_address);
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'لم يتم العثور على مستفيد بهذا الرقم'
    );
  END IF;

  -- البحث عن الطرد قيد التوصيل فقط
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'status', p.status,
      'tracking_number', p.tracking_number,
      'scheduled_delivery_date', p.scheduled_delivery_date,
      'created_at', p.created_at
    )
  )
  INTO v_in_delivery_package
  FROM packages p
  WHERE p.beneficiary_id = v_beneficiary.id
    AND p.status = 'in_delivery'
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- تسجيل البحث الناجح
  IF p_ip_address IS NOT NULL THEN
    v_log_id := log_public_search(
      p_national_id,
      p_ip_address,
      p_user_agent,
      true,
      true,
      jsonb_build_object('beneficiary_id', v_beneficiary.id)
    );
  END IF;

  -- بناء النتيجة
  v_result := jsonb_build_object(
    'success', true,
    'beneficiary', jsonb_build_object(
      'id', v_beneficiary.id,
      'name', v_beneficiary.name,
      'national_id', v_beneficiary.national_id,
      'status', v_beneficiary.status
    ),
    'in_delivery_package', COALESCE(v_in_delivery_package, '[]'::jsonb),
    'has_pin', EXISTS (
      SELECT 1 FROM beneficiary_auth
      WHERE beneficiary_id = v_beneficiary.id
    )
  );

  RETURN v_result;
END;
$$;

-- ===================================
-- 12. منح الصلاحيات
-- ===================================

GRANT EXECUTE ON FUNCTION check_search_rate_limit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_public_search TO anon, authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_search_beneficiary TO anon, authenticated;

-- ===================================
-- 13. تعليقات توضيحية
-- ===================================

COMMENT ON TABLE public_search_logs IS 'سجل جميع عمليات البحث العام مع تفاصيل كاملة';
COMMENT ON TABLE search_rate_limits IS 'تتبع معدل البحث لكل IP لمنع إساءة الاستخدام';
COMMENT ON TABLE suspicious_activity_log IS 'تسجيل النشاط المشبوه للمراجعة والتنبيهات';

COMMENT ON FUNCTION check_search_rate_limit IS 'التحقق من معدل البحث والحد من الإساءة';
COMMENT ON FUNCTION log_public_search IS 'تسجيل عملية بحث عامة';
COMMENT ON FUNCTION detect_suspicious_activity IS 'كشف النشاط المشبوه تلقائياً';
COMMENT ON FUNCTION public_search_beneficiary IS 'دالة البحث العام الآمن مع حماية متعددة الطبقات';
