/*
  # إصلاح سياسات RLS لجدول beneficiaries

  ## المشكلة الحالية
  - السياسة الحالية: USING (true) - أي شخص يمكنه القراءة
  - بيانات حساسة جداً (رقم وطني، هاتف، عنوان، حالات طبية)
  - لا يوجد تحكم بالوصول

  ## الحل الجديد
  
  ### سياسة القراءة (SELECT)
  - فقط المستخدمون المصادق عليهم
  - المدراء يرون الجميع
  - موظفو المؤسسة يرون مستفيدي مؤسستهم فقط
  
  ### سياسة الإدراج (INSERT)
  - فقط الموظفون المخولون
  - الأدوار: مدير النظام، موظف المؤسسة، مدخل بيانات
  
  ### سياسة التحديث (UPDATE)
  - نفس شروط القراءة
  - المدراء وموظفو المؤسسة
  
  ### سياسة الحذف (DELETE)
  - فقط المدراء
  - استخدام soft delete مفضل

  ## الأمان
  - تقييد صارم للوصول
  - فحص الأدوار والصلاحيات
  - حماية البيانات الحساسة
*/

-- ===================================
-- 1. حذف السياسات القديمة غير الآمنة
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON beneficiaries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON beneficiaries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON beneficiaries;

-- ===================================
-- 2. سياسة القراءة المحسّنة
-- ===================================

CREATE POLICY "authenticated_users_can_read_beneficiaries"
  ON beneficiaries
  FOR SELECT
  TO authenticated
  USING (
    -- المدراء يرون الجميع
    check_user_is_admin()
    OR
    -- موظفو المؤسسة يرون مستفيدي مؤسستهم فقط
    (
      organization_id IS NOT NULL 
      AND user_belongs_to_organization(organization_id)
    )
    OR
    -- الموظفون بصلاحية "read" يمكنهم القراءة
    check_user_permission('قراءة المستفيدين')
  );

-- ===================================
-- 3. سياسة الإدراج المحسّنة
-- ===================================

CREATE POLICY "authorized_staff_can_insert_beneficiaries"
  ON beneficiaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- المدراء يمكنهم الإدراج
    check_user_is_admin()
    OR
    -- الموظفون بأدوار محددة
    get_user_role() IN ('موظف المؤسسة', 'مدخل بيانات')
    OR
    -- الموظفون بصلاحية "write"
    check_user_permission('إضافة مستفيدين')
  );

-- ===================================
-- 4. سياسة التحديث المحسّنة
-- ===================================

CREATE POLICY "authorized_staff_can_update_beneficiaries"
  ON beneficiaries
  FOR UPDATE
  TO authenticated
  USING (
    -- المدراء يمكنهم التحديث
    check_user_is_admin()
    OR
    -- موظفو المؤسسة يحدثون مستفيدي مؤسستهم
    (
      organization_id IS NOT NULL 
      AND user_belongs_to_organization(organization_id)
    )
    OR
    -- الموظفون بصلاحية "write"
    check_user_permission('تعديل المستفيدين')
  )
  WITH CHECK (
    -- نفس شروط USING
    check_user_is_admin()
    OR
    (
      organization_id IS NOT NULL 
      AND user_belongs_to_organization(organization_id)
    )
    OR
    check_user_permission('تعديل المستفيدين')
  );

-- ===================================
-- 5. سياسة الحذف المقيدة
-- ===================================

CREATE POLICY "only_admins_can_delete_beneficiaries"
  ON beneficiaries
  FOR DELETE
  TO authenticated
  USING (
    -- فقط المدراء
    check_user_is_admin()
  );

-- ===================================
-- 6. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "authenticated_users_can_read_beneficiaries" ON beneficiaries 
IS 'المستخدمون المصادق عليهم يمكنهم قراءة المستفيدين حسب صلاحياتهم ومؤسساتهم';

COMMENT ON POLICY "authorized_staff_can_insert_beneficiaries" ON beneficiaries 
IS 'الموظفون المخولون فقط يمكنهم إضافة مستفيدين جدد';

COMMENT ON POLICY "authorized_staff_can_update_beneficiaries" ON beneficiaries 
IS 'الموظفون المخولون يمكنهم تحديث بيانات المستفيدين حسب صلاحياتهم';

COMMENT ON POLICY "only_admins_can_delete_beneficiaries" ON beneficiaries 
IS 'المدراء فقط يمكنهم حذف المستفيدين';
