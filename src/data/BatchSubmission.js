import { calculateWeightedScore, isValidCriterionScore } from './Scoring.js';

// Classification always uses all assigned teams and all criteria, independent of matrix filters.
export function getBatchSubmissionCandidates({ teams, criteria, statuses, scores, criteriaComments = {}, comments = {}, displayedTeamIds = [] }) {
  const visible = new Set(displayedTeamIds);
  const ready = [];
  const incomplete = [];
  const submitted = [];
  for (const team of teams) {
    if (statuses[team.id] === 'SUBMITTED') {
      submitted.push(team);
      continue;
    }
    const values = scores[team.id] || {};
    const missing = criteria.filter(c => values[c.id] === null || values[c.id] === undefined);
    const invalid = criteria.filter(c => values[c.id] !== null && values[c.id] !== undefined && !isValidCriterionScore(c, values[c.id]));
    if (!criteria.length || missing.length || invalid.length) {
      incomplete.push({ ...team, missing, invalid });
      continue;
    }
    ready.push({ teamId: team.id, name: team.name, hidden: !visible.has(team.id),
      totalScore: calculateWeightedScore(criteria, values), scores: { ...values },
      criteriaComments: { ...(criteriaComments[team.id] || {}) }, comment: comments[team.id] || '',
      savedDraft: statuses[team.id] === 'DRAFT' });
  }
  return { ready, incomplete, submitted };
}
