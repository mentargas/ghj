/*
  # إصلاح سياسات RLS للجداول المتبقية

  ## الجداول المستهدفة
  - organizations: المؤسسات
  - families: العائلات
  - alerts: التنبيهات
  - activity_log: سجل النشاطات
  - package_templates: قوالب الطرود
  
  ## التحسينات
  - تقييد الوصول حسب المؤسسة
  - حماية البيانات الحساسة
  - فصل الصلاحيات بوضوح
  - منع التلاعب بالبيانات
*/

-- ===================================
-- 1. إصلاح organizations
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON organizations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON organizations;

CREATE POLICY "authenticated_users_can_read_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "only_admins_can_insert_organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (check_user_is_admin());

CREATE POLICY "authorized_users_can_update_organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    check_user_is_admin()
    OR
    user_belongs_to_organization(id)
  )
  WITH CHECK (
    check_user_is_admin()
    OR
    user_belongs_to_organization(id)
  );

CREATE POLICY "only_admins_can_delete_organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 2. إصلاح families
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON families;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON families;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON families;

CREATE POLICY "authorized_users_can_read_families"
  ON families FOR SELECT
  TO authenticated
  USING (
    check_user_is_admin()
    OR
    check_user_permission('قراءة العائلات')
  );

CREATE POLICY "authorized_staff_can_insert_families"
  ON families FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_is_admin()
    OR
    get_user_role() IN ('موظف المؤسسة', 'مدخل بيانات')
    OR
    check_user_permission('إضافة عائلات')
  );

CREATE POLICY "authorized_staff_can_update_families"
  ON families FOR UPDATE
  TO authenticated
  USING (
    check_user_is_admin()
    OR
    check_user_permission('تعديل العائلات')
  )
  WITH CHECK (
    check_user_is_admin()
    OR
    check_user_permission('تعديل العائلات')
  );

CREATE POLICY "only_admins_can_delete_families"
  ON families FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 3. إصلاح alerts
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON alerts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON alerts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON alerts;

CREATE POLICY "authenticated_users_can_read_alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_can_insert_alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "only_admins_can_delete_alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 4. إصلاح activity_log (القراءة فقط للمدراء)
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON activity_log;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activity_log;
DROP POLICY IF EXISTS "السماح بقراءة السجلات للجميع" ON activity_log;
DROP POLICY IF EXISTS "السماح بالإدخال للمستخدمين المصادقين" ON activity_log;
DROP POLICY IF EXISTS "السماح للزوار بتسجيل الأنشطة العامة" ON activity_log;
DROP POLICY IF EXISTS "منع التعديل والحذف" ON activity_log;
DROP POLICY IF EXISTS "منع الحذف" ON activity_log;

CREATE POLICY "admins_can_read_activity_log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (check_user_is_admin());

CREATE POLICY "system_can_insert_activity_log"
  ON activity_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "prevent_update_activity_log"
  ON activity_log FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "prevent_delete_activity_log"
  ON activity_log FOR DELETE
  TO authenticated
  USING (false);

-- ===================================
-- 5. إصلاح package_templates
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON package_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON package_templates;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON package_templates;

CREATE POLICY "authenticated_users_can_read_package_templates"
  ON package_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authorized_staff_can_insert_package_templates"
  ON package_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_is_admin()
    OR
    get_user_role() IN ('مدير المؤسسة', 'موظف المؤسسة')
    OR
    check_user_permission('إدارة قوالب الطرود')
  );

CREATE POLICY "authorized_staff_can_update_package_templates"
  ON package_templates FOR UPDATE
  TO authenticated
  USING (
    check_user_is_admin()
    OR
    check_user_permission('إدارة قوالب الطرود')
  )
  WITH CHECK (
    check_user_is_admin()
    OR
    check_user_permission('إدارة قوالب الطرود')
  );

CREATE POLICY "only_admins_can_delete_package_templates"
  ON package_templates FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 6. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "authenticated_users_can_read_organizations" ON organizations 
IS 'جميع المستخدمين المصادق عليهم يمكنهم قراءة المؤسسات';

COMMENT ON POLICY "only_admins_can_insert_organizations" ON organizations 
IS 'المدراء فقط يمكنهم إضافة مؤسسات جديدة';

COMMENT ON POLICY "authorized_users_can_update_organizations" ON organizations 
IS 'المدراء وموظفو المؤسسة يعدلون بيانات مؤسستهم';

COMMENT ON POLICY "only_admins_can_delete_organizations" ON organizations 
IS 'المدراء فقط يحذفون المؤسسات';

COMMENT ON POLICY "authorized_users_can_read_families" ON families 
IS 'المستخدمون المخولون يقرأون بيانات العائلات';

COMMENT ON POLICY "authorized_staff_can_insert_families" ON families 
IS 'الموظفون المخولون يضيفون عائلات جديدة';

COMMENT ON POLICY "authorized_staff_can_update_families" ON families 
IS 'الموظفون المخولون يعدلون بيانات العائلات';

COMMENT ON POLICY "only_admins_can_delete_families" ON families 
IS 'المدراء فقط يحذفون العائلات';

COMMENT ON POLICY "authenticated_users_can_read_alerts" ON alerts 
IS 'جميع المستخدمين المصادق عليهم يقرأون التنبيهات';

COMMENT ON POLICY "system_can_insert_alerts" ON alerts 
IS 'النظام ينشئ تنبيهات تلقائية';

COMMENT ON POLICY "authenticated_users_can_update_alerts" ON alerts 
IS 'المستخدمون المصادق عليهم يعدلون حالة التنبيهات (قراءة/عدم قراءة)';

COMMENT ON POLICY "only_admins_can_delete_alerts" ON alerts 
IS 'المدراء فقط يحذفون التنبيهات';

COMMENT ON POLICY "admins_can_read_activity_log" ON activity_log 
IS 'المدراء فقط يمكنهم قراءة سجل النشاطات';

COMMENT ON POLICY "system_can_insert_activity_log" ON activity_log 
IS 'النظام يسجل جميع النشاطات';

COMMENT ON POLICY "prevent_update_activity_log" ON activity_log 
IS 'منع تعديل سجل النشاطات (للحفاظ على سلامة البيانات)';

COMMENT ON POLICY "prevent_delete_activity_log" ON activity_log 
IS 'منع حذف سجل النشاطات';

COMMENT ON POLICY "authenticated_users_can_read_package_templates" ON package_templates 
IS 'جميع المستخدمين يقرأون قوالب الطرود';

COMMENT ON POLICY "authorized_staff_can_insert_package_templates" ON package_templates 
IS 'الموظفون المخولون يضيفون قوالب جديدة';

COMMENT ON POLICY "authorized_staff_can_update_package_templates" ON package_templates 
IS 'الموظفون المخولون يعدلون القوالب';

COMMENT ON POLICY "only_admins_can_delete_package_templates" ON package_templates 
IS 'المدراء فقط يحذفون القوالب';
