import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  Trophy,
  ShieldCheck,
  Award,
  ArrowLeft,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getRegisteredUsers, updateRegisteredUser } from '../context/authStore';

const SYSTEM_ADMIN = {
  email: 'admin@example.com',
  password: '1234',
  name: 'ดร.สมชาย ใจดี',
  role: 'SYSTEM_ADMIN',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, tDesc } = useLanguage();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(
        t('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน', 'Please enter both email and password')
      );
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (email === SYSTEM_ADMIN.email && password === SYSTEM_ADMIN.password) {
        const adminUser = { ...SYSTEM_ADMIN };
        delete adminUser.password;
        login(adminUser);
        navigate('/admin/users');
        return;
      }

      const registeredUsers = getRegisteredUsers();
      const matchedUser = registeredUsers.find(
        (u) => u.email === email && u.password === password
      );

      if (matchedUser) {
        if (matchedUser.status === 'Suspended') {
          throw new Error(
            t('บัญชีนี้ถูกระงับการใช้งาน', 'This account has been suspended')
          );
        }
        const publicUser = { ...matchedUser };
        delete publicUser.password;
        login(publicUser);
        navigate('/workspace');
        return;
      }

      throw new Error('Invalid credentials');
    } catch (err) {
      setError(
        err.message !== 'Invalid credentials'
          ? err.message
          : t('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Incorrect email or password')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError(
        t('กรุณากรอกอีเมลที่ต้องการขอรหัสผ่านใหม่', 'Please enter your registered email')
      );
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const registeredUsers = getRegisteredUsers();
      const userExists = registeredUsers.find((u) => u.email === email);

      if (userExists) {
        updateRegisteredUser(email, { resetRequested: true });
        toast.success(
          t(
            'ส่งคำขอสำเร็จ! โปรดติดต่อ System Admin เพื่อรับรหัสผ่านใหม่',
            'Request sent! Please contact System Admin for your new password.'
          )
        );
        setIsForgotMode(false);
        setPassword('');
      } else {
        throw new Error(t('ไม่พบอีเมลนี้ในระบบ', 'Email not found in system'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="relative hidden items-center justify-center overflow-hidden bg-slate-900 lg:flex lg:w-1/2">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 opacity-20 mix-blend-multiply blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600 opacity-20 mix-blend-multiply blur-[120px]" />

        <div className="relative z-10 max-w-lg p-12">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xs">
            <Trophy className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
          </div>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            <Sparkles className="h-3.5 w-3.5" /> MultiRole Evaluation Suite
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white">
            Competition Evaluation <br />
            <span className="text-blue-400">Management System</span>
          </h1>

          <p className="mb-10 text-base leading-relaxed text-slate-300">
            {tDesc(
              'ระบบบริหารจัดการและประเมินผลการแข่งขันอย่างเป็นทางการ มุ่งเน้นความโปร่งใส แม่นยำ และรองรับหลายบทบาทในบัญชีเดียว',
              'Official competition management and evaluation platform designed for transparency, accuracy, and seamless multi-role collaboration.'
            )}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'มาตรฐานการประเมินที่โปร่งใสและตรวจสอบได้',
                  'Transparent and auditable evaluation workflow'
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <Award className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'รองรับเกณฑ์การให้คะแนนและการเปรียบเทียบหลายรูปแบบ',
                  'Dynamic scoring criteria & side-by-side matrix evaluation'
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-12 text-xs text-slate-500">
          © {new Date().getFullYear()} MultiRole CE System. All rights reserved.
        </div>
      </div>

      <div className="relative flex min-h-screen w-full flex-col justify-center bg-slate-50 p-6 sm:p-12 lg:w-1/2 lg:bg-white">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-md space-y-7 pt-8 sm:pt-0">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg lg:hidden">
              <Trophy className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {isForgotMode
                ? t('รีเซ็ตรหัสผ่าน', 'Reset Password')
                : t('เข้าสู่ระบบ', 'Sign In')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {isForgotMode
                ? t(
                    'กรอกอีเมลที่ลงทะเบียนไว้ ระบบจะแจ้งไปยังผู้ดูแลระบบเพื่อออกรหัสผ่านใหม่',
                    'Enter your registered email to request a password reset from the System Admin.'
                  )
                : t(
                    'กรอกข้อมูลบัญชีของคุณเพื่อเข้าสู่ระบบบริหารจัดการการแข่งขัน',
                    'Enter your credentials to access your competition workspace.'
                  )}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex-1 text-sm font-medium text-red-700">{error}</div>
            </div>
          )}

          {isForgotMode ? (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('อีเมล', 'Email')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t('ส่งคำขอรีเซ็ตรหัสผ่าน', 'Send Reset Request')}{' '}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setError('');
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />{' '}
                {t('กลับไปหน้าเข้าสู่ระบบ', 'Back to Sign In')}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('อีเมล', 'Email')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    {t('รหัสผ่าน', 'Password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                    }}
                    className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
                  >
                    {t('ลืมรหัสผ่าน?', 'Forgot password?')}
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('เข้าสู่ระบบ', 'Sign In')
                )}
              </button>
            </form>
          )}

          {!isForgotMode && (
            <div className="space-y-4 border-t border-slate-200 pt-5 text-center">
              <p className="text-sm text-slate-500">
                {t('ยังไม่มีบัญชีผู้ใช้?', "Don't have an account?")}{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
                >
                  {t('ลงทะเบียนที่นี่', 'Sign up here')}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}