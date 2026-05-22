export function showLoading(msg = "Naglo-load...") {
  const overlay = document.getElementById('loading-overlay');
  const text = document.getElementById('loaderText');
  if (overlay) overlay.classList.remove('hidden');
  if (text) text.textContent = msg;
}

export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export function formatValue(value, fallback = 'Not provided') {
  return value || fallback;
}

export function formatDate(dateStr, fallback = '-') {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatBabyAge(dob) {
  if (!dob) return 'Not provided';
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 'Not provided';
  const today = new Date();
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
  if (today.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) return 'Not yet born';
  if (months < 1) {
    const days = Math.max(0, Math.floor((today - birthDate) / (1000 * 60 * 60 * 24)));
    return `${days} day${days === 1 ? '' : 's'} old`;
  }
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} old`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths ? `${years} yr ${remainingMonths} mo old` : `${years} yr old`;
}

export function statusClass(status = '') {
  return String(status).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function sortByDateAsc(items = [], key = 'date') {
  return [...items].sort((a, b) => new Date(a[key] || '9999-12-31') - new Date(b[key] || '9999-12-31'));
}

export function sortByDateDesc(items = [], key = 'date') {
  return [...items].sort((a, b) => new Date(b[key] || '0000-01-01') - new Date(a[key] || '0000-01-01'));
}

export function createDocumentPreviewHtml(doc = {}) {
  if (doc.dataUrl && doc.mimeType?.startsWith('image/')) {
    return `<img src="${doc.dataUrl}" alt="${doc.filename}" class="document-preview-image">`;
  }
  if (doc.dataUrl && doc.mimeType === 'application/pdf') {
    return `<iframe src="${doc.dataUrl}" title="${doc.filename}" class="document-preview-frame"></iframe>`;
  }
  return `
    <div class="document-preview-placeholder">
      <i class="fas fa-file-alt"></i>
      <strong>${doc.filename || 'Document file'}</strong>
      <span>Preview file metadata only. Re-uploaded files are stored locally in this prototype.</span>
    </div>
  `;
}

export function openDocumentModal(doc = {}, baby = {}) {
  const existing = document.getElementById('documentPreviewModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'documentPreviewModal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card document-modal" role="dialog" aria-modal="true" aria-label="Document preview">
      <div class="modal-header">
        <div>
          <p class="page-kicker">Document Preview</p>
          <h2>${doc.type || 'Document'}</h2>
          <p>${baby.name || ''} ${baby.registrationNumber ? '• ' + baby.registrationNumber : ''}</p>
        </div>
        <button type="button" class="modal-close" aria-label="Close preview"><i class="fas fa-times"></i></button>
      </div>
      <div class="document-preview-meta">
        <span><strong>File:</strong> ${doc.filename || '-'}</span>
        <span><strong>Status:</strong> ${doc.status || '-'}</span>
        <span><strong>Uploaded:</strong> ${formatDate(doc.uploadDate)}</span>
      </div>
      ${doc.comment ? `<div class="comment-box"><strong>Admin comment:</strong> ${doc.comment}</div>` : ''}
      <div class="document-preview-area">${createDocumentPreviewHtml(doc)}</div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.remove();
  });
}
