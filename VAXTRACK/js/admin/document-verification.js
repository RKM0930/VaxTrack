import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, updateDocumentStatus } from '../api.js';
import {
  showLoading,
  hideLoading,
  showToast,
  formatDate,
  statusClass,
  sortByDateDesc,
  createDocumentPreviewHtml
} from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

const filterState = {
  status: 'All Documents'
};

let allBabies = [];

const statusOrder = {
  Pending: 0,
  'Re-upload Requested': 1,
  Rejected: 2,
  Approved: 3
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isReuploadRequested(doc = {}) {
  const status = String(doc.status || '').toLowerCase();
  const comment = String(doc.comment || '').toLowerCase();
  return status === 'rejected' && /(re-?upload|upload a clearer|clearer copy|correct document)/i.test(comment);
}

function getDisplayStatus(doc = {}) {
  if (isReuploadRequested(doc)) return 'Re-upload Requested';
  return doc.status || 'Pending';
}

function normalizeBabyRecord(baby = {}) {
  return {
    ...baby,
    name: baby.name || [baby.first_name, baby.middle_name, baby.last_name].filter(Boolean).join(' ').trim(),
    registrationNumber: baby.registrationNumber || baby.registration_number,
    guardianName: baby.guardianName || baby.guardian_name,
    guardianPhone: baby.guardianPhone || baby.guardian_phone,
    documents: baby.documents || []
  };
}

async function loadDocumentsFromDatabase() {
  const data = await apiFetch('/babies');
  allBabies = Array.isArray(data) ? data.map(normalizeBabyRecord) : [];
}

function getDocuments() {
  const docs = [];
  allBabies.forEach(baby => {
    (baby.documents || []).forEach(doc => {
      docs.push({ ...doc, baby, displayStatus: getDisplayStatus(doc) });
    });
  });

  return sortByDateDesc(docs, 'uploadDate').sort((a, b) => (
    (statusOrder[a.displayStatus] ?? 9) - (statusOrder[b.displayStatus] ?? 9)
  ));
}

function getFilteredDocuments() {
  const docs = getDocuments();
  if (filterState.status === 'All Documents') return docs;
  return docs.filter(doc => doc.displayStatus === filterState.status);
}

function renderFilterButtons() {
  document.querySelectorAll('[data-doc-filter]').forEach(button => {
    const isActive = button.dataset.docFilter === filterState.status;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function renderDocs() {
  const tbody = document.getElementById('docList');
  const docs = getFilteredDocuments();

  renderFilterButtons();

  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No documents found for this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(doc => `
    <tr>
      <td>
        <div class="admin-document-cell">
          <div class="admin-file-icon"><i class="fas fa-file-image"></i></div>
          <div>
            <strong>${escapeHtml(doc.type || 'Document')}</strong><br>
            <small class="admin-muted">${escapeHtml(doc.filename || 'Uploaded file')}</small>
          </div>
        </div>
      </td>
      <td><strong>${escapeHtml(doc.baby?.name || 'Unknown baby')}</strong><br><small class="admin-muted">${escapeHtml(doc.baby?.registrationNumber || '-')}</small></td>
      <td>${formatDate(doc.uploadDate)}</td>
      <td><span class="badge ${statusClass(doc.displayStatus)}">${escapeHtml(doc.displayStatus)}</span></td>
      <td>
        <button type="button" class="btn btn-outline btn-sm review-doc-btn" data-id="${escapeHtml(doc.id)}"><i class="fas fa-clipboard-check"></i> Review</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.review-doc-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const doc = getDocuments().find(item => String(item.id) === String(e.currentTarget.dataset.id));
    if (doc) openReviewModal(doc);
  }));
}

function buildReviewModal(doc) {
  const baby = doc.baby || {};
  const displayStatus = getDisplayStatus(doc);
  const uploadedDetails = [
    ['Document type', doc.type || 'Document'],
    ['Filename', doc.filename || '-'],
    ['Uploaded', formatDate(doc.uploadDate)],
    ['MIME type', doc.mimeType || 'Not provided'],
    ['File size', doc.size ? `${Math.round(Number(doc.size) / 1024)} KB` : 'Not provided'],
    ['Current status', displayStatus]
  ];

  const babyDetails = [
    ['Baby name', baby.name || '-'],
    ['Registration ID', baby.registrationNumber || '-'],
    ['Parent/Guardian', baby.guardianName || baby.parentName || '-'],
    ['Contact number', baby.contactNumber || baby.guardianContact || '-']
  ];

  return `
    <div class="modal-card admin-doc-review-modal" role="dialog" aria-modal="true" aria-label="Document review">
      <div class="modal-header admin-doc-review-header">
        <div>
          <p class="page-kicker">Document Review</p>
          <h2>${escapeHtml(doc.type || 'Uploaded Document')}</h2>
          <p>${escapeHtml(baby.name || 'Unknown baby')} ${baby.registrationNumber ? '• ' + escapeHtml(baby.registrationNumber) : ''}</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close review"><i class="fas fa-times"></i></button>
      </div>

      <div class="admin-doc-review-status-row">
        <span class="badge ${statusClass(displayStatus)}">${escapeHtml(displayStatus)}</span>
        ${doc.comment ? `<span class="admin-muted">Last remark available below</span>` : `<span class="admin-muted">No admin/BHW remark yet</span>`}
      </div>

      <div class="admin-doc-review-grid">
        <section class="admin-doc-review-panel">
          <h3>Uploaded file details</h3>
          <dl class="admin-detail-list">
            ${uploadedDetails.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
          </dl>
        </section>

        <section class="admin-doc-review-panel">
          <h3>Baby record</h3>
          <dl class="admin-detail-list">
            ${babyDetails.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
          </dl>
        </section>
      </div>

      <section class="admin-doc-review-panel admin-doc-remarks-panel">
        <h3>Admin/BHW remarks</h3>
        ${doc.comment ? `<div class="comment-box">${escapeHtml(doc.comment)}</div>` : `<div class="admin-empty-note">No remarks have been added for this document.</div>`}
        <label for="docReviewComment">Comment / reason</label>
        <textarea id="docReviewComment" class="form-control admin-doc-comment-input" rows="3" placeholder="Add a rejection reason, verification note, or re-upload instruction..."></textarea>
      </section>

      <section class="admin-doc-review-panel">
        <div class="admin-doc-preview-heading">
          <h3>Preview document</h3>
          <span class="admin-muted">Review the uploaded file before approving or requesting changes.</span>
        </div>
        <div class="document-preview-area">${createDocumentPreviewHtml(doc)}</div>
      </section>

      <div class="admin-doc-review-actions">
        <button type="button" class="btn btn-outline admin-doc-preview-focus"><i class="fas fa-eye"></i> Preview Document</button>
        <button type="button" class="btn btn-success admin-doc-approve" ${displayStatus === 'Approved' ? 'disabled' : ''}><i class="fas fa-check"></i> Approve</button>
        <button type="button" class="btn btn-warning admin-doc-reject"><i class="fas fa-times"></i> Reject with Comment</button>
        <button type="button" class="btn btn-outline admin-doc-reupload"><i class="fas fa-undo"></i> Request Re-upload</button>
      </div>
    </div>
  `;
}

function openReviewModal(doc) {
  document.getElementById('documentReviewModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'documentReviewModal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = buildReviewModal(doc);
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  const getComment = () => modal.querySelector('#docReviewComment')?.value?.trim() || '';
  const previewArea = modal.querySelector('.document-preview-area');

  modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  modal.querySelector('.admin-doc-preview-focus')?.addEventListener('click', () => {
    previewArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  modal.querySelector('.admin-doc-approve')?.addEventListener('click', () => handleAction(doc.id, 'Approved', getComment() || 'Verified by BHW.', closeModal));
  modal.querySelector('.admin-doc-reject')?.addEventListener('click', () => handleAction(doc.id, 'Rejected', getComment(), closeModal));
  modal.querySelector('.admin-doc-reupload')?.addEventListener('click', () => {
    const comment = getComment() || 'Re-upload requested: Please upload a clearer or correct document copy.';
    handleAction(doc.id, 'Rejected', comment, closeModal);
  });
}

async function handleAction(id, newStatus, comment = '', onSuccess = null) {
  if (newStatus === 'Rejected' && !comment.trim()) {
    showToast('Required ang comment kapag rejected ang document.', 'error');
    return;
  }

  try {
    showLoading(getTranslation('admin.update_record'));
    await updateDocumentStatus(id, newStatus, comment);
    showToast(
      getTranslation(newStatus === 'Approved' ? 'admin.doc_approved' : 'admin.doc_rejected'),
      newStatus === 'Approved' ? 'success' : 'warning'
    );
    if (typeof onSuccess === 'function') onSuccess();
    await loadDocumentsFromDatabase();
    renderDocs();
  } catch (err) {
    showToast(err.message || 'Unable to update document.', 'error');
  } finally {
    hideLoading();
  }
}

function setupDocumentFilters() {
  document.querySelectorAll('[data-doc-filter]').forEach(button => {
    button.addEventListener('click', () => {
      filterState.status = button.dataset.docFilter;
      renderDocs();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  setupDocumentFilters();
  showLoading();
  try {
    await loadDocumentsFromDatabase();
  } catch (err) {
    console.warn('[API] Unable to load documents from database:', err.message);
    allBabies = [];
  }
  renderDocs();
  hideLoading();
});
