import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, Shield } from 'lucide-react';
import { Modal, Button, Input } from '../ui';

interface PINCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  beneficiaryName: string;
  nationalId: string;
}

export default function PINCreationModal({
  isOpen,
  onClose,
  onSuccess,
  beneficiaryName,
  nationalId
}: PINCreationModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const validatePIN = (value: string): string | null => {
    if (!/^\d{6}$/.test(value)) {
      return 'كلمة المرور يجب أن تكون 6 أرقام فقط';
    }
    if (/^(\d)\1{5}$/.test(value)) {
      return 'كلمة المرور ضعيفة جداً (أرقام متكررة)';
    }
    if (value === '123456' || value === '654321') {
      return 'كلمة المرور ضعيفة جداً (تسلسل بسيط)';
    }
    return null;
  };

  const handlePinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
    setError('');
  };

  const handleConfirmPinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(digitsOnly);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');

    const pinError = validatePIN(pin);
    if (pinError) {
      setError(pinError);
      return;
    }

    if (pin !== confirmPin) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    setIsCreating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onSuccess(pin);
    } catch (err) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setConfirmPin('');
    setError('');
    setShowPin(false);
    setShowConfirmPin(false);
    onClose();
  };

  const pinStrength = (): string => {
    if (pin.length < 6) return '';
    if (/^(\d)\1{5}$/.test(pin)) return 'ضعيف جداً';
    if (pin === '123456' || pin === '654321') return 'ضعيف جداً';
    if (/^(\d)\1{3,}/.test(pin)) return 'ضعيف';
    return 'جيد';
  };

  const getStrengthColor = (): string => {
    const strength = pinStrength();
    if (strength === 'ضعيف جداً') return 'text-red-600';
    if (strength === 'ضعيف') return 'text-orange-600';
    if (strength === 'جيد') return 'text-green-600';
    return '';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إنشاء كلمة مرور</h2>
        <p className="text-gray-600">
          مرحباً <strong>{beneficiaryName}</strong>
        </p>
        <p className="text-sm text-gray-500 mt-1">رقم الهوية: {nationalId}</p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">لماذا كلمة المرور؟</p>
            <ul className="space-y-1 text-xs">
              <li>• لحماية بياناتك الشخصية من الوصول غير المصرح به</li>
              <li>• ستحتاجها لاحقاً لعرض التفاصيل الكاملة</li>
              <li>• احفظها في مكان آمن ولا تشاركها مع أحد</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            كلمة المرور (6 أرقام)
          </label>
          <div className="relative">
            <Input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="أدخل 6 أرقام"
              maxLength={6}
              dir="ltr"
              className="text-2xl tracking-widest text-center font-mono pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {pin.length === 6 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-600">قوة كلمة المرور:</span>
              <span className={`text-sm font-semibold ${getStrengthColor()}`}>
                {pinStrength()}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <Input
              type={showConfirmPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => handleConfirmPinChange(e.target.value)}
              placeholder="أعد إدخال 6 أرقام"
              maxLength={6}
              dir="ltr"
              className="text-2xl tracking-widest text-center font-mono pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPin.length === 6 && (
            <div className="mt-2 flex items-center gap-2">
              {pin === confirmPin ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-semibold">متطابقة</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600 font-semibold">غير متطابقة</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
        <p className="text-xs text-yellow-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>تنبيه مهم:</strong> احتفظ بكلمة المرور في مكان آمن. في حال نسيانها، ستحتاج للتواصل مع الدعم لاسترجاع الوصول.
          </span>
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isCreating}
          className="flex-1"
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={pin.length !== 6 || confirmPin.length !== 6 || isCreating}
          className="flex-1"
        >
          {isCreating ? 'جاري الإنشاء...' : 'إنشاء كلمة المرور'}
        </Button>
      </div>
    </Modal>
  );
}
