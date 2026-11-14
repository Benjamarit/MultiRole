import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Scale,
  ClipboardList,
  BarChart3,
  Trophy,
  CheckCircle2,
  ChevronDown,
  Circle,
  CalendarClock,
  ArrowRight,
  UserCheck,
  Sparkles,
  LockKeyhole,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import DeadlineHistory from '../components/DeadlineHistory';
import ProjectStructureLock from '../components/ProjectStructureLock';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { getCriteriaByProject } from '../data/evaluations/CriteriaStore';
import { getTeamsByProject } from '../data/teams/TeamStore';
import { getProjectSetupReadiness, isActivationDeadlineValid } from '../data/projects/ProjectReadiness';
import { detail } from '../api/workspace';
import { getGroupsByProject } from '../data/teams/GroupStore';
import { getEvaluationsByProject } from '../data/evaluations/EvaluationStore';
import {
  getJudgeAssignments,
  getProjectById,
  isBeforeEvaluationDeadline,
  updateProjectDetails,
  updateProjectStatus,
} from '../data/projects/ProjectStore';

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

export default function ProjectDashboard() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [project, setProject] = useState(() => getProjectById(id));
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criteria = getCriteriaByProject(id);

  const teams = getTeamsByProject(id);
  const groups = getGroupsByProject(id);
  const judges = getJudgeAssignments(id);
  const evaluations = getEvaluationsByProject(id).filter((e) => e.status === 'SUBMITTED');

  const setup = getProjectSetupReadiness(criteria, teams, judges, detail(id).assignments);
  const { totalWeight: totalCriteriaWeight, criteriaReady: hasCompleteWeights, assignedTeamsCount, allTeamsAssigned } = setup;
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [pendingDeadline, setPendingDeadline] = useState(null);
  const [deadlineRevision, setDeadlineRevision] = useState(0);
  const deadlineValid = isActivationDeadlineValid(project?.evaluationDeadline, clock);
  const canActivate = setup.ready && deadlineValid;
  const missing = [
    !setup.criteriaReady && { text: t('กำหนดเกณฑ์ประเมินให้น้ำหนักรวมครบ 100%', 'Set criteria weights to a total of 100%'), path: `/project/${id}/criteria` },
    !setup.hasTeams && { text: t('เพิ่มทีมเข้าแข่งขันอย่างน้อย 1 ทีม', 'Add at least one team'), path: `/project/${id}/teams` },
    !setup.hasJudges && { text: t('เพิ่มกรรมการอย่างน้อย 1 คน', 'Add at least one judge'), path: `/project/${id}/judges` },
    setup.hasTeams && !setup.allTeamsAssigned && { text: t(`ยังมี ${setup.unassignedTeamsCount} ทีมที่ไม่ได้มอบหมายกรรมการ`, `${setup.unassignedTeamsCount} teams still need an assigned judge`), path: `/project/${id}/assignments` },
    !deadlineValid && { text: t('กำหนดเวลาปิดรับคะแนนผ่านไปแล้ว กรุณาเปลี่ยนเป็นเวลาในอนาคต', 'The scoring deadline has passed. Set a future deadline.'), path: '#project-evaluation-deadline' },
  ].filter(Boolean);

  // 5 ขั้นตอนตัวช่วยนำทางตั้งค่าโครงการ (Setup Guide / Stepper)
  const setupSteps = [
    {
      step: 1,
      title: t('ตั้งเกณฑ์ประเมินครบ 100%', 'Configure Criteria (100%)', { compact: true }),
      statusText: `${totalCriteriaWeight}% / 100% (${criteria.length} ${t('ข้อ', 'items', { compact: true })})`,
      done: hasCompleteWeights,
      path: `/project/${id}/criteria`,
    },
    {
      step: 2,
      title: t('เพิ่มทีมเข้าแข่งขัน', 'Add Participating Teams', { compact: true }),
      statusText: `${teams.length} ${t('ทีม', 'teams', { compact: true })}`,
      done: teams.length > 0,
      path: `/project/${id}/teams`,
    },
    {
      step: 3,
      title: t('เชิญกรรมการตัดสิน', 'Invite Judges', { compact: true }),
      statusText: `${judges.length} ${t('คน', 'judges', { compact: true })}`,
      done: judges.length > 0,
      path: `/project/${id}/judges`,
    },
    {
      step: 4,
      title: t('มอบหมายทีมให้กรรมการ', 'Assign Teams to Judges', { compact: true }),
      statusText: `${assignedTeamsCount}/${teams.length} ${t('ทีมมีกรรมการแล้ว', 'teams assigned', { compact: true })}`,
      done: allTeamsAssigned,
      blocked: !setup.canAssign,
      path: `/project/${id}/assignments`,
    },
    {
      step: 5,
      title: t('เปิดรับการประเมินคะแนน', 'Open Evaluation (Active)', { compact: true }),
      statusText:
        project?.status === 'Active'
          ? t('เปิดรับคะแนนแล้ว', 'Active & Open', { compact: true })
          : t('ยังอยู่ในโหมดร่าง', 'Currently in Draft'),
      done: project?.status === 'Active',
      path: null,
    },
  ];

  const completedStepsCount = setupSteps.filter((s) => s.done).length;
  const nextStep = project?.status === 'Active' ? null : setupSteps.find(step => !step.done && !step.blocked);

  const projectMenus = [
    {
      title: t('จัดการทีมและกลุ่ม', 'Teams & Groups'),
      path: `/project/${id}/teams`,
      icon: Users,
      stat: `${teams.length} ${t('ทีม', 'Teams', { compact: true })} · ${groups.length} ${t('กลุ่ม', 'Groups', { compact: true })}`,
    },
    {
      title: t('จัดการกรรมการ', 'Manage Judges'),
      path: `/project/${id}/judges`,
      icon: Scale,
      stat: `${judges.length} ${t('คน', 'Judges', { compact: true })}`,
    },
    {
      title: t('มอบหมายทีมให้กรรมการ', 'Judge-Team Assignments'),
      path: `/project/${id}/assignments`,
      icon: UserCheck,
      stat: `${assignedTeamsCount}/${teams.length} ${t('ทีม', 'Teams Assigned', { compact: true })}`,
    },
    {
      title: t('เกณฑ์การประเมิน', 'Scoring Criteria'),
      path: `/project/${id}/criteria`,
      icon: ClipboardList,
      stat: `${criteria.length} ${t('เกณฑ์', 'Criteria', { compact: true })} (${totalCriteriaWeight}%)`,
    },
    {
      title: t('ติดตามผลการประเมิน', 'Evaluation Monitoring'),
      path: `/project/${id}/evaluations`,
      icon: BarChart3,
      stat: `${evaluations.length} ${t('ผลประเมินที่ส่งแล้ว', 'Submitted', { compact: true })}`,
    },
    {
      title: t('สรุปผลจัดอันดับ', 'Leaderboard & Export'),
      path: `/project/${id}/leaderboard`,
      icon: Trophy,
      stat: t('อันดับและส่งออก', 'Rankings & export', { compact: true }),
    },
  ];
  const scoringHasOpened = project?.criteriaLocked || project?.status === 'Active' || project?.status === 'Closed';
  const quickMenus = scoringHasOpened
    ? [...projectMenus.filter(menu => [BarChart3, Trophy].includes(menu.icon)), ...projectMenus.filter(menu => ![BarChart3, Trophy].includes(menu.icon))]
    : projectMenus;

  const handleToggleStatus = async () => {
    if (isUpdatingStatus) return;
    const nextStatus = project.status === 'Active' ? 'Draft' : 'Active';
    if (nextStatus === 'Active' && !canActivate) {
      toast.error(missing.map(item => item.text).join('\n'));
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateProjectStatus(id, nextStatus);
      setProject(getProjectById(id));
      toast.success(nextStatus === 'Active'
        ? t('เปิดรับคะแนนเรียบร้อยแล้ว!', 'Competition is now Active!')
        : t('เปลี่ยนเป็นโหมดร่าง (ปิดรับคะแนนชั่วคราว)', 'Switched to Draft status'));
    } catch (error) { toast.error(error.message); }
    finally { setIsUpdatingStatus(false); }
  };

  const handleDeadlineChange = async value => {
    if (isSavingDeadline) return;
    setIsSavingDeadline(true);
    try {
      const updatedProject = await updateProjectDetails(id, {
        evaluationDeadline: value || null,
      });
      setProject(updatedProject);
      setPendingDeadline(null);
      setDeadlineRevision(v => v + 1);
      toast.success(t('อัปเดตกำหนดส่งคะแนนแล้ว', 'Evaluation deadline updated'));
    } catch (error) {
      toast.error(error.message);
    } finally { setIsSavingDeadline(false); }
  };

  const requestDeadlineChange = value => {
    const next = String(value || '');
    if (next === (project?.evaluationDeadline || '').slice(0, 16)) {
      toast.success(t('กำหนดเวลายังเหมือนเดิม', 'The deadline is unchanged'));
      return;
    }
    setPendingDeadline({ value: next, previous: project.evaluationDeadline });
  };

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Card>{t('ไม่พบโครงการนี้', 'Competition not found')}</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to="/workspace">
        {t('กลับไปหน้าแดชบอร์ด', 'Back to Dashboard', { compact: true })}
      </BackButton>

      <PageHeader
        title={project.name}
        subtitle={project.type}
        description={project.description}
        badge={
          <Badge variant={statusVariant(project.status)}>
            {project.status === 'Active'
              ? t('กำลังเปิดรับคะแนน', 'Active — Open for Scoring')
              : t('โหมดร่าง', 'Draft — Setup Mode')}
          </Badge>
        }
        action={
          <Button
            variant={project.status === 'Active' ? 'secondary' : 'primary'}
            onClick={handleToggleStatus}
            isLoading={isUpdatingStatus}
            disabled={isUpdatingStatus || (project.status !== 'Active' && !canActivate)}
            aria-describedby={project.status !== 'Active' && !canActivate ? 'activation-reasons' : undefined}
          >
            {project.status === 'Active'
              ? t('ปิดรับคะแนนชั่วคราว', 'Pause Scoring (Set Draft)', { compact: true })
              : t('เปิดรับคะแนนทันที', 'Activate & Open Scoring', { compact: true })}
          </Button>
        }
      />

      {/* ตัวช่วยนำทางตั้งค่าโครงการ (Project Setup Guide / Stepper) */}
      <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40">
        <details open={!scoringHasOpened && completedStepsCount < setupSteps.length} className="group/setup">
        <summary className="flex cursor-pointer list-none flex-col justify-between gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-blue-500 sm:flex-row sm:items-center [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'ตั้งค่าโครงการ',
                  'Competition setup'
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3"><Badge variant={completedStepsCount === 5 ? 'success' : 'info'}>
            {t(
              `สำเร็จแล้ว ${completedStepsCount}/5 ขั้นตอน`,
              `${completedStepsCount}/5 Completed`
            )}
          </Badge><ChevronDown aria-hidden="true" className="h-4 w-4 text-blue-600 transition-transform group-open/setup:rotate-180 motion-reduce:transition-none" /></div>
        </summary>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {setupSteps.map((item) => {
            const locked = item.blocked || (item.step === 5 && !canActivate);
            const content = (
              <div
                className={`flex h-full flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  item.done
                    ? 'border-emerald-200/90 bg-emerald-50/50'
                    : locked ? 'border-slate-200 bg-slate-50 text-slate-400' : nextStep?.step === item.step ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Step {item.step}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    ) : locked ? <LockKeyhole className="h-4.5 w-4.5 text-slate-400" aria-hidden="true" /> : (
                      <Circle className="h-4.5 w-4.5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs font-bold leading-snug text-slate-900">
                    {item.title}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      item.done ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {locked ? item.step === 5 ? !deadlineValid ? t('กรุณาแก้กำหนดเวลา', 'Update the deadline') : t('ตั้งค่าขั้น 1–4 ให้ครบก่อน', 'Complete steps 1–4 first') : t('ต้องมีทีมและกรรมการก่อน', 'Add teams and judges first') : item.statusText}
                  </span>
                  {item.path && (
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </div>
            );

            if (item.blocked) return <div key={item.step} aria-disabled="true">{content}</div>;
            return item.path ? (
              <Link key={item.step} to={item.path} className="block h-full">
                {content}
              </Link>
            ) : (
              <button
                key={item.step}
                type="button"
                onClick={handleToggleStatus}
                disabled={project.status === 'Active' || !canActivate || isUpdatingStatus}
                aria-describedby={!canActivate ? 'activation-reasons' : undefined}
                className="block h-full text-left disabled:cursor-default"
              >
                {content}
              </button>
            );
          })}
        </div>
        {project.status !== 'Active' && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          {canActivate ? <div><div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{t('ตั้งค่าครบแล้ว พร้อมเปิดรับคะแนน', 'Setup complete. Ready to open scoring.')}</div><p className="mt-2 text-xs leading-6 text-slate-500">{project.criteriaLocked ? t('ข้อมูลโครงการและการตั้งค่าถูกล็อกแล้ว แม้อยู่ในช่วงพักรับคะแนน', 'Project details and setup remain locked while scoring is paused.') : t('เมื่อเปิดรับคะแนน ข้อมูลโครงการ ทีม กลุ่ม เกณฑ์ กรรมการ และการมอบหมายจะถูกล็อก รวมถึงช่วงพักรับคะแนน', 'Opening scoring locks project details, teams, groups, criteria, judges and assignments, including while paused.')}</p></div> : <>
            <p id="activation-reasons" className="text-sm font-semibold text-slate-800">{t('ยังเปิดรับคะแนนไม่ได้ กรุณาตั้งค่าให้ครบ', 'Complete the following before opening scoring')}</p>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-slate-600">{missing.map(item => <li key={item.path}>{item.text}</li>)}</ul>
            {setup.ready && !deadlineValid && <Button size="sm" className="mt-3" onClick={() => document.getElementById('project-evaluation-deadline')?.focus()}>{t('แก้ไขกำหนดเวลา', 'Update deadline')}</Button>}
            {nextStep?.path && <Link to={nextStep.path} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">{t('ทำขั้นตอนถัดไป', 'Continue setup')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
          </>}
        </div>}
        </details>
      </Card>

      {/* การตั้งค่ากำหนดเวลาส่งคะแนน (Deadline Card) */}
      <Card>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-start">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">
                {t('กำหนดเวลาปิดรับคะแนน', 'Evaluation Deadline')}
              </h2>
              <p id="deadline-status-description" className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {project.evaluationDeadline
                  ? isBeforeEvaluationDeadline(project)
                    ? t(
                        `กรรมการแก้ไขและส่งคะแนนได้ถึง ${new Date(project.evaluationDeadline).toLocaleString('th-TH')}`,
                        `Judges can submit until ${new Date(project.evaluationDeadline).toLocaleString('en-US')}`
                      )
                    : t('หมดเขตรับคะแนนแล้ว (ปิดการแก้ไข)', 'Deadline has passed (Read-only)')
                  : t(
                      'ไม่ได้กำหนดวันหมดเขต — กรรมการสามารถส่งและแก้ไขคะแนนได้ตลอดขณะที่โครงการเป็น Active',
                      'No deadline set — Judges can evaluate anytime while the project is Active'
                    )}
              </p>
            </div>
          </div>
          <form aria-label={t('ตั้งค่ากำหนดเวลา', 'Deadline settings')} aria-busy={isSavingDeadline} className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5" onSubmit={event => {
            event.preventDefault();
            requestDeadlineChange(new FormData(event.currentTarget).get('deadline'));
          }}>
            <div className="min-w-0">
              <label htmlFor="project-evaluation-deadline" className="mb-2 block text-sm font-semibold text-slate-700">{t('วันและเวลาปิดรับคะแนน', 'Scoring closes on')}</label>
              <input
                id="project-evaluation-deadline"
                name="deadline"
                type="datetime-local"
                key={`${project.id}:${project.evaluationDeadline || ''}`}
                defaultValue={project.evaluationDeadline ? project.evaluationDeadline.slice(0, 16) : ''}
                disabled={isSavingDeadline}
                aria-describedby="deadline-status-description"
                className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:flex sm:justify-end">
              {project.evaluationDeadline && (
                <Button
                  type="button"
                  disabled={isSavingDeadline}
                  variant="secondary"
                  className="min-h-11 w-full sm:w-auto sm:min-w-24"
                  onClick={() => requestDeadlineChange('')}
                >
                  {t('ล้างค่า', 'Clear', { compact: true })}
                </Button>
              )}
              <Button type="submit" className={`min-h-11 w-full sm:w-auto sm:min-w-36 ${!project.evaluationDeadline ? 'col-span-2' : ''}`} isLoading={isSavingDeadline} disabled={isSavingDeadline}>{t('บันทึกเวลา', 'Save')}</Button>
            </div>
          </form>
        </div>
        <DeadlineHistory projectId={id} revision={deadlineRevision} />
      </Card>

      {/* เมนูการจัดการทั้ง 6 ส่วน */}
      <ProjectStructureLock project={project} />
      <section aria-labelledby="project-shortcuts-title" className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" aria-hidden="true" /><h2 id="project-shortcuts-title" className="text-sm font-bold text-slate-900">{t('เมนูลัดโครงการ', 'Project quick links')}</h2></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickMenus.map((menu) => {
          const Icon = menu.icon;
          const emphasized = scoringHasOpened && [BarChart3, Trophy].includes(menu.icon);
          if (menu.icon === UserCheck && !setup.canAssign) return <div key={menu.path} aria-disabled="true"><Card className="h-full border-slate-200 bg-slate-50"><LockKeyhole className="mb-4 h-5 w-5 text-slate-400" aria-hidden="true" /><h3 className="text-base font-bold text-slate-500">{menu.title}</h3><p className="mt-2 text-xs text-slate-500">{t('เพิ่มทีมและกรรมการก่อนมอบหมาย', 'Add teams and judges before assigning')}</p></Card></div>;
          return (
            <Link key={menu.path} to={menu.path} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <Card className={`flex h-full flex-col justify-between bg-white transition-all duration-150 motion-reduce:transition-none group-hover:border-blue-400 group-hover:shadow-md ${emphasized ? 'border-blue-300 shadow-sm' : 'border-slate-200'}`}>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <Icon className="h-5.5 w-5.5" aria-hidden="true" />
                    </span>
                    <Badge variant="default">{menu.stat}</Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600">
                    {menu.title}
                  </h3>
                  </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
                  <span>{t('เข้าสู่เมนูนี้', 'Open Module', { compact: true })}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      </section>
      <ConfirmDialog isOpen={Boolean(pendingDeadline)} isLoading={isSavingDeadline} isDanger={false}
        title={t('ยืนยันเปลี่ยนกำหนดปิดรับคะแนน', 'Confirm deadline change')}
        message={t(`เปลี่ยนจาก ${pendingDeadline?.previous ? new Date(pendingDeadline.previous).toLocaleString('th-TH') : 'ไม่กำหนดเวลา'} เป็น ${pendingDeadline?.value ? new Date(pendingDeadline.value).toLocaleString('th-TH') : 'ไม่กำหนดเวลา'} การเปลี่ยนนี้มีผลต่อเวลาที่กรรมการแก้ไขและส่งคะแนนได้ และจะบันทึกประวัติผู้เปลี่ยน`, `Change from ${pendingDeadline?.previous ? new Date(pendingDeadline.previous).toLocaleString('en-GB') : 'No deadline'} to ${pendingDeadline?.value ? new Date(pendingDeadline.value).toLocaleString('en-GB') : 'No deadline'}. This affects when judges may edit and submit scores. The change and actor will be recorded.`)}
        onConfirm={() => handleDeadlineChange(pendingDeadline.value)} onCancel={() => setPendingDeadline(null)} confirmText={t('ยืนยันเปลี่ยนเวลา', 'Confirm change')} />
    </div>
  );
}
