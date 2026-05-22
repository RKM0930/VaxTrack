import { requireAdminAuth, setupNav } from '../auth.js';
import { getAllBabies, updateDocumentStatus, apiFetch } from '../api.js';
import { showLoading, hideLoading, showToast, formatDate, statusClass, sortByDateDesc, openDocumentModal } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

function getDocuments() {
  const docs = [];
  getAllBabies().forEach(baby => {
    (baby.documents || []).forEach(doc => docs.push({ ...doc, baby }));
  });
  return sortByDateDesc(docs, 'uploadDate').sort((a, b) => {
    const order = { Pending: 0, Rejected: 1, Approved: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });
}

function renderDocs() {
  const tbody = document.getElementById('docList');
  const docs = getDocuments();

  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${getTranslation('admin.no_pending_docs')}</td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(doc => `
    <tr>
      <td><strong>${doc.type}</strong><br><small style="color:var(--color-muted)">${doc.filename}</small>${doc.comment ? `<br><small class="comment-text">${doc.comment}</small>` : ''}</td>
      <td>${doc.baby.name}<br><small style="color:var(--color-muted)">${doc.baby.registrationNumber}</small></td>
      <td>${formatDate(doc.uploadDate)}</td>
      <td><span class="badge ${statusClass(doc.status)}">${doc.status}</span></td>
      <td>
        <div class="inline-actions">
          <button type="button" class="btn btn-outline preview-btn" data-id="${doc.id}" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fas fa-eye"></i> ${getTranslation('admin.preview')}</button>
          <button class="btn btn-success approve-btn" data-id="${doc.id}" style="padding: 6px 12px; font-size: 0.8rem;" ${doc.status === 'Approved' ? 'disabled' : ''}>${getTranslation('admin.approve')}</button>
          <button class="btn btn-warning reject-btn" data-id="${doc.id}" style="padding: 6px 12px; font-size: 0.8rem;" ${doc.status === 'Rejected' ? 'disabled' : ''}>${getTranslation('admin.reject')}</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.preview-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const doc = docs.find(item => String(item.id) === String(e.currentTarget.dataset.id));
    if (doc) openDocumentModal(doc, doc.baby);
  }));
  document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', (e) => handleAction(e.currentTarget.dataset.id, 'Approved')));
  document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', (e) => handleAction(e.currentTarget.dataset.id, 'Rejected')));
}

async function handleAction(id, newStatus) {
  let comment = '';
  if (newStatus === 'Rejected') {
    comment = window.prompt(`${getTranslation('admin.rejection_reason')}:`, 'Blurry or incomplete document. Please upload a clearer copy.') || '';
    if (!comment.trim()) {
      showToast('Required ang comment kapag rejected ang document.', 'error');
      return;
    }
  }

  showLoading(getTranslation('admin.update_record'));
  await apiFetch(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus, comment }) });
  updateDocumentStatus(id, newStatus, comment);
  showToast(getTranslation(newStatus === 'Approved' ? 'admin.doc_approved' : 'admin.doc_rejected'), newStatus === 'Approved' ? 'success' : 'warning');
  renderDocs();
  hideLoading();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupI18n();
  showLoading();
  setTimeout(() => { renderDocs(); hideLoading(); }, 300);
});
