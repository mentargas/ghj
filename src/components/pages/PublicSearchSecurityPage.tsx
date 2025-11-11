import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle, Activity, TrendingUp } from 'lucide-react';
import { Card, Button, Input } from '../ui';
import { publicSearchService } from '../../services/publicSearchService';
import { beneficiaryAuthService } from '../../services/beneficiaryAuthService';

export default function PublicSearchSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [captchaSettings, setCaptchaSettings] = useState({
    is_enabled: false,
    site_key: '',
    secret_key: '',
    score_threshold: 0.5,
    required_for_search: false,
    required_for_pin: false
  });

  const [otpSettings, setOTPSettings] = useState({
    is_enabled: false,
    required_for_search: false,
    required_for_details: false,
    required_for_pin_creation: false,
    otp_length: 6,
    otp_expiry_minutes: 5
  });

  const [securitySettings, setSecuritySettings] = useState({
    is_enabled: true,
    require_pin_for_details: true,
    pin_length: 6,
    max_pin_attempts: 5,
    lockout_duration_minutes: 30,
    max_searches_per_hour: 10,
    max_searches_per_day: 50,
    enable_rate_limiting: true,
    enable_suspicious_activity_detection: true
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    this_week: 0,
    this_month: 0,
    success_rate: 0,
    suspicious_count: 0
  });

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const features = await beneficiaryAuthService.getAllSystemFeatures();

      const captcha = features.find((f) => f.feature_key === 'public_search_captcha');
      if (captcha) {
        setCaptchaSettings({
          is_enabled: captcha.is_enabled,
          ...captcha.settings
        });
      }

      const otp = features.find((f) => f.feature_key === 'public_search_otp');
      if (otp) {
        setOTPSettings({
          is_enabled: otp.is_enabled,
          ...otp.settings
        });
      }

      const security = features.find((f) => f.feature_key === 'public_search_security');
      if (security) {
        setSecuritySettings({
          is_enabled: security.is_enabled,
          ...security.settings
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setMessage({ type: 'error', text: 'حدث خطأ في تحميل الإعدادات' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await publicSearchService.getSearchStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSaveCaptcha = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await beneficiaryAuthService.updateSystemFeature(
        'public_search_captcha',
        captchaSettings.is_enabled,
        {
          site_key: captchaSettings.site_key,
          secret_key: captchaSettings.secret_key,
          score_threshold: captchaSettings.score_threshold,
          required_for_search: captchaSettings.required_for_search,
          required_for_pin: captchaSettings.required_for_pin
        },
        'admin'
      );
      setMessage({ type: 'success', text: 'تم حفظ إعدادات CAPTCHA بنجاح' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOTP = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await beneficiaryAuthService.updateSystemFeature(
        'public_search_otp',
        otpSettings.is_enabled,
        {
          required_for_search: otpSettings.required_for_search,
          required_for_details: otpSettings.required_for_details,
          required_for_pin_creation: otpSettings.required_for_pin_creation,
          otp_length: otpSettings.otp_length,
          otp_expiry_minutes: otpSettings.otp_expiry_minutes
        },
        'admin'
      );
      setMessage({ type: 'success', text: 'تم حفظ إعدادات OTP بنجاح' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await beneficiaryAuthService.updateSystemFeature(
        'public_search_security',
        securitySettings.is_enabled,
        {
          require_pin_for_details: securitySettings.require_pin_for_details,
          pin_length: securitySettings.pin_length,
          max_pin_attempts: securitySettings.max_pin_attempts,
          lockout_duration_minutes: securitySettings.lockout_duration_minutes,
          max_searches_per_hour: securitySettings.max_searches_per_hour,
          max_searches_per_day: securitySettings.max_searches_per_day,
          enable_rate_limiting: securitySettings.enable_rate_limiting,
          enable_suspicious_activity_detection:
            securitySettings.enable_suspicious_activity_detection
        },
        'admin'
      );
      setMessage({ type: 'success', text: 'تم حفظ إعدادات الأمان بنجاح' });
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">جاري تحميل الإعدادات...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">إعدادات أمان البحث العام</h1>
              <p className="text-gray-600">إدارة الحماية والأمان لنظام البحث العام</p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">اليوم</p>
                <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">هذا الأسبوع</p>
                <p className="text-2xl font-bold text-gray-900">{stats.this_week}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">هذا الشهر</p>
                <p className="text-2xl font-bold text-gray-900">{stats.this_month}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">نشاط مشبوه</p>
                <p className="text-2xl font-bold text-gray-900">{stats.suspicious_count}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">إعدادات الأمان العامة</h2>
                  <p className="text-sm text-gray-600">التحكم في القيود والحدود الأمنية</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">تفعيل</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={securitySettings.is_enabled}
                    onChange={(e) =>
                      setSecuritySettings({ ...securitySettings, is_enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  الحد الأقصى للبحث في الساعة
                </label>
                <Input
                  type="number"
                  value={securitySettings.max_searches_per_hour}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      max_searches_per_hour: parseInt(e.target.value) || 10
                    })
                  }
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  الحد الأقصى للبحث في اليوم
                </label>
                <Input
                  type="number"
                  value={securitySettings.max_searches_per_day}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      max_searches_per_day: parseInt(e.target.value) || 50
                    })
                  }
                  min="1"
                  max="500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  عدد محاولات كلمة المرور
                </label>
                <Input
                  type="number"
                  value={securitySettings.max_pin_attempts}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      max_pin_attempts: parseInt(e.target.value) || 5
                    })
                  }
                  min="3"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  مدة القفل (بالدقائق)
                </label>
                <Input
                  type="number"
                  value={securitySettings.lockout_duration_minutes}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      lockout_duration_minutes: parseInt(e.target.value) || 30
                    })
                  }
                  min="5"
                  max="120"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.enable_rate_limiting}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      enable_rate_limiting: e.target.checked
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  تفعيل Rate Limiting (الحد من معدل البحث)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.enable_suspicious_activity_detection}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      enable_suspicious_activity_detection: e.target.checked
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  تفعيل كشف النشاط المشبوه
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.require_pin_for_details}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      require_pin_for_details: e.target.checked
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  طلب كلمة مرور لعرض التفاصيل الكاملة
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveSecurity} disabled={saving} icon={Save} iconPosition="right">
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">إعدادات Google reCAPTCHA v3</h2>
                  <p className="text-sm text-gray-600">حماية إضافية ضد الروبوتات والبوتات</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">تفعيل</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={captchaSettings.is_enabled}
                    onChange={(e) =>
                      setCaptchaSettings({ ...captchaSettings, is_enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Site Key
                </label>
                <Input
                  type="text"
                  value={captchaSettings.site_key}
                  onChange={(e) =>
                    setCaptchaSettings({ ...captchaSettings, site_key: e.target.value })
                  }
                  placeholder="6Lc..."
                  disabled={!captchaSettings.is_enabled}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Secret Key
                </label>
                <div className="relative">
                  <Input
                    type={showSecretKey ? 'text' : 'password'}
                    value={captchaSettings.secret_key}
                    onChange={(e) =>
                      setCaptchaSettings({ ...captchaSettings, secret_key: e.target.value })
                    }
                    placeholder="6Lc..."
                    disabled={!captchaSettings.is_enabled}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  عتبة النتيجة (0.0 - 1.0)
                </label>
                <Input
                  type="number"
                  value={captchaSettings.score_threshold}
                  onChange={(e) =>
                    setCaptchaSettings({
                      ...captchaSettings,
                      score_threshold: parseFloat(e.target.value) || 0.5
                    })
                  }
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={!captchaSettings.is_enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  النتيجة الأدنى المقبولة (0.5 موصى بها)
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveCaptcha} disabled={saving} icon={Save} iconPosition="right">
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-orange-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">إعدادات OTP عبر واتساب</h2>
                  <p className="text-sm text-gray-600">التحقق بخطوتين عبر رسائل واتساب</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">تفعيل</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={otpSettings.is_enabled}
                    onChange={(e) =>
                      setOTPSettings({ ...otpSettings, is_enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </div>
              </label>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={otpSettings.required_for_search}
                  onChange={(e) =>
                    setOTPSettings({ ...otpSettings, required_for_search: e.target.checked })
                  }
                  disabled={!otpSettings.is_enabled}
                  className="w-5 h-5 text-orange-600 rounded"
                />
                <span className="text-sm text-gray-700">طلب OTP عند البحث</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={otpSettings.required_for_details}
                  onChange={(e) =>
                    setOTPSettings({ ...otpSettings, required_for_details: e.target.checked })
                  }
                  disabled={!otpSettings.is_enabled}
                  className="w-5 h-5 text-orange-600 rounded"
                />
                <span className="text-sm text-gray-700">طلب OTP عند عرض التفاصيل</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={otpSettings.required_for_pin_creation}
                  onChange={(e) =>
                    setOTPSettings({
                      ...otpSettings,
                      required_for_pin_creation: e.target.checked
                    })
                  }
                  disabled={!otpSettings.is_enabled}
                  className="w-5 h-5 text-orange-600 rounded"
                />
                <span className="text-sm text-gray-700">طلب OTP عند إنشاء كلمة المرور</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveOTP} disabled={saving} icon={Save} iconPosition="right">
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
