import { useCallback, useEffect, useRef, useState } from 'react';
import { startVisiblePolling } from '../utils/visiblePolling';

export function useVisiblePolling(task, interval, scope, enabled = true) {
  const taskRef = useRef(task);
  const polling = useRef(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { taskRef.current = task; }, [task]);
  useEffect(() => {
    if (!enabled) return;
    const controller = startVisiblePolling(async isActive => {
      if (!isActive()) return;
      setLoading(true);
      try {
        await taskRef.current(isActive);
        if (isActive()) { setUpdatedAt(new Date()); setError(null); }
      } catch (failure) {
        if (isActive()) setError(failure);
        throw failure;
      } finally { if (isActive()) setLoading(false); }
    }, { interval });
    polling.current = controller;
    return () => { controller.stop(); polling.current = null; };
  }, [interval, scope, enabled]);
  const refresh = useCallback(() => polling.current?.refresh() ?? Promise.resolve(false), []);
  return { loading, updatedAt, error, refresh };
}
