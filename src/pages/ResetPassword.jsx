import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import apiClient from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { updateRegisteredUser } from '../context/authStore';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { t, tDesc } = useLanguage();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) {
          setIsValidToken(false);
          setVerifyError(
            t(
              'ไม่พบรหัสยืนยัน (Token) สำหรับรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์จากในอีเมลของคุณใหม่อีกครั้ง',
              'Missing password reset token. Please click the link from your email again.'
            )
          );
          setIsVerifying(false);
        }
        return;
      }

      setIsVerifying(true);
      try {
        const res = await apiClient.get('/auth/verify-reset-token', {
          params: { token },
        });
        if (isMounted) {
          setIsValidToken(Boolean(res.data?.valid));
          setTargetEmail(res.data?.email || '');
          setVerifyError('');
        }
      } catch (err) {
        if (isMounted) {
          setIsValidToken(false);
          setVerifyError(
            err.response?.data?.message ||
              t(
                'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง ถูกใช้งานไปแล้ว หรือหมดอายุแล้ว (เกิน 15 นาที)',
                'This password reset link is invalid, already used, or expired (older than 15 minutes).'
              )
          );
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newPassword || !confirmPassword) {
      setFormError(
        t('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่านให้ครบถ้วน', 'Please fill in both password fields')
      );
      return;
    }

    if (newPassword.length < 4) {
      setFormError(
        t(
          'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร',
          'New password must be at least 4 characters long'
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(
        t('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'Passwords do not match')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });

      const resolvedEmail = res.data?.email || targetEmail;
      if (resolvedEmail) {
        updateRegisteredUser(resolvedEmail, {
          password: newPassword,
          resetRequested: false,
        });
      }

      setIsSuccess(true);
      toast.success(
        t(
          'ตั้งรหัสผ่านใหม่สำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่',
          'Password reset successfully! Please sign in with your new password.'
        )
      );
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          t(
            'ไม่สามารถตั้งรหัสผ่านใหม่ได้ ลิงก์อาจหมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่อีกครั้ง',
            'Failed to reset password. The link may have expired.'
          )
      );
    } finally {
      setIsSubmitting(false);
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
            Self-Service <br />
            <span className="text-blue-400">Password Recovery</span>
          </h1>

          <p className="mb-10 text-base leading-relaxed text-slate-300">
            {tDesc(
              'ตั้งค่ารหัสผ่านใหม่ด้วยตนเองอย่างปลอดภัย ลิงก์ยืนยันตัวตนจากอีเมลมีอายุการใช้งานจำกัดเพียง 15 นาทีและใช้ได้เพียงครั้งเดียว',
              'Securely set your new password. Email verification links expire after 15 minutes and can only be used once.'
            )}
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'ลิงก์รีเซ็ตรหัสผ่านมีอายุ 15 นาทีเพื่อความปลอดภัยสูงสุด',
                  'Reset links expire in 15 minutes for maximum security'
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">
                {t(
                  'เข้ารหัสรหัสผ่านด้วย BCrypt และ Token Hash (SHA-256)',
                  'Protected with BCrypt password hashing & SHA-256 token verification'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-screen w-full flex-col justify-center bg-slate-50 p-6 sm:p-12 lg:w-1/2 lg:bg-white">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-md space-y-6 pt-8 sm:pt-0">
          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('ตั้งรหัสผ่านใหม่', 'Set New Password')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {targetEmail
                ? t(
                    `กำหนดรหัสผ่านใหม่สำหรับบัญชี ${targetEmail}`,
                    `Create a new password for ${targetEmail}`
                  )
                : t(
                    'กรุณากำหนดรหัสผ่านใหม่ที่คุณต้องการใช้งาน',
                    'Please enter and confirm your new password below.'
                  )}
            </p>
          </div>

          {isVerifying ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">
                {t(
                  'กำลังตรวจสอบความถูกต้องของลิงก์รีเซ็ตรหัสผ่าน...',
                  'Verifying your password reset link...'
                )}
              </p>
            </div>
          ) : isSuccess ? (
            <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-950">
                  {t('เปลี่ยนรหัสผ่านสำเร็จ!', 'Password Changed Successfully!')}
                </h3>
                <p className="text-sm text-emerald-800">
                  {t(
                    'ระบบกำลังพากลับไปยังหน้าเข้าสู่ระบบอัตโนมัติ...',
                    'Redirecting you to the sign-in page...'
                  )}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
              >
                {t('ไปหน้าเข้าสู่ระบบทันที', 'Go to Sign In Now')}
              </Link>
            </div>
          ) : !isValidToken ? (
            <div className="space-y-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-950">
                    {t(
                      'ไม่สามารถใช้งานลิงก์นี้ได้',
                      'Reset Link Expired or Invalid'
                    )}
                  </h3>
                  <p className="text-sm leading-relaxed text-amber-800">
                    {verifyError}
                  </p>
                </div>
              </div>

              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('กลับไปหน้าเข้าสู่ระบบเพื่อขอลิงก์ใหม่', 'Back to Sign In to Request New Link')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('รหัสผ่านใหม่', 'New Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder={t('อย่างน้อย 4 ตัวอักษร', 'At least 4 characters')}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {t('ยืนยันรหัสผ่านใหม่', 'Confirm New Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder={t('กรอกรหัสผ่านใหม่อีกครั้ง', 'Re-enter new password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('บันทึกรหัสผ่านใหม่', 'Save New Password')
                )}
              </button>

              <Link
                to="/login"
                className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('กลับไปหน้าเข้าสู่ระบบ', 'Back to Sign In')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
