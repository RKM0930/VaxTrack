export function saveToken(token, role, name) {
  localStorage.setItem('vax_token', token);
  localStorage.setItem('vax_role', role);
  localStorage.setItem('vax_name', name);
}

export function getToken() { return localStorage.getItem('vax_token'); }

export function clearToken() {
  localStorage.clear();
  window.location.href = '../index.html';
}

export function requireAuth() {
  if (!getToken() || localStorage.getItem('vax_role') !== 'user') clearToken();
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