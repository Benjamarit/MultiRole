const CRITERIA_KEY = 'ce_project_criteria';

const defaultCriteria = [
  {
    id: 1,
    name: '1. ความคิดริเริ่มสร้างสรรค์ (Innovation)',
    description:
      '★ 5 ดาว: แนวคิดแปลกใหม่ โดดเด่นอย่างมาก มีเอกลักษณ์เฉพาะตัว และต่อยอดนวัตกรรมได้อย่างชัดเจน\n★ 4 ดาว: แนวคิดน่าสนใจ มีการประยุกต์มุมมองใหม่ผสมผสานกับแนวคิดเดิมได้ดี\n★ 3 ดาว: แนวคิดในระดับมาตรฐาน พบเห็นได้ทั่วไป มีการปรับเปลี่ยนรายละเอียดเล็กน้อย\n★ 2 ดาว: แนวคิดซ้ำเดิม ขาดความแตกต่างที่ชัดเจน\n★ 1 ดาว: ไม่ตรงโจทย์หรือขาดแนวคิดหลักในการแก้ปัญหา',
    type: 'STAR',
    weight: 30,
    maxScore: 5,
  },
  {
    id: 2,
    name: '2. ความสมบูรณ์ทางเทคนิค (Technical Implementation)',
    description:
      '★ 80-100 คะแนน: ระบบทำงานได้สมบูรณ์ครบทุกฟีเจอร์ โค้ดมีโครงสร้างดีเยี่ยมและรองรับการใช้งานจริง\n★ 60-79 คะแนน: ฟีเจอร์หลักทำงานได้ครบถ้วน อาจมีจุดบกพร่องเล็กน้อยในฟีเจอร์รอง\n★ 40-59 คะแนน: มีต้นแบบที่ใช้งานได้บางส่วน แต่ยังขาดความเสถียรในฟังก์ชันหลัก\n★ 0-39 คะแนน: ยังไม่สามารถรันระบบได้จริง หรือเป็นเพียงภาพร่างแนวคิด',
    type: 'NUMERIC',
    weight: 50,
    maxScore: 100,
  },
  {
    id: 3,
    name: '3. การนำเสนอและการตอบคำถาม (Presentation)',
    description:
      '★ 5 ดาว: นำเสนอชัดเจนกระชับ ตอบคำถามตรงประเด็น และบริหารเวลาได้ดีเยี่ยม\n★ 4 ดาว: นำเสนอเข้าใจง่าย สื่อสารจุดเด่นของผลงานได้ดี\n★ 3 ดาว: นำเสนอครบตามหัวข้อพื้นฐาน\n★ 1-2 ดาว: ขาดความชัดเจนในการสื่อสาร หรือเกินเวลาที่กำหนดมาก',
    type: 'STAR',
    weight: 20,
    maxScore: 5,
  },
];

const normalizeCriterion = (criterion) => ({
  ...criterion,
  description: criterion.description || '',
});

function readAll() {
  try {
    const stored = localStorage.getItem(CRITERIA_KEY);
    return stored ? JSON.parse(stored) : [{ projectId: 1, criteria: defaultCriteria }];
  } catch {
    return [{ projectId: 1, criteria: defaultCriteria }];
  }
}

function writeAll(projectCriteria) {
  localStorage.setItem(CRITERIA_KEY, JSON.stringify(projectCriteria));
}

export function getCriteriaByProject(projectId) {
  const entry = readAll().find((item) => item.projectId === Number(projectId));
  return (entry?.criteria || []).map(normalizeCriterion);
}

export function getTotalCriteriaWeight(projectId) {
  return getCriteriaByProject(projectId).reduce(
    (total, criterion) => total + Number(criterion.weight || 0),
    0
  );
}

export function hasCompleteCriteriaWeights(projectId) {
  const criteria = getCriteriaByProject(projectId);
  const totalWeight = criteria.reduce(
    (total, criterion) => total + Number(criterion.weight || 0),
    0
  );
  return criteria.length > 0 && totalWeight === 100;
}

export function saveCriterion(projectId, criterion) {
  const numericProjectId = Number(projectId);
  const allProjectCriteria = readAll();
  const projectEntry = allProjectCriteria.find((entry) => entry.projectId === numericProjectId);
  const criteria = projectEntry?.criteria || [];
  const existingCriterion = criteria.find((item) => item.id === criterion.id);
  const updatedCriterion = existingCriterion
    ? normalizeCriterion({ ...existingCriterion, ...criterion })
    : normalizeCriterion({ ...criterion, id: criterion.id || Date.now() });
  const updatedCriteria = existingCriterion
    ? criteria.map((item) => (item.id === criterion.id ? updatedCriterion : item))
    : [...criteria, updatedCriterion];
  const updatedEntries = allProjectCriteria.filter((entry) => entry.projectId !== numericProjectId);
  writeAll([{ projectId: numericProjectId, criteria: updatedCriteria }, ...updatedEntries]);
  return updatedCriterion;
}

export function deleteCriterion(projectId, criterionId) {
  const numericProjectId = Number(projectId);
  const updatedEntries = readAll().map((entry) =>
    entry.projectId === numericProjectId
      ? { ...entry, criteria: entry.criteria.filter((criterion) => criterion.id !== criterionId) }
      : entry
  );
  writeAll(updatedEntries);
}

export function deleteProjectCriteria(projectId) {
  const numericProjectId = Number(projectId);
  writeAll(readAll().filter((entry) => Number(entry.projectId) !== numericProjectId));
}
