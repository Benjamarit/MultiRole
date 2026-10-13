import { Navigate, useParams } from 'react-router-dom';

export default function ProjectGroups() {
  const { id } = useParams();
  return <Navigate to={`/project/${id}/teams?tab=groups`} replace />;
}
