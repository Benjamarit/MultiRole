import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import SystemAdminDashboard from './pages/SystemAdminDashboard.jsx';
import UserManagement from './pages/UserManagement.jsx'; 
import AppLayout from './layouts/AppLayout.jsx';
import ProjectList from './pages/ProjectList.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import CreateProject from './pages/CreateProject.jsx';
import ProjectTeams from './pages/ProjectTeams.jsx';
import ProjectJudges from './pages/ProjectJudge.jsx';
import CriteriaManagement from './pages/CriteriaManagement.jsx';
import EvaluationMonitoring from './pages/EvaluationMonitoring.jsx';
import JudgeDashboard from './pages/JudgeDashboard.jsx';
import JudgeEvaluation from './pages/JudgeEvaluation.jsx';


function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} /> 
        <Route path="/admin/projects" element={<ProjectList />} />
        <Route path="/project/:id/dashboard" element={<ProjectDashboard />} />
        <Route path="/admin/projects/new" element={<CreateProject />} />
        <Route path="/project/:id/teams" element={<ProjectTeams />} />
        <Route path="/project/:id/judges" element={<ProjectJudges />} />
        <Route path="/project/:id/criteria" element={<CriteriaManagement />} />
        <Route path="/project/:id/evaluations" element={<EvaluationMonitoring />} />
        <Route path="/judge/dashboard" element={<JudgeDashboard />} />
        <Route path="/judge/project/:projectId/evaluate/:teamId" element={<JudgeEvaluation />} />

        
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;