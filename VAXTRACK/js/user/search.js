import { requireAuth, setupNav } from '../auth.js';
import { getAllBabies, apiFetch } from '../api.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAuth();

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

function statusClass(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function filterBabies(query) {
  const results = document.getElementById('searchResults');
  const babies = allBabies;
  if (!results) return;

  if (!query.trim()) {
    results.innerHTML = '';
    return;
  }

  const normalized = query.toLowerCase();
  const filtered = babies.filter(b => 
    b.name.toLowerCase().includes(normalized) ||
    (b.registrationNumber || '').toLowerCase().includes(normalized)
  );
  
  if (filtered.length === 0) {
    results.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search" style="font-size:2rem; color:var(--color-muted); margin-bottom:10px;"></i>
        <p>${getTranslation('search.no_results')} "${query}".</p>
      </div>
    `;
    return;
  }
  
  results.innerHTML = filtered.map(b => {
    const doc = (b.documents || [])[0] || { status: b.registrationStatus || 'Pending' };
    return `
      <div class="record-card">
        <h3>${b.name} <span class="badge ${statusClass(doc.status)}">${doc.status}</span></h3>
        <div class="record-meta">
          <span>${getTranslation('dashboard.dob')}: ${b.dob}</span>
          <span>Reg No: ${b.registrationNumber}</span>
          <span>${getTranslation('profile.mother')}: ${b.motherName}</span>
        </div>
        <a href="baby-profile.html?id=${b.id}" class="btn btn-outline" style="width: 100%;"><i class="fas fa-user"></i> ${getTranslation('search.view_profile')}</a>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();

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

  const input = document.getElementById('searchInput');
  input.addEventListener('input', (e) => filterBabies(e.target.value));
});
