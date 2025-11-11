/*
  # إصلاح وإنشاء حساب المدير info@wefrh.com
  
  ## الوصف
  حذف أي بيانات عالقة وإنشاء حساب المدير بشكل صحيح
  
  ## التفاصيل
  - البريد الإلكتروني: info@wefrh.com
  - الاسم: مدير النظام
  - كلمة المرور الأولية: Admin@2025
  
  ## الأمان
  - يجب تغيير كلمة المرور بعد أول تسجيل دخول
*/

-- حذف أي سجلات عالقة
DELETE FROM system_users WHERE email = 'info@wefrh.com';

-- إدراج المستخدم مباشرة في system_users بدون auth_user_id
-- سيتم ربطه بـ auth.users عند أول تسجيل دخول
INSERT INTO system_users (
  id,
  name,
  email,
  phone,
  role_id,
  associated_id,
  associated_type,
  status,
  last_login,
  created_at
) VALUES (
  gen_random_uuid(),
  'مدير النظام - WEFRH',
  'info@wefrh.com',
  '0501234567',
  '00000001-0001-0001-0001-000000000001',
  NULL,
  NULL,
  'active',
  NULL,
  now()
);

-- التحقق من النتيجة
SELECT 
  su.id,
  su.name,
  su.email,
  su.phone,
  r.name as role_name,
  su.status,
  su.created_at
FROM system_users su
LEFT JOIN roles r ON r.id = su.role_id
WHERE su.email = 'info@wefrh.com';
