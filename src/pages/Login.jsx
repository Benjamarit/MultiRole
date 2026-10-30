import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const [isForgotMode, setIsForgotMode] = useState(Boolean(location.state?.forgotPassword));
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async event => {
    event.preventDefault();
    if (isLoading) return;
    setError('');
    if (!email.trim() || !password) {
      setError(t('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน', 'Please enter both email and password'));
      return;
    }
    setIsLoading(true);
    try {
      const backendUser = await login({ email: email.trim().toLowerCase(), password });
      navigate(backendUser.role === 'SYSTEM_ADMIN' ? '/admin/users' : '/workspace');
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { email: err.response.data.email } });
        return;
      }
      setError(err.message !== 'Invalid credentials' ? err.message : t('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Incorrect email or password'));
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async event => {
    event.preventDefault();
    if (isLoading) return;
    setError('');
    if (!email.trim()) {
      setError(t('กรุณากรอกอีเมลที่ลงทะเบียนไว้', 'Please enter your registered email'));
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      toast.success(typeof response.data === 'string' ? response.data : response.data.message);
      setIsForgotMode(false);
      setPassword('');
      setShowPassword(false);
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const changeMode = forgot => {
    if (isLoading) return;
    setIsForgotMode(forgot);
    setError('');
    setShowPassword(false);
  };
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 text-sm text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50';
  return <AuthLayout>
      <section aria-labelledby="login-title" className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 lg:ml-auto lg:mr-0">
        <div className="p-6 sm:p-8">
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
          <h1 id="login-title" className="text-2xl font-bold tracking-tight">{isForgotMode ? t('ลืมรหัสผ่าน', 'Forgot password') : t('เข้าสู่ระบบ', 'Sign in')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isForgotMode ? t('กรอกอีเมลที่ลงทะเบียนเพื่อรับลิงก์ตั้งรหัสผ่านใหม่', 'Enter your registered email to receive a password reset link.') : t('กรอกข้อมูลบัญชีเพื่อเข้าใช้งาน', 'Enter your account details to continue.')}</p>

          {error && <div id="login-error" role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}

          <form className="mt-6" onSubmit={isForgotMode ? handleForgotPassword : handleLogin} aria-busy={isLoading} aria-describedby={error ? 'login-error' : undefined}>
            <fieldset disabled={isLoading} className="min-w-0 space-y-5">
              <legend className="sr-only">{isForgotMode ? t('ขอลิงก์ตั้งรหัสผ่านใหม่', 'Request a password reset link') : t('ข้อมูลเข้าสู่ระบบ', 'Sign-in details')}</legend>
              <div><label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">{t('อีเมล', 'Email')}</label><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" /><input id="login-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" className={`${inputClass} pr-4`} /></div></div>
              {!isForgotMode && <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="login-password" className="text-sm font-semibold text-slate-700">{t('รหัสผ่าน', 'Password')}</label><button type="button" onClick={() => changeMode(true)} className="rounded text-xs font-semibold text-blue-700 hover:text-blue-800">{t('ลืมรหัสผ่าน?', 'Forgot password?')}</button></div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder={t('กรอกรหัสผ่าน', 'Enter your password')} className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword(previous => !previous)} aria-label={showPassword ? t('ซ่อนรหัสผ่าน', 'Hide password') : t('แสดงรหัสผ่าน', 'Show password')} aria-pressed={showPassword} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">{showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}</button></div></div>}
              <Button type="submit" className="w-full py-3" isLoading={isLoading} disabled={isLoading}><span aria-live="polite">{isLoading ? isForgotMode ? t('กำลังส่งลิงก์…', 'Sending link…') : t('กำลังเข้าสู่ระบบ…', 'Signing in…') : isForgotMode ? t('ส่งลิงก์ตั้งรหัสผ่านใหม่', 'Send reset link') : t('เข้าสู่ระบบ', 'Sign in')}</span>{!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}</Button>
            </fieldset>
          </form>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center sm:px-8">{isForgotMode ? <button type="button" disabled={isLoading} onClick={() => changeMode(false)} className="inline-flex items-center gap-2 rounded text-sm font-semibold text-slate-600 hover:text-blue-700 disabled:opacity-50"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('กลับไปเข้าสู่ระบบ', 'Back to sign in')}</button> : <p className="text-sm text-slate-500">{t('ยังไม่มีบัญชี?', 'New to MultiRole?')} <Link to="/signup" className="ml-1 rounded font-semibold text-blue-700 hover:text-blue-800">{t('สมัครสมาชิก', 'Create an account')}</Link></p>}</div>
      </section>
  </AuthLayout>;
}
