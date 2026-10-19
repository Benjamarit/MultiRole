import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import WorkSpace from './pages/WorkSpace.jsx';
import CreateProject from './pages/CreateProject.jsx';
import UserManagement from './pages/UserManagement.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import ProjectTeams from './pages/ProjectTeams.jsx';
import ProjectJudges from './pages/ProjectJudge.jsx';
import ProjectGroups from './pages/ProjectGroups.jsx';
import JudgeTeamAssignments from './pages/JudgeTeamAssignments.jsx';
import CriteriaManagement from './pages/CriteriaManagement.jsx';
import EvaluationMonitoring from './pages/EvaluationMonitoring.jsx';
import JudgeProjectTeams from './pages/JudgeProjectTeams.jsx';
import JudgeEvaluation from './pages/JudgeEvaluation.jsx';
import ProjectLeaderboard from './pages/ProjectLeaderboard.jsx';
import JudgeMultiEvaluation from './pages/JudgeMultiEvaluation.jsx';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#172554',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            style: { background: '#047857', color: 'white' },
          },
          error: {
            style: { background: '#B91C1C', color: 'white' },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ต้องล็อกอินก่อนจึงจะเข้าถึงหน้าภายในระบบได้ทั้งหมด */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* เฉพาะ System Admin */}
            <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} />}>
              <Route path="/admin/users" element={<UserManagement />} />
            </Route>

            {/* สำหรับผู้ใช้งานทั่วไป (Project Admin & Judge) */}
            <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
              <Route path="/workspace" element={<WorkSpace />} />
              <Route path="/projects/new" element={<CreateProject />} />

              {/* เฉพาะเจ้าของโครงการ (Project Admin ของโครงการนั้น) */}
              <Route element={<ProtectedRoute projectRole="ADMIN" />}>
                <Route path="/project/:id/dashboard" element={<ProjectDashboard />} />
                <Route path="/project/:id/teams" element={<ProjectTeams />} />
                <Route path="/project/:id/groups" element={<ProjectGroups />} />
                <Route path="/project/:id/judges" element={<ProjectJudges />} />
                <Route path="/project/:id/assignments" element={<JudgeTeamAssignments />} />
                <Route path="/project/:id/criteria" element={<CriteriaManagement />} />
                <Route path="/project/:id/evaluations" element={<EvaluationMonitoring />} />
                <Route path="/project/:id/leaderboard" element={<ProjectLeaderboard />} />
              </Route>

              {/* เฉพาะกรรมการที่ได้รับเชิญในโครงการนั้น (Judge) */}
              <Route element={<ProtectedRoute projectRole="JUDGE" />}>
                <Route path="/judge/project/:projectId/teams" element={<JudgeProjectTeams />} />
                <Route
                  path="/judge/project/:projectId/evaluate/:teamId"
                  element={<JudgeEvaluation />}
                />
                <Route
                  path="/judge/project/:projectId/evaluate-multi"
                  element={<JudgeMultiEvaluation />}
                />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;