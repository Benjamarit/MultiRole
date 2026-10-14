import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import PageHeader from '../components/PageHeader';
import Select from '../components/Select';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getGroupsByProject,
  getGroupForTeam,
  getTeamIdsInGroup,
} from '../data/GroupStore';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();
  const project = getProjectById(id);
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
          .map((team) => Number(team.id))
      );
    }
    const group = groups.find((item) => String(item.id) === groupFilter);
    return new Set(group ? getTeamIdsInGroup(id, group.id) : []);
  }, [groupFilter, groups, id, teams]);

  const filteredTeams = useMemo(
    () =>
      groupTeamIds
        ? teams.filter((team) => groupTeamIds.has(Number(team.id)))
        : teams,
    [groupTeamIds, teams]
  );
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
  const visibleJudgeOptions = matchingJudgeOptions.some(
    (option) => option.value === selectedJudgeId
  )
    ? matchingJudgeOptions
    : [
        ...matchingJudgeOptions,
        ...judgeOptions.filter((option) => option.value === selectedJudgeId),
      ];
  const selectedTeamSet = new Set(selectedTeamIds.map(Number));
  const savedTeamSet = new Set(savedTeamIds.map(Number));
  const isDirty =
    selectedTeamIds.length !== savedTeamIds.length ||
    selectedTeamIds.some((teamId) => !savedTeamSet.has(Number(teamId)));
  const unassignedTeams = teams.filter(
    (team) => getJudgeIdsAssignedToTeam(id, team.id).length === 0
  );

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

  const saveAssignments = () => {
    if (!selectedJudge) {
      toast.error(t('กรุณาเลือกกรรมการก่อน', 'Please select a judge first'));
      return;
    }
    try {
      setJudgeAssignedTeams(id, selectedJudge.id, selectedTeamIds);
      setAssignments(getJudgeAssignments(id));
      setPendingTeamIdsByJudge((previousSelections) => ({
        ...previousSelections,
        [selectedJudgeId]: [...new Set(selectedTeamIds.map(Number))],
      }));
      toast.success(
        t('บันทึกการมอบหมายทีมเรียบร้อยแล้ว', 'Team assignments saved successfully')
      );
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
            'เฉพาะ Project Admin ของโครงการนี้เท่านั้นที่จัดการการมอบหมายได้',
            'Only the Project Admin can manage judge-team assignments.'
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
        title={t('มอบหมายทีมให้กรรมการ', 'Judge-Team Assignments')}
        description={tDesc(
          `เลือกทีมที่กรรมการแต่ละท่านมีสิทธิ์ประเมินในโครงการ ${project.name}`,
          `Assign specific teams to each judge in ${project.name}`
        )}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/project/${id}/judges`)}
            >
              <UserCheck className="h-4 w-4" />
              {t('จัดการกรรมการ', 'Manage Judges', { compact: true })}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/project/${id}/teams`)}
            >
              <Users className="h-4 w-4" />
              {t('จัดการทีม', 'Manage Teams', { compact: true })}
            </Button>
          </div>
        }
      />

      <Card className="space-y-5">
        {assignments.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  id="judge-search"
                  label={t('ค้นหากรรมการ', 'Filter Judge')}
                  placeholder={t(
                    'ค้นหาชื่อหรืออีเมลกรรมการ...',
                    'Filter by name or email...'
                  )}
                  value={judgeSearch}
                  onChange={(event) => setJudgeSearch(event.target.value)}
                />
                <Select
                  className="mt-3"
                  label={t('เลือกกรรมการ', 'Select Judge')}
                  value={selectedJudgeId}
                  onChange={(event) => {
                    setSelectedJudgeId(event.target.value);
                    setPage(1);
                  }}
                  options={visibleJudgeOptions}
                />
              </div>
              <Select
                label={t('กรองทีมตามกลุ่ม', 'Filter Teams by Group')}
                value={groupFilter}
                onChange={(event) => {
                  setGroupFilter(event.target.value);
                  setPage(1);
                }}
                options={[
                  {
                    value: 'all',
                    label: t('ทุกกลุ่ม / ทุกทีม', 'All Groups / All Teams', {
                      compact: true,
                    }),
                  },
                  ...groups.map((group) => ({
                    value: String(group.id),
                    label: group.name,
                  })),
                  {
                    value: UNGROUPED_FILTER,
                    label: t('ทีมที่ยังไม่จัดกลุ่ม', 'Ungrouped Teams', { compact: true }),
                  },
                ]}
              />
            </div>

            {selectedJudge && (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {t(
                        `มอบหมายอยู่แล้ว ${savedTeamIds.length} ทีม`,
                        `Currently Assigned: ${savedTeamIds.length} teams`
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {teams
                        .filter((team) => savedTeamSet.has(Number(team.id)))
                        .map((team) => team.name)
                        .join(', ') ||
                        t('ยังไม่มีทีมที่มอบหมาย', 'No teams assigned yet')}
                    </p>
                    <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                      {t(
                        `เลือกทั้งหมด ${selectedTeamIds.length} ทีม`,
                        `Selected: ${selectedTeamIds.length} teams`
                      )}
                      {isDirty && (
                        <span className="ml-2 font-semibold text-amber-700">
                          •{' '}
                          {t(
                            'มีรายการที่ยังไม่บันทึก',
                            'Unsaved changes',
                            { compact: true }
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        !filteredTeams.length ||
                        filteredTeams.every((team) =>
                          selectedTeamSet.has(Number(team.id))
                        )
                      }
                      onClick={() => setFilteredTeamsSelected(true)}
                    >
                      {t('เลือกทุกทีมในกลุ่มนี้', 'Select All in Filter', {
                        compact: true,
                      })}
                    </Button>
                    <Button
                      variant="textGray"
                      size="sm"
                      disabled={
                        !filteredTeams.some((team) =>
                          selectedTeamSet.has(Number(team.id))
                        )
                      }
                      onClick={() => setFilteredTeamsSelected(false)}
                    >
                      {t('ยกเลิกเลือกในกลุ่มนี้', 'Deselect All in Filter', {
                        compact: true,
                      })}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-between gap-3 py-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              {t(
                'ยังไม่มีกรรมการในโครงการนี้ กรุณาเพิ่มกรรมการในเมนูจัดการกรรมการก่อน',
                'No judges in this competition yet. Please invite judges first.'
              )}
            </p>
            <Button size="sm" onClick={() => navigate(`/project/${id}/judges`)}>
              <Plus className="h-4 w-4" />
              {t('ไปหน้าเพิ่มกรรมการ', 'Invite Judges', { compact: true })}
            </Button>
          </div>
        )}
      </Card>

      {assignments.length > 0 && teams.length > 0 ? (
        <Card noPadding>
          <div className="divide-y divide-slate-100">
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
                assignmentStatus = t('เลือกเพิ่ม — รอบันทึก', 'Selected — Unsaved', {
                  compact: true,
                });
                statusStyle = 'bg-blue-50 text-blue-800';
              } else if (!selected && assignedToSelectedJudge) {
                assignmentStatus = t('จะนำออกเมื่อบันทึก', 'Will Remove on Save', {
                  compact: true,
                });
                statusStyle = 'bg-amber-50 text-amber-800';
              } else if (selected) {
                assignmentStatus = t('มอบหมายให้กรรมการนี้แล้ว', 'Assigned to Judge', {
                  compact: true,
                });
                statusStyle = 'bg-emerald-50 text-emerald-800';
              } else if (assignedJudges.length) {
                assignmentStatus = t(
                  `มอบหมายให้กรรมการอื่น ${otherJudgeCount} คน`,
                  `Assigned to ${otherJudgeCount} other judge(s)`
                );
                statusStyle = 'bg-slate-100 text-slate-700';
              } else {
                assignmentStatus = t('ยังไม่มีกรรมการ', 'Unassigned', { compact: true });
                statusStyle = 'bg-amber-50 text-amber-800';
              }

              return (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTeam(team.id)}
                    disabled={!selectedJudge}
                    aria-label={`มอบหมาย ${team.name} ให้กรรมการที่เลือก`}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-precision-blue focus-visible:ring-2 focus-visible:ring-precision-blue"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{team.name}</span>
                      <Badge variant="default">
                        {getGroupForTeam(id, team.id)?.name ||
                          t('ยังไม่จัดกลุ่ม', 'Ungrouped', { compact: true })}
                      </Badge>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}
                      >
                        {assignmentStatus}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {assignedJudges.length
                        ? t(
                            `มอบหมายให้กรรมการทั้งหมด ${assignedJudges.length} คน`,
                            `Assigned to ${assignedJudges.length} judge(s) in total`
                          )
                        : t(
                            'ยังไม่ได้มอบหมายให้กรรมการคนใด',
                            'Not assigned to any judge yet'
                          )}
                    </span>
                  </span>
                </label>
              );
            })}
            {!pagedTeams.length && (
              <p className="p-8 text-center text-sm text-slate-500">
                {t('ไม่พบทีมในตัวกรองที่เลือก', 'No teams match the selected group')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500">
              {filteredTeams.length
                ? t(
                    `แสดง ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                      currentPage * PAGE_SIZE,
                      filteredTeams.length
                    )} จาก ${filteredTeams.length} ทีม`,
                    `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                      currentPage * PAGE_SIZE,
                      filteredTeams.length
                    )} of ${filteredTeams.length} teams`
                  )
                : t('ไม่มีทีมในกลุ่มนี้', 'No teams in this group')}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  {t('ก่อนหน้า', 'Previous', { compact: true })}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {t('ถัดไป', 'Next', { compact: true })}
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/50 p-4">
            <Button
              variant="secondary"
              onClick={cancelChanges}
              disabled={!selectedJudge || !isDirty}
            >
              {t('ยกเลิกการเปลี่ยนแปลง', 'Discard Changes', { compact: true })}
            </Button>
            <Button onClick={saveAssignments} disabled={!selectedJudge || !isDirty}>
              {t('บันทึกการมอบหมาย', 'Save Assignments', { compact: true })}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <p className="text-sm text-slate-500">
              {teams.length
                ? t(
                    'เพิ่มกรรมการเพื่อเริ่มมอบหมายทีม',
                    'Invite judges first to assign teams'
                  )
                : t('ยังไม่มีทีมในโครงการนี้', 'No teams in this competition yet')}
            </p>
            {!teams.length && (
              <Button size="sm" onClick={() => navigate(`/project/${id}/teams`)}>
                <Plus className="h-4 w-4" />
                {t('ไปหน้าเพิ่มทีม', 'Add Teams', { compact: true })}
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="bg-slate-50/70">
        <h2 className="font-bold text-slate-900">
          {t(
            `ทีมที่ยังไม่มีกรรมการ: ${unassignedTeams.length} ทีม`,
            `Unassigned Teams: ${unassignedTeams.length}`
          )}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {unassignedTeams.length
            ? unassignedTeams.map((team) => team.name).join(', ')
            : t(
                'ทุกทีมได้รับการมอบหมายให้กรรมการอย่างน้อยหนึ่งคนแล้ว',
                'Every team has at least one assigned judge.'
              )}
        </p>
      </Card>
    </div>
  );
}
