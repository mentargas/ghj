
/*
  # إنشاء حساب المدير - النسخة المُصلحة
  
  ## البيانات
  - الاسم: محمد ابو طير  
  - البريد: info@wefrh.com
  - الهاتف: 0595579036
  - كلمة المرور: Mo%+%05990
*/

-- تعطيل الـ Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- التأكد من pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إنشاء الحساب
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
  v_encrypted_password text;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt('Mo%+%05990', gen_salt('bf'));
  
  -- إدراج في auth.users (بدون الحقول المولدة)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'info@wefrh.com',
    v_encrypted_password,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', 'محمد ابو طير', 'phone', '0595579036'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- الحصول على دور المدير
  SELECT id INTO v_role_id FROM roles WHERE name = 'مدير النظام' LIMIT 1;
  
  -- إنشاء في system_users
  INSERT INTO system_users (
    id, auth_user_id, name, email, phone, role_id, status, created_at
  ) VALUES (
    gen_random_uuid(), v_user_id, 'محمد ابو طير', 'info@wefrh.com', 
    '0595579036', v_role_id, 'active', now()
  );
  
  RAISE NOTICE '✅ تم إنشاء الحساب بنجاح!';
END $$;

-- إعادة الـ Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
