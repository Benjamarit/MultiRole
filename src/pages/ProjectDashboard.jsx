import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Scale, ClipboardList, BarChart3, Trophy } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getProjectById, isBeforeEvaluationDeadline, updateProjectDetails, updateProjectStatus } from '../data/ProjectStore';

const statusVariant = (status) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Draft': return 'warning';
    default: return 'default';
  }
};

export default function ProjectDashboard() {
  const { id } = useParams();
  const [project, setProject] = useState(() => getProjectById(id));

  const projectMenus = [
    { title: 'จัดการทีม (Teams)', path: `/project/${id}/teams`, icon: Users, desc: 'เพิ่ม/ลบ ทีมผู้เข้าแข่งขัน' },
    { title: 'จัดการกรรมการ (Judges)', path: `/project/${id}/judges`, icon: Scale, desc: 'เพิ่มกรรมการและป้องกัน COI' },
    { title: 'เกณฑ์ประเมิน (Criteria)', path: `/project/${id}/criteria`, icon: ClipboardList, desc: 'ตั้งค่า Dynamic Scoring' },
    { title: 'ติดตามการประเมิน (Monitoring)', path: `/project/${id}/evaluations`, icon: BarChart3, desc: 'ดูความคืบหน้าการให้คะแนน' },
    { title: 'สรุปผลจัดอันดับ (Leaderboard)', path: `/project/${id}/leaderboard`, icon: Trophy, desc: 'ดูอันดับและ Export ผลคะแนนรวม' }
  ];

  const handleToggleStatus = () => {
    const nextStatus = project.status === 'Active' ? 'Draft' : 'Active';
    updateProjectStatus(id, nextStatus);
    setProject((prev) => ({ ...prev, status: nextStatus }));
  };

  const handleDeadlineChange = (event) => {
    const updatedProject = updateProjectDetails(id, {
      evaluationDeadline: event.target.value || null,
    });
    setProject(updatedProject);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to="/workspace" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
        &larr; กลับไปหน้า Workspace
      </Link>

      <PageHeader
        title={project ? project.name : `Dashboard โครงการ #${id}`}
        description="ภาพรวมและการตั้งค่าสำหรับการประกวด"
        action={
          project && (
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant(project.status)}>
                {project.status === 'Active' ? 'กำลังเปิดรับคะแนน' : 'Draft — ยังไม่เปิดรับคะแนน'}
              </Badge>
              <Button variant={project.status === 'Active' ? 'secondary' : 'primary'} onClick={handleToggleStatus}>
                {project.status === 'Active' ? 'ปิดรับคะแนนชั่วคราว' : 'เปิดรับคะแนน'}
              </Button>
            </div>
          )
        }
      />

      {project && project.status !== 'Active' && (
        <Card className="bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700">
            โครงการนี้ยังเป็นสถานะ Draft — กรรมการที่ถูกเชิญจะยังกดเข้าหน้าประเมินไม่ได้จนกว่าจะกด "เปิดรับคะแนน"
            แนะนำให้ตั้งค่าทีมและเกณฑ์ประเมินให้ครบก่อนเปิดรับคะแนนจริง
          </p>
        </Card>
      )}

      {project && (
        <Card>
          <label htmlFor="project-evaluation-deadline" className="block text-sm font-medium text-gray-700 mb-1">
            กำหนดส่งคะแนน (Evaluation Deadline)
          </label>
          <input
            id="project-evaluation-deadline"
            type="datetime-local"
            value={project.evaluationDeadline ? project.evaluationDeadline.slice(0, 16) : ''}
            onChange={handleDeadlineChange}
            className="w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
          />
          <p className="mt-1 text-xs text-gray-500">
            {project.evaluationDeadline
              ? isBeforeEvaluationDeadline(project)
                ? `กรรมการสามารถแก้ไขและส่งคะแนนได้ถึง ${new Date(project.evaluationDeadline).toLocaleString('th-TH')}`
                : 'หมดเขตรับคะแนนแล้ว'
              : 'หากไม่กำหนด ระบบจะเปิดให้แก้ไขและส่งคะแนนได้ตามปกติ'}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projectMenus.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link key={menu.path} to={menu.path}>
              <Card className="h-full hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
                <Icon
                  className="w-7 h-7 mb-3 text-blue-600 group-hover:scale-110 transition-transform"
                  aria-hidden="true"
                />
                <h3 className="font-bold text-gray-900 mb-1">{menu.title}</h3>
                <p className="text-xs text-gray-500">{menu.desc}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}