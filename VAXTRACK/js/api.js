const BASE_URL = 'https://vaxtrack-database-production.up.railway.app';
const LOCAL_BABIES_KEY = 'vax_registered_babies';
const DEMO_SEED_ENABLED = true; // Presentation/demo mode: set to false to restore a fully empty dashboard for new parent accounts.

const today = new Date().toISOString().split('T')[0];

function daysFromToday(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export const mockBabies = [
  { 
    id: 1,
    parentEmail: "parent@example.com",
    name: "Juan Dela Cruz",
    dob: "2025-10-15",
    ageNote: '',
    sex: "Male",
    placeOfBirth: "Barangay San Antonio De Padua I Health Center",
    birthWeight: "3.2 kg",
    bloodType: "O+",
    motherName: "Maria Dela Cruz",
    fatherName: "Pedro Dela Cruz",
    guardianName: "Maria Dela Cruz",
    guardianPhone: "0917 123 4567",
    guardianAddress: "San Antonio De Padua I, Dasmariñas City, Cavite",
    privateClinic: false,
    privateClinicName: "",
    registrationNumber: "REG-2025-001",
    registrationStatus: "Approved",
    testHistory: [
      { test: "Newborn Screening", date: "2025-10-17", result: "Normal" },
      { test: "Weight Check", date: "2025-11-15", result: "Healthy progress" }
    ],
    vaccinations: [
      { vaccine: "BCG", date: "2025-10-15", dose: 1, batch: "B123", worker: "Nurse Joy", status: "Completed", source: "Barangay Health Center", privateClinic: false, remarks: "Administered at birth." },
      { vaccine: "Hepatitis B", date: "2025-10-16", dose: 1, batch: "HB-010", worker: "Nurse Joy", status: "Completed", source: "Barangay Health Center", privateClinic: false, remarks: "No adverse reaction reported." }
    ],
    upcoming: [
      { vaccine: "Pentavalent 1", targetDate: daysFromToday(5), status: "Upcoming", source: "Barangay Health Center" },
      { vaccine: "OPV 1", targetDate: daysFromToday(5), status: "Upcoming", source: "Barangay Health Center" }
    ],
    documents: [{ id: 101, type: "Birth Certificate", filename: "juan_cert.pdf", mimeType: "application/pdf", uploadDate: "2025-10-16", status: "Approved", comment: "Verified by BHW." }]
  },
  { 
    id: 2,
    parentEmail: "parent@example.com",
    name: "Elena Santos",
    dob: "2026-02-01",
    sex: "Female",
    placeOfBirth: "Dasmariñas City Medical Center",
    birthWeight: "2.8 kg",
    bloodType: "A+",
    motherName: "Ana Santos",
    fatherName: "Jose Santos",
    guardianName: "Ana Santos",
    guardianPhone: "0928 555 7102",
    guardianAddress: "San Antonio De Padua I, Dasmariñas City, Cavite",
    privateClinic: true,
    privateClinicName: "Private Clinic - City Proper",
    registrationNumber: "REG-2026-042",
    registrationStatus: "Approved",
    testHistory: [
      { test: "Newborn Screening", date: "2026-02-03", result: "Normal" }
    ],
    vaccinations: [
      { vaccine: "BCG", date: "2026-02-01", dose: 1, batch: "PC-BCG-02", worker: "Private Clinic", status: "Completed", source: "Private Clinic", privateClinic: true }
    ],
    upcoming: [{ vaccine: "OPV", targetDate: "2026-05-01", status: "Overdue" }],
    documents: [{ id: 102, type: "Birth Certificate", filename: "elena_cert.pdf", mimeType: "application/pdf", uploadDate: "2026-02-05", status: "Approved", comment: "Verified by BHW." }]
  },
  { 
    id: 3,
    parentEmail: "parent@example.com",
    name: "Miguel Reyes",
    dob: "2026-01-20",
    sex: "Male",
    placeOfBirth: "Barangay San Antonio De Padua I Health Center",
    birthWeight: "3.0 kg",
    bloodType: "Not provided",
    motherName: "Liza Reyes",
    fatherName: "Marco Reyes",
    guardianName: "Liza Reyes",
    guardianPhone: "0916 000 2468",
    guardianAddress: "San Antonio De Padua I, Dasmariñas City, Cavite",
    privateClinic: false,
    privateClinicName: "",
    registrationNumber: "REG-2026-057",
    registrationStatus: "Rejected",
    testHistory: [],
    vaccinations: [],
    upcoming: [{ vaccine: "Hepatitis B", targetDate: "2026-01-20", status: "Pending" }],
    documents: [{ id: 103, type: "Birth Certificate", filename: "miguel_cert_blurry.jpg", mimeType: "image/jpeg", uploadDate: "2026-01-21", status: "Rejected", comment: "Blurry ang uploaded document. Please upload a clearer copy." }]
  }
];

export const dohSchedule = [
  { id: 1, vaccine: "BCG", targetAge: "At birth", dose: 1, active: true },
  { id: 2, vaccine: "Hepatitis B", targetAge: "At birth", dose: 1, active: true },
  { id: 3, vaccine: "Pentavalent", targetAge: "1.5, 2.5, 3.5 months", dose: 3, active: true },
  { id: 4, vaccine: "Oral Polio Vaccine", targetAge: "1.5, 2.5, 3.5 months", dose: 3, active: true },
  { id: 5, vaccine: "Measles-containing Vaccine", targetAge: "9 months and 12 months", dose: 2, active: true }
];

function readLocalBabies() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_BABIES_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (err) {
    console.warn('Unable to read local baby records.', err);
    return [];
  }
}

function writeLocalBabies(records) {
  localStorage.setItem(LOCAL_BABIES_KEY, JSON.stringify(records));
}

function clean(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
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

function normalizeBaby(baby) {
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
    firstName: baby.firstName || '',
    middleName: baby.middleName || '',
    lastName: baby.lastName || '',
    parentEmail: baby.parentEmail || '',
    placeOfBirth: baby.placeOfBirth || 'Not provided',
    guardianName: baby.guardianName || baby.motherName || 'Not provided',
    guardianPhone: baby.guardianPhone || 'Not provided',
    guardianHouseStreet: baby.guardianHouseStreet || baby.guardianAddress || '',
    guardianAddress: baby.guardianAddress || baby.guardianHouseStreet || legacyAddressFromParts || 'Not provided',
    privateClinic: Boolean(baby.privateClinic),
    privateClinicName: baby.privateClinicName || '',
    testHistory: baby.testHistory || [],
    vaccinations: baby.vaccinations || [],
    upcoming: baby.upcoming || [],
    documents: baby.documents || []
  };
  normalized.upcoming = normalized.upcoming.map(item => ({ ...item, status: getScheduleStatus(item) }));
  normalized.registrationStatus = normalized.registrationStatus || normalized.documents[0]?.status || 'Pending';
  return normalized;
}


function buildDemoBabyForParent(parentEmail) {
  return normalizeBaby({
    id: `demo-baby-${Date.now()}`,
    parentEmail,
    firstName: 'Juan',
    middleName: '',
    lastName: 'Dela Cruz',
    name: 'Juan Dela Cruz',
    dob: '2025-10-15',
    sex: 'Male',
    placeOfBirth: 'Barangay San Antonio De Padua I Health Center',
    birthWeight: '3.2 kg',
    bloodType: 'O+',
    motherName: 'Maria Dela Cruz',
    fatherName: 'Pedro Dela Cruz',
    guardianName: 'Maria Dela Cruz',
    guardianPhone: '0917 123 4567',
    guardianHouseStreet: 'Purok 2, San Antonio De Padua I, Dasmariñas City, Cavite 4114',
    guardianAddress: 'Purok 2, San Antonio De Padua I, Dasmariñas City, Cavite 4114',
    privateClinic: false,
    privateClinicName: '',
    registrationNumber: 'REG-2025-001',
    registrationStatus: 'Approved',
    testHistory: [
      { test: 'Newborn Screening', date: '2025-10-17', result: 'Normal' },
      { test: 'Weight Check', date: '2025-11-15', result: 'Healthy progress' }
    ],
    vaccinations: [
      { vaccine: 'BCG', date: '2025-10-15', dose: 1, batch: 'B123', worker: 'Nurse Joy', status: 'Completed', source: 'Barangay Health Center', privateClinic: false, remarks: 'Administered at birth.' },
      { vaccine: 'Hepatitis B', date: '2025-10-16', dose: 1, batch: 'HB-010', worker: 'Nurse Joy', status: 'Completed', source: 'Barangay Health Center', privateClinic: false, remarks: 'No adverse reaction reported.' }
    ],
    upcoming: [
      { vaccine: 'Pentavalent 1', targetDate: daysFromToday(5), status: 'Upcoming', source: 'Barangay Health Center' },
      { vaccine: 'OPV 1', targetDate: daysFromToday(5), status: 'Upcoming', source: 'Barangay Health Center' }
    ],
    documents: [{ id: `demo-doc-${Date.now()}`, type: 'Birth Certificate', filename: 'juan_cert.pdf', mimeType: 'application/pdf', uploadDate: '2025-10-16', status: 'Approved', comment: 'Verified by BHW.' }]
  });
}

function seedDemoBabyForCurrentParent(parentEmail) {
  if (!DEMO_SEED_ENABLED) return;
  const email = clean(parentEmail);
  if (!email) return;
  const hasBabyForParent = getAllBabies().some(baby => clean(baby.parentEmail) === email);
  if (hasBabyForParent) return;

  const localBabies = readLocalBabies();
  localBabies.push(buildDemoBabyForParent(parentEmail));
  writeLocalBabies(localBabies);
}

export async function getAllBabiesFromAPI() {
  try {
    const data = await apiFetch('/babies');
    if (data._fallback) return null;
    return data;
  } catch {
    return null;
  }
}

export function getAllBabies() {
  const localBabies = readLocalBabies();
  const localIds = new Set(localBabies.map(baby => String(baby.id)));
  return [...mockBabies.filter(baby => !localIds.has(String(baby.id))), ...localBabies].map(normalizeBaby);
}

export function getBabiesForCurrentParent() {
  const parentEmail = clean(localStorage.getItem('vax_email') || '');
  if (!parentEmail) return [];
  seedDemoBabyForCurrentParent(parentEmail);
  return getAllBabies().filter(baby => clean(baby.parentEmail) === parentEmail);
}

export function getBabyById(id) {
  return getAllBabies().find(baby => String(baby.id) === String(id)) || null;
}

export function isDuplicateBabyRecord(data) {
  const targetName = clean(data.name);
  const targetDob = clean(data.dob);
  const targetGuardian = clean(data.guardianName || data.motherName || data.fatherName);
  const targetRegNo = clean(data.registrationNumber);

  return getAllBabies().some(baby => {
    const sameReg = targetRegNo && clean(baby.registrationNumber) === targetRegNo;
    const sameNameDob = clean(baby.name) === targetName && clean(baby.dob) === targetDob;
    const sameGuardian = targetGuardian && [baby.guardianName, baby.motherName, baby.fatherName].some(name => clean(name) === targetGuardian);
    return sameReg || (sameNameDob && sameGuardian);
  });
}

export async function registerBabyRecord(data) {
  // Try real backend first
  try {
    const result = await apiFetch('/babies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!result._fallback) return result;
  } catch (err) {
    console.warn('[API] Baby register fallback to local:', err.message);
  }

  // Fallback to localStorage
  if (isDuplicateBabyRecord(data)) {
    throw new Error('Duplicate baby record detected. Pakisuri ang name, birthdate, at guardian details.');
  }

  const localBabies = readLocalBabies();
  const now = new Date();
  const id = Date.now();
  const newBaby = normalizeBaby({
    id,
    parentEmail: data.parentEmail || localStorage.getItem('vax_email') || '',
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
    registrationNumber: `REG-${now.getFullYear()}-${String(localBabies.length + mockBabies.length + 1).padStart(3, '0')}`,
    registrationStatus: 'Pending',
    testHistory: [],
    vaccinations: [],
    upcoming: [
      { vaccine: 'BCG', targetDate: data.dob, status: 'Upcoming' },
      { vaccine: 'Hepatitis B', targetDate: data.dob, status: 'Upcoming' },
      { vaccine: 'Pentavalent 1', targetDate: data.nextScheduleDate || data.dob, status: 'Pending' }
    ],
    documents: [{
      id: id + 1000,
      type: 'Birth Certificate',
      filename: data.documentName || 'birth_certificate.pdf',
      mimeType: data.documentMimeType || '',
      size: data.documentSize || 0,
      dataUrl: data.documentDataUrl || '',
      uploadDate: now.toISOString().split('T')[0],
      status: 'Pending',
      comment: ''
    }]
  });
  localBabies.push(newBaby);
  writeLocalBabies(localBabies);
  return newBaby;
}

export async function updateDocumentStatus(documentId, status, comment = '') {
  // Try real backend first
  try {
    const result = await apiFetch(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    });
    if (!result._fallback) return result;
  } catch (err) {
    console.warn('[API] Document status fallback to local:', err.message);
  }

  // Fallback to local
  const targetId = String(documentId);
  const applyUpdate = (baby) => {
    let updated = false;
    baby.documents?.forEach(doc => {
      if (String(doc.id) === targetId) {
        doc.status = status;
        doc.comment = comment || (status === 'Approved' ? 'Verified by BHW.' : doc.comment || 'Please re-upload a clearer document.');
        doc.reviewedDate = new Date().toISOString().split('T')[0];
        baby.registrationStatus = status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Pending';
        updated = true;
      }
    });
    return updated;
  };

  const localBabies = readLocalBabies();
  let updated = localBabies.some(applyUpdate);
  if (updated) {
    writeLocalBabies(localBabies);
    return true;
  }

  updated = mockBabies.some(applyUpdate);
  return updated;
}

export async function addVaccinationRecord(babyId, record) {
  // Try real backend first
  try {
    const result = await apiFetch(`/babies/${babyId}/vaccinations`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
    if (!result._fallback) return result;
  } catch (err) {
    console.warn('[API] Vaccination fallback to local:', err.message);
  }

  // Fallback to localStorage
  const normalizedRecord = {
    ...record,
    status: 'Completed',
    source: record.privateClinic ? (record.clinicName || 'Private Clinic') : 'Barangay Health Center',
    privateClinic: Boolean(record.privateClinic)
  };

  const cleanDate = value => String(value || '').split('T')[0];
  const cleanText = value => String(value || '').trim().toLowerCase();

  const applyUpdate = baby => {
    if (String(baby.id) !== String(babyId)) return false;
    baby.vaccinations = baby.vaccinations || [];
    baby.vaccinations.push(normalizedRecord);
    const targetDate = cleanDate(normalizedRecord.targetDate);
    baby.upcoming = (baby.upcoming || []).map(item => {
      const sameVaccine = cleanText(item.vaccine) === cleanText(normalizedRecord.vaccine);
      const sameTargetDate = targetDate && cleanDate(item.targetDate) === targetDate;
      if (sameVaccine && (!targetDate || sameTargetDate)) {
        return { ...item, status: 'Completed', completedDate: cleanDate(normalizedRecord.date), targetDate: item.targetDate || targetDate };
      }
      return item;
    });
    return true;
  };

  const localBabies = readLocalBabies();
  let updated = localBabies.some(applyUpdate);
  if (updated) {
    writeLocalBabies(localBabies);
    return true;
  }

  updated = mockBabies.some(applyUpdate);
  return updated;
}

export function getCompletionProgress(baby) {
  const completed = (baby.vaccinations || []).filter(item => item.status === 'Completed').length;
  const remaining = (baby.upcoming || []).filter(item => item.status !== 'Completed').length;
  const total = completed + remaining;
  if (!total) return { completed: 0, total: 0, percent: 0 };
  return { completed, total, percent: Math.min(100, Math.round((completed / total) * 100)) };
}

export function getDashboardStats() {
  const babies = getAllBabies();
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

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('vax_token');
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  } catch (err) {
    console.warn(`[API] Failed to reach backend, using mock fallback. Error: ${err.message}`);
    return { success: true, _fallback: true };
  }
}
