import { getTeamsByProject } from './TeamStore';
import { hasCompleteCriteriaWeights } from './CriteriaStore';
import {
  getJudgeIdsForTeam,
  getTeamIdsForJudge,
  importLegacyJudgeTeamAssignments,
  pruneInvalidJudgeTeamAssignments,
  removeProjectAssignments,
  removeJudgeTeamAssignments,
  replaceJudgeTeamAssignments,
} from './JudgeTeamAssignmentStore';

const PROJECTS_KEY = 'ce_projects';

// demo — ผูกกับอีเมลของ user ที่เคยใช้ทดสอบมาก่อน
function seedProjects() {
  const seed = [
    {
      id: 1,
      name: 'การประกวดนวัตกรรม AI 2026',
      type: 'Technology',
      description: '',
      ownerEmail: 'somchai@example.com',
      ownerName: 'ดร.สมชาย ใจดี',
      status: 'Active',
      teamsCount: 10,
      judgeEmails: ['wichai@example.com', 'suda@example.com'],
      judgeAssignments: [
        { id: 'wichai@example.com', email: 'wichai@example.com' },
        { id: 'suda@example.com', email: 'suda@example.com' },
      ],
      evaluationDeadline: null,
    },
  ];
  writeAll(seed);
  return seed;
}

function readAll() {
  const stored = localStorage.getItem(PROJECTS_KEY);
  if (!stored) return seedProjects();

  let projects;
  try {
    projects = JSON.parse(stored);
  } catch {
    throw new Error('ข้อมูลโครงการในเบราว์เซอร์อ่านไม่ได้ กรุณาสำรองข้อมูลก่อนแก้ไข');
  }
  if (!Array.isArray(projects)) {
    throw new Error('รูปแบบข้อมูลโครงการในเบราว์เซอร์ไม่ถูกต้อง');
  }
  const normalizedProjects = projects.map(normalizeProject);
  const legacyAssignments = projects.flatMap((project) =>
    (project.judgeAssignments || []).flatMap((assignment) =>
      (assignment.assignedTeamIds || []).map((teamId) => ({
        projectId: project.id,
        judgeId: assignment.id,
        teamId,
      }))
    )
  );
  const hasLegacyData = projects.some((project) =>
    (project.judgeAssignments || []).some((assignment) =>
      Object.keys(assignment).some((key) => key !== 'id' && key !== 'email')
    )
  );
  if (hasLegacyData) {
    importLegacyJudgeTeamAssignments(legacyAssignments);
    writeAll(normalizedProjects);
  }
  const validJudgeIdsByProject = new Map(
    normalizedProjects.map((project) => [
      Number(project.id),
      new Set((project.judgeAssignments || []).map((assignment) => String(assignment.id))),
    ])
  );
  const validTeamIdsByProject = new Map(
    normalizedProjects.map((project) => [
      Number(project.id),
      new Set(getTeamsByProject(project.id).map((team) => Number(team.id))),
    ])
  );
  pruneInvalidJudgeTeamAssignments((assignment) =>
    validJudgeIdsByProject.get(assignment.projectId)?.has(assignment.judgeId) &&
    validTeamIdsByProject.get(assignment.projectId)?.has(assignment.teamId)
  );
  return normalizedProjects;
}

function normalizeProject(project) {
  const judgeAssignments = (project.judgeAssignments || []).map(({ id, email }) => ({ id, email }));
  return {
    ...project,
    judgeAssignments,
    evaluationDeadline: project.evaluationDeadline || null,
  };
}

function writeAll(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getAllProjects() {
  return readAll();
}

function hasProjectName(projects, name) {
  const normalizedName = name.trim().toLowerCase();
  return projects.some(
    (project) => project.name.trim().toLowerCase() === normalizedName
  );
}

export function isProjectNameTaken(name) {
  return hasProjectName(getAllProjects(), name);
}

export function deleteProject(projectId) {
  const numericProjectId = Number(projectId);
  const projects = readAll();
  const updatedProjects = projects.filter((project) => Number(project.id) !== numericProjectId);
  if (updatedProjects.length === projects.length) return false;
  removeProjectAssignments(numericProjectId);
  writeAll(updatedProjects);
  return true;
}

// โครงการที่ user คนนี้เป็นเจ้าของ (สร้างเอง = เป็น Project Admin ของโครงการนั้น)
export function getMyProjects(email) {
  return readAll().filter((p) => p.ownerEmail === email);
}

// โครงการที่ user คนนี้ถูกเชิญเข้าไปเป็นกรรมการ
export function getJudgingProjects(email) {
  return readAll().filter((p) => (p.judgeEmails || []).includes(email));
}

// TODO: ตอนต่อ API จริง เปลี่ยนเป็น POST /projects แล้วใช้ response แทนการ generate id เอง
export function addProject({ name, type, description, ownerEmail, ownerName, evaluationDeadline }) {
  const projects = readAll();
  if (hasProjectName(projects, name)) return null;

  const nextId = projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
  const newProject = {
    id: nextId,
    name,
    type,
    description,
    ownerEmail,
    ownerName,
    status: 'Draft',
    teamsCount: 0,
    judgeEmails: [],
    judgeAssignments: [],
    evaluationDeadline: evaluationDeadline || null,
  };
  writeAll([newProject, ...projects]);
  return newProject;
}

// เชิญผู้ใช้งาน (ด้วยอีเมล) เข้าเป็นกรรมการของโครงการ
// TODO: ตอนต่อ API จริง เปลี่ยนเป็น POST /projects/:id/judges แทน
export function inviteJudgeToProject(projectId, judgeEmail) {
  const projects = readAll();
  const updated = projects.map((p) => {
    if (p.id !== Number(projectId)) return p;
    const judgeEmails = p.judgeEmails || [];
    const assignments = p.judgeAssignments || [];
    return {
      ...p,
      judgeEmails: judgeEmails.includes(judgeEmail) ? judgeEmails : [...judgeEmails, judgeEmail],
      judgeAssignments: assignments.some((assignment) => (assignment.email || assignment.id) === judgeEmail)
        ? assignments
        : [...assignments, { id: judgeEmail, email: judgeEmail }],
    };
  });
  writeAll(updated);
}

export function getJudgeAssignments(projectId) {
  return getProjectById(projectId)?.judgeAssignments || [];
}

export function getAssignedTeamIds(projectId, judgeId) {
  const assignment = getJudgeAssignments(projectId).find(
    (item) => String(item.id) === String(judgeId) || String(item.email) === String(judgeId)
  );
  return assignment ? getTeamIdsForJudge(projectId, assignment.id) : [];
}

export function getJudgeIdsAssignedToTeam(projectId, teamId) {
  const assignmentIds = getJudgeIdsForTeam(projectId, teamId);
  return getJudgeAssignments(projectId)
    .filter((assignment) => assignmentIds.includes(String(assignment.id)));
}

export function isJudgeAssignedToTeam(projectId, judgeId, teamId) {
  const judgeAssignment = getJudgeAssignments(projectId).find(
    (assignment) =>
      String(assignment.id) === String(judgeId) ||
      String(assignment.email) === String(judgeId)
  );
  const teamExists = getTeamsByProject(projectId).some(
    (team) => Number(team.id) === Number(teamId)
  );
  return Boolean(
    teamExists &&
    judgeAssignment &&
    getTeamIdsForJudge(projectId, judgeAssignment.id).includes(Number(teamId))
  );
}

export function setJudgeAssignedTeams(projectId, judgeId, teamIds) {
  const projects = readAll();
  const project = projects.find((item) => Number(item.id) === Number(projectId));
  if (!project) throw new Error('ไม่พบโครงการที่ต้องการกำหนดทีม');
  const assignment = (project.judgeAssignments || []).find(
    (item) => String(item.id) === String(judgeId) || String(item.email) === String(judgeId)
  );
  if (!assignment) throw new Error('กรรมการไม่ได้อยู่ในโครงการนี้');

  const requestedIds = [...new Set(teamIds.map(Number))];
  const teams = getTeamsByProject(projectId);
  if (requestedIds.some((teamId) => !teams.some((team) => Number(team.id) === teamId))) {
    throw new Error('พบทีมที่ไม่ได้อยู่ในโครงการนี้');
  }

  replaceJudgeTeamAssignments(projectId, assignment.id, requestedIds);
}

export function removeJudgeAssignment(projectId, judgeId, judgeEmail) {
  const projects = readAll();
  const numericProjectId = Number(projectId);
  const project = projects.find((item) => Number(item.id) === numericProjectId);
  if (!project) return false;

  const requestedIds = new Set([judgeId, judgeEmail].filter(Boolean).map(String));
  const removedAssignments = (project.judgeAssignments || []).filter(
    (assignment) =>
      requestedIds.has(String(assignment.id)) ||
      requestedIds.has(String(assignment.email))
  );
  if (!removedAssignments.length) return false;

  const removedIds = new Set(
    removedAssignments.flatMap((assignment) => [assignment.id, assignment.email])
      .filter(Boolean)
      .map(String)
  );
  const updated = projects.map((item) =>
    Number(item.id) === numericProjectId
      ? {
          ...item,
          judgeEmails: (item.judgeEmails || []).filter(
            (email) => !removedIds.has(String(email))
          ),
          judgeAssignments: (item.judgeAssignments || []).filter(
            (assignment) =>
              !removedIds.has(String(assignment.id)) &&
              !removedIds.has(String(assignment.email))
          ),
        }
      : item
  );
  for (const removedId of removedIds) {
    removeJudgeTeamAssignments(numericProjectId, removedId);
  }
  writeAll(updated);
  return true;
}

// TODO: ตอนต่อ API จริง เปลี่ยนเป็น PATCH /projects/:id { status } แทน
export function updateProjectStatus(projectId, status) {
  const projects = readAll();
  const project = projects.find((item) => item.id === Number(projectId));
  if (!project || (status === 'Active' && !hasCompleteCriteriaWeights(projectId))) {
    return false;
  }
  const updated = projects.map((project) =>
    project.id === Number(projectId) ? { ...project, status } : project
  );
  writeAll(updated);
  return true;
}

export function getProjectById(projectId) {
  return readAll().find((p) => p.id === Number(projectId));
}

export function isProjectAdmin(projectId, email) {
  const project = getProjectById(projectId);
  return Boolean(email && project?.ownerEmail === email);
}

export function isProjectReadyForEvaluation(projectId) {
  return getProjectById(projectId)?.status === 'Active' &&
    hasCompleteCriteriaWeights(projectId);
}

export function updateProjectDetails(projectId, details) {
  const projects = readAll();
  const updated = projects.map((project) =>
    project.id === Number(projectId)
      ? normalizeProject({ ...project, ...details })
      : project
  );
  writeAll(updated);
  return updated.find((project) => project.id === Number(projectId));
}

export function isBeforeEvaluationDeadline(project) {
  if (!project?.evaluationDeadline) return true;
  const deadline = new Date(project.evaluationDeadline).getTime();
  return Number.isNaN(deadline) || Date.now() < deadline;
}