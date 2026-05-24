import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, getDashboardStats } from '../api.js';
import { showLoading, hideLoading, formatDate, statusClass, sortByDateAsc } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

const alertState = {
  medical: [],
  documents: [],
  medicalFilter: 'All',
  documentFilter: 'All',
  activeView: 'medical',
};

function normalizeBaby(baby = {}) {
  return {
    ...baby,
    name: baby.name || [baby.first_name, baby.middle_name, baby.last_name].filter(Boolean).join(' ').trim(),
    registrationNumber: baby.registrationNumber || baby.registration_number,
    guardianName: baby.guardianName || baby.guardian_name,
    guardianPhone: baby.guardianPhone || baby.guardian_phone,
    registrationStatus: baby.registrationStatus || baby.registration_status,
    upcoming: (baby.upcoming || []).map(item => ({
      ...item,
      targetDate: item.targetDate || item.target_date,
    })),
    documents: (baby.documents || []).map(doc => ({
      ...doc,
      uploadDate: doc.uploadDate || doc.upload_date,
    })),
  };
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isPastDate(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function isDueSoon(dateValue, days = 7) {
  const date = parseDate(dateValue);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + days);
  return date >= today && date <= horizon;
}

function normalizeMedicalStatus(item = {}) {
  const rawStatus = String(item.status || '').trim().toLowerCase();
  const targetDate = item.targetDate || item.target_date;

  if (rawStatus.includes('overdue') || isPastDate(targetDate)) return 'Overdue';
  if (rawStatus.includes('missed') || rawStatus.includes('rejected') || rawStatus.includes('action')) return 'Action Required';
  if (rawStatus.includes('due soon') || isDueSoon(targetDate)) return 'Due Soon';

  // Keep medical wording separate from document workflow wording. Pending medical
  // follow-ups are shown as actionable or due soon, never as a “Pending” badge.
  if (rawStatus.includes('pending')) return isDueSoon(targetDate) ? 'Due Soon' : null;

  return null;
}

function normalizeDocumentStatus(doc = {}) {
  const rawStatus = String(doc.status || '').trim().toLowerCase();
  const rawComment = String(doc.comment || doc.reason || '').trim().toLowerCase();

  if (rawStatus.includes('re-upload') || rawStatus.includes('reupload') || rawStatus.includes('resubmit') || rawComment.includes('re-upload') || rawComment.includes('reupload')) {
    return 'Re-upload Requested';
  }
  if (rawStatus.includes('reject')) return 'Rejected';
  if (rawStatus.includes('pending')) return 'Pending';
  return null;
}

function buildMedicalAlerts(babies = []) {
  const alerts = [];

  babies.map(normalizeBaby).forEach(baby => {
    const babyName = baby.name || 'Unnamed baby';
    const regNo = baby.registrationNumber || '-';

    (baby.upcoming || []).forEach(item => {
      const status = normalizeMedicalStatus(item);
      if (!status) return;

      const targetDate = item.targetDate || item.target_date;
      alerts.push({
        baby: babyName,
        regNo,
        item: item.vaccine || 'Vaccination follow-up',
        date: targetDate,
        status,
        actionUrl: `vaccination-entry.html?baby=${baby.id}`,
        actionLabel: 'Log / Review',
        sortDate: targetDate || '9999-12-31',
      });
    });
  });

  const priority = { Overdue: 0, 'Action Required': 1, 'Due Soon': 2 };
  return alerts.sort((a, b) => {
    const priorityDiff = (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
    if (priorityDiff !== 0) return priorityDiff;
    return sortByDateAsc([a, b], 'sortDate')[0] === a ? -1 : 1;
  });
}

function buildDocumentActionItems(babies = []) {
  const actions = [];

  babies.map(normalizeBaby).forEach(baby => {
    const babyName = baby.name || 'Unnamed baby';
    const regNo = baby.registrationNumber || '-';

    (baby.documents || []).forEach(doc => {
      const status = normalizeDocumentStatus(doc);
      if (!status) return;

      actions.push({
        baby: babyName,
        regNo,
        item: doc.type || doc.filename || 'Uploaded document',
        date: doc.uploadDate || doc.upload_date,
        status,
        actionUrl: 'document-verification.html',
        actionLabel: 'Review Docs',
        sortDate: doc.uploadDate || doc.upload_date || '9999-12-31',
      });
    });
  });

  const priority = { Rejected: 0, 'Re-upload Requested': 1, Pending: 2 };
  return actions.sort((a, b) => {
    const priorityDiff = (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
    if (priorityDiff !== 0) return priorityDiff;
    return sortByDateAsc([a, b], 'sortDate')[0] === a ? -1 : 1;
  });
}

function renderStats(stats = {}) {
  document.getElementById('totalBabies').textContent = stats.totalBabies ?? 0;
  document.getElementById('vaccinesMonth').textContent = stats.vaccinesThisMonth ?? 0;
  document.getElementById('upcomingWeek').textContent = stats.upcomingThisWeek ?? 0;
  document.getElementById('overdueCount').textContent = stats.overdue ?? 0;
  document.getElementById('pendingDocs').textContent = stats.pendingDocs ?? 0;
}

function getFilteredItems(items = [], activeFilter = 'All') {
  if (activeFilter === 'All') return items;
  return items.filter(item => item.status === activeFilter);
}

function updateFilterButtons(selector, activeFilter) {
  document.querySelectorAll(selector).forEach(button => {
    const filter = button.dataset.medicalFilter || button.dataset.documentFilter;
    button.classList.toggle('active', filter === activeFilter);
  });
}


function updateActionToggleCounts() {
  const medicalCount = document.getElementById('medicalToggleCount');
  const documentCount = document.getElementById('documentToggleCount');

  if (medicalCount) medicalCount.textContent = alertState.medical.length;
  if (documentCount) documentCount.textContent = alertState.documents.length;
}

function updateActiveActionView() {
  document.querySelectorAll('[data-action-view]').forEach(button => {
    const view = button.dataset.actionView;
    const isActive = view === alertState.activeView;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('[data-action-panel]').forEach(panel => {
    const isActive = panel.dataset.actionPanel === alertState.activeView;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function renderMedicalAlerts() {
  const tbody = document.getElementById('medicalAlertsList');
  if (!tbody) return;

  const items = getFilteredItems(alertState.medical, alertState.medicalFilter);
  updateActionToggleCounts();
  updateFilterButtons('[data-medical-filter]', alertState.medicalFilter);

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${getTranslation('admin.no_alerts') || 'No medical alerts for this filter.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(alert => `
    <tr>
      <td data-label="Baby Name"><strong>${alert.baby}</strong><br><small class="admin-muted">${alert.regNo}</small></td>
      <td data-label="Medical Item">${alert.item}</td>
      <td data-label="Target Date">${formatDate(alert.date)}</td>
      <td data-label="Status"><span class="status-summary-cell"><span class="badge status-badge ${statusClass(alert.status)}">${alert.status}</span></span></td>
      <td data-label="Action" class="text-right"><a class="btn btn-outline btn-sm" href="${alert.actionUrl}">${alert.actionLabel}</a></td>
    </tr>
  `).join('');
}

function renderDocumentActionItems() {
  const tbody = document.getElementById('documentActionsList');
  if (!tbody) return;

  const items = getFilteredItems(alertState.documents, alertState.documentFilter);
  updateActionToggleCounts();
  updateFilterButtons('[data-document-filter]', alertState.documentFilter);

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No document action items for this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(action => `
    <tr>
      <td data-label="Baby Name"><strong>${action.baby}</strong><br><small class="admin-muted">${action.regNo}</small></td>
      <td data-label="Document">${action.item}</td>
      <td data-label="Date Uploaded">${formatDate(action.date)}</td>
      <td data-label="Status"><span class="status-summary-cell"><span class="badge status-badge ${statusClass(action.status)}">${action.status}</span></span></td>
      <td data-label="Action" class="text-right"><a class="btn btn-outline btn-sm" href="${action.actionUrl}">${action.actionLabel}</a></td>
    </tr>
  `).join('');
}

function setupAlertFilters() {
  document.querySelectorAll('[data-action-view]').forEach(button => {
    button.addEventListener('click', () => {
      alertState.activeView = button.dataset.actionView || 'medical';
      updateActiveActionView();
    });
  });

  document.querySelectorAll('[data-medical-filter]').forEach(button => {
    button.addEventListener('click', () => {
      alertState.medicalFilter = button.dataset.medicalFilter || 'All';
      renderMedicalAlerts();
    });
  });

  document.querySelectorAll('[data-document-filter]').forEach(button => {
    button.addEventListener('click', () => {
      alertState.documentFilter = button.dataset.documentFilter || 'All';
      renderDocumentActionItems();
    });
  });
}

function renderOverviewActions(babies = []) {
  alertState.medical = buildMedicalAlerts(babies);
  alertState.documents = buildDocumentActionItems(babies);
  renderMedicalAlerts();
  renderDocumentActionItems();
  updateActiveActionView();
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  setupAlertFilters();
  showLoading();

  try {
    let stats;
    let babies;

    try {
      [stats, babies] = await Promise.all([
        apiFetch('/dashboard/stats'),
        apiFetch('/babies')
      ]);
      if (!Array.isArray(babies)) throw new Error('Unexpected database response');
    } catch (err) {
      console.warn('[API] Unable to load dashboard data from database:', err.message);
      babies = [];
      stats = getDashboardStats(babies);
    }

    renderStats(stats);
    renderOverviewActions(babies);
  } catch (err) {
    console.error('Dashboard error:', err);
  } finally {
    hideLoading();
  }
});
