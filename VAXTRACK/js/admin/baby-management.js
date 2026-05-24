import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, getAllBabies } from '../api.js';
import { showLoading, hideLoading, formatBabyAge, formatValue, formatDate, statusClass, sortByDateAsc, sortByDateDesc, openDocumentModal } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

const normalize = (baby) => ({
  ...baby,
  name: baby.name || `${baby.first_name} ${baby.middle_name || ''} ${baby.last_name}`.trim(),
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

function getNextSchedule(baby) {
  return sortByDateAsc((baby.upcoming || []).filter(item => item.status !== 'Completed'), 'targetDate')[0] || { vaccine: getTranslation('dashboard.up_to_date'), targetDate: '-', status: 'Completed' };
}
s
function renderDirectory(query = '') {
  const list = document.getElementById('directoryList');
  const normalized = query.trim().toLowerCase();
  const babies = allBabies.filter(baby => {
    if (!normalized) return true;
    return [baby.name, baby.registrationNumber, baby.guardianName, baby.motherName, baby.fatherName]
      .some(value => String(value || '').toLowerCase().includes(normalized));
  });

  if (!babies.length) {
    list.innerHTML = `<div class="empty-state">${getTranslation('admin.no_records')}</div>`;
    return;
  }

  list.innerHTML = babies.map(baby => {
    const doc = (baby.documents || [])[0] || { status: baby.registrationStatus || 'Pending', filename: '-' };
    const next = getNextSchedule(baby);
    const vaccines = sortByDateDesc(baby.vaccinations || [], 'date').slice(0, 3);
    return `
      <div class="record-card admin-record-card">
        <div class="record-card-header">
          <div>
            <h3>${baby.name}</h3>
            <div class="record-meta compact-meta">
              <span>${getTranslation('profile.reg_no')}: ${baby.registrationNumber}</span>
              <span>${getTranslation('dashboard.dob')}: ${formatDate(baby.dob)}</span>
              <span>${getTranslation('profile.sex')}: ${formatValue(baby.sex)}</span>
              <span>${getTranslation('dashboard.age')}: ${formatBabyAge(baby.dob)}</span>
              <span>${getTranslation('dashboard.next_vaccine')}: ${next.vaccine} (${formatDate(next.targetDate)})</span>
            </div>
          </div>
          <span class="badge ${statusClass(baby.registrationStatus || doc.status)}">${baby.registrationStatus || doc.status}</span>
        </div>
        <div class="record-meta">
          <span>${getTranslation('admin.document_status')}: <span class="badge ${statusClass(doc.status)}">${doc.status}</span></span>
          <span>${getTranslation('profile.private_clinic')}: ${baby.privateClinic ? (baby.privateClinicName || 'Yes') : 'No'}</span>
        </div>
        <details class="record-details">
          <summary>${getTranslation('admin.view_profile')}</summary>
          <div class="info-grid admin-profile-grid" style="margin-top:12px;">
            <div class="info-item"><span>${getTranslation('dashboard.dob')}</span><strong>${formatDate(baby.dob)}</strong></div>
            <div class="info-item"><span>${getTranslation('profile.sex')}</span><strong>${formatValue(baby.sex)}</strong></div>
            <div class="info-item"><span>${getTranslation('profile.place_of_birth')}</span><strong>${formatValue(baby.placeOfBirth)}</strong></div>
            <div class="info-item admin-guardian-item"><span>${getTranslation('profile.guardian')}</span><strong>${formatValue(baby.guardianName)}</strong></div>
            <div class="info-item"><span>${getTranslation('profile.phone')}</span><strong>${formatValue(baby.guardianPhone)}</strong></div>
            <div class="info-item admin-address-item"><span>${getTranslation('profile.address')}</span><strong>${formatValue(baby.guardianAddress)}</strong></div>
            <div class="info-item"><span>${getTranslation('profile.mother')}</span><strong>${formatValue(baby.motherName)}</strong></div>
          </div>
          <div class="mini-record-list">
            <strong>${getTranslation('profile.history')}</strong>
            ${vaccines.length ? vaccines.map(v => `<span>${formatDate(v.date)} • ${v.vaccine} • Dose ${v.dose || '-'} • ${v.privateClinic ? (v.source || 'Private Clinic') : (v.worker || 'BHW')} • ${v.status || 'Completed'}</span>`).join('') : `<span>${getTranslation('profile.no_history')}</span>`}
          </div>
        </details>
        <div class="document-chip-list admin-doc-mini">
          ${(baby.documents || []).map(d => `
            <div class="document-chip">
              <div><strong>${d.type}</strong><small>${d.filename} • ${formatDate(d.uploadDate)}</small>${d.comment ? `<small class="comment-text">${d.comment}</small>` : ''}</div>
              <div class="document-chip-actions"><span class="badge ${statusClass(d.status)}">${d.status}</span><button type="button" class="btn btn-outline btn-sm admin-view-doc" data-baby-id="${baby.id}" data-doc-id="${d.id}">${getTranslation('admin.preview')}</button></div>
            </div>
          `).join('')}
        </div>
        <div class="record-actions">
          <a class="btn btn-primary" href="vaccination-entry.html?baby=${baby.id}"><i class="fas fa-syringe"></i> ${getTranslation('nav.log_vaccine')}</a>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.admin-view-doc').forEach(button => {
    button.addEventListener('click', () => {
      const baby = babies.find(item => String(item.id) === String(button.dataset.babyId));
      const doc = (baby?.documents || []).find(item => String(item.id) === String(button.dataset.docId));
      if (baby && doc) openDocumentModal(doc, baby);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();

  try {
    const data = await apiFetch('/babies');
    if (data && Array.isArray(data)) {
      allBabies = data.map(normalize);
    } else {
      throw new Error('Fallback');
    }
  } catch (err) {
    console.warn('[API] Falling back to mock babies:', err.message);
    allBabies = getAllBabies();
  }

  renderDirectory();
  const search = document.getElementById('adminBabySearch');
  search?.addEventListener('input', (event) => renderDirectory(event.target.value));
  hideLoading();
});