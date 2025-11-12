import { useState, useEffect } from 'react';
import { createTweetSmsService, validateMobileNumber, validateSenderName, validateMessage } from '../../services/tweetSmsService';

const TWEETSMS_API_KEY = '04e56a90592de205c8c0938efc7b52a5f564911f9f12beeb0258271897414f59';

export default function TweetSmsTestPage() {
  const [sender, setSender] = useState('Wefrh App');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [messageInfo, setMessageInfo] = useState({ length: 0, parts: 1 });

  const smsService = createTweetSmsService(TWEETSMS_API_KEY);

  useEffect(() => {
    loadBalance();
  }, []);

  useEffect(() => {
    if (message) {
      const hasArabic = /[\u0600-\u06FF]/.test(message);
      const maxLength = hasArabic ? 70 : 160;
      const parts = Math.ceil(message.length / maxLength) || 1;
      setMessageInfo({ length: message.length, parts });
    } else {
      setMessageInfo({ length: 0, parts: 1 });
    }
  }, [message]);

  const loadBalance = async () => {
    setBalanceLoading(true);
    try {
      const response = await smsService.checkBalance();
      if (response.success && response.balance !== undefined) {
        setBalance(response.balance);
      } else {
        console.error('فشل تحميل الرصيد:', response.errorMessage);
      }
    } catch (error) {
      console.error('خطأ في تحميل الرصيد:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    const mobileValidation = validateMobileNumber(recipient);
    if (!mobileValidation.valid) {
      setResult({ success: false, errorMessageAr: mobileValidation.error });
      return;
    }

    const senderValidation = validateSenderName(sender);
    if (!senderValidation.valid) {
      setResult({ success: false, errorMessageAr: senderValidation.error });
      return;
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.valid) {
      setResult({ success: false, errorMessageAr: messageValidation.error });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await smsService.sendSMS({
        to: recipient,
        message: message,
        sender: sender
      });

      setResult(response);

      if (response.success) {
        setSender('Wefrh App');
        setRecipient('');
        setMessage('');
        loadBalance();
      }
    } catch (error) {
      setResult({
        success: false,
        errorMessageAr: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0066cc 0%, #004d99 100%)',
        color: 'white',
        padding: '32px 24px',
        borderRadius: '12px',
        marginBottom: '32px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>
            اختبار TweetSMS API
          </h1>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            backdropFilter: 'blur(10px)'
          }}>
            {balanceLoading ? (
              'جاري تحميل الرصيد...'
            ) : balance !== null ? (
              `الرصيد المتاح: ${balance.toFixed(2)} ريال`
            ) : (
              'غير متاح'
            )}
          </div>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
            إرسال رسالة جديدة
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            اختبر إرسال الرسائل القصيرة عبر TweetSMS API
          </p>
        </div>

        {result && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            borderRight: result.success ? '4px solid #10b981' : '4px solid #ef4444',
            background: result.success ? '#d1fae5' : '#fee2e2',
            color: result.success ? '#059669' : '#dc2626'
          }}>
            {result.success ? (
              <div>
                <strong>تم إرسال الرسالة بنجاح!</strong>
                <br />
                معرف الرسالة: {result.smsId}
                <br />
                الرقم: {result.mobile}
              </div>
            ) : (
              <div>
                <strong>فشل إرسال الرسالة</strong>
                <br />
                {result.errorMessageAr || result.errorMessage}
                {result.errorCode && (
                  <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                    رمز الخطأ: {result.errorCode}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendSMS}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              اسم المرسل
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Wefrh App"
              maxLength={11}
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: 'white'
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              الحد الأقصى 11 حرف
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              رقم المستقبل
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="972592106099"
              required
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: 'white'
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              مثال: 972592106099 أو 0592106099
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              نص الرسالة
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              required
              rows={5}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                background: 'white',
                resize: 'vertical'
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {messageInfo.length} حرف
              {messageInfo.parts > 1 && ` (${messageInfo.parts} رسائل)`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0066cc',
                color: 'white',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSender('Wefrh App');
                setRecipient('');
                setMessage('');
                setResult(null);
              }}
              style={{
                padding: '16px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#e5e7eb',
                color: '#374151'
              }}
            >
              مسح النموذج
            </button>
          </div>
        </form>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          ملاحظات هامة
        </h3>
        <ul style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.8', paddingRight: '20px' }}>
          <li>تأكد من أن رقم الهاتف بصيغة صحيحة (يبدأ بـ 972 أو 0)</li>
          <li>اسم المرسل يجب ألا يتجاوز 11 حرف</li>
          <li>الرسالة العربية تحتوي على 70 حرف كحد أقصى للرسالة الواحدة</li>
          <li>الرسالة الإنجليزية تحتوي على 160 حرف كحد أقصى للرسالة الواحدة</li>
          <li>يتم حفظ سجل جميع الرسائل في قاعدة البيانات</li>
        </ul>
      </div>
    </div>
  );
}
