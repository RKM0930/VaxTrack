/* FILE: js/user/baby-profile.js */
import { requireAuth } from '../auth.js';
import { mockBabies } from '../api.js';
import { showLoading, hideLoading, showToast } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAuth();

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let currentBabyRecord = null;

document.addEventListener('DOMContentLoaded', () => {
  setupI18n();
  showLoading();
  
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    currentBabyRecord = mockBabies.find(b => b.id === parseInt(params.get('id')));

    if (!currentBabyRecord) {
      document.getElementById('profileContent').innerHTML = `<div class="empty-state">Baby profile not found.</div>`;
      hideLoading(); return;
    }

    // Set Calendar to the month of the next upcoming vaccine (if available)
    if (currentBabyRecord.upcoming.length > 0) {
      const nextDate = new Date(currentBabyRecord.upcoming[0].targetDate);
      currentCalYear = nextDate.getFullYear();
      currentCalMonth = nextDate.getMonth();
    }

    renderProfileData();
    renderCalendar();
    hideLoading();
  }, 300);
});

function renderProfileData() {
  document.getElementById('babyName').textContent = currentBabyRecord.name;
  document.getElementById('babyDetails').innerHTML = `
    <div><p class="mt-2"><strong>DOB:</strong> ${currentBabyRecord.dob}</p><p class="mt-2"><strong>Sex:</strong> ${currentBabyRecord.sex}</p></div>
    <div><p class="mt-2"><strong>Reg No:</strong> ${currentBabyRecord.registrationNumber}</p></div>
  `;

  document.getElementById('historyTable').innerHTML = currentBabyRecord.vaccinations.length ? currentBabyRecord.vaccinations.map(v => `
    <tr><td>${v.vaccine}</td><td>${v.date}</td><td>${v.dose}</td><td>${v.batch}</td><td>${v.worker}</td><td><span class="badge ${v.status.toLowerCase()}">${v.status}</span></td></tr>
  `).join('') : `<tr><td colspan="6" class="text-center text-muted">No history found.</td></tr>`;

  document.getElementById('upcomingTable').innerHTML = currentBabyRecord.upcoming.length ? currentBabyRecord.upcoming.map(u => `
    <tr><td>${u.vaccine}</td><td>${u.targetDate}</td><td><span class="badge ${u.status.toLowerCase()}">${u.status}</span></td></tr>
  `).join('') : `<tr><td colspan="3" class="text-center text-muted">No upcoming schedules.</td></tr>`;
}

// --- DIGITAL CALENDAR PROTOTYPE LOGIC ---
function renderCalendar() {
  const container = document.getElementById('vaccineCalendar');
  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const monthName = new Date(currentCalYear, currentCalMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  let html = `
    <div class="calendar-header">
      <button class="btn btn-outline" id="prevMonth" style="padding: 5px 15px;">&lt;</button>
      <h4 style="margin:0; font-size: 1.1rem; color: var(--color-dark);">${monthName}</h4>
      <button class="btn btn-outline" id="nextMonth" style="padding: 5px 15px;">&gt;</button>
    </div>
    <div class="calendar-grid">
  `;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(d => html += `<div class="calendar-day-name">${d}</div>`);

  // Empty cells before start of month
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-cell"></div>`;
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    let dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let isToday = dateStr === todayStr ? 'today' : '';
    let cellEvents = '';

    // Check Completed History
    currentBabyRecord.vaccinations.forEach(v => {
      if (v.date === dateStr) {
        cellEvents += `<div class="calendar-event completed" onclick="alert('Administered: ${v.vaccine} (Dose ${v.dose})')">${v.vaccine} ✓</div>`;
      }
    });

    // Check Upcoming / Overdue
    currentBabyRecord.upcoming.forEach(u => {
      if (u.targetDate === dateStr) {
        let cls = u.status.toLowerCase() === 'overdue' ? 'overdue' : 'upcoming';
        let icon = cls === 'overdue' ? '!' : '🕒';
        cellEvents += `<div class="calendar-event ${cls}" onclick="alert('Target Date: ${u.vaccine}\\nStatus: ${u.status}')">${u.vaccine} ${icon}</div>`;
      }
    });

    html += `<div class="calendar-cell active-month ${isToday}"><span class="calendar-date">${d}</span>${cellEvents}</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentCalMonth--; if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentCalMonth++; if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
    renderCalendar();
  });
}