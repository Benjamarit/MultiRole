// Copy each team separately so a save snapshot never shares mutable form references.
export function evaluationSnapshot(teamId, scores = {}, criteriaComments = {}, comment = '') {
  return { teamId, scores: { ...scores }, criteriaComments: { ...criteriaComments }, comment };
}

export function scorePayload(scores = {}, comments = {}) {
  return [...new Set([...Object.keys(scores), ...Object.keys(comments)])]
    .filter(id => scores[id] !== null && scores[id] !== undefined || String(comments[id] || '').trim())
    .map(criterionId => ({ criterionId, scoreValue: scores[criterionId] ?? null, comment: comments[criterionId] || '' }));
}

// Include all assigned teams, across filters/groups, but never publish or overwrite submitted work.
export function getDraftSnapshots({ teams, statuses, scores, criteriaComments = {}, comments = {} }) {
  return teams.filter(team => statuses[team.id] !== 'SUBMITTED')
    .map(team => evaluationSnapshot(team.id, scores[team.id], criteriaComments[team.id], comments[team.id] || ''))
    .filter(entry => scorePayload(entry.scores, entry.criteriaComments).length || entry.comment.trim());
}

// Missing/null scores and blank criterion notes represent the same persisted value.
export function evaluationFingerprint(entry = {}) {
  const scores = scorePayload(entry.scores, entry.criteriaComments)
    .map(score => ({ ...score, comment: score.comment.trim() }))
    .sort((a, b) => a.criterionId.localeCompare(b.criterionId));
  return JSON.stringify({ scores, comment: entry.comment || '' });
}

export function getUnsavedTeamIds({ teams, savedSnapshots, scores, criteriaComments, comments }) {
  return teams.filter(team => evaluationFingerprint(savedSnapshots[team.id]) !==
    evaluationFingerprint(evaluationSnapshot(team.id, scores[team.id], criteriaComments[team.id], comments[team.id])))
    .map(team => team.id);
}
