let users = [];
export const getRegisteredUsers = () => users;
export function setRegisteredUsersCache(value) { users = Array.isArray(value) ? value : []; }
export function updateRegisteredUser(email, changes) {
  users = users.map((user) => user.email === email ? { ...user, ...changes } : user);
}
export function deleteRegisteredUser(email) { users = users.filter((user) => user.email !== email); }
