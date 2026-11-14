export const isLocalCriterion = criterion => String(criterion.id).startsWith('local-');

export function criteriaBatchEntry(criterion) {
  return { criterionId: isLocalCriterion(criterion) ? null : criterion.id,
    title: criterion.name, description: criterion.description || '', scoringType: criterion.type,
    maxScore: Number(criterion.maxScore), weightPercentage: Number(criterion.weight),
    displayOrder: criterion.displayOrder ?? null };
}

export const criteriaFingerprint = criteria => JSON.stringify(criteria.map(criteriaBatchEntry));

export function criteriaBatchRequest(criteria, baseline) {
  return { criteria: criteria.map(criteriaBatchEntry), expectedCriteria: baseline.map(criteriaBatchEntry) };
}
