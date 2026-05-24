import { requireAdminAuth, setupNav } from '../auth.js';
import { apiFetch, getAllBabies, getDashboardStats, isWithinDays } from '../api.js';
import { showLoading, hideLoading, formatDate, statusClass, sortByDateAsc } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAdminAuth();

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  showLoading();

  try {
    // Try real backend first
    let stats, babies;

    try {
      [stats, babies] = await Promise.all([
        apiFetch('/dashboard/stats'),
        apiFetch('/babies')
      ]);
    } catch (err) {
      console.warn('[API] Falling back to mock data:', err.message);
      stats = getDashboardStats();
      babies = getAllBabies();
    }

    // Render stats
    document.getElementById('totalBabies').textContent = stats.totalBabies;
    document.getElementById('vaccinesMonth').textContent = stats.vaccinesThisMonth;
    document.getElementById('upcomingWeek').textContent = stats.upcomingThisWeek;
    document.getElementById('overdueCount').textContent = stats.overdue;
    document.getElementById('pendingDocs').textContent = stats.pendingDocs;

    // Render alerts
    const alerts = [];
    babies.forEach(b => {
      const upcoming = b.upcoming || [];
      const documents = b.documents || [];
      const name = b.name || `${b.first_name} ${b.last_name}`;

      upcoming.forEach(u => {
        const targetDate = u.targetDate || u.target_date;
        if (u.status === 'Overdue' || u.status === 'Pending' || (targetDate && isWithinDays(targetDate, 7))) {
          alerts.push({ baby: name, vaccine: u.vaccine, targetDate, status: u.status });
        }
      });

      documents.forEach(doc => {
        if (doc.status === 'Pending' || doc.status === 'Rejected') {
          alerts.push({ baby: name, vaccine: doc.type, targetDate: doc.upload_date || doc.uploadDate, status: doc.status });
        }
      });
    });

    const tbody = document.getElementById('alertsList');
    const sortedAlerts = sortByDateAsc(alerts, 'targetDate');
    tbody.innerHTML = sortedAlerts.length ? sortedAlerts.map(a => `
      <tr>
        <td>${a.baby}</td>
        <td>${a.vaccine}</td>
        <td>${formatDate(a.targetDate)}</td>
        <td><span class="badge ${statusClass(a.status)}">${a.status}</span></td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="text-center text-muted">${getTranslation('admin.no_alerts')}</td></tr>`;

  } catch (err) {
    console.error('Dashboard error:', err);
  } finally {
    hideLoading();
  }
});