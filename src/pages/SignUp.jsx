import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Mail, User, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AuthLayout from '../layouts/AuthLayout';
import AuthPasswordField from '../components/AuthPasswordField';
import Button from '../components/Button';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async event => {
    event.preventDefault();
    if (isLoading) return;
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'Please fill in all required fields')); return;
    }
    if (password.length < 8) {
      setError(t('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', 'Password must be at least 8 characters')); return;
    }
    if (password !== confirmPassword) {
      setError(t('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'Passwords do not match')); return;
    }
    setIsLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      toast.success(t('สมัครสมาชิกสำเร็จ กรุณายืนยันอีเมล', 'Account created. Please verify your email.'));
      navigate('/verify-email', { replace: true, state: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err.message || t('สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'Registration failed. Please try again.'));
    } finally { setIsLoading(false); }
  };
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-2xs transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50';
  return <AuthLayout>
    <section aria-labelledby="signup-title" className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 lg:ml-auto lg:mr-0">
      <div className="p-6 sm:p-8">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600"><UserPlus className="h-5 w-5" aria-hidden="true" /></span>
        <h1 id="signup-title" className="text-2xl font-bold tracking-tight">{t('สร้างบัญชีใหม่', 'Create an account')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t('สมัครเพื่อจัดการโครงการหรือร่วมเป็นกรรมการ', 'Create an account to manage projects or join as a judge.')}</p>
        {error && <div id="signup-error" role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div>}
        <form onSubmit={handleSubmit} className="mt-6" aria-busy={isLoading} aria-describedby={error ? 'signup-error' : undefined}>
          <fieldset disabled={isLoading} className="min-w-0 space-y-5">
            <legend className="sr-only">{t('ข้อมูลสมัครสมาชิก', 'Registration details')}</legend>
            <div><label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-slate-700">{t('ชื่อ-นามสกุล', 'Full name')}</label><div className="relative"><User className="pointer-events-none absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" /><input id="signup-name" name="name" type="text" autoComplete="name" required maxLength={150} value={name} onChange={event => setName(event.target.value)} placeholder={t('กรอกชื่อและนามสกุล', 'Enter your full name')} className={inputClass} /></div></div>
            <div><label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-slate-700">{t('อีเมล', 'Email')}</label><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" aria-hidden="true" /><input id="signup-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" className={inputClass} /></div></div>
            <AuthPasswordField id="signup-password" label={t('รหัสผ่าน', 'Password')} value={password} onChange={event => setPassword(event.target.value)} hint={t('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters')} />
            <AuthPasswordField id="signup-confirm-password" label={t('ยืนยันรหัสผ่าน', 'Confirm password')} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
            <Button type="submit" className="w-full py-3" isLoading={isLoading} disabled={isLoading}><span aria-live="polite">{isLoading ? t('กำลังสร้างบัญชี…', 'Creating account…') : t('สร้างบัญชี', 'Create account')}</span>{!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}</Button>
            <p className="text-center text-xs leading-5 text-slate-500">{t('ระบบจะส่งลิงก์ยืนยันบัญชีไปยังอีเมลของคุณ', 'We will email you a link to verify your account.')}</p>
          </fieldset>
        </form>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-center sm:px-8"><p className="text-sm text-slate-500">{t('มีบัญชีอยู่แล้ว?', 'Already have an account?')} <Link to="/login" className="ml-1 rounded font-semibold text-blue-700 hover:text-blue-800">{t('เข้าสู่ระบบ', 'Sign in')}</Link></p></div>
    </section>
  </AuthLayout>;
}
