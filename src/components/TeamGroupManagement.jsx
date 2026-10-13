import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from './Button';
import Card from './Card';
import ConfirmDialog from './ConfirmDialog';
import {
  createGroup,
  deleteGroup,
  getGroupForTeam,
  getGroupsByProject,
  moveTeamToGroup,
  renameGroup,
} from '../data/GroupStore';

export default function TeamGroupManagement({ projectId, teams }) {
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
      toast.success('สร้างกลุ่มเรียบร้อยแล้ว');
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
      toast.success('เปลี่ยนชื่อกลุ่มเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMoveTeam = (teamId, groupId) => {
    try {
      moveTeamToGroup(projectId, teamId, groupId);
      refreshGroups();
      toast.success(groupId ? 'ย้ายทีมไปยังกลุ่มที่เลือกแล้ว' : 'นำทีมออกจากกลุ่มแล้ว');
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
      toast.success('ลบกลุ่มแล้ว ทีมในกลุ่มกลายเป็นทีมที่ยังไม่จัดกลุ่ม');
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
          <label htmlFor="new-group-name" className="sr-only">ชื่อกลุ่มใหม่</label>
          <input
            id="new-group-name"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="ชื่อกลุ่มใหม่"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:border-precision-blue focus-visible:ring-2 focus-visible:ring-blue-100"
          />
          <Button type="submit">สร้างกลุ่ม</Button>
        </form>
      </Card>

      <section aria-labelledby="group-list-heading" className="space-y-3">
        <h2 id="group-list-heading" className="text-lg font-semibold text-primary-text">กลุ่มและจำนวนทีม</h2>
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
                      <label htmlFor={`rename-group-${group.id}`} className="sr-only">ชื่อกลุ่ม</label>
                      <input
                        id={`rename-group-${group.id}`}
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-100"
                      />
                      <Button type="submit" size="sm">บันทึก</Button>
                      <Button type="button" variant="textGray" size="sm" onClick={() => setEditingGroupId(null)}>
                        ยกเลิก
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-primary-text">{group.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{groupTeams.length} ทีม</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {groupTeams.length ? groupTeams.map((team) => team.name).join(', ') : 'ยังไม่มีทีมในกลุ่มนี้'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => {
                            setEditingGroupId(group.id);
                            setEditingName(group.name);
                          }}
                        >
                          เปลี่ยนชื่อ
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setGroupToDelete(group)}>
                          ลบ
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card><p className="py-5 text-center text-slate-500">ยังไม่มีกลุ่ม สร้างกลุ่มแรกเพื่อเริ่มจัดทีม</p></Card>
        )}
      </section>

      <section aria-labelledby="team-grouping-heading" className="space-y-3">
        <h2 id="team-grouping-heading" className="text-lg font-semibold text-primary-text">กำหนดกลุ่มให้แต่ละทีม</h2>
        {teams.length ? (
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-sm text-slate-600">
                    <th className="px-5 py-3 font-medium">ทีม</th>
                    <th className="px-5 py-3 font-medium">กลุ่มปัจจุบัน</th>
                    <th className="px-5 py-3 font-medium">ย้ายไปยัง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td className="px-5 py-3 font-medium text-primary-text">{team.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {groupForTeam.get(Number(team.id))?.name || 'ยังไม่จัดกลุ่ม'}
                      </td>
                      <td className="px-5 py-3">
                        <label htmlFor={`team-group-${team.id}`} className="sr-only">กลุ่มของ {team.name}</label>
                        <select
                          id={`team-group-${team.id}`}
                          value={groupForTeam.get(Number(team.id))?.id ?? ''}
                          onChange={(event) => handleMoveTeam(team.id, event.target.value)}
                          className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-100"
                        >
                          <option value="">ยังไม่จัดกลุ่ม</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
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
          <Card><p className="py-5 text-center text-slate-500">ยังไม่มีทีมในโครงการนี้</p></Card>
        )}
        <Card className="bg-slate-50">
          <p className="font-medium text-primary-text">ทีมที่ยังไม่จัดกลุ่ม: {ungroupedTeams.length}</p>
          <p className="mt-1 text-sm text-slate-600">
            {ungroupedTeams.length ? ungroupedTeams.map((team) => team.name).join(', ') : 'ไม่มีทีมที่ยังไม่จัดกลุ่ม'}
          </p>
        </Card>
      </section>

      <ConfirmDialog
        isOpen={Boolean(groupToDelete)}
        title="ยืนยันการลบกลุ่ม"
        message={`ลบกลุ่ม "${groupToDelete?.name}"? ทีมที่อยู่ในกลุ่มจะยังคงอยู่ในโครงการและกลายเป็นทีมที่ยังไม่จัดกลุ่ม`}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
        confirmText="ลบกลุ่ม"
      />
    </div>
  );
}
