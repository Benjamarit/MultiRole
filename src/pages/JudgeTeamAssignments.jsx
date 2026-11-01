import ProjectStructureLock from '../components/ProjectStructureLock';
import { isProjectStructureLocked } from '../data/projects/ProjectLock';
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, CheckSquare2, Circle, FolderTree, Plus, RotateCcw, Save, UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import UsageHelp from '../components/UsageHelp';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { MonitoringEmpty, MonitoringPagination, MonitoringSearch, MonitoringStat } from '../components/MonitoringUI';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getGroupsByProject,
  getGroupForTeam,
  getTeamIdsInGroup,
} from '../data/teams/GroupStore';
import {
  getAssignedTeamIds,
  getJudgeAssignments,
  getJudgeIdsAssignedToTeam,
  getProjectById,
  isProjectAdmin,
  setJudgeAssignedTeams,
} from '../data/projects/ProjectStore';
import { getTeamsByProject } from '../data/teams/TeamStore';
import { getRegisteredUsers } from '../context/authStore';

const PAGE_SIZE = 10;
const UNGROUPED_FILTER = 'ungrouped';

export default function JudgeTeamAssignments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const project = getProjectById(id);
  const structureLocked = isProjectStructureLocked(project);
  const authorized = isProjectAdmin(id, user?.email);
  const teams = getTeamsByProject(id);
  const groups = getGroupsByProject(id);
  const registeredUsers = getRegisteredUsers();
  const [assignments, setAssignments] = useState(() => getJudgeAssignments(id));
  const [selectedJudgeId, setSelectedJudgeId] = useState(() =>
    String(getJudgeAssignments(id)[0]?.id || '')
  );
  const [judgeSearch, setJudgeSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pendingTeamIdsByJudge, setPendingTeamIdsByJudge] = useState({});
  const [teamSearch, setTeamSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const selectedJudge = assignments.find(
    (assignment) => String(assignment.id) === selectedJudgeId
  );
  const savedTeamIds = selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : [];
  const selectedTeamIds = pendingTeamIdsByJudge[selectedJudgeId] ?? savedTeamIds;

  const groupTeamIds = useMemo(() => {
    if (groupFilter === 'all') return null;
    if (groupFilter === UNGROUPED_FILTER) {
      return new Set(
        teams
          .filter((team) => !getGroupForTeam(id, team.id))
          .map((team) => String(team.id))
      );
    }
    const group = groups.find((item) => String(item.id) === groupFilter);
    return new Set(group ? getTeamIdsInGroup(id, group.id) : []);
  }, [groupFilter, groups, id, teams]);

  const selectedTeamSet = new Set(selectedTeamIds.map(String));
  const savedTeamSet = new Set(savedTeamIds.map(String));
  const query = teamSearch.trim().toLowerCase();
  const filteredTeams = teams.filter(team => {
    const teamId = String(team.id);
    return (!groupTeamIds || groupTeamIds.has(teamId)) &&
      (!query || `${team.name} ${team.description || ''}`.toLowerCase().includes(query)) &&
      (teamFilter === 'all' || (teamFilter === 'selected' ? selectedTeamSet.has(teamId) : getJudgeIdsAssignedToTeam(id, team.id).length === 0));
  });
  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTeams = filteredTeams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const userByEmail = new Map(
    registeredUsers.map((registeredUser) => [registeredUser.email, registeredUser])
  );
  const judgeOptions = assignments.map((assignment) => {
    const email = assignment.email || '';
    const judge = userByEmail.get(email);
    const name = judge?.name || assignment.name || email || t('กรรมการ', 'Judge');
    return { value: String(assignment.id), name, email, label: `${name} ${email}` };
  });
  const normalizedSearch = judgeSearch.trim().toLocaleLowerCase();
  const matchingJudgeOptions = judgeOptions.filter(option => option.label.toLocaleLowerCase().includes(normalizedSearch));
  const isDirty =
    selectedTeamIds.length !== savedTeamIds.length ||
    selectedTeamIds.some((teamId) => !savedTeamSet.has(String(teamId)));
  const unassignedTeams = teams.filter(
    (team) => getJudgeIdsAssignedToTeam(id, team.id).length === 0
  );

  const getAssignedJudgesForTeam = (teamId) => getJudgeIdsAssignedToTeam(id, teamId);

  const toggleTeam = (teamId) => {
    if (structureLocked) return;
    const numericTeamId = String(teamId);
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ?? savedTeamIds;
      const updated = previous.includes(numericTeamId)
        ? previous.filter((assignedId) => assignedId !== numericTeamId)
        : [...previous, numericTeamId];
      return { ...previousSelections, [selectedJudgeId]: updated };
    });
  };

  const setFilteredTeamsSelected = (shouldSelect) => {
    if (structureLocked) return;
    const filteredIds = new Set(filteredTeams.map((team) => String(team.id)));
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ?? savedTeamIds;
      const retained = previous.filter((teamId) => !filteredIds.has(String(teamId)));
      return {
        ...previousSelections,
        [selectedJudgeId]: shouldSelect ? [...retained, ...filteredIds] : retained,
      };
    });
  };

  const cancelChanges = () => {
    if (!selectedJudge) return;
    setPendingTeamIdsByJudge((previousSelections) => ({
      ...previousSelections,
      [selectedJudgeId]: getAssignedTeamIds(id, selectedJudge.id),
    }));
  };

  const saveAssignments = async () => {
    if (isSaving || structureLocked) return;
    if (!selectedJudge) {
      toast.error(t('กรุณาเลือกกรรมการก่อน', 'Please select a judge first'));
      return;
    }
    setIsSaving(true);
    try {
      await setJudgeAssignedTeams(id, selectedJudge.id, selectedTeamIds);
      setAssignments(getJudgeAssignments(id));
      setPendingTeamIdsByJudge((previousSelections) => ({
        ...previousSelections,
        [selectedJudgeId]: [...new Set(selectedTeamIds.map(String))],
      }));
      toast.success(
        t('บันทึกการมอบหมายทีมเรียบร้อยแล้ว', 'Team assignments saved successfully')
      );
    } catch (error) {
      toast.error(error.message);
    } finally { setIsSaving(false); }
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
            'เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการการมอบหมายได้',
            'Only the Project Admin can manage judge-team assignments.'
          )}
        </Card>
      </div>
    );
  }

  const selectedOption = judgeOptions.find(option => option.value === selectedJudgeId);
  const addedCount = selectedTeamIds.filter(teamId => !savedTeamSet.has(String(teamId))).length;
  const removedCount = savedTeamIds.filter(teamId => !selectedTeamSet.has(String(teamId))).length;
  const dirtyJudgeIds = new Set(Object.entries(pendingTeamIdsByJudge).filter(([judgeId, pending]) => {
    const saved = getAssignedTeamIds(id, judgeId);
    return pending.length !== saved.length || pending.some(teamId => !saved.includes(teamId));
  }).map(([judgeId]) => judgeId));
  const resetTeamFilters = () => { setTeamSearch(''); setGroupFilter('all'); setTeamFilter('all'); setPage(1); };
  if (!teams.length || !assignments.length) return <div className="mx-auto max-w-7xl space-y-6 p-6">
    <BackButton to={`/project/${id}/dashboard`}>{t('กลับไปภาพรวมโครงการ', 'Back to project overview')}</BackButton>
    <ProjectStructureLock project={project} />
    <PageHeader title={t('มอบหมายทีมให้กรรมการ', 'Judge-Team Assignments')} />
    <Card><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /><div><h2 className="font-semibold text-slate-900">{t('เตรียมทีมและกรรมการก่อนมอบหมาย', 'Add teams and judges before assigning')}</h2><p className="mt-2 text-sm text-slate-500">{!teams.length && !assignments.length ? t('โครงการนี้ยังไม่มีทีมและกรรมการ', 'This project has no teams or judges yet.') : !teams.length ? t('โครงการนี้ยังไม่มีทีมเข้าแข่งขัน', 'This project has no teams yet.') : t('โครงการนี้ยังไม่มีกรรมการ', 'This project has no judges yet.')}</p><div className="mt-4 flex flex-wrap gap-2">{!teams.length && <Button onClick={() => navigate(`/project/${id}/teams`)}>{t('เพิ่มทีม', 'Add teams')}</Button>}{!assignments.length && <Button variant={!teams.length ? 'secondary' : 'primary'} onClick={() => navigate(`/project/${id}/judges`)}>{t('เพิ่มกรรมการ', 'Add judges')}</Button>}</div></div></div></Card>
  </div>;

  const inputClass = 'min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-6 lg:p-8">
    <BackButton to={`/project/${id}/dashboard`}>{t('กลับไปหน้า Dashboard', 'Back to Dashboard')}</BackButton>
    <ProjectStructureLock project={project} />
    <PageHeader title={t('มอบหมายทีมให้กรรมการ', 'Assign Teams to Judges')} subtitle={project.name} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={isSaving} onClick={() => navigate(`/project/${id}/judges`)}><UserCheck className="h-4 w-4" />{t('จัดการกรรมการ', 'Manage judges')}</Button><Button variant="secondary" disabled={isSaving} onClick={() => navigate(`/project/${id}/teams`)}><Users className="h-4 w-4" />{t('จัดการทีม', 'Manage teams')}</Button></div>} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><MonitoringStat icon={Users} label={t('ทีมทั้งหมด', 'All teams')} value={teams.length} onClick={resetTeamFilters} /><MonitoringStat icon={UserCheck} label={t('กรรมการในโครงการ', 'Project judges')} value={assignments.length} /><MonitoringStat icon={unassignedTeams.length ? AlertCircle : CheckCircle2} tone={unassignedTeams.length ? 'amber' : 'green'} label={t('ทีมที่ยังไม่มีกรรมการ', 'Teams without a judge')} value={unassignedTeams.length} hint={t('นับจากการมอบหมายที่บันทึกแล้ว', 'Based on saved assignments')} onClick={() => { resetTeamFilters(); setTeamFilter('unassigned'); }} active={teamFilter === 'unassigned'} /></div>
    <UsageHelp title={t('วิธีมอบหมายทีม', 'How to assign teams')}><p>{t('เลือกกรรมการ → เลือกทีม → บันทึก โดยบันทึกแยกตามกรรมการที่เลือก', 'Choose a judge → Select teams → Save. Save separately for each judge.')}</p><p>{t('หนึ่งทีมมีกรรมการได้หลายคน กลุ่มใช้กรองรายการเท่านั้น ไม่ได้ให้สิทธิ์ประเมิน', 'A team can have multiple judges. Groups filter the list; they do not grant access.')}</p></UsageHelp>
    {assignments.length && teams.length ? <>
      <fieldset disabled={isSaving} aria-busy={isSaving} className="grid min-w-0 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"><legend className="sr-only">{t('เลือกกรรมการและทีม', 'Select judge and teams')}</legend>
        <Card noPadding><aside aria-label={t('รายชื่อกรรมการ', 'Judge list')}><div className="space-y-4 border-b border-slate-100 p-4"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">1</span><h2 className="text-sm font-bold text-slate-900">{t('เลือกกรรมการ', 'Choose a judge')}</h2></div><MonitoringSearch id="judge-search" label={t('ค้นหาชื่อหรืออีเมลกรรมการ', 'Search judge name or email')} value={judgeSearch} onChange={setJudgeSearch} /></div><div className="max-h-64 space-y-1 overflow-y-auto p-2 lg:max-h-[560px]">{matchingJudgeOptions.map(option => {
          const active = option.value === selectedJudgeId;
          const count = getAssignedTeamIds(id, option.value).length;
          const dirty = dirtyJudgeIds.has(option.value);
          return <button type="button" key={option.value} aria-pressed={active} aria-label={t(`เลือกกรรมการ ${option.name}`, `Select judge ${option.name}`)} onClick={() => { setSelectedJudgeId(option.value); setPage(1); }} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-blue-200 bg-blue-50/70' : 'border-transparent hover:bg-slate-50'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{option.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className={`block break-words text-sm font-semibold ${active ? 'text-blue-800' : 'text-slate-700'}`}>{option.name}</span><span className="mt-0.5 block break-all text-[11px] text-slate-400">{option.email}</span><span className="mt-2 flex flex-wrap items-center gap-2"><span className="text-[11px] text-slate-500">{count} {t('ทีมที่บันทึกแล้ว', 'saved teams')}</span>{dirty && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{t('ค้างบันทึก', 'Unsaved')}</span>}</span></span>{active && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}</button>;
        })}{!matchingJudgeOptions.length && <MonitoringEmpty icon={UserCheck} title={t('ไม่พบกรรมการ', 'No matching judges')} description={t('ลองใช้ชื่อหรืออีเมลอื่น', 'Try a different name or email.')} onReset={() => setJudgeSearch('')} />}</div>{dirtyJudgeIds.size > 0 && <p className="border-t border-amber-100 bg-amber-50/60 px-4 py-3 text-[11px] leading-5 text-amber-800">{t(`มีรายการค้างบันทึก ${dirtyJudgeIds.size} คน เก็บสิ่งที่เลือกไว้เมื่อสลับกรรมการ`, `${dirtyJudgeIds.size} judge(s) have unsaved changes. Selections are kept when switching.`)}</p>}</aside></Card>
        <Card noPadding><section aria-labelledby="assignment-team-heading"><div className="space-y-4 border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">2</span><div><h2 id="assignment-team-heading" className="text-sm font-bold text-slate-900">{t('เลือกทีมที่ต้องประเมิน', 'Select teams to evaluate')}</h2><p className="mt-1 break-words text-xs text-slate-500">{t('กรรมการ: ', 'Judge: ')}<span className="font-semibold text-blue-700">{selectedOption?.name}</span></p></div></div><Badge variant={isDirty ? 'warning' : 'info'}>{selectedTeamIds.length} {t('ทีมที่เลือก', 'selected teams')}</Badge></div><div className="flex flex-col gap-2 xl:flex-row"><MonitoringSearch id="assignment-team-search" label={t('ค้นหาชื่อทีมหรือรายละเอียด', 'Search team name or description')} value={teamSearch} onChange={value => { setTeamSearch(value); setPage(1); }} /><select aria-label={t('กรองทีมตามกลุ่ม', 'Filter teams by group')} value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }} className={inputClass}><option value="all">{t('ทุกกลุ่ม', 'All groups')}</option><option value={UNGROUPED_FILTER}>{t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select aria-label={t('กรองสถานะการมอบหมาย', 'Filter assignment status')} value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setPage(1); }} className={inputClass}><option value="all">{t('ทุกทีม', 'All teams')}</option><option value="selected">{t('เลือกให้กรรมการนี้', 'Selected for this judge')}</option><option value="unassigned">{t('ยังไม่มีกรรมการ', 'No assigned judge')}</option></select></div><div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-[11px] text-slate-400">{t(`พบ ${filteredTeams.length} จาก ${teams.length} ทีม`, `${filteredTeams.length} of ${teams.length} teams`)}</p><div className="flex flex-wrap gap-1"><Button variant="text" size="sm" disabled={structureLocked || !filteredTeams.length || filteredTeams.every(team => selectedTeamSet.has(String(team.id)))} onClick={() => setFilteredTeamsSelected(true)}><CheckSquare2 className="h-3.5 w-3.5" />{t(`เลือกทั้ง ${filteredTeams.length} ทีมตามตัวกรอง`, `Select all ${filteredTeams.length} filtered teams`)}</Button><Button variant="textGray" size="sm" disabled={structureLocked || !filteredTeams.some(team => selectedTeamSet.has(String(team.id)))} onClick={() => setFilteredTeamsSelected(false)}>{t('ยกเลิกเลือกตามตัวกรอง', 'Clear filtered selection')}</Button></div></div></div>
          <div className="divide-y divide-slate-100">{pagedTeams.map(team => {
            const assignedJudges = getAssignedJudgesForTeam(team.id);
            const saved = savedTeamSet.has(String(team.id));
            const selected = selectedTeamSet.has(String(team.id));
            const added = selected && !saved;
            const removed = !selected && saved;
            const group = getGroupForTeam(id, team.id);
            return <label key={team.id} className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-5 ${selected ? 'bg-blue-50/30 hover:bg-blue-50/60' : removed ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'}`}><input disabled={structureLocked} type="checkbox" checked={selected} onChange={() => toggleTeam(team.id)} aria-label={t(`มอบหมาย ${team.name} ให้ ${selectedOption?.name}`, `Assign ${team.name} to ${selectedOption?.name}`)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="break-words text-sm font-semibold text-slate-800">{team.name}</span>{group && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"><FolderTree className="h-3 w-3" />{group.name}</span>}</span><span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400"><UserCheck className="h-3 w-3" />{assignedJudges.length ? t(`มีกรรมการ ${assignedJudges.length} คน`, `${assignedJudges.length} assigned judge(s)`) : t('ยังไม่มีกรรมการ', 'No assigned judge')}{assignedJudges.length > 0 && <span className="break-words">· {assignedJudges.map(judge => judge.name || judge.email).join(', ')}</span>}</span></span><span className="shrink-0">{added ? <Badge variant="info">{t('เพิ่ม · รอบันทึก', 'Add · Unsaved')}</Badge> : removed ? <Badge variant="warning">{t('นำออก · รอบันทึก', 'Remove · Unsaved')}</Badge> : selected ? <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('บันทึกแล้ว', 'Saved')}</span></span> : <Circle className={`h-3.5 w-3.5 ${assignedJudges.length ? 'text-slate-200' : 'text-amber-400'}`} />}</span></label>;
          })}{!pagedTeams.length && <MonitoringEmpty icon={Users} title={t('ไม่พบทีมที่ตรงกับตัวกรอง', 'No matching teams')} description={t('ลองเปลี่ยนคำค้นหา กลุ่ม หรือสถานะการมอบหมาย', 'Try a different search, group, or assignment filter.')} onReset={resetTeamFilters} />}</div>
          <MonitoringPagination page={currentPage} pages={totalPages} count={filteredTeams.length} onChange={setPage} />
        </section></Card>
      </fieldset>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{selectedOption?.name}<span className="ml-2 text-xs font-normal text-slate-400">{selectedTeamIds.length} {t('ทีมที่เลือก', 'selected teams')}</span></p><p className={`mt-1 text-xs ${isDirty ? 'text-amber-700' : 'text-slate-400'}`}>{isSaving ? t('กำลังบันทึกการมอบหมาย…', 'Saving assignments…') : isDirty ? t(`เพิ่ม ${addedCount} ทีม · นำออก ${removedCount} ทีม · ยังไม่บันทึก`, `Add ${addedCount} · Remove ${removedCount} · Unsaved`) : dirtyJudgeIds.size ? t(`กรรมการอื่นยังมีรายการค้างบันทึก ${dirtyJudgeIds.size} คน`, `${dirtyJudgeIds.size} other judge(s) still have unsaved changes`) : t('บันทึกแล้ว', 'Saved')}</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="secondary" onClick={cancelChanges} disabled={structureLocked || !isDirty || isSaving}><RotateCcw className="h-4 w-4" />{t('คืนค่าที่บันทึก', 'Reset changes')}</Button><Button onClick={saveAssignments} isLoading={isSaving} disabled={structureLocked || !isDirty || isSaving}><Save className="h-4 w-4" />{t('บันทึกการมอบหมาย', 'Save assignments')}</Button></div></div>
    </> : <Card noPadding><MonitoringEmpty icon={assignments.length ? Users : UserCheck} title={!assignments.length ? t('เพิ่มกรรมการก่อนเริ่มมอบหมาย', 'Invite judges to get started') : t('ยังไม่มีทีมในโครงการ', 'No teams in this project')} description={t('โครงการต้องมีทั้งรายชื่อทีมและกรรมการ จึงจะกำหนดสิทธิ์การประเมินได้', 'Add teams and judges before assigning evaluation access.')} /><div className="flex justify-center gap-2 pb-6"><Button onClick={() => navigate(`/project/${id}/${!assignments.length ? 'judges' : 'teams'}`)}><Plus className="h-4 w-4" />{!assignments.length ? t('เพิ่มกรรมการ', 'Add judges') : t('เพิ่มทีม', 'Add teams')}<ArrowRight className="h-3.5 w-3.5" /></Button></div></Card>}
  </div>;
}
