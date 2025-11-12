import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatus {
  isConnected: boolean;
  lastSuccessfulCheck?: string;
  lastError?: {
    message: string;
    timestamp: string;
  };
  isActive: boolean;
}

interface ConnectionStatusBannerProps {
  status: ConnectionStatus;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({ status }) => {
  if (!status.isActive) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3 space-x-reverse">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-orange-900 mb-1">خدمة SMS غير مفعلة</h4>
            <p className="text-sm text-orange-700">
              يرجى تفعيل الخدمة بعد التأكد من صحة بيانات الاتصال
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!status.isConnected && status.lastError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3 space-x-reverse">
          <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-red-900">فشل الاتصال بخادم TweetSMS</h4>
              <span className="text-xs text-red-600 flex items-center">
                <Clock className="w-3 h-3 ml-1" />
                {new Date(status.lastError.timestamp).toLocaleTimeString('ar-SA')}
              </span>
            </div>
            <p className="text-sm text-red-700">{status.lastError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status.isConnected && status.lastSuccessfulCheck) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3 space-x-reverse">
          <Wifi className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-green-900">الاتصال بخادم TweetSMS يعمل بشكل صحيح</h4>
              <span className="text-xs text-green-600 flex items-center">
                <CheckCircle className="w-3 h-3 ml-1" />
                آخر فحص: {new Date(status.lastSuccessfulCheck).toLocaleTimeString('ar-SA')}
              </span>
            </div>
            <p className="text-sm text-green-700">
              جميع الخدمات تعمل بشكل طبيعي
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
