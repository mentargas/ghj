/*
  # إعداد نظام المصادقة الحقيقي باستخدام Supabase Auth

  ## الوصف
  تحويل النظام من مصادقة وهمية إلى نظام مصادقة احترافي حقيقي

  ## 1. التعديلات على الجداول الموجودة

  ### system_users
  - إضافة حقل auth_user_id للربط مع auth.users
  - تحديث الحقول الموجودة

  ## 2. الدوال الجديدة
  - get_current_user_info: الحصول على معلومات المستخدم الحالي
  - check_user_is_admin: التحقق من أن المستخدم إداري
  - handle_new_user: Trigger لإنشاء سجل في system_users

  ## 3. تحديث سياسات RLS
*/

-- إضافة حقل auth_user_id لجدول system_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_users' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE system_users ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_system_users_auth_user_id ON system_users(auth_user_id);

-- تحديث الحقل associated_type ليقبل null
ALTER TABLE system_users ALTER COLUMN associated_type DROP NOT NULL;

-- دالة للحصول على معلومات المستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user system_users;
  v_role roles;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authenticated',
      'message', 'المستخدم غير مصادق'
    );
  END IF;

  SELECT * INTO v_user
  FROM system_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'لم يتم العثور على معلومات المستخدم'
    );
  END IF;

  SELECT * INTO v_role
  FROM roles
  WHERE id = v_user.role_id;

  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user),
    'role', row_to_json(v_role)
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

-- دالة للتحقق من أن المستخدم إداري
CREATE OR REPLACE FUNCTION check_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM system_users su
    JOIN roles r ON r.id = su.role_id
    WHERE su.auth_user_id = auth.uid()
      AND r.name = 'مدير النظام'
      AND su.status = 'active'
  ) INTO v_is_admin;

  RETURN v_is_admin;

EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Trigger function لإنشاء سجل في system_users عند التسجيل
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_name text;
BEGIN
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;

  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO system_users (
    auth_user_id,
    name,
    email,
    phone,
    role_id,
    status,
    created_at
  ) VALUES (
    NEW.id,
    v_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role_id,
    'active',
    now()
  );

  RETURN NEW;
END;
$$;

-- حذف Trigger القديم إن وجد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إنشاء Trigger جديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- تحديث سياسات RLS لجدول system_users
DROP POLICY IF EXISTS "Enable read access for all users" ON system_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON system_users;

CREATE POLICY "Authenticated users can read all system users"
  ON system_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "No direct insert to system users"
  ON system_users FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Users can update own info"
  ON system_users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Only admins can delete users"
  ON system_users FOR DELETE TO authenticated
  USING (check_user_is_admin());

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_current_user_info TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_user_is_admin TO authenticated, anon;