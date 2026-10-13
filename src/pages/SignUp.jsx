import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Trophy, Users, CheckCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    if (password.length < 4) {
      setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    try {
      /*
        TODO: ส่วนนี้คือจุดที่จะยิง API ไปหา Spring Boot ในอนาคต
        const response = await api.post('/auth/register', { name, email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        login(user);
      */

      await new Promise((resolve) => setTimeout(resolve, 600)); // จำลองการดีเลย์เหมือนรอ API

      register({ name, email, password });
      toast.success('สมัครสมาชิกสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ!');
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      
      {/* ฝั่งซ้าย: โปสเตอร์ข้อมูล (แสดงเฉพาะจอใหญ่) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {/* ลวดลายตารางแบบเป็นทางการ */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ 
            backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        ></div>
        
        {/* วงกลมประดับพื้นหลัง */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 transform translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10 p-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8 shadow-2xl">
            <Trophy className="w-10 h-10 text-amber-400" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6 tracking-tight leading-tight">
            Join the <br/> <span className="text-blue-400">Evaluation Panel</span>
          </h1>
          
          <p className="text-lg text-slate-300 leading-relaxed mb-10">
            ลงทะเบียนเพื่อสร้างโครงการประเมินของคุณเอง หรือเตรียมพร้อมรับคำเชิญให้เป็นกรรมการจากโครงการอื่นๆ ในระบบ
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-medium">รองรับการทำงานร่วมกันของคณะกรรมการหลายท่าน</span>
            </div>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="font-medium">ประมวลผลและจัดอันดับคะแนนอัตโนมัติ แม่นยำ</span>
            </div>
          </div>
        </div>
        
        {/* Footer ฝั่งซ้าย */}
        <div className="absolute bottom-8 left-12 text-sm text-slate-500">
          © {new Date().getFullYear()} CE System. All rights reserved.
        </div>
      </div>

      {/* ฝั่งขวา: ฟอร์มสมัครสมาชิก */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-slate-50 lg:bg-white relative overflow-y-auto min-h-screen">
        <div className="w-full max-w-md space-y-8 my-auto py-8">
          
          {/* ส่วนหัวของฟอร์ม */}
          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center justify-center w-16 h-16 rounded-xl bg-slate-900 mb-6 shadow-lg">
              <Trophy className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              สร้างบัญชีใหม่
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              กรอกข้อมูลเพื่อลงทะเบียนเข้าสู่ระบบบริหารจัดการการแข่งขัน
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

          {/* ฟอร์มสมัครสมาชิก */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">ชื่อ-นามสกุล (Full Name)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                  placeholder="เช่น ดร.สมชาย ใจดี"
                />
              </div>
            </div>

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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                    placeholder="อย่างน้อย 4 ตัวอักษร"
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

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
                    placeholder="พิมพ์อีกครั้ง"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>ลงทะเบียน (Sign Up) <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* ลิงก์ไปหน้าเข้าสู่ระบบ */}
          <div className="pt-6 text-center border-t border-slate-200">
            <p className="text-sm text-slate-500">
              มีบัญชีอยู่แล้ว?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}