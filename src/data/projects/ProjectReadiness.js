export function getProjectSetupReadiness(criteria, teams, judges, assignments) {
  // Persisted weights have two decimal places; compare integers to avoid floating point drift.
  const weightCents = criteria.reduce((sum, criterion) => sum + Math.round(Number(criterion.weight) * 100), 0);
  const criteriaReady = criteria.length > 0 && weightCents === 10000;
  const hasTeams = teams.length > 0;
  const hasJudges = judges.length > 0;
  const judgeIds = new Set(judges.map(judge => String(judge.id)));
  const assigned = new Set(assignments.filter(a => judgeIds.has(String(a.judgeId))).map(a => String(a.teamId)));
  const assignedTeamsCount = teams.filter(team => assigned.has(String(team.id))).length;
  const allTeamsAssigned = hasTeams && assignedTeamsCount === teams.length;
  return {
    totalWeight: weightCents / 100, criteriaReady, hasTeams, hasJudges,
    canAssign: hasTeams && hasJudges, assignedTeamsCount,
    unassignedTeamsCount: teams.length - assignedTeamsCount, allTeamsAssigned,
    ready: criteriaReady && hasTeams && hasJudges && allTeamsAssigned,
  };
}

export function isActivationDeadlineValid(deadline, now) {
  if (!deadline) return true;
  const time = new Date(deadline).getTime();
  return Number.isFinite(time) && time > now;
}
