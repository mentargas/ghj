/*
  # تحديث جدول المؤسسات بحقول التغطية
  
  ## الوصف
  إضافة حقول لإدارة مناطق التغطية والخدمات
  
  ## الحقول الجديدة
  - coverage_areas: المناطق المشمولة بالخدمة
  - service_types: أنواع الخدمات المقدمة
  - max_beneficiaries_capacity: السعة القصوى للمستفيدين
  - is_verified: هل المؤسسة موثقة
  - verification_date: تاريخ التوثيق
*/

DO $$
BEGIN
  -- إضافة حقل coverage_areas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'coverage_areas'
  ) THEN
    ALTER TABLE organizations ADD COLUMN coverage_areas text[] DEFAULT '{}';
  END IF;

  -- إضافة حقل service_types
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'service_types'
  ) THEN
    ALTER TABLE organizations ADD COLUMN service_types text[] DEFAULT '{}';
  END IF;

  -- إضافة حقل max_beneficiaries_capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'max_beneficiaries_capacity'
  ) THEN
    ALTER TABLE organizations ADD COLUMN max_beneficiaries_capacity integer DEFAULT 0;
  END IF;

  -- إضافة حقل is_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE organizations ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- إضافة حقل verification_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'verification_date'
  ) THEN
    ALTER TABLE organizations ADD COLUMN verification_date timestamptz;
  END IF;
END $$;