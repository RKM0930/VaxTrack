import { apiFetch } from './api.js';
import { saveToken } from './auth.js';
import { showLoading, hideLoading, showToast } from './utils.js';
import { setupI18n } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  setupI18n(); // Initialize Localization
});

window.toggleView = function(viewId) {
  document.getElementById('parentLoginView').classList.add('hidden');
  document.getElementById('registerView').classList.add('hidden');
  document.getElementById('adminLoginView').classList.add('hidden');
  document.getElementById(viewId).classList.remove('hidden');
};

document.getElementById('parentLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    showLoading("Authenticating...");
    await apiFetch('/login/parent', { method: 'POST' });
    saveToken('mock-user-token', 'user', 'Maria Parent');
    window.location.href = 'user/dashboard.html';
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    showLoading("Verifying Credentials...");
    await apiFetch('/login/admin', { method: 'POST' });
    saveToken('mock-admin-token', 'admin', 'Health Worker');
    window.location.href = 'admin/dashboard.html';
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = document.getElementById('regPass').value;
  const conf = document.getElementById('regConfirm').value;
  if (pass !== conf) return showToast('Passwords do not match.', 'error');
  
  try {
    showLoading("Registering...");
    await apiFetch('/register', { method: 'POST' });
    showToast('Registration successful! Please log in.');
    e.target.reset();
    toggleView('parentLoginView');
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});