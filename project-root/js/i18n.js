/* FILE: js/i18n.js */

const translations = {
  en: {
    "auth.parent_title": "Parent Portal",
    "auth.parent_sub": "Access your baby's vaccination records",
    "auth.email": "Email Address",
    "auth.pass": "Password",
    "auth.signin": "Sign In",
    "auth.no_account": "Don't have an account?",
    "auth.register": "Register",
    "auth.bhw_login": "Healthcare Worker Login",
    "auth.reg_title": "Create Account",
    "auth.reg_sub": "Register to track your baby's health",
    "auth.name": "Full Name",
    "auth.confirm": "Confirm Password",
    "auth.complete_reg": "Complete Registration",
    "auth.has_account": "Already have an account?",
    "nav.back": "Back to Dashboard",
    "profile.history": "Vaccination History",
    "profile.upcoming": "Upcoming Vaccinations",
    "profile.calendar": "Vaccination Calendar",
    "table.vaccine": "Vaccine",
    "table.date": "Date",
    "table.dose": "Dose",
    "table.batch": "Batch",
    "table.worker": "Worker",
    "table.status": "Status",
    "table.target": "Target Date"
  },
  tl: {
    "auth.parent_title": "Portal ng Magulang",
    "auth.parent_sub": "Tingnan ang record ng bakuna ni baby",
    "auth.email": "Email Address", 
    "auth.pass": "Password",
    "auth.signin": "Mag-sign In",
    "auth.no_account": "Wala pang account?",
    "auth.register": "Gumawa ng Account",
    "auth.bhw_login": "Login para sa Health Worker",
    "auth.reg_title": "Gumawa ng Account",
    "auth.reg_sub": "Mag-rehistro para ma-track ang kalusugan ni baby",
    "auth.name": "Buong Pangalan",
    "auth.confirm": "I-kumpirma ang Password",
    "auth.complete_reg": "Kumpletuhin ang Rehistrasyon",
    "auth.has_account": "May account na ba?",
    "nav.back": "Bumalik sa Dashboard",
    "profile.history": "Kasaysayan ng Pagbabakuna",
    "profile.upcoming": "Mga Susunod na Bakuna",
    "profile.calendar": "Kalendaryo ng Bakuna",
    "table.vaccine": "Bakuna",
    "table.date": "Petsa",
    "table.dose": "Dosis",
    "table.batch": "Batch",
    "table.worker": "Health Worker",
    "table.status": "Status",
    "table.target": "Target na Petsa"
  }
};

let currentLang = localStorage.getItem('vax_lang') || 'en';

export function getTranslation(key) {
  return translations[currentLang][key] || key;
}

export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
      el.placeholder = getTranslation(key);
    } else {
      // Allow keeping icons intact if they exist inside the element
      const icon = el.querySelector('i');
      if (icon) {
        el.innerHTML = '';
        el.appendChild(icon);
        el.appendChild(document.createTextNode(' ' + getTranslation(key)));
      } else {
        el.textContent = getTranslation(key);
      }
    }
  });
}

export function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'tl' : 'en';
  localStorage.setItem('vax_lang', currentLang);
  translatePage();
  updateToggleButtons();
}

export function setupI18n() {
  updateToggleButtons();
  translatePage();
  
  // Attach listeners to any toggle buttons
  document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLanguage();
    });
  });
}

function updateToggleButtons() {
  document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
    btn.textContent = currentLang === 'en' ? 'EN / TL' : 'TL / EN';
  });
}