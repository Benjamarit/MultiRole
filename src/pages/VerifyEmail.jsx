import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, MailCheck, Send, Trophy } from 'lucide-react';
import apiClient from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Button from '../components/Button';

export default function VerifyEmail() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState(location.state?.email || '');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const verify = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await apiClient.post('/auth/verify-email', { token });
      setVerified(true);
      navigate('/verify-email', { replace: true, state: { email } });
    } catch (err) {
      setError(err.message);
      if (err.response?.status === 400) navigate('/verify-email', { replace: true, state: { email } });
    } finally { setBusy(false); }
  };
  const resend = async event => {
    event.preventDefault();
    if (busy || seconds > 0) return;
    setBusy(true); setError(''); setSent(false);
    try {
      await apiClient.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
      setSent(true); setSeconds(60);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const Icon = verified ? CheckCircle2 : MailCheck;
  return <div className="flex min-h-dvh flex-col bg-page-background text-slate-900">
    <header className="border-b border-slate-200/80 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5"><Link to="/login" className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700"><Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" /></span><span><span className="block text-lg font-bold">MultiRole</span><span className="block text-[10px] text-slate-500">Evaluation Platform</span></span></Link><LanguageSwitcher /></div></header>
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 py-10">
      <section aria-labelledby="verify-title" className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border ${verified ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
          <h1 id="verify-title" className="text-2xl font-bold">{verified ? t('ยืนยันอีเมลสำเร็จ', 'Email verified') : t('ยืนยันอีเมลของคุณ', 'Verify your email')}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">{verified ? t('บัญชีของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบเพื่อเริ่มใช้งาน', 'Your account is ready. Sign in to get started.') : token ? t('กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเปิดใช้งานบัญชีของคุณ', 'Confirm your email below to activate your account.') : t('เปิดอีเมลจาก MultiRole แล้วกดลิงก์ยืนยันบัญชี ลิงก์มีอายุ 1 ชั่วโมง', 'Open the email from MultiRole and follow the verification link. The link expires in 1 hour.')}</p>
          {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"><AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
          {verified ? <Link to="/login" className="mt-6 flex justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">{t('เข้าสู่ระบบ', 'Sign in')}</Link> : token ? <Button onClick={verify} isLoading={busy} disabled={busy} className="mt-6 w-full py-3">{t('ยืนยันอีเมล', 'Confirm email')}</Button> : <>
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-6 text-slate-600">{t('ยังไม่พบอีเมล? ตรวจสอบโฟลเดอร์สแปมหรือขอส่งลิงก์ใหม่ด้านล่าง', 'No email yet? Check your spam folder or request a new link below.')}</div>
            <form onSubmit={resend} aria-busy={busy} className="mt-6 space-y-4"><div><label htmlFor="verification-email" className="mb-2 block text-sm font-semibold text-slate-700">{t('อีเมลที่ลงทะเบียน', 'Registered email')}</label><input id="verification-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setSent(false); }} placeholder="name@example.com" className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" /></div><Button type="submit" isLoading={busy} disabled={busy || seconds > 0} className="w-full py-3"><Send className="h-4 w-4" aria-hidden="true" />{seconds > 0 ? t(`ส่งใหม่ได้ใน ${seconds} วินาที`, `Resend in ${seconds}s`) : t('ส่งลิงก์ยืนยันอีกครั้ง', 'Resend verification link')}</Button></form>
            {sent && <p role="status" className="mt-4 text-sm leading-6 text-emerald-700">{t('หากบัญชีนี้ยังไม่ได้ยืนยัน ระบบจะส่งลิงก์ให้ กรุณาตรวจสอบอีเมลของคุณ', 'If this account needs verification, a link will be sent. Please check your inbox.')}</p>}
          </>}
        </div>
        {!verified && <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center"><Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('กลับไปเข้าสู่ระบบ', 'Back to sign in')}</Link></div>}
      </section>
    </main>
    <footer className="px-5 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} MultiRole Evaluation Platform</footer>
  </div>;
}
