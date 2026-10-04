import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      // บัญชีใหม่ไม่มี role ตายตัว — จะเป็น Project Admin ก็ต่อเมื่อสร้างโปรเจกต์เอง
      // หรือเป็น Judge ก็ต่อเมื่อถูกโปรเจกต์อื่นเชิญเข้าไป
      navigate('/workspace');
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-10">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">สมัครสมาชิก</h1>
          <p className="mt-2 text-sm text-gray-600">
            สมัครแล้วสร้างโครงการของตัวเอง หรือรอรับคำเชิญให้เป็นกรรมการจากโครงการอื่น
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ-นามสกุล
            </label>
            <Input
              id="signup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 4 ตัวอักษร"
            />
          </div>

          <div>
            <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              ยืนยันรหัสผ่าน
            </label>
            <Input
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
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
            {isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}