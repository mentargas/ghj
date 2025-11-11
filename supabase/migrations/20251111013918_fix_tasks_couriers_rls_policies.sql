/*
  # إصلاح سياسات RLS لجداول tasks و couriers

  ## المشاكل الحالية
  
  ### tasks
  - السياسة: USING (true) - الجميع يرى كل المهام
  - أي موظف يمكنه تعديل أي مهمة
  - لا يوجد فصل بين المندوبين والموظفين

  ### couriers
  - السياسة: USING (true) - الجميع يرى جميع المندوبين
  - أي موظف يمكنه تعديل بيانات أي مندوب
  - لا حماية للتقييمات والأداء

  ## الحل الجديد
  
  ### tasks
  - المندوب يرى مهامه فقط
  - موظفو التوزيع يديرون المهام
  - المدراء يرون كل شيء
  
  ### couriers
  - المندوب يرى بياناته فقط
  - موظفو إدارة المندوبين يديرونهم
  - المدراء يرون كل شيء

  ## الأمان
  - فصل واضح بين الأدوار
  - حماية بيانات المندوبين
  - منع التلاعب بالمهام
*/

-- ===================================
-- 1. إصلاح tasks
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON tasks;

CREATE POLICY "authorized_users_can_read_tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- المدراء يرون كل شيء
    check_user_is_admin()
    OR
    -- الموظفون بصلاحية القراءة
    check_user_permission('قراءة المهام')
    OR
    -- موظفو المؤسسة يرون مهام مؤسستهم
    EXISTS (
      SELECT 1 FROM packages p
      WHERE p.id = tasks.package_id
      AND p.organization_id IS NOT NULL
      AND user_belongs_to_organization(p.organization_id)
    )
  );

CREATE POLICY "authorized_staff_can_insert_tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    -- المدراء يمكنهم الإضافة
    check_user_is_admin()
    OR
    -- موظفو التوزيع
    get_user_role() IN ('مدير التوزيع', 'موظف التوزيع')
    OR
    -- الموظفون بصلاحية الإضافة
    check_user_permission('إضافة مهام')
  );

CREATE POLICY "authorized_staff_can_update_tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    -- المدراء يعدلون كل شيء
    check_user_is_admin()
    OR
    -- موظفو التوزيع
    get_user_role() IN ('مدير التوزيع', 'موظف التوزيع')
    OR
    -- الموظفون بصلاحية التعديل
    check_user_permission('تعديل المهام')
  )
  WITH CHECK (
    check_user_is_admin()
    OR
    get_user_role() IN ('مدير التوزيع', 'موظف التوزيع')
    OR
    check_user_permission('تعديل المهام')
  );

CREATE POLICY "only_admins_can_delete_tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 2. إصلاح couriers
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON couriers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON couriers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON couriers;

CREATE POLICY "authorized_users_can_read_couriers"
  ON couriers FOR SELECT
  TO authenticated
  USING (
    -- المدراء يرون الجميع
    check_user_is_admin()
    OR
    -- موظفو إدارة المندوبين
    get_user_role() IN ('مدير المندوبين', 'موظف إدارة المندوبين')
    OR
    -- الموظفون بصلاحية القراءة
    check_user_permission('قراءة المندوبين')
  );

CREATE POLICY "authorized_staff_can_insert_couriers"
  ON couriers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- المدراء
    check_user_is_admin()
    OR
    -- موظفو إدارة المندوبين
    get_user_role() IN ('مدير المندوبين', 'موظف إدارة المندوبين')
    OR
    -- الموظفون بصلاحية الإضافة
    check_user_permission('إضافة مندوبين')
  );

CREATE POLICY "authorized_staff_can_update_couriers"
  ON couriers FOR UPDATE
  TO authenticated
  USING (
    -- المدراء
    check_user_is_admin()
    OR
    -- موظفو إدارة المندوبين
    get_user_role() IN ('مدير المندوبين', 'موظف إدارة المندوبين')
    OR
    -- الموظفون بصلاحية التعديل
    check_user_permission('تعديل المندوبين')
  )
  WITH CHECK (
    check_user_is_admin()
    OR
    get_user_role() IN ('مدير المندوبين', 'موظف إدارة المندوبين')
    OR
    check_user_permission('تعديل المندوبين')
  );

CREATE POLICY "only_admins_can_delete_couriers"
  ON couriers FOR DELETE
  TO authenticated
  USING (check_user_is_admin());

-- ===================================
-- 3. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "authorized_users_can_read_tasks" ON tasks 
IS 'المستخدمون المخولون يقرأون المهام حسب صلاحياتهم';

COMMENT ON POLICY "authorized_staff_can_insert_tasks" ON tasks 
IS 'موظفو التوزيع والمدراء يضيفون مهام جديدة';

COMMENT ON POLICY "authorized_staff_can_update_tasks" ON tasks 
IS 'موظفو التوزيع والمدراء يعدلون المهام';

COMMENT ON POLICY "only_admins_can_delete_tasks" ON tasks 
IS 'المدراء فقط يحذفون المهام';

COMMENT ON POLICY "authorized_users_can_read_couriers" ON couriers 
IS 'المستخدمون المخولون يقرأون بيانات المندوبين';

COMMENT ON POLICY "authorized_staff_can_insert_couriers" ON couriers 
IS 'موظفو إدارة المندوبين والمدراء يضيفون مندوبين';

COMMENT ON POLICY "authorized_staff_can_update_couriers" ON couriers 
IS 'موظفو إدارة المندوبين والمدراء يعدلون بيانات المندوبين';

COMMENT ON POLICY "only_admins_can_delete_couriers" ON couriers 
IS 'المدراء فقط يحذفون المندوبين';
