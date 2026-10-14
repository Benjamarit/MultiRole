import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  Scale,
  ClipboardList,
  BarChart3,
  Trophy,
  CheckCircle2,
  Circle,
  CalendarClock,
  ArrowRight,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { getCriteriaByProject, getTotalCriteriaWeight } from '../data/CriteriaStore';
import { getTeamsByProject } from '../data/TeamStore';
import { getGroupsByProject } from '../data/GroupStore';
import { getEvaluationsByProject } from '../data/EvaluationStore';
import {
  getJudgeAssignments,
  getJudgeIdsAssignedToTeam,
  getProjectById,
  isBeforeEvaluationDeadline,
  updateProjectDetails,
  updateProjectStatus,
} from '../data/ProjectStore';

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
  const { t, tDesc } = useLanguage();
  const [project, setProject] = useState(() => getProjectById(id));

  const criteria = getCriteriaByProject(id);
  const totalCriteriaWeight = getTotalCriteriaWeight(id);
  const hasCompleteWeights = criteria.length > 0 && totalCriteriaWeight === 100;

  const teams = getTeamsByProject(id);
  const groups = getGroupsByProject(id);
  const judges = getJudgeAssignments(id);
  const evaluations = getEvaluationsByProject(id).filter((e) => e.status === 'SUBMITTED');

  const assignedTeamsCount = teams.filter(
    (team) => getJudgeIdsAssignedToTeam(id, team.id).length > 0
  ).length;
  const allTeamsAssigned = teams.length > 0 && assignedTeamsCount === teams.length;

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

  const projectMenus = [
    {
      title: t('จัดการทีมและกลุ่ม', 'Teams & Groups'),
      path: `/project/${id}/teams`,
      icon: Users,
      stat: `${teams.length} ${t('ทีม', 'Teams', { compact: true })} · ${groups.length} ${t('กลุ่ม', 'Groups', { compact: true })}`,
      desc: tDesc(
        'เพิ่มทีม นำเข้าจากไฟล์ Excel และจัดกลุ่มการแข่งขัน',
        'Add teams, import via Excel, and organize into groups'
      ),
    },
    {
      title: t('จัดการกรรมการ', 'Manage Judges'),
      path: `/project/${id}/judges`,
      icon: Scale,
      stat: `${judges.length} ${t('คน', 'Judges', { compact: true })}`,
      desc: tDesc(
        'เชิญผู้ใช้งานในระบบเข้าร่วมเป็นคณะกรรมการตัดสิน',
        'Invite registered users to join the judging panel'
      ),
    },
    {
      title: t('มอบหมายทีมให้กรรมการ', 'Judge-Team Assignments'),
      path: `/project/${id}/assignments`,
      icon: UserCheck,
      stat: `${assignedTeamsCount}/${teams.length} ${t('ทีม', 'Teams Assigned', { compact: true })}`,
      desc: tDesc(
        'กำหนดสิทธิ์ว่ากรรมการแต่ละท่านต้องตรวจทีมใดบ้าง',
        'Assign specific teams to each judge for evaluation'
      ),
    },
    {
      title: t('เกณฑ์การประเมิน', 'Scoring Criteria'),
      path: `/project/${id}/criteria`,
      icon: ClipboardList,
      stat: `${criteria.length} ${t('เกณฑ์', 'Criteria', { compact: true })} (${totalCriteriaWeight}%)`,
      desc: tDesc(
        'ตั้งค่าหัวข้อ รูปแบบคะแนน และค่าน้ำหนักรวมให้ครบ 100%',
        'Configure dynamic scoring types and weights totaling 100%'
      ),
    },
    {
      title: t('ติดตามผลการประเมิน', 'Evaluation Monitoring'),
      path: `/project/${id}/evaluations`,
      icon: BarChart3,
      stat: `${evaluations.length} ${t('ผลประเมินที่ส่งแล้ว', 'Submitted', { compact: true })}`,
      desc: tDesc(
        'ดูความคืบหน้ารายบุคคล ส่งแจ้งเตือน และดูคะแนนย่อย',
        'Monitor judge progress, send reminders, and inspect scores'
      ),
    },
    {
      title: t('สรุปผลจัดอันดับ', 'Leaderboard & Export'),
      path: `/project/${id}/leaderboard`,
      icon: Trophy,
      stat: t('Podium & CSV', 'Podium & CSV', { compact: true }),
      desc: tDesc(
        'ดูแท่นรางวัล Top 3 ตารางอันดับคะแนนเฉลี่ย และดาวน์โหลดไฟล์ CSV',
        'View Top 3 podium, full rankings, and download CSV results'
      ),
    },
  ];

  const handleToggleStatus = () => {
    const nextStatus = project.status === 'Active' ? 'Draft' : 'Active';
    if (!updateProjectStatus(id, nextStatus)) {
      toast.error(
        t(
          'ต้องกำหนดเกณฑ์ประเมินและ Weight รวมให้ครบ 100% ก่อนเปิดรับคะแนน',
          'Criteria weights must total 100% before activating the competition'
        )
      );
      return;
    }
    setProject((prev) => ({ ...prev, status: nextStatus }));
    toast.success(
      nextStatus === 'Active'
        ? t('เปิดรับคะแนนเรียบร้อยแล้ว!', 'Competition is now Active!')
        : t('เปลี่ยนเป็นโหมดร่าง (ปิดรับคะแนนชั่วคราว)', 'Switched to Draft status')
    );
  };

  const handleDeadlineChange = (event) => {
    const updatedProject = updateProjectDetails(id, {
      evaluationDeadline: event.target.value || null,
    });
    setProject(updatedProject);
    toast.success(t('อัปเดตกำหนดส่งคะแนนแล้ว', 'Evaluation deadline updated'));
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
        {t('กลับไปหน้า Workspace', 'Back to Workspace', { compact: true })}
      </BackButton>

      <PageHeader
        title={project.name}
        subtitle={project.type || 'Competition Project'}
        description={
          project.description ||
          tDesc(
            'ตั้งค่าองค์ประกอบของการแข่งขันและติดตามความคืบหน้าการให้คะแนนทั้งหมดได้จากหน้านี้',
            'Configure competition settings and monitor evaluation progress from this central dashboard.'
          )
        }
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
          >
            {project.status === 'Active'
              ? t('ปิดรับคะแนนชั่วคราว', 'Pause Scoring (Set Draft)', { compact: true })
              : t('เปิดรับคะแนนทันที', 'Activate & Open Scoring', { compact: true })}
          </Button>
        }
      />

      {/* ตัวช่วยนำทางตั้งค่าโครงการ (Project Setup Guide / Stepper) */}
      <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t(
                  'ตัวช่วยนำทางตั้งค่าโครงการ',
                  'Competition Setup Guide'
                )}
              </h2>
              <p className="text-xs text-slate-600">
                {t(
                  'ทำตามขั้นตอนด้านล่างให้ครบถ้วนเพื่อให้กรรมการสามารถเริ่มประเมินคะแนนได้อย่างถูกต้อง',
                  'Complete these 5 steps to prepare your competition for seamless judge evaluation.'
                )}
              </p>
            </div>
          </div>
          <Badge variant={completedStepsCount === 5 ? 'success' : 'info'}>
            {t(
              `สำเร็จแล้ว ${completedStepsCount}/5 ขั้นตอน`,
              `${completedStepsCount}/5 Completed`
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {setupSteps.map((item) => {
            const content = (
              <div
                className={`flex h-full flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  item.done
                    ? 'border-emerald-200/90 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Step {item.step}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    ) : (
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
                    {item.statusText}
                  </span>
                  {item.path && (
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </div>
            );

            return item.path ? (
              <Link key={item.step} to={item.path} className="block h-full">
                {content}
              </Link>
            ) : (
              <button
                key={item.step}
                type="button"
                onClick={handleToggleStatus}
                className="block h-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>
      </Card>

      {/* การตั้งค่ากำหนดเวลาส่งคะแนน (Deadline Card) */}
      <Card className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <label
              htmlFor="project-evaluation-deadline"
              className="block text-sm font-bold text-slate-900"
            >
              {t('กำหนดเวลาปิดรับคะแนน', 'Evaluation Deadline')}
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
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
        <div className="flex items-center gap-2">
          <input
            id="project-evaluation-deadline"
            type="datetime-local"
            value={
              project.evaluationDeadline ? project.evaluationDeadline.slice(0, 16) : ''
            }
            onChange={handleDeadlineChange}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-precision-blue focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-auto"
          />
          {project.evaluationDeadline && (
            <Button
              variant="textGray"
              size="sm"
              onClick={() => handleDeadlineChange({ target: { value: '' } })}
            >
              {t('ล้างค่า', 'Clear', { compact: true })}
            </Button>
          )}
        </div>
      </Card>

      {/* เมนูการจัดการทั้ง 6 ส่วน */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectMenus.map((menu) => {
          const Icon = menu.icon;
          return (
            <Link key={menu.path} to={menu.path} className="group block h-full">
              <Card className="flex h-full flex-col justify-between transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-blue-400 group-hover:shadow-md">
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
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{menu.desc}</p>
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
    </div>
  );
}