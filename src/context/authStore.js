const REGISTERED_USERS_KEY = 'ce_registered_users';

export function getRegisteredUsers() {
  try {
    const stored = localStorage.getItem(REGISTERED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function updateRegisteredUser(email, changes) {
  const users = getRegisteredUsers();
  const updatedUsers = users.map((user) =>
    user.email === email ? { ...user, ...changes } : user
  );
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
  return updatedUsers.find((user) => user.email === email);
}

export function deleteRegisteredUser(email) {
  const users = getRegisteredUsers().filter((user) => user.email !== email);
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}
