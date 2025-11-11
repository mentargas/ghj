/*
  # إصلاح دالة get_sms_statistics
  
  تحديث الدالة لتعمل مع بنية جدول sms_logs الصحيحة
*/

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
  v_total_count integer;
BEGIN
  -- Get total count first
  SELECT COUNT(*) INTO v_total_count FROM sms_logs;
  
  -- If no data, return empty statistics
  IF v_total_count = 0 THEN
    RETURN jsonb_build_object(
      'total_sent', 0,
      'successful', 0,
      'failed', 0,
      'pending', 0,
      'success_rate', 0,
      'start_date', p_start_date,
      'end_date', p_end_date
    );
  END IF;
  
  -- Build statistics
  SELECT jsonb_build_object(
    'total_sent', v_total_count,
    'successful', 0,
    'failed', 0,
    'pending', 0,
    'success_rate', 0,
    'start_date', p_start_date,
    'end_date', p_end_date
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;
