import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, downloadAdminFilteredCsv } from '../api.js';
import { showLoading, hideLoading, showToast, formatBabyAge, formatValue, formatDate, statusClass, sortByDateAsc, sortByDateDesc, openDocumentModal, isBabyLocallyArchived, archiveBabyLocally, restoreBabyLocally, getLocalArchiveMeta } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();


const normalize = (baby) => {
  const normalized = {
    ...baby,
    id: baby.id || baby.childId || baby.child_id || baby.babyId || baby.baby_id || baby.registrationNumber || baby.registration_number,
    childId: baby.childId || baby.child_id || baby.id || '',
    firstName: baby.firstName || baby.first_name || '',
    middleName: baby.middleName || baby.middle_name || '',
    lastName: baby.lastName || baby.last_name || '',
    name: baby.name || [baby.firstName || baby.first_name, baby.middleName || baby.middle_name, baby.lastName || baby.last_name].filter(Boolean).join(' ').trim(),
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
    updatedAt: baby.updatedAt || baby.updated_at || baby.last_updated || baby.lastEdit?.edited_at || '',
    updatedBy: baby.updatedBy || baby.updated_by || baby.last_updated_by || baby.lastEdit?.edited_by || '',
    updateReason: baby.updateReason || baby.update_reason || baby.last_update_reason || baby.lastEdit?.reason || '',
    lastEdit: baby.lastEdit || baby.last_edit || null,
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
  };

  const archiveMeta = getLocalArchiveMeta(normalized);
  const isArchived = isBabyLocallyArchived(normalized);
  return {
    ...normalized,
    isArchived,
    archivedAt: archiveMeta.archivedAt || '',
    archiveReason: archiveMeta.archiveReason || '',
    archivedBy: archiveMeta.archivedBy || '',
  };
};

let allBabies = [];


const EDITABLE_BABY_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true, section: 'Baby Information' },
  { key: 'middleName', label: 'Middle Name', required: false, section: 'Baby Information' },
  { key: 'lastName', label: 'Last Name', required: true, section: 'Baby Information' },
  { key: 'dob', label: 'Date of Birth', required: true, type: 'date', section: 'Baby Information' },
  { key: 'sex', label: 'Sex', required: true, type: 'select', section: 'Baby Information', options: ['', 'Male', 'Female'] },
  { key: 'placeOfBirth', label: 'Place of Birth', required: false, section: 'Baby Information' },
  { key: 'birthWeight', label: 'Birth Weight', required: false, section: 'Baby Information' },
  { key: 'bloodType', label: 'Blood Type', required: false, section: 'Baby Information' },
  { key: 'motherName', label: 'Mother Name', required: false, section: 'Parent / Guardian Information' },
  { key: 'fatherName', label: 'Father Name', required: false, section: 'Parent / Guardian Information' },
  { key: 'guardianName', label: 'Parent/Guardian Name', required: false, section: 'Parent / Guardian Information' },
  { key: 'guardianPhone', label: 'Contact Number', required: false, section: 'Parent / Guardian Information' },
  { key: 'guardianAddress', label: 'Address', required: false, type: 'textarea', section: 'Parent / Guardian Information' },
  { key: 'privateClinic', label: 'Private Clinic Record', required: false, type: 'checkbox', section: 'Private Clinic Information' },
  { key: 'privateClinicName', label: 'Private Clinic Name', required: false, section: 'Private Clinic Information' },
];

const EDIT_FIELD_LABELS = EDITABLE_BABY_FIELDS.reduce((labels, field) => {
  labels[field.key] = field.label;
  return labels;
}, {});

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


function rawValue(value, fallback = '') {
  return value === 0 || value ? String(value) : fallback;
}

function escapeAttribute(value = '') {
  return escapeHtml(rawValue(value));
}

function getDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }
  return date.toISOString().slice(0, 10);
}

function normalizeEditValue(key, value) {
  if (key === 'privateClinic') return value ? '1' : '0';
  if (key === 'dob') return getDateInputValue(value);
  return String(value ?? '').trim();
}

function buildBabyDisplayName(data = {}) {
  return [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function getEditChangedFields(baby, payload) {
  return EDITABLE_BABY_FIELDS
    .filter(field => normalizeEditValue(field.key, baby[field.key]) !== normalizeEditValue(field.key, payload[field.key]))
    .map(field => ({
      key: field.key,
      label: field.label,
      oldValue: field.type === 'checkbox' ? (baby[field.key] ? 'Yes' : 'No') : rawValue(baby[field.key], 'Blank'),
      newValue: field.type === 'checkbox' ? (payload[field.key] ? 'Yes' : 'No') : rawValue(payload[field.key], 'Blank'),
    }));
}

function renderEditAuditNote(baby = {}) {
  if (!baby.updatedAt && !baby.updateReason) return '';
  return `
    <section class="admin-record-section admin-maintenance-section">
      <div class="admin-record-section-title"><i class="fas fa-clipboard-check"></i><h3>Record Maintenance</h3></div>
      <div class="info-grid admin-profile-grid">
        ${renderInfoItem('Last Updated', baby.updatedAt ? formatDate(baby.updatedAt) : '')}
        ${renderInfoItem('Updated By', baby.updatedBy)}
        ${renderInfoItem('Update Reason', baby.updateReason, 'admin-address-item')}
      </div>
    </section>
  `;
}


function renderArchiveAuditNote(baby = {}) {
  if (!baby.isArchived) return '';
  return `
    <section class="admin-record-section admin-maintenance-section admin-archive-maintenance-section">
      <div class="admin-record-section-title"><i class="fas fa-box-archive"></i><h3>Archive Information</h3></div>
      <div class="info-grid admin-profile-grid">
        ${renderInfoItem('Archive Status', 'Archived locally')}
        ${renderInfoItem('Archived At', baby.archivedAt ? formatDate(baby.archivedAt) : '')}
        ${renderInfoItem('Archived By', baby.archivedBy)}
        ${renderInfoItem('Archive Reason', baby.archiveReason, 'admin-address-item')}
      </div>
      <p class="admin-muted archive-prototype-note">Prototype-only archive workaround. This record is hidden on this device using localStorage and the database is not updated.</p>
    </section>
  `;
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
  if (baby.isArchived) {
    return { key: 'archived', label: 'Archived', badge: 'archived', detail: baby.archivedAt ? `Archived locally ${formatDate(baby.archivedAt)}` : 'Hidden from active views on this device' };
  }
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
    archiveStatus: document.getElementById('archiveStatusFilter')?.value || 'active',
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

function renderEditControl(baby = {}) {
  return `
    <button type="button" class="btn btn-outline btn-sm admin-edit-record-trigger" data-baby-id="${displayValue(baby.id, '')}">
      <i class="fas fa-pen-to-square"></i> Edit Record
    </button>
  `;
}

function renderArchiveControl(baby = {}) {
  if (baby.isArchived) {
    return `
      <button type="button" class="btn btn-outline btn-sm admin-restore-record-trigger" data-baby-id="${displayValue(baby.id, '')}">
        <i class="fas fa-undo"></i> Restore Record
      </button>
    `;
  }

  return `
    <button type="button" class="btn btn-outline btn-sm admin-danger-action admin-archive-record-trigger" data-baby-id="${displayValue(baby.id, '')}">
      <i class="fas fa-box-archive"></i> Archive Record
    </button>
  `;
}

function refreshDirectoryAfterLocalArchiveChange() {
  allBabies = allBabies.map(normalize);
  renderDirectory();
  window.dispatchEvent(new CustomEvent('vaxtrack:baby-records-updated'));
}

function restoreArchivedBabyRecord(babyId) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) return;
  restoreBabyLocally(baby);
  closeBabyRecordModal();
  refreshDirectoryAfterLocalArchiveChange();
  showToast('Record restored successfully.');
}


async function loadDirectoryBabies() {
  const data = await apiFetch('/babies');
  if (!data || !Array.isArray(data)) {
    throw new Error('Unexpected database response');
  }
  allBabies = data.map(normalize);
  renderDirectory();
  window.dispatchEvent(new CustomEvent('vaxtrack:baby-records-updated'));
  return allBabies;
}

async function updateBabyRecordInApi(babyId, payload = {}) {
  const identifier = String(babyId || payload.childId || payload.registrationNumber || '').trim();
  if (!identifier) {
    throw new Error('Unable to update this record because no baby ID or registration number was found.');
  }

  const encodedId = encodeURIComponent(identifier);
  const requestPayload = {
    ...payload,
    childId: payload.childId || identifier,
  };

  const patchOptions = {
    method: 'PATCH',
    body: JSON.stringify(requestPayload),
  };

  const postUpdateOptions = {
    method: 'POST',
    body: JSON.stringify({ ...requestPayload, _method: 'PATCH' }),
  };

  const attempts = [
    { endpoint: `/admin/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/api/admin/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/api/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/children/${encodedId}`, options: patchOptions },
    { endpoint: `/api/children/${encodedId}`, options: patchOptions },
    { endpoint: `/index.php/admin/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/index.php/api/admin/babies/${encodedId}`, options: patchOptions },
    { endpoint: `/admin/babies/${encodedId}/update`, options: postUpdateOptions },
    { endpoint: `/api/admin/babies/${encodedId}/update`, options: postUpdateOptions },
    { endpoint: `/index.php/admin/babies/${encodedId}/update`, options: postUpdateOptions },
  ];

  let lastRouteError;
  for (const { endpoint, options } of attempts) {
    try {
      return await apiFetch(endpoint, options);
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('route not found')) {
        lastRouteError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastRouteError || new Error('Edit route is not available. Please deploy the updated backend route.');
}

function closeBabyRecordModal() {
  document.getElementById('adminBabyRecordModal')?.remove();
}

function closeEditConfirmationModal() {
  document.getElementById('adminEditConfirmModal')?.remove();
}

function closeEditBabyRecordModal() {
  closeEditConfirmationModal();
  document.getElementById('adminEditBabyModal')?.remove();
}

function renderEditField(baby, field) {
  const value = baby[field.key] ?? '';
  const required = field.required ? 'required' : '';
  const requiredLabel = field.required ? '<em>Required</em>' : '<small>Optional</small>';

  if (field.type === 'checkbox') {
    return `
      <label class="field-group admin-edit-checkbox-field">
        <span>${escapeHtml(field.label)} ${requiredLabel}</span>
        <span class="admin-edit-checkline">
          <input type="checkbox" name="${escapeAttribute(field.key)}" ${value ? 'checked' : ''}>
          Mark this as a private clinic record
        </span>
      </label>
    `;
  }

  if (field.type === 'select') {
    const current = String(value || '');
    return `
      <label class="field-group">
        <span>${escapeHtml(field.label)} ${requiredLabel}</span>
        <select name="${escapeAttribute(field.key)}" class="form-control" ${required}>
          ${(field.options || []).map(option => `
            <option value="${escapeAttribute(option)}" ${String(option) === current ? 'selected' : ''}>${option ? escapeHtml(option) : 'Select'}</option>
          `).join('')}
        </select>
      </label>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <label class="field-group admin-edit-wide-field">
        <span>${escapeHtml(field.label)} ${requiredLabel}</span>
        <textarea name="${escapeAttribute(field.key)}" class="form-control" rows="3" ${required}>${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  const inputType = field.type === 'date' ? 'date' : 'text';
  const inputValue = field.type === 'date' ? getDateInputValue(value) : value;
  return `
    <label class="field-group">
      <span>${escapeHtml(field.label)} ${requiredLabel}</span>
      <input type="${inputType}" name="${escapeAttribute(field.key)}" class="form-control" value="${escapeAttribute(inputValue)}" ${required}>
    </label>
  `;
}

function renderEditFormSections(baby) {
  const sections = EDITABLE_BABY_FIELDS.reduce((groups, field) => {
    groups[field.section] = groups[field.section] || [];
    groups[field.section].push(field);
    return groups;
  }, {});

  return Object.entries(sections).map(([title, fields]) => `
    <section class="admin-edit-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="admin-edit-grid">
        ${fields.map(field => renderEditField(baby, field)).join('')}
      </div>
    </section>
  `).join('');
}

function collectEditPayload(form) {
  const formData = new FormData(form);
  return EDITABLE_BABY_FIELDS.reduce((payload, field) => {
    if (field.type === 'checkbox') {
      payload[field.key] = Boolean(form.querySelector(`[name="${field.key}"]`)?.checked);
    } else {
      payload[field.key] = String(formData.get(field.key) ?? '').trim();
    }
    return payload;
  }, {});
}

function openEditBabyRecordModal(babyId) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) return;

  closeEditBabyRecordModal();

  const modal = document.createElement('div');
  modal.id = 'adminEditBabyModal';
  modal.className = 'modal-backdrop admin-edit-record-modal';
  modal.innerHTML = `
    <div class="modal-card admin-edit-record-card" role="dialog" aria-modal="true" aria-labelledby="editBabyTitle">
      <div class="modal-header admin-edit-record-header">
        <div>
          <p class="page-kicker">Controlled Edit</p>
          <h2 id="editBabyTitle">Edit Record</h2>
          <p>${displayValue(baby.name, 'Selected baby')} • ${displayValue(baby.registrationNumber, 'No registration number')}</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close edit record"><i class="fas fa-times"></i></button>
      </div>
      <form id="adminEditBabyForm" class="admin-edit-record-body">
        <div class="admin-edit-warning-box">
          <i class="fas fa-circle-info"></i>
          <div>
            <strong>Correct only inaccurate registration details.</strong>
            <span>The baby ID and registration number will be preserved. Document issues should still be handled through Reject or Request Re-upload.</span>
          </div>
        </div>
        ${renderEditFormSections(baby)}
      </form>
      <div class="admin-edit-record-actions">
        <button type="button" class="btn btn-outline admin-edit-cancel">Cancel</button>
        <button type="button" class="btn btn-primary admin-edit-review">
          <i class="fas fa-check-circle"></i> Review Changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const form = modal.querySelector('#adminEditBabyForm');
  modal.querySelector('.modal-close')?.addEventListener('click', closeEditBabyRecordModal);
  modal.querySelector('.admin-edit-cancel')?.addEventListener('click', closeEditBabyRecordModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeEditBabyRecordModal();
  });
  modal.querySelector('.admin-edit-review')?.addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const payload = collectEditPayload(form);
    const changedFields = getEditChangedFields(baby, payload);
    if (!changedFields.length) {
      showToast('No record changes to save.', 'info');
      return;
    }
    openEditConfirmationModal(baby.id, payload, changedFields);
  });
}

function openEditConfirmationModal(babyId, payload, changedFields) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) return;

  closeEditConfirmationModal();

  const modal = document.createElement('div');
  modal.id = 'adminEditConfirmModal';
  modal.className = 'modal-backdrop admin-edit-confirm-modal';
  modal.innerHTML = `
    <div class="modal-card admin-edit-confirm-card" role="dialog" aria-modal="true" aria-labelledby="editConfirmTitle">
      <div class="modal-header admin-edit-confirm-header">
        <div>
          <p class="page-kicker">Confirm Edit</p>
          <h2 id="editConfirmTitle">Update Record?</h2>
          <p>${displayValue(baby.name, 'Selected baby')} • ${displayValue(baby.registrationNumber, 'No registration number')}</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close edit confirmation"><i class="fas fa-times"></i></button>
      </div>
      <div class="admin-edit-confirm-body">
        <div class="admin-edit-warning-box">
          <i class="fas fa-clipboard-check"></i>
          <div>
            <strong>You are about to update this baby record. Please confirm that the corrected information is accurate.</strong>
            <span>The existing record ID and registration number will be preserved.</span>
          </div>
        </div>
        <div class="admin-edit-change-list" aria-label="Changed fields">
          ${changedFields.map(change => `
            <div class="admin-edit-change-row">
              <strong>${escapeHtml(change.label)}</strong>
              <span>${displayValue(change.oldValue, 'Blank')} <i class="fas fa-arrow-right"></i> ${displayValue(change.newValue, 'Blank')}</span>
            </div>
          `).join('')}
        </div>
        <label class="field-group">
          <span>Edit reason / comment <em>Required</em></span>
          <textarea id="editBabyReason" class="form-control" rows="3" placeholder="Example: Corrected spelling from birth certificate" required></textarea>
        </label>
      </div>
      <div class="admin-edit-confirm-actions">
        <button type="button" class="btn btn-outline admin-edit-confirm-cancel">Cancel</button>
        <button type="button" class="btn btn-primary admin-edit-final" disabled>
          <i class="fas fa-save"></i> Save Changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const reasonInput = modal.querySelector('#editBabyReason');
  const finalButton = modal.querySelector('.admin-edit-final');
  const syncSaveButton = () => {
    finalButton.disabled = !(reasonInput.value || '').trim();
  };

  reasonInput.addEventListener('input', syncSaveButton);
  modal.querySelector('.modal-close')?.addEventListener('click', closeEditConfirmationModal);
  modal.querySelector('.admin-edit-confirm-cancel')?.addEventListener('click', closeEditConfirmationModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeEditConfirmationModal();
  });

  finalButton.addEventListener('click', async () => {
    const reason = (reasonInput.value || '').trim();
    if (!reason) return;

    finalButton.disabled = true;
    finalButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const identifier = baby.childId || baby.id || baby.registrationNumber;
      const result = await updateBabyRecordInApi(identifier, {
        ...payload,
        reason,
        childId: baby.childId || baby.id || '',
        registrationNumber: baby.registrationNumber || '',
      });
      closeEditConfirmationModal();
      closeEditBabyRecordModal();
      closeBabyRecordModal();
      await loadDirectoryBabies();
      const updatedBaby = allBabies.find(item => String(item.id) === String(result.id || baby.id))
        || allBabies.find(item => String(item.registrationNumber) === String(result.registrationNumber || baby.registrationNumber));
      if (updatedBaby) openBabyRecordModal(updatedBaby.id);
      showToast('Baby record updated successfully.');
    } catch (error) {
      finalButton.disabled = false;
      finalButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      showToast(error.message || 'Unable to update baby record.', 'error');
    }
  });

  syncSaveButton();
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
        <div class="admin-record-modal-actions">
          ${baby.isArchived ? '' : `<a class="btn btn-primary btn-sm" href="vaccination-entry.html?baby=${encodeURIComponent(baby.id)}"><i class="fas fa-syringe"></i> ${getTranslation('nav.log_vaccine')}</a>`}
          ${baby.isArchived ? '' : renderEditControl(baby)}
          ${renderArchiveControl(baby)}
        </div>
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

        ${renderArchiveAuditNote(baby)}
        ${renderEditAuditNote(baby)}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close')?.addEventListener('click', closeBabyRecordModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeBabyRecordModal();
  });
  modal.querySelector('.admin-edit-record-trigger')?.addEventListener('click', event => {
    event.preventDefault();
    openEditBabyRecordModal(baby.id);
  });
  modal.querySelector('.admin-archive-record-trigger')?.addEventListener('click', event => {
    event.preventDefault();
    openArchiveBabyConfirmationModal(baby.id);
  });
  modal.querySelector('.admin-restore-record-trigger')?.addEventListener('click', event => {
    event.preventDefault();
    restoreArchivedBabyRecord(baby.id);
  });
  modal.querySelectorAll('.admin-modal-view-doc').forEach(button => {
    button.addEventListener('click', () => {
      const selectedBaby = allBabies.find(item => String(item.id) === String(button.dataset.babyId));
      const doc = (selectedBaby?.documents || []).find(item => String(item.id) === String(button.dataset.docId));
      if (selectedBaby && doc) openDocumentModal(doc, selectedBaby);
    });
  });
}

function closeArchiveBabyConfirmationModal() {
  document.getElementById('adminArchiveBabyModal')?.remove();
}

function openArchiveBabyConfirmationModal(babyId) {
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby || baby.isArchived) return;

  closeArchiveBabyConfirmationModal();

  const modal = document.createElement('div');
  modal.id = 'adminArchiveBabyModal';
  modal.className = 'modal-backdrop admin-delete-confirm-modal admin-archive-confirm-modal';
  modal.innerHTML = `
    <div class="modal-card admin-delete-confirm-card" role="dialog" aria-modal="true" aria-label="Archive record confirmation">
      <div class="modal-header admin-delete-confirm-header">
        <div class="admin-archive-record-summary">
          <strong>${displayValue(baby.name, 'Selected baby')}</strong>
          <span>${displayValue(baby.registrationNumber, 'No registration number')}</span>
        </div>
        <button type="button" class="modal-close" aria-label="Close archive confirmation"><i class="fas fa-times"></i></button>
      </div>
      <div class="admin-delete-confirm-body">
        <p class="admin-archive-confirm-message">Archive this baby record? It will be hidden from active dashboard and directory views.</p>
        <label class="field-group">
          <span>Reason / comment <small>(optional)</small></span>
          <textarea id="archiveBabyReason" class="form-control" rows="3" placeholder="Example: Duplicate test registration"></textarea>
        </label>
        <label class="field-group">
          <span>Type ARCHIVE to confirm</span>
          <input id="archiveBabyConfirmText" class="form-control" autocomplete="off" placeholder="ARCHIVE">
        </label>
      </div>
      <div class="admin-delete-confirm-actions">
        <button type="button" class="btn btn-outline admin-archive-cancel">Cancel</button>
        <button type="button" class="btn btn-primary admin-archive-final" disabled>
          <i class="fas fa-box-archive"></i> Archive Record
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const confirmInput = modal.querySelector('#archiveBabyConfirmText');
  const reasonInput = modal.querySelector('#archiveBabyReason');
  const finalButton = modal.querySelector('.admin-archive-final');

  const syncArchiveButton = () => {
    finalButton.disabled = (confirmInput.value || '').trim() !== 'ARCHIVE';
  };

  confirmInput.addEventListener('input', syncArchiveButton);
  modal.querySelector('.modal-close')?.addEventListener('click', closeArchiveBabyConfirmationModal);
  modal.querySelector('.admin-archive-cancel')?.addEventListener('click', closeArchiveBabyConfirmationModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeArchiveBabyConfirmationModal();
  });
  finalButton.addEventListener('click', () => {
    if ((confirmInput.value || '').trim() !== 'ARCHIVE') return;

    archiveBabyLocally(baby, reasonInput.value || '');
    closeArchiveBabyConfirmationModal();
    closeBabyRecordModal();
    refreshDirectoryAfterLocalArchiveChange();
    showToast('Record archived successfully.');
  });
}

function getFilteredDirectoryRows() {
  const filters = getFilterState();
  return allBabies
    .map(baby => ({ baby, summary: getBabyStatusSummary(baby) }))
    .filter(({ baby, summary }) => {
      const textMatch = !filters.query || [baby.name, baby.registrationNumber, baby.guardianName, baby.guardianPhone, baby.motherName, baby.fatherName]
        .some(value => String(value || '').toLowerCase().includes(filters.query));
      const archiveMatch = filters.archiveStatus === 'archived' ? baby.isArchived : !baby.isArchived;
      return archiveMatch && textMatch && matchesAgeGroup(baby, filters.ageGroup) && (filters.status === 'all' || summary.key === filters.status);
    });
}

function exportDirectoryCsv() {
  const rows = getFilteredDirectoryRows().map(({ baby, summary }) => [
    baby.registrationNumber || '',
    baby.name || '',
    `${formatDate(baby.dob)} • ${formatBabyAge(baby.dob)}`,
    baby.guardianName || '',
    baby.guardianPhone || '',
    baby.isArchived ? 'Archived' : 'Active',
    `${summary.label} • ${summary.detail}`
  ]);

  downloadAdminFilteredCsv({
    filenamePrefix: 'vaxtrack-directory-filtered',
    headers: ['Patient ID', 'Baby Name', 'DOB / Age', 'Parent/Guardian', 'Contact Number', 'Record State', 'Status Summary'],
    rows,
    emptyMessage: 'No directory records match the current filters.'
  });
  showToast('Filtered Directory CSV downloaded successfully.');
}

function renderDirectory() {
  const list = document.getElementById('directoryList');
  const rows = getFilteredDirectoryRows();

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
        ${baby.isArchived ? `<button type="button" class="btn btn-outline btn-sm admin-restore-row" data-baby-id="${displayValue(baby.id, '')}"><i class="fas fa-undo"></i> Restore</button>` : ''}
      </td>
    </tr>
  `).join('');

  list.querySelectorAll('.admin-restore-row').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      restoreArchivedBabyRecord(button.dataset.babyId);
    });
  });

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
  if (event.key === 'Escape') {
    closeEditConfirmationModal();
    closeEditBabyRecordModal();
    closeArchiveBabyConfirmationModal();
    closeBabyRecordModal();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();

  try {
    await loadDirectoryBabies();
  } catch (err) {
    console.warn('[API] Unable to load baby records from database:', err.message);
    allBabies = [];
    renderDirectory();
  }
  ['adminBabySearch', 'ageGroupFilter', 'statusFilter', 'archiveStatusFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderDirectory);
    document.getElementById(id)?.addEventListener('change', renderDirectory);
  });
  hideLoading();
});
