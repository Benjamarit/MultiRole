import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderKanban,
  Plus,
  Scale,
  Search,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteProject,
  getAssignedTeamIds,
  getJudgeAssignments,
  getJudgingProjects,
  getMyProjects,
  isBeforeEvaluationDeadline,
} from '../data/ProjectStore';
import { deleteProjectTeams, getTeamsByProject } from '../data/TeamStore';
import { deleteProjectCriteria, hasCompleteCriteriaWeights } from '../data/CriteriaStore';
import { deleteProjectEvaluations, getEvaluation } from '../data/EvaluationStore';
import { removeProjectGroups } from '../data/GroupStore';

const statusVariant = (status) => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Draft':
      return 'warning';
    default:
      return 'default';
  }
};

function getJudgeProgress(project, judgeEmail) {
  const assignments = getJudgeAssignments(project.id);
  const myAssignment = assignments.find((a) => (a.email || a.id) === judgeEmail);
  const assignedTeamIds = myAssignment ? getAssignedTeamIds(project.id, myAssignment.id) : [];

  const eligibleTeams = getTeamsByProject(project.id).filter((team) =>
    assignedTeamIds.includes(Number(team.id))
  );
  const completed = eligibleTeams.filter(
    (team) => getEvaluation(project.id, team.id, judgeEmail)?.status === 'SUBMITTED'
  ).length;

  return { completed, total: eligibleTeams.length };
}

/**
 * เรียงลำดับโครงการตามกำหนดส่งคะแนนที่ใกล้ถึงก่อน (Upcoming Deadline First):
 * 1. โครงการที่มี Deadline และยังไม่หมดเวลา (เรียงจากเวลาที่ใกล้ถึงที่สุดไปไกลสุด)
 * 2. โครงการที่มี Deadline แต่หมดเวลาแล้ว (เรียงจากเพิ่งหมดเวลาไปนานสุด)
 * 3. โครงการที่ไม่ได้กำหนด Deadline ไว้ท้ายสุด
 */
function compareByUpcomingDeadline(a, b) {
  const now = Date.now();
  const timeA = a.evaluationDeadline ? new Date(a.evaluationDeadline).getTime() : NaN;
  const timeB = b.evaluationDeadline ? new Date(b.evaluationDeadline).getTime() : NaN;
  const hasA = Number.isFinite(timeA);
  const hasB = Number.isFinite(timeB);

  if (!hasA && !hasB) return a.name.localeCompare(b.name, 'th');
  if (!hasA) return 1;
  if (!hasB) return -1;

  const upcomingA = timeA >= now;
  const upcomingB = timeB >= now;
  if (upcomingA !== upcomingB) return upcomingA ? -1 : 1;

  if (upcomingA) {
    return timeA - timeB; // ใกล้ถึงก่อนขึ้นก่อน
  }
  return timeB - timeA; // หมดเขตล่าสุดขึ้นก่อน
}

export default function Workspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tDesc } = useLanguage();

  const [deletedProjectIds, setDeletedProjectIds] = useState(() => new Set());
  const myProjects = useMemo(
    () =>
      getMyProjects(user?.email)
        .filter((project) => !deletedProjectIds.has(project.id))
        .map((project) => {
          const teams = getTeamsByProject(project.id);
          const judges = getJudgeAssignments(project.id);
          const criteriaReady = hasCompleteCriteriaWeights(project.id);
          return {
            ...project,
            teamsCount: teams.length,
            judgesCount: judges.length,
            criteriaReady,
          };
        }),
    [user?.email, deletedProjectIds]
  );

  const judgingProjects = useMemo(() => {
    return getJudgingProjects(user?.email)
      .filter((project) => !deletedProjectIds.has(project.id))
      .map((project) => ({
        ...project,
        progress: getJudgeProgress(project, user?.email),
      }));
  }, [user?.email, deletedProjectIds]);

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'owned' | 'judging'
  const [searchTerm, setSearchTerm] = useState('');
  const [mySortBy, setMySortBy] = useState('newest'); // 'newest' | 'deadline-soon' | 'name'
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | completed
  const [sortBy, setSortBy] = useState('deadline-soon'); // 'deadline-soon' | 'pending-first' | 'name'
  const [projectToDelete, setProjectToDelete] = useState(null);

  const totalPendingTeams = useMemo(
    () =>
      judgingProjects.reduce(
        (sum, p) => sum + Math.max(0, p.progress.total - p.progress.completed),
        0
      ),
    [judgingProjects]
  );

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    try {
      removeProjectGroups(projectToDelete.id);
      deleteProjectEvaluations(projectToDelete.id);
      deleteProjectTeams(projectToDelete.id);
      deleteProjectCriteria(projectToDelete.id);
      const deleted = deleteProject(projectToDelete.id);
      if (!deleted) {
        toast.error(t('ไม่พบโครงการที่ต้องการลบ', 'Competition not found'));
        return;
      }
      setDeletedProjectIds((prev) => new Set(prev).add(projectToDelete.id));
      toast.success(
        t(
          `ลบโครงการ "${projectToDelete.name}" เรียบร้อยแล้ว`,
          `Deleted "${projectToDelete.name}"`
        )
      );
      setProjectToDelete(null);
    } catch {
      toast.error(t('ลบโครงการไม่สำเร็จ กรุณาลองอีกครั้ง', 'Failed to delete competition'));
    }
  };

  const filteredMyProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = myProjects.filter(
      (project) =>
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.type || '').toLowerCase().includes(query) ||
        (project.description || '').toLowerCase().includes(query)
    );

    list = [...list].sort((a, b) => {
      if (mySortBy === 'deadline-soon') return compareByUpcomingDeadline(a, b);
      if (mySortBy === 'name') return a.name.localeCompare(b.name, 'th');
      return Number(b.id) - Number(a.id);
    });

    return list;
  }, [myProjects, searchTerm, mySortBy]);

  const filteredJudgingProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    let list = judgingProjects.filter((project) => {
      const matchesQuery =
        !query ||
        project.name.toLowerCase().includes(query) ||
        (project.ownerName || '').toLowerCase().includes(query);

      const isCompleted =
        project.progress.total > 0 && project.progress.completed >= project.progress.total;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && isCompleted) ||
        (statusFilter === 'pending' && !isCompleted);

      return matchesQuery && matchesStatus;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'deadline-soon') return compareByUpcomingDeadline(a, b);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');

      const aDone = a.progress.total > 0 && a.progress.completed >= a.progress.total;
      const bDone = b.progress.total > 0 && b.progress.completed >= b.progress.total;
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aRemaining = a.progress.total - a.progress.completed;
      const bRemaining = b.progress.total - b.progress.completed;
      if (bRemaining !== aRemaining) return bRemaining - aRemaining;
      return compareByUpcomingDeadline(a, b);
    });

    return list;
  }, [judgingProjects, searchTerm, statusFilter, sortBy]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <PageHeader
        title={t(
          `สวัสดี, ${user?.name || 'ผู้ใช้งาน'}`,
          `Welcome, ${user?.name || 'User'}`
        )}
        description={tDesc(
          'บริหารจัดการโครงการประกวดที่คุณสร้าง หรือเข้าประเมินให้คะแนนในโครงการที่คุณได้รับเชิญเป็นกรรมการ',
          'Manage competitions you created as Project Admin or evaluate assigned teams as a Judge.'
        )}
        action={
          <Button onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4" />
            {t('สร้างโครงการใหม่', 'Create Competition')}
          </Button>
        }
      />

      {/* การ์ดสรุปภาพรวม (Summary KPI Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 border-l-4 border-l-blue-600">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('โครงการที่ฉันสร้าง', 'My Competitions')}
            </p>
            <p className="text-2xl font-bold text-slate-900">{myProjects.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-indigo-600">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('โครงการที่เป็นกรรมการ', 'Judging Invitations')}
            </p>
            <p className="text-2xl font-bold text-slate-900">{judgingProjects.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t('ทีมที่รอฉันประเมิน', 'Teams Awaiting My Score')}
            </p>
            <p className="text-2xl font-bold text-amber-700">{totalPendingTeams}</p>
          </div>
        </Card>
      </div>

      {/* แถบเลือกมุมมอง (Tabs) และช่องค้นหากลาง */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
          role="tablist"
          aria-label="Workspace view selector"
        >
          {[
            {
              id: 'all',
              label: t('แสดงทั้งหมด', 'All Views'),
              count: myProjects.length + judgingProjects.length,
            },
            {
              id: 'owned',
              label: t('โครงการของฉัน', 'My Competitions'),
              count: myProjects.length,
            },
            {
              id: 'judging',
              label: t('ที่เป็นกรรมการ', 'Judging Panel'),
              count: judgingProjects.length,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  active
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:max-w-xs">
          <label htmlFor="workspace-search" className="sr-only">
            {t('ค้นหาชื่อโครงการ', 'Search competitions')}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="workspace-search"
            type="text"
            placeholder={t(
              'ค้นหาโครงการ หรือ เจ้าของ...',
              'Search competition or owner...'
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* ส่วนที่ 1: โครงการที่ฉันสร้าง (Project Admin) */}
      {(activeTab === 'all' || activeTab === 'owned') && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Briefcase className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('โครงการที่ฉันสร้าง', 'My Competitions (Project Admin)')}
              </h2>
            </div>

            {myProjects.length > 1 && (
              <div className="flex items-center gap-2">
                <select
                  value={mySortBy}
                  onChange={(e) => setMySortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="newest">
                    {t('เรียง: สร้างล่าสุด', 'Sort: Newest First')}
                  </option>
                  <option value="deadline-soon">
                    {t('เรียง: กำหนดส่งใกล้ถึงก่อน', 'Sort: Nearest Deadline')}
                  </option>
                  <option value="name">
                    {t('เรียง: ชื่อโครงการ (ก-ฮ)', 'Sort: Name (A-Z)')}
                  </option>
                </select>
              </div>
            )}
          </div>

          {filteredMyProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredMyProjects.map((project) => {
                const isExpired =
                  project.evaluationDeadline && !isBeforeEvaluationDeadline(project);
                return (
                  <Card
                    key={project.id}
                    className="flex flex-col justify-between hover:border-blue-300 hover:shadow-md"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          {project.type && (
                            <span className="mb-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {project.type}
                            </span>
                          )}
                          <h3 className="text-lg font-bold text-slate-900">
                            {project.name}
                          </h3>
                        </div>
                        <Badge variant={statusVariant(project.status)}>
                          {project.status === 'Active'
                            ? t('เปิดรับคะแนน', 'Active')
                            : t('ร่าง', 'Draft')}
                        </Badge>
                      </div>

                      {project.evaluationDeadline && (
                        <p
                          className={`mb-3 flex items-center gap-1.5 text-xs font-medium ${
                            isExpired ? 'text-red-600' : 'text-amber-700'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {isExpired
                            ? t('หมดเขต:', 'Expired:')
                            : t('ปิดรับคะแนน:', 'Deadline:')}{' '}
                          {new Date(project.evaluationDeadline).toLocaleString('th-TH')}
                        </p>
                      )}

                      <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            {t('ทีม', 'Teams')}
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {project.teamsCount}
                          </p>
                        </div>
                        <div className="border-x border-slate-200/80">
                          <p className="text-[11px] text-slate-500">
                            {t('กรรมการ', 'Judges')}
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {project.judgesCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">
                            {t('เกณฑ์ 100%', 'Criteria')}
                          </p>
                          <p
                            className={`text-xs font-bold ${
                              project.criteriaReady ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {project.criteriaReady
                              ? t('ครบแล้ว', 'Ready')
                              : t('ยังไม่ครบ', 'Incomplete')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                      <Button
                        className="flex-1"
                        onClick={() => navigate(`/project/${project.id}/dashboard`)}
                      >
                        {t('จัดการโครงการ', 'Manage')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/project/${project.id}/leaderboard`)}
                        title={t('ดูตารางอันดับ', 'Leaderboard')}
                      >
                        <Trophy className="h-4 w-4 text-amber-500" />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setProjectToDelete(project)}
                        title={t('ลบโครงการ', 'Delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-slate-50/60">
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">
                  {searchTerm
                    ? t('ไม่พบโครงการที่คุณสร้างตามคำค้นหา', 'No matching competitions found')
                    : t(
                        'คุณยังไม่ได้สร้างโครงการใดๆ กดปุ่ม "+ สร้างโครงการใหม่" เพื่อเริ่มต้น',
                        'You have not created any competitions yet. Click "+ Create Competition" to begin.'
                      )}
                </p>
              </div>
            </Card>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={projectToDelete !== null}
        title={t('ยืนยันการลบโครงการ', 'Confirm Competition Deletion')}
        message={t(
          `ต้องการลบโครงการ "${projectToDelete?.name}" หรือไม่? ทีม เกณฑ์ประเมิน และคะแนนทั้งหมดของโครงการนี้จะถูกลบถาวร`,
          `Are you sure you want to delete "${projectToDelete?.name}"? All teams, criteria, and evaluation scores will be permanently removed.`
        )}
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
        confirmText={t('ลบโครงการ', 'Delete Competition')}
      />

      {/* ส่วนที่ 2: โครงการที่ฉันเป็นกรรมการ (Judge) */}
      {(activeTab === 'all' || activeTab === 'judging') && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Scale className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {t('โครงการที่ฉันเป็นกรรมการ', 'Competitions Assigned to Me (Judge)')}
              </h2>
            </div>

            {judgingProjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">{t('ทุกสถานะ', 'All Status')}</option>
                  <option value="pending">
                    {t('ยังประเมินไม่ครบ', 'Pending Evaluation')}
                  </option>
                  <option value="completed">
                    {t('ประเมินครบแล้ว', 'Completed')}
                  </option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="deadline-soon">
                    {t('เรียง: กำหนดส่งใกล้ถึงก่อน', 'Sort: Nearest Deadline')}
                  </option>
                  <option value="pending-first">
                    {t('เรียง: ค้างเยอะสุดก่อน', 'Sort: Most Pending First')}
                  </option>
                  <option value="name">
                    {t('เรียง: ชื่อโครงการ (ก-ฮ)', 'Sort: Name (A-Z)')}
                  </option>
                </select>
              </div>
            )}
          </div>

          {judgingProjects.length > 0 ? (
            filteredJudgingProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJudgingProjects.map((project) => {
                  const { completed, total } = project.progress;
                  const isCompleted = total > 0 && completed >= total;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const isExpired =
                    project.evaluationDeadline && !isBeforeEvaluationDeadline(project);

                  return (
                    <Card
                      key={project.id}
                      className="flex flex-col justify-between hover:border-indigo-300 hover:shadow-md"
                    >
                      <div>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {project.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {t('เจ้าของ:', 'Owner:')} {project.ownerName}
                            </p>
                          </div>
                          <Badge variant={statusVariant(project.status)}>
                            {project.status}
                          </Badge>
                        </div>

                        {project.evaluationDeadline ? (
                          <p
                            className={`mb-3 flex items-center gap-1.5 text-xs font-medium ${
                              isExpired ? 'text-red-600' : 'text-amber-700'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {isExpired
                              ? t('หมดเขต:', 'Expired:')
                              : t('ปิดรับคะแนน:', 'Deadline:')}{' '}
                            {new Date(project.evaluationDeadline).toLocaleString('th-TH')}
                          </p>
                        ) : (
                          <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {t('ไม่กำหนดวันหมดเขต', 'No deadline set')}
                          </p>
                        )}

                        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">
                              {t('ความคืบหน้าการประเมิน', 'Evaluation Progress')}
                            </span>
                            <span
                              className={
                                isCompleted
                                  ? 'flex items-center gap-1 font-bold text-emerald-600'
                                  : 'font-bold text-slate-800'
                              }
                            >
                              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {completed} / {total} {t('ทีม', 'teams')} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/judge/project/${project.id}/teams`)}
                        disabled={project.status !== 'Active'}
                      >
                        {project.status === 'Active'
                          ? t('เข้าสู่หน้าประเมิน', 'Evaluate Teams')
                          : t('ยังไม่เปิดรับคะแนน', 'Not Open Yet')}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-50/60">
                <p className="py-8 text-center text-sm text-slate-500">
                  {t(
                    'ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก',
                    'No competitions match the selected filters'
                  )}
                </p>
              </Card>
            )
          ) : (
            <Card className="bg-slate-50/60">
              <p className="py-8 text-center text-sm text-slate-500">
                {t(
                  'ยังไม่มีโครงการที่คุณได้รับเชิญเป็นกรรมการ — เมื่อ Project Admin เชิญคุณเข้าโครงการ จะปรากฏที่นี่',
                  'You have not been invited as a judge yet. Invited competitions will appear here.'
                )}
              </p>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}