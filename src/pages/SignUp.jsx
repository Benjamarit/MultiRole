import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Trophy,
  Users,
  CheckCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();
  const { t, tDesc } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError(t('กรุณากรอกข้อมูลให้ครบทุกช่อง', 'Please fill in all required fields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'Passwords do not match'));
      return;
    }
    if (password.length < 4) {
      setError(t('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'Password must be at least 4 characters'));
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      register({ name, email, password });
      toast.success(
        t('สมัครสมาชิกสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ!', 'Account created! Welcome aboard.')
      );
      navigate('/workspace');
    } catch (err) {
      setError(
        err.message || t('สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'Registration failed')
      );
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
        <div className="absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 opacity-20 mix-blend-multiply blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600 opacity-20 mix-blend-multiply blur-[120px]" />

        <div className="relative z-10 max-w-lg p-12">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xs">
            <Trophy className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white">
            Join the <br />
            <span className="text-blue-400">Evaluation Panel</span>
          </h1>

          <p className="mb-10 text-base leading-relaxed text-slate-300">
            {tDesc(
              'ลงทะเบียนเพื่อสร้างโครงการประเมินของคุณเอง หรือเตรียมพร้อมรับคำเชิญให้เป็นกรรมการจากโครงการอื่นๆ ในระบบ',
              'Register once to create and manage your own competitions or get invited as a judge across multiple projects.'
            )}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'รองรับการทำงานร่วมกันของคณะกรรมการหลายท่าน',
                  'Multi-judge assignment and progress tracking'
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'ประมวลผลและจัดอันดับคะแนนถ่วงน้ำหนักอัตโนมัติ',
                  'Automated weighted scoring and real-time leaderboard'
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-12 text-xs text-slate-500">
          © {new Date().getFullYear()} MultiRole CE System. All rights reserved.
        </div>
      </div>

      <div className="relative flex min-h-screen w-full flex-col justify-center overflow-y-auto bg-slate-50 p-6 sm:p-12 lg:w-1/2 lg:bg-white">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-md space-y-7 py-8">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg lg:hidden">
              <Trophy className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('สร้างบัญชีใหม่', 'Create Account')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {t(
                'กรอกข้อมูลเพื่อลงทะเบียนเข้าสู่ระบบบริหารจัดการการแข่งขัน',
                'Fill in your details below to get started with MultiRole.'
              )}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex-1 text-sm font-medium text-red-700">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {t('ชื่อ-นามสกุล', 'Full Name')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder={t('เช่น ดร.สมชาย ใจดี', 'e.g. Dr. Somchai Jaidee', { compact: true })}
                />
              </div>
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('รหัสผ่าน', 'Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder={t('อย่างน้อย 4 ตัว', 'Min 4 chars', { compact: true })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('ยืนยันรหัสผ่าน', 'Confirm Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder={t('พิมพ์อีกครั้ง', 'Repeat password', { compact: true })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t('ลงทะเบียน', 'Sign Up')} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 pt-5 text-center">
            <p className="text-sm text-slate-500">
              {t('มีบัญชีอยู่แล้ว?', 'Already have an account?')}{' '}
              <Link
                to="/login"
                className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                {t('เข้าสู่ระบบ', 'Sign In')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}