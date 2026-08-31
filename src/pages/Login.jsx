import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
// import api from '../api/axios'; // เตรียมไว้ใช้ยิง API จริงในอนาคต

// Mock user ต่อ role — ต้องตรงกับ mock data ที่ใช้ใน UserManagement.jsx
const MOCK_USERS = {
  'admin@example.com': { name: 'ดร.สมชาย ใจดี', email: 'admin@example.com', role: 'SYSTEM_ADMIN' },
  'projectadmin@example.com': { name: 'อ.สมศรี เรียนเก่ง', email: 'projectadmin@example.com', role: 'PROJECT_ADMIN' },
  'judge@example.com': { name: 'นายวิชัย ทำงาน', email: 'judge@example.com', role: 'JUDGE' },
};

export default function Login() {
  // สร้าง State สำหรับเก็บข้อมูลฟอร์มและสถานะต่างๆ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // ฟังก์ชันจัดการเมื่อกดปุ่ม Submit
  const handleLogin = async (e) => {
    e.preventDefault(); // ป้องกันไม่ให้หน้าเว็บรีเฟรช
    setError('');

    // 1. Validation เบื้องต้น
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
        localStorage.setItem('token', token); // เก็บ JWT
        login(user);
      */

      // 2. จำลองการดีเลย์เหมือนรอ API (ลบออกได้เมื่อต่อ API จริง)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. จำลองการตรวจสอบ Role (Hardcode เพื่อทดสอบระบบ Route)
      // ครบทั้ง 3 Role ตามที่ใช้จริงใน UserManagement (SYSTEM_ADMIN / PROJECT_ADMIN / JUDGE)
      const mockUser = MOCK_USERS[email];
      if (mockUser && password === '1234') {
        login(mockUser); // เก็บ user ปัจจุบันไว้ใน AuthContext ให้ Navbar/Sidebar อ่านได้

        if (mockUser.role === 'SYSTEM_ADMIN') {
          navigate('/admin/dashboard');
        } else if (mockUser.role === 'PROJECT_ADMIN') {
          navigate('/admin/projects');
        } else if (mockUser.role === 'JUDGE') {
          navigate('/judge/dashboard');
        }
      } else {
        throw new Error('Invalid credentials');
      }

    } catch {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        
        {/* ส่วนหัว */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm text-gray-600">
            ระบบบริหารจัดการและประเมินผลการประกวด
          </p>
        </div>

        {/* แสดงข้อความ Error ถ้ามี */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
          >
            {error}
          </div>
        )}

        {/* ฟอร์ม Login */}
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
              placeholder="รหัสผ่านคือ 1234"
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
        
      </div>
    </div>
  );
}