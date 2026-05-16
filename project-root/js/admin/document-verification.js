import { requireAdminAuth, setupNav } from '../auth.js';
import { mockBabies, apiFetch } from '../api.js';
import { showLoading, hideLoading, showToast } from '../utils.js';

requireAdminAuth();

function renderPendingDocs() {
  const tbody = document.getElementById('docList');
  const pendingDocs = [];
  mockBabies.forEach(b => {
    b.documents.forEach(d => { if (d.status === 'Pending') pendingDocs.push({ ...d, babyName: b.name }); });
  });

  if (pendingDocs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No pending documents to verify.</td></tr>`;
    return;
  }

  tbody.innerHTML = pendingDocs.map(doc => `
    <tr>
      <td><strong>${doc.type}</strong><br><small style="color:var(--color-muted)">${doc.filename}</small></td>
      <td>${doc.babyName}</td>
      <td>${doc.uploadDate}</td>
      <td>
        <button class="btn btn-success approve-btn" data-id="${doc.id}" style="padding: 6px 12px; font-size: 0.8rem;">Approve</button>
        <button class="btn btn-warning flag-btn" data-id="${doc.id}" style="padding: 6px 12px; font-size: 0.8rem;">Flag</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', async (e) => handleAction(e.target.dataset.id, 'Approved')));
  document.querySelectorAll('.flag-btn').forEach(btn => btn.addEventListener('click', async (e) => handleAction(e.target.dataset.id, 'Flagged')));
}

async function handleAction(id, newStatus) {
  showLoading("Updating Record...");
  await apiFetch(`/documents/${id}`, { method: 'PATCH' });
  mockBabies.forEach(b => b.documents.forEach(d => { if(d.id == id) d.status = newStatus; }));
  showToast(`Document successfully ${newStatus.toLowerCase()}.`, newStatus === 'Approved' ? 'success' : 'warning');
  renderPendingDocs();
  hideLoading();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  setTimeout(() => { renderPendingDocs(); hideLoading(); }, 300);
});