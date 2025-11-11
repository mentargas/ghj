import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Shield, Clock, MessageCircle } from 'lucide-react';
import { Modal, Button, Input } from '../ui';

interface PINVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  beneficiaryName: string;
  nationalId: string;
  maxAttempts?: number;
  lockoutDuration?: number;
}

export default function PINVerificationModal({
  isOpen,
  onClose,
  beneficiaryName,
  nationalId,
  onSuccess,
  maxAttempts = 5,
  lockoutDuration = 30
}: PINVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLocked && lockoutTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const lockTime = lockoutTime.getTime();
        const remaining = Math.max(0, Math.ceil((lockTime - now) / 1000));

        setRemainingTime(remaining);

        if (remaining === 0) {
          setIsLocked(false);
          setAttempts(0);
          setError('');
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, lockoutTime]);

  const handlePinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
    setError('');
  };

  const handleSubmit = async () => {
    if (isLocked) {
      setError(`الحساب مقفل. يرجى الانتظار ${formatTime(remainingTime)}`);
      return;
    }

    if (pin.length !== 6) {
      setError('يجب إدخال 6 أرقام');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      onSuccess(pin);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        const lockTime = new Date(Date.now() + lockoutDuration * 60 * 1000);
        setIsLocked(true);
        setLockoutTime(lockTime);
        setError(`تم قفل الحساب لمدة ${lockoutDuration} دقيقة بسبب المحاولات الفاشلة`);
      } else {
        setError(
          err.message ||
            `كلمة المرور غير صحيحة. المحاولات المتبقية: ${maxAttempts - newAttempts}`
        );
      }
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    if (!isVerifying) {
      setPin('');
      setError('');
      setShowPin(false);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 6 && !isLocked) {
      handleSubmit();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContactSupport = () => {
    const phone = '+970599505699';
    const message = encodeURIComponent(
      `مرحباً، أحتاج مساعدة في استرجاع كلمة المرور لرقم الهوية: ${nationalId}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">أدخل كلمة المرور</h2>
        <p className="text-gray-600">
          مرحباً <strong>{beneficiaryName}</strong>
        </p>
        <p className="text-sm text-gray-500 mt-1">رقم الهوية: {nationalId}</p>
      </div>

      {isLocked ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6 text-center">
          <Clock className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">الحساب مقفل مؤقتاً</h3>
          <p className="text-red-800 mb-4">
            تم قفل الحساب بسبب المحاولات الفاشلة المتكررة
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">الوقت المتبقي</p>
            <p className="text-3xl font-bold text-red-600 font-mono">
              {formatTime(remainingTime)}
            </p>
          </div>
          <p className="text-sm text-red-700">
            يمكنك المحاولة مرة أخرى بعد انتهاء الوقت
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">لعرض التفاصيل الكاملة</p>
                <p className="text-xs">أدخل كلمة المرور المكونة من 6 أرقام التي قمت بإنشائها سابقاً</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              كلمة المرور (6 أرقام)
            </label>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="• • • • • •"
                maxLength={6}
                dir="ltr"
                className="text-3xl tracking-widest text-center font-mono pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {attempts > 0 && attempts < maxAttempts && (
              <div className="mt-2 text-sm text-orange-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>المحاولات المتبقية: {maxAttempts - attempts} من {maxAttempts}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isVerifying}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={pin.length !== 6 || isVerifying}
              className="flex-1"
            >
              {isVerifying ? 'جاري التحقق...' : 'تأكيد'}
            </Button>
          </div>
        </>
      )}

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={handleContactSupport}
          className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          <MessageCircle className="w-4 h-4" />
          نسيت كلمة المرور؟ تواصل مع الدعم
        </button>
      </div>
    </Modal>
  );
}
