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
        { id: 'wichai@example.com', email: 'wichai@example.com', coiTeamIds: [1] },
        { id: 'suda@example.com', email: 'suda@example.com', coiTeamIds: [] },
      ],
      evaluationDeadline: null,
    },
  ];
  writeAll(seed);
  return seed;
}

function readAll() {
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    return stored ? JSON.parse(stored).map(normalizeProject) : seedProjects();
  } catch {
    return seedProjects();
  }
}

function normalizeProject(project) {
  return {
    ...project,
    evaluationDeadline: project.evaluationDeadline || null,
  };
}

function writeAll(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getAllProjects() {
  return readAll();
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
        : [...assignments, { id: judgeEmail, email: judgeEmail, coiTeamIds: [] }],
    };
  });
  writeAll(updated);
}

export function getJudgeAssignments(projectId) {
  return getProjectById(projectId)?.judgeAssignments || [];
}

export function updateJudgeCoi(projectId, judgeId, coiTeamIds) {
  const projects = readAll();
  const updated = projects.map((project) =>
    project.id === Number(projectId)
      ? {
          ...project,
          judgeAssignments: (project.judgeAssignments || []).map((assignment) =>
            assignment.id === judgeId ? { ...assignment, coiTeamIds } : assignment
          ),
        }
      : project
  );
  writeAll(updated);
}

export function removeJudgeAssignment(projectId, judgeId, judgeEmail) {
  const projects = readAll();
  const updated = projects.map((project) =>
    project.id === Number(projectId)
      ? {
          ...project,
          judgeEmails: (project.judgeEmails || []).filter((email) => email !== judgeEmail),
          judgeAssignments: (project.judgeAssignments || []).filter((assignment) => assignment.id !== judgeId),
        }
      : project
  );
  writeAll(updated);
}

// TODO: ตอนต่อ API จริง เปลี่ยนเป็น PATCH /projects/:id { status } แทน
export function updateProjectStatus(projectId, status) {
  const projects = readAll();
  const updated = projects.map((project) =>
    project.id === Number(projectId) ? { ...project, status } : project
  );
  writeAll(updated);
}

export function getProjectById(projectId) {
  return readAll().find((p) => p.id === Number(projectId));
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