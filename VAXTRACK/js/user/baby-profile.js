/* FILE: js/user/baby-profile.js */
import { requireAuth } from '../auth.js';
import { getBabyById } from '../api.js';
import { showLoading, hideLoading, formatBabyAge, formatValue, formatDate, statusClass, sortByDateAsc, sortByDateDesc, openDocumentModal } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAuth();

let currentBabyRecord = null;

document.addEventListener('DOMContentLoaded', () => {
  setupI18n();
  showLoading();
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    currentBabyRecord = getBabyById(params.get('id'));

    if (!currentBabyRecord) {
      document.getElementById('profileContent').innerHTML = `<div class="empty-state">${getTranslation('profile.not_found')}</div>`;
      hideLoading(); return;
    }

    renderProfileData();
    hideLoading();
  }, 300);
});

function bindDocumentButtons() {
  document.querySelectorAll('.profile-doc-view').forEach(button => {
    button.addEventListener('click', () => {
      const doc = (currentBabyRecord.documents || []).find(item => String(item.id) === String(button.dataset.docId));
      if (doc) openDocumentModal(doc, currentBabyRecord);
    });
  });
}

function renderDocuments() {
  const container = document.getElementById('profileDocuments');
  const docs = sortByDateDesc(currentBabyRecord.documents || [], 'uploadDate');
  if (!container) return;
  if (!docs.length) {
    container.innerHTML = `<div class="empty-state compact-empty">${getTranslation('dashboard.no_documents')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="document-chip-list">
      ${docs.map(doc => `
        <div class="document-chip">
          <div>
            <strong>${doc.type}</strong>
            <small>${doc.filename} • ${formatDate(doc.uploadDate)}</small>
            ${doc.comment ? `<small class="comment-text">${doc.comment}</small>` : ''}
          </div>
          <div class="document-chip-actions">
            <span class="badge ${statusClass(doc.status)}">${doc.status}</span>
            <button type="button" class="btn btn-outline btn-sm profile-doc-view" data-doc-id="${doc.id}">${getTranslation('profile.view_document')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  bindDocumentButtons();
}

function renderProfileData() {
  const doc = (currentBabyRecord.documents || [])[0] || { status: currentBabyRecord.registrationStatus || 'Pending', filename: '-' };
  document.getElementById('babyName').textContent = currentBabyRecord.name;
  document.getElementById('babyProfileSummary').textContent = `${getTranslation('profile.reg_no')}: ${currentBabyRecord.registrationNumber} • ${getTranslation('dashboard.age')}: ${formatBabyAge(currentBabyRecord.dob)} • ${getTranslation('admin.document_status')}: ${doc.status}`;
  document.getElementById('babyDetails').innerHTML = `
    <h3 class="card-title" data-i18n="profile.basic_info">${getTranslation('profile.basic_info')}</h3>
    <div class="info-grid">
      <div class="info-item"><span>${getTranslation('dashboard.dob')}</span><strong>${formatDate(currentBabyRecord.dob)}</strong></div>
      <div class="info-item"><span>${getTranslation('dashboard.age')}</span><strong>${formatBabyAge(currentBabyRecord.dob)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.sex')}</span><strong>${formatValue(currentBabyRecord.sex)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.place_of_birth')}</span><strong>${formatValue(currentBabyRecord.placeOfBirth)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.birth_weight')}</span><strong>${formatValue(currentBabyRecord.birthWeight)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.blood_type')}</span><strong>${formatValue(currentBabyRecord.bloodType)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.mother')}</span><strong>${formatValue(currentBabyRecord.motherName)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.father')}</span><strong>${formatValue(currentBabyRecord.fatherName)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.guardian')}</span><strong>${formatValue(currentBabyRecord.guardianName)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.phone')}</span><strong>${formatValue(currentBabyRecord.guardianPhone)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.address')}</span><strong>${formatValue(currentBabyRecord.guardianAddress)}</strong></div>
      <div class="info-item"><span>${getTranslation('profile.private_clinic')}</span><strong>${currentBabyRecord.privateClinic ? (currentBabyRecord.privateClinicName || 'Yes') : 'No'}</strong></div>
      <div class="info-item"><span>${getTranslation('admin.registration_status')}</span><strong><span class="badge ${statusClass(currentBabyRecord.registrationStatus || doc.status)}">${currentBabyRecord.registrationStatus || doc.status}</span></strong></div>
      <div class="info-item"><span>${getTranslation('admin.document_status')}</span><strong><span class="badge ${statusClass(doc.status)}">${doc.status}</span></strong></div>
    </div>
  `;

  renderDocuments();

  document.getElementById('testHistoryTable').innerHTML = (currentBabyRecord.testHistory || []).length ? sortByDateDesc(currentBabyRecord.testHistory, 'date').map(t => `
    <tr><td>${t.test}</td><td>${formatDate(t.date)}</td><td>${t.result}</td></tr>
  `).join('') : `<tr><td colspan="3" class="text-center text-muted">${getTranslation('profile.no_tests')}</td></tr>`;

  document.getElementById('historyTable').innerHTML = (currentBabyRecord.vaccinations || []).length ? sortByDateDesc(currentBabyRecord.vaccinations, 'date').map(v => `
    <tr><td>${v.vaccine}</td><td>${formatDate(v.date)}</td><td>${v.dose}</td><td>${v.batch || '-'}</td><td>${v.privateClinic ? (v.source || 'Private Clinic') : v.worker}</td><td><span class="badge ${statusClass(v.status)}">${v.status}</span></td></tr>
  `).join('') : `<tr><td colspan="6" class="text-center text-muted">${getTranslation('profile.no_history')}</td></tr>`;

  document.getElementById('upcomingTable').innerHTML = (currentBabyRecord.upcoming || []).length ? sortByDateAsc(currentBabyRecord.upcoming, 'targetDate').map(u => `
    <tr><td>${u.vaccine}</td><td>${formatDate(u.targetDate)}</td><td><span class="badge ${statusClass(u.status)}">${u.status}</span></td></tr>
  `).join('') : `<tr><td colspan="3" class="text-center text-muted">${getTranslation('profile.no_upcoming')}</td></tr>`;
}
