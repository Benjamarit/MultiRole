import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Select from '../components/Select';
import { useAuth } from '../context/AuthContext';
import { getGroupsByProject, getGroupForTeam, getTeamIdsInGroup } from '../data/GroupStore';
import {
  getAssignedTeamIds,
  getJudgeAssignments,
  getJudgeIdsAssignedToTeam,
  getProjectById,
  isProjectAdmin,
  setJudgeAssignedTeams,
} from '../data/ProjectStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getRegisteredUsers } from '../context/authStore';

export default function JudgeTeamAssignments() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = getProjectById(id);
  const authorized = isProjectAdmin(id, user?.email);
  const teams = getTeamsByProject(id);
  const groups = getGroupsByProject(id);
  const registeredUsers = getRegisteredUsers();
  const [assignments, setAssignments] = useState(() => getJudgeAssignments(id));
  const [selectedJudgeId, setSelectedJudgeId] = useState(() => String(getJudgeAssignments(id)[0]?.id || ''));
  const [groupFilter, setGroupFilter] = useState('all');
  const selectedJudge = assignments.find((assignment) => String(assignment.id) === selectedJudgeId);
  const [pendingTeamIdsByJudge, setPendingTeamIdsByJudge] = useState({});
  const selectedTeamIds = pendingTeamIdsByJudge[selectedJudgeId] ??
    (selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : []);

  const displayedTeams = useMemo(() => {
    if (groupFilter === 'all') return teams;
    const group = groups.find((item) => String(item.id) === groupFilter);
    const teamIds = group ? getTeamIdsInGroup(id, group.id) : [];
    return teams.filter((team) => teamIds.includes(Number(team.id)));
  }, [groupFilter, groups, id, teams]);

  const userByEmail = new Map(registeredUsers.map((registeredUser) => [
    registeredUser.email,
    registeredUser,
  ]));
  const judgeOptions = assignments.map((assignment) => {
    const email = assignment.email || assignment.id;
    const judge = userByEmail.get(email);
    return {
      value: String(assignment.id),
      label: `${judge?.name || email} (${email})`,
    };
  });
  const assignedTeamSet = new Set(selectedTeamIds.map(Number));
  const assignedTeamCount = selectedTeamIds.length;
  const unassignedTeams = teams.filter((team) =>
    getJudgeIdsAssignedToTeam(id, team.id).length === 0
  );

  const refreshAssignments = () => setAssignments(getJudgeAssignments(id));
  const toggleTeam = (teamId) => {
    const numericTeamId = Number(teamId);
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ??
        (selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : []);
      const updated = previous.includes(numericTeamId)
        ? previous.filter((assignedId) => assignedId !== numericTeamId)
        : [...previous, numericTeamId];
      return { ...previousSelections, [selectedJudgeId]: updated };
    });
  };

  const selectVisibleTeams = () => {
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ??
        (selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : []);
      return {
        ...previousSelections,
        [selectedJudgeId]: [...new Set([
          ...previous,
          ...displayedTeams.map((team) => Number(team.id)),
        ])],
      };
    });
  };

  const clearVisibleTeams = () => {
    const visibleIds = new Set(displayedTeams.map((team) => Number(team.id)));
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ??
        (selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : []);
      return {
        ...previousSelections,
        [selectedJudgeId]: previous.filter((teamId) => !visibleIds.has(teamId)),
      };
    });
  };

  const saveAssignments = () => {
    if (!selectedJudge) {
      toast.error('กรุณาเลือกกรรมการก่อน');
      return;
    }
    try {
      setJudgeAssignedTeams(id, selectedJudge.id, selectedTeamIds);
      refreshAssignments();
      toast.success('บันทึกการมอบหมายทีมเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!project) {
    return <div className="p-6"><Card>ไม่พบโครงการนี้</Card></div>;
  }
  if (!authorized) {
    return <div className="p-6"><Card>เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการการมอบหมายได้</Card></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackButton to={`/project/${id}/dashboard`}>กลับไปหน้า Dashboard โครงการ</BackButton>
      <PageHeader
        title="มอบหมายทีมให้กรรมการ"
        description={`กำหนดทีมที่กรรมการแต่ละคนได้รับอนุญาตให้ประเมินในโครงการ ${project.name}`}
      />

      <Card>
        {assignments.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="เลือกกรรมการ"
              value={selectedJudgeId}
              onChange={(event) => setSelectedJudgeId(event.target.value)}
              options={judgeOptions}
            />
            <Select
              label="กรองตามกลุ่มทีม (ไม่บังคับ)"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              options={[{ value: 'all', label: 'ทุกกลุ่ม / ทุกทีม' }, ...groups.map((group) => ({
                value: String(group.id),
                label: group.name,
              }))]}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-600">ยังไม่มีกรรมการในโครงการนี้ กรุณาเชิญกรรมการก่อน</p>
        )}
        {selectedJudge && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-slate-600" aria-live="polite">
              เลือกไว้ {assignedTeamCount} ทีม:
              {' '}{teams.filter((team) => assignedTeamSet.has(Number(team.id))).map((team) => team.name).join(', ') || 'ยังไม่มีทีม'}
            </p>
            <div className="flex gap-2">
              <Button variant="text" size="sm" onClick={selectVisibleTeams}>เลือกทีมที่แสดง</Button>
              <Button variant="textGray" size="sm" onClick={clearVisibleTeams}>นำทีมที่แสดงออก</Button>
            </div>
          </div>
        )}
      </Card>

      {assignments.length > 0 && teams.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-sm text-slate-600">
                  <th className="px-5 py-3 font-medium">มอบหมาย</th>
                  <th className="px-5 py-3 font-medium">ทีม</th>
                  <th className="px-5 py-3 font-medium">กลุ่ม</th>
                  <th className="px-5 py-3 font-medium">กรรมการที่ได้รับมอบหมาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedTeams.map((team) => {
                  const assignedJudges = getJudgeIdsAssignedToTeam(id, team.id);
                  const teamGroup = getGroupForTeam(id, team.id);
                  return (
                    <tr key={team.id}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={assignedTeamSet.has(Number(team.id))}
                          onChange={() => toggleTeam(team.id)}
                          disabled={!selectedJudge}
                          aria-label={`มอบหมาย ${team.name} ให้กรรมการที่เลือก`}
                          className="h-4 w-4 rounded border-border text-precision-blue focus-visible:ring-2 focus-visible:ring-precision-blue"
                        />
                      </td>
                      <td className="px-5 py-3 font-medium text-primary-text">{team.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{teamGroup?.name || 'ยังไม่จัดกลุ่ม'}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {assignedJudges.length
                          ? assignedJudges.map((assignment) => {
                            const email = assignment.email || assignment.id;
                            return userByEmail.get(email)?.name || email;
                          }).join(', ')
                          : <span className="text-amber-700">ยังไม่มีกรรมการ</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!displayedTeams.length && (
              <p className="p-8 text-center text-sm text-slate-500">ไม่พบทีมในกลุ่มที่เลือก</p>
            )}
          </div>
          <div className="flex justify-end border-t border-border p-4">
            <Button onClick={saveAssignments} disabled={!selectedJudge}>บันทึกการมอบหมาย</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="py-6 text-center text-slate-500">
            {teams.length ? 'เพิ่มกรรมการเพื่อเริ่มมอบหมายทีม' : 'ยังไม่มีทีมในโครงการนี้'}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-primary-text">ทีมที่ยังไม่มีกรรมการ: {unassignedTeams.length}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {unassignedTeams.length ? unassignedTeams.map((team) => team.name).join(', ') : 'ทุกทีมมีกรรมการอย่างน้อยหนึ่งคนแล้ว'}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          แต่ละทีมมอบหมายให้กรรมการหลายคนได้ การเปลี่ยนมอบหมายจะไม่สร้างหรือแก้ไขผลประเมิน
        </p>
      </Card>
    </div>
  );
}
