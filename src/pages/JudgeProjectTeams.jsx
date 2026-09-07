import { useParams, useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getProjectById, getJudgeAssignments } from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation } from '../data/EvaluationStore';
import { useAuth } from '../context/AuthContext';

export default function JudgeProjectTeams() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const project = getProjectById(projectId);
  const allTeams = getTeamsByProject(projectId);

  // หาทีมที่กรรมการคนนี้ติด COI ไว้ในโครงการนี้ (ตั้งค่าไว้จากหน้า ProjectJudges)
  const assignments = getJudgeAssignments(projectId);
  const myAssignment = assignments.find((a) => (a.email || a.id) === user?.email);
  const coiTeamIds = myAssignment?.coiTeamIds || [];

  // ทีมที่กรรมการคนนี้ต้องประเมิน (ตัดทีมที่ติด COI ออก) พร้อมสถานะประเมินของแต่ละทีม
  const teams = allTeams
    .filter((team) => !coiTeamIds.includes(team.id))
    .map((team) => {
      const evaluation = getEvaluation(projectId, team.id, user?.email);
      return {
        ...team,
        evaluateStatus: evaluation?.status === 'SUBMITTED' ? 'Completed' : 'Pending',
      };
    });

  const getStatusBadge = (status) =>
    status === 'Completed' ? (
      <Badge variant="success">ประเมินแล้ว</Badge>
    ) : (
      <Badge variant="warning">รอประเมิน</Badge>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to="/workspace" className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้า Workspace
      </Link>

      <PageHeader
        title={project ? project.name : `โครงการ #${projectId}`}
        description={
          coiTeamIds.length > 0
            ? `เลือกทีมที่ต้องการประเมินคะแนน (${coiTeamIds.length} ทีมถูกซ่อนไว้เนื่องจากติด COI)`
            : 'เลือกทีมที่ต้องการประเมินคะแนน'
        }
      />

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
                {getStatusBadge(team.evaluateStatus)}
              </div>
              <Button
                variant={team.evaluateStatus === 'Completed' ? 'secondary' : 'primary'}
                className="w-full mt-4"
                onClick={() => navigate(`/judge/project/${projectId}/evaluate/${team.id}`)}
              >
                {team.evaluateStatus === 'Completed' ? 'ดู/แก้ไขคะแนน' : 'เริ่มการประเมิน'}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-50">
          <p className="text-center text-gray-500 py-4">
            {allTeams.length === 0
              ? 'โครงการนี้ยังไม่มีทีมผู้เข้าแข่งขัน'
              : 'ไม่มีทีมที่ต้องประเมินในขณะนี้ (อาจติด COI ทุกทีม)'}
          </p>
        </Card>
      )}
    </div>
  );
}