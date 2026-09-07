import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamFormModal from '../components/TeamFormModal';
import { deleteTeam, getTeamsByProject, saveTeam } from '../data/TeamStore';

export default function ProjectTeams() {
  const { id } = useParams();

  const [teams, setTeams] = useState(() => getTeamsByProject(id));
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null); // null = โหมดเพิ่มใหม่

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  const filteredTeams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.members.some((m) => m.toLowerCase().includes(query))
    );
  }, [teams, searchTerm]);

  const handleAddClick = () => {
    setEditingTeam(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (team) => {
    setEditingTeam(team);
    setIsFormOpen(true);
  };

  const handleSaveTeam = (teamData) => {
    const savedTeam = saveTeam(id, teamData);
    setTeams((prev) => teamData.id
      ? prev.map((team) => (team.id === savedTeam.id ? savedTeam : team))
      : [savedTeam, ...prev]);
    setIsFormOpen(false);
    setEditingTeam(null);
  };

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (teamToDelete) {
      deleteTeam(id, teamToDelete.id);
      setTeams((prev) => prev.filter((team) => team.id !== teamToDelete.id));
      setIsConfirmOpen(false);
      setTeamToDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to={`/project/${id}/dashboard`} className="text-sm text-blue-600 hover:underline inline-block">
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader
        title="จัดการทีม (Teams)"
        description={`ทีมผู้เข้าแข่งขันทั้งหมดในโครงการ #${id}`}
        action={<Button onClick={handleAddClick}>+ เพิ่มทีมใหม่</Button>}
      />

      <div className="max-w-sm">
        <label htmlFor="team-search" className="sr-only">
          ค้นหาชื่อทีมหรือสมาชิก
        </label>
        <Input
          id="team-search"
          placeholder="ค้นหาชื่อทีม หรือ ชื่อสมาชิก..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <p className="text-sm text-gray-500" aria-live="polite">
        พบ {filteredTeams.length} ทีม
      </p>

      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                <Badge variant={team.members.length > 0 ? 'success' : 'warning'}>
                  {team.members.length} คน
                </Badge>
              </div>

              {team.members.length > 0 ? (
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  {team.members.map((member) => (
                    <li key={member}>• {member}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mb-4">ยังไม่มีสมาชิก</p>
              )}

              <div className="flex justify-end gap-1 pt-2 border-t border-gray-100">
                <Button variant="text" size="sm" onClick={() => handleEditClick(team)}>
                  แก้ไข
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDeleteClick(team)}>
                  ลบ
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-center text-gray-500 py-10">ไม่พบทีมที่ตรงกับเงื่อนไขการค้นหา</p>
        </Card>
      )}

      <TeamFormModal
        isOpen={isFormOpen}
        initialTeam={editingTeam}
        onSave={handleSaveTeam}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTeam(null);
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการลบทีม"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบทีม "${teamToDelete?.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ลบทีม"
      />
    </div>
  );
}