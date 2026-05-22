import { requireAuth } from '../auth.js';
import { apiFetch, registerBabyRecord, isDuplicateBabyRecord } from '../api.js';
import { setupI18n, getTranslation } from '../i18n.js';
import { showLoading, hideLoading, showToast, createDocumentPreviewHtml } from '../utils.js';

requireAuth();

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxFileSize = 5 * 1024 * 1024;
let selectedDocumentDataUrl = '';

function validateFile(file) {
  if (!file) return false;
  if (!allowedTypes.includes(file.type)) {
    showToast(getTranslation('baby_register.file_invalid'), 'error');
    return false;
  }
  if (file.size > maxFileSize) {
    showToast(getTranslation('baby_register.file_too_large'), 'error');
    return false;
  }
  return true;
}

function setUploadProgress(percent) {
  const wrap = document.getElementById('uploadProgressWrap');
  const bar = document.getElementById('uploadProgressBar');
  const text = document.getElementById('uploadProgressText');
  if (!wrap || !bar || !text) return;
  wrap.classList.remove('hidden');
  bar.style.width = `${percent}%`;
  text.textContent = `${percent}%`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    reader.onloadstart = () => setUploadProgress(8);
    reader.onload = () => {
      setUploadProgress(100);
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderFilePreview(file) {
  const preview = document.getElementById('filePreview');
  if (!preview) return;
  selectedDocumentDataUrl = '';

  if (!file) {
    preview.innerHTML = `<p class="file-preview-empty">${getTranslation('baby_register.no_file')}</p>`;
    return;
  }

  if (!validateFile(file)) {
    preview.innerHTML = `<p class="file-preview-empty">${getTranslation('baby_register.no_file')}</p>`;
    return;
  }

  try {
    selectedDocumentDataUrl = await readFileAsDataUrl(file);
    preview.innerHTML = `
      <div class="file-preview-header">
        <strong>${getTranslation('baby_register.preview')}</strong>
        <span>${file.name}</span>
      </div>
      ${createDocumentPreviewHtml({ filename: file.name, mimeType: file.type, dataUrl: selectedDocumentDataUrl })}
    `;
  } catch (err) {
    preview.innerHTML = `<p class="file-preview-empty">Unable to preview file.</p>`;
  }
}

function getPayload(formData, documentFile) {
  const firstName = (formData.get('firstName') || '').trim();
  const middleName = (formData.get('middleName') || '').trim();
  const lastName = (formData.get('lastName') || '').trim();
  const guardianHouseStreet = (formData.get('guardianHouseStreet') || '').trim();
  const guardianAddress = guardianHouseStreet;

  return {
    firstName,
    middleName,
    lastName,
    name: [firstName, middleName, lastName].filter(Boolean).join(' '),
    dob: formData.get('dob'),
    sex: formData.get('sex'),
    placeOfBirth: (formData.get('placeOfBirth') || '').trim(),
    birthWeight: (formData.get('birthWeight') || '').trim(),
    bloodType: (formData.get('bloodType') || '').trim(),
    motherName: (formData.get('motherName') || '').trim(),
    fatherName: (formData.get('fatherName') || '').trim(),
    guardianName: (formData.get('guardianName') || '').trim(),
    guardianPhone: (formData.get('guardianPhone') || '').trim(),
    guardianHouseStreet,
    guardianAddress,
    privateClinic: formData.get('privateClinic') === 'on',
    privateClinicName: (formData.get('privateClinicName') || '').trim(),
    documentName: documentFile?.name || '',
    documentMimeType: documentFile?.type || '',
    documentSize: documentFile?.size || 0,
    documentDataUrl: selectedDocumentDataUrl
  };
}

function resetUploadUi() {
  selectedDocumentDataUrl = '';
  const preview = document.getElementById('filePreview');
  const wrap = document.getElementById('uploadProgressWrap');
  const bar = document.getElementById('uploadProgressBar');
  const text = document.getElementById('uploadProgressText');
  if (preview) preview.innerHTML = `<p class="file-preview-empty">${getTranslation('baby_register.no_file')}</p>`;
  if (bar) bar.style.width = '0%';
  if (text) text.textContent = '0%';
  if (wrap) wrap.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  setupI18n();

  const form = document.getElementById('babyForm');
  const fileInput = document.getElementById('birthCert');
  const privateToggle = document.getElementById('privateClinicToggle');
  const privateNameGroup = document.getElementById('privateClinicNameGroup');

  privateToggle?.addEventListener('change', () => {
    privateNameGroup?.classList.toggle('hidden', !privateToggle.checked);
  });

  fileInput?.addEventListener('change', (event) => {
    renderFilePreview(event.target.files?.[0]);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const documentFile = formData.get('document');
    if (!validateFile(documentFile)) return;

    const payload = getPayload(formData, documentFile);
    if (!payload.firstName || !payload.lastName || !payload.guardianAddress) {
      showToast(getTranslation('baby_register.required_fields'), 'error');
      return;
    }
    if (isDuplicateBabyRecord(payload)) {
      showToast(getTranslation('baby_register.duplicate'), 'error');
      return;
    }

    try {
      showLoading(getTranslation('baby_register.loading'));
      await apiFetch('/babies', { method: 'POST', body: JSON.stringify(payload) });
      registerBabyRecord(payload);
      showToast(getTranslation('baby_register.success'));
      form.reset();
      resetUploadUi();
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } catch (err) {
      showToast(err.message || getTranslation('baby_register.duplicate'), 'error');
    } finally {
      hideLoading();
    }
  });
});
