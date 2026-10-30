export function resolveJudgeIdentity(evaluation, members = [], users = []) {
  const member = members.find((u) => String(u.userId || u.id) === String(evaluation.judgeId));
  const user = users.find((u) => String(u.userId || u.id) === String(evaluation.judgeId));
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const name = [evaluation.judgeName, member?.fullName, member?.name, user?.fullName, user?.name]
    .find((value) => typeof value === 'string' && value.trim() && !uuid.test(value.trim())) || '';
  const email = [evaluation.judgeEmail, member?.email, user?.email]
    .find((value) => typeof value === 'string' && value.includes('@')) || '';
  return { name, email };
}
