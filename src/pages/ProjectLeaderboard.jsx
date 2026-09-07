import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getProjectById } from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluationsByProject } from '../data/EvaluationStore';

export default function ProjectLeaderboard() {
  const { id } = useParams();
  
  const project = getProjectById(id);
  const teams = getTeamsByProject(id);
  const evaluations = getEvaluationsByProject(id).filter((e) => e.status === 'SUBMITTED');
  const leaderboard = useMemo(() => {
    const assignments = project?.judgeAssignments || [];
    const data = teams.map((team) => {
      const teamEvals = evaluations.filter((e) => e.teamId === team.id);
      
      // หาจำนวนกรรมการที่ต้องประเมินทีมนี้ (รวมทั้งหมด ลบด้วยคนที่ติด COI)
      const expectedEvals = assignments.filter((a) => !(a.coiTeamIds || []).includes(team.id)).length;
      
      const totalScore = teamEvals.reduce((sum, e) => sum + e.totalScore, 0);
      const averageScore = teamEvals.length > 0 ? totalScore / teamEvals.length : 0;
      
      return {
        ...team,
        averageScore,
        evaluatedCount: teamEvals.length,
        expectedCount: expectedEvals,
        isComplete: teamEvals.length >= expectedEvals && expectedEvals > 0,
      };
    });

    // เรียงลำดับคะแนนจากมากไปน้อย และกำหนด Rank
    return data
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));
  }, [teams, evaluations, project?.judgeAssignments]);

  const handleExportCSV = () => {
    // TODO: สร้างฟังก์ชัน Export ไฟล์ CSV/Excel ในอนาคต
    alert('ฟังก์ชันดาวน์โหลดผลคะแนนจะพร้อมใช้งานเมื่อเชื่อมต่อ Backend');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to={`/project/${id}/dashboard`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader
        title="สรุปผลคะแนนจัดอันดับ (Leaderboard)"
        description={`ตารางอันดับทีมผู้เข้าแข่งขันในโครงการ ${project?.name || ''}`}
        action={
          <Button variant="secondary" onClick={handleExportCSV}>
            ดาวน์โหลดผลคะแนน (CSV)
          </Button>
        }
      />

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-4 font-medium text-center w-20">อันดับ</th>
                <th className="px-6 py-4 font-medium">ชื่อทีม</th>
                <th className="px-6 py-4 font-medium text-center">กรรมการประเมินแล้ว</th>
                <th className="px-6 py-4 font-medium text-center">คะแนนเฉลี่ย</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.length > 0 ? (
                leaderboard.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        team.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        team.rank === 2 ? 'bg-gray-200 text-gray-700' :
                        team.rank === 3 ? 'bg-orange-100 text-orange-800' :
                        'text-gray-500'
                      }`}>
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{team.name}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {team.evaluatedCount} / {team.expectedCount}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-lg text-blue-700">
                      {team.averageScore.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {team.isComplete ? (
                        <Badge variant="success">คะแนนครบถ้วน</Badge>
                      ) : (
                        <Badge variant="warning">รอผลประเมิน</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    ยังไม่มีข้อมูลทีมหรือยังไม่มีการให้คะแนน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}