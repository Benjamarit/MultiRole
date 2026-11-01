export const compareTeamNames = (a, b) => String(a || '').localeCompare(String(b || ''), 'th', { numeric: true, sensitivity: 'base' });

export function orderTeams(teams) {
  const byName = [...teams].sort((a, b) => compareTeamNames(a.name, b.name) || String(a.id).localeCompare(String(b.id)));
  const fallback = new Map(byName.map((team, index) => [team.id, index + 1]));
  const position = (team) => Number.isInteger(team.displayOrder) && team.displayOrder > 0 ? team.displayOrder : fallback.get(team.id);
  return [...teams].sort((a, b) => position(a) - position(b) || compareTeamNames(a.name, b.name) || String(a.id).localeCompare(String(b.id)));
}

export function filterAndSortTeams(teams, { search = '', groupId = 'all', sortBy = 'order', groupForTeam = new Map() } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return orderTeams(teams).filter((team) => {
    const group = groupForTeam.get(String(team.id));
    return (!query || `${team.name} ${team.description || ''} ${group?.name || ''}`.toLocaleLowerCase().includes(query)) &&
      (groupId === 'all' || (groupId === 'ungrouped' ? !group : group?.id === groupId));
  }).sort((a, b) => {
    if (sortBy === 'name-asc') return compareTeamNames(a.name, b.name);
    if (sortBy === 'name-desc') return compareTeamNames(b.name, a.name);
    if (sortBy === 'group') {
      const ga = groupForTeam.get(String(a.id));
      const gb = groupForTeam.get(String(b.id));
      if (!ga && gb) return 1;
      if (ga && !gb) return -1;
      return compareTeamNames(ga?.name, gb?.name);
    }
    return 0;
  });
}

export function moveTeamInOrder(teams, teamId, direction) {
  const ids = orderTeams(teams).map((team) => team.id);
  const from = ids.indexOf(teamId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
