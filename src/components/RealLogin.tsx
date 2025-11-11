import React, { useState, useEffect } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { SystemUser } from '../data/mockData';

interface RealLoginProps {
  onLogin: (user: SystemUser) => void;
}

type ViewMode = 'login' | 'register' | 'forgot-password';

export default function RealLogin({ onLogin }: RealLoginProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canRegister, setCanRegister] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  useEffect(() => {
    checkIfCanRegister();
  }, []);

  const checkIfCanRegister = async () => {
    setCheckingRegistration(true);
    try {
      if (!supabase) {
        setCanRegister(false);
        return;
      }

      const { data, error } = await supabase.rpc('check_if_first_admin');

      if (error) {
        console.error('Error checking registration status:', error);
        setCanRegister(false);
        return;
      }

      setCanRegister(data === true);
    } catch (error) {
      console.error('Error checking registration:', error);
      setCanRegister(false);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!supabase) {
        throw new Error('فشل الاتصال بقاعدة البيانات');
      }

      // تسجيل الدخول باستخدام Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('فشل تسجيل الدخول');
      }

      // الحصول على معلومات المستخدم من system_users
      const { data: userData, error: userError } = await supabase
        .from('system_users')
        .select(`
          *,
          roles:role_id (
            id,
            name,
            description,
            permissions
          )
        `)
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userData) {
        throw new Error('لم يتم العثور على معلومات المستخدم');
      }

      // التحقق من حالة المستخدم
      if (userData.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('الحساب غير نشط أو موقوف');
      }

      // تحديث آخر تسجيل دخول
      await supabase
        .from('system_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      // تحويل البيانات إلى نموذج SystemUser
      const systemUser: SystemUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        roleId: userData.role_id,
        associatedId: userData.associated_id,
        associatedType: userData.associated_type,
        status: userData.status,
        lastLogin: new Date().toISOString(),
        createdAt: userData.created_at,
      };

      onLogin(systemUser);
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'حدث خطأ في تسجيل الدخول';

      if (error.message === 'Invalid login credentials') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canRegister) {
      setError('لا يمكن إنشاء حسابات جديدة. النظام يحتوي على حساب مدير بالفعل.');
      return;
    }

    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!supabase) {
        throw new Error('فشل الاتصال بقاعدة البيانات');
      }

      // التسجيل باستخدام Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء الحساب');
      }

      // تحديث حالة التسجيل بعد إنشاء الحساب
      setCanRegister(false);

      // التحقق إذا كان البريد يحتاج تأكيد
      if (authData.user && !authData.session) {
        setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.');
        setViewMode('login');
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
      } else {
        // تسجيل الدخول تلقائياً
        const { data: userData, error: userError } = await supabase
          .from('system_users')
          .select(`
            *,
            roles:role_id (
              id,
              name,
              description,
              permissions
            )
          `)
          .eq('auth_user_id', authData.user.id)
          .maybeSingle();

        if (userError) {
          throw userError;
        }

        if (userData) {
          const systemUser: SystemUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            roleId: userData.role_id,
            associatedId: userData.associated_id,
            associatedType: userData.associated_type,
            status: userData.status,
            lastLogin: new Date().toISOString(),
            createdAt: userData.created_at,
          };

          onLogin(systemUser);
        }
      }
    } catch (error: any) {
      console.error('Register error:', error);

      let errorMessage = 'حدث خطأ في إنشاء الحساب';

      if (error.message === 'User already registered') {
        errorMessage = 'البريد الإلكتروني مسجل مسبقاً';
      } else if (error.message.includes('لا يمكن إنشاء حسابات جديدة')) {
        errorMessage = 'لا يمكن إنشاء حسابات جديدة. النظام يحتوي على حساب مدير بالفعل.';
        setCanRegister(false);
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!supabase) {
        throw new Error('فشل الاتصال بقاعدة البيانات');
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      setTimeout(() => {
        setViewMode('login');
        setEmail('');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'حدث خطأ في إرسال رابط إعادة التعيين');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">جاري التحقق من النظام...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Registration Status Banner */}
        {canRegister && viewMode === 'register' && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white text-center">
            <div className="flex items-center justify-center space-x-2 space-x-reverse">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-medium">إنشاء أول حساب مدير - مرة واحدة فقط</span>
            </div>
          </div>
        )}

        {!canRegister && viewMode === 'register' && (
          <div className="bg-gradient-to-r from-red-600 to-rose-600 p-4 text-white text-center">
            <div className="flex items-center justify-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">النظام يحتوي على حساب مدير بالفعل</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {viewMode === 'login' && 'تسجيل الدخول'}
            {viewMode === 'register' && 'إنشاء حساب جديد'}
            {viewMode === 'forgot-password' && 'استعادة كلمة المرور'}
          </h1>
          <p className="text-blue-100">
            {viewMode === 'login' && 'منصة المساعدات الإنسانية - غزة'}
            {viewMode === 'register' && 'إنشاء حساب مسؤول إداري جديد'}
            {viewMode === 'forgot-password' && 'إعادة تعيين كلمة المرور'}
          </p>
        </div>

        <div className="p-8">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-800 font-medium text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 space-x-reverse">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-green-800 font-medium text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          {viewMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="admin@example.com"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-11 pl-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('forgot-password')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 ml-2" />
                    تسجيل الدخول
                  </>
                )}
              </button>

              {canRegister && (
                <div className="text-center pt-4 border-t">
                  <span className="text-gray-600 text-sm">ليس لديك حساب؟ </span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('register');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    disabled={isLoading}
                  >
                    إنشاء حساب جديد
                  </button>
                </div>
              )}

              {!canRegister && (
                <div className="text-center pt-4 border-t">
                  <p className="text-gray-500 text-xs">
                    التسجيل معطل. النظام يحتوي على حساب مدير بالفعل.
                  </p>
                </div>
              )}
            </form>
          )}

          {/* Register Form */}
          {viewMode === 'register' && canRegister && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="أحمد محمد"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="admin@example.com"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="0599123456"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-11 pl-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    disabled={isLoading}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  ملاحظة: هذا هو الحساب الأول والأخير الذي يمكن إنشاؤه عبر هذه الصفحة. بعد إنشاء هذا الحساب، سيتم تعطيل التسجيل تلقائياً.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 ml-2" />
                    إنشاء الحساب
                  </>
                )}
              </button>

              <div className="text-center pt-4 border-t">
                <span className="text-gray-600 text-sm">لديك حساب بالفعل؟ </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  disabled={isLoading}
                >
                  تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* Registration Disabled Message */}
          {viewMode === 'register' && !canRegister && (
            <div className="p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900 mb-2">التسجيل معطل</h3>
                <p className="text-red-800 text-sm mb-4">
                  النظام يحتوي على حساب مدير بالفعل. لا يمكن إنشاء حسابات إضافية عبر هذه الصفحة.
                </p>
                <button
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {viewMode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="admin@example.com"
                    disabled={isLoading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  سنرسل لك رابط لإعادة تعيين كلمة المرور
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 ml-2" />
                    إرسال رابط إعادة التعيين
                  </>
                )}
              </button>

              <div className="text-center pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  disabled={isLoading}
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
