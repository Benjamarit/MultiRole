import ProjectStructureLock from '../components/ProjectStructureLock';
import { isProjectStructureLocked } from '../data/projects/ProjectLock';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, FileSpreadsheet, FolderTree, Link2, Pencil, Plus, Trash2, Users } from 'lucide-react';
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
import { MonitoringEmpty, MonitoringPagination, MonitoringSearch, MonitoringStat, MonitoringTabs } from '../components/MonitoringUI';
import { compareTeamNames } from '../data/teams/TeamOrdering';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deleteTeam, getTeamsByProject, saveTeam } from '../data/teams/TeamStore';
import { getProjectById, isProjectAdmin } from '../data/projects/ProjectStore';
import { getGroupForTeam, getGroupsByProject } from '../data/teams/GroupStore';

export default function ProjectTeams() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const project = getProjectById(id);
  const structureLocked = isProjectStructureLocked(project);
  const authorized = isProjectAdmin(id, user?.email);
  const [teams, setTeams] = useState(() => getTeamsByProject(id));
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const groups = getGroupsByProject(id);
  const ungroupedCount = teams.filter(team => !getGroupForTeam(id, team.id)).length;
  const activeTab = searchParams.get('tab') === 'groups' ? 'groups' : 'teams';

  const filteredTeams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return teams.filter(team => {
      const group = getGroupForTeam(id, team.id);
      return (!query || `${team.name} ${team.description || ''} ${group?.name || ''}`.toLowerCase().includes(query)) &&
        (groupFilter === 'all' || (groupFilter === 'ungrouped' ? !group : group?.id === groupFilter));
    }).sort((a, b) => sortBy === 'name' ? compareTeamNames(a.name, b.name) : 0);
  }, [teams, searchTerm, groupFilter, sortBy, id]);
  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / 9));
  const currentPage = Math.min(page, totalPages);
  const resetFilters = () => { setSearchTerm(''); setGroupFilter('all'); setSortBy('order'); setPage(1); };

  const setActiveTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'groups') nextParams.set('tab', 'groups');
    else nextParams.delete('tab');
    setSearchParams(nextParams);
  };

  const handleSaveTeam = async (teamData) => {
    if (isSaving || structureLocked) return;
    setIsSaving(true);
    try {
      await saveTeam(id, teamData);
      setTeams(getTeamsByProject(id));
      setIsFormOpen(false);
      setEditingTeam(null);
      toast.success(
        teamData.id
          ? t('บันทึกการแก้ไขทีมแล้ว', 'Team updated')
          : t('เพิ่มทีมใหม่เรียบร้อยแล้ว', 'Team added')
      );
    } catch (error) {
      toast.error(error.message);
    } finally { setIsSaving(false); }
  };

  const handleImportTeams = async (newTeams) => {
    if (isSaving || structureLocked) return false;
    setIsSaving(true);
    const existingNames = new Set(teams.map((team) => team.name.trim().toLowerCase()));
    const uniqueTeams = newTeams.filter((teamData) => {
      const normalizedName = teamData.name.trim().toLowerCase();
      if (existingNames.has(normalizedName)) return false;
      existingNames.add(normalizedName);
      return true;
    });
    const savedTeams = [];
    try {
      for (const teamData of uniqueTeams) savedTeams.push(await saveTeam(id, teamData));
      setTeams(getTeamsByProject(id));
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
      return true;
    } catch (error) {
      setTeams(getTeamsByProject(id));
      throw new Error(t(`นำเข้าแล้ว ${savedTeams.length} ทีม ก่อนหยุด: ${error.message} รายการที่เหลือยังอยู่ให้ลองใหม่`, `Imported ${savedTeams.length} teams before stopping: ${error.message} Remaining rows are retained for retry.`), { cause: error });
    } finally { setIsSaving(false); }
  };

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!teamToDelete || isDeleting || structureLocked) return;
    setIsDeleting(true);
    try {
      await deleteTeam(id, teamToDelete.id);
      setTeams((previousTeams) =>
        previousTeams.filter((team) => team.id !== teamToDelete.id)
      );
      setIsConfirmOpen(false);
      setTeamToDelete(null);
      toast.success(t('ลบทีมเรียบร้อยแล้ว', 'Team deleted'));
    } catch (error) {
      toast.error(error.message);
    } finally { setIsDeleting(false); }
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

  const inputClass = 'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-6 lg:p-8">
      <BackButton to={`/project/${id}/dashboard`}>{t('กลับไปหน้า Dashboard', 'Back to Dashboard')}</BackButton>
      <ProjectStructureLock project={project} />
      <PageHeader title={t('จัดการทีมและกลุ่ม', 'Teams & Groups')} subtitle={project.name} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={isSaving || structureLocked} onClick={() => setIsImportOpen(true)}><FileSpreadsheet className="h-4 w-4 text-emerald-600" />{t('นำเข้า Excel', 'Import Excel')}</Button><Button disabled={isSaving || structureLocked} onClick={() => { setEditingTeam(null); setIsFormOpen(true); }}><Plus className="h-4 w-4" />{t('เพิ่มทีมใหม่', 'Add team')}</Button></div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MonitoringStat icon={Users} label={t('ทีมทั้งหมด', 'All teams')} value={teams.length} onClick={() => { resetFilters(); setActiveTab('teams'); }} />
        <MonitoringStat icon={FolderTree} label={t('กลุ่มการแข่งขัน', 'Team groups')} value={groups.length} onClick={() => setActiveTab('groups')} />
        <MonitoringStat icon={Users} tone={ungroupedCount ? 'amber' : 'green'} label={t('ทีมที่ยังไม่จัดกลุ่ม', 'Ungrouped teams')} value={ungroupedCount} onClick={() => { resetFilters(); setGroupFilter('ungrouped'); setActiveTab('teams'); }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><MonitoringTabs id="team-management" label={t('จัดการทีมและกลุ่ม', 'Team management')} items={[{ id: 'teams', label: t('รายชื่อทีม', 'Teams'), icon: Users, count: teams.length }, { id: 'groups', label: t('จัดกลุ่มทีม', 'Groups'), icon: FolderTree, count: groups.length }]} value={activeTab} onChange={setActiveTab} /><Link to={`/project/${id}/assignments`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">{t('มอบหมายทีมให้กรรมการ', 'Assign teams to judges')}<ArrowRight className="h-3.5 w-3.5" /></Link></div>
      {activeTab === 'teams' ? <section role="tabpanel" id="team-management-teams-panel" aria-labelledby="team-management-teams-tab" className="space-y-4">
        <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs"><div className="flex flex-col gap-3 sm:flex-row"><MonitoringSearch id="team-search" label={t('ค้นหาชื่อทีม กลุ่ม หรือรายละเอียด', 'Search team, group, or description')} value={searchTerm} onChange={value => { setSearchTerm(value); setPage(1); }} /><select aria-label={t('กรองกลุ่มทีม', 'Filter team group')} value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }} className={inputClass}><option value="all">{t('ทุกกลุ่ม', 'All groups')}</option><option value="ungrouped">{t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select aria-label={t('เรียงรายชื่อทีม', 'Sort teams')} value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className={inputClass}><option value="order">{t('ตามลำดับทีม', 'Team order')}</option><option value="name">{t('ตามชื่อทีม', 'Team name')}</option></select></div><p className="text-xs text-slate-400" role="status">{t(`แสดง ${filteredTeams.length} จาก ${teams.length} ทีม`, `${filteredTeams.length} of ${teams.length} teams`)}</p></div>
        {filteredTeams.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredTeams.slice((currentPage - 1) * 9, currentPage * 9).map(team => { const group = getGroupForTeam(id, team.id); return <Card key={team.id} noPadding className="flex flex-col transition-colors hover:border-blue-200 [&>div]:flex [&>div]:flex-1 [&>div]:flex-col"><article className="flex flex-1 flex-col"><div className="flex-1 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Users className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{team.name}</h3><div className="mt-1.5"><Badge variant={group ? 'info' : 'default'}><FolderTree className="h-3 w-3" />{group?.name || t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</Badge></div></div></div><p className={`mt-4 line-clamp-3 break-words text-sm leading-6 ${team.description ? 'text-slate-500' : 'text-slate-400'}`}>{team.description || t('ยังไม่มีรายละเอียดผลงาน', 'No project description yet.')}</p></div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-5">{team.link ? <a href={team.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" />{t('ดูผลงาน', 'View submission')}</a> : <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><Link2 className="h-3.5 w-3.5" />{t('ยังไม่มีลิงก์ผลงาน', 'No submission link')}</span>}<div className="flex gap-1"><Button variant="secondary" size="sm" disabled={isSaving || structureLocked} aria-label={t(`แก้ไข ${team.name}`, `Edit ${team.name}`)} onClick={() => { setEditingTeam(team); setIsFormOpen(true); }}><Pencil className="h-3.5 w-3.5" />{t('แก้ไข', 'Edit')}</Button><Button variant="textGray" size="sm" disabled={structureLocked} aria-label={t(`ลบ ${team.name}`, `Delete ${team.name}`)} onClick={() => handleDeleteClick(team)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></div></div></article></Card>; })}</div> : <Card noPadding><MonitoringEmpty icon={Users} title={teams.length ? t('ไม่พบทีมที่ตรงกับตัวกรอง', 'No matching teams') : t('เริ่มต้นด้วยการเพิ่มทีมแรก', 'Add your first team')} description={teams.length ? t('ลองเปลี่ยนคำค้นหาหรือเลือกกลุ่มอื่น', 'Try another search or team group.') : t('เพิ่มทีมทีละทีม หรือนำเข้ารายชื่อจาก Excel ด้านบน', 'Add teams individually or import an Excel file above.')} onReset={teams.length ? resetFilters : undefined} /></Card>}
        {filteredTeams.length > 9 && <div className="rounded-xl border border-slate-200 bg-white"><MonitoringPagination page={currentPage} pages={totalPages} count={filteredTeams.length} onChange={setPage} /></div>}
      </section> : <section role="tabpanel" id="team-management-groups-panel" aria-labelledby="team-management-groups-tab"><TeamGroupManagement readOnly={structureLocked} key={id} projectId={id} teams={teams} onTeamsChange={setTeams} /></section>}
      {isFormOpen && <TeamFormModal isOpen={isFormOpen} initialTeam={editingTeam} existingTeams={teams} isSaving={isSaving} onSave={handleSaveTeam} onClose={() => { if (!isSaving) { setIsFormOpen(false); setEditingTeam(null); } }} />}
      <TeamImportModal isOpen={isImportOpen} isImporting={isSaving} existingTeamNames={teams.map(team => team.name)} onImport={handleImportTeams} onClose={() => { if (!isSaving) setIsImportOpen(false); }} />
      <ConfirmDialog isOpen={isConfirmOpen} isLoading={isDeleting} title={t('ยืนยันการลบทีม', 'Delete team')} message={t(`ลบทีม “${teamToDelete?.name}” อย่างถาวร? ข้อมูลการมอบหมายและผลประเมินของทีมนี้อาจได้รับผลกระทบ`, `Permanently delete “${teamToDelete?.name}”? This may affect its assignments and evaluations.`)} onConfirm={confirmDelete} onCancel={() => setIsConfirmOpen(false)} confirmText={t('ลบทีม', 'Delete team')} />
    </div>
  );
}
