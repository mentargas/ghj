/*
  # إنشاء دوال مساعدة لـ Row Level Security

  ## الوصف
  دوال مساعدة للتحقق من الصلاحيات والأدوار بشكل آمن ومحسّن

  ## الدوال الجديدة

  ### 1. get_user_role()
  - الحصول على دور المستخدم الحالي من system_users
  - إرجاع اسم الدور أو null

  ### 2. check_user_permission(permission_name)
  - فحص إذا كان المستخدم الحالي لديه صلاحية محددة
  - إرجاع boolean

  ### 3. user_belongs_to_organization(org_id)
  - فحص إذا كان المستخدم ينتمي لمؤسسة محددة
  - إرجاع boolean

  ### 4. get_user_organization_id()
  - الحصول على معرف مؤسسة المستخدم الحالي
  - إرجاع uuid أو null

  ### 5. can_manage_package(package_id)
  - فحص صلاحية إدارة طرد محدد
  - إرجاع boolean

  ### 6. get_user_type()
  - تحديد نوع المستخدم
  - إرجاع text

  ## الأمان
  - جميع الدوال SECURITY DEFINER
  - محسنة للأداء
  - تستخدم auth.uid() للتحقق
*/

-- ===================================
-- 1. دالة للحصول على دور المستخدم الحالي
-- ===================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT r.name INTO v_role_name
  FROM system_users su
  JOIN roles r ON r.id = su.role_id
  WHERE su.auth_user_id = auth.uid()
    AND su.status = 'active'
    AND r.is_active = true
  LIMIT 1;

  RETURN v_role_name;

EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ===================================
-- 2. دالة للتحقق من صلاحية محددة
-- ===================================

CREATE OR REPLACE FUNCTION check_user_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM system_users su
    JOIN roles r ON r.id = su.role_id
    JOIN permissions p ON p.id = ANY(r.permissions)
    WHERE su.auth_user_id = auth.uid()
      AND su.status = 'active'
      AND r.is_active = true
      AND p.name = permission_name
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);

EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ===================================
-- 3. دالة للتحقق من انتماء المستخدم لمؤسسة
-- ===================================

CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_belongs boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF check_user_is_admin() THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM system_users su
    WHERE su.auth_user_id = auth.uid()
      AND su.organization_id = org_id
      AND su.status = 'active'
  ) INTO v_belongs;

  RETURN COALESCE(v_belongs, false);

EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ===================================
-- 4. دالة للحصول على مؤسسة المستخدم
-- ===================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT su.organization_id INTO v_org_id
  FROM system_users su
  WHERE su.auth_user_id = auth.uid()
    AND su.status = 'active'
  LIMIT 1;

  RETURN v_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ===================================
-- 5. دالة للتحقق من صلاحية إدارة طرد
-- ===================================

CREATE OR REPLACE FUNCTION can_manage_package(package_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_package_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF check_user_is_admin() THEN
    RETURN true;
  END IF;

  SELECT p.organization_id INTO v_package_org_id
  FROM packages p
  WHERE p.id = can_manage_package.package_id;

  IF v_package_org_id IS NOT NULL THEN
    RETURN user_belongs_to_organization(v_package_org_id);
  END IF;

  RETURN false;

EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ===================================
-- 6. دالة للتحقق من نوع المستخدم
-- ===================================

CREATE OR REPLACE FUNCTION get_user_type()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anonymous';
  END IF;

  IF EXISTS (SELECT 1 FROM system_users WHERE auth_user_id = auth.uid()) THEN
    RETURN 'staff';
  END IF;

  RETURN 'unknown';

EXCEPTION
  WHEN OTHERS THEN
    RETURN 'unknown';
END;
$$;

-- ===================================
-- 7. إضافة عمود organization_id لجدول system_users إذا لم يكن موجوداً
-- ===================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE system_users ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_system_users_organization_id ON system_users(organization_id);
  END IF;
END $$;

-- ===================================
-- 8. منح الصلاحيات
-- ===================================

GRANT EXECUTE ON FUNCTION get_user_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_belongs_to_organization TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_organization_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_manage_package TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_type TO authenticated, anon;

-- ===================================
-- 9. تعليقات توضيحية
-- ===================================

COMMENT ON FUNCTION get_user_role IS 'الحصول على دور المستخدم الحالي من system_users';
COMMENT ON FUNCTION check_user_permission IS 'التحقق من صلاحية محددة للمستخدم الحالي';
COMMENT ON FUNCTION user_belongs_to_organization IS 'فحص انتماء المستخدم لمؤسسة محددة';
COMMENT ON FUNCTION get_user_organization_id IS 'الحصول على معرف مؤسسة المستخدم الحالي';
COMMENT ON FUNCTION can_manage_package IS 'فحص صلاحية إدارة طرد محدد';
COMMENT ON FUNCTION get_user_type IS 'تحديد نوع المستخدم (staff, anonymous, unknown)';
