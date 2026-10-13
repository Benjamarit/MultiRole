import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamFormModal from '../components/TeamFormModal';
import TeamImportModal from '../components/TeamImportModal';
import TeamGroupManagement from '../components/TeamGroupManagement';
import { useAuth } from '../context/AuthContext';
import { deleteTeam, getTeamsByProject, saveTeam } from '../data/TeamStore';
import { getProjectById, isProjectAdmin } from '../data/ProjectStore';
import { getGroupForTeam } from '../data/GroupStore';

export default function ProjectTeams() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = getProjectById(id);
  const authorized = isProjectAdmin(id, user?.email);
  const [teams, setTeams] = useState(() => getTeamsByProject(id));
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const activeTab = searchParams.get('tab') === 'groups' ? 'groups' : 'teams';

  const filteredTeams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        (team.description || '').toLowerCase().includes(query)
    );
  }, [teams, searchTerm]);

  const setActiveTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'groups') nextParams.set('tab', 'groups');
    else nextParams.delete('tab');
    setSearchParams(nextParams);
  };

  const handleSaveTeam = (teamData) => {
    try {
      const savedTeam = saveTeam(id, teamData);
      setTeams((previousTeams) => teamData.id
        ? previousTeams.map((team) => (team.id === savedTeam.id ? savedTeam : team))
        : [savedTeam, ...previousTeams]);
      setIsFormOpen(false);
      setEditingTeam(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleImportTeams = (newTeams) => {
    const existingNames = new Set(teams.map((team) => team.name.trim().toLowerCase()));
    const uniqueTeams = newTeams.filter((teamData) => {
      const normalizedName = teamData.name.trim().toLowerCase();
      if (existingNames.has(normalizedName)) return false;
      existingNames.add(normalizedName);
      return true;
    });
    try {
      const savedTeams = uniqueTeams.map((teamData) => saveTeam(id, teamData));
      setTeams((previousTeams) => [...savedTeams, ...previousTeams]);
      setIsImportOpen(false);
      if (savedTeams.length > 0) {
        toast.success(`นำเข้าทีมสำเร็จ ${savedTeams.length} ทีม`);
      }
      if (savedTeams.length < newTeams.length) {
        toast.error(`ข้าม ${newTeams.length - savedTeams.length} ทีม เนื่องจากชื่อซ้ำกับข้อมูลเดิมหรือซ้ำกันในไฟล์`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!teamToDelete) return;
    try {
      deleteTeam(id, teamToDelete.id);
      setTeams((previousTeams) => previousTeams.filter((team) => team.id !== teamToDelete.id));
      setIsConfirmOpen(false);
      setTeamToDelete(null);
      toast.success('ลบทีมเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!project) {
    return <div className="p-6"><Card>ไม่พบโครงการนี้</Card></div>;
  }
  if (!authorized) {
    return <div className="p-6"><Card>เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการทีมและกลุ่มได้</Card></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackButton to={`/project/${id}/dashboard`}>กลับไปหน้า Dashboard โครงการ</BackButton>
      <PageHeader
        title="จัดการทีมและกลุ่ม"
        description={`จัดการทีมและกลุ่มในโครงการ ${project.name}`}
        action={activeTab === 'teams' && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>นำเข้าจาก Excel</Button>
            <Button onClick={() => {
              setEditingTeam(null);
              setIsFormOpen(true);
            }}>+ เพิ่มทีมใหม่</Button>
          </div>
        )}
      />

      <div className="flex gap-2 border-b border-border" role="tablist" aria-label="จัดการทีมและกลุ่ม">
        {[
          { id: 'teams', label: 'Teams' },
          { id: 'groups', label: 'Groups' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-precision-blue text-precision-blue'
                : 'border-transparent text-slate-500 hover:text-primary-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'teams' ? (
        <section id="teams-panel" role="tabpanel" aria-labelledby="teams-tab" className="space-y-6">
          <div className="max-w-sm">
            <label htmlFor="team-search" className="sr-only">ค้นหาชื่อทีมหรือรายละเอียดผลงาน</label>
            <Input
              id="team-search"
              placeholder="ค้นหาชื่อทีม หรือ รายละเอียดผลงาน..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <p className="text-sm text-gray-500" aria-live="polite">พบ {filteredTeams.length} ทีม</p>

          {filteredTeams.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team) => {
                const group = getGroupForTeam(id, team.id);
                return (
                  <Card key={team.id}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                      {team.link
                        ? <Badge variant="success">มีลิงก์ผลงาน</Badge>
                        : <Badge variant="warning">ยังไม่มีลิงก์</Badge>}
                    </div>
                    <p className="mb-3 text-xs font-medium text-slate-500">
                      กลุ่ม: {group?.name || 'ยังไม่จัดกลุ่ม'}
                    </p>
                    {team.description
                      ? <p className="mb-4 line-clamp-3 text-sm text-gray-600">{team.description}</p>
                      : <p className="mb-4 text-sm text-gray-400">ยังไม่มีรายละเอียดผลงาน</p>}
                    {Array.isArray(team.members) && team.members.length > 0 && (
                      <p className="mb-4 text-sm text-slate-600">
                        สมาชิก: {team.members.map((member) => typeof member === 'string'
                          ? member
                          : member.name || member.fullName || member.email || '').filter(Boolean).join(', ')}
                      </p>
                    )}
                    {team.link && (
                      <a
                        href={team.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-4 inline-block break-all text-sm text-blue-600 hover:underline"
                      >
                        ดูผลงาน &rarr;
                      </a>
                    )}
                    <div className="flex justify-end gap-1 border-t border-gray-100 pt-2">
                      <Button variant="text" size="sm" onClick={() => {
                        setEditingTeam(team);
                        setIsFormOpen(true);
                      }}>แก้ไข</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteClick(team)}>
                        ลบ
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card><p className="py-10 text-center text-gray-500">ไม่พบทีมที่ตรงกับเงื่อนไขการค้นหา</p></Card>
          )}
        </section>
      ) : (
        <section id="groups-panel" role="tabpanel" aria-labelledby="groups-tab">
          <p className="mb-4 text-sm text-slate-600">
            Groups ใช้จัดระเบียบทีมเท่านั้น ไม่ได้มอบหมายทีมให้กรรมการหรือให้สิทธิ์ประเมิน
          </p>
          <TeamGroupManagement projectId={id} teams={teams} />
        </section>
      )}

      {isFormOpen && (
        <TeamFormModal
          isOpen={isFormOpen}
          initialTeam={editingTeam}
          existingTeams={teams}
          onSave={handleSaveTeam}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTeam(null);
          }}
        />
      )}
      <TeamImportModal
        isOpen={isImportOpen}
        onImport={handleImportTeams}
        onClose={() => setIsImportOpen(false)}
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
