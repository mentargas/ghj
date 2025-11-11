/*
  # إضافة حقول محسّنة لجدول المستفيدين
  
  ## الوصف
  إضافة حقول جديدة لتحسين إدارة بيانات المستفيدين
  
  ## الحقول الجديدة
  - photo_url: رابط صورة المستفيد
  - profile_image_url: رابط صورة الملف الشخصي
  - registration_source: مصدر التسجيل
  - verification_date: تاريخ التحقق
  - notes_internal: ملاحظات داخلية
  - priority_level: مستوى الأولوية
*/

DO $$
BEGIN
  -- إضافة حقل photo_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN photo_url text;
  END IF;

  -- إضافة حقل profile_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN profile_image_url text;
  END IF;

  -- إضافة حقل registration_source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'registration_source'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN registration_source text DEFAULT 'manual';
  END IF;

  -- إضافة حقل verification_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'verification_date'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN verification_date timestamptz;
  END IF;

  -- إضافة حقل notes_internal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'notes_internal'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN notes_internal text DEFAULT '';
  END IF;

  -- إضافة حقل priority_level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beneficiaries' AND column_name = 'priority_level'
  ) THEN
    ALTER TABLE beneficiaries ADD COLUMN priority_level text DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;