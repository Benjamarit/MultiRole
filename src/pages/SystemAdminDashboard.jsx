import { Link } from 'react-router-dom';
import { Users, FolderKanban, Scale } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';

// ข้อมูลจำลองสำหรับแสดงสถิติ (Mock Data)
const stats = [
  { title: 'ผู้ใช้งานทั้งหมด', value: '1,245', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { title: 'โครงการประกวด', value: '48', icon: FolderKanban, color: 'text-green-600', bg: 'bg-green-100' },
  { title: 'กรรมการในระบบ', value: '312', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-100' },
];

// ข้อมูลจำลองสำหรับตารางโครงการล่าสุด
const recentProjects = [
  { id: 1, name: 'การประกวดนวัตกรรม AI 2026', admin: 'ดร.สมชาย ใจดี', status: 'Active' },
  { id: 2, name: 'Hackathon ภาคฤดูร้อน', admin: 'อ.สมศรี เรียนเก่ง', status: 'Draft' },
  { id: 3, name: 'ประกวดแผนธุรกิจ Startup', admin: 'นายวิชัย ทำงาน', status: 'Completed' },
];

const statusVariant = (status) => {
  switch (status) {
    case 'Active': return 'success';
    case 'Draft': return 'warning';
    default: return 'default';
  }
};

export default function SystemAdminDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <PageHeader
        title="System Admin Dashboard"
        description="ภาพรวมและสถานะของระบบประเมินผลการประกวด"
      />

      {/* การ์ดสรุปสถิติ (Stat Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-full ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ส่วนตารางข้อมูลล่าสุด */}
      <Card noPadding>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">โครงการประกวดล่าสุด (Recent Projects)</h2>
          <Link to="/admin/projects" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ดูทั้งหมด &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="px-6 py-3 font-medium">รหัส</th>
                <th className="px-6 py-3 font-medium">ชื่อโครงการ</th>
                <th className="px-6 py-3 font-medium">Project Admin</th>
                <th className="px-6 py-3 font-medium">สถานะ</th>
                <th className="px-6 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors text-sm">
                    <td className="px-6 py-4 text-gray-500">#{project.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{project.name}</td>
                    <td className="px-6 py-4 text-gray-600">{project.admin}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/project/${project.id}/dashboard`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        ดูข้อมูล
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    ยังไม่มีโครงการประกวดในระบบ
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