import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRegisteredUsers } from '../context/authStore';
import {
  getJudgingProjects,
  getProjectById,
  isProjectAdmin,
} from '../data/ProjectStore';

/**
 * ป้องกันการเข้าถึงหน้าภายในระบบโดยไม่ล็อกอิน หรือไม่มีสิทธิ์ในหน้า/โครงการนั้น
 * - หากยังไม่ล็อกอิน หรือบัญชีถูกระงับ (Suspended) จะพาไปหน้า /login
 * - หากกำหนด allowedRoles จะตรวจสอบว่า user.role อยู่ในรายการที่อนุญาตหรือไม่
 * - หากกำหนด projectRole ('ADMIN' | 'JUDGE') จะตรวจสอบสิทธิ์ในโครงการนั้นๆ ก่อนเข้าหน้า
 */
export default function ProtectedRoute({ allowedRoles, projectRole, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const params = useParams();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ตรวจสอบสถานะล่าสุดจากคลังผู้ใช้ เผื่อกรณีบัญชีถูก System Admin สั่งระงับ
  if (user.role !== 'SYSTEM_ADMIN') {
    const latestUserRecord = getRegisteredUsers().find((u) => u.email === user.email);
    if (latestUserRecord?.status === 'Suspended') {
      logout();
      return <Navigate to="/login" replace />;
    }
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      const fallbackPath = user.role === 'SYSTEM_ADMIN' ? '/admin/users' : '/workspace';
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // ตรวจสอบสิทธิ์ระดับโครงการ (Project Admin หรือ Judge)
  if (projectRole === 'ADMIN') {
    const projectId = params.id;
    const project = getProjectById(projectId);
    if (!project || !isProjectAdmin(projectId, user.email)) {
      return <Navigate to="/workspace" replace />;
    }
  } else if (projectRole === 'JUDGE') {
    const projectId = params.projectId;
    const isInvitedJudge = getJudgingProjects(user.email).some(
      (p) => Number(p.id) === Number(projectId)
    );
    if (!isInvitedJudge) {
      return <Navigate to="/workspace" replace />;
    }
  }

  return children ? children : <Outlet />;
}
