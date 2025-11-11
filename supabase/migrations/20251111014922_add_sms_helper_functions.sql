/*
  # إضافة دوال SMS المساعدة
  
  ## الدوال المضافة
  1. verify_otp_code - التحقق من صلاحية رمز OTP
  2. cleanup_expired_verification_codes - تنظيف الرموز المنتهية
  3. get_sms_statistics - إحصائيات الرسائل
  4. increment_verification_attempt - زيادة عداد المحاولات
  5. reset_daily_sms_count - إعادة تعيين العداد اليومي
*/

-- دالة للتحقق من صلاحية رمز OTP
CREATE OR REPLACE FUNCTION verify_otp_code(
  p_phone_number text,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verification verification_codes;
  v_result jsonb;
BEGIN
  SELECT * INTO v_verification
  FROM verification_codes
  WHERE phone_number = p_phone_number
    AND code = p_code
    AND is_used = false
    AND is_locked = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_or_expired_code',
      'message', 'رمز التحقق غير صحيح أو منتهي الصلاحية'
    );
  END IF;
  
  IF v_verification.attempt_count >= v_verification.max_attempts THEN
    UPDATE verification_codes
    SET is_locked = true
    WHERE id = v_verification.id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_attempts_reached',
      'message', 'تم تجاوز الحد الأقصى للمحاولات'
    );
  END IF;
  
  UPDATE verification_codes
  SET is_used = true,
      used_at = now()
  WHERE id = v_verification.id;
  
  IF v_verification.beneficiary_id IS NOT NULL THEN
    UPDATE beneficiaries
    SET phone_verified = true,
        last_verification_date = now()
    WHERE id = v_verification.beneficiary_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification.id,
    'beneficiary_id', v_verification.beneficiary_id,
    'message', 'تم التحقق من الرقم بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'system_error',
      'message', SQLERRM
    );
END;
$$;

-- دالة لتنظيف الرموز المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- دالة لحساب إحصائيات الرسائل
CREATE OR REPLACE FUNCTION get_sms_statistics(
  p_start_date timestamptz DEFAULT now() - interval '30 days',
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*),
    'successful', COUNT(*) FILTER (WHERE status = 'sent'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE status = 'sent')::numeric / NULLIF(COUNT(*), 0) * 100), 2
    ),
    'start_date', p_start_date,
    'end_date', p_end_date
  ) INTO v_stats
  FROM sms_logs
  WHERE created_at BETWEEN p_start_date AND p_end_date;
  
  RETURN COALESCE(v_stats, jsonb_build_object(
    'total_sent', 0,
    'successful', 0,
    'failed', 0,
    'pending', 0,
    'success_rate', 0,
    'start_date', p_start_date,
    'end_date', p_end_date
  ));
END;
$$;

-- دالة لزيادة عداد المحاولات
CREATE OR REPLACE FUNCTION increment_verification_attempt(
  p_phone_number text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE verification_codes
  SET attempt_count = attempt_count + 1
  WHERE phone_number = p_phone_number
    AND code = p_code
    AND is_used = false
    AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- دالة لإعادة تعيين العداد اليومي
CREATE OR REPLACE FUNCTION reset_daily_sms_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sms_api_settings
  SET current_daily_count = 0,
      daily_count_reset_date = CURRENT_DATE
  WHERE daily_count_reset_date < CURRENT_DATE;
END;
$$;
