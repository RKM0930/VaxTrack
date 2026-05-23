import { apiFetch } from './api.js';
import { saveToken, saveParentUser, saveSocialParentUser, validateParentCredentials, getUserDisplayName, parentEmailExists } from './auth.js';
import { showLoading, hideLoading, showToast } from './utils.js';
import { setupI18n, getTranslation } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  setupI18n(); // Apply default Taglish copy

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', () => {
      showToast(getTranslation('auth.forgot_password_notice'), 'warning');
    });
  }

  document.querySelectorAll('[data-auth-provider]').forEach(button => {
    button.addEventListener('click', () => handleSocialAuth(button.dataset.authProvider));
  });
});

window.toggleView = function(viewId) {
  document.getElementById('parentLoginView').classList.add('hidden');
  document.getElementById('registerView').classList.add('hidden');
  document.getElementById('adminLoginView').classList.add('hidden');
  document.getElementById(viewId).classList.remove('hidden');
};

async function handleSocialAuth(provider = 'google') {
  const normalizedProvider = provider === 'facebook' ? 'facebook' : 'google';
  const socialProfile = normalizedProvider === 'facebook'
    ? { firstName: 'Facebook', lastName: 'Parent', email: 'facebook.parent@example.com' }
    : { firstName: 'Google', lastName: 'Parent', email: 'google.parent@example.com' };

  try {
    showLoading(getTranslation(normalizedProvider === 'facebook' ? 'auth.loading_facebook' : 'auth.loading_google'));
    await apiFetch(`/auth/${normalizedProvider}`, {
      method: 'POST',
      body: JSON.stringify({ provider: normalizedProvider, email: socialProfile.email })
    });

    const savedUser = saveSocialParentUser(normalizedProvider, socialProfile);
    if (!savedUser.success) {
      showToast(getTranslation(savedUser.messageKey), 'error');
      return;
    }

    const parentUser = savedUser.user;
    saveToken(`mock-${normalizedProvider}-token-${parentUser.id}`, 'user', getUserDisplayName(parentUser), {
      firstName: parentUser.firstName,
      lastName: parentUser.lastName,
      email: parentUser.email
    });

    window.location.href = 'user/dashboard.html';
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
}

document.getElementById('parentLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = (formData.get('email') || '').trim();
  const password = formData.get('password') || '';

  try {
    showLoading(getTranslation('auth.loading_authenticating'));

    // Try real backend first
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!data._fallback) {
        localStorage.setItem('vax_token', data.token);
        localStorage.setItem('vax_role', data.role);
        localStorage.setItem('vax_email', data.email);
        localStorage.setItem('vax_name', data.name);
        localStorage.setItem('vax_id', data.id);
        window.location.href = 'user/dashboard.html';
        return;
      }
    } catch (apiErr) {
      console.warn('[API] Login fallback to local:', apiErr.message);
    }

    // Fallback to local auth
    const parentUser = validateParentCredentials(email, password);
    if (!parentUser) {
      showToast(getTranslation('auth.error_invalid_credentials'), 'error');
      return;
    }
    saveToken(`mock-user-token-${parentUser.id}`, 'user', getUserDisplayName(parentUser), {
      firstName: parentUser.firstName,
      lastName: parentUser.lastName,
      email: parentUser.email
    });
    window.location.href = 'user/dashboard.html';

  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = (formData.get('email') || '').trim();
  const password = formData.get('password') || '';

  try {
    showLoading(getTranslation('auth.loading_verifying'));

    // Try real backend first
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!data._fallback) {
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
        return;
      }
    } catch (apiErr) {
      console.warn('[API] Admin login fallback to local:', apiErr.message);
    }

    // Fallback to mock admin
    saveToken('mock-admin-token', 'admin', getTranslation('role.health_worker'));
    window.location.href = 'admin/dashboard.html';

  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const firstName = (formData.get('firstName') || '').trim();
  const lastName = (formData.get('lastName') || '').trim();
  const email = (formData.get('email') || '').trim();
  const pass = document.getElementById('regPass').value;
  const conf = document.getElementById('regConfirm').value;

  if (!firstName || !lastName) return showToast(getTranslation('auth.error_names_required'), 'error');
  if (pass !== conf) return showToast(getTranslation('auth.error_password_mismatch'), 'error');
  
  const registrationData = {
    firstName,
    lastName,
    email,
    password: pass
  };

  if (parentEmailExists(email)) {
    showToast(getTranslation('auth.error_email_exists'), 'error');
    return;
  }

  try {
    showLoading(getTranslation('auth.loading_registering'));

    // Try real backend first
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...registrationData,
          confirmPassword: pass
        })
      });
      if (!data._fallback) {
        localStorage.setItem('vax_token', data.token);
        localStorage.setItem('vax_role', data.role);
        localStorage.setItem('vax_email', data.email);
        localStorage.setItem('vax_name', data.name);
        localStorage.setItem('vax_id', data.id);
        showToast(getTranslation('auth.registration_success'));
        e.target.reset();
        toggleView('parentLoginView');
        return;
      }
    } catch (apiErr) {
      console.warn('[API] Register fallback to local:', apiErr.message);
    }

    // Fallback to local register
    const savedUser = saveParentUser(registrationData);
    if (!savedUser.success) {
      showToast(getTranslation(savedUser.messageKey), 'error');
      return;
    }

    showToast(getTranslation('auth.registration_success'));
    e.target.reset();
    toggleView('parentLoginView');

  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
});
