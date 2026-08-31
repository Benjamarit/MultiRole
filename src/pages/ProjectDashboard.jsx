import { useParams, Link } from 'react-router-dom';
import { Users, Scale, ClipboardList, BarChart3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

export default function ProjectDashboard() {
  const { id } = useParams(); // ดึง id จาก URL (เช่น /project/1/dashboard จะได้ id = 1)

  // เมนูย่อยสำหรับจัดการโครงการนี้
  const projectMenus = [
    { title: 'จัดการทีม (Teams)', path: `/project/${id}/teams`, icon: Users, desc: 'เพิ่ม/ลบ ทีมผู้เข้าแข่งขัน' },
    { title: 'จัดการกรรมการ (Judges)', path: `/project/${id}/judges`, icon: Scale, desc: 'เพิ่มกรรมการและป้องกัน COI' },
    { title: 'เกณฑ์ประเมิน (Criteria)', path: `/project/${id}/criteria`, icon: ClipboardList, desc: 'ตั้งค่า Dynamic Scoring' },
    { title: 'ติดตามการประเมิน (Monitoring)', path: `/project/${id}/evaluations`, icon: BarChart3, desc: 'ดูความคืบหน้าการให้คะแนน' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* สามารถเพิ่มปุ่มย้อนกลับไปหน้ารายการโครงการได้ */}
      <Link to="/admin/projects" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
        &larr; กลับไปหน้ารายการโครงการ
      </Link>
      
      <PageHeader 
        title={`Dashboard โครงการ #${id}`} 
        description="ภาพรวมและการตั้งค่าสำหรับการประกวด"
      />

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