import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';

// ข้อมูลจำลองสำหรับกรรมการ (สมมติว่าเป็น judge@example.com ล็อกอินเข้ามา)
const myAssignedProjects = [
  { 
    id: 1, 
    name: 'การประกวดนวัตกรรม AI 2026', 
    status: 'Active',
    teams: [
      { id: 1, name: 'Team Alpha', evaluateStatus: 'Pending' },
      { id: 2, name: 'Team Beta', evaluateStatus: 'Completed' },
      // Team Gamma ถูกซ่อนไว้เนื่องจากติด COI
    ]
  },
  { 
    id: 2, 
    name: 'Hackathon ภาคฤดูร้อน', 
    status: 'Draft', 
    teams: []
  }
];

export default function JudgeDashboard() {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    return status === 'Completed' ? <Badge variant="success">ประเมินแล้ว</Badge> : <Badge variant="warning">รอประเมิน</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="พื้นที่ทำงานกรรมการ (Judge Dashboard)" 
        description="เลือกทีมที่คุณต้องการประเมินคะแนนจากโครงการที่ได้รับมอบหมาย"
      />

      <div className="space-y-8">
        {myAssignedProjects.map((project) => (
          <div key={project.id} className="space-y-4">
            
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-bold text-gray-800">
                {project.name}
              </h2>
              <Badge variant={project.status === 'Active' ? 'success' : 'default'}>
                {project.status === 'Active' ? 'กำลังเปิดรับคะแนน' : 'ยังไม่เปิดรับคะแนน'}
              </Badge>
            </div>

            {project.status === 'Active' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
                      {getStatusBadge(team.evaluateStatus)}
                    </div>
                    
                    <Button 
                      variant={team.evaluateStatus === 'Completed' ? 'secondary' : 'primary'}
                      className="w-full mt-4"
                      onClick={() => navigate(`/judge/project/${project.id}/evaluate/${team.id}`)}
                    >
                      {team.evaluateStatus === 'Completed' ? 'ดู/แก้ไขคะแนน' : 'เริ่มการประเมิน'}
                    </Button>
                  </Card>
                ))}
                {project.teams.length === 0 && (
                  <p className="text-gray-500 text-sm">ไม่มีทีมที่ต้องประเมินในขณะนี้</p>
                )}
              </div>
            ) : (
              <Card className="bg-gray-50">
                <p className="text-center text-gray-500 py-4">โครงการนี้ยังไม่เปิดให้กรรมการเข้าประเมินคะแนน</p>
              </Card>
            )}
            
          </div>
        ))}
      </div>
    </div>
  );
}