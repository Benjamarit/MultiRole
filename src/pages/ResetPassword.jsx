import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import apiClient from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import AuthLayout from '../layouts/AuthLayout';
import AuthPasswordField from '../components/AuthPasswordField';
import Button from '../components/Button';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [verification, setVerification] = useState({ token, status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const status = !token ? 'missing' : verification.token === token ? verification.status : 'loading';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiClient.get('/auth/verify-reset-token', { params: { token } }).then(response => {
      if (!cancelled) setVerification({ token, status: response.data?.valid ? 'valid' : 'invalid' });
    }).catch(() => {
      if (!cancelled) setVerification({ token, status: 'unavailable' });
    });
    return () => { cancelled = true; };
  }, [token, retry]);

  const handleSubmit = async event => {
    event.preventDefault();
    if (busy || status !== 'valid') return;
    setError('');
    if (newPassword.length < 8) {
      setError(t('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'Password must be at least 8 characters')); return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'Passwords do not match')); return;
    }
    setBusy(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      setSuccess(true); setNewPassword(''); setConfirmPassword('');
      navigate('/reset-password', { replace: true });
    } catch (err) {
      setError(err.message || t('ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง', 'Unable to reset your password. Please try again.'));
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('ลิงก์')) setVerification({ token, status: 'invalid' });
    } finally { setBusy(false); }
  };
  const failedLink = status === 'missing' || status === 'invalid';
  const Icon = success ? CheckCircle2 : KeyRound;
  return <AuthLayout>
    <section aria-labelledby="reset-title" className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 lg:ml-auto lg:mr-0">
      <div className="p-6 sm:p-8">
        <span className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border ${success ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <h1 id="reset-title" className="text-2xl font-bold tracking-tight">{success ? t('เปลี่ยนรหัสผ่านสำเร็จ', 'Password updated') : t('ตั้งรหัสผ่านใหม่', 'Set a new password')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{success ? t('เข้าสู่ระบบด้วยรหัสผ่านใหม่เพื่อใช้งานต่อ', 'Sign in with your new password to continue.') : t('กำหนดรหัสผ่านใหม่สำหรับบัญชี MultiRole ของคุณ', 'Choose a new password for your MultiRole account.')}</p>
        {success ? <Link to="/login" className="mt-6 flex justify-center rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-xs hover:from-blue-700 hover:to-blue-800">{t('เข้าสู่ระบบ', 'Sign in')}</Link> : status === 'loading' ? <div role="status" className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-600" aria-hidden="true" />{t('กำลังตรวจสอบลิงก์…', 'Checking your reset link…')}</div> : failedLink || status === 'unavailable' ? <div className="mt-6 space-y-5">
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{status === 'unavailable' ? t('ยังตรวจสอบลิงก์ไม่ได้', 'Unable to check this link') : t('ไม่สามารถใช้ลิงก์นี้ได้', 'This link cannot be used')}</p><p className="mt-1">{status === 'unavailable' ? t('กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง', 'Check your connection and try again.') : status === 'missing' ? t('เปิดลิงก์จากอีเมลรีเซ็ตรหัสผ่าน หรือขอลิงก์ใหม่ด้านล่าง', 'Open the reset link from your email, or request a new one below.') : t('ลิงก์อาจหมดอายุหรือถูกใช้แล้ว กรุณาขอลิงก์ใหม่', 'The link may have expired or already been used. Please request a new one.')}</p></div></div>
          {status === 'unavailable' ? <Button className="w-full py-3" onClick={() => { setVerification({ token, status: 'loading' }); setRetry(value => value + 1); }}>{t('ลองอีกครั้ง', 'Try again')}</Button> : <Link to="/login" state={{ forgotPassword: true }} className="flex justify-center rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-xs hover:from-blue-700 hover:to-blue-800">{t('ขอลิงก์ตั้งรหัสผ่านใหม่', 'Request a new reset link')}</Link>}
        </div> : <>
          {error && <div id="reset-error" role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
          <form onSubmit={handleSubmit} className="mt-6" aria-busy={busy} aria-describedby={error ? 'reset-error' : undefined}>
            <fieldset disabled={busy} className="min-w-0 space-y-5"><legend className="sr-only">{t('ข้อมูลรหัสผ่านใหม่', 'New password details')}</legend>
              <AuthPasswordField id="reset-password" label={t('รหัสผ่านใหม่', 'New password')} value={newPassword} onChange={event => setNewPassword(event.target.value)} hint={t('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters')} />
              <AuthPasswordField id="reset-confirm-password" label={t('ยืนยันรหัสผ่านใหม่', 'Confirm new password')} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              <Button type="submit" className="w-full py-3" isLoading={busy} disabled={busy}><span aria-live="polite">{busy ? t('กำลังบันทึก…', 'Saving…') : t('บันทึกรหัสผ่านใหม่', 'Save new password')}</span></Button>
              <p className="text-center text-xs leading-5 text-slate-500">{t('ลิงก์มีอายุ 30 นาที และใช้ได้ครั้งเดียว', 'This link expires in 30 minutes and can be used once.')}</p>
            </fieldset>
          </form>
        </>}
      </div>
      {!success && <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center sm:px-8"><Link to="/login" className="inline-flex items-center gap-2 rounded text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('กลับไปเข้าสู่ระบบ', 'Back to sign in')}</Link></div>}
    </section>
  </AuthLayout>;
}
