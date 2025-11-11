/*
  # الحل البديل - إنشاء حساب المدير
  
  ## هذا الحل يستخدم طريقة مختلفة:
  1. إنشاء السجل في system_users أولاً
  2. ثم استخدام Supabase Dashboard لإنشاء المستخدم في Auth
  
  ## البيانات
  - الاسم: محمد ابو طير
  - البريد: info@wefrh.com
  - الهاتف: 0595579036
  - كلمة المرور: Mo%+%05990
*/

-- ============================================
-- 1. تعطيل الـ Trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 2. تنظيف البيانات
-- ============================================
DELETE FROM system_users WHERE email = 'info@wefrh.com';
DELETE FROM auth.users WHERE email = 'info@wefrh.com';

-- ============================================
-- 3. التأكد من وجود الدور
-- ============================================
INSERT INTO roles (
  id,
  name,
  description,
  permissions,
  is_active
) VALUES (
  '00000001-0001-0001-0001-000000000001',
  'مدير النظام',
  'صلاحيات كاملة للنظام',
  ARRAY[]::uuid[],
  true
)
ON CONFLICT (id) DO UPDATE 
SET is_active = true;

-- ============================================
-- 4. إنشاء حساب مؤقت بدون auth_user_id
-- ============================================
INSERT INTO system_users (
  id,
  name,
  email,
  phone,
  role_id,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  'محمد ابو طير',
  'info@wefrh.com',
  '0595579036',
  '00000001-0001-0001-0001-000000000001',
  'active',
  now()
);

-- ============================================
-- 5. عرض التعليمات
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '⚠️  خطوات إضافية مطلوبة';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣  اذهب إلى Supabase Dashboard → Authentication → Users';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  اضغط "Add user" → "Create new user"';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  أدخل البيانات التالية:';
  RAISE NOTICE '   📧 Email: info@wefrh.com';
  RAISE NOTICE '   🔐 Password: Mo%%+%%05990';
  RAISE NOTICE '   ✅ Auto Confirm User: YES';
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣  اضغط "Create user"';
  RAISE NOTICE '';
  RAISE NOTICE '5️⃣  شغل الأمر التالي لربط الحسابين:';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

-- ============================================
-- 6. التحقق
-- ============================================
SELECT 
  id,
  name,
  email,
  phone,
  role_id,
  status,
  auth_user_id,
  CASE 
    WHEN auth_user_id IS NULL THEN '⚠️  غير مرتبط - يحتاج ربط'
    ELSE '✅ مرتبط'
  END as link_status
FROM system_users
WHERE email = 'info@wefrh.com';
