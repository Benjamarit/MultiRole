import { useEffect, useRef, useState } from 'react';
import UsageHelp from './UsageHelp';
import { ArrowRight, Check, CheckSquare2, FolderTree, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './Button';
import Card from './Card';
import ConfirmDialog from './ConfirmDialog';
import { MonitoringEmpty, MonitoringPagination, MonitoringSearch } from './MonitoringUI';
import { useLanguage } from '../context/LanguageContext';
import { createGroup, deleteGroup, getGroupForTeam, getGroupsByProject, moveTeamToGroup, moveTeamsToGroup, renameGroup } from '../data/GroupStore';
import { getTeamsByProject } from '../data/TeamStore';
import { compareTeamNames, orderTeams, filterAndSortTeams } from '../data/TeamOrdering';

function SelectionCheckbox({ indeterminate = false, ...props }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" aria-checked={indeterminate ? 'mixed' : props.checked} className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600" {...props} />;
}

export default function TeamGroupManagement({ projectId, teams, onTeamsChange, readOnly = false }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState(() => getGroupsByProject(projectId));
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [targetGroup, setTargetGroup] = useState('');
  const [operationError, setOperationError] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  const groupForTeam = new Map(teams.map(team => [String(team.id), getGroupForTeam(projectId, team.id)]));
  const canonicalTeams = orderTeams(teams);
  const positionById = new Map(canonicalTeams.map((team, index) => [team.id, index + 1]));
  const sortedGroups = [...groups].sort((a, b) => compareTeamNames(a.name, b.name));
  const groupCounts = new Map();
  groupForTeam.forEach(group => { if (group) groupCounts.set(group.id, (groupCounts.get(group.id) || 0) + 1); });
  const displayedTeams = filterAndSortTeams(teams, { search, groupId: groupFilter, sortBy, groupForTeam });
  const ungroupedCount = teams.length - [...groupCounts.values()].reduce((sum, count) => sum + count, 0);
  const selectedSet = new Set(selectedIds);
  const selectedTeams = teams.filter(team => selectedSet.has(String(team.id)));
  const totalPages = Math.max(1, Math.ceil(displayedTeams.length / 10));
  const currentPage = Math.min(page, totalPages);
  const pagedTeams = displayedTeams.slice((currentPage - 1) * 10, currentPage * 10);
  const pageSelected = pagedTeams.filter(team => selectedSet.has(String(team.id))).length;
  const allFilteredSelected = displayedTeams.length > 0 && displayedTeams.every(team => selectedSet.has(String(team.id)));
  const validTarget = targetGroup === 'ungrouped' || groups.some(group => group.id === targetGroup);

  const mutate = async (action, message) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setOperationError('');
    try {
      await action();
      setGroups(getGroupsByProject(projectId));
      onTeamsChange?.([...getTeamsByProject(projectId)]);
      if (message) toast.success(message);
      return true;
    } catch (error) {
      setOperationError(error.response ? error.message : t(`${error.message} — ยังยืนยันผลไม่ได้ กรุณารีเฟรชเพื่อตรวจสอบก่อนลองใหม่`, `${error.message} — Result unconfirmed. Refresh to check before retrying.`));
      toast.error(error.message);
      return false;
    } finally { inFlight.current = false; setBusy(false); }
  };
  const handleCreateGroup = async event => {
    event.preventDefault();
    if (await mutate(() => createGroup(projectId, newGroupName), t('สร้างกลุ่มแล้ว', 'Group created'))) setNewGroupName('');
  };
  const handleRenameGroup = async event => {
    event.preventDefault();
    if (await mutate(() => renameGroup(projectId, editingGroupId, editingName), t('เปลี่ยนชื่อกลุ่มแล้ว', 'Group renamed'))) setEditingGroupId(null);
  };
  const handleMoveTeam = async (teamId, groupId) => {
    if (await mutate(() => moveTeamToGroup(projectId, teamId, groupId), groupId ? t('ย้ายทีมเข้ากลุ่มแล้ว', 'Team moved to group') : t('นำทีมออกจากกลุ่มแล้ว', 'Team is now ungrouped'))) {
      setSelectedIds(previous => previous.filter(id => id !== String(teamId)));
      setBulkResult(null);
    }
  };
  const handleBulkMove = async () => {
    if (!selectedTeams.length || !validTarget || inFlight.current) return;
    const groupId = targetGroup === 'ungrouped' ? null : targetGroup;
    const groupName = groups.find(group => group.id === groupId)?.name;
    let receipt;
    setBulkResult(null);
    if (await mutate(async () => { receipt = await moveTeamsToGroup(projectId, selectedTeams.map(team => team.id), groupId); }, t('จัดกลุ่มทีมที่เลือกแล้ว', 'Selected teams updated'))) {
      setSelectedIds([]);
      setBulkResult({ ...receipt, groupName, removed: groupId === null });
    }
  };
  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    const removedId = groupToDelete.id;
    if (await mutate(() => deleteGroup(projectId, removedId), t('ลบกลุ่มแล้ว โดยเก็บทีมทั้งหมดไว้', 'Group deleted. All teams are preserved.'))) {
      setGroupToDelete(null);
      if (groupFilter === removedId) { setGroupFilter('all'); setSelectedIds([]); }
      if (targetGroup === removedId) setTargetGroup('');
      setBulkResult(null);
    }
  };
  const changeFilter = action => { setSelectedIds([]); setPage(1); action(); };
  const resetFilters = () => changeFilter(() => { setSearch(''); setGroupFilter('all'); setSortBy('order'); });
  const toggleTeam = id => setSelectedIds(previous => previous.includes(String(id)) ? previous.filter(value => value !== String(id)) : [...previous, String(id)]);
  const selectPage = checked => setSelectedIds(previous => {
    const next = new Set(previous);
    pagedTeams.forEach(team => { if (checked) next.add(String(team.id)); else next.delete(String(team.id)); });
    return [...next];
  });
  const bulkMessage = !bulkResult ? '' : bulkResult.movedCount === 0
    ? bulkResult.removed ? t('ทีมที่เลือกไม่มีกลุ่มอยู่แล้ว', 'The selected teams are already ungrouped')
      : t(`ทีมที่เลือกอยู่ใน “${bulkResult.groupName}” แล้ว`, `The selected teams are already in “${bulkResult.groupName}”`)
    : bulkResult.removed ? t(`นำ ${bulkResult.movedCount} ทีมออกจากกลุ่มแล้ว`, `${bulkResult.movedCount} teams removed from their groups`)
      : t(`ย้าย ${bulkResult.movedCount} ทีมไป “${bulkResult.groupName}” แล้ว`, `${bulkResult.movedCount} teams moved to “${bulkResult.groupName}”`);
  const inputClass = 'min-w-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100';
  const pageCheckbox = <SelectionCheckbox checked={pagedTeams.length > 0 && pageSelected === pagedTeams.length} indeterminate={pageSelected > 0 && pageSelected < pagedTeams.length} onChange={event => selectPage(event.target.checked)} aria-label={t(`เลือกทีมในหน้านี้ ${pagedTeams.length} ทีม`, `Select ${pagedTeams.length} teams on this page`)} disabled={!pagedTeams.length} />;
  const teamCheckbox = (team, suffix = '') => <SelectionCheckbox id={`select-group-team-${team.id}${suffix}`} checked={selectedSet.has(String(team.id))} onChange={() => toggleTeam(team.id)} aria-label={t(`เลือก ${team.name}`, `Select ${team.name}`)} />;
  const groupSelect = (team, suffix = '') => <><label htmlFor={`team-group-${team.id}${suffix}`} className="sr-only">{t('กลุ่มของ', 'Group for')} {team.name}</label><select id={`team-group-${team.id}${suffix}`} value={groupForTeam.get(String(team.id))?.id ?? ''} onChange={event => handleMoveTeam(team.id, event.target.value)} className={inputClass}><option value="">{t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</option>{sortedGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></>;

  if (readOnly) return <Card><div className="space-y-4">
    <h2 className="font-bold text-slate-900">{t('กลุ่มทีม · ดูอย่างเดียว', 'Team groups · Read only')}</h2>
    <div className="flex flex-wrap gap-2">{sortedGroups.map(group => <span key={group.id} className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{group.name} · {groupCounts.get(group.id) || 0} {t('ทีม', 'teams')}</span>)}</div>
    <MonitoringSearch id="locked-group-search" label={t('ค้นหาชื่อทีม', 'Search team name')} value={search} onChange={setSearch} />
    <ul className="divide-y divide-slate-100">{displayedTeams.map(team => <li key={team.id} className="flex justify-between gap-4 py-3 text-sm"><span className="font-semibold text-slate-800">{team.name}</span><span className="text-slate-500">{groupForTeam.get(String(team.id))?.name || t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</span></li>)}</ul>
  </div></Card>;
  return <fieldset disabled={busy} aria-busy={busy} className={`min-w-0 space-y-4 ${selectedTeams.length ? 'pb-64 sm:pb-32' : ''}`}>
    <legend className="sr-only">{t('จัดการกลุ่มทีม', 'Manage team groups')}</legend>
    <Card noPadding><form onSubmit={handleCreateGroup} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><label htmlFor="new-group-name" className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-800"><FolderTree className="h-4 w-4 text-blue-600" />{t('สร้างกลุ่ม', 'Create group')}</label><input id="new-group-name" maxLength={100} required value={newGroupName} onChange={event => setNewGroupName(event.target.value)} placeholder={t('ชื่อกลุ่ม เช่น สาย A', 'Group name, e.g. Track A')} className={inputClass} /><Button type="submit" className="shrink-0" disabled={!newGroupName.trim()}><Plus className="h-4 w-4" />{t('สร้างกลุ่ม', 'Create group')}</Button></form></Card>

    <section aria-labelledby="group-list-heading" className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="group-list-heading" className="text-sm font-bold text-slate-900">{t('กลุ่มในโครงการ', 'Project groups')} <span className="ml-1 text-xs font-normal text-slate-400">{groups.length}</span></h2><span className="text-[11px] text-slate-500">{t('กดกลุ่มเพื่อกรองทีม', 'Select a group to filter teams')}</span></div>
      {groups.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{sortedGroups.map(group => <Card key={group.id} noPadding className={groupFilter === group.id ? 'border-blue-300 ring-1 ring-blue-100' : ''}><div className="p-3">{editingGroupId === group.id ? <form onSubmit={handleRenameGroup} className="space-y-2"><label htmlFor={`rename-group-${group.id}`} className="sr-only">{t('ชื่อกลุ่ม', 'Group name')}</label><input id={`rename-group-${group.id}`} maxLength={100} required autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} className={inputClass} /><div className="flex justify-end gap-2"><Button size="sm" type="button" variant="secondary" onClick={() => setEditingGroupId(null)}><X className="h-3.5 w-3.5" />{t('ยกเลิก', 'Cancel')}</Button><Button size="sm" type="submit"><Check className="h-3.5 w-3.5" />{t('บันทึก', 'Save')}</Button></div></form> : <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => changeFilter(() => setGroupFilter(groupFilter === group.id ? 'all' : group.id))} aria-pressed={groupFilter === group.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left focus-visible:outline-blue-500"><h3 className="min-w-0 break-words text-sm font-bold text-slate-800 hover:text-blue-700">{group.name}</h3><span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{groupCounts.get(group.id) || 0} {t('ทีม', 'teams')}</span></button><div className="flex shrink-0 gap-0.5"><Button size="sm" variant="textGray" aria-label={t(`เปลี่ยนชื่อกลุ่ม ${group.name}`, `Rename group ${group.name}`)} onClick={() => { setEditingGroupId(group.id); setEditingName(group.name); }}><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="textGray" aria-label={t(`ลบกลุ่ม ${group.name}`, `Delete group ${group.name}`)} onClick={() => setGroupToDelete(group)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></div></div>}</div></Card>)}</div> : <Card noPadding><MonitoringEmpty icon={FolderTree} title={t('ยังไม่มีกลุ่มในโครงการ', 'No groups yet')} description={t('สร้างกลุ่มด้านบน แล้วเลือกหลายทีมเพื่อจัดเข้ากลุ่มพร้อมกัน', 'Create a group above, then select teams to move together.')} /></Card>}
    </section>

    {operationError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{operationError}</div>}
    {bulkResult && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><p>{bulkMessage}{bulkResult.movedCount > 0 && bulkResult.unchangedCount > 0 && <span className="ml-2 text-xs">{t(`คงเดิม ${bulkResult.unchangedCount} ทีม`, `${bulkResult.unchangedCount} unchanged`)}</span>}</p><button type="button" aria-label={t('ปิดผลการย้ายทีม', 'Dismiss move result')} onClick={() => setBulkResult(null)} className="rounded p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div>}

    <Card noPadding><div className="space-y-3 border-b border-slate-100 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold text-slate-900">{t('จัดทีมเข้ากลุ่ม', 'Assign teams to groups')}</h2><span role="status" className="text-xs text-slate-500">{busy ? t('กำลังบันทึก…', 'Saving…') : t(`${ungroupedCount} ทีมยังไม่จัดกลุ่ม`, `${ungroupedCount} ungrouped`)}</span></div><div className="flex flex-col gap-2 lg:flex-row"><MonitoringSearch id="group-team-search" label={t('ค้นหาทีมหรือกลุ่ม', 'Search teams or groups')} value={search} onChange={value => changeFilter(() => setSearch(value))} /><select aria-label={t('กรองกลุ่ม', 'Filter group')} value={groupFilter} onChange={event => changeFilter(() => setGroupFilter(event.target.value))} className={`${inputClass} lg:w-48`}><option value="all">{t('ทุกกลุ่ม', 'All groups')}</option><option value="ungrouped">{t('ยังไม่จัดกลุ่ม', 'Ungrouped')}</option>{sortedGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><select aria-label={t('เรียงทีมในกลุ่ม', 'Sort group teams')} value={sortBy} onChange={event => setSortBy(event.target.value)} className={`${inputClass} lg:w-44`}><option value="order">{t('ตามลำดับทีม', 'Team order')}</option><option value="name-asc">{t('ชื่อทีม ก–ฮ / A–Z', 'Team name A–Z')}</option><option value="name-desc">{t('ชื่อทีม ฮ–ก / Z–A', 'Team name Z–A')}</option><option value="group">{t('ตามกลุ่ม', 'Group')}</option></select></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500" role="status">{t(`พบ ${displayedTeams.length} จาก ${teams.length} ทีม`, `${displayedTeams.length} of ${teams.length} teams`)}</p><div className="flex flex-wrap items-center gap-1"><Button size="sm" variant="text" disabled={!displayedTeams.length || allFilteredSelected} onClick={() => setSelectedIds(displayedTeams.map(team => String(team.id)))}><CheckSquare2 className="h-3.5 w-3.5" />{t(`เลือกทั้ง ${displayedTeams.length} ทีมตามตัวกรอง (ทุกหน้า)`, `Select all ${displayedTeams.length} filtered teams (all pages)`)}</Button>{selectedTeams.length > 0 && <Button size="sm" variant="textGray" onClick={() => setSelectedIds([])}>{t('ล้างการเลือก', 'Clear selection')}</Button>}</div></div>
    </div>
      {displayedTeams.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500"><th scope="col" className="w-12 px-4 py-3.5">{pageCheckbox}</th><th scope="col" className="w-16 px-3 py-3.5">{t('ลำดับ', 'Order')}</th><th scope="col" className="px-4 py-3.5">{t('ทีม', 'Team')}</th><th scope="col" className="w-72 px-4 py-3.5">{t('กลุ่มของทีม', 'Team group')}</th></tr></thead><tbody className="divide-y divide-slate-100">{pagedTeams.map(team => <tr key={team.id} className={selectedSet.has(String(team.id)) ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}><td className="px-4 py-3">{teamCheckbox(team)}</td><td className="px-3 py-3 text-xs tabular-nums text-slate-400">{positionById.get(team.id)}</td><td className="px-4 py-3"><label htmlFor={`select-group-team-${team.id}`} className="flex cursor-pointer items-center gap-3"><Users aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-500" /><span className="break-words font-semibold text-slate-800">{team.name}</span></label></td><td className="px-4 py-3">{groupSelect(team)}</td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 md:hidden"><label className="flex cursor-pointer items-center gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">{pageCheckbox}{t(`เลือกหน้านี้ (${pagedTeams.length} ทีม)`, `Select this page (${pagedTeams.length} teams)`)}</label>{pagedTeams.map(team => <div key={team.id} className={`space-y-3 p-4 ${selectedSet.has(String(team.id)) ? 'bg-blue-50/60' : ''}`}><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">{teamCheckbox(team, '-mobile')}<span className="text-xs font-normal tabular-nums text-slate-400">{positionById.get(team.id)}</span><span className="break-words">{team.name}</span></label>{groupSelect(team, '-mobile')}</div>)}</div></> : <MonitoringEmpty icon={Users} title={teams.length ? t('ไม่พบทีมที่ตรงกับตัวกรอง', 'No matching teams') : t('ยังไม่มีทีมในโครงการ', 'No teams yet')} description={teams.length ? t('ลองเลือกกลุ่มอื่นหรือล้างตัวกรอง', 'Choose another group or reset your filters.') : t('เพิ่มทีมจากแท็บรายชื่อทีมก่อนจัดกลุ่ม', 'Add teams from the Teams tab before grouping.')} onReset={teams.length ? resetFilters : undefined} />}
      <MonitoringPagination page={currentPage} pages={totalPages} count={displayedTeams.length} onChange={setPage} />
    </Card>

    {selectedTeams.length > 0 && <div role="region" aria-label={t('ย้ายทีมที่เลือก', 'Move selected teams')} className="fixed inset-x-4 bottom-3 z-30 mx-auto flex max-w-7xl flex-col gap-3 rounded-xl border border-blue-200 bg-white/95 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between"><div className="shrink-0"><p role="status" className="text-sm font-bold text-blue-800">{t(`เลือก ${selectedTeams.length} ทีม`, `${selectedTeams.length} teams selected`)}</p><p className="mt-1 text-[11px] text-slate-500">{t('รวมการเลือกจากทุกหน้า', 'Includes selections from all pages')}</p></div><div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:max-w-xl lg:flex-1"><label htmlFor="bulk-team-group" className="sr-only">{t('กลุ่มปลายทางของทีมที่เลือก', 'Destination group for selected teams')}</label><select id="bulk-team-group" value={targetGroup} onChange={event => setTargetGroup(event.target.value)} className={inputClass}><option value="" disabled>{t('เลือกกลุ่มปลายทาง', 'Choose destination group')}</option><option value="ungrouped">{t('นำออกจากกลุ่ม', 'Remove from group')}</option>{sortedGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><Button className="shrink-0" disabled={!validTarget || busy} isLoading={busy} onClick={handleBulkMove}><ArrowRight className="h-4 w-4" />{t(`ยืนยันย้าย ${selectedTeams.length} ทีม`, `Move ${selectedTeams.length} teams`)}</Button><Button variant="secondary" className="shrink-0" onClick={() => setSelectedIds([])}>{t('ยกเลิก', 'Cancel')}</Button></div></div>}
    <UsageHelp title={t('วิธีจัดกลุ่มทีม', 'How to group teams')}><p>{t('เลือกหลายทีม แล้วเลือกกลุ่มปลายทางและยืนยันย้าย เลือกได้ข้ามหน้า เมื่อเปลี่ยนคำค้นหาหรือตัวกรองจะล้างการเลือก', 'Select teams across pages, choose a destination, then confirm. Changing search or group filters clears your selection.')}</p><p>{t('เลือกกลุ่มรายทีมจะบันทึกทันที กลุ่มใช้จัดหมวดหมู่เท่านั้น สิทธิ์ประเมินกำหนดที่ “มอบหมายทีมให้กรรมการ”', 'Individual group changes save immediately. Groups organize teams; evaluation access is managed in Assign Teams to Judges.')}</p></UsageHelp>
    <ConfirmDialog isOpen={Boolean(groupToDelete)} isLoading={busy} title={t('ยืนยันการลบกลุ่ม', 'Delete group')} message={t(`ลบกลุ่ม “${groupToDelete?.name}”? ทีมทั้งหมดจะยังอยู่ในโครงการและกลายเป็นทีมที่ยังไม่จัดกลุ่ม`, `Delete “${groupToDelete?.name}”? All teams remain in the competition as ungrouped.`)} onConfirm={confirmDeleteGroup} onCancel={() => setGroupToDelete(null)} confirmText={t('ลบกลุ่ม', 'Delete group')} />
  </fieldset>;
}
