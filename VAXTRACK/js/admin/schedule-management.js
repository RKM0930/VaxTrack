import { requireAdminAuth, setupNav } from '../auth.js';
import { dohSchedule, apiFetch, getAllBabies } from '../api.js';
import { showLoading, hideLoading, formatDate, statusClass, sortByDateAsc } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

let allSchedules = [];

function renderSchedules() {
  const area = document.getElementById('scheduleArea');
  const upcoming = sortByDateAsc(allSchedules.map(item => ({
    ...item,
    targetDate: item.targetDate || item.target_date,
    babyName: item.babyName || `${item.first_name} ${item.last_name}`.trim(),
    regNo: item.regNo || item.registration_number,
  })), 'targetDate');

  area.innerHTML = `
    <div class="admin-two-column">
      <div class="card">
        <h2 class="card-title">${getTranslation('admin.schedule_management')}</h2>
        <div class="table-responsive">
          <table>
            <thead><tr><th>${getTranslation('table.vaccine')}</th><th>${getTranslation('table.target_age')}</th><th>${getTranslation('table.dose')}</th><th>${getTranslation('table.status')}</th></tr></thead>
            <tbody>
              ${dohSchedule.map(item => `<tr><td>${item.vaccine}</td><td>${item.targetAge}</td><td>${item.dose}</td><td><span class="badge approved">Active</span></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">${getTranslation('profile.upcoming')}</h3>
        <div class="schedule-list">
          ${upcoming.length ? upcoming.map(item => `
            <div class="schedule-item">
              <div><strong>${item.babyName}</strong><br><small>${item.vaccine} • ${formatDate(item.targetDate)}</small></div>
              <span class="badge ${statusClass(item.status)}">${item.status}</span>
            </div>
          `).join('') : `<div class="empty-state">${getTranslation('profile.no_upcoming')}</div>`}
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();

  try {
    const data = await apiFetch('/schedules');
    if (data && Array.isArray(data)) {
      allSchedules = data;
    } else {
      throw new Error('Fallback');
    }
  } catch (err) {
    console.warn('[API] Falling back to mock schedules:', err.message);
    allSchedules = getAllBabies().flatMap(baby =>
      (baby.upcoming || []).map(item => ({
        ...item,
        babyName: baby.name,
        registration_number: baby.registrationNumber,
      }))
    );
  }

  renderSchedules();
  hideLoading();
});
