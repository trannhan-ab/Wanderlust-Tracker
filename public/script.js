
/* ============================================================
   WANDERLUST TRACKER — script.js
   Pure Vanilla JavaScript | localStorage CRUD | Auth | Charts
   ============================================================ */

'use strict';

/* ============================================================
   CONSTANTS & SEED DATA
   ============================================================ */
const CHART_COLORS = ['#e2628a','#2db87b','#f59e0b','#a78bfa','#f43f5e','#38bdf8','#fb923c'];

/* Category → emoji mapping for the trip hero */
const CAT_EMOJI = {
  mountain: '🏔️', beach: '🏖️', culture: '🏛️', adventure: '🧗',
  city: '🌆', food: '🍜', nature: '🌿', history: '🏯',
  island: '🏝️', forest: '🌲', lake: '🏞️', waterfall: '💧'
};
function catEmoji(cat) {
  return CAT_EMOJI[(cat || '').toLowerCase()] || '✈️';
}

const SEED_USERS = [
  { user_id: 1, fullname: 'Demo Student', username: 'demo', email: 'demo@wanderlust.vn', phone: '0987654321', password: '123456789' }
];

const SEED_BUDGETS = [
  { source_id: 1, source_name: 'Part-time Job Savings', init_amount: 12000000, user_id: 1 },
  { source_id: 2, source_name: 'Family Support',         init_amount: 8000000,  user_id: 1 },
  { source_id: 3, source_name: 'Scholarship Fund',       init_amount: 5000000,  user_id: 1 }
];

const SEED_DESTINATIONS = [
  { id: 1, name: 'Da Lat Highlands',  category: 'Mountain',  budget: 2500000, priority: 5, status: 1, source_id: 1 },
  { id: 2, name: 'Phu Quoc Island',   category: 'Beach',     budget: 4200000, priority: 4, status: 0, source_id: 1 },
  { id: 3, name: 'Hoi An Ancient Town', category: 'Culture', budget: 1800000, priority: 3, status: 1, source_id: 2 },
  { id: 4, name: 'Sapa Trekking',     category: 'Adventure', budget: 3000000, priority: 5, status: 0, source_id: 2 },
  { id: 5, name: 'Ha Giang Loop',     category: 'Adventure', budget: 2200000, priority: 4, status: 0, source_id: 3 }
];

/* ============================================================
   STORAGE HELPERS
   ============================================================ */
function initStorage() {
  if (!ls('wt_users'))    ls('wt_users',    SEED_USERS);
  if (!ls('wt_budgets'))  ls('wt_budgets',  SEED_BUDGETS);
  if (!ls('wt_dests'))    ls('wt_dests',    SEED_DESTINATIONS);
}

function resetStorage() {
  ls('wt_users',    SEED_USERS);
  ls('wt_budgets',  SEED_BUDGETS);
  ls('wt_dests',    SEED_DESTINATIONS);
}

// Unified get/set for localStorage (JSON)
function ls(key, val) {
  if (val === undefined) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
  localStorage.setItem(key, JSON.stringify(val));
}

function getUsers()       { return ls('wt_users')   || []; }
function saveUsers(v)     { ls('wt_users', v); }
function getBudgets()     { return ls('wt_budgets') || []; }
function saveBudgets(v)   { ls('wt_budgets', v); }
function getDests()       { return ls('wt_dests')   || []; }
function saveDests(v)     { ls('wt_dests', v); }

function getSession()     { return ls('wt_session'); }
function setSession(uid)  { ls('wt_session', uid); }
function clearSession()   { localStorage.removeItem('wt_session'); }

function getCurrentUser() {
  const uid = getSession();
  if (!uid) return null;
  return getUsers().find(u => u.user_id === uid) || null;
}

/* ============================================================
   UTILITIES
   ============================================================ */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

function initials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function starsHTML(n) {
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="fas fa-star ${i <= n ? 'filled' : 'empty'}"></i>`;
  }
  return html + '</span>';
}

function el(id) { return document.getElementById(id); }

function showEl(id)  { const e = el(id); if (e) e.style.display = ''; }
function hideEl(id)  { const e = el(id); if (e) e.style.display = 'none'; }
function setHTML(id, html) { const e = el(id); if (e) e.innerHTML = html; }
function setText(id, txt)  { const e = el(id); if (e) e.textContent = txt; }

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'success') {
  const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const container = el('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info} toast-icon"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
let _pendingConfirm = null;

function showConfirm(title, message, onConfirm) {
  setText('confirm-modal-title', title);
  setText('confirm-modal-message', message);
  _pendingConfirm = onConfirm;
  openModal('confirm-modal');
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id) {
  const m = el(id);
  if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = el(id);
  if (m) { m.style.display = 'none'; }
  // Only restore scroll if no other modal is open
  const open = document.querySelectorAll('.modal-overlay[style*="flex"]');
  if (!open.length) document.body.style.overflow = '';
}

function closeModalBackdrop(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

/* ============================================================
   PASSWORD TOGGLE
   ============================================================ */
function togglePw(inputId, btn) {
  const input = el(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  const icon = btn.querySelector('i');
  if (icon) { icon.classList.toggle('fa-eye', isText); icon.classList.toggle('fa-eye-slash', !isText); }
}

/* ============================================================
   AUTH — Show / Hide screens
   ============================================================ */
function showLogin(e) {
  if (e) e.preventDefault();
  showEl('login-screen');
  hideEl('register-screen');
  hideEl('login-error');
  el('login-form').reset();
}

function showRegister(e) {
  if (e) e.preventDefault();
  hideEl('login-screen');
  showEl('register-screen');
  hideEl('register-error');
  el('register-form').reset();
}

function showAuthError(id, msg) {
  const errEl = el(id);
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

/* ── Login ───────────────────────────────────────────────── */
function handleLogin(e) {
  e.preventDefault();
  hideEl('login-error');

  const usernameOrEmail = el('login-username').value.trim();
  const password        = el('login-password').value;

  if (!usernameOrEmail || !password) {
    showAuthError('login-error', 'Please fill in all fields.');
    return;
  }

  const users = getUsers();
  const user  = users.find(u =>
    (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
    u.password  === password
  );

  if (!user) {
    showAuthError('login-error', 'Invalid username/email or password. Try: demo / 123456789');
    return;
  }

  setSession(user.user_id);
  enterApp(user);
}

/* ── Register ────────────────────────────────────────────── */
function handleRegister(e) {
  e.preventDefault();
  hideEl('register-error');

  const fullname = el('reg-fullname').value.trim();
  const email    = el('reg-email').value.trim();
  const phone    = el('reg-phone').value.trim();
  const password = el('reg-password').value;
  const confirm  = el('reg-confirm').value;

  if (!fullname || !email || !phone || !password || !confirm) {
    showAuthError('register-error', 'Please fill in all fields.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError('register-error', 'Please enter a valid email address.');
    return;
  }
  if (password.length < 6) {
    showAuthError('register-error', 'Password must be at least 6 characters.');
    return;
  }
  if (password !== confirm) {
    showAuthError('register-error', 'Passwords do not match.');
    return;
  }

  const users = getUsers();
  const usernameCand = fullname.toLowerCase().replace(/\s+/g, '');

  if (users.find(u => u.email === email)) {
    showAuthError('register-error', 'An account with this email already exists.');
    return;
  }

  const newId    = users.length > 0 ? Math.max(...users.map(u => u.user_id)) + 1 : 1;
  const newUser  = {
    user_id: newId,
    fullname,
    username: usernameCand + newId,
    email,
    phone,
    password
  };

  // Give new user a default budget source
  const budgets = getBudgets();
  const newBudgetId = budgets.length > 0 ? Math.max(...budgets.map(b => b.source_id)) + 1 : 1;
  budgets.push({ source_id: newBudgetId, source_name: 'My Savings', init_amount: 5000000, user_id: newId });
  saveBudgets(budgets);

  users.push(newUser);
  saveUsers(users);

  setSession(newUser.user_id);
  showToast('Account created! Welcome to Wanderlust.', 'success');
  enterApp(newUser);
}

/* ── Logout ──────────────────────────────────────────────── */
function logout() {
  clearSession();
  destroyCharts();
  hideEl('app-section');
  showEl('auth-section');
  showLogin();
}

/* ── Check session on load ───────────────────────────────── */
function checkSession() {
  const user = getCurrentUser();
  if (user) {
    enterApp(user);
  } else {
    showEl('auth-section');
    hideEl('app-section');
  }
}

/* ── Enter App ───────────────────────────────────────────── */
function enterApp(user) {
  hideEl('auth-section');
  showEl('app-section');
  updateUserDisplay(user);
  navigateTo('dashboard', document.querySelector('[data-view="dashboard"]'), true);
}

function updateUserDisplay(user) {
  const displayName = user.fullname || user.username || 'Traveler';
  const av = initials(displayName);

  setText('sidebar-username', user.username || displayName);
  setText('topbar-username',  user.username || displayName);
  setHTML('sidebar-avatar',   av);
  setHTML('topbar-avatar',    av);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
let _currentView = 'dashboard';

function navigateTo(viewName, linkEl, skipHistory) {
  if (linkEl && linkEl.preventDefault) { linkEl.preventDefault(); linkEl = null; }

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = linkEl || document.querySelector(`[data-view="${viewName}"]`);
  if (target && target.classList) target.classList.add('active');

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const view = el(`view-${viewName}`);
  if (view) view.style.display = '';

  // Update page title
  const titles = { dashboard: 'Dashboard', destinations: 'Destinations', budgets: 'Budgets', settings: 'Settings' };
  setText('topbar-page-title', titles[viewName] || viewName);

  _currentView = viewName;
  closeSidebar();

  // Render view content
  switch (viewName) {
    case 'dashboard':    renderDashboard();    break;
    case 'destinations': renderDestinations(); break;
    case 'budgets':      renderBudgets();      break;
    case 'settings':     renderSettings();     break;
  }
}

/* ============================================================
   SIDEBAR (mobile)
   ============================================================ */
function toggleSidebar() {
  el('sidebar').classList.toggle('open');
  el('sidebar-overlay').classList.toggle('visible');
}

function closeSidebar() {
  el('sidebar').classList.remove('open');
  el('sidebar-overlay').classList.remove('visible');
}

/* ============================================================
   DASHBOARD
   ============================================================ */
let _budgetChart   = null;
let _categoryChart = null;

function destroyCharts() {
  if (_budgetChart)   { _budgetChart.destroy();   _budgetChart   = null; }
  if (_categoryChart) { _categoryChart.destroy(); _categoryChart = null; }
}

function renderDashboard() {
  renderMetrics();
  renderBudgetChart();
  renderCategoryChart();
  renderRecentActivity();
}

function renderMetrics() {
  const user  = getCurrentUser();
  if (!user) return;

  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests().filter(d => budgets.some(b => b.source_id === d.source_id));

  const total     = dests.length;
  const visited   = dests.filter(d => d.status === 1).length;
  const pct       = total > 0 ? Math.round((visited / total) * 100) : 0;
  const totalBudg = budgets.reduce((s, b) => s + b.init_amount, 0);
  const allocated = dests.reduce((s, d) => s + d.budget, 0);
  const remaining = totalBudg - allocated;

  setText('metric-total',        total);
  setText('metric-total-sub',    `Across all categories`);
  setText('metric-visited',      visited);
  setText('metric-visited-sub',  `${pct}% completion`);
  setText('metric-budget',       formatVND(totalBudg));
  setText('metric-budget-sub',   `From ${budgets.length} source${budgets.length !== 1 ? 's' : ''}`);
  setText('metric-remaining',    formatVND(remaining));
}

function renderBudgetChart() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);

  const canvasEl = el('budget-chart');
  const emptyEl  = el('budget-chart-empty');
  const legendEl = el('budget-chart-legend');

  if (!budgets.length) {
    if (canvasEl) canvasEl.style.display = 'none';
    if (emptyEl)  emptyEl.style.display  = 'flex';
    if (legendEl) legendEl.innerHTML = '';
    return;
  }
  if (canvasEl) canvasEl.style.display = '';
  if (emptyEl)  emptyEl.style.display  = 'none';

  if (_budgetChart) { _budgetChart.destroy(); _budgetChart = null; }

  const ctx = canvasEl.getContext('2d');
  _budgetChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   budgets.map(b => b.source_name),
      datasets: [{
        data:            budgets.map(b => b.init_amount),
        backgroundColor: budgets.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor:     'rgba(255,245,251,0.9)',
        borderWidth:     3,
        hoverOffset:     6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatVND(ctx.parsed)}`
          },
          backgroundColor: 'rgba(255,255,255,0.97)',
          titleColor: '#2d1a26',
          bodyColor:  '#7a5a6a',
          borderColor: 'rgba(226,98,138,0.20)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });

  // Custom legend
  if (legendEl) {
    legendEl.innerHTML = budgets.map((b, i) =>
      `<div class="legend-item">
        <div class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
        <span class="legend-name">${b.source_name}</span>
        <span class="legend-value">${formatVND(b.init_amount)}</span>
      </div>`
    ).join('');
  }
}

function renderCategoryChart() {
  const user   = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests().filter(d => budgets.some(b => b.source_id === d.source_id));

  const canvasEl = el('category-chart');
  const emptyEl  = el('category-chart-empty');

  const countMap = {};
  dests.forEach(d => { countMap[d.category] = (countMap[d.category] || 0) + 1; });
  const labels = Object.keys(countMap).sort((a, b) => countMap[b] - countMap[a]);

  if (!labels.length) {
    if (canvasEl) canvasEl.style.display = 'none';
    if (emptyEl)  emptyEl.style.display  = 'flex';
    return;
  }
  if (canvasEl) canvasEl.style.display = '';
  if (emptyEl)  emptyEl.style.display  = 'none';

  if (_categoryChart) { _categoryChart.destroy(); _categoryChart = null; }

  const ctx = canvasEl.getContext('2d');
  _categoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Destinations',
        data:  labels.map(l => countMap[l]),
        backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
        borderColor:     labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth:     2,
        borderRadius:    6,
        borderSkipped:   false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,0.97)',
          titleColor: '#2d1a26',
          bodyColor:  '#7a5a6a',
          borderColor: 'rgba(226,98,138,0.20)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: '#7a5a6a', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#7a5a6a',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
          },
          grid:   { color: 'rgba(226,98,138,0.08)' },
          border: { display: false }
        }
      }
    }
  });
}

function renderRecentActivity() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests()
    .filter(d => budgets.some(b => b.source_id === d.source_id))
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const container = el('recent-activity');
  if (!container) return;

  if (!dests.length) {
    container.innerHTML = '<div class="activity-empty">No destinations yet. Add one to get started!</div>';
    return;
  }

  container.innerHTML = dests.map(d => {
    const visited  = d.status === 1;
    const src      = budgets.find(b => b.source_id === d.source_id);
    return `
      <div class="activity-item">
        <div class="activity-icon ${visited ? 'activity-icon--visited' : 'activity-icon--planned'}">
          <i class="fas ${visited ? 'fa-check-circle' : 'fa-clock'}"></i>
        </div>
        <div class="activity-info">
          <p class="activity-name">${d.name}</p>
          <p class="activity-meta">${d.category}${src ? ' · ' + src.source_name : ''}</p>
        </div>
        <div class="activity-right">
          <p class="activity-budget">${formatVND(d.budget)}</p>
          <p class="activity-priority">Priority ${d.priority}/5</p>
        </div>
        <span class="badge ${visited ? 'badge--visited' : 'badge--planned'}">
          <i class="fas ${visited ? 'fa-check' : 'fa-clock'}"></i>
          ${visited ? 'Visited' : 'Planned'}
        </span>
      </div>`;
  }).join('');
}

/* ============================================================
   DESTINATIONS
   ============================================================ */
function renderDestinations() {
  populateCategoryFilter();
  filterDestinations();
}

function populateCategoryFilter() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests().filter(d => budgets.some(b => b.source_id === d.source_id));
  const cats    = [...new Set(dests.map(d => d.category))].sort();

  const sel = el('dest-filter-cat');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="all">All Categories</option>' +
    cats.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
}

function filterDestinations() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);

  const search  = (el('dest-search')?.value || '').toLowerCase().trim();
  const cat     = el('dest-filter-cat')?.value || 'all';
  const status  = el('dest-filter-status')?.value || 'all';
  const sort    = el('dest-sort')?.value || 'priority-desc';

  let dests = getDests().filter(d => budgets.some(b => b.source_id === d.source_id));

  if (search)        dests = dests.filter(d => d.name.toLowerCase().includes(search) || d.category.toLowerCase().includes(search));
  if (cat !== 'all') dests = dests.filter(d => d.category === cat);
  if (status !== 'all') dests = dests.filter(d => String(d.status) === status);

  dests.sort((a, b) => {
    switch (sort) {
      case 'priority-asc':  return a.priority - b.priority;
      case 'budget-desc':   return b.budget - a.budget;
      case 'budget-asc':    return a.budget - b.budget;
      default:              return b.priority - a.priority;
    }
  });

  renderDestinationsTable(dests, budgets);
}

function renderDestinationsTable(dests, budgets) {
  const tbody  = el('dest-tbody');
  const emptyEl = el('dest-empty');
  const tableEl = el('dest-table');
  if (!tbody) return;

  if (!dests.length) {
    tbody.innerHTML = '';
    if (tableEl) tableEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (tableEl) tableEl.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = dests.map((d, idx) => {
    const visited   = d.status === 1;
    const src       = budgets.find(b => b.source_id === d.source_id);
    const rowBg     = idx % 2 !== 0 ? 'background:rgba(252,228,242,0.45);' : '';
    const tripData  = getTrip(d.id);
    const itemCount = tripData.items.length;
    return `
      <tr style="${rowBg}">
        <td>${escHtml(d.name)}</td>
        <td><span class="badge badge--indigo">${escHtml(d.category)}</span></td>
        <td class="mono">${formatVND(d.budget)}</td>
        <td>${starsHTML(d.priority)}</td>
        <td>
          <span class="badge ${visited ? 'badge--visited' : 'badge--planned'}">
            <i class="fas ${visited ? 'fa-check' : 'fa-clock'}"></i>
            ${visited ? 'Visited' : 'Planned'}
          </span>
        </td>
        <td style="color:var(--text-muted);font-size:13px;">${src ? escHtml(src.source_name) : '—'}</td>
        <td class="text-center">
          <button class="btn-plan-trip" onclick="openTripView(${d.id})">
            🗺️ Plan${itemCount > 0 ? ' (' + itemCount + ')' : ''}
          </button>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="editDestination(${d.id})" title="Edit">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-icon btn-icon--danger" onclick="confirmDeleteDest(${d.id})" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openDestModal(dest) {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);

  // Populate budget source dropdown
  const sourceEl = el('dest-source');
  if (sourceEl) {
    sourceEl.innerHTML = budgets.length
      ? budgets.map(b => `<option value="${b.source_id}">${escHtml(b.source_name)} (${formatVND(b.init_amount)})</option>`).join('')
      : '<option value="">No budget sources available</option>';
  }

  if (dest) {
    setText('dest-modal-title', 'Edit Destination');
    el('dest-edit-id').value     = dest.id;
    el('dest-name').value        = dest.name;
    el('dest-category').value    = dest.category;
    el('dest-budget').value      = dest.budget;
    el('dest-priority').value    = dest.priority;
    el('dest-status').value      = dest.status;
    el('dest-source').value      = dest.source_id;
  } else {
    setText('dest-modal-title', 'Add Destination');
    el('dest-form').reset();
    el('dest-edit-id').value     = '';
    el('dest-priority').value    = '3';
    el('dest-status').value      = '0';
    if (budgets.length) el('dest-source').value = budgets[0].source_id;
  }
  openModal('dest-modal');
}

function saveDestination(e) {
  e.preventDefault();
  const name     = el('dest-name').value.trim();
  const category = el('dest-category').value.trim();
  const budget   = parseFloat(el('dest-budget').value);
  const priority = parseInt(el('dest-priority').value);
  const status   = parseInt(el('dest-status').value);
  const sourceId = parseInt(el('dest-source').value);
  const editId   = el('dest-edit-id').value;

  if (!name)           { showToast('Destination name is required.', 'error'); return; }
  if (!category)       { showToast('Category is required.', 'error'); return; }
  if (isNaN(budget) || budget < 0) { showToast('Enter a valid budget amount.', 'error'); return; }
  if (!sourceId)       { showToast('Please select a budget source.', 'error'); return; }

  const dests = getDests();

  if (editId) {
    const idx = dests.findIndex(d => d.id === parseInt(editId));
    if (idx > -1) dests[idx] = { ...dests[idx], name, category, budget, priority, status, source_id: sourceId };
    showToast('Destination updated!', 'success');
  } else {
    const newId = dests.length > 0 ? Math.max(...dests.map(d => d.id)) + 1 : 1;
    dests.push({ id: newId, name, category, budget, priority, status, source_id: sourceId });
    showToast('Destination added!', 'success');
  }

  saveDests(dests);
  closeModal('dest-modal');
  filterDestinations();
  populateCategoryFilter();
}

function editDestination(id) {
  const dest = getDests().find(d => d.id === id);
  if (dest) openDestModal(dest);
}

function confirmDeleteDest(id) {
  const dest = getDests().find(d => d.id === id);
  showConfirm(
    'Delete Destination',
    `Are you sure you want to delete "${dest ? escHtml(dest.name) : 'this destination'}"? This cannot be undone.`,
    () => { deleteDestination(id); closeModal('confirm-modal'); }
  );
}

function deleteDestination(id) {
  const dests = getDests().filter(d => d.id !== id);
  saveDests(dests);
  showToast('Destination deleted.', 'info');
  filterDestinations();
  populateCategoryFilter();
}

/* ============================================================
   BUDGETS
   ============================================================ */
function renderBudgets() {
  renderBudgetCards();
  renderBudgetTable();
}

function renderBudgetCards() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests();
  const container = el('budget-cards');
  if (!container) return;

  if (!budgets.length) {
    container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-wallet"></i><p>No budget sources</p><small>Add a source to start tracking</small></div>';
    return;
  }

  container.innerHTML = budgets.map(b => {
    const srcDests  = dests.filter(d => d.source_id === b.source_id);
    const allocated = srcDests.reduce((s, d) => s + d.budget, 0);
    const remaining = b.init_amount - allocated;
    const pct       = b.init_amount > 0 ? Math.min((allocated / b.init_amount) * 100, 100) : 0;
    const fillClass = pct >= 100 ? 'progress-bar-fill--danger' : pct >= 80 ? 'progress-bar-fill--warning' : '';
    const remClass  = remaining < 0 ? 'text-danger' : remaining === 0 ? 'text-muted' : 'text-success';

    return `
      <div class="budget-source-card">
        <div class="budget-card-header">
          <div class="budget-card-title-row">
            <div class="budget-card-icon"><i class="fas fa-wallet"></i></div>
            <span class="budget-card-name">${escHtml(b.source_name)}</span>
          </div>
          <div class="budget-card-actions">
            <button class="btn-icon" onclick="editBudgetSource(${b.source_id})" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon btn-icon--danger" onclick="confirmDeleteBudget(${b.source_id})" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="budget-stat">
          <p class="budget-stat-label">Total Available</p>
          <p class="budget-stat-value">${formatVND(b.init_amount)}</p>
        </div>
        <div class="budget-alloc-row">
          <span>Allocated</span>
          <span>${formatVND(allocated)}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${fillClass}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="budget-remaining-row">
          <span class="budget-remaining-label">${pct.toFixed(1)}% used</span>
          <span class="budget-remaining-val ${remClass}">
            ${remaining >= 0 ? formatVND(remaining) + ' left' : 'Over by ' + formatVND(Math.abs(remaining))}
          </span>
        </div>
      </div>`;
  }).join('');
}

function renderBudgetTable() {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests();
  const tbody   = el('budget-tbody');
  const emptyEl = el('budget-empty');
  const tableEl = el('budget-table');
  if (!tbody) return;

  if (!budgets.length) {
    tbody.innerHTML = '';
    if (tableEl) tableEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (tableEl) tableEl.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  tbody.innerHTML = budgets.map((b, idx) => {
    const srcDests  = dests.filter(d => d.source_id === b.source_id);
    const allocated = srcDests.reduce((s, d) => s + d.budget, 0);
    const remaining = b.init_amount - allocated;
    const remClass  = remaining < 0 ? 'text-danger' : 'text-success';
    const rowBg     = idx % 2 !== 0 ? 'background:rgba(252,228,242,0.45);' : '';
    return `
      <tr style="${rowBg}">
        <td>${escHtml(b.source_name)}</td>
        <td class="text-right mono">${formatVND(b.init_amount)}</td>
        <td class="text-right mono" style="color:var(--text-muted)">${formatVND(allocated)}</td>
        <td class="text-right mono ${remClass}" style="font-weight:700">${formatVND(remaining)}</td>
        <td class="text-center">
          <span class="badge badge--indigo">${srcDests.length}</span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" onclick="editBudgetSource(${b.source_id})" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon btn-icon--danger" onclick="confirmDeleteBudget(${b.source_id})" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openBudgetModal(source) {
  if (source) {
    setText('budget-modal-title', 'Edit Budget Source');
    el('budget-edit-id').value           = source.source_id;
    el('budget-source-name').value       = source.source_name;
    el('budget-source-amount').value     = source.init_amount;
  } else {
    setText('budget-modal-title', 'Add Budget Source');
    el('budget-form').reset();
    el('budget-edit-id').value           = '';
  }
  openModal('budget-modal');
}

function saveBudgetSource(e) {
  e.preventDefault();
  const name   = el('budget-source-name').value.trim();
  const amount = parseFloat(el('budget-source-amount').value);
  const editId = el('budget-edit-id').value;

  if (!name)                    { showToast('Source name is required.', 'error'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Enter a valid amount.', 'error'); return; }

  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets();

  if (editId) {
    const idx = budgets.findIndex(b => b.source_id === parseInt(editId));
    if (idx > -1) budgets[idx] = { ...budgets[idx], source_name: name, init_amount: amount };
    showToast('Budget source updated!', 'success');
  } else {
    const newId = budgets.length > 0 ? Math.max(...budgets.map(b => b.source_id)) + 1 : 1;
    budgets.push({ source_id: newId, source_name: name, init_amount: amount, user_id: user.user_id });
    showToast('Budget source added!', 'success');
  }

  saveBudgets(budgets);
  closeModal('budget-modal');
  renderBudgets();
}

function editBudgetSource(id) {
  const source = getBudgets().find(b => b.source_id === id);
  if (source) openBudgetModal(source);
}

function confirmDeleteBudget(id) {
  const source    = getBudgets().find(b => b.source_id === id);
  const destCount = getDests().filter(d => d.source_id === id).length;
  const warning   = destCount > 0 ? ` This will also remove ${destCount} linked destination${destCount > 1 ? 's' : ''}.` : '';
  showConfirm(
    'Delete Budget Source',
    `Delete "${source ? escHtml(source.source_name) : 'this source'}"?${warning} This cannot be undone.`,
    () => { deleteBudgetSource(id); closeModal('confirm-modal'); }
  );
}

function deleteBudgetSource(id) {
  const budgets = getBudgets().filter(b => b.source_id !== id);
  saveBudgets(budgets);
  // Also remove linked destinations
  const dests = getDests().filter(d => d.source_id !== id);
  saveDests(dests);
  showToast('Budget source deleted.', 'info');
  renderBudgets();
}

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings() {
  const user = getCurrentUser();
  if (!user) return;

  const displayName = user.fullname || user.username || 'Traveler';
  const av = initials(displayName);

  setText('settings-display-name', displayName);
  setHTML('settings-avatar',       av);
  el('settings-username').value  = user.username || '';
  el('settings-fullname').value  = user.fullname || '';
  el('settings-email').value     = user.email    || '';
  el('settings-phone').value     = user.phone    || '';
  el('settings-password').value  = '';
}

function saveProfile(e) {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const username = el('settings-username').value.trim();
  const fullname = el('settings-fullname').value.trim();
  const email    = el('settings-email').value.trim();
  const phone    = el('settings-phone').value.trim();
  const password = el('settings-password').value;

  if (!username)              { showToast('Username is required.', 'error'); return; }
  if (password && password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address.', 'error'); return; }

  const users = getUsers();
  const idx   = users.findIndex(u => u.user_id === user.user_id);
  if (idx < 0) return;

  users[idx] = {
    ...users[idx],
    username,
    fullname,
    email,
    phone,
    password: password || users[idx].password
  };

  saveUsers(users);
  updateUserDisplay(users[idx]);
  renderSettings();
  showToast('Profile saved successfully!', 'success');
}

function confirmReset() {
  showConfirm(
    'Reset Demo Data',
    'This will delete all your destinations and budgets and restore the original demo data. Are you sure?',
    () => {
      resetStorage();
      closeModal('confirm-modal');
      showToast('Data has been reset to demo defaults.', 'info');
      renderDashboard();
    }
  );
}

function confirmDeleteAccount() {
  const user = getCurrentUser();
  showConfirm(
    'Delete Account',
    `Permanently delete the account "${user ? escHtml(user.username) : ''}"? All your data will be removed from this device.`,
    () => {
      const uid   = user ? user.user_id : null;
      const users = getUsers().filter(u => u.user_id !== uid);
      saveUsers(users);
      const budgets = getBudgets().filter(b => b.user_id !== uid);
      saveBudgets(budgets);
      const budgetIds = budgets.map(b => b.source_id);
      saveDests(getDests().filter(d => budgetIds.includes(d.source_id)));
      closeModal('confirm-modal');
      logout();
      showToast('Account deleted.', 'info');
    }
  );
}

/* ============================================================
   XSS PROTECTION
   ============================================================ */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   TRIP PLANNING — Storage helpers
   ============================================================ */
/*
  wt_trips format in localStorage:
  [{ dest_id, items: [{ id, day, time, activity, location, note }], general_note }]
*/
function getAllTrips()        { return ls('wt_trips') || []; }
function saveAllTrips(trips) { ls('wt_trips', trips); }

function getTrip(destId) {
  const all = getAllTrips();
  return all.find(t => t.dest_id === destId) || { dest_id: destId, items: [], general_note: '' };
}

function saveTrip(tripObj) {
  const all = getAllTrips().filter(t => t.dest_id !== tripObj.dest_id);
  all.push(tripObj);
  saveAllTrips(all);
}

/* ============================================================
   TRIP PLANNING — State
   ============================================================ */
let _activeTripDestId  = null;
let _noteSaveTimer     = null;

/* ============================================================
   TRIP PLANNING — Open / Close
   ============================================================ */
function openTripView(destId) {
  const user    = getCurrentUser();
  if (!user) return;
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dest    = getDests().find(d => d.id === destId && budgets.some(b => b.source_id === d.source_id));
  if (!dest) { showToast('Destination not found.', 'error'); return; }

  _activeTripDestId = destId;

  // Hide all views, show trip view
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  el('view-trip').style.display = '';

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  setText('topbar-page-title', '✈️ Trip Plan');

  renderTripHero(dest);
  renderTripStats(dest);
  renderItineraryList();
  loadGeneralNote();

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeTripView() {
  _activeTripDestId = null;
  navigateTo('destinations', document.querySelector('[data-view="destinations"]'));
}

/* ============================================================
   TRIP PLANNING — Hero & Stats
   ============================================================ */
function renderTripHero(dest) {
  const visited = dest.status === 1;

  setText('trip-hero-cat',  dest.category);
  setText('trip-hero-name', dest.name);
  setHTML('trip-hero-emoji', catEmoji(dest.category));

  setHTML('trip-hero-meta', `
    <span class="trip-hero-chip">💰 ${formatVND(dest.budget)}</span>
    <span class="trip-hero-chip">⭐ Priority ${dest.priority}/5</span>
  `);

  setHTML('trip-hero-badges', `
    <span class="trip-status-badge trip-status-badge--${visited ? 'visited' : 'planned'}">
      ${visited ? ' Visited' : ' Planned'}
    </span>
  `);
}

function renderTripStats(dest) {
  if (!_activeTripDestId) return;
  const trip = getTrip(_activeTripDestId);

  const maxDay      = trip.items.length > 0 ? Math.max(...trip.items.map(i => i.day)) : 0;
  const activityCnt = trip.items.length;
  const statusLabel = dest.status === 1 ? ' Visited' : ' Planned';

  setText('stat-days',       maxDay > 0 ? maxDay : '—');
  setText('stat-activities', activityCnt);
  setText('stat-budget',     formatVND(dest.budget));
  setText('stat-status',     statusLabel);
}

/* ============================================================
   TRIP PLANNING — Itinerary CRUD
   ============================================================ */
function addItineraryItem(e) {
  e.preventDefault();
  if (!_activeTripDestId) return;

  const day      = parseInt(el('itin-day').value)     || 1;
  const time     = el('itin-time').value               || '';
  const activity = el('itin-activity').value.trim();
  const location = el('itin-location').value.trim();
  const note     = el('itin-note').value.trim();

  if (!activity) { showToast('Please enter an activity name ', 'error'); return; }

  const trip = getTrip(_activeTripDestId);
  const newId = trip.items.length > 0 ? Math.max(...trip.items.map(i => i.id)) + 1 : 1;

  trip.items.push({ id: newId, day, time, activity, location, note });
  saveTrip(trip);

  // Reset form fields (keep day, clear the rest)
  el('itin-activity').value = '';
  el('itin-location').value = '';
  el('itin-note').value     = '';

  showToast('Added to your itinerary! ', 'success');
  renderItineraryList();

  // Update stats and table badge
  const user    = getCurrentUser();
  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dest    = getDests().find(d => d.id === _activeTripDestId);
  if (dest) renderTripStats(dest);
}

function deleteItineraryItem(itemId) {
  if (!_activeTripDestId) return;
  const trip  = getTrip(_activeTripDestId);
  trip.items  = trip.items.filter(i => i.id !== itemId);
  saveTrip(trip);
  renderItineraryList();

  const dest = getDests().find(d => d.id === _activeTripDestId);
  if (dest) renderTripStats(dest);
  showToast('Activity removed.', 'info');
}

function renderItineraryList() {
  if (!_activeTripDestId) return;
  const trip    = getTrip(_activeTripDestId);
  const listEl  = el('itinerary-list');
  const countEl = el('itinerary-count');
  if (!listEl) return;

  const count = trip.items.length;
  if (countEl) countEl.textContent = count + (count === 1 ? ' item' : ' items');

  if (!count) {
    listEl.innerHTML = `
      <div class="itin-empty">
        <div class="itin-empty-icon">🗺️</div>
        <p>No activities yet!</p>
        <small>Use the form above to build your itinerary </small>
      </div>`;
    return;
  }

  // Group by day, sorted
  const byDay = {};
  [...trip.items]
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    .forEach(item => {
      if (!byDay[item.day]) byDay[item.day] = [];
      byDay[item.day].push(item);
    });

  listEl.innerHTML = Object.keys(byDay)
    .sort((a, b) => Number(a) - Number(b))
    .map(day => {
      const items = byDay[day];
      const itemsHTML = items.map(item => `
        <div class="itin-item">
          <div class="itin-dot"></div>
          <div class="itin-content">
            <div class="itin-top">
              <span class="itin-activity">${escHtml(item.activity)}</span>
              ${item.time ? `<span class="itin-time-tag"> ${item.time}</span>` : ''}
            </div>
            ${item.location ? `<div class="itin-location"> ${escHtml(item.location)}</div>` : ''}
            ${item.note     ? `<div class="itin-quick-note"> ${escHtml(item.note)}</div>` : ''}
          </div>
          <button class="itin-del-btn" onclick="deleteItineraryItem(${item.id})" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('');

      return `
        <div class="itin-day-group">
          <div class="itin-day-label">✨ Day ${day}</div>
          ${itemsHTML}
        </div>`;
    }).join('');
}

/* ============================================================
   TRIP PLANNING — General Notes
   ============================================================ */
function loadGeneralNote() {
  if (!_activeTripDestId) return;
  const trip = getTrip(_activeTripDestId);
  const ta   = el('trip-general-note');
  if (ta) ta.value = trip.general_note || '';
  hideEl('note-saved-hint');
}

function autoSaveNote() {
  if (!_activeTripDestId) return;
  clearTimeout(_noteSaveTimer);
  _noteSaveTimer = setTimeout(() => {
    const ta = el('trip-general-note');
    if (!ta) return;
    const trip = getTrip(_activeTripDestId);
    trip.general_note = ta.value;
    saveTrip(trip);
    const hint = el('note-saved-hint');
    if (hint) {
      hint.classList.add('visible');
      setTimeout(() => hint.classList.remove('visible'), 2000);
    }
  }, 700);
}

/* ============================================================
   KEYBOARD ACCESSIBILITY
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['dest-modal','budget-modal','confirm-modal'].forEach(id => {
      const m = el(id);
      if (m && m.style.display === 'flex') closeModal(id);
    });
  }
});

/* ============================================================
   INITIALIZE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initStorage();

  // Auth forms
  el('login-form').addEventListener('submit', handleLogin);
  el('register-form').addEventListener('submit', handleRegister);

  // Confirm modal action button
  el('confirm-action-btn').addEventListener('click', () => {
    if (typeof _pendingConfirm === 'function') {
      _pendingConfirm();
      _pendingConfirm = null;
    }
  });

  // Check existing session
  checkSession();
});
function renderMetrics() {
  const user  = getCurrentUser();
  if (!user) return;

  const budgets = getBudgets().filter(b => b.user_id === user.user_id);
  const dests   = getDests().filter(d => budgets.some(b => b.source_id === d.source_id));

  const total     = dests.length;
  // Hoàn thiện dòng bị thiếu:
  const visited   = dests.filter(d => d.status === 1).length;
  const pct       = total > 0 ? Math.round((visited / total) * 100) : 0;

  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.init_amount) || 0), 0);
  const allocated   = dests.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);
  const remaining   = totalBudget - allocated;

  setText('metric-total', total);
  setText('metric-visited', visited);
  setText('metric-visited-sub', `${pct}% completion`);
  setText('metric-budget', formatVND(totalBudget));
  setText('metric-budget-sub', `From ${budgets.length} sources`);
  setText('metric-remaining', formatVND(remaining));
}
