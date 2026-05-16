import { requireAuth, setupNav } from '../auth.js';
import { mockBabies } from '../api.js';

// Protect route
requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the top navigation bar (User Name, Logout)
  setupNav();
  
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  function filterBabies(query) {
    // Clear results if input is empty
    if (!query.trim()) {
      results.innerHTML = '';
      return;
    }

    const filtered = mockBabies.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));
    
    // Empty State UI
    if (filtered.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search" style="font-size:2rem; color:var(--color-muted); margin-bottom:10px;"></i>
          <p>No results found for "${query}".</p>
        </div>
      `;
      return;
    }
    
    // Results Cards UI
    results.innerHTML = filtered.map(b => `
      <div class="card" style="margin-bottom: 0; padding: 20px;">
        <h3 style="margin-bottom: 5px; color: var(--color-dark);">${b.name}</h3>
        <p style="color: var(--color-muted); font-size: 0.9rem; margin-bottom: 15px;">
          DOB: ${b.dob} | Reg No: ${b.registrationNumber}
        </p>
        <a href="baby-profile.html?id=${b.id}" class="btn btn-outline" style="width: 100%;">
          <i class="fas fa-user"></i> View Profile
        </a>
      </div>
    `).join('');
  }

  // Listen for typing events
  input.addEventListener('input', (e) => filterBabies(e.target.value));
});