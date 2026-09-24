import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import WorkSpace from './pages/WorkSpace.jsx';
import CreateProject from './pages/CreateProject.jsx';
import UserManagement from './pages/UserManagement.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import ProjectTeams from './pages/ProjectTeams.jsx';
import ProjectJudges from './pages/ProjectJudge.jsx';
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
            background: '#363636',
            color: '#fff',
            fontSize: '16px',
          },
          success: {
            style: { background: '#10b981', color: 'white' }, //Success
          },
          error: {
            style: { background: '#ef4444', color: 'white' }, //Error
          },
        }} 
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route element={<AppLayout />}>
          <Route path="/workspace" element={<WorkSpace />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/project/:id/dashboard" element={<ProjectDashboard />} />
          <Route path="/project/:id/teams" element={<ProjectTeams />} />
          <Route path="/project/:id/judges" element={<ProjectJudges />} />
          <Route path="/project/:id/criteria" element={<CriteriaManagement />} />
          <Route path="/project/:id/evaluations" element={<EvaluationMonitoring />} />
          <Route path="/judge/project/:projectId/teams" element={<JudgeProjectTeams />} />
          <Route path="/judge/project/:projectId/evaluate/:teamId" element={<JudgeEvaluation />} />
          <Route path="/project/:id/leaderboard" element={<ProjectLeaderboard />} />
          <Route path="/judge/project/:projectId/evaluate-multi" element={<JudgeMultiEvaluation />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;