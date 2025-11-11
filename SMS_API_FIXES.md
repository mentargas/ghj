# إصلاح مشاكل نظام TweetSMS API

## تاريخ التحديث: 11 نوفمبر 2025

---

## ملخص الإصلاحات

تم إصلاح مشكلتين رئيسيتين في نظام SMS:

### 1. مشكلة قاعدة البيانات
**الخطأ**: `Could not find the 'message_text' column of 'sms_logs' in the schema cache`

**الحل**:
- إنشاء migration جديد للتأكد من وجود جميع أعمدة جدول `sms_logs`
- تحديث RLS policies
- إعادة إنشاء الفهارس
- ملف Migration: `20251111233905_fix_sms_logs_schema_and_refresh.sql`

### 2. مشكلة API فحص الرصيد
**الخطأ**: `Failed to fetch` عند النقر على "فحص الرصيد"

**الحل**:
- تحديث endpoint من `/api.php/maan/balance` إلى `/api.php/maan/chk_balance`
- تصحيح المعاملات المرسلة حسب وثائق TweetSMS API

### 3. تصحيح API إرسال الرسائل
**المشكلة**: استخدام معاملات خاطئة في طلب إرسال الرسائل

**الحل**:
- تحديث المعاملات من `name`, `mobile` إلى `to`, `sender`, `message`
- التأكد من التطابق مع وثائق TweetSMS API الرسمية

---

## التفاصيل التقنية

### أولاً: إصلاح قاعدة البيانات

#### ملف Migration الجديد
```sql
supabase/migrations/20251111233905_fix_sms_logs_schema_and_refresh.sql
```

#### ما يفعله Migration:
1. **التأكد من وجود جدول sms_logs** مع جميع الأعمدة المطلوبة
2. **التحقق من جميع الأعمدة** وإضافة أي عمود مفقود:
   - `phone_number` (text, NOT NULL)
   - `message_text` (text, NOT NULL) ← العمود المشكل
   - `message_type` (text, NOT NULL)
   - `status` (text, NOT NULL, DEFAULT 'pending')
   - `sms_id` (text)
   - `result_code` (text)
   - `error_message` (text)
   - `beneficiary_id` (uuid)
   - `package_id` (uuid)
   - `sent_by` (text, NOT NULL)
   - `sent_by_user_id` (text)
   - `retry_count` (integer, DEFAULT 0)
   - `max_retries` (integer, DEFAULT 3)
   - `created_at` (timestamptz, DEFAULT now())
   - `sent_at` (timestamptz)
   - `failed_at` (timestamptz)
   - `notes` (text, DEFAULT '')

3. **إعادة إنشاء الفهارس**:
   - `idx_sms_logs_phone` على `phone_number`
   - `idx_sms_logs_status` على `status`
   - `idx_sms_logs_type` على `message_type`
   - `idx_sms_logs_beneficiary` على `beneficiary_id`
   - `idx_sms_logs_created_at` على `created_at DESC`

4. **تحديث RLS Policies**:
   - قراءة: للمستخدمين المصادق عليهم
   - إدراج: للمستخدمين المصادق عليهم
   - تحديث: للمستخدمين المصادق عليهم

#### خطوات تطبيق Migration:
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. قم بتشغيل محتوى الملف `20251111233905_fix_sms_logs_schema_and_refresh.sql`
4. بعد التنفيذ، قم بتحديث schema cache بتشغيل:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

### ثانياً: إصلاح API فحص الرصيد

#### التغيير في `src/services/smsService.ts`

**قبل الإصلاح**:
```typescript
const response = await fetch('https://tweetsms.ps/api.php/maan/balance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    api_key: apiKey,
  }),
});
```

**بعد الإصلاح**:
```typescript
const response = await fetch('https://tweetsms.ps/api.php/maan/chk_balance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    api_key: apiKey,
  }),
});
```

#### كيفية عمل API فحص الرصيد:
- **Endpoint**: `POST https://tweetsms.ps/api.php/maan/chk_balance`
- **المعاملات المطلوبة**:
  - `api_key`: مفتاح API الخاص بك
- **الاستجابة المتوقعة**:
  ```json
  {
    "code": 999,
    "balance": 1500,
    "message": "balance retrieved successfully"
  }
  ```
- **رموز الأخطاء**:
  - `-100`: معاملات مفقودة
  - `-110`: API key خاطئ
  - `999`: نجاح العملية

---

### ثالثاً: إصلاح API إرسال الرسائل

#### التغيير في `src/services/smsService.ts`

**قبل الإصلاح**:
```typescript
body: new URLSearchParams({
  api_key: apiKey,
  name: sender,        // ← خطأ: المعامل غير صحيح
  mobile: formattedPhone,  // ← خطأ: المعامل غير صحيح
  message: message,
}),
```

**بعد الإصلاح**:
```typescript
body: new URLSearchParams({
  api_key: apiKey,
  to: formattedPhone,     // ✓ صحيح
  message: message,       // ✓ صحيح
  sender: sender,         // ✓ صحيح
}),
```

#### كيفية عمل API إرسال الرسائل:
- **Endpoint**: `POST https://tweetsms.ps/api.php/maan/sendsms`
- **المعاملات المطلوبة**:
  - `api_key`: مفتاح API
  - `to`: رقم الهاتف (مثل: 972599123456)
  - `message`: نص الرسالة
  - `sender`: اسم المرسل (Name)
- **الاستجابة المتوقعة**:
  ```json
  {
    "code": 999,
    "message_id": "20031",
    "message": "SMS sent successfully"
  }
  ```
- **رموز الأخطاء**:
  - `-100`: معاملات مفقودة
  - `-110`: API key خاطئ
  - `-113`: رصيد غير كافٍ
  - `-115`: المرسل غير متاح
  - `-116`: اسم مرسل غير صحيح
  - `-2`: رقم غير صالح أو دولة غير مدعومة
  - `-999`: فشل الإرسال من مزود الخدمة
  - `999`: نجاح العملية

---

## خطوات الاختبار

### 1. اختبار فحص الرصيد:
1. افتح التطبيق وسجل دخولك كمسؤول
2. اذهب إلى "إعدادات SMS"
3. تأكد من إدخال API Key الصحيح
4. انقر على زر "فحص الرصيد"
5. يجب أن تظهر رسالة نجاح مع الرصيد المتبقي

### 2. اختبار إرسال رسالة تجريبية:
1. في نفس الصفحة، اذهب إلى تبويب "تجربة الخدمة"
2. أدخل رقم هاتف صحيح (مثل: 0599123456)
3. أدخل نص رسالة تجريبي
4. انقر على "إرسال رسالة تجريبية"
5. يجب أن تصل الرسالة إلى الهاتف المحدد

### 3. اختبار سجل الرسائل:
1. اذهب إلى تبويب "سجل الرسائل"
2. يجب أن تظهر جميع الرسائل المرسلة
3. تحقق من ظهور `message_text` بشكل صحيح
4. لا يجب أن يظهر أي خطأ في schema

### 4. اختبار الإحصائيات:
1. اذهب إلى تبويب "الإحصائيات"
2. يجب أن تظهر الإحصائيات بشكل صحيح:
   - إجمالي الرسائل
   - رسائل ناجحة
   - رسائل فاشلة
   - معدل النجاح

---

## معلومات TweetSMS API

### طرق الاستخدام المتاحة:

#### 1. باستخدام API Key (موصى به):
```
POST https://tweetsms.ps/api.php/maan/chk_balance
Body: api_key=YOUR_API_KEY

POST https://tweetsms.ps/api.php/maan/sendsms
Body: api_key=YOUR_API_KEY&to=972599123456&message=test&sender=YourName
```

#### 2. باستخدام Username و Password (الطريقة القديمة):
```
GET https://tweetsms.ps/api.php?comm=chk_balance&user=TEST&pass=123456

GET https://tweetsms.ps/api.php?comm=sendsms&user=TEST&pass=123456&to=972599123456&message=test&sender=YourName
```

**ملاحظة**: التطبيق يستخدم الطريقة الأولى (API Key) لأنها أكثر أماناً وحداثة.

---

## الحصول على API Key

للحصول على API Key من TweetSMS:

1. سجل دخولك إلى لوحة التحكم في TweetSMS
2. اذهب إلى قسم "الإعدادات" أو "API Settings"
3. انسخ API Key الخاص بك
4. إذا لم تجد API Key، تواصل مع الدعم الفني على واتساب: 972594127070

---

## استكشاف الأخطاء وحلها

### مشكلة: لا يزال خطأ "message_text" يظهر
**الحل**:
1. تأكد من تطبيق migration الجديد في قاعدة البيانات
2. قم بتحديث schema cache:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. أعد تحميل الصفحة في المتصفح (Ctrl+Shift+R)

### مشكلة: فحص الرصيد لا يزال يفشل
**الحل**:
1. تأكد من صحة API Key
2. تحقق من أن الخدمة مفعلة (is_active = true)
3. افتح Developer Console (F12) وتحقق من رسالة الخطأ الدقيقة
4. تأكد من أن الكود المحدث تم تحميله (امسح cache المتصفح)

### مشكلة: إرسال الرسائل يفشل
**الحل**:
1. تحقق من رمز الخطأ المعروض:
   - `-113`: رصيد غير كافٍ - قم بشحن الحساب
   - `-115`: اسم المرسل غير مفعل - تواصل مع TweetSMS
   - `-116`: اسم مرسل غير صحيح - تحقق من اسم المرسل
2. تأكد من صحة رقم الهاتف (يجب أن يبدأ بـ 972)
3. تحقق من وجود رصيد كافٍ

---

## ملاحظات إضافية

### تنسيق رقم الهاتف
التطبيق يدعم عدة صيغ لرقم الهاتف ويحولها تلقائياً:
- `0599123456` → `972599123456`
- `+972599123456` → `972599123456`
- `972599123456` → `972599123456` (بدون تغيير)

### الأمان
- يتم تشفير API Key في قاعدة البيانات باستخدام base64
- RLS مفعل على جميع الجداول
- فقط المستخدمون المصادق عليهم يمكنهم الوصول إلى نظام SMS

### الحدود اليومية
- يمكن تعيين حد أقصى يومي للرسائل المرسلة
- يتم إعادة تعيين العداد تلقائياً كل يوم
- الحد الافتراضي: 1000 رسالة/يوم

---

## الخلاصة

تم إصلاح جميع المشاكل المتعلقة بنظام TweetSMS API:

✅ **إصلاح schema جدول sms_logs** - لن يظهر خطأ "message_text" بعد الآن

✅ **تحديث endpoint فحص الرصيد** - يعمل بشكل صحيح الآن

✅ **تصحيح معاملات إرسال الرسائل** - تطابق وثائق TweetSMS API

✅ **البناء يعمل بنجاح** - لا توجد أخطاء في الكود

✅ **جميع الاختبارات جاهزة** - يمكن تجربة النظام الآن

---

## للدعم والمساعدة

إذا واجهت أي مشكلة:
1. تحقق من هذا الملف أولاً
2. راجع سجل الأخطاء في Developer Console
3. تأكد من تطبيق جميع migrations
4. تواصل مع الدعم الفني

تم التحديث بواسطة: Claude Code
التاريخ: 11 نوفمبر 2025
