import React from 'react';
import { User, Package, Check, Clock, Truck, Eye, Lock, Calendar } from 'lucide-react';
import { Card, Button, Badge } from './ui';

interface PublicSearchResultProps {
  beneficiary: {
    id: string;
    name: string;
    national_id: string;
    status: string;
  };
  inDeliveryPackage?: Array<{
    id: string;
    name: string;
    status: string;
    tracking_number: string | null;
    scheduled_delivery_date: string | null;
    created_at: string;
  }>;
  hasPIN: boolean;
  onViewDetails: () => void;
  onCreatePIN: () => void;
}

export default function PublicSearchResult({
  beneficiary,
  inDeliveryPackage,
  hasPIN,
  onViewDetails,
  onCreatePIN
}: PublicSearchResultProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' }> = {
      active: { label: 'نشط', variant: 'success' },
      pending: { label: 'قيد المراجعة', variant: 'warning' },
      suspended: { label: 'معلق', variant: 'error' }
    };

    const config = statusConfig[status] || { label: status, variant: 'info' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const packageToShow = inDeliveryPackage && inDeliveryPackage.length > 0 ? inDeliveryPackage[0] : null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{beneficiary.name}</h2>
              <p className="text-blue-100 text-sm">رقم الهوية: {beneficiary.national_id}</p>
            </div>
            <div>{getStatusBadge(beneficiary.status)}</div>
          </div>
        </div>

        <div className="p-6">
          {packageToShow ? (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        طرد قيد التوصيل
                      </h3>
                      <p className="text-sm text-gray-600">{packageToShow.name}</p>
                    </div>
                    <Badge variant="warning" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      قيد التوصيل
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {packageToShow.tracking_number && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <p className="text-xs text-gray-600 mb-1">رقم التتبع</p>
                        <p className="text-sm font-bold text-gray-900 font-mono">
                          {packageToShow.tracking_number}
                        </p>
                      </div>
                    )}
                    {packageToShow.scheduled_delivery_date && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          التاريخ المتوقع للتسليم
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatDate(packageToShow.scheduled_delivery_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>طردك في الطريق إليك! سيتم التواصل معك قريباً لتحديد موعد التسليم</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-6 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">لا يوجد طرد قيد التوصيل حالياً</h3>
              <p className="text-sm text-gray-600">
                سيتم إخطارك عند توفر طرد جديد
              </p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">
                    هل تريد عرض كافة التفاصيل؟
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">
                    {hasPIN
                      ? 'يمكنك الآن عرض جميع بياناتك الشخصية وسجل الطرود الكامل'
                      : 'قم بإنشاء كلمة مرور من 6 أرقام لحماية بياناتك والوصول إلى التفاصيل الكاملة'}
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600 mb-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>جميع البيانات الشخصية</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>سجل الطرود الكامل (السابقة والحالية)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>إمكانية تحديث البيانات</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>سجل النشاط والإشعارات</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {hasPIN ? (
              <Button
                onClick={onViewDetails}
                size="lg"
                className="w-full"
                icon={Eye}
                iconPosition="right"
              >
                عرض كافة التفاصيل
              </Button>
            ) : (
              <Button
                onClick={onCreatePIN}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                icon={Lock}
                iconPosition="right"
              >
                إنشاء كلمة مرور وعرض التفاصيل
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <h4 className="font-bold text-gray-900 mb-2">هل تحتاج مساعدة؟</h4>
          <p className="text-sm text-gray-600 mb-4">
            فريقنا جاهز لمساعدتك على مدار الساعة
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const phone = '+970599505699';
              const message = encodeURIComponent(
                `مرحباً، أحتاج مساعدة بخصوص رقم الهوية: ${beneficiary.national_id}`
              );
              window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            تواصل عبر واتساب
          </Button>
        </div>
      </Card>
    </div>
  );
}
