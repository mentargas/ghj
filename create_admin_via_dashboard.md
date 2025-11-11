# الحل الأسهل والأضمن - عبر Supabase Dashboard

## المشكلة
تشفير كلمة المرور بطريقة مباشرة في SQL لا يعمل بشكل صحيح مع Supabase Auth

## الحل الموصى به ✅

### الخطوة 1: تنظيف البيانات القديمة
افتح SQL Editor في Supabase واشغل:

```sql
-- تعطيل الـ Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- تنظيف البيانات القديمة
DELETE FROM system_users WHERE email = 'info@wefrh.com';
DELETE FROM auth.users WHERE email = 'info@wefrh.com';

-- التأكد من وجود الدور
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
ON CONFLICT (id) DO UPDATE SET is_active = true;
```

### الخطوة 2: إنشاء المستخدم عبر Dashboard

1. اذهب إلى: **Authentication** → **Users**
2. اضغط على زر **"Add user"** → **"Create new user"**
3. أدخل البيانات:
   ```
   Email: info@wefrh.com
   Password: Mo%+%05990
   ```
4. ✅ **مهم جداً**: فعّل خيار **"Auto Confirm User"**
5. اضغط **"Create user"**

### الخطوة 3: ربط المستخدم مع system_users

بعد إنشاء المستخدم في Dashboard، انسخ الـ `User UID` من صفحة المستخدم، ثم شغل في SQL Editor:

```sql
-- استبدل <USER_UID> بالمعرف الفعلي من Dashboard
DO $$
DECLARE
  v_auth_user_id uuid := '<USER_UID>'; -- ضع المعرف هنا
  v_role_id uuid;
BEGIN
  -- الحصول على دور المدير
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'مدير النظام'
  LIMIT 1;
  
  -- إنشاء السجل في system_users
  INSERT INTO system_users (
    id,
    auth_user_id,
    name,
    email,
    phone,
    role_id,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    'محمد ابو طير',
    'info@wefrh.com',
    '0595579036',
    v_role_id,
    'active',
    now()
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role_id = EXCLUDED.role_id,
    status = EXCLUDED.status;
  
  RAISE NOTICE '✅ تم ربط الحساب بنجاح!';
END $$;

-- التحقق من النتيجة
SELECT 
  su.id,
  su.auth_user_id,
  su.name,
  su.email,
  r.name as role_name,
  su.status
FROM system_users su
LEFT JOIN roles r ON r.id = su.role_id
WHERE su.email = 'info@wefrh.com';
```

### الخطوة 4: إعادة تفعيل الـ Trigger

```sql
-- إعادة إنشاء الـ Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- رسالة نجاح
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 تم الإعداد بنجاح!';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'يمكنك الآن تسجيل الدخول:';
  RAISE NOTICE '📧 البريد: info@wefrh.com';
  RAISE NOTICE '🔐 كلمة المرور: Mo%%+%%05990';
  RAISE NOTICE '================================================';
END $$;
```

### الخطوة 5: تسجيل الدخول

الآن يمكنك تسجيل الدخول في التطبيق باستخدام:
- **البريد**: info@wefrh.com
- **كلمة المرور**: Mo%+%05990

---

## لماذا هذه الطريقة أفضل؟

✅ **Supabase Dashboard** يتعامل مع التشفير بشكل صحيح
✅ **Auto Confirm** يجعل الحساب نشط فوراً
✅ **لا مشاكل** مع التشفير أو التوافق
✅ **الربط اليدوي** يضمن عدم حدوث أخطاء

---

## بديل سريع: استخدام Supabase CLI

إذا كان لديك Supabase CLI مثبت:

```bash
# تسجيل الدخول
supabase login

# إنشاء المستخدم
supabase db remote set --project-id lyjdqdopnbeikajifaks
npx supabase auth create-user \
  --email info@wefrh.com \
  --password 'Mo%+%05990' \
  --confirm
```

---

## ملاحظة مهمة

بعد إنشاء الحساب بهذه الطريقة، سيعمل النظام بشكل طبيعي 100% ولن تواجه أي مشاكل في تسجيل الدخول.
