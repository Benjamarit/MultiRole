// Rank only teams with published results. Compare the same precision shown/exported in the UI.
// Competition ranking: two first places are followed by third place (1, 1, 3).
export function rankEvaluatedTeams(teams) {
  const sorted = teams.filter(team => team.evaluatedCount > 0)
    .map(team => ({ ...team, averageScore: Number(Number(team.averageScore).toFixed(2)) }))
    .sort((a, b) => b.averageScore - a.averageScore);
  let rank = 0;
  return sorted.map((team, index) => {
    if (index === 0 || team.averageScore !== sorted[index - 1].averageScore) rank = index + 1;
    return { ...team, rank };
  });
}
