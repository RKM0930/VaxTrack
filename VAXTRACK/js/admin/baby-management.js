import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch } from '../api.js';
import { showLoading, hideLoading, formatBabyAge, formatValue, formatDate, statusClass, sortByDateAsc, sortByDateDesc, openDocumentModal } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

const normalize = (baby) => ({
  ...baby,
  name: baby.name || [baby.first_name, baby.middle_name, baby.last_name].filter(Boolean).join(' ').trim(),
  registrationNumber: baby.registrationNumber || baby.registration_number,
  registrationStatus: baby.registrationStatus || baby.registration_status,
  guardianName: baby.guardianName || baby.guardian_name,
  guardianPhone: baby.guardianPhone || baby.guardian_phone,
  guardianAddress: baby.guardianAddress || baby.guardian_address,
  motherName: baby.motherName || baby.mother_name,
  fatherName: baby.fatherName || baby.father_name,
  placeOfBirth: baby.placeOfBirth || baby.place_of_birth,
  birthWeight: baby.birthWeight || baby.birth_weight,
  bloodType: baby.bloodType || baby.blood_type,
  privateClinic: baby.privateClinic ?? Boolean(baby.private_clinic),
  privateClinicName: baby.privateClinicName || baby.private_clinic_name,
  testHistory: (baby.testHistory || baby.test_history || []).map(t => ({
    ...t,
    test: t.test || t.test_name || t.name,
    date: t.date || t.test_date,
    result: t.result || t.remarks || t.comment,
  })),
  vaccinations: (baby.vaccinations || []).map(v => ({
    ...v,
    date: v.date || v.dateAdministered || v.date_administered || v.administered_date || v.administeredAt,
    vaccine: v.vaccine || v.vaccine_type || v.vaccineName,
    dose: v.dose || v.dose_number,
    source: v.source || v.clinic || v.clinic_source,
    worker: v.worker || v.administeredBy || v.administered_by,
    batchNumber: v.batchNumber || v.batch_number || v.lotBatch || v.lot_batch || v.batchNo || v.batch_no,
    remarks: v.remarks || v.comment,
  })),
  upcoming: (baby.upcoming || []).map(u => ({
    ...u,
    targetDate: u.targetDate || u.target_date,
  })),
  documents: (baby.documents || []).map(d => ({
    ...d,
    uploadDate: d.uploadDate || d.upload_date,
  })),
});

let allBabies = [];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function displayValue(value, fallback = 'Not provided') {
  return escapeHtml(value === 0 || value ? value : fallback);
}

function displayDate(value, fallback = '-') {
  return displayValue(formatDate(value, fallback), fallback);
}

function getAgeInMonths(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
  if (today.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(0, months);
}

function getNextSchedule(baby) {
  return sortByDateAsc((baby.upcoming || []).filter(item => item.status !== 'Completed'), 'targetDate')[0] || { vaccine: getTranslation('dashboard.up_to_date'), targetDate: '-', status: 'Completed' };
}

function getBabyStatusSummary(baby) {
  const documents = baby.documents || [];
  const upcoming = baby.upcoming || [];
  const next = getNextSchedule(baby);
  const completedCount = (baby.vaccinations || []).filter(item => String(item.status || '').toLowerCase() === 'completed').length;
  const openSchedules = upcoming.filter(item => String(item.status || '').toLowerCase() !== 'completed');

  if (documents.some(doc => String(doc.status || '').toLowerCase() === 'rejected') || String(baby.registrationStatus || '').toLowerCase() === 'rejected') {
    return { key: 'rejected-docs', label: 'Rejected Docs', badge: 'rejected', detail: 'Document requires correction' };
  }
  if (documents.some(doc => String(doc.status || '').toLowerCase() === 'pending') || String(baby.registrationStatus || '').toLowerCase() === 'pending') {
    return { key: 'pending-docs', label: 'Pending Docs', badge: 'pending', detail: 'For document review' };
  }
  if (upcoming.some(item => String(item.status || '').toLowerCase() === 'overdue')) {
    return { key: 'overdue', label: 'Overdue', badge: 'overdue', detail: `${next.vaccine} • ${formatDate(next.targetDate)}` };
  }
  if (openSchedules.length) {
    return { key: 'due-soon', label: 'Due Soon', badge: 'due-soon', detail: `${next.vaccine} • ${formatDate(next.targetDate)}` };
  }
  if (completedCount > 0) {
    return { key: 'fully-vaccinated', label: 'Fully Vaccinated', badge: 'completed', detail: `${completedCount} recorded vaccine${completedCount === 1 ? '' : 's'}` };
  }
  return { key: 'up-to-date', label: 'Up-to-date', badge: 'approved', detail: 'No current action needed' };
}

function getFilterState() {
  return {
    query: (document.getElementById('adminBabySearch')?.value || '').trim().toLowerCase(),
    ageGroup: document.getElementById('ageGroupFilter')?.value || 'all',
    status: document.getElementById('statusFilter')?.value || 'all',
  };
}

function matchesAgeGroup(baby, group) {
  if (group === 'all') return true;
  const months = getAgeInMonths(baby.dob);
  if (months === null) return false;
  if (group === '0-6') return months <= 6;
  if (group === '7-12') return months >= 7 && months <= 12;
  if (group === '13-24') return months >= 13 && months <= 24;
  if (group === '25+') return months >= 25;
  return true;
}

function renderInfoItem(label, value, extraClass = '') {
  return `<div class="info-item ${extraClass}"><span>${escapeHtml(label)}</span><strong>${displayValue(value)}</strong></div>`;
}

function renderVaccinationHistory(vaccinations = []) {
  const records = sortByDateDesc(vaccinations, 'date');
  if (!records.length) {
    return `<div class="empty-state compact-empty">${getTranslation('profile.no_history')}</div>`;
  }

  return `
    <div class="admin-record-list">
      ${records.map(record => `
        <div class="admin-record-list-row">
          <div>
            <strong>${displayValue(record.vaccine, 'Vaccine')}</strong>
            <small>${displayDate(record.date)} • Dose ${displayValue(record.dose, '-')} • ${displayValue(record.source || record.worker, 'BHW')}</small>
          </div>
          <div class="admin-record-list-meta">
            <span class="badge ${statusClass(record.status || 'Completed')}">${displayValue(record.status || 'Completed', 'Completed')}</span>
            <small>Batch: ${displayValue(record.batchNumber, '-')}</small>
            ${record.remarks ? `<small>${displayValue(record.remarks)}</small>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderUpcomingFollowUps(upcoming = []) {
  const records = sortByDateAsc(upcoming, 'targetDate').filter(item => String(item.status || '').toLowerCase() !== 'completed');
  if (!records.length) {
    return `<div class="empty-state compact-empty">${getTranslation('profile.no_upcoming')}</div>`;
  }

  return `
    <div class="admin-record-list compact-list">
      ${records.map(item => `
        <div class="admin-record-list-row compact-row">
          <div>
            <strong>${displayValue(item.vaccine, 'Vaccine')}</strong>
            <small>Target date: ${displayDate(item.targetDate)}</small>
          </div>
          <span class="badge ${statusClass(item.status || 'Due Soon')}">${displayValue(item.status || 'Due Soon', 'Due Soon')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDocuments(docs = [], babyId) {
  if (!docs.length) {
    return `<div class="empty-state compact-empty">No documents uploaded.</div>`;
  }

  return `
    <div class="document-chip-list admin-modal-doc-list">
      ${docs.map(doc => `
        <div class="document-chip">
          <div>
            <strong>${displayValue(doc.type, 'Document')}</strong>
            <small>${displayValue(doc.filename, 'Uploaded file')} • ${displayDate(doc.uploadDate)}</small>
            ${doc.comment ? `<small class="comment-text">${displayValue(doc.comment)}</small>` : ''}
          </div>
          <div class="document-chip-actions">
            <span class="badge ${statusClass(doc.status)}">${displayValue(doc.status, 'Pending')}</span>
            <button type="button" class="btn btn-outline btn-sm admin-modal-view-doc" data-baby-id="${displayValue(babyId, '')}" data-doc-id="${displayValue(doc.id, '')}">${getTranslation('admin.preview')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTestHistory(tests = []) {
  if (!tests.length) {
    return `<div class="empty-state compact-empty">${getTranslation('profile.no_tests')}</div>`;
  }

  return `
    <div class="admin-record-list compact-list">
      ${sortByDateDesc(tests, 'date').map(test => `
        <div class="admin-record-list-row compact-row">
          <div>
            <strong>${displayValue(test.test, 'Medical test')}</strong>
            <small>${displayDate(test.date)}</small>
          </div>
          <small class="admin-muted">${displayValue(test.result, 'No result recorded')}</small>
        </div>
      `).join('')}
    </div>
  `;
}

function closeBabyRecordModal() {
  document.getElementById('adminBabyRecordModal')?.remove();
}

function openBabyRecordModal(babyId) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) return;

  const summary = getBabyStatusSummary(baby);
  closeBabyRecordModal();

  const modal = document.createElement('div');
  modal.id = 'adminBabyRecordModal';
  modal.className = 'modal-backdrop admin-baby-record-modal';
  modal.innerHTML = `
    <div class="modal-card admin-baby-record-card" role="dialog" aria-modal="true" aria-labelledby="adminBabyRecordTitle">
      <div class="modal-header admin-record-modal-header">
        <div>
          <p class="page-kicker">Baby Record Details</p>
          <h2 id="adminBabyRecordTitle">${displayValue(baby.name, 'Baby record')}</h2>
          <p>${displayValue(baby.registrationNumber, 'No registration number')} • ${displayValue(formatBabyAge(baby.dob), 'Age unavailable')} • ${displayValue(baby.sex, 'Sex not provided')}</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close baby record"><i class="fas fa-times"></i></button>
      </div>

      <div class="admin-record-modal-summary">
        <span class="status-summary-cell">
          <span class="badge status-badge ${summary.badge}">${displayValue(summary.label, 'Status')}</span>
          <span class="status-text">${displayValue(summary.detail, 'No current action needed')}</span>
        </span>
        <a class="btn btn-primary btn-sm" href="vaccination-entry.html?baby=${encodeURIComponent(baby.id)}"><i class="fas fa-syringe"></i> ${getTranslation('nav.log_vaccine')}</a>
      </div>

      <div class="admin-record-modal-body">
        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-baby"></i><h3>Baby Information</h3></div>
          <div class="info-grid admin-profile-grid">
            ${renderInfoItem(getTranslation('dashboard.dob'), formatDate(baby.dob))}
            ${renderInfoItem(getTranslation('profile.sex'), baby.sex)}
            ${renderInfoItem(getTranslation('profile.place_of_birth'), baby.placeOfBirth)}
            ${renderInfoItem('Birth Weight', baby.birthWeight)}
            ${renderInfoItem('Blood Type', baby.bloodType)}
            ${renderInfoItem('Registration Status', baby.registrationStatus || summary.label)}
          </div>
        </section>

        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-user-friends"></i><h3>Parent / Guardian Information</h3></div>
          <div class="info-grid admin-profile-grid">
            ${renderInfoItem(getTranslation('profile.guardian'), baby.guardianName)}
            ${renderInfoItem(getTranslation('profile.phone'), baby.guardianPhone)}
            ${renderInfoItem('Mother', baby.motherName)}
            ${renderInfoItem('Father', baby.fatherName)}
            ${renderInfoItem('Clinic Source', baby.privateClinic ? baby.privateClinicName || 'Private clinic' : 'Barangay health center')}
            ${renderInfoItem(getTranslation('profile.address'), baby.guardianAddress, 'admin-address-item')}
          </div>
        </section>

        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-syringe"></i><h3>Vaccination History</h3></div>
          ${renderVaccinationHistory(baby.vaccinations || [])}
        </section>

        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-calendar-check"></i><h3>Upcoming / Follow-up Schedules</h3></div>
          ${renderUpcomingFollowUps(baby.upcoming || [])}
        </section>

        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-file-medical"></i><h3>Uploaded Documents</h3></div>
          ${renderDocuments(baby.documents || [], baby.id)}
        </section>

        <section class="admin-record-section">
          <div class="admin-record-section-title"><i class="fas fa-notes-medical"></i><h3>Medical / Test History</h3></div>
          ${renderTestHistory(baby.testHistory || [])}
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close')?.addEventListener('click', closeBabyRecordModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeBabyRecordModal();
  });
  modal.querySelectorAll('.admin-modal-view-doc').forEach(button => {
    button.addEventListener('click', () => {
      const selectedBaby = allBabies.find(item => String(item.id) === String(button.dataset.babyId));
      const doc = (selectedBaby?.documents || []).find(item => String(item.id) === String(button.dataset.docId));
      if (selectedBaby && doc) openDocumentModal(doc, selectedBaby);
    });
  });
}

function renderDirectory() {
  const list = document.getElementById('directoryList');
  const filters = getFilterState();
  const rows = allBabies
    .map(baby => ({ baby, summary: getBabyStatusSummary(baby) }))
    .filter(({ baby, summary }) => {
      const textMatch = !filters.query || [baby.name, baby.registrationNumber, baby.guardianName, baby.guardianPhone, baby.motherName, baby.fatherName]
        .some(value => String(value || '').toLowerCase().includes(filters.query));
      return textMatch && matchesAgeGroup(baby, filters.ageGroup) && (filters.status === 'all' || summary.key === filters.status);
    });

  if (!rows.length) {
    list.style.removeProperty('--directory-name-slot');
    list.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${getTranslation('admin.no_records')}</td></tr>`;
    return;
  }

  const longestVisibleName = rows.reduce((max, { baby }) => {
    const nameLength = String(displayValue(baby.name, 'Unnamed baby')).length;
    return Math.max(max, nameLength);
  }, 14);
  const nameSlotCh = Math.max(14, Math.min(longestVisibleName + 1, 32));
  list.style.setProperty('--directory-name-slot', `${nameSlotCh}ch`);

  list.innerHTML = rows.map(({ baby, summary }) => `
    <tr class="admin-directory-row">
      <td><span class="admin-mono">${displayValue(baby.registrationNumber, '-')}</span></td>
      <td class="admin-directory-name-cell" data-baby-id="${displayValue(baby.id, '')}" title="Open full baby record">
        <span class="admin-directory-name-content">
          <strong class="directory-primary-text admin-directory-name-trigger">${displayValue(baby.name, 'Unnamed baby')}</strong>
          <button type="button" class="admin-record-inline-trigger admin-open-record" data-baby-id="${displayValue(baby.id, '')}" aria-label="Open full record for ${displayValue(baby.name, 'this baby')}" aria-haspopup="dialog" title="Open full record">
            <i class="fas fa-up-right-from-square" aria-hidden="true"></i>
          </button>
        </span>
      </td>
      <td><span class="directory-secondary-text">${displayDate(baby.dob)} • ${displayValue(formatBabyAge(baby.dob), '-')}</span></td>
      <td><span class="directory-secondary-text">${displayValue(baby.guardianName)}</span></td>
      <td><span class="directory-secondary-text">${displayValue(baby.guardianPhone)}</span></td>
      <td>
        <span class="status-summary-cell directory-status-line">
          <span class="badge status-badge ${summary.badge}">${displayValue(summary.label, 'Status')}</span>
          <span class="status-text directory-status-detail">${displayValue(summary.detail, '')}</span>
        </span>
      </td>
    </tr>
  `).join('');

  list.querySelectorAll('.admin-open-record').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openBabyRecordModal(button.dataset.babyId);
    });
  });

  list.querySelectorAll('.admin-directory-name-cell').forEach(cell => {
    cell.addEventListener('click', event => {
      if (event.target.closest('.admin-open-record')) return;
      openBabyRecordModal(cell.dataset.babyId);
    });
  });
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeBabyRecordModal();
});

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();

  try {
    const data = await apiFetch('/babies');
    if (data && Array.isArray(data)) {
      allBabies = data.map(normalize);
    } else {
      throw new Error('Unexpected database response');
    }
  } catch (err) {
    console.warn('[API] Unable to load baby records from database:', err.message);
    allBabies = [];
  }

  renderDirectory();
  ['adminBabySearch', 'ageGroupFilter', 'statusFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderDirectory);
    document.getElementById(id)?.addEventListener('change', renderDirectory);
  });
  hideLoading();
});
