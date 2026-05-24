import { requireAuth, setupNav } from '../auth.js';
import { apiFetch, getBabiesForCurrentParent, getCompletionProgress, isWithinDays } from '../api.js';
import { showLoading, hideLoading, formatBabyAge, formatValue, formatDate, statusClass, sortByDateAsc, sortByDateDesc, openDocumentModal } from '../utils.js';
import { setupI18n, getTranslation } from '../i18n.js';

requireAuth();

let selectedBabyId = null;
let cachedBabies = [];
let calendarModalBabyId = null;
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth();
let calendarStatusFilter = 'All';
let calendarSourceFilter = 'All';
let vaccinationHistoryModalBabyId = null;
let vaccinationHistoryVaccineFilter = 'All Vaccines';

let babyRecordsOverlayOpen = false;
let documentsOverlayOpen = false;
let notificationsOpen = false;
let notificationsFullOpen = false;

function getNotificationStorageKey() {
  return `vax_read_notifications_${localStorage.getItem('vax_email') || 'default'}`;
}

function getReadNotificationIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(getNotificationStorageKey()) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch (err) {
    console.warn('Unable to read notification state.', err);
    return new Set();
  }
}

function saveReadNotificationIds(ids) {
  localStorage.setItem(getNotificationStorageKey(), JSON.stringify([...ids]));
}

function createNotificationId(item = {}) {
  return [item.babyId || 'all', item.type || 'info', item.title || '', item.date || '', item.detail || ''].join('|');
}

function markNotificationAsRead(id) {
  if (!id) return;
  const readIds = getReadNotificationIds();
  readIds.add(id);
  saveReadNotificationIds(readIds);
}

function markAllNotificationsAsRead() {
  const readIds = getReadNotificationIds();
  getNotificationItems().forEach(item => readIds.add(item.id));
  saveReadNotificationIds(readIds);
}

function babyNeedsAttention(baby) {
  const scheduleAttention = (baby.upcoming || []).some(item => {
    const status = item.status || '';
    return ['Overdue', 'Pending', 'Rejected'].includes(status) || isWithinDays(item.targetDate, 7);
  });
  const documentAttention = (baby.documents || []).some(doc => ['Pending', 'Rejected'].includes(doc.status || ''));
  return scheduleAttention || documentAttention;
}

function getReminderItemsForBaby(baby = {}) {
  const reminders = [];
  const upcoming = sortByDateAsc((baby.upcoming || []).filter(item => item.status !== 'Completed'), 'targetDate');
  const docs = baby.documents || [];
  const babyName = baby.name || getTranslation('table.baby_name');

  upcoming.forEach(item => {
    if (item.status === 'Overdue') {
      reminders.push({
        babyId: baby.id,
        date: item.targetDate,
        type: 'danger',
        icon: 'fa-triangle-exclamation',
        title: `${item.vaccine} is overdue`,
        detail: `${babyName} • Target date: ${formatDate(item.targetDate)}. Mag-follow up sa BHW.`
      });
    } else if (isWithinDays(item.targetDate, 7)) {
      reminders.push({
        babyId: baby.id,
        date: item.targetDate,
        type: 'warning',
        icon: 'fa-bell',
        title: `${item.vaccine} is due soon`,
        detail: `${babyName} • Scheduled on ${formatDate(item.targetDate)}.`
      });
    } else if (item.status === 'Pending') {
      reminders.push({
        babyId: baby.id,
        date: item.targetDate,
        type: 'pending',
        icon: 'fa-clock',
        title: `${item.vaccine} pending`,
        detail: `${babyName} • Waiting for schedule confirmation.`
      });
    }
  });

  docs.forEach(doc => {
    if (doc.status === 'Rejected') {
      reminders.push({
        babyId: baby.id,
        date: doc.uploadDate,
        type: 'danger',
        icon: 'fa-file-circle-xmark',
        title: `${doc.type} rejected`,
        detail: `${babyName} • ${doc.comment || 'Please upload a clearer copy.'}`
      });
    } else if (doc.status === 'Pending') {
      reminders.push({
        babyId: baby.id,
        date: doc.uploadDate,
        type: 'pending',
        icon: 'fa-file-circle-question',
        title: `${doc.type} pending`,
        detail: `${babyName} • Waiting for BHW verification.`
      });
    } else if (doc.status === 'Approved') {
      reminders.push({
        babyId: baby.id,
        date: doc.uploadDate,
        type: 'success',
        icon: 'fa-file-circle-check',
        title: `${doc.type} approved`,
        detail: `${babyName} • Verified document can now be viewed.`
      });
    }
  });

  return reminders;
}

function getNotificationItems() {
  const priority = { danger: 0, pending: 1, warning: 2, success: 3 };
  const readIds = getReadNotificationIds();
  return cachedBabies
    .flatMap(getReminderItemsForBaby)
    .map(item => {
      const id = createNotificationId(item);
      return { ...item, id, isRead: readIds.has(id) };
    })
    .sort((a, b) => {
      const readDiff = Number(a.isRead) - Number(b.isRead);
      if (readDiff) return readDiff;
      const priorityDiff = (priority[a.type] ?? 9) - (priority[b.type] ?? 9);
      if (priorityDiff) return priorityDiff;
      return new Date(a.date || '9999-12-31') - new Date(b.date || '9999-12-31');
    });
}

function applyNotificationDropdownState(open = notificationsOpen) {
  const dropdown = document.getElementById('notificationDropdown');
  const trigger = document.getElementById('notificationBell');

  notificationsOpen = open;
  dropdown?.classList.toggle('hidden', !open);
  trigger?.classList.toggle('is-open', open);
  trigger?.setAttribute('aria-expanded', String(open));
}

function closeNotificationDropdown() {
  applyNotificationDropdownState(false);
}

function applyNotificationsFullState(open = notificationsFullOpen) {
  const overlay = document.getElementById('notificationsFullOverlay');
  notificationsFullOpen = open;
  overlay?.classList.toggle('hidden', !open);
  if (open) closeNotificationDropdown();
}

function closeNotificationsFull() {
  applyNotificationsFullState(false);
}

function openNotificationsFull() {
  applyNotificationsFullState(true);
}

function handleNotificationSelect(button, closeAfterSelect = true) {
  markNotificationAsRead(button.dataset.notificationId);
  const babyId = button.dataset.babyId;
  if (babyId) {
    selectedBabyId = babyId;
    documentsOverlayOpen = false;
    renderBabyList(cachedBabies);
    renderBabyRecord(cachedBabies.find(baby => String(baby.id) === String(selectedBabyId)));
  } else {
    renderHeaderNotifications();
  }
  if (closeAfterSelect) {
    closeNotificationDropdown();
    closeNotificationsFull();
  }
}

function renderNotificationItems(container, notifications, options = {}) {
  if (!container) return;
  const { emptyText = getTranslation('dashboard.no_notifications'), closeAfterSelect = true } = options;

  if (!notifications.length) {
    container.innerHTML = `<div class="notification-empty">${emptyText}</div>`;
    return;
  }

  container.innerHTML = notifications.map((item, index) => `
    <button type="button" class="notification-item ${item.type} ${item.isRead ? 'is-read' : 'is-unread'}" data-index="${index}" data-notification-id="${item.id}" data-baby-id="${item.babyId || ''}">
      <span class="notification-read-dot" aria-hidden="true"></span>
      <span class="notification-item-icon"><i class="fas ${item.icon}" aria-hidden="true"></i></span>
      <span class="notification-item-copy">
        <strong>${item.title}</strong>
        <span>${item.detail}</span>
        ${item.date ? `<time>${formatDate(item.date)}</time>` : ''}
      </span>
      ${item.isRead ? '' : `<span class="notification-mark-read" aria-label="${getTranslation('dashboard.mark_read')}"><i class="fas fa-check" aria-hidden="true"></i></span>`}
    </button>
  `).join('');

  container.querySelectorAll('.notification-item').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      handleNotificationSelect(button, closeAfterSelect);
    });
  });
}

function bindNotificationControls() {
  const trigger = document.getElementById('notificationBell');
  const menu = document.getElementById('notificationMenu');
  const markAllButton = document.getElementById('markAllNotificationsRead');
  const markAllFullButton = document.getElementById('markAllNotificationsReadFull');
  const viewAllButton = document.getElementById('viewAllNotifications');
  const fullOverlay = document.getElementById('notificationsFullOverlay');
  const closeFullButton = document.getElementById('closeNotificationsFull');

  trigger?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (notificationsFullOpen) closeNotificationsFull();
    applyNotificationDropdownState(!notificationsOpen);
  });

  [markAllButton, markAllFullButton].forEach(button => {
    button?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      markAllNotificationsAsRead();
      renderHeaderNotifications();
    });
  });

  viewAllButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openNotificationsFull();
    renderHeaderNotifications();
  });

  closeFullButton?.addEventListener('click', closeNotificationsFull);
  fullOverlay?.addEventListener('click', event => {
    if (event.target === fullOverlay) closeNotificationsFull();
  });

  document.addEventListener('click', event => {
    if (!notificationsOpen) return;
    if (menu && !menu.contains(event.target)) closeNotificationDropdown();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (notificationsFullOpen) closeNotificationsFull();
    else if (notificationsOpen) closeNotificationDropdown();
  });
}

function renderHeaderNotifications() {
  const trigger = document.getElementById('notificationBell');
  const count = document.getElementById('notificationCount');
  const summary = document.getElementById('notificationSummary');
  const fullSummary = document.getElementById('notificationFullSummary');
  const list = document.getElementById('notificationList');
  const fullList = document.getElementById('notificationFullList');
  const markAllButton = document.getElementById('markAllNotificationsRead');
  const markAllFullButton = document.getElementById('markAllNotificationsReadFull');
  const viewAllButton = document.getElementById('viewAllNotifications');
  const footer = document.getElementById('notificationDropdownFooter');
  if (!trigger || !count || !summary || !list) return;

  const notifications = getNotificationItems();
  const unreadCount = notifications.filter(item => !item.isRead).length;
  const unreadText = String(unreadCount);
  const summaryText = notifications.length
    ? `${unreadCount} ${getTranslation('dashboard.unread_notifications')} / ${notifications.length} ${getTranslation('dashboard.notification_count')}`
    : getTranslation('dashboard.no_notifications');

  count.textContent = unreadText;
  count.classList.toggle('hidden', unreadCount === 0);
  count.setAttribute('aria-label', `${unreadText} unread notifications`);
  summary.textContent = summaryText;
  if (fullSummary) fullSummary.textContent = summaryText;
  trigger.setAttribute('aria-label', getTranslation('dashboard.notifications'));
  [markAllButton, markAllFullButton].forEach(button => {
    if (button) button.disabled = unreadCount === 0;
  });
  if (viewAllButton) viewAllButton.classList.remove('hidden');
  if (footer) footer.classList.remove('hidden');

  renderNotificationItems(list, notifications);
  renderNotificationItems(fullList, notifications);

  applyNotificationDropdownState(notificationsOpen);
  applyNotificationsFullState(notificationsFullOpen);
}

function applyBabyRecordsOverlayState(open = babyRecordsOverlayOpen) {
  const panel = document.getElementById('babyRecordsPanel');
  const backdrop = document.getElementById('babyRecordsOverlayBackdrop');
  const trigger = document.getElementById('babyRecordsTrigger');
  const hasAlerts = cachedBabies.some(babyNeedsAttention);

  babyRecordsOverlayOpen = open;
  panel?.classList.toggle('hidden', !open);
  backdrop?.classList.toggle('hidden', !open);
  trigger?.classList.toggle('is-open', open);
  trigger?.classList.toggle('has-alerts', hasAlerts);
  panel?.classList.toggle('has-alerts', hasAlerts);

  if (trigger) {
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open
      ? getTranslation('dashboard.collapse_baby_records')
      : getTranslation('dashboard.expand_baby_records'));
    trigger.title = open
      ? getTranslation('dashboard.collapse_baby_records')
      : getTranslation('dashboard.expand_baby_records');
  }
}

function closeBabyRecordsOverlay() {
  applyBabyRecordsOverlayState(false);
}

function openBabyRecordsOverlay() {
  applyBabyRecordsOverlayState(true);
}

function bindBabyRecordsOverlayControls() {
  const trigger = document.getElementById('babyRecordsTrigger');
  const closeButton = document.getElementById('babyRecordsClose');
  const backdrop = document.getElementById('babyRecordsOverlayBackdrop');

  trigger?.addEventListener('click', () => {
    applyBabyRecordsOverlayState(!babyRecordsOverlayOpen);
  });
  closeButton?.addEventListener('click', closeBabyRecordsOverlay);
  backdrop?.addEventListener('click', closeBabyRecordsOverlay);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && babyRecordsOverlayOpen) closeBabyRecordsOverlay();
  });
}

function applyDocumentsOverlayState(open = documentsOverlayOpen) {
  const panel = document.getElementById('documentsPanel');
  const trigger = document.getElementById('documentsTrigger');
  const selectedBaby = cachedBabies.find(baby => String(baby.id) === String(selectedBabyId));
  const canOpenDocuments = Boolean(selectedBabyId && selectedBaby && isApprovedStatus(getRegistrationStatus(selectedBaby)));

  documentsOverlayOpen = open && canOpenDocuments;
  panel?.classList.toggle('hidden', !documentsOverlayOpen);
  trigger?.classList.toggle('is-open', documentsOverlayOpen);
  trigger?.classList.toggle('is-disabled', !canOpenDocuments);

  if (trigger) {
    trigger.disabled = !canOpenDocuments;
    trigger.setAttribute('aria-expanded', String(documentsOverlayOpen));
    trigger.setAttribute('aria-label', documentsOverlayOpen
      ? getTranslation('dashboard.close_documents')
      : getTranslation('dashboard.open_documents'));
    trigger.title = documentsOverlayOpen
      ? getTranslation('dashboard.close_documents')
      : getTranslation('dashboard.open_documents');
  }
}

function closeDocumentsOverlay() {
  applyDocumentsOverlayState(false);
}

function bindDocumentsOverlayControls() {
  const trigger = document.getElementById('documentsTrigger');

  trigger?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedBabyId) return;
    applyDocumentsOverlayState(!documentsOverlayOpen);
  });

  document.addEventListener('click', event => {
    if (!documentsOverlayOpen) return;
    const panel = document.getElementById('documentsPanel');
    const currentTrigger = document.getElementById('documentsTrigger');
    if (!panel || !currentTrigger) return;
    if (!panel.contains(event.target) && !currentTrigger.contains(event.target)) {
      closeDocumentsOverlay();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && documentsOverlayOpen) closeDocumentsOverlay();
  });
}

function renderDocumentsOverlay(baby) {
  return `
    <aside id="documentsPanel" class="documents-overlay-panel card ${documentsOverlayOpen ? '' : 'hidden'}" aria-label="${getTranslation('dashboard.documents')}" role="dialog" aria-modal="false">
      <div class="documents-overlay-header">
        <h2>${getTranslation('dashboard.documents')}</h2>
        <button type="button" id="documentsPanelClose" class="documents-panel-close-btn" aria-label="${getTranslation('dashboard.close_documents')}"><i class="fas fa-times"></i></button>
      </div>
      <div class="documents-overlay-body">
        ${renderDocuments(baby)}
      </div>
    </aside>
  `;
}

function getUpcomingVaccines(baby) {
  return sortByDateAsc((baby.upcoming || []).filter(item => item.status !== 'Completed'), 'targetDate');
}

function getNextSchedule(baby) {
  const upcoming = getUpcomingVaccines(baby);
  return upcoming[0] || {
    vaccine: getTranslation('dashboard.up_to_date'),
    status: 'Completed',
    targetDate: '-'
  };
}

function getStatusLabel(status) {
  return status || 'Pending';
}

function isApprovedStatus(status) {
  return String(status || '').toLowerCase() === 'approved';
}


function getPrimaryDocument(baby = {}) {
  return (baby.documents || [])[0] || { status: baby.registrationStatus || 'Pending', filename: '-' };
}

function getRegistrationStatus(baby = {}) {
  const primaryDoc = getPrimaryDocument(baby);
  return getStatusLabel(baby.registrationStatus || primaryDoc.status || 'Pending');
}

function setEmptyDashboardMode(isEmpty = false) {
  const layout = document.querySelector('.baby-records-overlay-layout');
  layout?.classList.toggle('is-empty-dashboard', isEmpty);
  if (isEmpty) {
    babyRecordsOverlayOpen = false;
    documentsOverlayOpen = false;
    applyBabyRecordsOverlayState(false);
    applyDocumentsOverlayState(false);
  }
}

function renderNoBabyState() {
  const panel = document.getElementById('babyRecordPanel');
  if (!panel) return;
  setEmptyDashboardMode(true);
  renderHeaderNotifications();
  panel.innerHTML = `
    <section class="dashboard-empty-state card" aria-label="No registered baby">
      <div class="dashboard-empty-icon"><i class="fas fa-baby" aria-hidden="true"></i></div>
      <h1>${getTranslation('dashboard.empty_title')}</h1>
      <p>${getTranslation('dashboard.empty_message')}</p>
      <a href="baby-register.html" class="btn btn-primary dashboard-empty-action"><i class="fas fa-plus"></i> ${getTranslation('dashboard.register_baby_short')}</a>
      <small>${getTranslation('dashboard.empty_helper')}</small>
    </section>
  `;
}

function renderPendingSkeletonCard(title, rows = 3, options = {}) {
  const wide = options.wide ? ' wide' : '';
  return `
    <section class="pending-skeleton-section${wide}">
      <div class="pending-skeleton-heading">
        <span class="skeleton-line skeleton-label"></span>
        <span class="skeleton-line skeleton-action"></span>
      </div>
      <div class="pending-skeleton-rows">
        ${Array.from({ length: rows }).map((_, index) => `
          <div class="pending-skeleton-row ${index % 2 ? 'short-row' : ''}">
            <span class="skeleton-line skeleton-key"></span>
            <span class="skeleton-line skeleton-value"></span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderPendingSkeletonDashboard(baby, primaryDoc, status) {
  return `
    <div class="pending-dashboard-state">
      <div class="pending-dashboard-preview selected-baby-record" aria-hidden="true">
        <section class="card selected-baby-main pending-skeleton-main">
          <div class="pending-skeleton-topbar">
            <div>
              <span class="skeleton-line skeleton-kicker"></span>
              <span class="skeleton-line skeleton-title-large"></span>
              <span class="skeleton-line skeleton-subtitle"></span>
            </div>
            <span class="skeleton-line skeleton-badge"></span>
          </div>

          <div class="pending-skeleton-section record-section">
            <div class="pending-skeleton-section-title"><span class="skeleton-line skeleton-section-title"></span></div>
            <div class="record-info-summary skeleton-record-summary">
              <div class="record-info-group">
                <div class="record-info-grid">
                  ${Array.from({ length: 7 }).map(() => `
                    <div class="record-info-row skeleton-info-row">
                      <span class="skeleton-line skeleton-info-label"></span>
                      <strong class="skeleton-line skeleton-info-value"></strong>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="record-info-group">
                <h3 class="record-info-subheading"><span class="skeleton-line skeleton-section-title small"></span></h3>
                <div class="record-info-grid guardian-record-grid">
                  ${Array.from({ length: 3 }).map(() => `
                    <div class="record-info-row skeleton-info-row">
                      <span class="skeleton-line skeleton-info-label"></span>
                      <strong class="skeleton-line skeleton-info-value"></strong>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="pending-main-support-grid">
            ${renderPendingSkeletonCard('Medical Test History', 3)}
            ${renderPendingSkeletonCard('Documents', 3)}
          </div>
        </section>

        <aside class="record-side-panel pending-skeleton-side" aria-label="Locked schedule preview">
          ${renderPendingSkeletonCard('Schedule Calendar', 5, { wide: true })}
          ${renderPendingSkeletonCard('Vaccination History', 4, { wide: true })}
          ${renderPendingSkeletonCard('Reminders', 3, { wide: true })}
        </aside>
      </div>

      <div class="pending-dashboard-lock" role="presentation">
        <section class="pending-approval-modal card" role="status" aria-live="polite">
          <div class="pending-modal-status-row">
            <span class="badge ${statusClass(status)}">${status}</span>
          </div>
          <div class="pending-modal-header">
            <div class="pending-modal-icon"><i class="fas fa-file-circle-question" aria-hidden="true"></i></div>
            <div>
              <span class="page-kicker">${getTranslation('dashboard.registration_status')}</span>
              <h1>${getTranslation('dashboard.pending_title')}</h1>
              <p>${getTranslation('dashboard.pending_message')}</p>
            </div>
          </div>
          <div class="pending-modal-details">
            <div><span>Baby Name</span><strong>${baby.name}</strong></div>
            <div><span>${getTranslation('profile.reg_no')}</span><strong>${formatValue(baby.registrationNumber, '-')}</strong></div>
            <div><span>${getTranslation('table.document')}</span><strong>${formatValue(primaryDoc.type || 'Birth Certificate')}</strong></div>
            <div><span>${getTranslation('table.status')}</span><strong>${status}</strong></div>
            <div><span>${getTranslation('table.date_uploaded')}</span><strong>${formatDate(primaryDoc.uploadDate)}</strong></div>
            <div><span>File Name</span><strong>${formatValue(primaryDoc.filename, '-')}</strong></div>
          </div>
          <small>${getTranslation('dashboard.approval_note')}</small>
        </section>
      </div>
    </div>
  `;
}

function renderRegistrationStatusState(baby) {
  const panel = document.getElementById('babyRecordPanel');
  if (!panel) return;

  const primaryDoc = getPrimaryDocument(baby);
  const status = getRegistrationStatus(baby);
  const isRejected = String(status).toLowerCase() === 'rejected';

  setEmptyDashboardMode(false);
  documentsOverlayOpen = false;
  applyDocumentsOverlayState(false);

  if (!isRejected) {
    panel.innerHTML = `
      ${renderPendingSkeletonDashboard(baby, primaryDoc, status)}
      ${renderDocumentsOverlay(baby)}
    `;
    document.getElementById('documentsPanelClose')?.addEventListener('click', closeDocumentsOverlay);
    applyDocumentsOverlayState(false);
    bindDocumentButtons(baby);
    renderHeaderNotifications();
    return;
  }

  const title = getTranslation('dashboard.rejected_title');
  const message = getTranslation('dashboard.rejected_message');
  const icon = 'fa-file-circle-xmark';

  panel.innerHTML = `
    <section class="registration-status-state card ${statusClass(status)}" aria-label="Registration status">
      <div class="registration-status-header">
        <div>
          <span class="page-kicker">${getTranslation('dashboard.registration_status')}</span>
          <h1>${baby.name}</h1>
          <p>${getTranslation('profile.reg_no')}: ${formatValue(baby.registrationNumber, '-')} • ${getTranslation('dashboard.age')}: ${formatBabyAge(baby.dob)}</p>
        </div>
        <span class="badge ${statusClass(status)}">${status}</span>
      </div>

      <div class="registration-status-body">
        <div class="registration-status-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
        <div>
          <h2>${title}</h2>
          <p>${message}</p>
          <div class="registration-status-details">
            <div><span>${getTranslation('table.document')}</span><strong>${formatValue(primaryDoc.type || 'Birth Certificate')}</strong></div>
            <div><span>${getTranslation('table.status')}</span><strong>${status}</strong></div>
            <div><span>${getTranslation('table.date_uploaded')}</span><strong>${formatDate(primaryDoc.uploadDate)}</strong></div>
            ${primaryDoc.comment ? `<div class="status-detail-wide"><span>${getTranslation('dashboard.admin_comment')}</span><strong>${primaryDoc.comment}</strong></div>` : ''}
          </div>
          <small>${getTranslation('dashboard.approval_note')}</small>
        </div>
      </div>
    </section>
  `;
  renderHeaderNotifications();
}

function renderBabyList(babies) {
  const list = document.getElementById('babyGrid');
  if (!list) return;

  if (babies.length === 0) {
    list.innerHTML = `
      <div class="empty-state compact-empty">
        <p>${getTranslation('dashboard.no_babies')}</p>
        <a href="baby-register.html" class="btn btn-primary mt-2">${getTranslation('dashboard.register_baby')}</a>
      </div>
    `;
    return;
  }

  list.innerHTML = babies.map(baby => {
    const next = getNextSchedule(baby);
    const active = String(baby.id) === String(selectedBabyId) ? 'selected' : '';
    const hasNotification = babyNeedsAttention(baby);

    return `
      <div class="baby-selector-card ${active}" data-baby-id="${baby.id}" role="button" tabindex="0" aria-pressed="${active ? 'true' : 'false'}">
        ${hasNotification ? `<span class="baby-notification-dot" aria-label="Needs attention"></span>` : ''}
        <div class="baby-selector-card-main">
          <div class="baby-selector-copy">
            <span class="baby-selector-name">${baby.name}</span>
            <span class="baby-selector-next">${getTranslation('dashboard.next_vaccine')}: ${next.vaccine}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const selectBaby = (babyId) => {
    selectedBabyId = babyId;
    documentsOverlayOpen = false;
    renderBabyList(cachedBabies);
    renderBabyRecord(cachedBabies.find(baby => String(baby.id) === String(selectedBabyId)));
    closeBabyRecordsOverlay();
  };

  list.querySelectorAll('.baby-selector-card').forEach(card => {
    card.addEventListener('click', () => {
      selectBaby(card.dataset.babyId);
    });

    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectBaby(card.dataset.babyId);
    });
  });

  applyBabyRecordsOverlayState();
}

function renderInfoGrid(baby) {
  return `
    <div class="record-info-summary">
      <div class="record-info-group baby-info-record">
        <div class="record-info-grid">
          <div class="record-info-row"><span>${getTranslation('dashboard.dob')}</span><strong>${formatDate(baby.dob)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('dashboard.age')}</span><strong>${formatBabyAge(baby.dob)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.sex')}</span><strong>${formatValue(baby.sex)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.place_of_birth')}</span><strong>${formatValue(baby.placeOfBirth)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.birth_weight')}</span><strong>${formatValue(baby.birthWeight)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.blood_type')}</span><strong>${formatValue(baby.bloodType)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.private_clinic')}</span><strong>${baby.privateClinic ? (baby.privateClinicName || 'Yes') : 'No'}</strong></div>
        </div>
      </div>

      <div class="record-info-group parent-guardian-record">
        <h3 class="record-info-subheading">${getTranslation('profile.guardian_info')}</h3>
        <div class="record-info-grid guardian-record-grid">
          <div class="record-info-row"><span>${getTranslation('profile.guardian')}</span><strong>${formatValue(baby.guardianName)}</strong></div>
          <div class="record-info-row"><span>${getTranslation('profile.phone')}</span><strong>${formatValue(baby.guardianPhone)}</strong></div>
          <div class="record-info-row record-info-row-wide"><span>${getTranslation('profile.address')}</span><strong>${formatValue(baby.guardianAddress)}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderCompletionProgress(baby, mode = 'section') {
  const progress = getCompletionProgress(baby);

  if (mode === 'inline') {
    return `
      <div class="history-completion-summary" aria-label="Vaccination completion summary">
        <div class="completion-summary-row">
          <span>${getTranslation('dashboard.completion')}</span>
          <strong>${progress.percent}%</strong>
        </div>
        <div class="progress-track completion-progress-track"><div style="width:${progress.percent}%"></div></div>
        <p>${progress.completed} ${getTranslation('dashboard.completed_count')} / ${progress.total || 0} schedule items</p>
      </div>
    `;
  }

  const content = `
    <div class="completion-header">
      <h2>${getTranslation('dashboard.completion')}</h2>
      <strong>${progress.percent}%</strong>
    </div>
    <div class="progress-track"><div style="width:${progress.percent}%"></div></div>
    <p>${progress.completed} ${getTranslation('dashboard.completed_count')} / ${progress.total || 0} total schedule items</p>
  `;

  return `<section class="record-section completion-card">${content}</section>`;
}

function renderVaccineSummary(baby) {
  const upcomingVaccines = getUpcomingVaccines(baby);

  if (upcomingVaccines.length <= 1) {
    const next = upcomingVaccines[0] || getNextSchedule(baby);
    return `
      <section class="next-vaccine-card" aria-label="Next vaccine schedule">
        <div class="next-vaccine-primary">
          <span>${getTranslation('dashboard.next_vaccine')}</span>
          <strong>${next.vaccine}</strong>
        </div>
        <div>
          <span>${getTranslation('table.target')}</span>
          <strong>${formatDate(next.targetDate)}</strong>
        </div>
        <div>
          <span>${getTranslation('table.status')}</span>
          <span class="badge ${statusClass(next.status)}">${next.status}</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="upcoming-vaccines-card" aria-label="Upcoming vaccine schedules">
      <div class="upcoming-vaccines-header">
        <div>
          <span>${getTranslation('dashboard.upcoming_vaccines')}</span>
          <strong>${upcomingVaccines.length} ${getTranslation('dashboard.schedules')}</strong>
        </div>
      </div>
      <div class="upcoming-vaccines-list">
        ${upcomingVaccines.map(item => `
          <div class="upcoming-vaccine-item ${statusClass(item.status)}">
            <strong>${item.vaccine}</strong>
            <span>${formatDate(item.targetDate)}</span>
            <span class="badge ${statusClass(item.status)}">${item.status || 'Upcoming'}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderReminders(baby, placement = 'main') {
  const panelClass = placement === 'side' ? ' side-record-card' : '';
  const reminders = getReminderItemsForBaby(baby);

  if (!reminders.length) {
    return `
      <section class="record-section reminders-panel${panelClass}">
        <h2>${getTranslation('dashboard.reminders')}</h2>
        <div class="empty-state compact-empty">${getTranslation('dashboard.no_reminders')}</div>
      </section>
    `;
  }

  return `
    <section class="record-section reminders-panel${panelClass}">
      <h2>${getTranslation('dashboard.reminders')}</h2>
      <div class="reminder-list">
        ${reminders.slice(0, 5).map(item => `
          <div class="reminder-item ${item.type}">
            <i class="fas ${item.icon}"></i>
            <div><strong>${item.title}</strong><span>${item.detail}</span></div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderDocuments(baby) {
  const docs = sortByDateDesc(baby.documents || [], 'uploadDate');
  if (docs.length === 0) return `<div class="empty-state compact-empty">${getTranslation('dashboard.no_documents')}</div>`;

  return `
    <div class="document-chip-list">
      ${docs.map(doc => `
        <div class="document-chip">
          <div>
            <strong>${doc.type}</strong>
            <small>${doc.filename} • ${formatDate(doc.uploadDate)}</small>
            ${doc.comment ? `<small class="comment-text">${doc.comment}</small>` : ''}
          </div>
          <div class="document-chip-actions">
            <span class="badge ${statusClass(doc.status)}">${doc.status}</span>
            <button type="button" class="btn btn-outline btn-sm view-doc-btn" data-doc-id="${doc.id}">${getTranslation('profile.view_document')}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}


function getVaccinationSource(item = {}, baby = {}) {
  if (item.privateClinic) return item.source || item.clinicName || baby.privateClinicName || 'Private Clinic';
  return item.source || item.clinicName || 'Barangay Health Center';
}

function getVaccinationWorker(item = {}) {
  return item.worker || item.administeredBy || item.healthWorker || 'Not provided';
}

function getVaccinationRemarks(item = {}) {
  return item.remarks || item.notes || item.comment || '';
}

function getCompletedVaccinationRecords(baby) {
  return sortByDateDesc(baby.vaccinations || [], 'date');
}

const VACCINATION_DETAIL_FILTERS = ['All Vaccines', 'BCG', 'PENTA 3', 'OPV 3', 'MCV 1', 'MCV 2'];

function vaccineMatchesFilter(item = {}, filter = 'All Vaccines') {
  if (filter === 'All Vaccines') return true;
  return String(item.vaccine || '').trim().toUpperCase() === filter.toUpperCase();
}

function renderVaccinationHistoryList(baby) {
  const records = getCompletedVaccinationRecords(baby);
  if (!records.length) return `<div class="empty-state compact-empty">${getTranslation('profile.no_history')}</div>`;

  return `
    <div class="vaccination-history-compact">
      <div class="side-record-list vaccination-compact-list">
        ${records.map(item => `
          <div class="side-record-item vaccination-history-summary-item">
            <div class="vaccination-summary-main">
              <strong>${item.vaccine}</strong>
              <span>${formatDate(item.date)} • ${getVaccinationSource(item, baby)}</span>
            </div>
            <span class="badge ${statusClass(item.status || 'Completed')}">${item.status || 'Completed'}</span>
          </div>
        `).join('')}
      </div>
      <button type="button" class="btn btn-outline btn-sm vaccination-history-details-btn" data-baby-id="${baby.id}">
        <i class="fas fa-up-right-from-square"></i>
        ${getTranslation('profile.view_vaccination_details')}
      </button>
    </div>
  `;
}

function renderVaccinationHistoryModal(baby) {
  if (String(vaccinationHistoryModalBabyId) !== String(baby.id)) return '';

  const records = getCompletedVaccinationRecords(baby);
  const selectedFilter = VACCINATION_DETAIL_FILTERS.includes(vaccinationHistoryVaccineFilter)
    ? vaccinationHistoryVaccineFilter
    : 'All Vaccines';
  const filteredRecords = records.filter(item => vaccineMatchesFilter(item, selectedFilter));

  return `
    <div class="modal-backdrop vaccination-history-modal" id="vaccinationHistoryModal" role="presentation">
      <div class="modal-card vaccination-history-modal-card" role="dialog" aria-modal="true" aria-label="${getTranslation('profile.vaccination_details')}">
        <div class="vaccination-history-modal-top">
          <div class="vaccination-history-modal-header">
            <p class="page-kicker">${getTranslation('dashboard.completion')}</p>
            <h2>${getTranslation('profile.vaccination_details')}</h2>
            <span>${baby.name} • ${getTranslation('profile.reg_no')}: ${baby.registrationNumber}</span>
          </div>
          <button type="button" class="modal-close vaccination-history-close-btn" aria-label="${getTranslation('profile.close_vaccination_details')}"><i class="fas fa-times"></i></button>
        </div>

        ${renderCompletionProgress(baby, 'inline')}

        <div class="vaccination-detail-toolbar" aria-label="Vaccination detail filters">
          <label>
            <span>Vaccine</span>
            <select class="vaccination-detail-filter-select" aria-label="Filter vaccination details by vaccine">
              ${VACCINATION_DETAIL_FILTERS.map(value => `
                <option value="${value}" ${selectedFilter === value ? 'selected' : ''}>${value}</option>
              `).join('')}
            </select>
          </label>
        </div>

        <div class="vaccination-detail-list">
          ${filteredRecords.length ? filteredRecords.map(item => `
            <article class="vaccination-detail-card">
              <div class="vaccination-detail-head">
                <div>
                  <strong>${item.vaccine}</strong>
                  <span>${formatDate(item.date)}</span>
                </div>
                <span class="badge ${statusClass(item.status || 'Completed')}">${item.status || 'Completed'}</span>
              </div>
              <div class="vaccination-detail-grid">
                <div class="vaccination-detail-row"><span>${getTranslation('profile.date_administered')}</span><strong>${formatDate(item.date)}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('table.status')}</span><strong>${item.status || 'Completed'}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('dashboard.schedule_source')}</span><strong>${getVaccinationSource(item, baby)}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('profile.administered_by')}</span><strong>${formatValue(getVaccinationWorker(item), '-')}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('table.dose')}</span><strong>${formatValue(item.dose, '-')}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('table.batch')}</span><strong>${formatValue(item.batch, '-')}</strong></div>
                <div class="vaccination-detail-row"><span>${getTranslation('profile.private_clinic_record')}</span><strong>${item.privateClinic ? 'Yes' : 'No'}</strong></div>
                <div class="vaccination-detail-row vaccination-detail-row-wide"><span>${getTranslation('profile.remarks')}</span><strong>${formatValue(getVaccinationRemarks(item), getTranslation('profile.no_remarks'))}</strong></div>
              </div>
            </article>
          `).join('') : `<div class="empty-state compact-empty">${records.length ? 'No records match the selected vaccine.' : getTranslation('profile.no_history')}</div>`}
        </div>
      </div>
    </div>
  `;
}

function bindVaccinationHistoryControls(baby) {
  document.querySelectorAll('.vaccination-history-details-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      vaccinationHistoryModalBabyId = baby.id;
      vaccinationHistoryVaccineFilter = 'All Vaccines';
      renderBabyRecord(baby);
    });
  });

  const closeModal = () => {
    vaccinationHistoryModalBabyId = null;
    vaccinationHistoryVaccineFilter = 'All Vaccines';
    renderBabyRecord(baby);
  };

  document.querySelectorAll('.vaccination-history-close-btn').forEach(button => {
    button.addEventListener('click', closeModal);
  });

  document.querySelectorAll('.vaccination-detail-filter-select').forEach(select => {
    select.addEventListener('change', event => {
      vaccinationHistoryVaccineFilter = event.target.value || 'All Vaccines';
      renderBabyRecord(baby);
    });
  });

  const modal = document.getElementById('vaccinationHistoryModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
  }
}

function renderMedicalHistoryList(baby) {
  const records = sortByDateDesc(baby.testHistory || [], 'date');
  if (!records.length) return `<div class="empty-state compact-empty">${getTranslation('profile.no_tests')}</div>`;

  return `
    <div class="medical-record-list" aria-label="Medical test history records">
      ${records.map(item => `
        <div class="medical-record-row">
          <strong class="medical-record-test">${item.test}</strong>
          <span class="medical-record-date">${formatDate(item.date)}</span>
          <span class="medical-record-result">${formatValue(item.result, '-')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecordTable(items, columns, emptyMessage) {
  if (!items || items.length === 0) {
    return `<div class="empty-state compact-empty">${emptyMessage}</div>`;
  }

  return `
    <div class="table-responsive compact-table">
      <table>
        <thead><tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${items.map(item => `
            <tr>
              ${columns.map(col => `<td>${col.render ? col.render(item) : formatValue(item[col.key], '-')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}


function getSourceCategory(item = {}) {
  const sourceText = String(item.source || item.clinicName || '').toLowerCase();
  if (item.privateClinic || sourceText.includes('private')) return 'Private Clinic';
  return 'Barangay Health Center';
}

function normalizeScheduleStatus(status = 'Upcoming') {
  const clean = String(status || 'Upcoming').trim();
  const lower = clean.toLowerCase();
  if (lower === 'completed') return 'Completed';
  if (lower === 'overdue') return 'Overdue';
  if (lower === 'pending') return 'Pending';
  return 'Upcoming';
}

function getScheduleItems(baby) {
  const completed = (baby.vaccinations || [])
    .filter(item => item.date)
    .map(item => ({
      vaccine: item.vaccine,
      date: item.date,
      status: normalizeScheduleStatus(item.status || 'Completed'),
      source: item.privateClinic ? (item.source || baby.privateClinicName || 'Private Clinic') : (item.source || item.worker || 'Barangay Health Center'),
      sourceCategory: getSourceCategory(item)
    }));

  const scheduled = (baby.upcoming || [])
    .filter(item => item.targetDate)
    .map(item => ({
      vaccine: item.vaccine,
      date: item.targetDate,
      status: normalizeScheduleStatus(item.status || 'Upcoming'),
      source: item.privateClinic ? (item.source || item.clinicName || 'Private Clinic') : (item.source || item.clinicName || 'Barangay Health Center'),
      sourceCategory: getSourceCategory(item)
    }));

  return [...scheduled, ...completed]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function isActionableScheduleStatus(status) {
  return ['Upcoming', 'Overdue', 'Pending'].includes(normalizeScheduleStatus(status));
}

function getActionableScheduleItems(baby) {
  return getScheduleItems(baby).filter(item => isActionableScheduleStatus(item.status));
}

function getFilteredCalendarItems(items = []) {
  return items.filter(item => {
    const matchesStatus = calendarStatusFilter === 'All' || normalizeScheduleStatus(item.status) === calendarStatusFilter;
    const matchesSource = calendarSourceFilter === 'All' || item.sourceCategory === calendarSourceFilter;
    return matchesStatus && matchesSource;
  });
}

function renderCompactScheduleCalendar(baby) {
  const scheduleItems = getActionableScheduleItems(baby);

  if (!scheduleItems.length) {
    return `<div class="empty-state compact-empty">${getTranslation('dashboard.no_actionable_schedule')}</div>`;
  }

  return `
    <div class="compact-schedule-calendar" aria-label="Compact schedule calendar">
      ${scheduleItems.map(item => `
        <div class="schedule-date-item ${statusClass(item.status)}">
          <div class="schedule-date-pill">
            <strong>${formatDate(item.date)}</strong>
          </div>
          <div class="schedule-date-details">
            <strong>${item.vaccine}</strong>
            <span>${getTranslation('dashboard.schedule_source')}: ${formatValue(item.source, '-')}</span>
          </div>
          <span class="badge ${statusClass(item.status)}">${item.status}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function getCalendarAnchorDate(scheduleItems) {
  const upcoming = scheduleItems.find(item => ['Upcoming', 'Pending', 'Overdue'].includes(item.status));
  const anchor = upcoming || scheduleItems[0];
  const parsed = anchor ? new Date(anchor.date) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderDigitalCalendarModal(baby) {
  if (String(calendarModalBabyId) !== String(baby.id)) return '';

  const scheduleItems = getScheduleItems(baby);
  if (!scheduleItems.length) return '';

  const filteredScheduleItems = getFilteredCalendarItems(scheduleItems);

  const monthName = new Date(calendarViewYear, calendarViewMonth).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric'
  });
  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const todayKey = getDateKey(new Date());
  const eventsByDate = filteredScheduleItems.reduce((map, item) => {
    const key = item.date;
    map[key] = map[key] || [];
    map[key].push(item);
    return map;
  }, {});

  let cells = '';
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="digital-calendar-cell is-empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items = eventsByDate[dateKey] || [];
    const todayClass = dateKey === todayKey ? 'today' : '';
    cells += `
      <div class="digital-calendar-cell ${todayClass} ${items.length ? 'has-events' : ''}">
        <span class="digital-calendar-date">${day}</span>
        <div class="digital-calendar-events">
          ${items.slice(0, 2).map(item => `
            <span class="digital-calendar-event ${statusClass(item.status)}" title="${item.vaccine} • ${item.status} • ${formatValue(item.source, '-')}">${item.vaccine}</span>
          `).join('')}
          ${items.length > 2 ? `<span class="digital-calendar-event-more">+${items.length - 2}</span>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop schedule-calendar-modal" id="scheduleCalendarModal" role="presentation">
      <div class="modal-card schedule-modal-card" role="dialog" aria-modal="true" aria-label="${getTranslation('dashboard.digital_calendar')}">
        <button type="button" class="modal-close calendar-close-btn schedule-modal-close" aria-label="${getTranslation('dashboard.close_calendar')}"><i class="fas fa-times"></i></button>

        <div class="digital-calendar-body">
          <div class="digital-calendar-main">
            <div class="digital-calendar-toolbar">
              <button type="button" class="btn btn-outline btn-sm calendar-prev-btn" aria-label="${getTranslation('dashboard.previous_month')}"><i class="fas fa-chevron-left"></i></button>
              <strong>${monthName}</strong>
              <button type="button" class="btn btn-outline btn-sm calendar-next-btn" aria-label="${getTranslation('dashboard.next_month')}"><i class="fas fa-chevron-right"></i></button>
            </div>

            <div class="digital-calendar-legend" aria-label="Status indicators">
              <span><i class="legend-dot completed"></i>Completed</span>
              <span><i class="legend-dot upcoming"></i>Upcoming</span>
              <span><i class="legend-dot overdue"></i>Overdue</span>
              <span><i class="legend-dot pending"></i>Pending</span>
            </div>

            <div class="digital-calendar-filters" aria-label="Calendar filters">
              <label>
                <span>${getTranslation('dashboard.filter_status')}</span>
                <select class="calendar-filter-select" data-filter-type="status">
                  ${['All', 'Upcoming', 'Overdue', 'Pending', 'Completed'].map(value => `
                    <option value="${value}" ${calendarStatusFilter === value ? 'selected' : ''}>${getTranslation(`dashboard.filter_${value.toLowerCase().replace(/ /g, '_')}`)}</option>
                  `).join('')}
                </select>
              </label>
              <label>
                <span>${getTranslation('dashboard.filter_source')}</span>
                <select class="calendar-filter-select" data-filter-type="source">
                  ${['All', 'Barangay Health Center', 'Private Clinic'].map(value => `
                    <option value="${value}" ${calendarSourceFilter === value ? 'selected' : ''}>${value === 'All' ? getTranslation('dashboard.filter_all') : value}</option>
                  `).join('')}
                </select>
              </label>
            </div>

            <div class="digital-calendar-grid" aria-label="Monthly vaccination calendar">
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div class="digital-calendar-day-name">${day}</div>`).join('')}
              ${cells}
            </div>
          </div>

          <aside class="digital-calendar-list">
            <h3>${getTranslation('dashboard.schedule_list')}</h3>
            <div class="digital-schedule-items">
              ${filteredScheduleItems.length ? filteredScheduleItems.map(item => `
                <div class="digital-schedule-item ${statusClass(item.status)}">
                  <div class="digital-schedule-item-head">
                    <strong>${item.vaccine}</strong>
                    <span class="badge ${statusClass(item.status)}">${item.status}</span>
                  </div>
                  <span>${formatDate(item.date)}</span>
                  <small>${formatValue(item.source, '-')}</small>
                </div>
              `).join('') : `<div class="empty-state compact-empty">${getTranslation('dashboard.no_matching_schedules')}</div>`}
            </div>
          </aside>
        </div>
      </div>
    </div>
  `;
}

function renderScheduleSection(baby) {
  const scheduleItems = getScheduleItems(baby);

  return `
    <section class="record-section schedule-calendar-section side-record-card">
      <div class="record-section-heading">
        <h2>${getTranslation('dashboard.schedule_calendar')}</h2>
        ${scheduleItems.length ? `
          <button type="button" class="btn btn-outline btn-sm schedule-open-calendar-btn" data-baby-id="${baby.id}" aria-label="${getTranslation('dashboard.open_digital_calendar')}">
            <i class="fas fa-calendar-days"></i>
            <span>${getTranslation('dashboard.view_calendar')}</span>
          </button>
        ` : ''}
      </div>
      ${renderCompactScheduleCalendar(baby)}
    </section>
  `;
}

function bindScheduleCalendarControls(baby) {
  const openButton = document.querySelector('.schedule-open-calendar-btn');
  if (openButton) {
    openButton.addEventListener('click', () => {
      const actionableItems = getActionableScheduleItems(baby);
      const scheduleItems = getScheduleItems(baby);
      const anchorDate = getCalendarAnchorDate(actionableItems.length ? actionableItems : scheduleItems);
      calendarModalBabyId = baby.id;
      calendarStatusFilter = 'All';
      calendarSourceFilter = 'All';
      calendarViewYear = anchorDate.getFullYear();
      calendarViewMonth = anchorDate.getMonth();
      renderBabyRecord(baby);
    });
  }

  const closeModal = () => {
    calendarModalBabyId = null;
    renderBabyRecord(baby);
  };

  document.querySelectorAll('.calendar-close-btn').forEach(button => {
    button.addEventListener('click', closeModal);
  });

  const modal = document.getElementById('scheduleCalendarModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
  }

  document.querySelectorAll('.calendar-filter-select').forEach(select => {
    select.addEventListener('change', event => {
      if (event.target.dataset.filterType === 'status') {
        calendarStatusFilter = event.target.value;
      } else if (event.target.dataset.filterType === 'source') {
        calendarSourceFilter = event.target.value;
      }
      renderBabyRecord(baby);
    });
  });

  document.querySelectorAll('.calendar-prev-btn').forEach(button => {
    button.addEventListener('click', () => {
      calendarViewMonth -= 1;
      if (calendarViewMonth < 0) {
        calendarViewMonth = 11;
        calendarViewYear -= 1;
      }
      renderBabyRecord(baby);
    });
  });

  document.querySelectorAll('.calendar-next-btn').forEach(button => {
    button.addEventListener('click', () => {
      calendarViewMonth += 1;
      if (calendarViewMonth > 11) {
        calendarViewMonth = 0;
        calendarViewYear += 1;
      }
      renderBabyRecord(baby);
    });
  });
}

function bindDocumentButtons(baby) {
  document.querySelectorAll('.view-doc-btn').forEach(button => {
    button.addEventListener('click', () => {
      const doc = (baby.documents || []).find(item => String(item.id) === String(button.dataset.docId));
      if (doc) openDocumentModal(doc, baby);
    });
  });
}

function renderBabyRecord(baby) {
  const panel = document.getElementById('babyRecordPanel');
  if (!panel) return;

  if (!baby) {
    renderNoBabyState();
    return;
  }

  const primaryDoc = getPrimaryDocument(baby);
  const primaryStatus = getRegistrationStatus(baby);
  const isVerified = isApprovedStatus(primaryStatus);

  if (!isVerified) {
    renderRegistrationStatusState(baby);
    return;
  }

  setEmptyDashboardMode(false);

  panel.innerHTML = `
    <div class="selected-baby-record">
      <section class="card selected-baby-main">
        <div class="record-topbar">
          <div class="record-title-block">
            <div class="record-title-row">
              <h1>${baby.name}</h1>
              ${isVerified ? `
                <span class="verified-check-icon" title="Verified record" aria-label="Verified record">
                  <i class="fas fa-check" aria-hidden="true"></i>
                </span>
              ` : ''}
            </div>
            <p>${getTranslation('profile.reg_no')}: ${baby.registrationNumber}</p>
          </div>
          ${isVerified ? '' : `
            <div class="record-topbar-actions">
              <span class="badge ${statusClass(primaryStatus)}">${primaryStatus}</span>
            </div>
          `}
        </div>

        <section class="record-section">
          <h2>${getTranslation('profile.basic_info')}</h2>
          ${renderInfoGrid(baby)}
        </section>

        <section class="record-section medical-history-section" aria-label="Medical records">
          <h2>${getTranslation('profile.test_history')}</h2>
          ${renderMedicalHistoryList(baby)}
        </section>
      </section>

      ${renderDocumentsOverlay(baby)}

      <aside class="record-side-panel" aria-label="Schedule, vaccination history, and reminders">
        ${renderScheduleSection(baby)}

        <section class="record-section side-record-card vaccination-history-section" aria-label="Vaccination history">
          <div class="record-section-heading vaccination-history-heading">
            <h2>${getTranslation('profile.history')}</h2>
          </div>
          ${renderVaccinationHistoryList(baby)}
        </section>
      </aside>
    </div>
    ${renderDigitalCalendarModal(baby)}
    ${renderVaccinationHistoryModal(baby)}
  `;

  document.getElementById('documentsPanelClose')?.addEventListener('click', closeDocumentsOverlay);
  applyDocumentsOverlayState(documentsOverlayOpen);
  renderHeaderNotifications();
  bindDocumentButtons(baby);
  bindScheduleCalendarControls(baby);
  bindVaccinationHistoryControls(baby);
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupI18n();
  bindBabyRecordsOverlayControls();
  bindDocumentsOverlayControls();
  bindNotificationControls();
  applyBabyRecordsOverlayState();
  applyDocumentsOverlayState(false);
  showLoading();

  try {
    // Try real backend first
    try {
      const data = await apiFetch('/babies');
      if (data && !data._fallback && Array.isArray(data)) {
        // Normalize API data to match frontend expected format
        cachedBabies = data.map(baby => ({
          ...baby,
          name: baby.name || `${baby.first_name} ${baby.middle_name || ''} ${baby.last_name}`.trim(),
          registrationNumber: baby.registrationNumber || baby.registration_number,
          registrationStatus: baby.registrationStatus || baby.registration_status,
          guardianName: baby.guardianName || baby.guardian_name,
          guardianPhone: baby.guardianPhone || baby.guardian_phone,
          guardianAddress: baby.guardianAddress || baby.guardian_address,
          motherName: baby.motherName || baby.mother_name,
          fatherName: baby.fatherName || baby.father_name,
          placeOfBirth: baby.placeOfBirth || baby.place_of_birth,
          birthWeight: baby.birthWeight || baby.birth_weight,
          bloodType: baby.bloodType || baby.blood_type,
          privateClinic: baby.privateClinic ?? Boolean(baby.private_clinic),
          privateClinicName: baby.privateClinicName || baby.private_clinic_name,
          upcoming: (baby.upcoming || []).map(u => ({
            ...u,
            targetDate: u.targetDate || u.target_date,
          })),
          documents: (baby.documents || []).map(d => ({
            ...d,
            uploadDate: d.uploadDate || d.upload_date,
          })),
        }));
      } else {
        throw new Error('Fallback to local');
      }
    } catch (err) {
      console.warn('[API] Falling back to local babies:', err.message);
      cachedBabies = getBabiesForCurrentParent();
    }

    const approvedBaby = cachedBabies.find(baby => isApprovedStatus(getRegistrationStatus(baby)));
    selectedBabyId = approvedBaby?.id || cachedBabies[0]?.id || null;
    renderBabyList(cachedBabies);

    if (!cachedBabies.length) {
      renderNoBabyState();
    } else {
      renderBabyRecord(cachedBabies.find(baby => String(baby.id) === String(selectedBabyId)));
    }
  } catch (err) {
    console.error('Dashboard error:', err);
    cachedBabies = getBabiesForCurrentParent();
    renderNoBabyState();
  } finally {
    hideLoading();
  }
});