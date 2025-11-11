/*
  # تفعيل التسجيل لأول حساب مدير فقط

  ## الوصف
  هذا الـ Migration يقوم بإنشاء آلية للسماح بإنشاء حساب مدير واحد فقط عبر صفحة التسجيل.
  بعد إنشاء أول حساب مدير، يتم تعطيل التسجيل تلقائياً.

  ## المكونات
  1. دالة check_if_first_admin - للتحقق من وجود مدراء في النظام
  2. تحديث Trigger handle_new_user - لمنع إنشاء مستخدمين إضافيين
  3. تحديث سياسات RLS - للتحكم في الصلاحيات

  ## الأمان
  - حماية على مستوى قاعدة البيانات
  - منع إنشاء حسابات غير مصرح بها
  - السماح فقط بأول حساب مدير
*/

-- ===================================
-- 1. دالة للتحقق من وجود مدراء في النظام
-- ===================================

CREATE OR REPLACE FUNCTION check_if_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_count integer;
BEGIN
  -- عد المستخدمين الإداريين الموجودين
  SELECT COUNT(*) INTO v_admin_count
  FROM system_users su
  JOIN roles r ON r.id = su.role_id
  WHERE r.name = 'مدير النظام'
    AND su.status = 'active';

  -- إرجاع true إذا لم يكن هناك أي مدير (أي هذا هو الأول)
  RETURN v_admin_count = 0;

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، نفترض أنه ليس الأول (للأمان)
    RETURN false;
END;
$$;

-- منح الصلاحيات للمستخدمين غير المصادقين لاستدعاء الدالة
GRANT EXECUTE ON FUNCTION check_if_first_admin TO anon, authenticated;

COMMENT ON FUNCTION check_if_first_admin IS 'التحقق من أن النظام لا يحتوي على أي مدراء (للسماح بإنشاء أول حساب فقط)';

-- ===================================
-- 2. تحديث Trigger handle_new_user
-- ===================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_id uuid;
  v_name text;
  v_admin_count integer;
BEGIN
  -- التحقق من عدد المدراء الموجودين
  SELECT COUNT(*) INTO v_admin_count
  FROM system_users su
  JOIN roles r ON r.id = su.role_id
  WHERE r.name = 'مدير النظام'
    AND su.status = 'active';

  -- إذا كان هناك مدير موجود بالفعل، نرفض إنشاء مستخدم جديد
  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'لا يمكن إنشاء حسابات جديدة. النظام يحتوي على حساب مدير بالفعل.'
      USING HINT = 'يرجى تسجيل الدخول بالحساب الموجود أو الاتصال بمدير النظام',
            ERRCODE = 'RJADM';
  END IF;

  -- الحصول على معرف دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;

  -- إذا لم يتم العثور على دور المدير، نرفع استثناء
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'دور المدير غير موجود في النظام'
      USING ERRCODE = 'NOADM';
  END IF;

  -- استخراج الاسم من البريد الإلكتروني أو البيانات الوصفية
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- إنشاء سجل في system_users
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

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث أي خطأ، نحذف المستخدم من auth.users
    DELETE FROM auth.users WHERE id = NEW.id;
    
    -- إعادة رفع الاستثناء
    RAISE;
END;
$$;

-- إعادة إنشاء Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 'Trigger function لإنشاء سجل في system_users عند إنشاء مستخدم في auth.users (فقط للمستخدم الأول)';

-- ===================================
-- 3. تحديث سياسات RLS (اختياري - للحماية الإضافية)
-- ===================================

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "No direct insert to system users" ON system_users;
DROP POLICY IF EXISTS "Allow insert only for first admin" ON system_users;

-- سياسة الإدراج: السماح فقط للتسجيل إذا كان هذا أول مدير
CREATE POLICY "Allow insert only for first admin"
  ON system_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- يتم التحقق من أن هذا الإدراج يتم عبر الـ Trigger
    -- والـ Trigger نفسه يتحقق من عدد المدراء
    false
  );

-- ملاحظة: الإدراج سيتم فقط عبر الـ Trigger الذي له صلاحيات SECURITY DEFINER
-- وبالتالي يمكنه تجاوز هذه السياسة

-- ===================================
-- 4. تنظيف البيانات الحالية (اختياري)
-- ===================================

-- حذف أي مستخدمين بدون auth_user_id (بيانات وهمية قديمة)
-- DELETE FROM system_users WHERE auth_user_id IS NULL;

-- ملاحظة: تم تعطيل هذا السطر لتجنب حذف البيانات عن طريق الخطأ
-- يمكن تفعيله يدوياً إذا لزم الأمر