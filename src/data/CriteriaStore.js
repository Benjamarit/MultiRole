const CRITERIA_KEY = 'ce_project_criteria';

const defaultCriteria = [
  { id: 1, name: 'Innovation (นวัตกรรม)', description: '', type: 'STAR', weight: 30, maxScore: 5 },
  { id: 2, name: 'Technical Score', description: '', type: 'NUMERIC', weight: 50, maxScore: 100 },
  { id: 3, name: 'Presentation', description: '', type: 'STAR', weight: 20, maxScore: 5 },
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
