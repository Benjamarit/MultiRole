import { createContext, useContext, useEffect, useState } from 'react';
import apiClient, { TOKEN_STORAGE_KEY } from '../api/client';
import { clearWorkspace, loadWorkspace, normalizeUser } from '../api/workspace';
import { setRegisteredUsersCache } from './authStore';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const logout = () => {
    clearWorkspace();
    setRegisteredUsersCache([]);
    setUser(null);
    setLoadError('');
    localStorage.removeItem('ce_user');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };
  const hydrate = async () => {
    const { data } = await apiClient.get('/auth/me');
    const current = normalizeUser(data);
    await loadWorkspace(current);
    const users = await apiClient.get('/users');
    setRegisteredUsersCache(users.data.map(normalizeUser));
    setUser(current);
    return current;
  };
  const restore = async () => {
    setLoading(true);
    setLoadError('');
    try {
      if (localStorage.getItem(TOKEN_STORAGE_KEY)) await hydrate();
      else logout();
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) logout();
      else setLoadError(error.message);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restore();
    const expired = () => logout();
    window.addEventListener('ce:unauthorized', expired);
    return () => window.removeEventListener('ce:unauthorized', expired);
    // Bootstrap once; writes and explicit refreshes reload server data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const login = async (credentials) => {
    clearWorkspace();
    const { data } = await apiClient.post('/auth/login', credentials);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    try { return await hydrate(); }
    catch (error) { logout(); throw error; }
  };
  const register = async ({ name, email, password }) => {
    return apiClient.post('/auth/register', { fullName: name, email: email.trim().toLowerCase(), password });
  };
  const refresh = async () => {
    await loadWorkspace(user);
    const users = await apiClient.get('/users');
    setRegisteredUsersCache(users.data.map(normalizeUser));
    setRevision((value) => value + 1);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refresh, revision }}>
      {loading ? <div className="p-8 text-center">กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…</div> : loadError ? (
        <div className="p-8 text-center" role="alert">
          <p>{loadError}</p>
          <button className="m-4 underline" onClick={restore}>ลองอีกครั้ง</button>
          <button className="m-4 underline" onClick={logout}>กลับไปเข้าสู่ระบบ</button>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider');
  return context;
}
