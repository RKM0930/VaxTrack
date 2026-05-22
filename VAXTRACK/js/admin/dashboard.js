import { requireAdminAuth, setupNav } from '../auth.js';
import { getAllBabies, getDashboardStats, isWithinDays } from '../api.js';
import { showLoading, hideLoading, formatDate, statusClass, sortByDateAsc } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupI18n();
  showLoading();
  setTimeout(() => {
    const stats = getDashboardStats();
    document.getElementById('totalBabies').textContent = stats.totalBabies;
    document.getElementById('vaccinesMonth').textContent = stats.vaccinesThisMonth;
    document.getElementById('upcomingWeek').textContent = stats.upcomingThisWeek;
    document.getElementById('overdueCount').textContent = stats.overdue;
    document.getElementById('pendingDocs').textContent = stats.pendingDocs;

    const alerts = [];
    getAllBabies().forEach(b => {
      (b.upcoming || []).forEach(u => {
        if (u.status === 'Overdue' || u.status === 'Pending' || (u.targetDate && isWithinDays(u.targetDate, 7))) {
          alerts.push({ baby: b.name, vaccine: u.vaccine, targetDate: u.targetDate, status: u.status });
        }
      });
      (b.documents || []).forEach(doc => {
        if (doc.status === 'Pending' || doc.status === 'Rejected') {
          alerts.push({ baby: b.name, vaccine: doc.type, targetDate: doc.uploadDate, status: doc.status });
        }
      });
    });

    const tbody = document.getElementById('alertsList');
    const sortedAlerts = sortByDateAsc(alerts, 'targetDate');
    tbody.innerHTML = sortedAlerts.length ? sortedAlerts.map(a => `
      <tr><td>${a.baby}</td><td>${a.vaccine}</td><td>${formatDate(a.targetDate)}</td><td><span class="badge ${statusClass(a.status)}">${a.status}</span></td></tr>
    `).join('') : `<tr><td colspan="4" class="text-center text-muted">${getTranslation('admin.no_alerts')}</td></tr>`;
    
    hideLoading();
  }, 300);
});
