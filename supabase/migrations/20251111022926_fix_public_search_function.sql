/*
  # إصلاح دالة البحث العام

  1. الوصف
    - تصحيح دالة public_search_beneficiary لاستخدام الأعمدة الصحيحة من جدول packages
    - إزالة الإشارة إلى tracking_number و scheduled_delivery_date غير الموجودة
    - استخدام الأعمدة الموجودة فقط: id, name, status, created_at, delivered_at

  2. التغييرات
    - تحديث الدالة لإرجاع البيانات المتاحة فقط
    - الحفاظ على نفس الوظائف الأمنية (Rate Limiting، Logging)
*/

-- ===================================
-- إعادة إنشاء دالة البحث العام مع الأعمدة الصحيحة
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

  -- البحث عن الطرد قيد التوصيل فقط (استخدام الأعمدة الموجودة فعلياً)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'type', p.type,
      'status', p.status,
      'created_at', p.created_at,
      'delivered_at', p.delivered_at
    )
  )
  INTO v_in_delivery_package
  FROM packages p
  WHERE p.beneficiary_id = v_beneficiary.id
    AND p.status = 'in_delivery'
  ORDER BY p.created_at DESC
  LIMIT 5;

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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public_search_beneficiary TO anon, authenticated;

-- تعليق توضيحي
COMMENT ON FUNCTION public_search_beneficiary IS 'دالة البحث العام الآمن - تم تصحيحها لاستخدام الأعمدة الموجودة فعلياً';
