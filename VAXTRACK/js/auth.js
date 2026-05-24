const PARENT_USERS_KEY = 'vax_parent_users';
const SESSION_KEYS = ['vax_token', 'vax_role', 'vax_name', 'vax_first_name', 'vax_last_name', 'vax_email'];

const defaultParentUsers = [
  {
    id: 'parent-demo-001',
    firstName: 'Maria',
    lastName: 'Parent',
    email: 'parent@example.com',
    password: 'parent123'
  }
];

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function getStoredParentUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(PARENT_USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  } catch (err) {
    console.warn('Unable to read saved parent users.', err);
    return [];
  }
}

function setStoredParentUsers(users) {
  localStorage.setItem(PARENT_USERS_KEY, JSON.stringify(users));
}

export function getParentUsers() {
  const storedUsers = getStoredParentUsers();
  const mergedUsers = [...defaultParentUsers];

  storedUsers.forEach(user => {
    const email = normalizeEmail(user.email);
    if (!email) return;
    if (!mergedUsers.some(existing => normalizeEmail(existing.email) === email)) {
      mergedUsers.push({ ...user, email });
    }
  });

  return mergedUsers;
}


export function getParentUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return getParentUsers().find(user => normalizeEmail(user.email) === normalizedEmail) || null;
}

export function parentEmailExists(email) {
  return Boolean(getParentUserByEmail(email));
}

export function saveSocialParentUser(provider, user) {
  const email = normalizeEmail(user.email);
  if (!email) return { success: false, messageKey: 'auth.error_email_required' };

  const existingUser = getParentUserByEmail(email);
  if (existingUser) return { success: true, user: existingUser };

  const normalizedProvider = provider === 'facebook' ? 'facebook' : 'google';
  const defaultFirstName = normalizedProvider === 'facebook' ? 'Facebook' : 'Google';

  const storedUsers = getStoredParentUsers();
  const newUser = {
    id: `${normalizedProvider}-parent-${Date.now()}`,
    firstName: (user.firstName || defaultFirstName).trim(),
    lastName: (user.lastName || 'Parent').trim(),
    email,
    authProvider: normalizedProvider
  };

  storedUsers.push(newUser);
  setStoredParentUsers(storedUsers);
  return { success: true, user: newUser };
}

export function saveParentUser(user) {
  const email = normalizeEmail(user.email);
  if (!email) return { success: false, messageKey: 'auth.error_email_required' };

  const existingUser = getParentUsers().find(parent => normalizeEmail(parent.email) === email);
  if (existingUser) return { success: false, messageKey: 'auth.error_email_exists' };

  const storedUsers = getStoredParentUsers();
  const newUser = {
    id: `parent-${Date.now()}`,
    firstName: user.firstName.trim(),
    lastName: user.lastName.trim(),
    email,
    password: user.password
  };

  storedUsers.push(newUser);
  setStoredParentUsers(storedUsers);
  return { success: true, user: newUser };
}

export function validateParentCredentials(email, password) {
  const normalizedEmail = normalizeEmail(email);
  return getParentUsers().find(user => normalizeEmail(user.email) === normalizedEmail && user.password === password) || null;
}

export function getUserDisplayName(user) {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
}

export function saveToken(token, role, name, profile = {}) {
  localStorage.setItem('vax_token', token);
  localStorage.setItem('vax_role', role);
  localStorage.setItem('vax_name', name);

  if (profile.firstName) localStorage.setItem('vax_first_name', profile.firstName);
  if (profile.lastName) localStorage.setItem('vax_last_name', profile.lastName);
  if (profile.email) localStorage.setItem('vax_email', normalizeEmail(profile.email));
}

export function getToken() { return localStorage.getItem('vax_token'); }

export function clearToken() {
  SESSION_KEYS.forEach(key => localStorage.removeItem(key));
  window.location.href = '../index.html';
}

export function requireAuth() {
  const role = localStorage.getItem('vax_role');
  if (!getToken() || (role !== 'user' && role !== 'parent')) clearToken();
}

export function requireAdminAuth() {
  if (!getToken() || localStorage.getItem('vax_role') !== 'admin') clearToken();
}

export function setupNav() {
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = localStorage.getItem('vax_name') || 'User';
  
  const initialEl = document.getElementById('userInitial');
  if (initialEl) initialEl.textContent = (localStorage.getItem('vax_name') || 'U').charAt(0);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); clearToken(); });
}
