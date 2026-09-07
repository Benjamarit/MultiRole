import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { getRegisteredUsers } from '../context/authStore';
// import api from '../api/axios'; // เตรียมไว้ใช้ยิง API จริงในอนาคต

// บัญชี System Admin เป็นบัญชีสำรองไว้ล่วงหน้าเพียงบัญชีเดียว ไม่เปิดให้สมัครเอง
// ส่วน Project Admin / Judge ไม่มี role ตายตัวแล้ว — ทุกคนสมัครผ่าน SignUp เป็น 'USER' ธรรมดา
// แล้วจะได้ role ตามบริบท (สร้างโปรเจกต์ = admin ของโปรเจกต์นั้น, ถูกเชิญ = judge ของโปรเจกต์นั้น)
const SYSTEM_ADMIN = { email: 'admin@example.com', password: '1234', name: 'ดร.สมชาย ใจดี', role: 'SYSTEM_ADMIN' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      /*
        TODO: ส่วนนี้คือจุดที่จะยิง API ไปหา Spring Boot ในอนาคต
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        login(user);
      */

      await new Promise((resolve) => setTimeout(resolve, 800)); // จำลองการดีเลย์เหมือนรอ API

      if (email === SYSTEM_ADMIN.email && password === SYSTEM_ADMIN.password) {
        const adminUser = { ...SYSTEM_ADMIN };
        delete adminUser.password;
        login(adminUser);
        navigate('/admin/users');
        return;
      }

      // เช็คกับบัญชีที่สมัครเองผ่าน SignUp.jsx
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

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm text-gray-600">
            ระบบบริหารจัดการและประเมินผลการประกวด
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
          >
            {error}
          </div>
        )}

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
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน (Password)
            </label>
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
            className={`w-full px-4 py-2 text-white font-medium rounded-md transition-colors
              ${isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ยังไม่มีบัญชี?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  );
}