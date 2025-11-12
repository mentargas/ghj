# دليل تثبيت وإعداد النظام

## المتطلبات الأساسية

- Node.js (النسخة 18 أو أحدث)
- npm أو yarn
- حساب Supabase

## خطوات التثبيت

### 1. تثبيت المكتبات

```bash
npm install
```

### 2. إعداد ملف البيئة

أنشئ ملف `.env` في جذر المشروع وأضف المعلومات التالية:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. إعداد قاعدة البيانات

#### الطريقة الأولى: استخدام ملف database_complete.sql
```bash
# افتح Supabase SQL Editor وقم بتشغيل الملف
database/database_complete.sql
```

#### الطريقة الثانية: استخدام Migrations
```bash
# إذا كنت تستخدم Supabase CLI
supabase db push
```

### 4. إنشاء حساب المدير الأول

1. اذهب إلى Supabase Dashboard
2. افتح Authentication → Users
3. اضغط "Add user" → "Create new user"
4. أدخل البريد الإلكتروني وكلمة المرور
5. فعّل "Auto Confirm User"
6. بعد إنشاء المستخدم، افتح SQL Editor وقم بتشغيل:

```sql
DO $$
DECLARE
  v_auth_user_id uuid := 'USER_UID_HERE';
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'مدير النظام' LIMIT 1;
  INSERT INTO system_users (
    id, auth_user_id, name, email, phone, role_id, status, created_at
  ) VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    'اسم المدير',
    'admin@example.com',
    '0500000000',
    v_role_id,
    'active',
    now()
  );
END $$;
```

### 5. تشغيل المشروع

```bash
npm run dev
```

المشروع سيعمل على `http://localhost:5173`

## استكشاف الأخطاء

### مشكلة الاتصال بـ Supabase
- تأكد من صحة URL و Anon Key في ملف `.env`
- تأكد من أن المشروع نشط على Supabase

### مشكلة تسجيل الدخول
- تأكد من إنشاء حساب المدير بشكل صحيح
- تأكد من ربط الحساب بجدول system_users

### مشكلة RLS Policies
- تأكد من تفعيل RLS على جميع الجداول
- تأكد من وجود policies مناسبة للوصول

## الخطوات التالية

بعد التثبيت الناجح:
1. قم بتسجيل الدخول بحساب المدير
2. أضف المؤسسات والعائلات
3. سجل المستفيدين
4. ابدأ في إضافة الطرود والتوزيعات
