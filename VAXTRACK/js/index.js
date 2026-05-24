import { apiFetch } from './api.js';
import { showLoading, hideLoading, showToast } from './utils.js';
import { setupI18n, getTranslation } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  setupI18n();

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', () => {
      showToast(getTranslation('auth.forgot_password_notice'), 'warning');
    });
  }

  // Social buttons are no longer part of the parent login flow.
  document.querySelectorAll('[data-auth-provider]').forEach(button => {
    button.addEventListener('click', () => {
      showToast('Social login is disabled. Please use email and password.', 'warning');
    });
  });
});

window.toggleView = function(viewId) {
  document.getElementById('parentLoginView').classList.add('hidden');
  document.getElementById('registerView').classList.add('hidden');
  document.getElementById('adminLoginView').classList.add('hidden');
  document.getElementById(viewId).classList.remove('hidden');
};

document.getElementById('parentLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = (formData.get('email') || '').trim();
  const password = formData.get('password') || '';

  try {
    showLoading(getTranslation('auth.loading_authenticating'));
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem('vax_token', data.token);
    localStorage.setItem('vax_role', data.role);
    localStorage.setItem('vax_email', data.email);
    localStorage.setItem('vax_name', data.name);
    localStorage.setItem('vax_id', data.id);
    setTimeout(() => { window.location.href = 'user/dashboard.html'; }, 900);
  } catch (err) {
    showToast(err.message || getTranslation('auth.error_invalid_credentials'), 'error');
  } finally {
    hideLoading();
  }
});

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = (formData.get('email') || '').trim();
  const password = formData.get('password') || '';

  try {
    showLoading(getTranslation('auth.loading_verifying'));
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.role !== 'admin') {
      showToast('Access denied. Admins only.', 'error');
      return;
    }

    localStorage.setItem('vax_token', data.token);
    localStorage.setItem('vax_role', data.role);
    localStorage.setItem('vax_email', data.email);
    localStorage.setItem('vax_name', data.name);
    localStorage.setItem('vax_id', data.id);
    window.location.href = 'admin/dashboard.html';
  } catch (err) {
    showToast(err.message || getTranslation('auth.error_invalid_credentials'), 'error');
  } finally {
    hideLoading();
  }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const firstName = (formData.get('firstName') || '').trim();
  const lastName = (formData.get('lastName') || '').trim();
  const email = (formData.get('email') || '').trim();
  const pass = document.getElementById('regPass').value;
  const conf = document.getElementById('regConfirm').value;

  if (!firstName || !lastName) return showToast(getTranslation('auth.error_names_required'), 'error');
  if (pass !== conf) return showToast(getTranslation('auth.error_password_mismatch'), 'error');

  try {
    showLoading(getTranslation('auth.loading_registering'));
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password: pass,
        confirmPassword: pass
      })
    });

    showToast(getTranslation('auth.registration_success'));
    e.target.reset();
    toggleView('parentLoginView');
  } catch (err) {
    showToast(err.message || getTranslation('auth.error_email_exists'), 'error');
  } finally {
    hideLoading();
  }
});
