export const mockBabies = [
  { 
    id: 1, name: "Juan Dela Cruz", dob: "2025-10-15", sex: "Male", birthWeight: "3.2 kg", bloodType: "O+",
    motherName: "Maria Dela Cruz", fatherName: "Pedro Dela Cruz", registrationNumber: "REG-2025-001",
    vaccinations: [{ vaccine: "BCG", date: "2025-10-15", dose: 1, batch: "B123", worker: "Nurse Joy", status: "Completed" }],
    upcoming: [{ vaccine: "Pentavalent 1", targetDate: "2026-06-15", status: "Upcoming" }],
    documents: [{ id: 101, type: "Birth Certificate", filename: "juan_cert.pdf", uploadDate: "2025-10-16", status: "Pending" }]
  },
  { 
    id: 2, name: "Elena Santos", dob: "2026-02-01", sex: "Female", birthWeight: "2.8 kg", bloodType: "A+",
    motherName: "Ana Santos", fatherName: "Jose Santos", registrationNumber: "REG-2026-042",
    vaccinations: [],
    upcoming: [{ vaccine: "OPV", targetDate: "2026-05-01", status: "Overdue" }],
    documents: [{ id: 102, type: "Birth Certificate", filename: "elena_cert.pdf", uploadDate: "2026-02-05", status: "Approved" }]
  }
];

export const mockDashboardStats = { totalBabies: 142, vaccinesThisMonth: 89, upcomingThisWeek: 24, overdue: 5 };

export const dohSchedule = [
  { id: 1, vaccine: "BCG", targetAge: "At birth", dose: 1, active: true },
  { id: 2, vaccine: "Hepatitis B", targetAge: "At birth", dose: 1, active: true },
  { id: 3, vaccine: "Pentavalent", targetAge: "1.5, 2.5, 3.5 months", dose: 3, active: true }
];

export async function apiFetch(endpoint, options = {}) {
  console.log(`[API MOCK] ${options.method || 'GET'} ${endpoint}`);
  return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 600));
}