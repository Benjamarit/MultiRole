import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { getMyProjects, getJudgingProjects, getJudgeAssignments } from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getEvaluation } from '../data/EvaluationStore';

const statusVariant = (status) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Draft': return 'warning';
    default: return 'default';
  }
};

// นับว่ากรรมการคนนี้ต้องประเมินกี่ทีมในโครงการนี้ (หัก COI ออก) และประเมินไปแล้วกี่ทีม
function getJudgeProgress(project, judgeEmail) {
  const assignments = getJudgeAssignments(project.id);
  const myAssignment = assignments.find((a) => (a.email || a.id) === judgeEmail);
  const coiTeamIds = myAssignment?.coiTeamIds || [];

  const eligibleTeams = getTeamsByProject(project.id).filter(
    (team) => !coiTeamIds.includes(team.id)
  );
  const completed = eligibleTeams.filter(
    (team) => getEvaluation(project.id, team.id, judgeEmail)?.status === 'SUBMITTED'
  ).length;

  return { completed, total: eligibleTeams.length };
}

export default function Workspace() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const myProjects = getMyProjects(user?.email);
  const judgingProjects = useMemo(() => {
    return getJudgingProjects(user?.email).map((project) => ({
      ...project,
      progress: getJudgeProgress(project, user?.email),
    }));
  }, [user?.email]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | completed
  const [sortBy, setSortBy] = useState('pending-first'); // pending-first | name

  const filteredJudgingProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    let list = judgingProjects.filter((project) => {
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.ownerName || '').toLowerCase().includes(query);

      const isCompleted = project.progress.total > 0 && project.progress.completed >= project.progress.total;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && isCompleted) ||
        (statusFilter === 'pending' && !isCompleted);

      return matchesQuery && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');

      // pending-first: โครงการที่ยังประเมินไม่ครบขึ้นก่อน เรียงตามสัดส่วนที่เหลือเยอะสุดก่อน
      const aDone = a.progress.total > 0 && a.progress.completed >= a.progress.total;
      const bDone = b.progress.total > 0 && b.progress.completed >= b.progress.total;
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aRemaining = a.progress.total - a.progress.completed;
      const bRemaining = b.progress.total - b.progress.completed;
      return bRemaining - aRemaining;
    });

    return list;
  }, [judgingProjects, searchTerm, statusFilter, sortBy]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      <PageHeader
        title={`สวัสดี, ${user?.name || 'ผู้ใช้งาน'}`}
        description="สร้างโครงการของคุณเอง หรือรอรับคำเชิญให้เป็นกรรมการจากโครงการอื่น"
      />

      {/* โครงการที่ฉันสร้าง (Project Admin ของโครงการนั้น) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800">โครงการที่ฉันสร้าง</h2>
          <Button onClick={() => navigate('/projects/new')}>+ สร้างโครงการใหม่</Button>
        </div>

        {myProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">ประเภท: {project.type}</p>
                  </div>
                  <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                </div>
                <Button className="w-full" onClick={() => navigate(`/project/${project.id}/dashboard`)}>
                  จัดการโครงการ
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-8">
              คุณยังไม่ได้สร้างโครงการใดๆ กด "+ สร้างโครงการใหม่" เพื่อเริ่มต้น
            </p>
          </Card>
        )}
      </section>

      {/* โครงการที่ฉันเป็นกรรมการ (ถูกเชิญเข้ามาโดย Project Admin ของโครงการนั้น) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xl font-bold text-gray-800">โครงการที่ฉันเป็นกรรมการ</h2>
        </div>

        {judgingProjects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="sm:max-w-xs w-full">
              <label htmlFor="judging-search" className="sr-only">
                ค้นหาชื่อโครงการหรือเจ้าของโครงการ
              </label>
              <Input
                id="judging-search"
                placeholder="ค้นหาชื่อโครงการ หรือ เจ้าของโครงการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">ยังประเมินไม่ครบ</option>
              <option value="completed">ประเมินครบแล้ว</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="pending-first">เรียง: ค้างเยอะสุดก่อน</option>
              <option value="name">เรียง: ชื่อโครงการ (ก-ฮ)</option>
            </select>

            <p className="text-sm text-gray-400 sm:ml-auto" aria-live="polite">
              พบ {filteredJudgingProjects.length} จาก {judgingProjects.length} โครงการ
            </p>
          </div>
        )}

        {judgingProjects.length > 0 ? (
          filteredJudgingProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJudgingProjects.map((project) => {
                const { completed, total } = project.progress;
                const isCompleted = total > 0 && completed >= total;
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">เจ้าของโครงการ: {project.ownerName}</p>
                      </div>
                      <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>ความคืบหน้าการประเมิน</span>
                        <span className={isCompleted ? 'font-medium text-green-600' : 'font-medium text-gray-700'}>
                          {completed} / {total} ทีม
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => navigate(`/judge/project/${project.id}/teams`)}
                      disabled={project.status !== 'Active'}
                    >
                      {project.status === 'Active' ? 'ไปที่หน้าประเมิน' : 'ยังไม่เปิดรับคะแนน'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-gray-50">
              <p className="text-center text-gray-500 py-8">ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก</p>
            </Card>
          )
        ) : (
          <Card className="bg-gray-50">
            <p className="text-center text-gray-500 py-8">
              ยังไม่มีโครงการที่คุณได้รับเชิญเป็นกรรมการ — เมื่อ Project Admin เชิญคุณเข้าโครงการ จะปรากฏที่นี่
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}