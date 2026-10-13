import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import PageHeader from '../components/PageHeader';
import Select from '../components/Select';
import Badge from '../components/Badge';
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

const PAGE_SIZE = 10;
const UNGROUPED_FILTER = 'ungrouped';

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
  const [judgeSearch, setJudgeSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pendingTeamIdsByJudge, setPendingTeamIdsByJudge] = useState({});
  const selectedJudge = assignments.find((assignment) => String(assignment.id) === selectedJudgeId);
  const savedTeamIds = selectedJudge ? getAssignedTeamIds(id, selectedJudge.id) : [];
  const selectedTeamIds = pendingTeamIdsByJudge[selectedJudgeId] ?? savedTeamIds;

  const groupTeamIds = useMemo(() => {
    if (groupFilter === 'all') return null;
    if (groupFilter === UNGROUPED_FILTER) {
      return new Set(teams
        .filter((team) => !getGroupForTeam(id, team.id))
        .map((team) => Number(team.id)));
    }
    const group = groups.find((item) => String(item.id) === groupFilter);
    return new Set(group ? getTeamIdsInGroup(id, group.id) : []);
  }, [groupFilter, groups, id, teams]);

  const filteredTeams = useMemo(
    () => groupTeamIds
      ? teams.filter((team) => groupTeamIds.has(Number(team.id)))
      : teams,
    [groupTeamIds, teams]
  );
  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTeams = filteredTeams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
  const normalizedSearch = judgeSearch.trim().toLocaleLowerCase();
  const matchingJudgeOptions = judgeOptions.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalizedSearch)
  );
  const visibleJudgeOptions = matchingJudgeOptions.some((option) => option.value === selectedJudgeId)
    ? matchingJudgeOptions
    : [
      ...matchingJudgeOptions,
      ...judgeOptions.filter((option) => option.value === selectedJudgeId),
    ];
  const selectedTeamSet = new Set(selectedTeamIds.map(Number));
  const savedTeamSet = new Set(savedTeamIds.map(Number));
  const isDirty = selectedTeamIds.length !== savedTeamIds.length ||
    selectedTeamIds.some((teamId) => !savedTeamSet.has(Number(teamId)));
  const unassignedTeams = teams.filter((team) => getJudgeIdsAssignedToTeam(id, team.id).length === 0);

  const getAssignedJudgesForTeam = (teamId) => getJudgeIdsAssignedToTeam(id, teamId);

  const toggleTeam = (teamId) => {
    const numericTeamId = Number(teamId);
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ?? savedTeamIds;
      const updated = previous.includes(numericTeamId)
        ? previous.filter((assignedId) => assignedId !== numericTeamId)
        : [...previous, numericTeamId];
      return { ...previousSelections, [selectedJudgeId]: updated };
    });
  };

  const setFilteredTeamsSelected = (shouldSelect) => {
    const filteredIds = new Set(filteredTeams.map((team) => Number(team.id)));
    setPendingTeamIdsByJudge((previousSelections) => {
      const previous = previousSelections[selectedJudgeId] ?? savedTeamIds;
      const retained = previous.filter((teamId) => !filteredIds.has(Number(teamId)));
      return {
        ...previousSelections,
        [selectedJudgeId]: shouldSelect
          ? [...retained, ...filteredIds]
          : retained,
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

  const saveAssignments = () => {
    if (!selectedJudge) {
      toast.error('กรุณาเลือกกรรมการก่อน');
      return;
    }
    try {
      setJudgeAssignedTeams(id, selectedJudge.id, selectedTeamIds);
      setAssignments(getJudgeAssignments(id));
      setPendingTeamIdsByJudge((previousSelections) => ({
        ...previousSelections,
        [selectedJudgeId]: [...new Set(selectedTeamIds.map(Number))],
      }));
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
        description={`เลือกทีมที่กรรมการได้รับอนุญาตให้ประเมินในโครงการ ${project.name}`}
      />

      <Card className="space-y-5">
        {assignments.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="judge-search" className="mb-1.5 block text-sm font-medium text-primary-text">
                  ค้นหากรรมการ
                </label>
                <Input
                  id="judge-search"
                  placeholder="ค้นหาชื่อหรืออีเมลกรรมการ..."
                  value={judgeSearch}
                  onChange={(event) => setJudgeSearch(event.target.value)}
                />
                <Select
                  className="mt-2"
                  label="เลือกกรรมการ"
                  value={selectedJudgeId}
                  onChange={(event) => {
                    setSelectedJudgeId(event.target.value);
                    setPage(1);
                  }}
                  options={visibleJudgeOptions}
                />
              </div>
              <Select
                label="กรองทีมตามกลุ่ม"
                value={groupFilter}
                onChange={(event) => {
                  setGroupFilter(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'ทุกกลุ่ม / ทุกทีม' },
                  ...groups.map((group) => ({ value: String(group.id), label: group.name })),
                  { value: UNGROUPED_FILTER, label: 'ทีมที่ยังไม่จัดกลุ่ม' },
                ]}
              />
            </div>

            {selectedJudge && (
              <div className="border-t border-border pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-text">
                      มอบหมายอยู่แล้ว {savedTeamIds.length} ทีม
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {teams.filter((team) => savedTeamSet.has(Number(team.id))).map((team) => team.name).join(', ') || 'ยังไม่มีทีมที่มอบหมาย'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600" aria-live="polite">
                      เลือกทั้งหมด {selectedTeamIds.length} ทีม
                      {isDirty && <span className="ml-2 font-medium text-amber-700">มีรายการที่ยังไม่บันทึก</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!filteredTeams.length || filteredTeams.every((team) => selectedTeamSet.has(Number(team.id)))}
                      onClick={() => setFilteredTeamsSelected(true)}
                    >
                      เลือกทุกทีมในกลุ่มนี้
                    </Button>
                    <Button
                      variant="textGray"
                      size="sm"
                      disabled={!filteredTeams.some((team) => selectedTeamSet.has(Number(team.id)))}
                      onClick={() => setFilteredTeamsSelected(false)}
                    >
                      ยกเลิกเลือกทีมในกลุ่มนี้
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">ยังไม่มีกรรมการในโครงการนี้ กรุณาเพิ่มกรรมการในเมนูจัดการกรรมการก่อน</p>
        )}
      </Card>

      {assignments.length > 0 && teams.length > 0 ? (
        <Card noPadding>
          <div className="divide-y divide-border">
            {pagedTeams.map((team) => {
              const assignedJudges = getAssignedJudgesForTeam(team.id);
              const assignedToSelectedJudge = savedTeamSet.has(Number(team.id));
              const selected = selectedTeamSet.has(Number(team.id));
              const otherJudgeCount = assignedJudges.filter(
                (assignment) => String(assignment.id) !== selectedJudgeId
              ).length;
              let assignmentStatus;
              let statusStyle;
              if (selected && !assignedToSelectedJudge) {
                assignmentStatus = 'เลือกเพิ่ม — ยังไม่บันทึก';
                statusStyle = 'bg-blue-50 text-blue-800';
              } else if (!selected && assignedToSelectedJudge) {
                assignmentStatus = 'จะนำออกเมื่อบันทึก';
                statusStyle = 'bg-amber-50 text-amber-800';
              } else if (selected) {
                assignmentStatus = 'มอบหมายให้กรรมการนี้แล้ว';
                statusStyle = 'bg-emerald-50 text-emerald-800';
              } else if (assignedJudges.length) {
                assignmentStatus = `มอบหมายให้กรรมการอื่น ${otherJudgeCount} คน`;
                statusStyle = 'bg-slate-100 text-slate-700';
              } else {
                assignmentStatus = 'ยังไม่มีกรรมการ';
                statusStyle = 'bg-amber-50 text-amber-800';
              }

              return (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTeam(team.id)}
                    disabled={!selectedJudge}
                    aria-label={`มอบหมาย ${team.name} ให้กรรมการที่เลือก`}
                    className="mt-1 h-4 w-4 rounded border-border text-precision-blue focus-visible:ring-2 focus-visible:ring-precision-blue"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary-text">{team.name}</span>
                      <Badge variant="default">{getGroupForTeam(id, team.id)?.name || 'ยังไม่จัดกลุ่ม'}</Badge>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                        {assignmentStatus}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {assignedJudges.length
                        ? `มอบหมายให้กรรมการทั้งหมด ${assignedJudges.length} คน`
                        : 'ยังไม่ได้มอบหมายให้กรรมการคนใด'}
                    </span>
                  </span>
                </label>
              );
            })}
            {!pagedTeams.length && (
              <p className="p-8 text-center text-sm text-slate-500">ไม่พบทีมในตัวกรองที่เลือก</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-sm text-slate-500">
              {filteredTeams.length
                ? `แสดง ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredTeams.length)} จาก ${filteredTeams.length} ทีม`
                : 'ไม่มีทีมในกลุ่มนี้'}
              {totalPages > 1 && ` · หน้า ${currentPage} จาก ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="text" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  ก่อนหน้า
                </Button>
                <Button variant="text" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                  ถัดไป
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
            <Button variant="secondary" onClick={cancelChanges} disabled={!selectedJudge || !isDirty}>
              ยกเลิกการเปลี่ยนแปลง
            </Button>
            <Button onClick={saveAssignments} disabled={!selectedJudge || !isDirty}>
              บันทึกการเปลี่ยนแปลง
            </Button>
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
          ทีมหนึ่งมอบหมายให้กรรมการหลายคนได้ การเปลี่ยนมอบหมายไม่สร้างหรือแก้ไขผลประเมิน
        </p>
      </Card>
    </div>
  );
}
