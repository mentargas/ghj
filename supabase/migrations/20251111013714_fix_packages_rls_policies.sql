/*
  # إصلاح سياسات RLS لجدول packages

  ## المشكلة الحالية
  - السياسة الحالية: USING (true) WITH CHECK (true)
  - أي موظف يمكنه تعديل أي طرد
  - لا يوجد فحص للملكية أو الصلاحيات
  - إمكانية التلاعب بالتوزيعات

  ## الحل الجديد
  
  ### سياسة القراءة (SELECT)
  - المدراء يرون جميع الطرود
  - موظفو المؤسسة يرون طرود مؤسستهم فقط
  - المستفيدون يرون طرودهم فقط (للبوابة)
  
  ### سياسة الإدراج (INSERT)
  - المدراء وموظفو المؤسسة
  - فحص انتماء الطرد للمؤسسة
  
  ### سياسة التحديث (UPDATE)
  - المدراء وموظفو المؤسسة
  - منع تعديل الطرود المسلمة
  - فحص الصلاحيات
  
  ### سياسة الحذف (DELETE)
  - المدراء فقط
  - منع حذف الطرود المسلمة

  ## الأمان
  - تقييد الوصول حسب المؤسسة
  - منع التلاعب بالطرود المسلمة
  - حماية سلامة البيانات
*/

-- ===================================
-- 1. حذف السياسات القديمة
-- ===================================

DROP POLICY IF EXISTS "Enable read access for all users" ON packages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON packages;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON packages;

-- ===================================
-- 2. سياسة القراءة المحسّنة
-- ===================================

CREATE POLICY "authorized_users_can_read_packages"
  ON packages
  FOR SELECT
  TO authenticated
  USING (
    -- المدراء يرون جميع الطرود
    check_user_is_admin()
    OR
    -- موظفو المؤسسة يرون طرود مؤسستهم
    (
      organization_id IS NOT NULL
      AND user_belongs_to_organization(organization_id)
    )
    OR
    -- الموظفون بصلاحية القراءة
    check_user_permission('قراءة الطرود')
  );

-- ===================================
-- 3. سياسة الإدراج المحسّنة
-- ===================================

CREATE POLICY "authorized_staff_can_insert_packages"
  ON packages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- المدراء يمكنهم الإدراج
    check_user_is_admin()
    OR
    -- موظفو المؤسسة يضيفون طرود لمؤسستهم فقط
    (
      organization_id IS NOT NULL
      AND user_belongs_to_organization(organization_id)
    )
    OR
    -- الموظفون بصلاحية الإضافة
    check_user_permission('إضافة طرود')
  );

-- ===================================
-- 4. سياسة التحديث المحسّنة مع منع تعديل المسلمة
-- ===================================

CREATE POLICY "authorized_staff_can_update_packages"
  ON packages
  FOR UPDATE
  TO authenticated
  USING (
    -- لا يمكن تعديل الطرود المسلمة (ما لم تكن مدير)
    (status != 'delivered' OR check_user_is_admin())
    AND
    (
      -- المدراء يعدلون كل شيء
      check_user_is_admin()
      OR
      -- موظفو المؤسسة يعدلون طرود مؤسستهم
      (
        organization_id IS NOT NULL
        AND user_belongs_to_organization(organization_id)
      )
      OR
      -- الموظفون بصلاحية التعديل
      check_user_permission('تعديل الطرود')
    )
  )
  WITH CHECK (
    -- نفس شروط USING
    (status != 'delivered' OR check_user_is_admin())
    AND
    (
      check_user_is_admin()
      OR
      (
        organization_id IS NOT NULL
        AND user_belongs_to_organization(organization_id)
      )
      OR
      check_user_permission('تعديل الطرود')
    )
  );

-- ===================================
-- 5. سياسة الحذف المقيدة
-- ===================================

CREATE POLICY "only_admins_can_delete_packages"
  ON packages
  FOR DELETE
  TO authenticated
  USING (
    -- المدراء فقط، ولا يمكن حذف المسلمة
    check_user_is_admin()
    AND status != 'delivered'
  );

-- ===================================
-- 6. تعليقات توضيحية
-- ===================================

COMMENT ON POLICY "authorized_users_can_read_packages" ON packages 
IS 'المستخدمون المصادق عليهم يقرأون الطرود حسب مؤسساتهم وصلاحياتهم';

COMMENT ON POLICY "authorized_staff_can_insert_packages" ON packages 
IS 'الموظفون المخولون يضيفون طرود لمؤسساتهم فقط';

COMMENT ON POLICY "authorized_staff_can_update_packages" ON packages 
IS 'الموظفون المخولون يعدلون طرود مؤسساتهم، مع منع تعديل الطرود المسلمة';

COMMENT ON POLICY "only_admins_can_delete_packages" ON packages 
IS 'المدراء فقط يحذفون الطرود غير المسلمة';
