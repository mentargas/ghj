/*
  # إنشاء حساب المدير الأول - محمد أبو طير
  
  ## البيانات
  - الاسم: محمد ابو طير
  - البريد الإلكتروني: info@wefrh.com
  - رقم الهاتف: 0595579036
  - كلمة المرور: Mo%+%05990
  
  ## الخطوات
  1. تعطيل الـ Trigger مؤقتاً
  2. تنظيف أي بيانات عالقة
  3. إنشاء المستخدم في Supabase Auth
  4. إنشاء السجل في system_users
  5. إعادة تفعيل الـ Trigger
*/

-- ============================================
-- 1. تعطيل الـ Trigger مؤقتاً
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 2. تنظيف أي بيانات عالقة
-- ============================================

-- حذف من system_users إن وجد
DELETE FROM system_users WHERE email = 'info@wefrh.com';

-- حذف من auth.users إن وجد
DELETE FROM auth.users WHERE email = 'info@wefrh.com';

-- ============================================
-- 3. إنشاء المستخدم في Supabase Auth
-- ============================================

-- إنشاء المستخدم باستخدام دالة Supabase الداخلية
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
  v_encrypted_password text;
BEGIN
  -- توليد معرف فريد للمستخدم
  v_user_id := gen_random_uuid();
  
  -- تشفير كلمة المرور
  v_encrypted_password := crypt('Mo%+%05990', gen_salt('bf'));
  
  -- إدراج المستخدم في auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
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
    now(),
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'name', 'محمد ابو طير',
      'phone', '0595579036'
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- الحصول على معرف دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;
  
  -- التحقق من وجود الدور
  IF v_role_id IS NULL THEN
    -- إنشاء دور المدير إن لم يكن موجوداً
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
  
  -- رسالة نجاح
  RAISE NOTICE 'تم إنشاء حساب المدير بنجاح!';
  RAISE NOTICE 'البريد الإلكتروني: info@wefrh.com';
  RAISE NOTICE 'كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE 'يمكنك الآن تسجيل الدخول.';
  
END $$;

-- ============================================
-- 4. إعادة إنشاء الـ Trigger
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. التحقق من النتيجة
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
    WHEN su.auth_user_id IS NOT NULL THEN 'مرتبط بـ Auth'
    ELSE 'غير مرتبط'
  END as auth_status
FROM system_users su
LEFT JOIN roles r ON r.id = su.role_id
WHERE su.email = 'info@wefrh.com';

-- رسالة تأكيدية
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'تم الانتهاء من إنشاء حساب المدير!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'الاسم: محمد ابو طير';
  RAISE NOTICE 'البريد: info@wefrh.com';
  RAISE NOTICE 'الهاتف: 0595579036';
  RAISE NOTICE 'كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'يمكنك الآن تسجيل الدخول إلى النظام';
  RAISE NOTICE '================================================';
END $$;
