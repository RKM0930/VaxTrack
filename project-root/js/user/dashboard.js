import { requireAuth, setupNav } from '../auth.js';
import { mockBabies } from '../api.js';
import { showLoading, hideLoading } from '../utils.js';

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  showLoading();
  
  setTimeout(() => {
    const grid = document.getElementById('babyGrid');
    if (mockBabies.length === 0) {
      grid.innerHTML = '<div class="empty-state">No babies registered yet.</div>';
    } else {
      grid.innerHTML = mockBabies.map(baby => {
        const next = baby.upcoming[0] || { vaccine: "Up to date", status: "Completed", targetDate: "-" };
        return `
          <div class="card baby-card" onclick="window.location.href='baby-profile.html?id=${baby.id}'">
            <h3 class="card-title" style="margin-bottom:5px;">${baby.name}</h3>
            <p style="font-size:0.9rem; color:var(--color-muted);">DOB: ${baby.dob}</p>
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--color-border);">
              <p style="font-size:0.85rem; margin-bottom: 8px;"><strong>Next Vaccine:</strong> ${next.vaccine} (${next.targetDate})</p>
              <span class="badge ${next.status.toLowerCase()}">${next.status}</span>
            </div>
          </div>
        `;
      }).join('');
    }
    hideLoading();
  }, 400);
});