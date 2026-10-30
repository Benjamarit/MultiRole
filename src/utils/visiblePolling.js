// Schedule from completion so slow requests never overlap with the next tick.
export function startVisiblePolling(task, {
  interval,
  visibility = document,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let active = true;
  let pending = null;
  let timer;
  let failures = 0;
  const visible = () => visibility.visibilityState !== 'hidden';
  const clear = () => { cancel(timer); timer = undefined; };
  const plan = () => {
    clear();
    if (active && visible()) timer = schedule(run, Math.min(interval * 2 ** failures, 120000));
  };
  function run() {
    if (!active || !visible()) return Promise.resolve(false);
    if (pending) return pending;
    clear();
    pending = Promise.resolve().then(() => active ? task(() => active) : undefined).then(() => {
      failures = 0;
      return true;
    }, () => {
      failures = Math.min(failures + 1, 4);
      return false;
    }).finally(() => { pending = null; plan(); });
    return pending;
  }
  const onVisibility = () => { clear(); if (visible()) void run(); };
  visibility.addEventListener('visibilitychange', onVisibility);
  void run();
  return {
    refresh: run,
    stop() { active = false; clear(); visibility.removeEventListener('visibilitychange', onVisibility); },
  };
}
