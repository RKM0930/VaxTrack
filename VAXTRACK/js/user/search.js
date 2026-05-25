import { requireAuth, setupNav } from '../auth.js';
import { apiFetch } from '../api.js';
import { setupI18n, getTranslation } from '../i18n.js';
import { filterActiveBabies } from '../utils.js';

requireAuth();

let babies = [];

function statusClass(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function normalizeBaby(baby = {}) {
  return {
    ...baby,
    name: baby.name || [baby.first_name, baby.middle_name, baby.last_name].filter(Boolean).join(' ').trim(),
    registrationNumber: baby.registrationNumber || baby.registration_number,
    registrationStatus: baby.registrationStatus || baby.registration_status,
    motherName: baby.motherName || baby.mother_name || '',
    documents: baby.documents || []
  };
}

async function loadBabies() {
  try {
    const data = await apiFetch('/babies');
    babies = Array.isArray(data) ? filterActiveBabies(data.map(normalizeBaby)) : [];
  } catch (err) {
    console.warn('[API] Unable to load search records from database:', err.message);
    babies = [];
  }
}

function filterBabies(query) {
  const results = document.getElementById('searchResults');
  if (!results) return;

  if (!query.trim()) {
    results.innerHTML = '';
    return;
  }

  const normalized = query.toLowerCase();
  const filtered = babies.filter(b => 
    (b.name || '').toLowerCase().includes(normalized) ||
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
  await loadBabies();
  const input = document.getElementById('searchInput');
  input.addEventListener('input', (e) => filterBabies(e.target.value));
});
