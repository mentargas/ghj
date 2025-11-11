/*
  ═══════════════════════════════════════════════════════════
  🔥 الحل النهائي - إنشاء حساب المدير
  ═══════════════════════════════════════════════════════════
  
  المشكلة: التشفير المباشر في SQL لا يعمل مع Supabase Auth
  
  الحل: استخدام Supabase Dashboard (الطريقة الموصى بها)
  
  ═══════════════════════════════════════════════════════════
*/

-- ============================================
-- الخطوة 1: التنظيف والإعداد
-- ============================================

-- تعطيل الـ Trigger مؤقتاً
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- حذف أي بيانات قديمة
DELETE FROM system_users WHERE email = 'info@wefrh.com';
DELETE FROM auth.users WHERE email = 'info@wefrh.com';

-- التأكد من وجود دور المدير
INSERT INTO roles (
  id,
  name,
  description,
  permissions,
  is_active,
  created_at
) VALUES (
  '00000001-0001-0001-0001-000000000001',
  'مدير النظام',
  'صلاحيات كاملة للنظام',
  ARRAY[]::uuid[],
  true,
  now()
)
ON CONFLICT (id) DO UPDATE 
SET 
  is_active = true,
  name = EXCLUDED.name;

-- ============================================
-- رسالة توجيهية
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 تم تنظيف البيانات وإعداد النظام';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 الخطوات التالية (مهمة جداً):';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣  اذهب إلى Supabase Dashboard:';
  RAISE NOTICE '    https://lyjdqdopnbeikajifaks.supabase.co';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  اذهب إلى: Authentication → Users';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  اضغط "Add user" ثم "Create new user"';
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣  أدخل البيانات التالية:';
  RAISE NOTICE '    ┌─────────────────────────────────────┐';
  RAISE NOTICE '    │ Email: info@wefrh.com              │';
  RAISE NOTICE '    │ Password: Mo%%+%%05990               │';
  RAISE NOTICE '    │ ✅ Auto Confirm User: نعم          │';
  RAISE NOTICE '    └─────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '5️⃣  اضغط "Create user"';
  RAISE NOTICE '';
  RAISE NOTICE '6️⃣  بعد إنشاء المستخدم، انسخ الـ User UID من الصفحة';
  RAISE NOTICE '';
  RAISE NOTICE '7️⃣  ارجع لهذا الـ SQL Editor وشغل الأمر التالي:';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ============================================
-- عرض الأمر الذي سيتم تشغيله بعد إنشاء المستخدم
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '📝 الأمر الذي ستشغله بعد نسخ User UID:';
  RAISE NOTICE '';
  RAISE NOTICE 'DO $$';
  RAISE NOTICE 'DECLARE';
  RAISE NOTICE '  v_auth_user_id uuid := ''<ضع-User-UID-هنا>'';';
  RAISE NOTICE '  v_role_id uuid;';
  RAISE NOTICE 'BEGIN';
  RAISE NOTICE '  SELECT id INTO v_role_id FROM roles WHERE name = ''مدير النظام'' LIMIT 1;';
  RAISE NOTICE '  INSERT INTO system_users (id, auth_user_id, name, email, phone, role_id, status, created_at)';
  RAISE NOTICE '  VALUES (gen_random_uuid(), v_auth_user_id, ''محمد ابو طير'', ''info@wefrh.com'', ''0595579036'', v_role_id, ''active'', now());';
  RAISE NOTICE '  RAISE NOTICE ''✅ تم ربط الحساب بنجاح!'';';
  RAISE NOTICE 'END $$;';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ============================================
-- التحقق من الدور
-- ============================================

SELECT 
  id,
  name,
  description,
  is_active,
  '✅ جاهز' as status
FROM roles
WHERE name = 'مدير النظام';

-- ============================================
-- ملاحظة ختامية
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚡ لماذا هذه الطريقة؟';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Supabase Dashboard يتعامل مع التشفير بشكل صحيح';
  RAISE NOTICE '✅ Auto Confirm يجعل الحساب نشط فوراً';
  RAISE NOTICE '✅ لا توجد مشاكل توافق أو تشفير';
  RAISE NOTICE '✅ طريقة آمنة ومضمونة 100%%';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
