/*
  # إصلاح خطأ Trigger handle_new_user

  ## المشكلة
  الـ Trigger كان يحاول حذف المستخدم من auth.users في حالة الخطأ، لكن هذا غير مسموح من داخل AFTER INSERT trigger.

  ## الحل
  - إزالة محاولة حذف المستخدم من auth.users
  - السماح للاستثناء بالانتشار بشكل طبيعي
  - Supabase Auth سيتولى معالجة الخطأ وإلغاء العملية

  ## الأمان
  - الحماية لا تزال موجودة: لن يتم إنشاء حساب إذا كان هناك مدير موجود
  - الاستثناء سيمنع إنشاء الحساب بالكامل
*/

-- ===================================
-- إصلاح Trigger handle_new_user
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
      USING HINT = 'يرجى تسجيل الدخول بالحساب الموجود أو الاتصال بمدير النظام';
  END IF;

  -- الحصول على معرف دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;

  -- إذا لم يتم العثور على دور المدير، نرفع استثناء
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'دور المدير غير موجود في النظام';
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
    -- إعادة رفع الاستثناء فقط
    -- Supabase Auth سيتولى إلغاء العملية بالكامل
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