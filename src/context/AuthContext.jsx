import { createContext, useContext, useEffect, useState } from 'react';
import apiClient, { TOKEN_STORAGE_KEY } from '../api/client';
import { getRegisteredUsers, setRegisteredUsersCache } from './authStore';

const AuthContext = createContext(null);
const REGISTERED_USERS_KEY = 'ce_registered_users';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ce_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ซิงค์รายชื่อผู้ใช้จาก Backend เพื่อให้หน้าเชิญกรรมการ (ProjectJudge) เห็นรายชื่อผู้ใช้ในฐานข้อมูลจริง
  const syncActiveUsersFromBackend = async () => {
    try {
      const res = await apiClient.get('/users');
      if (Array.isArray(res.data)) {
        setRegisteredUsersCache(res.data);
      }
    } catch {
      // หากยังไม่ได้เปิดเซิร์ฟเวอร์ Spring Boot จะใช้ข้อมูลใน localStorage แทน
    }
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    apiClient
      .get('/auth/me')
      .then((res) => {
        if (res.data) {
          setUser(res.data);
          localStorage.setItem('ce_user', JSON.stringify(res.data));
          syncActiveUsersFromBackend();
        }
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setUser(null);
          localStorage.removeItem('ce_user');
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      });
  }, []);

  const login = (userData, token = null) => {
    setUser(userData);
    localStorage.setItem('ce_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      syncActiveUsersFromBackend();
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ce_user');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const register = async ({ name, email, password }) => {
    try {
      const res = await apiClient.post('/auth/register', { name, email, password });
      const { token, user: backendUser } = res.data;
      login(backendUser, token);
      return backendUser;
    } catch (err) {
      // หาก Backend ตอบกลับ Error (เช่น 409 อีเมลซ้ำ) ให้โยนข้อความจาก Backend
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      // Fallback กรณีไม่ได้รัน Spring Boot Server
      const registeredUsers = getRegisteredUsers();
      if (registeredUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
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
      localStorage.setItem(
        REGISTERED_USERS_KEY,
        JSON.stringify([...registeredUsers, newUser])
      );
      const publicUser = { ...newUser };
      delete publicUser.password;
      login(publicUser);
      return publicUser;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth ต้องถูกเรียกใช้ภายใน <AuthProvider> เท่านั้น');
  }
  return ctx;
}
