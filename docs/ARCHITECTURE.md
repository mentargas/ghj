# بنية النظام

## نظرة عامة

هذا نظام شامل لإدارة المساعدات الإنسانية في قطاع غزة، مبني على React + TypeScript في الواجهة الأمامية و Supabase في الخلفية.

## البنية العامة

```
project/
├── src/                      # الكود المصدري
│   ├── components/           # مكونات React
│   │   ├── pages/           # صفحات النظام
│   │   ├── ui/              # مكونات واجهة المستخدم
│   │   ├── modals/          # نوافذ منبثقة
│   │   ├── portal/          # بوابة المستفيدين
│   │   └── ...
│   ├── context/             # Context API
│   ├── data/                # بيانات ثابتة
│   │   └── mock/           # بيانات وهمية للتطوير
│   ├── hooks/               # Custom React Hooks
│   ├── services/            # خدمات API
│   ├── types/               # TypeScript Types
│   └── utils/               # دوال مساعدة
├── database/                 # قاعدة البيانات
│   └── schemas/             # ملفات SQL
├── supabase/                # Supabase
│   └── migrations/          # ملفات Migration
└── docs/                    # توثيق

## المكونات الرئيسية

### 1. Supabase (Backend)

**قاعدة البيانات:**
- PostgreSQL database
- Row Level Security (RLS) enabled
- Real-time subscriptions

**الجداول الرئيسية:**
- `organizations` - المؤسسات
- `families` - العائلات
- `beneficiaries` - المستفيدين
- `packages` - الطرود
- `tasks` - مهام التوصيل
- `couriers` - المندوبين
- `system_users` - المستخدمين
- `roles` & `permissions` - الأدوار والصلاحيات

### 2. React Frontend

**التقنيات:**
- React 18.3
- TypeScript 5.5
- Vite (Build Tool)
- Tailwind CSS (Styling)

**الصفحات الرئيسية:**
- Landing Page - الصفحة الرئيسية
- Admin Dashboard - لوحة الإدمن
- Organizations Dashboard - لوحة المؤسسات
- Families Dashboard - لوحة العائلات
- Beneficiary Portal - بوابة المستفيدين

### 3. نظام المصادقة

- Supabase Auth
- Email/Password authentication
- Session management
- RLS policies للأمان

### 4. نظام الإشعارات

- SMS notifications
- WhatsApp integration (مستقبلي)
- In-app notifications
- Email notifications (مستقبلي)

## تدفق البيانات

```
User Input → React Component → Service Layer → Supabase Client → Database
                                      ↓
                                RLS Policies Check
                                      ↓
                                  Response
```

## الأمان

### Row Level Security (RLS)

جميع الجداول محمية بـ RLS policies:
- قراءة: حسب صلاحيات المستخدم
- كتابة: للمستخدمين المصرح لهم فقط
- حذف: للمدراء فقط

### Authentication

- JWT tokens
- Session management
- Auto-refresh tokens
- Secure password hashing

## قابلية التوسع

### إضافة صفحة جديدة

1. أنشئ component في `src/components/pages/`
2. أضف route في `App.tsx`
3. أضف permissions في الـ backend

### إضافة جدول جديد

1. أنشئ migration file في `supabase/migrations/`
2. حدد RLS policies
3. أضف types في `src/types/database.ts`
4. أنشئ service في `src/services/`

### إضافة API endpoint

1. أنشئ function في service المناسب
2. استخدم Supabase client
3. أضف error handling مناسب

## الأداء

### تحسينات مطبقة

- Lazy loading للمكونات الكبيرة
- Code splitting
- Optimistic UI updates
- Caching للبيانات المتكررة
- Debouncing للـ search

### المراقبة

- Error logging في الـ console
- ErrorBoundary للـ components
- Network request monitoring

## الاختبار

### أنواع الاختبار المطلوبة

- Unit tests للـ services
- Integration tests للـ components
- E2E tests للـ workflows المهمة
- RLS policies testing

## النشر

### متطلبات النشر

1. Supabase project (production)
2. Environment variables
3. Build optimized (`npm run build`)
4. Static hosting (Vercel, Netlify, etc.)

### خطوات النشر

```bash
# 1. Build
npm run build

# 2. Test build locally
npm run preview

# 3. Deploy to hosting
# (حسب المنصة المستخدمة)
```

## الصيانة

### تحديثات دورية

- Dependencies updates
- Security patches
- Database backups
- Logs monitoring

### أفضل الممارسات

- Follow TypeScript strict mode
- Use proper error handling
- Write meaningful commit messages
- Document complex logic
- Test before deploying
