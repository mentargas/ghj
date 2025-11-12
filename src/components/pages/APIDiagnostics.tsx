import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader, AlertTriangle, Activity, Key, Send, Shield } from 'lucide-react';
import { Button, Card } from '../ui';
import { smsService } from '../../services/smsService';
import { APIErrorHandler } from '../../utils/apiErrorHandler';

interface DiagnosticStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: string;
  suggestion?: string;
}

interface APIDiagnosticsProps {
  apiKey: string;
  senderName: string;
  apiUrl: string;
  onClose: () => void;
}

export const APIDiagnostics: React.FC<APIDiagnosticsProps> = ({
  apiKey,
  senderName,
  apiUrl,
  onClose,
}) => {
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([
    {
      id: 'validate_inputs',
      name: 'التحقق من المدخلات',
      status: 'pending',
    },
    {
      id: 'test_encryption',
      name: 'اختبار التشفير وفك التشفير',
      status: 'pending',
    },
    {
      id: 'test_connection',
      name: 'اختبار الاتصال بخادم TweetSMS',
      status: 'pending',
    },
    {
      id: 'validate_api_key',
      name: 'التحقق من صحة API Key',
      status: 'pending',
    },
    {
      id: 'check_balance',
      name: 'فحص الرصيد المتبقي',
      status: 'pending',
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  const updateStep = (id: string, updates: Partial<DiagnosticStep>) => {
    setDiagnosticSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setOverallStatus('running');

    try {
      updateStep('validate_inputs', { status: 'running' });
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!apiKey || apiKey.trim() === '') {
        updateStep('validate_inputs', {
          status: 'error',
          message: 'API Key مفقود',
          suggestion: 'يرجى إدخال API Key من حساب TweetSMS الخاص بك',
        });
        setOverallStatus('failed');
        setIsRunning(false);
        return;
      }

      if (!senderName || senderName.trim() === '') {
        updateStep('validate_inputs', {
          status: 'error',
          message: 'اسم المرسل مفقود',
          suggestion: 'يرجى إدخال اسم المرسل المسجل في حسابك',
        });
        setOverallStatus('failed');
        setIsRunning(false);
        return;
      }

      updateStep('validate_inputs', {
        status: 'success',
        message: 'جميع المدخلات صحيحة',
      });

      updateStep('test_encryption', { status: 'running' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        const encrypted = await smsService.encrypt(apiKey);
        const decrypted = await smsService.decrypt(encrypted);

        if (decrypted === apiKey) {
          updateStep('test_encryption', {
            status: 'success',
            message: 'التشفير وفك التشفير يعملان بشكل صحيح',
            details: `طول المفتاح المشفر: ${encrypted.length} حرف`,
          });
        } else {
          throw new Error('فشل التحقق من التشفير');
        }
      } catch (error) {
        updateStep('test_encryption', {
          status: 'error',
          message: 'فشل اختبار التشفير',
          suggestion: 'قد يحتوي API Key على أحرف غير صالحة',
        });
        setOverallStatus('failed');
        setIsRunning(false);
        return;
      }

      updateStep('test_connection', { status: 'running' });

      try {
        const startTime = Date.now();
        const response = await APIErrorHandler.fetchWithErrorHandling(
          apiUrl + '/chk_balance',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ api_key: apiKey }),
            timeout: 10000,
            serviceName: 'TweetSMS_Diagnostic',
          }
        );
        const responseTime = Date.now() - startTime;

        updateStep('test_connection', {
          status: 'success',
          message: 'الاتصال بالخادم ناجح',
          details: `زمن الاستجابة: ${responseTime}ms`,
        });

        const result = await response.json();

        updateStep('validate_api_key', { status: 'running' });
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (result.code === 999) {
          updateStep('validate_api_key', {
            status: 'success',
            message: 'API Key صحيح ومقبول',
          });
        } else if (result.code === -110) {
          updateStep('validate_api_key', {
            status: 'error',
            message: 'API Key غير صحيح',
            suggestion: 'يرجى التحقق من API Key ونسخه بشكل صحيح من حساب TweetSMS',
          });
          setOverallStatus('failed');
          setIsRunning(false);
          return;
        } else {
          const errorInfo = APIErrorHandler.translateTweetSMSError(result.code?.toString() || '-999');
          updateStep('validate_api_key', {
            status: 'error',
            message: errorInfo.message,
            suggestion: errorInfo.suggestion,
          });
          setOverallStatus('failed');
          setIsRunning(false);
          return;
        }

        updateStep('check_balance', { status: 'running' });
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (result.balance !== undefined) {
          const balance = parseInt(result.balance);
          updateStep('check_balance', {
            status: 'success',
            message: `الرصيد المتبقي: ${balance.toLocaleString()} رسالة`,
            details: balance < 100 ? 'تحذير: الرصيد منخفض' : 'الرصيد كافٍ',
          });
        } else {
          updateStep('check_balance', {
            status: 'error',
            message: 'فشل الحصول على معلومات الرصيد',
          });
        }

        setOverallStatus('completed');
      } catch (error: any) {
        const userMessage = APIErrorHandler.getUserFriendlyMessage(error);
        const suggestion = APIErrorHandler.getSuggestion(error);

        updateStep('test_connection', {
          status: 'error',
          message: userMessage,
          suggestion: suggestion || 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى',
          details: error.type ? `نوع الخطأ: ${error.type}` : undefined,
        });
        setOverallStatus('failed');
      }
    } catch (error) {
      console.error('Unexpected error in diagnostics:', error);
      setOverallStatus('failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getOverallStatusMessage = () => {
    switch (overallStatus) {
      case 'running':
        return { text: 'جاري تشغيل الفحوصات...', color: 'text-blue-600' };
      case 'completed':
        return { text: 'اكتملت جميع الفحوصات بنجاح!', color: 'text-green-600' };
      case 'failed':
        return { text: 'فشلت بعض الفحوصات', color: 'text-red-600' };
      default:
        return { text: 'جاهز للبدء', color: 'text-gray-600' };
    }
  };

  const statusMessage = getOverallStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">تشخيص اتصال TweetSMS API</h2>
                <p className="text-sm text-gray-600">اختبار شامل لجميع مكونات الاتصال</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            overallStatus === 'completed' ? 'bg-green-50 border-green-200' :
            overallStatus === 'failed' ? 'bg-red-50 border-red-200' :
            overallStatus === 'running' ? 'bg-blue-50 border-blue-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <p className={`font-medium ${statusMessage.color}`}>
              {statusMessage.text}
            </p>
          </div>

          <div className="space-y-4">
            {diagnosticSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all ${
                  step.status === 'success' ? 'bg-green-50 border-green-200' :
                  step.status === 'error' ? 'bg-red-50 border-red-200' :
                  step.status === 'running' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {step.name}
                      </p>
                    </div>
                    {step.message && (
                      <p className={`text-sm ${
                        step.status === 'error' ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {step.message}
                      </p>
                    )}
                    {step.details && (
                      <p className="text-xs text-gray-600 mt-1">{step.details}</p>
                    )}
                    {step.suggestion && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-start space-x-2 space-x-reverse">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-800">{step.suggestion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3 space-x-reverse pt-4 border-t">
            <Button
              variant="primary"
              icon={Activity}
              iconPosition="right"
              onClick={runDiagnostics}
              disabled={isRunning}
              loading={isRunning}
            >
              {overallStatus === 'idle' ? 'بدء الفحص' : 'إعادة الفحص'}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isRunning}>
              إغلاق
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
