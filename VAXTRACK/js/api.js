import { filterActiveBabies } from './utils.js';

const BASE_URL = 'https://vaxtrack-database-production.up.railway.app';

const today = new Date().toISOString().split('T')[0];

export const dohSchedule = [
  { id: 1, vaccine: 'BCG', targetAge: 'At birth', dose: 1, active: true },
  { id: 2, vaccine: 'Hepatitis B', targetAge: 'At birth', dose: 1, active: true },
  { id: 3, vaccine: 'Pentavalent', targetAge: '1.5, 2.5, 3.5 months', dose: 3, active: true },
  { id: 4, vaccine: 'Oral Polio Vaccine', targetAge: '1.5, 2.5, 3.5 months', dose: 3, active: true },
  { id: 5, vaccine: 'Measles-containing Vaccine', targetAge: '9 months and 12 months', dose: 2, active: true }
];

function clean(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCurrentParentEmail() {
  return localStorage.getItem('vax_email') || '';
}

function getCurrentParentId() {
  return localStorage.getItem('vax_id') || '';
}

function normalizeStatus(status = 'Pending') {
  const value = String(status || 'Pending').trim().toLowerCase();
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  if (value === 'completed') return 'Completed';
  if (value === 'overdue') return 'Overdue';
  if (value === 'upcoming') return 'Upcoming';
  return 'Pending';
}

export function getScheduleStatus(item = {}) {
  if (item.status === 'Completed') return 'Completed';
  if (item.status === 'Pending') return 'Pending';
  if (item.status === 'Rejected') return 'Rejected';
  if (!item.targetDate) return item.status || 'Upcoming';
  const target = new Date(item.targetDate);
  if (!Number.isNaN(target.getTime()) && target < new Date(today)) return 'Overdue';
  return item.status || 'Upcoming';
}

function normalizeBaby(baby = {}) {
  const legacyAddressFromParts = [
    baby.guardianHouseStreet,
    baby.guardianBarangay,
    baby.guardianCity,
    baby.guardianProvince,
    baby.guardianZip
  ].filter(Boolean).join(', ');
  const { guardianBarangay, guardianCity, guardianProvince, guardianZip, ...babyRecord } = baby;
  const normalized = {
    ...babyRecord,
    id: baby.id || baby.childId || baby.child_id || baby.babyId || baby.baby_id || baby.registrationNumber || baby.registration_number || '',
    childId: baby.childId || baby.child_id || baby.id || '',
    firstName: baby.firstName || baby.first_name || '',
    middleName: baby.middleName || baby.middle_name || '',
    lastName: baby.lastName || baby.last_name || '',
    name: baby.name || [baby.firstName || baby.first_name, baby.middleName || baby.middle_name, baby.lastName || baby.last_name].filter(Boolean).join(' ').trim(),
    parentEmail: baby.parentEmail || baby.parent_email || getCurrentParentEmail(),
    parentId: baby.parentId || baby.parent_id || baby.userId || baby.user_id || '',
    userId: baby.userId || baby.user_id || baby.parentId || baby.parent_id || '',
    registrationNumber: baby.registrationNumber || baby.registration_number || '',
    status: normalizeStatus(baby.status || baby.registrationStatus || baby.registration_status || baby.documents?.[0]?.status || 'Pending'),
    createdAt: baby.createdAt || baby.created_at || '',
    placeOfBirth: baby.placeOfBirth || baby.place_of_birth || 'Not provided',
    guardianName: baby.guardianName || baby.guardian_name || baby.motherName || baby.mother_name || 'Not provided',
    guardianPhone: baby.guardianPhone || baby.guardian_phone || 'Not provided',
    guardianHouseStreet: baby.guardianHouseStreet || baby.guardianAddress || baby.guardian_address || '',
    guardianAddress: baby.guardianAddress || baby.guardian_address || baby.guardianHouseStreet || legacyAddressFromParts || 'Not provided',
    motherName: baby.motherName || baby.mother_name || '',
    fatherName: baby.fatherName || baby.father_name || '',
    birthWeight: baby.birthWeight || baby.birth_weight || '',
    bloodType: baby.bloodType || baby.blood_type || '',
    privateClinic: Boolean(baby.privateClinic || baby.private_clinic),
    privateClinicName: baby.privateClinicName || baby.private_clinic_name || '',
    testHistory: baby.testHistory || baby.test_history || [],
    vaccinations: baby.vaccinations || [],
    upcoming: baby.upcoming || [],
    documents: baby.documents || []
  };

  normalized.documents = normalized.documents.map(doc => ({
    ...doc,
    type: doc.type || 'Birth Certificate',
    filename: doc.filename || doc.file_name || doc.filePath || doc.file_path || 'Birth Certificate',
    mimeType: doc.mimeType || doc.mime_type || '',
    uploadDate: doc.uploadDate || doc.upload_date || doc.createdAt || doc.created_at || doc.reviewedDate || doc.reviewed_date || '',
    status: normalizeStatus(doc.status || normalized.status || 'Pending'),
    comment: doc.comment || doc.remarks || doc.reason || ''
  }));
  normalized.upcoming = normalized.upcoming.map(item => ({
    ...item,
    targetDate: item.targetDate || item.target_date,
    status: getScheduleStatus({ ...item, targetDate: item.targetDate || item.target_date })
  }));
  normalized.registrationStatus = normalizeStatus(normalized.registrationStatus || normalized.registration_status || normalized.documents[0]?.status || normalized.status || 'Pending');
  normalized.status = normalized.registrationStatus;
  return normalized;
}

function buildPendingBabyRecord(data = {}, overrides = {}) {
  const now = overrides.now || new Date();
  const id = overrides.id || data.id || data.childId || data.child_id || '';
  const registrationNumber = overrides.registrationNumber || data.registrationNumber || data.registration_number || '';
  const uploadDate = overrides.uploadDate || data.uploadDate || data.upload_date || now.toISOString().split('T')[0];

  return normalizeBaby({
    id,
    parentEmail: data.parentEmail || getCurrentParentEmail(),
    parentId: data.parentId || data.userId || getCurrentParentId(),
    userId: data.userId || data.parentId || getCurrentParentId(),
    firstName: data.firstName || '',
    middleName: data.middleName || '',
    lastName: data.lastName || '',
    name: data.name || [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
    dob: data.dob,
    sex: data.sex,
    placeOfBirth: data.placeOfBirth,
    birthWeight: data.birthWeight,
    bloodType: data.bloodType || 'Not provided',
    motherName: data.motherName,
    fatherName: data.fatherName,
    guardianName: data.guardianName,
    guardianPhone: data.guardianPhone,
    guardianHouseStreet: data.guardianHouseStreet || data.guardianAddress || '',
    guardianAddress: data.guardianAddress || data.guardianHouseStreet || '',
    privateClinic: Boolean(data.privateClinic),
    privateClinicName: data.privateClinicName || '',
    registrationNumber,
    registrationStatus: 'Pending',
    status: 'Pending',
    createdAt: overrides.createdAt || data.createdAt || data.created_at || now.toISOString(),
    testHistory: [],
    vaccinations: [],
    upcoming: [],
    documents: [{
      id: overrides.documentId || data.documentId || data.document_id || '',
      type: 'Birth Certificate',
      filename: data.documentName || data.filename || 'Birth Certificate',
      mimeType: data.documentMimeType || data.mimeType || '',
      size: data.documentSize || data.size || 0,
      dataUrl: data.documentDataUrl || '',
      uploadDate,
      status: 'Pending',
      comment: ''
    }]
  });
}

export async function getAllBabiesFromAPI() {
  const data = await apiFetch('/babies');
  return Array.isArray(data) ? filterActiveBabies(data.map(normalizeBaby)) : [];
}

// Admin and parent screens use API data only.
export function getAllBabies() {
  return [];
}

export function getBabiesForCurrentParent() {
  return [];
}

export function getBabyById() {
  return null;
}

export function isDuplicateBabyRecord() {
  return false;
}

export async function registerBabyRecord(data) {
  const payload = {
    ...data,
    parentEmail: data.parentEmail || getCurrentParentEmail(),
    parentId: data.parentId || data.userId || getCurrentParentId(),
    userId: data.userId || data.parentId || getCurrentParentId(),
    status: 'Pending',
    registrationStatus: 'Pending',
    documentStatus: 'Pending'
  };

  const result = await apiFetch('/babies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return buildPendingBabyRecord(payload, {
    id: result.id || result.childId || result.child_id,
    registrationNumber: result.registrationNumber || result.registration_number,
    documentId: result.documentId || result.document_id,
    createdAt: result.createdAt || result.created_at,
    uploadDate: result.uploadDate || result.upload_date
  });
}

export async function updateDocumentStatus(documentId, status, comment = '') {
  return apiFetch(`/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}

export async function addVaccinationRecord(babyId, record) {
  return apiFetch(`/babies/${babyId}/vaccinations`, {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export function getCompletionProgress(baby) {
  const completed = (baby.vaccinations || []).filter(item => item.status === 'Completed').length;
  const remaining = (baby.upcoming || []).filter(item => item.status !== 'Completed').length;
  const total = completed + remaining;
  if (!total) return { completed: 0, total: 0, percent: 0 };
  return { completed, total, percent: Math.min(100, Math.round((completed / total) * 100)) };
}

export function getDashboardStats(babies = []) {
  babies = filterActiveBabies(babies);
  const upcoming = babies.flatMap(baby => baby.upcoming || []);
  const vaccinations = babies.flatMap(baby => baby.vaccinations || []);
  return {
    totalBabies: babies.length,
    vaccinesThisMonth: vaccinations.filter(item => {
      const date = new Date(item.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    upcomingThisWeek: upcoming.filter(item => item.targetDate && isWithinDays(item.targetDate, 7) && item.status !== 'Completed').length,
    overdue: upcoming.filter(item => item.status === 'Overdue').length,
    pendingDocs: babies.flatMap(baby => baby.documents || []).filter(doc => doc.status === 'Pending').length
  };
}

export function isWithinDays(dateStr, days) {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return false;
  const diffDays = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}


function getReportFilename(prefix = 'vaxtrack-report') {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${prefix}-${stamp}.csv`;
}

function triggerCsvDownload(blobOrText, filename = getReportFilename()) {
  const blob = blobOrText instanceof Blob
    ? blobOrText
    : new Blob([blobOrText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value = '') {
  const safeValue = value === null || value === undefined ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function csvRow(values = []) {
  return values.map(csvCell).join(',');
}

function formatReportDate(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

export function downloadAdminFilteredCsv({ filenamePrefix = 'vaxtrack-filtered-report', headers = [], rows = [], emptyMessage = 'No records match the current filters.' } = {}) {
  const generatedAt = new Date().toISOString();
  const safeHeaders = Array.isArray(headers) && headers.length ? headers : ['Record'];
  const outputRows = [[...safeHeaders, 'Generated At']];

  if (Array.isArray(rows) && rows.length) {
    rows.forEach(row => {
      const values = Array.isArray(row) ? row : safeHeaders.map(header => row?.[header] ?? row?.[header.toLowerCase?.()] ?? '');
      outputRows.push([...values, generatedAt]);
    });
  } else {
    const emptyRow = Array(safeHeaders.length).fill('');
    emptyRow[0] = emptyMessage;
    outputRows.push([...emptyRow, generatedAt]);
  }

  const csv = `\ufeff${outputRows.map(csvRow).join('\n')}`;
  triggerCsvDownload(csv, getReportFilename(filenamePrefix));
  return { source: 'frontend-filtered', rows: rows.length };
}

function buildClientAdminReportCsv(babies = []) {
  const generatedAt = new Date().toISOString();
  const headers = [
    'Report Section',
    'Record ID',
    'Child ID',
    'Registration No.',
    'Baby Name',
    'DOB',
    'Sex',
    'Parent/Guardian',
    'Contact No.',
    'Address',
    'Registration Status',
    'Vaccine/Item',
    'Dose',
    'Date',
    'Target Date',
    'Status',
    'Batch/Lot',
    'Administered By',
    'Source/Clinic',
    'Document Type',
    'Document Filename',
    'Comment/Remarks',
    'Alert Type',
    'Generated At'
  ];

  const rows = [headers];
  const normalizedBabies = Array.isArray(babies) ? babies.map(normalizeBaby) : [];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const pushRow = ({
    section = '', recordId = '', childId = '', registrationNo = '', babyName = '', dob = '', sex = '', guardianName = '', guardianPhone = '', guardianAddress = '',
    registrationStatus = '', item = '', dose = '', date = '', targetDate = '', status = '', batch = '', worker = '', source = '', documentType = '',
    documentFilename = '', remarks = '', alertType = ''
  } = {}) => rows.push([
    section, recordId, childId, registrationNo, babyName, dob, sex, guardianName, guardianPhone, guardianAddress,
    registrationStatus, item, dose, date, targetDate, status, batch, worker, source, documentType, documentFilename, remarks, alertType, generatedAt
  ]);

  normalizedBabies.forEach(baby => {
    const childId = baby.id || baby.childId || baby.child_id || '';
    const registrationNo = baby.registrationNumber || baby.registration_number || '';
    const babyName = baby.name || [baby.firstName, baby.middleName, baby.lastName].filter(Boolean).join(' ').trim() || 'Unnamed baby';
    const common = {
      childId,
      registrationNo,
      babyName,
      dob: formatReportDate(baby.dob || baby.date_of_birth),
      sex: baby.sex || '',
      guardianName: baby.guardianName || baby.guardian_name || '',
      guardianPhone: baby.guardianPhone || baby.guardian_phone || '',
      guardianAddress: baby.guardianAddress || baby.guardian_address || '',
      registrationStatus: baby.registrationStatus || baby.registration_status || baby.status || ''
    };

    pushRow({ section: 'Baby Records', recordId: childId, ...common, date: formatReportDate(baby.createdAt || baby.created_at), status: common.registrationStatus });

    (baby.vaccinations || []).forEach(vaccine => {
      pushRow({
        section: 'Vaccination Records',
        recordId: vaccine.id || '',
        ...common,
        item: vaccine.vaccine || vaccine.vaccineName || vaccine.vaccine_name || '',
        dose: vaccine.dose || '',
        date: vaccine.date || vaccine.administeredAt || vaccine.administered_at || '',
        status: vaccine.status || 'Completed',
        batch: vaccine.batch || vaccine.batchNo || vaccine.batch_no || vaccine.lotNumber || vaccine.lot_number || '',
        worker: vaccine.worker || vaccine.administeredBy || vaccine.administered_by || '',
        source: vaccine.privateClinic ? (vaccine.clinicName || 'Private Clinic') : (vaccine.clinicName || vaccine.source || 'Barangay Health Center'),
        remarks: vaccine.remarks || vaccine.reaction || ''
      });
    });

    (baby.upcoming || []).forEach(schedule => {
      const targetDate = schedule.targetDate || schedule.target_date || '';
      const scheduleStatus = getScheduleStatus({ ...schedule, targetDate });
      pushRow({
        section: 'Schedule Records',
        recordId: schedule.id || '',
        ...common,
        item: schedule.vaccine || schedule.title || 'Schedule item',
        dose: schedule.dose || '',
        targetDate,
        status: scheduleStatus,
        source: schedule.source || schedule.location || '',
        remarks: schedule.remarks || ''
      });

      const target = targetDate ? new Date(targetDate) : null;
      if ((scheduleStatus === 'Overdue') || (target && !Number.isNaN(target.getTime()) && target < todayDate && scheduleStatus !== 'Completed')) {
        pushRow({
          section: 'Alerts',
          recordId: schedule.id || '',
          ...common,
          item: schedule.vaccine || schedule.title || 'Vaccination follow-up',
          dose: schedule.dose || '',
          targetDate,
          status: 'Overdue',
          source: schedule.source || schedule.location || '',
          remarks: schedule.remarks || '',
          alertType: 'Medical Alert'
        });
      }
    });

    (baby.documents || []).forEach(doc => {
      const docStatus = doc.status || '';
      pushRow({
        section: 'Document Statuses',
        recordId: doc.id || '',
        ...common,
        date: formatReportDate(doc.uploadDate || doc.upload_date || doc.createdAt || doc.created_at),
        status: docStatus,
        documentType: doc.type || 'Birth Certificate',
        documentFilename: doc.filename || doc.file_name || doc.filePath || doc.file_path || '',
        remarks: doc.comment || doc.remarks || doc.reason || ''
      });

      if (['pending', 'rejected', 're-upload requested', 'reupload requested'].includes(String(docStatus).trim().toLowerCase())) {
        pushRow({
          section: 'Alerts',
          recordId: doc.id || '',
          ...common,
          date: formatReportDate(doc.uploadDate || doc.upload_date || doc.createdAt || doc.created_at),
          status: docStatus,
          documentType: doc.type || 'Birth Certificate',
          documentFilename: doc.filename || doc.file_name || doc.filePath || doc.file_path || '',
          remarks: doc.comment || doc.remarks || doc.reason || '',
          alertType: 'Document Action Item'
        });
      }
    });

    (baby.testHistory || baby.test_history || []).forEach(test => {
      pushRow({
        section: 'Medical Test History',
        recordId: test.id || '',
        ...common,
        item: test.test || test.type || 'Medical test',
        date: formatReportDate(test.date),
        status: test.status || '',
        remarks: test.result || test.remarks || ''
      });
    });
  });

  if (!normalizedBabies.length) {
    pushRow({
      section: 'No Records',
      remarks: 'No database records were returned for this report.'
    });
  }

  return `\ufeff${rows.map(csvRow).join('\n')}`;
}

function isMissingExportRouteError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('route not found') || message.includes('not found') || message.includes('404');
}

async function fetchBackendCsvFromEndpoint(endpoint) {
  const token = localStorage.getItem('vax_token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `Unable to export report from ${endpoint}`;
    try {
      const data = JSON.parse(text);
      message = data.error || message;
    } catch (_) {
      if (text) message = text;
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return res.blob();
}


export async function downloadAdminReportCsv() {
  const backendEndpoints = [
    '/reports/export',
    '/reports/export.php',
    '/admin/reports/export',
    '/dashboard/export',
    '/backend/reports/export',
    '/backend/reports/export.php'
  ];

  let lastError = null;

  for (const endpoint of backendEndpoints) {
    try {
      const blob = await fetchBackendCsvFromEndpoint(endpoint);
      triggerCsvDownload(blob, getReportFilename());
      return { source: 'backend', endpoint };
    } catch (error) {
      lastError = error;
      const shouldTryNextEndpoint = isMissingExportRouteError(error);
      if (!shouldTryNextEndpoint) break;
    }
  }

  if (lastError && !isMissingExportRouteError(lastError)) {
    throw lastError;
  }

  // Prototype-safe fallback: if the deployed backend has not registered the
  // export route yet, build the CSV from the same database data already used by
  // the admin dashboard. This keeps the button functional without requiring
  // manual database access or schema changes.
  try {
    const babies = await getAllBabiesFromAPI();
    const csv = buildClientAdminReportCsv(babies);
    triggerCsvDownload(csv, getReportFilename('vaxtrack-report-fallback'));
    return { source: 'frontend-fallback' };
  } catch (fallbackError) {
    throw new Error(
      `Unable to export report. Backend export route is unavailable and fallback data could not be loaded: ${fallbackError.message}`
    );
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('vax_token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { error: text };
    }
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
