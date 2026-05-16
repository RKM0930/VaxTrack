import { requireAdminAuth, setupNav } from '../auth.js';
import { showLoading, hideLoading } from '../utils.js';

// Protect route
requireAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  
  // Placeholder for future vaccine logging logic
  setTimeout(() => {
    document.getElementById('vaccineEntryArea').innerHTML = `<p class="text-muted text-center">Vaccine entry module initialized.</p>`;
    hideLoading();
  }, 300);
});
