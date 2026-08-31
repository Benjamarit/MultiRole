import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function ProjectList() {
  const navigate = useNavigate();

  // ข้อมูลจำลองโครงการทั้งหมดในระบบ (มุมมอง System Admin เห็นได้ทุกโครงการ ไม่จำกัดแค่ของตัวเอง)
  const allProjects = [
    { id: 1, name: 'การประกวดนวัตกรรม AI 2026', type: 'Technology', admin: 'ดร.สมชาย ใจดี', status: 'Active', teamsCount: 10, judgesCount: 3 },
    { id: 2, name: 'Hackathon ภาคฤดูร้อน', type: 'Software', admin: 'อ.สมศรี เรียนเก่ง', status: 'Draft', teamsCount: 0, judgesCount: 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="โครงการทั้งหมด (All Projects)" 
        description="ภาพรวมโครงการประกวดทั้งหมดในระบบ ไม่ว่าจะดูแลโดย Project Admin คนใด"
        action={<Button onClick={() => navigate('/admin/projects/new')}>+ สร้างโครงการใหม่</Button>}
      />

      {allProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">ประเภท: {project.type}</p>
                  <p className="text-sm text-gray-500">ผู้ดูแล: {project.admin}</p>
                </div>
                <Badge variant={project.status === 'Active' ? 'success' : 'warning'}>
                  {project.status}
                </Badge>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="bg-gray-50 px-3 py-2 rounded-md flex-1 text-center">
                  <p className="text-xs text-gray-500">จำนวนทีม</p>
                  <p className="text-lg font-semibold text-gray-800">{project.teamsCount}</p>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded-md flex-1 text-center">
                  <p className="text-xs text-gray-500">กรรมการ</p>
                  <p className="text-lg font-semibold text-gray-800">{project.judgesCount}</p>
                </div>
              </div>

              {/* เมื่อกดปุ่ม จะพาไปยังหน้า Dashboard ของโครงการนั้นๆ โดยส่ง Parameter :id ไปด้วย */}
              <Button 
                className="w-full" 
                onClick={() => navigate(`/project/${project.id}/dashboard`)}
              >
                จัดการโครงการ
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-center text-gray-500 py-10">ยังไม่มีโครงการประกวดในระบบ</p>
        </Card>
      )}
    </div>
  );
}