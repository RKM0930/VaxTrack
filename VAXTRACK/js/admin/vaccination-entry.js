import { requireAdminAuth, setupNav } from '../auth.js';
import { getAllBabies, addVaccinationRecord, apiFetch } from '../api.js';
import { showLoading, hideLoading, showToast, formatDate, statusClass, sortByDateAsc } from '../utils.js';
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

function renderVaccineEntry() {
  const area = document.getElementById('vaccineEntryArea');
  const babies = allBabies;
  const params = new URLSearchParams(window.location.search);
  const selectedBaby = params.get('baby') || '';

  area.innerHTML = `
    <div class="vaccine-entry-grid">
      <div class="card">
        <h2 class="card-title">${getTranslation('admin.log_vaccination')}</h2>
        <form id="vaccineForm">
          <div class="field-group">
            <label>${getTranslation('admin.choose_baby')}</label>
            <select name="babyId" id="babySelect" required>
              <option value="">${getTranslation('admin.choose_baby')}</option>
              ${babies.map(b => `<option value="${b.id}" ${String(b.id) === selectedBaby ? 'selected' : ''}>${b.name} - ${b.registrationNumber}</option>`).join('')}
            </select>
          </div>
          <div class="form-grid">
            <div class="field-group"><label>${getTranslation('admin.vaccine_name')}</label><input type="text" name="vaccine" placeholder="e.g. BCG" required></div>
            <div class="field-group"><label>${getTranslation('admin.vaccination_date')}</label><input type="date" name="date" required></div>
          </div>
          <div class="form-grid">
            <div class="field-group"><label>${getTranslation('admin.dose')}</label><input type="number" name="dose" min="1" placeholder="1" required></div>
            <div class="field-group"><label>${getTranslation('admin.batch_no')}</label><input type="text" name="batch" placeholder="Batch No."></div>
          </div>
          <div class="field-group"><label>${getTranslation('admin.worker_name')}</label><input type="text" name="worker" value="${localStorage.getItem('vax_name') || getTranslation('role.health_worker')}" required></div>
          <section class="form-section compact-source-section">
            <label class="toggle-row">
              <input type="checkbox" id="privateClinicRecord" name="privateClinic">
              <span>${getTranslation('admin.private_clinic')}</span>
            </label>
            <div class="field-group hidden" id="clinicNameGroup" style="margin-top:12px;"><label>${getTranslation('admin.clinic_name')}</label><input type="text" name="clinicName" placeholder="Clinic name"></div>
          </section>
          <button type="submit" class="btn btn-primary" style="width:100%;"><i class="fas fa-save"></i> ${getTranslation('admin.save_record')}</button>
        </form>
      </div>
      <div class="card" id="selectedBabySchedule">
        <h3 class="card-title">${getTranslation('dashboard.schedule_details')}</h3>
        <div class="empty-state compact-empty">${getTranslation('admin.choose_baby')}</div>
      </div>
    </div>
  `;

  document.getElementById('vaccineForm').addEventListener('submit', handleSubmit);
  document.getElementById('privateClinicRecord').addEventListener('change', (event) => {
    document.getElementById('clinicNameGroup').classList.toggle('hidden', !event.target.checked);
  });
  document.getElementById('babySelect').addEventListener('change', (event) => renderSelectedBabySchedule(event.target.value));
  if (selectedBaby) renderSelectedBabySchedule(selectedBaby);
}

function renderSelectedBabySchedule(babyId) {
  const container = document.getElementById('selectedBabySchedule');
  const baby = allBabies.find(item => String(item.id) === String(babyId));
  if (!baby) {
    container.innerHTML = `<h3 class="card-title">${getTranslation('dashboard.schedule_details')}</h3><div class="empty-state compact-empty">${getTranslation('admin.choose_baby')}</div>`;
    return;
  }
  const upcoming = sortByDateAsc(baby.upcoming || [], 'targetDate');
  container.innerHTML = `
    <h3 class="card-title">${baby.name}</h3>
    <div class="schedule-list">
      ${upcoming.length ? upcoming.map(item => `
        <div class="schedule-item">
          <div><strong>${item.vaccine}</strong><br><small>${formatDate(item.targetDate)}</small></div>
          <span class="badge ${statusClass(item.status)}">${item.status}</span>
        </div>
      `).join('') : `<div class="empty-state compact-empty">${getTranslation('profile.no_upcoming')}</div>`}
    </div>
  `;
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
    batch: (data.get('batch') || '').trim() || (isPrivate ? 'Private Clinic Record' : 'Not provided'),
    worker: (data.get('worker') || '').trim(),
    privateClinic: isPrivate,
    clinicName: (data.get('clinicName') || '').trim()
  };

  try {
    showLoading(getTranslation('admin.update_record'));
    await apiFetch(`/babies/${babyId}/vaccinations`, { method: 'POST', body: JSON.stringify(record) });
    addVaccinationRecord(babyId, record);
    showToast(getTranslation('admin.vaccine_saved'));
    form.reset();
    document.getElementById('clinicNameGroup')?.classList.add('hidden');
    renderSelectedBabySchedule(babyId);
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

  renderVaccineEntry();
  hideLoading();
});