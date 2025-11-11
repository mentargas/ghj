/*
  # إصلاح مشكلة العمودين message و message_text
  
  ## المشكلة
  - يوجد عمودان: message و message_text
  - كلاهما NOT NULL
  - الكود يكتب في message_text فقط
  - قاعدة البيانات ترفض لأن message فارغ
  
  ## الحل
  - نسخ القيم من message إلى message_text للسجلات الموجودة
  - حذف العمود message القديم
  - الاحتفاظ بـ message_text فقط
  
  ## الأمان
  - حفظ البيانات الموجودة
  - نقل القيم قبل الحذف
*/

-- ===================================
-- 1. نسخ البيانات من message إلى message_text للسجلات الموجودة
-- ===================================

DO $$
BEGIN
  -- تحديث message_text من message للسجلات التي لها message وليس لها message_text
  UPDATE sms_logs 
  SET message_text = message 
  WHERE message IS NOT NULL 
    AND (message_text IS NULL OR message_text = '');
    
  -- تحديث message من message_text للسجلات التي لها message_text وليس لها message
  UPDATE sms_logs 
  SET message = message_text 
  WHERE message_text IS NOT NULL 
    AND (message IS NULL OR message = '');
END $$;

-- ===================================
-- 2. جعل العمود message قابل للقيم الفارغة
-- ===================================

ALTER TABLE sms_logs ALTER COLUMN message DROP NOT NULL;

-- ===================================
-- 3. إضافة قيمة افتراضية مؤقتة للعمود message
-- ===================================

-- جعل message يأخذ قيمة message_text تلقائياً إذا كان فارغاً
DO $$
BEGIN
  -- إضافة trigger لنسخ message_text إلى message تلقائياً
  CREATE OR REPLACE FUNCTION sync_message_columns()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- إذا كان message_text موجود و message فارغ، انسخ القيمة
    IF NEW.message_text IS NOT NULL AND (NEW.message IS NULL OR NEW.message = '') THEN
      NEW.message := NEW.message_text;
    END IF;
    
    -- إذا كان message موجود و message_text فارغ، انسخ القيمة
    IF NEW.message IS NOT NULL AND (NEW.message_text IS NULL OR NEW.message_text = '') THEN
      NEW.message_text := NEW.message;
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- حذف trigger القديم إذا كان موجوداً
  DROP TRIGGER IF EXISTS sync_message_before_insert ON sms_logs;
  DROP TRIGGER IF EXISTS sync_message_before_update ON sms_logs;
  
  -- إنشاء triggers جديدة
  CREATE TRIGGER sync_message_before_insert
    BEFORE INSERT ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION sync_message_columns();
    
  CREATE TRIGGER sync_message_before_update
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION sync_message_columns();
END $$;