import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, FileSpreadsheet, FolderTree, Plus, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import TeamFormModal from '../components/TeamFormModal';
import TeamImportModal from '../components/TeamImportModal';
import TeamGroupManagement from '../components/TeamGroupManagement';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deleteTeam, getTeamsByProject, saveTeam } from '../data/TeamStore';
import { getProjectById, isProjectAdmin } from '../data/ProjectStore';
import { getGroupForTeam, removeTeamFromGroups } from '../data/GroupStore';

export default function ProjectTeams() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
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
      setTeams((previousTeams) =>
        teamData.id
          ? previousTeams.map((team) => (team.id === savedTeam.id ? savedTeam : team))
          : [savedTeam, ...previousTeams]
      );
      setIsFormOpen(false);
      setEditingTeam(null);
      toast.success(
        teamData.id
          ? t('บันทึกการแก้ไขทีมแล้ว', 'Team updated')
          : t('เพิ่มทีมใหม่เรียบร้อยแล้ว', 'Team added')
      );
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
        toast.success(
          t(
            `นำเข้าทีมสำเร็จ ${savedTeams.length} ทีม`,
            `Successfully imported ${savedTeams.length} teams`
          )
        );
      }
      if (savedTeams.length < newTeams.length) {
        toast.error(
          t(
            `ข้าม ${newTeams.length - savedTeams.length} ทีม เนื่องจากชื่อซ้ำกับข้อมูลเดิมหรือซ้ำกันในไฟล์`,
            `Skipped ${newTeams.length - savedTeams.length} duplicate team names`
          )
        );
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
      removeTeamFromGroups(id, teamToDelete.id);
      setTeams((previousTeams) =>
        previousTeams.filter((team) => team.id !== teamToDelete.id)
      );
      setIsConfirmOpen(false);
      setTeamToDelete(null);
      toast.success(t('ลบทีมเรียบร้อยแล้ว', 'Team deleted'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!project) {
    return (
      <div className="p-6">
        <Card>{t('ไม่พบโครงการนี้', 'Competition not found')}</Card>
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="p-6">
        <Card>
          {t(
            'เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการทีมและกลุ่มได้',
            'Only the Project Admin of this competition can manage teams and groups.'
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard', { compact: true })}
      </BackButton>
      <PageHeader
        title={t('จัดการทีมและกลุ่ม', 'Teams & Groups Management')}
        description={tDesc(
          `บริหารรายชื่อทีมและจัดกลุ่มในโครงการ ${project.name}`,
          `Manage participating teams and organizational groups for ${project.name}`
        )}
        action={
          activeTab === 'teams' && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                {t('นำเข้าจาก Excel', 'Import Excel', { compact: true })}
              </Button>
              <Button
                onClick={() => {
                  setEditingTeam(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('เพิ่มทีมใหม่', 'Add Team', { compact: true })}
              </Button>
            </div>
          )
        }
      />

      <div
        className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
        role="tablist"
        aria-label="จัดการทีมและกลุ่ม"
      >
        {[
          {
            id: 'teams',
            label: t('รายชื่อทีม', 'Teams', { compact: true }),
            icon: Users,
            count: teams.length,
          },
          {
            id: 'groups',
            label: t('จัดกลุ่มทีม', 'Groups', { compact: true }),
            icon: FolderTree,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tab.id}-tab`}
              aria-selected={active}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-precision-blue shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'teams' ? (
        <section
          id="teams-panel"
          role="tabpanel"
          aria-labelledby="teams-tab"
          className="space-y-6"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <label htmlFor="team-search" className="sr-only">
                {t('ค้นหาชื่อทีมหรือรายละเอียดผลงาน', 'Search team name or description')}
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="team-search"
                type="text"
                placeholder={t(
                  'ค้นหาชื่อทีม หรือ รายละเอียดผลงาน...',
                  'Search team name or project details...'
                )}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <p className="text-sm text-slate-500" aria-live="polite">
              {t(`พบ ${filteredTeams.length} ทีม`, `Showing ${filteredTeams.length} teams`)}
            </p>
          </div>

          {filteredTeams.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team) => {
                const group = getGroupForTeam(id, team.id);
                return (
                  <Card
                    key={team.id}
                    className="flex flex-col justify-between hover:border-blue-300 hover:shadow-md"
                  >
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                        {team.link ? (
                          <Badge variant="success">
                            {t('มีลิงก์ผลงาน', 'Link Attached', { compact: true })}
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            {t('ยังไม่มีลิงก์', 'No Link', { compact: true })}
                          </Badge>
                        )}
                      </div>
                      <p className="mb-3 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {t('กลุ่ม:', 'Group:', { compact: true })}{' '}
                        {group?.name || t('ยังไม่จัดกลุ่ม', 'Ungrouped', { compact: true })}
                      </p>
                      {team.description ? (
                        <p className="mb-4 line-clamp-3 text-sm text-slate-600">
                          {team.description}
                        </p>
                      ) : (
                        <p className="mb-4 text-sm italic text-slate-400">
                          {t('ยังไม่มีรายละเอียดผลงาน', 'No project description provided')}
                        </p>
                      )}
                      {team.link && (
                        <a
                          href={team.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-4 inline-flex items-center gap-1 break-all text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          {t('เปิดดูผลงาน', 'View Submission', { compact: true })}
                        </a>
                      )}
                    </div>
                    <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingTeam(team);
                          setIsFormOpen(true);
                        }}
                      >
                        {t('แก้ไข', 'Edit', { compact: true })}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(team)}
                      >
                        {t('ลบ', 'Delete', { compact: true })}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-slate-50/60">
              <p className="py-10 text-center text-sm text-slate-500">
                {t(
                  'ไม่พบทีมที่ตรงกับเงื่อนไขการค้นหา',
                  'No teams match your search criteria'
                )}
              </p>
            </Card>
          )}
        </section>
      ) : (
        <section id="groups-panel" role="tabpanel" aria-labelledby="groups-tab">
          <p className="mb-4 text-sm text-slate-600">
            {t(
              'Groups ใช้สำหรับจัดหมวดหมู่และกรองทีมเท่านั้น การให้สิทธิ์ประเมินจะกำหนดที่เมนู "มอบหมายทีมให้กรรมการ"',
              'Groups are used for organizing and filtering teams. Evaluation permissions are configured in Judge-Team Assignments.'
            )}
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
        title={t('ยืนยันการลบทีม', 'Confirm Team Deletion')}
        message={t(
          `คุณแน่ใจหรือไม่ว่าต้องการลบทีม "${teamToDelete?.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
          `Are you sure you want to delete "${teamToDelete?.name}"? This action cannot be undone.`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText={t('ลบทีม', 'Delete Team', { compact: true })}
      />
    </div>
  );
}
