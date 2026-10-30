import { useEffect, useReducer } from 'react';
import { isBeforeEvaluationDeadline } from '../data/ProjectStore';

export function useDeadline(project) {
  const [tick, refresh] = useReducer((value) => value + 1, 0);
  const deadline = project?.evaluationDeadline;
  useEffect(() => {
    if (!deadline) return;
    const remaining = new Date(deadline).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(refresh, Math.min(remaining + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [deadline, tick]);
  return isBeforeEvaluationDeadline(project);
}
