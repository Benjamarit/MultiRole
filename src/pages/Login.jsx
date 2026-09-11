import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { getRegisteredUsers, updateRegisteredUser } from '../context/authStore';

const SYSTEM_ADMIN = { email: 'admin@example.com', password: '1234', name: 'ดร.สมชาย ใจดี', role: 'SYSTEM_ADMIN' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (email === SYSTEM_ADMIN.email && password === SYSTEM_ADMIN.password) {
        const adminUser = { ...SYSTEM_ADMIN };
        delete adminUser.password;
        login(adminUser);
        navigate('/admin/users');
        return;
      }

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
    } catch {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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
        // อัปเดตสถานะให้ Admin ทราบว่าบัญชีนี้ขอรีเซ็ตรหัสผ่าน
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
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isForgotMode ? 'ลืมรหัสผ่าน' : 'เข้าสู่ระบบ'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isForgotMode 
              ? 'กรอกอีเมลของคุณเพื่อส่งคำขอเปลี่ยนรหัสผ่านไปยังผู้ดูแลระบบ' 
              : 'ระบบบริหารจัดการและประเมินผลการประกวด'
            }
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {isForgotMode ? (
          <form className="space-y-4" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล (Email)
              </label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-white font-medium rounded-md transition-colors bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}
            </button>
            <button
              type="button"
              onClick={() => { setIsForgotMode(false); setError(''); }}
              className="w-full px-4 py-2 text-gray-600 font-medium hover:underline"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล (Email)
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน (Password)
                </label>
                <button
                  type="button"
                  onClick={() => { setIsForgotMode(true); setError(''); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านของคุณ"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-white font-medium rounded-md transition-colors bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        )}

        {!isForgotMode && (
          <p className="text-center text-sm text-gray-500">
            ยังไม่มีบัญชี?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              สมัครสมาชิก
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}