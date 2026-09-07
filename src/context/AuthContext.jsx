import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const REGISTERED_USERS_KEY = 'ce_registered_users';

/**
 * ครอบ App ทั้งหมดด้วย <AuthProvider> ที่ระดับบนสุด (เช่นใน main.jsx หรือ App.jsx)
 * เพื่อให้ Navbar/Sidebar และหน้าอื่นๆ รู้ว่าใครล็อกอินอยู่
 *
 * หมายเหตุ (Role ใหม่): user ที่สมัครผ่าน SignUp ไม่มี role ตายตัวติดบัญชี
 * — จะเป็น "Project Admin" ของโปรเจกต์ไหนก็ต่อเมื่อเป็นคนสร้างโปรเจกต์นั้น
 * และเป็น "Judge" ก็ต่อเมื่อถูกโปรเจกต์อื่นเชิญเข้าไป role ในที่นี้จึงเก็บไว้เฉพาะ
 * 'SYSTEM_ADMIN' (บัญชีสำรองไว้ล่วงหน้า ไม่เปิดให้สมัครเอง) กับ 'USER' (ทุกคนที่สมัครเอง)
 *
 * ตอนนี้เก็บลง localStorage แบบง่ายๆ (mock ก่อนต่อ JWT/DB จริง)
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

  // สมัครสมาชิกใหม่ — เก็บ mock ไว้ใน localStorage แล้ว login ให้อัตโนมัติ
  // TODO: ตอนต่อ API จริง เปลี่ยนเป็น POST /auth/register แล้วรอ response ก่อนค่อย login
  const register = ({ name, email, password }) => {
    const registeredUsers = getRegisteredUsers();

    if (registeredUsers.some((u) => u.email === email)) {
      throw new Error('อีเมลนี้ถูกใช้สมัครไปแล้ว');
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: 'USER',
      createdAt: new Date().toISOString(),
      status: 'Active',
    };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([...registeredUsers, newUser]));

    const publicUser = { ...newUser };
    delete publicUser.password; // ไม่เก็บ password ไว้ใน session ปัจจุบัน
    login(publicUser);
    return publicUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// ใช้ตรวจ credential ตอน Login (นอกเหนือจากบัญชี System Admin ที่ fix ไว้ล่วงหน้า)
export function getRegisteredUsers() {
  try {
    const stored = localStorage.getItem(REGISTERED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth ต้องถูกเรียกใช้ภายใน <AuthProvider> เท่านั้น');
  }
  return ctx;
}

export function updateRegisteredUser(email, changes) {
  const users = getRegisteredUsers();
  const updatedUsers = users.map((user) =>
    user.email === email ? { ...user, ...changes } : user
  );
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
  return updatedUsers.find((user) => user.email === email);
}

export function deleteRegisteredUser(email) {
  const users = getRegisteredUsers().filter((user) => user.email !== email);
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}