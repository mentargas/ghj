/*
  ═══════════════════════════════════════════════════════════
  الخطوة 2: ربط الحساب بعد إنشائه في Dashboard
  ═══════════════════════════════════════════════════════════
  
  ⚠️  قبل تشغيل هذا الأمر:
  1. تأكد من أنك أنشأت المستخدم في Supabase Dashboard
  2. انسخ الـ User UID من صفحة المستخدم
  3. استبدل <USER_UID_HERE> بالمعرف الفعلي أدناه
*/

DO $$
DECLARE
  -- ⚠️ ضع User UID هنا (استبدل النص بين الأقواس)
  v_auth_user_id uuid := '<USER_UID_HERE>'; 
  
  v_role_id uuid;
  v_system_user_id uuid;
BEGIN
  -- التحقق من أن المعرف تم تغييره
  IF v_auth_user_id::text = '<USER_UID_HERE>' THEN
    RAISE EXCEPTION '⚠️  يجب استبدال <USER_UID_HERE> بالمعرف الفعلي من Dashboard!';
  END IF;
  
  -- الحصول على دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;
  
  -- التحقق من وجود الدور
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION '❌ دور المدير غير موجود! شغل FINAL_SOLUTION.sql أولاً';
  END IF;
  
  -- إنشاء السجل في system_users
  INSERT INTO system_users (
    id,
    auth_user_id,
    name,
    email,
    phone,
    role_id,
    status,
    created_at,
    last_login
  ) VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    'محمد ابو طير',
    'info@wefrh.com',
    '0595579036',
    v_role_id,
    'active',
    now(),
    NULL
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status
  RETURNING id INTO v_system_user_id;
  
  -- رسائل النجاح
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 تم ربط الحساب بنجاح!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ معرف النظام: %', v_system_user_id;
  RAISE NOTICE '✅ معرف Auth: %', v_auth_user_id;
  RAISE NOTICE '✅ البريد: info@wefrh.com';
  RAISE NOTICE '✅ الحالة: نشط';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
END $$;

-- ============================================
-- إعادة تفعيل الـ Trigger
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- التحقق من النتيجة النهائية
-- ============================================

SELECT 
  '✅ معلومات الحساب' as section,
  su.id as system_user_id,
  su.auth_user_id,
  su.name,
  su.email,
  su.phone,
  r.name as role_name,
  su.status,
  su.created_at,
  CASE 
    WHEN su.auth_user_id IS NOT NULL THEN '✅ مرتبط بـ Auth'
    ELSE '❌ غير مرتبط'
  END as link_status
FROM system_users su
LEFT JOIN roles r ON r.id = su.role_id
WHERE su.email = 'info@wefrh.com';

-- التحقق من auth.users
SELECT 
  '✅ حالة المصادقة' as section,
  id as auth_user_id,
  email,
  email_confirmed_at,
  phone,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ البريد مؤكد'
    ELSE '⚠️ البريد غير مؤكد'
  END as confirmation_status
FROM auth.users
WHERE email = 'info@wefrh.com';

-- ============================================
-- رسالة ختامية
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎊 اكتمل الإعداد بنجاح!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📱 يمكنك الآن تسجيل الدخول في التطبيق:';
  RAISE NOTICE '';
  RAISE NOTICE '   📧 البريد: info@wefrh.com';
  RAISE NOTICE '   🔐 كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ الخطوات التالية:';
  RAISE NOTICE '   1. افتح التطبيق';
  RAISE NOTICE '   2. سجل الدخول بالبيانات أعلاه';
  RAISE NOTICE '   3. يُنصح بتغيير كلمة المرور من الإعدادات';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 الأمان:';
  RAISE NOTICE '   ✅ لن يمكن إنشاء حسابات جديدة عبر التسجيل';
  RAISE NOTICE '   ✅ الـ Trigger عاد للعمل بشكل طبيعي';
  RAISE NOTICE '   ✅ جميع الحمايات نشطة';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
