import { requireAdminAuth, setupNav } from '../auth.js';
import { showLoading, hideLoading } from '../utils.js';

// Protect route
requireAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  
  // Placeholder for future schedule rendering logic
  setTimeout(() => {
    document.getElementById('scheduleArea').innerHTML = `<p class="text-muted text-center">Schedule management module initialized.</p>`;
    hideLoading();
  }, 300);
});
