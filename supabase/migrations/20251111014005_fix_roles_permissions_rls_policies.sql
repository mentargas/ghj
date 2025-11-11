/*
  # إصلاح سياسات RLS لجداول roles و permissions

  ## المشاكل الحالية
  
  ### roles
  - السياسة: USING (true) WITH CHECK (true)
  - أي موظف يمكنه تعديل الأدوار
  - خطر: منح نفسه صلاحيات إدارية

  ### permissions
  - السياسة: USING (true) WITH CHECK (true)
  - أي موظف يمكنه تعديل الصلاحيات
  - خطر: تصعيد الصلاحيات

  ## الحل الجديد
  
  ### roles
  - القراءة: جميع المستخدمين المصادق عليهم
  - الإدراج: المدراء فقط
  - التحديث: المدراء فقط
  - الحذف: المدراء فقط + منع حذف الأدوار الأساسية

  ### permissions
  - القراءة: جميع المستخدمين المصادق عليهم
  - الإدراج: المدراء فقط
  - التحديث: المدراء فقط
  - الحذف: المدراء فقط + منع حذف الصلاحيات الأساسية

  ## الأمان
  - منع تصعيد الصلاحيات
  - حماية الأدوار الأساسية
  - تسجيل جميع التغييرات
*/

-- ===================================
-- 1. إصلاح roles
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON roles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON roles;

-- القراءة: جميع المستخدمين المصادق عليهم (للعرض فقط)
CREATE POLICY "authenticated_users_can_read_roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- الإدراج: المدراء فقط
CREATE POLICY "only_admins_can_insert_roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (check_user_is_admin());

-- التحديث: المدراء فقط
CREATE POLICY "only_admins_can_update_roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (check_user_is_admin())
  WITH CHECK (check_user_is_admin());

-- الحذف: المدراء فقط، مع منع حذف الأدوار الأساسية
CREATE POLICY "admins_can_delete_non_system_roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    check_user_is_admin()
    AND name NOT IN ('مدير النظام', 'موظف المؤسسة', 'مدخل بيانات')
  );

-- ===================================
-- 2. إصلاح permissions
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON permissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON permissions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON permissions;

-- القراءة: جميع المستخدمين المصادق عليهم
CREATE POLICY "authenticated_users_can_read_permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- الإدراج: المدراء فقط
CREATE POLICY "only_admins_can_insert_permissions"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (check_user_is_admin());

-- التحديث: المدراء فقط
CREATE POLICY "only_admins_can_update_permissions"
  ON permissions FOR UPDATE
  TO authenticated
  USING (check_user_is_admin())
  WITH CHECK (check_user_is_admin());

-- الحذف: المدراء فقط، مع منع حذف الصلاحيات الأساسية
CREATE POLICY "admins_can_delete_non_critical_permissions"
  ON permissions FOR DELETE
  TO authenticated
  USING (
    check_user_is_admin()
    AND category != 'critical'
  );

-- ===================================
-- 3. إنشاء Trigger لتسجيل تغييرات الأدوار
-- ===================================

CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name text;
BEGIN
  -- الحصول على اسم المستخدم الحالي
  SELECT name INTO v_user_name
  FROM system_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- تسجيل التغيير
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (
      action,
      user_name,
      role,
      type,
      details,
      source
    ) VALUES (
      'تعديل دور: ' || NEW.name,
      COALESCE(v_user_name, 'system'),
      'مدير النظام',
      'update',
      format('تم تعديل الدور من: %s إلى: %s', OLD.name, NEW.name),
      'system'
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (
      action,
      user_name,
      role,
      type,
      details,
      source
    ) VALUES (
      'إضافة دور جديد: ' || NEW.name,
      COALESCE(v_user_name, 'system'),
      'مدير النظام',
      'create',
      format('تم إضافة دور جديد: %s', NEW.name),
      'system'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (
      action,
      user_name,
      role,
      type,
      details,
      source
    ) VALUES (
      'حذف دور: ' || OLD.name,
      COALESCE(v_user_name, 'system'),
      'مدير النظام',
      'delete',
      format('تم حذف الدور: %s', OLD.name),
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء Triggers
DROP TRIGGER IF EXISTS trigger_log_role_changes ON roles;
CREATE TRIGGER trigger_log_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_changes();

-- ===================================
-- 4. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "authenticated_users_can_read_roles" ON roles 
IS 'جميع المستخدمين المصادق عليهم يمكنهم قراءة الأدوار (للعرض فقط)';

COMMENT ON POLICY "only_admins_can_insert_roles" ON roles 
IS 'المدراء فقط يمكنهم إضافة أدوار جديدة';

COMMENT ON POLICY "only_admins_can_update_roles" ON roles 
IS 'المدراء فقط يمكنهم تعديل الأدوار';

COMMENT ON POLICY "admins_can_delete_non_system_roles" ON roles 
IS 'المدراء يحذفون الأدوار ما عدا الأدوار الأساسية للنظام';

COMMENT ON POLICY "authenticated_users_can_read_permissions" ON permissions 
IS 'جميع المستخدمين المصادق عليهم يمكنهم قراءة الصلاحيات';

COMMENT ON POLICY "only_admins_can_insert_permissions" ON permissions 
IS 'المدراء فقط يمكنهم إضافة صلاحيات جديدة';

COMMENT ON POLICY "only_admins_can_update_permissions" ON permissions 
IS 'المدراء فقط يمكنهم تعديل الصلاحيات';

COMMENT ON POLICY "admins_can_delete_non_critical_permissions" ON permissions 
IS 'المدراء يحذفون الصلاحيات غير الحرجة فقط';

COMMENT ON FUNCTION log_role_changes 
IS 'تسجيل جميع التغييرات على الأدوار في activity_log';
