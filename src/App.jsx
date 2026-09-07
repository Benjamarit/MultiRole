import { Routes, Route, Navigate } from 'react-router-dom';
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
import JudgeEvaluation from './pages/JudgeEvaluation.jsx';

function App() {
  return (
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
        <Route path="/judge/project/:projectId/evaluate/:teamId" element={<JudgeEvaluation />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;