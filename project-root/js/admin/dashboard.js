import { requireAdminAuth, setupNav } from '../auth.js';
import { mockDashboardStats, mockBabies } from '../api.js';
import { showLoading, hideLoading } from '../utils.js';

requireAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  setTimeout(() => {
    document.getElementById('totalBabies').textContent = mockDashboardStats.totalBabies;
    document.getElementById('vaccinesMonth').textContent = mockDashboardStats.vaccinesThisMonth;
    document.getElementById('upcomingWeek').textContent = mockDashboardStats.upcomingThisWeek;
    document.getElementById('overdueCount').textContent = mockDashboardStats.overdue;

    const alerts = [];
    mockBabies.forEach(b => {
      b.upcoming.forEach(u => {
        if (u.status === 'Overdue' || (u.targetDate && isWithin7Days(u.targetDate))) {
          alerts.push({ baby: b.name, vaccine: u.vaccine, target: u.targetDate, status: u.status });
        }
      });
    });

    const tbody = document.getElementById('alertsList');
    tbody.innerHTML = alerts.length ? alerts.map(a => `
      <tr><td>${a.baby}</td><td>${a.vaccine}</td><td>${a.target}</td><td><span class="badge ${a.status.toLowerCase()}">${a.status}</span></td></tr>
    `).join('') : `<tr><td colspan="4" class="text-center text-muted">No urgent alerts.</td></tr>`;
    
    hideLoading();
  }, 300);
});

function isWithin7Days(dateStr) {
  const target = new Date(dateStr);
  const diffDays = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}