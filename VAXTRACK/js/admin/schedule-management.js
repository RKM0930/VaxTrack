import { requireAdminAuth, setupNav } from '../auth.js';
import { dohSchedule, getAllBabies } from '../api.js';
import { showLoading, hideLoading, showToast, statusClass, sortByDateAsc } from '../utils.js';
import { setupI18n } from '../i18n.js';

requireAdminAuth();

let scheduleEvents = [];

function getScheduleMonthDay(dateValue) {
  if (!dateValue) return { month: 'TBD', day: '--' };
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { month: 'TBD', day: '--' };
  return {
    month: date.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

function buildBarangayEvents() {
  const upcoming = sortByDateAsc(getAllBabies().flatMap(baby => (baby.upcoming || [])
    .filter(item => String(item.status || '').toLowerCase() !== 'completed')
    .map(item => ({ ...item, babyName: baby.name, regNo: baby.registrationNumber }))), 'targetDate');

  if (!upcoming.length) return [];

  const grouped = new Map();
  upcoming.forEach(item => {
    const key = `${item.targetDate || 'TBD'}|${item.vaccine || 'Vaccination'}`;
    const current = grouped.get(key) || {
      title: `${item.vaccine || 'Vaccination'} Follow-up`,
      date: item.targetDate,
      time: '08:00 AM - 05:00 PM',
      location: item.source || 'Barangay Health Center',
      status: item.status || 'Upcoming',
      babies: [],
    };
    current.babies.push(`${item.babyName}${item.regNo ? ` (${item.regNo})` : ''}`);
    if (String(item.status || '').toLowerCase() === 'overdue') current.status = 'Overdue';
    grouped.set(key, current);
  });

  return Array.from(grouped.values());
}

function buildScheduleItem(event, options = {}) {
  const { modal = false } = options;
  const date = getScheduleMonthDay(event.date);
  const linkedText = `${event.babies.length} baby record${event.babies.length === 1 ? '' : 's'} linked`;
  const babyList = modal && event.babies.length
    ? `<div class="admin-schedule-linked-babies">${event.babies.slice(0, 6).map(name => `<span>${name}</span>`).join('')}${event.babies.length > 6 ? `<span>+${event.babies.length - 6} more</span>` : ''}</div>`
    : `<small class="admin-muted">${linkedText}</small>`;

  return `
    <div class="schedule-item admin-event-item${modal ? ' admin-modal-event-item' : ''}">
      <div class="admin-event-main">
        <div class="admin-date-tile"><span>${date.month}</span><strong>${date.day}</strong></div>
        <div>
          <h3>${event.title}</h3>
          <p><i class="fas fa-clock"></i> ${event.time} <span class="admin-separator-dot">•</span> <i class="fas fa-map-marker-alt"></i> ${event.location}</p>
          ${babyList}
        </div>
      </div>
      <div class="admin-event-actions">
        <span class="badge ${statusClass(event.status)}">${event.status}</span>
        <button type="button" class="btn btn-outline btn-sm schedule-edit-btn"><i class="fas fa-edit"></i> Edit</button>
      </div>
    </div>
  `;
}

function closeFullScheduleModal() {
  document.getElementById('fullScheduleModal')?.remove();
}

function openFullScheduleModal() {
  const modal = document.createElement('div');
  modal.id = 'fullScheduleModal';
  modal.className = 'modal-backdrop admin-full-schedule-backdrop';
  modal.innerHTML = `
    <div class="modal-card admin-full-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="fullScheduleTitle">
      <div class="modal-header admin-full-schedule-header">
        <div>
          <p class="page-kicker">Schedule Management</p>
          <h2 id="fullScheduleTitle">Full Schedule List</h2>
          <p>${scheduleEvents.length} barangay schedule${scheduleEvents.length === 1 ? '' : 's'} and follow-up item${scheduleEvents.length === 1 ? '' : 's'}.</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close full schedule list"><i class="fas fa-times"></i></button>
      </div>
      <div class="admin-full-schedule-list">
        ${scheduleEvents.length ? scheduleEvents.map(event => buildScheduleItem(event, { modal: true })).join('') : `<div class="empty-state">No upcoming barangay schedules found.</div>`}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close')?.addEventListener('click', closeFullScheduleModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeFullScheduleModal();
  });
  modal.querySelectorAll('.schedule-edit-btn').forEach(button => {
    button.addEventListener('click', () => showToast('Schedule editing workflow is ready for backend integration.', 'warning'));
  });
}

function renderSchedules() {
  const area = document.getElementById('scheduleArea');
  scheduleEvents = buildBarangayEvents();

  area.innerHTML = `
    <div class="admin-schedule-layout">
      <div class="card admin-schedule-card">
        <div class="admin-schedule-toolbar">
          <button type="button" id="addScheduleBtn" class="btn btn-primary btn-sm"><i class="fas fa-calendar-plus"></i> Add Schedule</button>
          <button type="button" id="viewAllSchedulesBtn" class="admin-icon-action admin-schedule-view-all" aria-label="View full schedule list" title="View full schedule list">
            <i class="fas fa-arrow-up-right-from-square"></i>
          </button>
        </div>
        <div class="schedule-list admin-event-list admin-event-list-scroll">
          ${scheduleEvents.length ? scheduleEvents.map(event => buildScheduleItem(event)).join('') : `<div class="empty-state">No upcoming barangay schedules found.</div>`}
        </div>
      </div>
      <div class="card admin-doh-guide-card">
        <h3 class="card-title">DOH Vaccine Guide</h3>
        <div class="table-responsive admin-table-shell">
          <table class="admin-data-table compact-table">
            <thead><tr><th>Vaccine</th><th>Target Age</th><th>Dose</th><th>Status</th></tr></thead>
            <tbody>
              ${dohSchedule.map(item => `<tr><td><strong>${item.vaccine}</strong></td><td>${item.targetAge}</td><td>${item.dose}</td><td><span class="badge approved">Active</span></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('addScheduleBtn')?.addEventListener('click', () => {
    showToast('Schedule creation workflow is ready for backend integration.', 'warning');
  });
  document.getElementById('viewAllSchedulesBtn')?.addEventListener('click', openFullScheduleModal);
  area.querySelectorAll('.schedule-edit-btn').forEach(button => {
    button.addEventListener('click', () => showToast('Schedule editing workflow is ready for backend integration.', 'warning'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupI18n();
  showLoading();
  setTimeout(() => { renderSchedules(); hideLoading(); }, 300);
});
