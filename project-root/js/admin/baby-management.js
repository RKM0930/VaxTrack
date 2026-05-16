import { requireAdminAuth, setupNav } from '../auth.js';
import { showLoading, hideLoading } from '../utils.js';

// Protect route
requireAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  
  // Placeholder for future directory rendering logic
  setTimeout(() => {
    document.getElementById('directoryList').innerHTML = `<p class="text-muted text-center">Directory module initialized.</p>`;
    hideLoading();
  }, 300);
});
