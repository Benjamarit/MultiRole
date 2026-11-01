export const isProjectStructureLocked = project => Boolean(project?.criteriaLocked)
  || ['Active', 'Closed', 'ACTIVE', 'CLOSED'].includes(project?.status);
