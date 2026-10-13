import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, Trophy, ShieldCheck, Award, ArrowLeft, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRegisteredUsers, updateRegisteredUser } from '../context/authStore';

const SYSTEM_ADMIN = { email: 'admin@example.com', password: '1234', name: 'ดร.สมชาย ใจดี', role: 'SYSTEM_ADMIN' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    try {
      // จำลองการดีเลย์โหลดข้อมูลให้ดูสมจริง
      await new Promise((resolve) => setTimeout(resolve, 800));

      // เช็ค System Admin
      if (email === SYSTEM_ADMIN.email && password === SYSTEM_ADMIN.password) {
        const adminUser = { ...SYSTEM_ADMIN };
        delete adminUser.password;
        login(adminUser);
        navigate('/admin/users');
        return;
      }

      // เช็คผู้ใช้งานทั่วไป
      const registeredUsers = getRegisteredUsers();
      const matchedUser = registeredUsers.find((u) => u.email === email && u.password === password);

      if (matchedUser) {
        if (matchedUser.status === 'Suspended') {
          throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
        }
        const publicUser = { ...matchedUser };
        delete publicUser.password;
        login(publicUser);
        navigate('/workspace');
        return;
      }

      throw new Error('Invalid credentials');
    } catch (err) {
      setError(err.message === 'บัญชีนี้ถูกระงับการใช้งาน' ? err.message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('กรุณากรอกอีเมลที่ต้องการขอรหัสผ่านใหม่');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      const registeredUsers = getRegisteredUsers();
      const userExists = registeredUsers.find((u) => u.email === email);

      if (userExists) {
        updateRegisteredUser(email, { resetRequested: true });
        toast.success('ส่งคำขอสำเร็จ! โปรดติดต่อ System Admin เพื่อรับรหัสผ่านใหม่');
        setIsForgotMode(false);
        setPassword('');
      } else {
        throw new Error('ไม่พบอีเมลนี้ในระบบ');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      
      {/* ฝั่งซ้าย: โปสเตอร์ข้อมูล (แสดงเฉพาะจอใหญ่) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {/* ลวดลายตารางแบบเป็นทางการ (Corporate Grid Pattern) */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        ></div>
        
        {/* วงกลมประดับพื้นหลัง */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10 p-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8 shadow-2xl">
            <Trophy className="w-10 h-10 text-amber-400" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6 tracking-tight leading-tight">
            Competition Evaluation <br/> <span className="text-blue-400">Management System</span>
          </h1>
          
          <p className="text-lg text-slate-300 leading-relaxed mb-10">
            ระบบบริหารจัดการและประเมินผลการแข่งขันอย่างเป็นทางการ มุ่งเน้นความโปร่งใส แม่นยำ และมีมาตรฐานระดับสากล
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-medium">มาตรฐานการประเมินที่โปร่งใสและตรวจสอบได้</span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
                <Award className="w-5 h-5" />
              </div>
              <span className="font-medium">รองรับเกณฑ์การให้คะแนนที่หลากหลายรูปแบบ</span>
            </div>
          </div>
        </div>
        
        {/* Footer ฝั่งซ้าย */}
        <div className="absolute bottom-8 left-12 text-sm text-slate-500">
          © {new Date().getFullYear()} CE System. All rights reserved.
        </div>
      </div>

      {/* ฝั่งขวา: ฟอร์มล็อกอิน */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-slate-50 lg:bg-white relative min-h-screen">
        <div className="w-full max-w-md space-y-8 my-auto">
          
          {/* ส่วนหัวของฟอร์ม */}
          <div className="text-center lg:text-left">
            {/* โลโก้สำหรับหน้าจอมือถือ (แสดงเฉพาะตอนที่ฝั่งซ้ายโดนซ่อน) */}
            <div className="inline-flex lg:hidden items-center justify-center w-16 h-16 rounded-xl bg-slate-900 mb-6 shadow-lg">
              <Trophy className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              {isForgotMode ? 'รีเซ็ตรหัสผ่าน' : 'เข้าสู่ระบบ (Sign In)'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              {isForgotMode
                ? 'กรุณากรอกอีเมลที่ลงทะเบียนไว้ ระบบจะแจ้งไปยังผู้ดูแลเพื่อดำเนินการออกรหัสผ่านใหม่'
                : 'กรุณากรอกข้อมูลประจำตัวเพื่อเข้าสู่ระบบบริหารจัดการการแข่งขัน'}
            </p>
          </div>

          {/* ข้อความแจ้งเตือน Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <div className="flex-1 text-sm text-red-700 font-medium">
                {error}
              </div>
            </div>
          )}

          {/* ฟอร์มลืมรหัสผ่าน */}
          {isForgotMode ? (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">อีเมล (Email)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>ส่งคำขอ <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgotMode(false); setError(''); }}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors mt-2"
              >
                <ArrowLeft className="w-4 h-4" /> กลับไปหน้าเข้าสู่ระบบ
              </button>
            </form>

          ) : (
            /* ฟอร์มเข้าสู่ระบบปกติ */
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">อีเมล (Email)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">รหัสผ่าน (Password)</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotMode(true); setError(''); }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'เข้าสู่ระบบ (Sign In)'
                )}
              </button>
            </form>
          )}

          {/* ลิงก์ไปหน้าสมัครสมาชิก */}
          {!isForgotMode && (
            <div className="pt-6 text-center border-t border-slate-200">
              <p className="text-sm text-slate-500">
                ยังไม่มีบัญชีผู้ใช้?{' '}
                <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                  ลงทะเบียนที่นี่
                </Link>
              </p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}