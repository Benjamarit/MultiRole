import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { getMyProjects, getJudgingProjects } from '../data/ProjectStore';

const statusVariant = (status) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Draft': return 'warning';
    default: return 'default';
  }
};

export default function Workspace() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const myProjects = getMyProjects(user?.email);
  const judgingProjects = getJudgingProjects(user?.email);

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

        {judgingProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {judgingProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">เจ้าของโครงการ: {project.ownerName}</p>
                  </div>
                  <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate(`/judge/project/${project.id}/teams`)}
                  disabled={project.status !== 'Active'}
                >
                  {project.status === 'Active' ? 'ไปที่หน้าประเมิน' : 'ยังไม่เปิดรับคะแนน'}
                </Button>
              </Card>
            ))}
          </div>
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