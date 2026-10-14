import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from './Button';
import Card from './Card';
import ConfirmDialog from './ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import {
  createGroup,
  deleteGroup,
  getGroupForTeam,
  getGroupsByProject,
  moveTeamToGroup,
  renameGroup,
} from '../data/GroupStore';

export default function TeamGroupManagement({ projectId, teams }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState(() => getGroupsByProject(projectId));
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [groupToDelete, setGroupToDelete] = useState(null);

  const refreshGroups = () => {
    setGroups(getGroupsByProject(projectId));
  };

  const handleCreateGroup = (event) => {
    event.preventDefault();
    try {
      createGroup(projectId, newGroupName);
      setNewGroupName('');
      refreshGroups();
      toast.success(t('สร้างกลุ่มเรียบร้อยแล้ว', 'Group created'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRenameGroup = (event) => {
    event.preventDefault();
    try {
      renameGroup(projectId, editingGroupId, editingName);
      setEditingGroupId(null);
      setEditingName('');
      refreshGroups();
      toast.success(t('เปลี่ยนชื่อกลุ่มเรียบร้อยแล้ว', 'Group renamed'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMoveTeam = (teamId, groupId) => {
    try {
      moveTeamToGroup(projectId, teamId, groupId);
      refreshGroups();
      toast.success(
        groupId
          ? t('ย้ายทีมไปยังกลุ่มที่เลือกแล้ว', 'Team moved to group')
          : t('นำทีมออกจากกลุ่มแล้ว', 'Team removed from group')
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const confirmDeleteGroup = () => {
    if (!groupToDelete) return;
    try {
      deleteGroup(projectId, groupToDelete.id);
      refreshGroups();
      setGroupToDelete(null);
      toast.success(
        t(
          'ลบกลุ่มแล้ว ทีมในกลุ่มกลายเป็นทีมที่ยังไม่จัดกลุ่ม',
          'Group deleted. Teams are now ungrouped.'
        )
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const groupForTeam = new Map(
    teams.map((team) => [Number(team.id), getGroupForTeam(projectId, team.id)])
  );
  const ungroupedTeams = teams.filter((team) => !groupForTeam.get(Number(team.id)));

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="new-group-name" className="sr-only">
            {t('ชื่อกลุ่มใหม่', 'New Group Name')}
          </label>
          <input
            id="new-group-name"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder={t(
              'ระบุชื่อกลุ่มใหม่ เช่น สาย A, รอบคัดเลือก...',
              'New group name (e.g. Track A, Finals)...'
            )}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface px-3.5 py-2 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <Button type="submit">
            {t('+ สร้างกลุ่ม', '+ Create Group', { compact: true })}
          </Button>
        </form>
      </Card>

      <section aria-labelledby="group-list-heading" className="space-y-3">
        <h2 id="group-list-heading" className="text-base font-bold text-slate-900">
          {t('กลุ่มและจำนวนทีม', 'Groups Overview')}
        </h2>
        {groups.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => {
              const groupTeams = teams.filter(
                (team) => groupForTeam.get(Number(team.id))?.id === group.id
              );
              return (
                <Card key={group.id}>
                  {editingGroupId === group.id ? (
                    <form onSubmit={handleRenameGroup} className="flex gap-2">
                      <label htmlFor={`rename-group-${group.id}`} className="sr-only">
                        {t('ชื่อกลุ่ม', 'Group Name')}
                      </label>
                      <input
                        id={`rename-group-${group.id}`}
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <Button type="submit" size="sm">
                        {t('บันทึก', 'Save', { compact: true })}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingGroupId(null)}
                      >
                        {t('ยกเลิก', 'Cancel', { compact: true })}
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">{group.name}</h3>
                        <p className="mt-0.5 text-xs font-semibold text-blue-600">
                          {groupTeams.length} {t('ทีม', 'teams', { compact: true })}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {groupTeams.length
                            ? groupTeams.map((team) => team.name).join(', ')
                            : t('ยังไม่มีทีมในกลุ่มนี้', 'No teams in this group')}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditingName(group.name);
                          }}
                        >
                          {t('เปลี่ยนชื่อ', 'Rename', { compact: true })}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setGroupToDelete(group)}
                        >
                          {t('ลบ', 'Delete', { compact: true })}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-slate-50/60">
            <p className="py-5 text-center text-sm text-slate-500">
              {t(
                'ยังไม่มีกลุ่ม สร้างกลุ่มแรกด้านบนเพื่อเริ่มจัดหมวดหมู่ทีม',
                'No groups created yet. Create a group above to organize teams.'
              )}
            </p>
          </Card>
        )}
      </section>

      <section aria-labelledby="team-grouping-heading" className="space-y-3">
        <h2 id="team-grouping-heading" className="text-base font-bold text-slate-900">
          {t('กำหนดกลุ่มให้แต่ละทีม', 'Assign Teams to Groups')}
        </h2>
        {teams.length ? (
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">{t('ทีม', 'Team', { compact: true })}</th>
                    <th className="px-5 py-3.5">
                      {t('กลุ่มปัจจุบัน', 'Current Group', { compact: true })}
                    </th>
                    <th className="px-5 py-3.5">
                      {t('ย้ายไปยัง', 'Move To', { compact: true })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((team) => (
                    <tr key={team.id} className="text-sm hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {team.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {groupForTeam.get(Number(team.id))?.name ||
                          t('ยังไม่จัดกลุ่ม', 'Ungrouped', { compact: true })}
                      </td>
                      <td className="px-5 py-3.5">
                        <label htmlFor={`team-group-${team.id}`} className="sr-only">
                          กลุ่มของ {team.name}
                        </label>
                        <select
                          id={`team-group-${team.id}`}
                          value={groupForTeam.get(Number(team.id))?.id ?? ''}
                          onChange={(event) =>
                            handleMoveTeam(team.id, event.target.value)
                          }
                          className="w-full max-w-xs rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-sm focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            {t('ยังไม่จัดกลุ่ม', 'Ungrouped', { compact: true })}
                          </option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="py-5 text-center text-sm text-slate-500">
              {t('ยังไม่มีทีมในโครงการนี้', 'No teams in this competition yet')}
            </p>
          </Card>
        )}
        <Card className="bg-slate-50/70">
          <p className="text-sm font-bold text-slate-900">
            {t(
              `ทีมที่ยังไม่จัดกลุ่ม: ${ungroupedTeams.length} ทีม`,
              `Ungrouped Teams: ${ungroupedTeams.length}`
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {ungroupedTeams.length
              ? ungroupedTeams.map((team) => team.name).join(', ')
              : t('ทุกทีมถูกจัดเข้ากลุ่มเรียบร้อยแล้ว', 'All teams are assigned to a group')}
          </p>
        </Card>
      </section>

      <ConfirmDialog
        isOpen={Boolean(groupToDelete)}
        title={t('ยืนยันการลบกลุ่ม', 'Confirm Group Deletion')}
        message={t(
          `ลบกลุ่ม "${groupToDelete?.name}"? ทีมที่อยู่ในกลุ่มจะยังคงอยู่ในโครงการและกลายเป็นทีมที่ยังไม่จัดกลุ่ม`,
          `Delete group "${groupToDelete?.name}"? Teams inside will remain in the competition as ungrouped.`
        )}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
        confirmText={t('ลบกลุ่ม', 'Delete Group', { compact: true })}
      />
    </div>
  );
}
