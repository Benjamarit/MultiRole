export function normalizedScore(criterion, value) {
  if (criterion.type === 'PASS_FAIL') return value === 1 ? 100 : 0;
  return (value / criterion.maxScore) * 100;
}

export function calculateWeightedScore(criteria, scores) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight), 0) || 1;
  const weightedTotal = criteria.reduce(
    (sum, criterion) =>
      sum + normalizedScore(criterion, scores[criterion.id] ?? 0) *
        (Number(criterion.weight) / totalWeight),
    0
  );
  return Number(weightedTotal.toFixed(1));
}

export function isValidCriterionScore(criterion, value) {
  if (value === null || value === undefined) return true;
  if (!Number.isFinite(value)) return false;
  if (criterion.type === 'PASS_FAIL') return value === 0 || value === 1;
  const maxScore = criterion.type === 'PERCENTAGE' ? 100 : Number(criterion.maxScore);
  return value >= 0 && value <= maxScore;
}
