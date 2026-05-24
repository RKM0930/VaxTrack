import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, addVaccinationRecord } from '../api.js';
import { showLoading, hideLoading, showToast, formatDate, statusClass, sortByDateAsc, sortByDateDesc } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

let allBabies = [];

const logFilters = {
  search: '',
  vaccine: 'all',
  dateFrom: '',
  dateTo: '',
  reaction: 'all',
  source: 'all'
};


function normalizeBabyRecord(baby = {}) {
  return {
    ...baby,
    name: baby.name || [baby.first_name, baby.middle_name, baby.last_name].filter(Boolean).join(' ').trim(),
    registrationNumber: baby.registrationNumber || baby.registration_number,
    registrationStatus: baby.registrationStatus || baby.registration_status,
    vaccinations: baby.vaccinations || [],
    upcoming: (baby.upcoming || []).map(item => ({
      ...item,
      targetDate: item.targetDate || item.target_date,
    }))
  };
}

async function loadBabiesFromDatabase() {
  const data = await apiFetch('/babies');
  allBabies = Array.isArray(data) ? data.map(normalizeBabyRecord) : [];
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeDateInput(value = '') {
  if (!value) return '';
  return String(value).split('T')[0];
}

function formatDateTime(value = '') {
  if (!value) return '-';
  const rawValue = String(value);
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const datePart = date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  const hasTime = rawValue.includes('T') || /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(rawValue);
  if (!hasTime) return `${datePart} • No time`;
  const timePart = date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} • ${timePart}`;
}

function getRecentLogs() {
  return sortByDateDesc(allBabies.flatMap(baby => (baby.vaccinations || []).map((record, index) => {
    const source = record.privateClinic ? (record.clinicName || record.source || 'Private Clinic') : (record.source || 'Barangay Health Center');
    return {
      ...record,
      babyId: baby.id,
      babyName: baby.name,
      registrationNumber: baby.registrationNumber,
      logId: record.logId || `LOG-${String(baby.id).replace(/[^a-z0-9]/gi, '').slice(-4) || '0000'}-${String(index + 1).padStart(3, '0')}`,
      administeredBy: record.worker || record.administeredBy || record.source || 'BHW',
      batchNo: record.batch || record.batchNo || 'Not provided',
      reaction: record.reaction || record.remarks || '',
      source,
      isPrivate: Boolean(record.privateClinic),
      normalizedDate: normalizeDateInput(record.date)
    };
  })), 'date');
}

function getVaccineOptions() {
  const names = new Set();
  allBabies.forEach(baby => {
    (baby.vaccinations || []).forEach(item => item.vaccine && names.add(item.vaccine));
    (baby.upcoming || []).forEach(item => item.vaccine && names.add(item.vaccine));
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function getFilteredLogs() {
  const query = logFilters.search.trim().toLowerCase();
  return getRecentLogs().filter(log => {
    const haystack = [log.babyName, log.registrationNumber, log.vaccine, log.batchNo, log.administeredBy]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesVaccine = logFilters.vaccine === 'all' || String(log.vaccine) === logFilters.vaccine;
    const matchesFrom = !logFilters.dateFrom || (log.normalizedDate && log.normalizedDate >= logFilters.dateFrom);
    const matchesTo = !logFilters.dateTo || (log.normalizedDate && log.normalizedDate <= logFilters.dateTo);
    const hasReaction = Boolean(String(log.reaction || '').trim());
    const matchesReaction = logFilters.reaction === 'all' || (logFilters.reaction === 'flagged' ? hasReaction : !hasReaction);
    const matchesSource = logFilters.source === 'all' || (logFilters.source === 'private' ? log.isPrivate : !log.isPrivate);
    return matchesSearch && matchesVaccine && matchesFrom && matchesTo && matchesReaction && matchesSource;
  });
}

function renderLogTableRows() {
  const logs = getFilteredLogs();
  if (!logs.length) {
    return `<tr><td colspan="8" class="text-center text-muted">No vaccination records match the current filters.</td></tr>`;
  }

  return logs.map(log => `
    <tr class="admin-vaccine-log-row">
      <td><span class="admin-mono vaccine-log-id">${escapeHtml(log.logId)}</span></td>
      <td><span class="vaccine-log-date">${escapeHtml(formatDateTime(log.date))}</span></td>
      <td>
        <span class="vaccine-log-baby-name">${escapeHtml(log.babyName)}</span>
        <span class="vaccine-log-reg">${escapeHtml(log.registrationNumber || '-')}</span>
      </td>
      <td><span class="vaccine-log-vaccine">${escapeHtml(log.vaccine)}</span></td>
      <td><span class="vaccine-log-dose">${log.dose ? `Dose ${escapeHtml(log.dose)}` : '-'}</span></td>
      <td><span class="admin-mono vaccine-log-batch">${escapeHtml(log.batchNo)}</span></td>
      <td><span class="vaccine-log-worker">${escapeHtml(log.administeredBy || '-')}</span></td>
      <td>
        ${log.reaction ? `<span class="status-summary-cell reaction-summary" title="${escapeHtml(log.reaction)}"><span class="reaction-flag"><i class="fas fa-exclamation-triangle"></i></span><span>${escapeHtml(log.reaction)}</span></span>` : '<span class="admin-muted">-</span>'}
      </td>
    </tr>
  `).join('');
}

function refreshLogTable() {
  const logList = document.getElementById('vaccineLogList');
  if (logList) logList.innerHTML = renderLogTableRows();
}

function renderRecordFilters() {
  const vaccineOptions = getVaccineOptions();
  return `
    <div class="admin-vaccine-record-toolbar">
      <div class="input-group admin-log-search">
        <i class="fas fa-search"></i>
        <input id="vaccineLogSearch" type="search" placeholder="Search baby name or registration number..." value="${escapeHtml(logFilters.search)}">
      </div>
      <select id="vaccineTypeFilter" aria-label="Filter by vaccine type">
        <option value="all">All vaccine types</option>
        ${vaccineOptions.map(name => `<option value="${escapeHtml(name)}" ${logFilters.vaccine === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
      </select>
      <input id="vaccineDateFrom" type="date" aria-label="Filter from date" value="${escapeHtml(logFilters.dateFrom)}">
      <input id="vaccineDateTo" type="date" aria-label="Filter to date" value="${escapeHtml(logFilters.dateTo)}">
      <select id="reactionFilter" aria-label="Filter by reaction flag">
        <option value="all">All reaction flags</option>
        <option value="flagged" ${logFilters.reaction === 'flagged' ? 'selected' : ''}>With reaction/remarks</option>
        <option value="clear" ${logFilters.reaction === 'clear' ? 'selected' : ''}>No reaction flag</option>
      </select>
      <select id="sourceFilter" aria-label="Filter by record source">
        <option value="all">All sources</option>
        <option value="health-center" ${logFilters.source === 'health-center' ? 'selected' : ''}>Health center</option>
        <option value="private" ${logFilters.source === 'private' ? 'selected' : ''}>Private clinic</option>
      </select>
    </div>
  `;
}

function renderVaccineEntry(autoOpenFromQuery = true) {
  const area = document.getElementById('vaccineEntryArea');
  const params = new URLSearchParams(window.location.search);
  const selectedBaby = params.get('baby') || '';

  area.innerHTML = `
    <div class="card admin-action-table-card vaccine-log-table-card vaccine-records-main-card">
      <div class="overview-card-heading admin-vaccine-table-heading">
        <div>
          <h3 class="card-title">Vaccination Administration Records</h3>
          <p class="admin-card-subtitle">Review logged vaccines first. Use the compact action to record a new administered vaccine only when needed.</p>
        </div>
        <button type="button" class="btn btn-primary admin-compact-action" id="openVaccineModalBtn"><i class="fas fa-syringe"></i> Log Vaccine</button>
      </div>
      ${renderRecordFilters()}
      <div class="table-responsive admin-table-shell">
        <table class="admin-data-table admin-vaccine-log-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Date & Time</th>
              <th>Baby Name</th>
              <th>Vaccine Type</th>
              <th>Dose</th>
              <th>Lot/Batch No.</th>
              <th>Administered By</th>
              <th class="text-center">Reaction / Remarks</th>
            </tr>
          </thead>
          <tbody id="vaccineLogList">${renderLogTableRows()}</tbody>
        </table>
      </div>
    </div>
  `;

  bindRecordFilters();
  document.getElementById('openVaccineModalBtn')?.addEventListener('click', () => openVaccineLogModal(selectedBaby));
  if (autoOpenFromQuery && selectedBaby) {
    setTimeout(() => openVaccineLogModal(selectedBaby), 100);
  }
}

function bindRecordFilters() {
  const filterMap = {
    vaccineLogSearch: 'search',
    vaccineTypeFilter: 'vaccine',
    vaccineDateFrom: 'dateFrom',
    vaccineDateTo: 'dateTo',
    reactionFilter: 'reaction',
    sourceFilter: 'source'
  };

  Object.entries(filterMap).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener('input', () => {
      logFilters[key] = element.value;
      refreshLogTable();
    });
    element.addEventListener('change', () => {
      logFilters[key] = element.value;
      refreshLogTable();
    });
  });
}

function getBabySchedules(baby = {}) {
  return sortByDateAsc((baby.upcoming || []).filter(item => item.status !== 'Completed'), 'targetDate');
}

function getDoseFromSchedule(item = {}) {
  if (item.dose) return item.dose;
  const match = String(item.vaccine || '').match(/(?:dose\s*)?(\d+)$/i);
  return match ? Number(match[1]) : 1;
}

function buildScheduleOptions(baby = {}, selectedKey = '') {
  const schedules = getBabySchedules(baby);
  if (!baby.id) return '<option value="">Select a baby first</option>';
  if (!schedules.length) return '<option value="manual">No due/upcoming schedule — log other record</option>';
  return `
    <option value="">Choose due/upcoming vaccine</option>
    ${schedules.map((item, index) => {
      const key = `${index}`;
      const status = item.status || 'Upcoming';
      const date = formatDate(item.targetDate);
      return `<option value="${key}" ${String(selectedKey) === key ? 'selected' : ''}>${escapeHtml(item.vaccine)} • ${date} • ${escapeHtml(status)}</option>`;
    }).join('')}
    <option value="manual" ${selectedKey === 'manual' ? 'selected' : ''}>Other / historical vaccine record</option>
  `;
}

function openVaccineLogModal(prefilledBabyId = '') {
  const existing = document.getElementById('vaccineLogModal');
  if (existing) existing.remove();

  const babies = allBabies;
  const baby = babies.find(item => String(item.id) === String(prefilledBabyId));

  const modal = document.createElement('div');
  modal.id = 'vaccineLogModal';
  modal.className = 'modal-backdrop admin-vaccine-modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card admin-vaccine-log-modal" role="dialog" aria-modal="true" aria-label="Log vaccine record">
      <div class="modal-header admin-vaccine-modal-header">
        <div>
          <p class="page-kicker">Vaccine Administration</p>
          <h2>Log Vaccine Record</h2>
          <p>Select a baby, choose one of their due/upcoming vaccines, then complete the administration details.</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close vaccine form"><i class="fas fa-times"></i></button>
      </div>
      <form id="vaccineForm" class="admin-vaccine-modal-form">
        <div class="admin-vaccine-form-grid">
          <div class="field-group">
            <label>${getTranslation('admin.choose_baby')}</label>
            <select name="babyId" id="babySelect" required>
              <option value="">${getTranslation('admin.choose_baby')}</option>
              ${babies.map(item => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(prefilledBabyId) ? 'selected' : ''}>${escapeHtml(item.name)} - ${escapeHtml(item.registrationNumber || 'No Reg. No.')}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Due / Upcoming Vaccine</label>
            <select name="scheduleKey" id="scheduledVaccineSelect" required>${buildScheduleOptions(baby || {})}</select>
          </div>
        </div>

        <div id="selectedBabySchedule" class="admin-selected-schedule-panel">
          ${renderSelectedBabyScheduleHtml(prefilledBabyId)}
        </div>

        <div class="admin-vaccine-form-grid">
          <div class="field-group"><label>${getTranslation('admin.vaccine_name')}</label><input type="text" name="vaccine" id="vaccineNameField" placeholder="Auto-filled from selected schedule" required readonly></div>
          <div class="field-group"><label>${getTranslation('admin.dose')}</label><input type="number" name="dose" id="vaccineDoseField" min="1" placeholder="Auto-filled" required></div>
        </div>
        <div class="admin-vaccine-form-grid">
          <div class="field-group"><label>Target Date</label><input type="date" name="targetDate" id="targetDateField" readonly></div>
          <div class="field-group"><label>${getTranslation('admin.vaccination_date')}</label><input type="datetime-local" name="date" required></div>
        </div>
        <div class="admin-vaccine-form-grid">
          <div class="field-group"><label>${getTranslation('admin.batch_no')}</label><input type="text" name="batch" placeholder="Batch/Lot No." required></div>
          <div class="field-group"><label>${getTranslation('admin.worker_name')}</label><input type="text" name="worker" value="${escapeHtml(localStorage.getItem('vax_name') || getTranslation('role.health_worker'))}" required></div>
        </div>
        <section class="form-section compact-source-section">
          <label class="toggle-row">
            <input type="checkbox" id="privateClinicRecord" name="privateClinic">
            <span>${getTranslation('admin.private_clinic')}</span>
          </label>
          <div class="field-group hidden" id="clinicNameGroup" style="margin-top:12px;"><label>${getTranslation('admin.clinic_name')}</label><input type="text" name="clinicName" placeholder="Clinic name"></div>
        </section>
        <div class="field-group"><label>Remarks / Reaction Flag</label><textarea name="remarks" class="admin-vaccine-remarks" placeholder="Optional remarks, reaction flag, or follow-up notes"></textarea></div>
        <div class="admin-vaccine-modal-actions">
          <button type="button" class="btn btn-outline" id="cancelVaccineLog">Cancel</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${getTranslation('admin.save_record')}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cancelVaccineLog')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  modal.querySelector('#privateClinicRecord')?.addEventListener('change', (event) => {
    modal.querySelector('#clinicNameGroup')?.classList.toggle('hidden', !event.target.checked);
  });
  modal.querySelector('#babySelect')?.addEventListener('change', (event) => updateModalForBaby(event.target.value));
  modal.querySelector('#scheduledVaccineSelect')?.addEventListener('change', () => populateScheduleFields());
  modal.querySelector('#vaccineForm')?.addEventListener('submit', handleSubmit);

  if (prefilledBabyId) updateModalForBaby(prefilledBabyId);
}

function renderSelectedBabyScheduleHtml(babyId) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) {
    return `<div class="empty-state compact-empty">${getTranslation('admin.choose_baby')}</div>`;
  }

  const schedules = getBabySchedules(baby);
  return `
    <div class="admin-selected-baby-summary">
      <div>
        <strong>${escapeHtml(baby.name)}</strong>
        <span>${escapeHtml(baby.registrationNumber || '-')}</span>
      </div>
      <span class="status-summary-cell"><span class="badge status-badge ${statusClass(baby.registrationStatus || 'Pending')}">${escapeHtml(baby.registrationStatus || 'Pending')}</span></span>
    </div>
    <div class="schedule-list admin-modal-schedule-list">
      ${schedules.length ? schedules.map(item => `
        <div class="schedule-item">
          <div><strong>${escapeHtml(item.vaccine)}</strong><br><small>Target: ${formatDate(item.targetDate)}</small></div>
          <span class="status-summary-cell"><span class="badge status-badge ${statusClass(item.status || 'Upcoming')}">${escapeHtml(item.status || 'Upcoming')}</span></span>
        </div>
      `).join('') : `<div class="empty-state compact-empty">${getTranslation('profile.no_upcoming')}</div>`}
    </div>
  `;
}

function updateModalForBaby(babyId) {
  const modal = document.getElementById('vaccineLogModal');
  if (!modal) return;
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  const scheduleSelect = modal.querySelector('#scheduledVaccineSelect');
  const schedulePanel = modal.querySelector('#selectedBabySchedule');
  if (scheduleSelect) scheduleSelect.innerHTML = buildScheduleOptions(baby || {});
  if (schedulePanel) schedulePanel.innerHTML = renderSelectedBabyScheduleHtml(babyId);
  populateScheduleFields();
}

function populateScheduleFields() {
  const modal = document.getElementById('vaccineLogModal');
  if (!modal) return;
  const babyId = modal.querySelector('#babySelect')?.value;
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  const scheduleKey = modal.querySelector('#scheduledVaccineSelect')?.value;
  const vaccineField = modal.querySelector('#vaccineNameField');
  const doseField = modal.querySelector('#vaccineDoseField');
  const targetDateField = modal.querySelector('#targetDateField');

  if (scheduleKey === 'manual') {
    vaccineField.readOnly = false;
    vaccineField.value = '';
    vaccineField.placeholder = 'Enter vaccine name for non-scheduled record';
    doseField.value = '';
    targetDateField.value = '';
    return;
  }

  vaccineField.readOnly = true;
  const schedule = baby ? getBabySchedules(baby)[Number(scheduleKey)] : null;
  if (!schedule) {
    vaccineField.value = '';
    doseField.value = '';
    targetDateField.value = '';
    return;
  }

  vaccineField.value = schedule.vaccine || '';
  doseField.value = getDoseFromSchedule(schedule);
  targetDateField.value = normalizeDateInput(schedule.targetDate);
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const babyId = data.get('babyId');
  const isPrivate = data.get('privateClinic') === 'on';
  const record = {
    vaccine: (data.get('vaccine') || '').trim(),
    date: data.get('date'),
    dose: Number(data.get('dose')),
    targetDate: data.get('targetDate'),
    batch: (data.get('batch') || '').trim() || (isPrivate ? 'Private Clinic Record' : 'Not provided'),
    worker: (data.get('worker') || '').trim(),
    remarks: (data.get('remarks') || '').trim(),
    privateClinic: isPrivate,
    clinicName: (data.get('clinicName') || '').trim()
  };

  try {
    showLoading(getTranslation('admin.update_record'));
    await addVaccinationRecord(babyId, record);
    await loadBabiesFromDatabase();
    showToast(getTranslation('admin.vaccine_saved'));
    form.closest('#vaccineLogModal')?.remove();
    renderVaccineEntry(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();
  try {
    await loadBabiesFromDatabase();
  } catch (err) {
    console.warn('[API] Unable to load vaccination records from database:', err.message);
    allBabies = [];
  }
  renderVaccineEntry();
  hideLoading();
});
