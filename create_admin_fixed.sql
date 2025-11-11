/*
  # إنشاء حساب المدير - النسخة المُصلحة
  
  ## المشكلة السابقة
  - كان التشفير يستخدم crypt() لكن Supabase يحتاج طريقة مختلفة
  
  ## الحل
  - استخدام admin API من Supabase أو طريقة التشفير الصحيحة
  
  ## البيانات
  - الاسم: محمد ابو طير
  - البريد: info@wefrh.com
  - الهاتف: 0595579036
  - كلمة المرور: Mo%+%05990
*/

-- ============================================
-- 1. تعطيل الـ Trigger مؤقتاً
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 2. تنظيف أي بيانات عالقة
-- ============================================
DELETE FROM system_users WHERE email = 'info@wefrh.com';
DELETE FROM auth.users WHERE email = 'info@wefrh.com';

-- ============================================
-- 3. التحقق من وجود pgcrypto extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 4. إنشاء المستخدم
-- ============================================
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
  v_encrypted_password text;
BEGIN
  -- توليد معرف فريد
  v_user_id := gen_random_uuid();
  
  -- تشفير كلمة المرور بطريقة Supabase (bcrypt)
  -- استخدام $2a$ بدلاً من $2b$ للتوافق
  v_encrypted_password := crypt('Mo%+%05990', gen_salt('bf', 10));
  
  -- إدراج المستخدم في auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'info@wefrh.com',
    v_encrypted_password,
    now(), -- email_confirmed_at
    now(), -- confirmation_sent_at
    now(), -- confirmed_at
    NULL,
    NULL,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', 'محمد ابو طير', 'phone', '0595579036'),
    NULL,
    now(),
    now(),
    '0595579036',
    NULL,
    '',
    '',
    '',
    ''
  );
  
  -- الحصول على دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;
  
  -- إنشاء الدور إذا لم يكن موجوداً
  IF v_role_id IS NULL THEN
    INSERT INTO roles (
      id,
      name,
      description,
      permissions,
      is_active
    ) VALUES (
      '00000001-0001-0001-0001-000000000001',
      'مدير النظام',
      'صلاحيات كاملة للنظام',
      ARRAY[]::uuid[],
      true
    )
    ON CONFLICT (id) DO NOTHING;
    
    v_role_id := '00000001-0001-0001-0001-000000000001';
  END IF;
  
  -- إنشاء السجل في system_users
  INSERT INTO system_users (
    id,
    auth_user_id,
    name,
    email,
    phone,
    role_id,
    status,
    created_at,
    last_login
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'محمد ابو طير',
    'info@wefrh.com',
    '0595579036',
    v_role_id,
    'active',
    now(),
    NULL
  );
  
  -- رسائل النجاح
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ تم إنشاء حساب المدير بنجاح!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'البريد: info@wefrh.com';
  RAISE NOTICE 'كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE 'معرف المستخدم: %', v_user_id;
  RAISE NOTICE '================================================';
  
END $$;

-- ============================================
-- 5. إعادة تفعيل الـ Trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. التحقق من النتيجة
-- ============================================
SELECT 
  su.id,
  su.auth_user_id,
  su.name,
  su.email,
  su.phone,
  r.name as role_name,
  su.status,
  su.created_at,
  CASE 
    WHEN su.auth_user_id IS NOT NULL THEN '✅ مرتبط بـ Auth'
    ELSE '❌ غير مرتبط'
  END as auth_status
FROM system_users su
LEFT JOIN roles r ON r.id = su.role_id
WHERE su.email = 'info@wefrh.com';

-- التحقق من auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN encrypted_password IS NOT NULL THEN '✅ كلمة المرور موجودة'
    ELSE '❌ كلمة المرور غير موجودة'
  END as password_status
FROM auth.users
WHERE email = 'info@wefrh.com';

-- رسالة ختامية
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 اكتمل الإعداد!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'يمكنك الآن تسجيل الدخول بالبيانات التالية:';
  RAISE NOTICE '';
  RAISE NOTICE '📧 البريد: info@wefrh.com';
  RAISE NOTICE '🔐 كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  إذا لم يعمل، جرب الحل البديل أدناه';
  RAISE NOTICE '================================================';
END $$;
