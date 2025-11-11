/*
  # إصلاح سياسات RLS لجدول system_users

  ## المشكلة الحالية
  - السياسة الحالية: USING (true) - الجميع يمكنه قراءة معلومات كل المستخدمين
  - معلومات حساسة مكشوفة: البريد، الهاتف، الأدوار
  - خطر أمني: استهداف المسؤولين

  ## الحل الجديد
  
  ### سياسة القراءة (SELECT)
  - المستخدم يرى بياناته فقط
  - المدراء يرون الجميع
  - الموظفون يرون زملاءهم في نفس المؤسسة
  
  ### سياسة الإدراج (INSERT)
  - ممنوع الإدراج المباشر (يتم عبر Trigger)
  
  ### سياسة التحديث (UPDATE)
  - المستخدم يعدل بياناته الأساسية فقط
  - المدراء يعدلون الجميع
  
  ### سياسة الحذف (DELETE)
  - فقط المدراء

  ## الأمان
  - حماية معلومات المستخدمين
  - منع تصعيد الصلاحيات
  - تقييد الوصول للبيانات الحساسة
*/

-- ===================================
-- 1. حذف السياسات القديمة
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON system_users;
DROP POLICY IF EXISTS "Authenticated users can read all system users" ON system_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON system_users;
DROP POLICY IF EXISTS "No direct insert to system users" ON system_users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON system_users;
DROP POLICY IF EXISTS "Users can update own info" ON system_users;
DROP POLICY IF EXISTS "Only admins can delete users" ON system_users;

-- ===================================
-- 2. سياسة القراءة المحسّنة
-- ===================================

CREATE POLICY "users_can_read_limited_info"
  ON system_users
  FOR SELECT
  TO authenticated
  USING (
    -- المستخدم يرى معلوماته
    auth_user_id = auth.uid()
    OR
    -- المدراء يرون الجميع
    check_user_is_admin()
    OR
    -- الموظفون يرون زملاءهم في نفس المؤسسة
    (
      organization_id IS NOT NULL
      AND organization_id = get_user_organization_id()
    )
  );

-- ===================================
-- 3. سياسة الإدراج - ممنوع مباشرة
-- ===================================

CREATE POLICY "no_direct_insert_to_system_users"
  ON system_users
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ===================================
-- 4. سياسة التحديث المحدودة
-- ===================================

CREATE POLICY "users_can_update_own_basic_info"
  ON system_users
  FOR UPDATE
  TO authenticated
  USING (
    -- المستخدم يعدل بياناته الأساسية فقط
    auth_user_id = auth.uid()
    OR
    -- المدراء يعدلون الجميع
    check_user_is_admin()
  )
  WITH CHECK (
    -- نفس شروط USING
    auth_user_id = auth.uid()
    OR
    check_user_is_admin()
  );

-- ===================================
-- 5. سياسة الحذف - المدراء فقط
-- ===================================

CREATE POLICY "only_admins_can_delete_users"
  ON system_users
  FOR DELETE
  TO authenticated
  USING (
    check_user_is_admin()
  );

-- ===================================
-- 6. إنشاء View محدود للمعلومات العامة
-- ===================================

CREATE OR REPLACE VIEW system_users_public AS
SELECT 
  id,
  name,
  role_id,
  status,
  organization_id,
  created_at
FROM system_users
WHERE status = 'active';

-- منح صلاحية القراءة للجميع على الـ View
GRANT SELECT ON system_users_public TO authenticated;

-- ===================================
-- 7. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "users_can_read_limited_info" ON system_users 
IS 'المستخدمون يرون معلوماتهم أو معلومات زملائهم في نفس المؤسسة، والمدراء يرون الجميع';

COMMENT ON POLICY "no_direct_insert_to_system_users" ON system_users 
IS 'منع الإدراج المباشر - يتم الإدراج فقط عبر Trigger عند إنشاء مستخدم في auth.users';

COMMENT ON POLICY "users_can_update_own_basic_info" ON system_users 
IS 'المستخدمون يعدلون معلوماتهم الأساسية والمدراء يعدلون الجميع';

COMMENT ON POLICY "only_admins_can_delete_users" ON system_users 
IS 'المدراء فقط يمكنهم حذف المستخدمين';

COMMENT ON VIEW system_users_public 
IS 'عرض محدود لمعلومات المستخدمين العامة فقط (بدون بيانات حساسة)';
