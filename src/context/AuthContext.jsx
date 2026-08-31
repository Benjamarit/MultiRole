import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

/**
 * ครอบ App ทั้งหมดด้วย <AuthProvider> ที่ระดับบนสุด (เช่นใน main.jsx หรือ App.jsx)
 * เพื่อให้ Navbar/Sidebar และหน้าอื่นๆ รู้ว่าใครล็อกอินอยู่ ด้วย role อะไร
 *
 * ตอนนี้เก็บลง localStorage แบบง่ายๆ (mock ก่อนต่อ JWT จริง)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ce_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    // userData: { name, email, role }
    setUser(userData);
    localStorage.setItem('ce_user', JSON.stringify(userData));
    // TODO: ตอนต่อ API จริง เก็บ JWT token จาก response ตรงนี้แทน (เช่น localStorage.setItem('token', ...))
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ce_user');
    // TODO: ตอนต่อ API จริง ลบ token ที่เก็บไว้ด้วย
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth ต้องถูกเรียกใช้ภายใน <AuthProvider> เท่านั้น');
  }
  return ctx;
}