/* ============================================================
   WANDERLUST TRACKER
   Vanilla browser client | Express API | JSON-file persistence
   ============================================================ */

"use strict";

const CHART_COLORS = ["#e2628a", "#2db87b", "#f59e0b", "#a78bfa", "#f43f5e", "#38bdf8", "#fb923c"];
const CAT_EMOJI = {
  mountain: "🏔️", beach: "🏖️", culture: "🏛️", adventure: "🧗",
  city: "🌆", food: "🍜", nature: "🌿", history: "🏯",
  island: "🏝️", forest: "🌲", lake: "🏞️", waterfall: "💧",
};

const state = {
  users: [],
  budgets: [],
  dests: [],
  trips: [],
  sessionId: null,
  currentUser: null,
};
const writeQueues = {};

function el(id) { return document.getElementById(id); }
function showEl(id) { const node = el(id); if (node) node.style.display = ""; }
function hideEl(id) { const node = el(id); if (node) node.style.display = "none"; }
function setText(id, value) { const node = el(id); if (node) node.textContent = value; }
function setHTML(id, value) { const node = el(id); if (node) node.innerHTML = value; }

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "The request could not be completed.");
  return payload;
}

async function loadServerData() {
  const [users, budgets, dests, trips] = await Promise.all([
    apiRequest("/users"),
    apiRequest("/budgets"),
    apiRequest("/destinations"),
    apiRequest("/trips"),
  ]);
  state.users = users;
  state.budgets = budgets;
  state.dests = dests;
  state.trips = trips;
}

function queueWrite(type, data) {
  const endpoint = {
    users: "/users",
    budgets: "/budgets",
    dests: "/destinations",
    trips: "/trips",
  }[type];

  state[type] = data;
  writeQueues[type] = (writeQueues[type] || Promise.resolve())
    .then(() => apiRequest(endpoint, { method: "PUT", body: JSON.stringify(data) }))
    .catch((error) => {
      showToast(error.message, "error");
      throw error;
    });
  return writeQueues[type];
}

function getUsers() { return state.users; }
function saveUsers(value) { return queueWrite("users", value); }
function getBudgets() { return state.budgets; }
function saveBudgets(value) { return queueWrite("budgets", value); }
function getDests() { return state.dests; }
function saveDests(value) { return queueWrite("dests", value); }
function getAllTrips() { return state.trips; }
function saveAllTrips(value) { return queueWrite("trips", value); }

function getSession() {
  const value = sessionStorage.getItem("wt_session");
  return value ? Number(value) : null;
}
function setSession(userId) {
  state.sessionId = Number(userId);
  sessionStorage.setItem("wt_session", String(userId));
}
function clearSession() {
  state.sessionId = null;
  state.currentUser = null;
  sessionStorage.removeItem("wt_session");
}
function getCurrentUser() {
  if (!state.sessionId) return null;
  return getUsers().find((user) => Number(user.user_id) === Number(state.sessionId)) || state.currentUser;
}

function formatVND(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(amount) || 0))} ₫`;
}
function initials(name) {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].substring(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function catEmoji(category) {
  return CAT_EMOJI[String(category || "").toLowerCase()] || "✈️";
}
function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function starsHTML(value) {
  return `<span class="stars">${[1, 2, 3, 4, 5]
    .map((index) => `<i class="fas fa-star ${index <= Number(value) ? "filled" : "empty"}"></i>`)
    .join("")}</span>`;
}

function showToast(message, type = "success") {
  const iconMap = { success: "fa-check-circle", error: "fa-times-circle", info: "fa-info-circle" };
  const container = el("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info} toast-icon"></i><span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3200);
}

let pendingConfirm = null;
function showConfirm(title, message, onConfirm) {
  setText("confirm-modal-title", title);
  setText("confirm-modal-message", message);
  pendingConfirm = onConfirm;
  openModal("confirm-modal");
}
function openModal(id) {
  const modal = el(id);
  if (modal) { modal.style.display = "flex"; document.body.style.overflow = "hidden"; }
}
function closeModal(id) {
  const modal = el(id);
  if (modal) modal.style.display = "none";
  if (!document.querySelectorAll(".modal-overlay[style*='flex']").length) document.body.style.overflow = "";
}
function closeModalBackdrop(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}
function togglePw(inputId, button) {
  const input = el(inputId);
  if (!input) return;
  const text = input.type === "text";
  input.type = text ? "password" : "text";
  const icon = button.querySelector("i");
  if (icon) {
    icon.classList.toggle("fa-eye", text);
    icon.classList.toggle("fa-eye-slash", !text);
  }
}
function showAuthError(id, message) {
  const node = el(id);
  if (node) { node.textContent = message; node.style.display = "block"; }
}
function hideAuthError(id) { hideEl(id); }

function showLogin(event) {
  if (event) event.preventDefault();
  showEl("login-screen"); hideEl("register-screen"); hideAuthError("login-error");
  el("login-form")?.reset();
}
function showRegister(event) {
  if (event) event.preventDefault();
  hideEl("login-screen"); showEl("register-screen"); hideAuthError("register-error");
  el("register-form")?.reset();
}

async function handleLogin(event) {
  event.preventDefault();
  hideAuthError("login-error");
  const usernameOrEmail = el("login-username").value.trim();
  const password = el("login-password").value;
  if (!usernameOrEmail || !password) return showAuthError("login-error", "Please fill in all fields.");

  try {
    const result = await apiRequest("/auth/login", {
      method: "POST", body: JSON.stringify({ usernameOrEmail, password }),
    });
    state.currentUser = result.user;
    const index = state.users.findIndex((user) => user.user_id === result.user.user_id);
    if (index >= 0) state.users[index] = result.user;
    else state.users.push(result.user);
    setSession(result.user.user_id);
    enterApp(result.user);
  } catch (error) {
    showAuthError("login-error", `${error.message} Try: demo / 123456789`);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideAuthError("register-error");
  const fullname = el("reg-fullname").value.trim();
  const email = el("reg-email").value.trim();
  const phone = el("reg-phone").value.trim();
  const password = el("reg-password").value;
  const confirm = el("reg-confirm").value;
  if (!fullname || !email || !phone || !password || !confirm) return showAuthError("register-error", "Please fill in all fields.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError("register-error", "Please enter a valid email address.");
  if (password.length < 6) return showAuthError("register-error", "Password must be at least 6 characters.");
  if (password !== confirm) return showAuthError("register-error", "Passwords do not match.");

  try {
    const result = await apiRequest("/auth/register", {
      method: "POST", body: JSON.stringify({ fullname, email, phone, password }),
    });
    state.currentUser = result.user;
    state.users.push(result.user);
    const budgets = await apiRequest("/budgets");
    state.budgets = budgets;
    setSession(result.user.user_id);
    showToast("Account created! Welcome to Wanderlust.", "success");
    enterApp(result.user);
  } catch (error) {
    showAuthError("register-error", error.message);
  }
}

function logout() {
  clearSession();
  destroyCharts();
  hideEl("app-section"); showEl("auth-section"); showLogin();
}
function checkSession() {
  const user = getCurrentUser();
  if (user) enterApp(user);
  else { showEl("auth-section"); hideEl("app-section"); }
}
function enterApp(user) {
  hideEl("auth-section"); showEl("app-section"); updateUserDisplay(user);
  navigateTo("dashboard", document.querySelector('[data-view="dashboard"]'), true);
}
function updateUserDisplay(user) {
  const name = user.fullname || user.username || "Traveler";
  const avatar = initials(name);
  setText("sidebar-username", user.username || name);
  setText("topbar-username", user.username || name);
  setHTML("sidebar-avatar", avatar); setHTML("topbar-avatar", avatar);
}

let currentView = "dashboard";
function navigateTo(viewName, linkEl, skipHistory) {
  if (linkEl?.preventDefault) { linkEl.preventDefault(); linkEl = null; }
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
  (linkEl || document.querySelector(`[data-view="${viewName}"]`))?.classList.add("active");
  document.querySelectorAll(".view").forEach((node) => { node.style.display = "none"; });
  el(`view-${viewName}`)?.style.removeProperty("display");
  const titles = { dashboard: "Dashboard", destinations: "Destinations", budgets: "Budgets", settings: "Settings" };
  setText("topbar-page-title", titles[viewName] || viewName);
  currentView = viewName; closeSidebar();
  if (viewName === "dashboard") renderDashboard();
  if (viewName === "destinations") renderDestinations();
  if (viewName === "budgets") renderBudgets();
  if (viewName === "settings") renderSettings();
}
function toggleSidebar() { el("sidebar")?.classList.toggle("open"); el("sidebar-overlay")?.classList.toggle("visible"); }
function closeSidebar() { el("sidebar")?.classList.remove("open"); el("sidebar-overlay")?.classList.remove("visible"); }

let budgetChart = null;
let categoryChart = null;
function destroyCharts() {
  budgetChart?.destroy(); categoryChart?.destroy();
  budgetChart = null; categoryChart = null;
}
function userBudgets() {
  const user = getCurrentUser();
  return getBudgets().filter((budget) => budget.user_id === user?.user_id);
}
function userDestinations() {
  const sourceIds = new Set(userBudgets().map((budget) => budget.source_id));
  return getDests().filter((destination) => sourceIds.has(destination.source_id));
}
function renderDashboard() {
  renderMetrics(); renderBudgetChart(); renderCategoryChart(); renderRecentActivity();
}
function renderMetrics() {
  const budgets = userBudgets();
  const dests = userDestinations();
  const visited = dests.filter((destination) => Number(destination.status) === 1).length;
  const totalBudget = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const allocated = dests.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
  const percentage = dests.length ? Math.round((visited / dests.length) * 100) : 0;
  setText("metric-total", dests.length);
  setText("metric-total-sub", "Across all categories");
  setText("metric-visited", visited);
  setText("metric-visited-sub", `${percentage}% completion`);
  setText("metric-budget", formatVND(totalBudget));
  setText("metric-budget-sub", `From ${budgets.length} source${budgets.length === 1 ? "" : "s"}`);
  setText("metric-remaining", formatVND(totalBudget - allocated));
}
function renderBudgetChart() {
  const budgets = userBudgets();
  const canvas = el("budget-chart");
  const empty = el("budget-chart-empty");
  const legend = el("budget-chart-legend");
  if (!budgets.length) {
    if (canvas) canvas.style.display = "none";
    if (empty) empty.style.display = "flex";
    if (legend) legend.innerHTML = "";
    return;
  }
  if (canvas) canvas.style.display = "";
  if (empty) empty.style.display = "none";
  budgetChart?.destroy();
  budgetChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: budgets.map((budget) => budget.source_name),
      datasets: [{ data: budgets.map((budget) => budget.init_amount), backgroundColor: budgets.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderWidth: 3 }],
    },
    options: { responsive: true, cutout: "62%", plugins: { legend: { display: false } } },
  });
  if (legend) {
    legend.innerHTML = budgets.map((budget, index) => `<div class="legend-item">
      <div class="legend-dot" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></div>
      <span class="legend-name">${escHtml(budget.source_name)}</span><span class="legend-value">${formatVND(budget.init_amount)}</span>
    </div>`).join("");
  }
}
function renderCategoryChart() {
  const destinations = userDestinations();
  const canvas = el("category-chart");
  const empty = el("category-chart-empty");
  const counts = {};
  destinations.forEach((destination) => { counts[destination.category] = (counts[destination.category] || 0) + 1; });
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (!labels.length) {
    if (canvas) canvas.style.display = "none";
    if (empty) empty.style.display = "flex";
    return;
  }
  canvas.style.display = ""; empty.style.display = "none";
  categoryChart?.destroy();
  categoryChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Destinations", data: labels.map((label) => counts[label]), backgroundColor: labels.map((_, i) => `${CHART_COLORS[i % CHART_COLORS.length]}cc`), borderColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderWidth: 2, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
}
function renderRecentActivity() {
  const container = el("recent-activity");
  if (!container) return;
  const budgets = userBudgets();
  const destinations = userDestinations().sort((a, b) => b.id - a.id).slice(0, 5);
  if (!destinations.length) {
    container.innerHTML = '<div class="activity-empty">No destinations yet. Add one to get started!</div>';
    return;
  }
  container.innerHTML = destinations.map((destination) => {
    const visited = Number(destination.status) === 1;
    const source = budgets.find((budget) => budget.source_id === destination.source_id);
    return `<div class="activity-item">
      <div class="activity-icon activity-icon--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check-circle" : "fa-clock"}"></i></div>
      <div class="activity-info"><p class="activity-name">${escHtml(destination.name)}</p><p class="activity-meta">${escHtml(destination.category)}${source ? ` · ${escHtml(source.source_name)}` : ""}</p></div>
      <div class="activity-right"><p class="activity-budget">${formatVND(destination.budget)}</p><p class="activity-priority">Priority ${destination.priority}/5</p></div>
      <span class="badge badge--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check" : "fa-clock"}"></i>${visited ? "Visited" : "Planned"}</span>
    </div>`;
  }).join("");
}

function renderDestinations() { populateCategoryFilter(); filterDestinations(); }
function populateCategoryFilter() {
  const select = el("dest-filter-cat");
  if (!select) return;
  const selected = select.value;
  const categories = [...new Set(userDestinations().map((destination) => destination.category))].sort();
  select.innerHTML = `<option value="all">All Categories</option>${categories.map((category) => `<option value="${escHtml(category)}">${escHtml(category)}</option>`).join("")}`;
  select.value = categories.includes(selected) ? selected : "all";
}
function filterDestinations() {
  const search = (el("dest-search")?.value || "").toLowerCase().trim();
  const category = el("dest-filter-cat")?.value || "all";
  const status = el("dest-filter-status")?.value || "all";
  const sort = el("dest-sort")?.value || "priority-desc";
  const budgets = userBudgets();
  let destinations = userDestinations().filter((destination) => {
    const matchesSearch = !search || destination.name.toLowerCase().includes(search) || destination.category.toLowerCase().includes(search);
    return matchesSearch && (category === "all" || destination.category === category) && (status === "all" || String(destination.status) === status);
  });
  destinations.sort((a, b) => {
    if (sort === "priority-asc") return a.priority - b.priority;
    if (sort === "budget-desc") return b.budget - a.budget;
    if (sort === "budget-asc") return a.budget - b.budget;
    return b.priority - a.priority;
  });
  renderDestinationsTable(destinations, budgets);
}
function renderDestinationsTable(destinations, budgets) {
  const tbody = el("dest-tbody");
  const table = el("dest-table");
  const empty = el("dest-empty");
  if (!tbody) return;
  if (!destinations.length) {
    tbody.innerHTML = ""; table.style.display = "none"; empty.style.display = "";
    return;
  }
  table.style.display = ""; empty.style.display = "none";
  tbody.innerHTML = destinations.map((destination) => {
    const visited = Number(destination.status) === 1;
    const source = budgets.find((budget) => budget.source_id === destination.source_id);
    const trip = getTrip(destination.id);
    return `<tr>
      <td>${escHtml(destination.name)}</td><td><span class="badge badge--indigo">${escHtml(destination.category)}</span></td>
      <td class="mono">${formatVND(destination.budget)}</td><td>${starsHTML(destination.priority)}</td>
      <td><span class="badge badge--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check" : "fa-clock"}"></i>${visited ? "Visited" : "Planned"}</span></td>
      <td style="color:var(--text-muted);font-size:13px;">${source ? escHtml(source.source_name) : "—"}</td>
      <td class="text-center"><button class="btn-plan-trip" onclick="openTripView(${destination.id})">🗺️ Plan${trip.items.length ? ` (${trip.items.length})` : ""}</button></td>
      <td><div class="action-btns"><button class="btn-icon" onclick="editDestination(${destination.id})" title="Edit"><i class="fas fa-pen"></i></button><button class="btn-icon btn-icon--danger" onclick="confirmDeleteDest(${destination.id})" title="Delete"><i class="fas fa-trash"></i></button></div></td>
    </tr>`;
  }).join("");
}
function openDestModal(destination) {
  const budgets = userBudgets();
  const source = el("dest-source");
  source.innerHTML = budgets.length ? budgets.map((budget) => `<option value="${budget.source_id}">${escHtml(budget.source_name)} (${formatVND(budget.init_amount)})</option>`).join("") : '<option value="">No budget sources available</option>';
  if (destination) {
    setText("dest-modal-title", "Edit Destination"); el("dest-edit-id").value = destination.id;
    el("dest-name").value = destination.name; el("dest-category").value = destination.category;
    el("dest-budget").value = destination.budget; el("dest-priority").value = destination.priority;
    el("dest-status").value = destination.status; source.value = destination.source_id;
  } else {
    setText("dest-modal-title", "Add Destination"); el("dest-form").reset(); el("dest-edit-id").value = "";
    el("dest-priority").value = "3"; el("dest-status").value = "0";
    if (budgets.length) source.value = budgets[0].source_id;
  }
  openModal("dest-modal");
}
async function saveDestination(event) {
  event.preventDefault();
  const name = el("dest-name").value.trim(), category = el("dest-category").value.trim();
  const budget = Number(el("dest-budget").value), priority = Number(el("dest-priority").value);
  const status = Number(el("dest-status").value), sourceId = Number(el("dest-source").value);
  const editId = el("dest-edit-id").value;
  if (!name || !category || !Number.isFinite(budget) || budget < 0 || !sourceId) return showToast("Please complete all destination fields.", "error");
  try {
    const result = await apiRequest(editId ? `/destinations/${editId}` : "/destinations", {
      method: editId ? "PUT" : "POST",
      body: JSON.stringify({ name, category, budget, priority, status, source_id: sourceId }),
    });
    if (editId) state.dests = state.dests.map((item) => item.id === Number(editId) ? result : item);
    else state.dests.push(result);
    closeModal("dest-modal"); populateCategoryFilter(); filterDestinations(); renderDashboard();
    showToast(editId ? "Destination updated!" : "Destination added!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
function editDestination(id) { const destination = getDests().find((item) => item.id === id); if (destination) openDestModal(destination); }
function confirmDeleteDest(id) {
  const destination = getDests().find((item) => item.id === id);
  showConfirm("Delete Destination", `Are you sure you want to delete "${destination?.name || "this destination"}"? This cannot be undone.`, async () => {
    try {
      await apiRequest(`/destinations/${id}`, { method: "DELETE" });
      state.dests = state.dests.filter((item) => item.id !== id);
      state.trips = state.trips.filter((trip) => trip.dest_id !== id);
      closeModal("confirm-modal"); filterDestinations(); populateCategoryFilter(); renderDashboard(); showToast("Destination deleted.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}

function renderBudgets() { renderBudgetCards(); renderBudgetTable(); }
function renderBudgetCards() {
  const container = el("budget-cards");
  const budgets = userBudgets();
  if (!budgets.length) { container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-wallet"></i><p>No budget sources</p><small>Add a source to start tracking</small></div>'; return; }
  container.innerHTML = budgets.map((budget) => {
    const destinations = getDests().filter((destination) => destination.source_id === budget.source_id);
    const allocated = destinations.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
    const remaining = Number(budget.init_amount) - allocated;
    const percent = Number(budget.init_amount) > 0 ? Math.min((allocated / Number(budget.init_amount)) * 100, 100) : 0;
    const fillClass = percent >= 100 ? "progress-bar-fill--danger" : percent >= 80 ? "progress-bar-fill--warning" : "";
    return `<div class="budget-source-card"><div class="budget-card-header"><div class="budget-card-title-row"><div class="budget-card-icon"><i class="fas fa-wallet"></i></div><span class="budget-card-name">${escHtml(budget.source_name)}</span></div><div class="budget-card-actions"><button class="btn-icon" onclick="editBudgetSource(${budget.source_id})"><i class="fas fa-pen"></i></button><button class="btn-icon btn-icon--danger" onclick="confirmDeleteBudget(${budget.source_id})"><i class="fas fa-trash"></i></button></div></div>
      <div class="budget-stat"><p class="budget-stat-label">Total Available</p><p class="budget-stat-value">${formatVND(budget.init_amount)}</p></div>
      <div class="budget-alloc-row"><span>Allocated</span><span>${formatVND(allocated)}</span></div><div class="progress-bar-track"><div class="progress-bar-fill ${fillClass}" style="width:${percent.toFixed(1)}%"></div></div>
      <div class="budget-remaining-row"><span class="budget-remaining-label">${percent.toFixed(1)}% used</span><span class="budget-remaining-val ${remaining < 0 ? "text-danger" : "text-success"}">${remaining >= 0 ? `${formatVND(remaining)} left` : `Over by ${formatVND(Math.abs(remaining))}`}</span></div>
    </div>`;
  }).join("");
}
function renderBudgetTable() {
  const tbody = el("budget-tbody"), table = el("budget-table"), empty = el("budget-empty");
  const budgets = userBudgets();
  if (!budgets.length) { tbody.innerHTML = ""; table.style.display = "none"; empty.style.display = ""; return; }
  table.style.display = ""; empty.style.display = "none";
  tbody.innerHTML = budgets.map((budget) => {
    const destinations = getDests().filter((destination) => destination.source_id === budget.source_id);
    const allocated = destinations.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
    const remaining = Number(budget.init_amount) - allocated;
    return `<tr><td>${escHtml(budget.source_name)}</td><td class="text-right mono">${formatVND(budget.init_amount)}</td><td class="text-right mono">${formatVND(allocated)}</td><td class="text-right mono ${remaining < 0 ? "text-danger" : "text-success"}" style="font-weight:700">${formatVND(remaining)}</td><td class="text-center"><span class="badge badge--indigo">${destinations.length}</span></td><td><div class="action-btns"><button class="btn-icon" onclick="editBudgetSource(${budget.source_id})"><i class="fas fa-pen"></i></button><button class="btn-icon btn-icon--danger" onclick="confirmDeleteBudget(${budget.source_id})"><i class="fas fa-trash"></i></button></div></td></tr>`;
  }).join("");
}
function openBudgetModal(budget) {
  if (budget) { setText("budget-modal-title", "Edit Budget Source"); el("budget-edit-id").value = budget.source_id; el("budget-source-name").value = budget.source_name; el("budget-source-amount").value = budget.init_amount; }
  else { setText("budget-modal-title", "Add Budget Source"); el("budget-form").reset(); el("budget-edit-id").value = ""; }
  openModal("budget-modal");
}
async function saveBudgetSource(event) {
  event.preventDefault();
  const name = el("budget-source-name").value.trim(), amount = Number(el("budget-source-amount").value), editId = el("budget-edit-id").value;
  if (!name || !Number.isFinite(amount) || amount < 0) return showToast("Please enter a valid budget source.", "error");
  try {
    const result = await apiRequest(editId ? `/budgets/${editId}` : "/budgets", { method: editId ? "PUT" : "POST", body: JSON.stringify({ source_name: name, init_amount: amount, user_id: getCurrentUser().user_id }) });
    if (editId) state.budgets = state.budgets.map((item) => item.source_id === Number(editId) ? result : item);
    else state.budgets.push(result);
    closeModal("budget-modal"); renderBudgets(); renderDashboard(); showToast(editId ? "Budget source updated!" : "Budget source added!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
function editBudgetSource(id) { const budget = getBudgets().find((item) => item.source_id === id); if (budget) openBudgetModal(budget); }
function confirmDeleteBudget(id) {
  const budget = getBudgets().find((item) => item.source_id === id);
  const count = getDests().filter((destination) => destination.source_id === id).length;
  showConfirm("Delete Budget Source", `Delete "${budget?.source_name || "this source"}"?${count ? ` This will also remove ${count} linked destination${count > 1 ? "s" : ""}.` : ""} This cannot be undone.`, async () => {
    try {
      await apiRequest(`/budgets/${id}`, { method: "DELETE" });
      state.budgets = state.budgets.filter((item) => item.source_id !== id);
      state.dests = state.dests.filter((item) => item.source_id !== id);
      closeModal("confirm-modal"); renderBudgets(); renderDashboard(); showToast("Budget source deleted.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}

function renderSettings() {
  const user = getCurrentUser();
  if (!user) return;
  const name = user.fullname || user.username || "Traveler";
  setText("settings-display-name", name); setHTML("settings-avatar", initials(name));
  el("settings-username").value = user.username || ""; el("settings-fullname").value = user.fullname || "";
  el("settings-email").value = user.email || ""; el("settings-phone").value = user.phone || ""; el("settings-password").value = "";
}
async function saveProfile(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;
  const username = el("settings-username").value.trim(), fullname = el("settings-fullname").value.trim();
  const email = el("settings-email").value.trim(), phone = el("settings-phone").value.trim(), password = el("settings-password").value;
  if (!username || !fullname) return showToast("Username and full name are required.", "error");
  if (password && password.length < 6) return showToast("Password must be at least 6 characters.", "error");
  try {
    const result = await apiRequest(`/users/${user.user_id}`, { method: "PUT", body: JSON.stringify({ username, fullname, email, phone, ...(password ? { password } : {}) }) });
    state.currentUser = result.user;
    state.users = state.users.map((item) => item.user_id === user.user_id ? result.user : item);
    updateUserDisplay(result.user); renderSettings(); showToast("Profile saved successfully!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
function confirmReset() {
  showConfirm("Reset Demo Data", "This will delete all current data and restore the original demo dataset. Are you sure?", async () => {
    try {
      await apiRequest("/data/reset", { method: "POST", body: "{}" });
      await loadServerData(); clearSession(); closeModal("confirm-modal"); showLogin(); hideEl("app-section"); showEl("auth-section"); showToast("Data has been reset to demo defaults.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function confirmDeleteAccount() {
  const user = getCurrentUser();
  showConfirm("Delete Account", `Permanently delete the account "${user?.username || ""}"? All associated data will be removed.`, async () => {
    try {
      await apiRequest(`/users/${user.user_id}`, { method: "DELETE" });
      state.users = state.users.filter((item) => item.user_id !== user.user_id);
      state.budgets = state.budgets.filter((item) => item.user_id !== user.user_id);
      clearSession(); closeModal("confirm-modal"); hideEl("app-section"); showEl("auth-section"); showLogin(); showToast("Account deleted.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}

let activeTripDestId = null;
let noteSaveTimer = null;
function getTrip(destId) {
  const user = getCurrentUser();
  return getAllTrips().find((trip) => Number(trip.dest_id) === Number(destId) && Number(trip.user_id) === Number(user?.user_id))
    || { dest_id: Number(destId), user_id: Number(user?.user_id), items: [], general_note: "" };
}
function saveTrip(trip) {
  const remaining = getAllTrips().filter((item) => !(Number(item.dest_id) === Number(trip.dest_id) && Number(item.user_id) === Number(trip.user_id)));
  saveAllTrips([...remaining, trip]);
}
function openTripView(destId) {
  const destination = userDestinations().find((item) => item.id === destId);
  if (!destination) return showToast("Destination not found.", "error");
  activeTripDestId = destId;
  document.querySelectorAll(".view").forEach((node) => { node.style.display = "none"; });
  el("view-trip").style.display = "";
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
  setText("topbar-page-title", "✈️ Trip Plan");
  renderTripHero(destination); renderTripStats(destination); renderItineraryList(); loadGeneralNote(); closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function closeTripView() { activeTripDestId = null; navigateTo("destinations", document.querySelector('[data-view="destinations"]')); }
function renderTripHero(destination) {
  const visited = Number(destination.status) === 1;
  setText("trip-hero-cat", destination.category); setText("trip-hero-name", destination.name); setHTML("trip-hero-emoji", catEmoji(destination.category));
  setHTML("trip-hero-meta", `<span class="trip-hero-chip">💰 ${formatVND(destination.budget)}</span><span class="trip-hero-chip">⭐ Priority ${destination.priority}/5</span>`);
  setHTML("trip-hero-badges", `<span class="trip-status-badge trip-status-badge--${visited ? "visited" : "planned"}">${visited ? "Visited" : "Planned"}</span>`);
}
function renderTripStats(destination) {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId);
  const maxDay = trip.items.length ? Math.max(...trip.items.map((item) => Number(item.day))) : 0;
  setText("stat-days", maxDay || "—"); setText("stat-activities", trip.items.length); setText("stat-budget", formatVND(destination.budget)); setText("stat-status", Number(destination.status) === 1 ? "Visited" : "Planned");
}
function addItineraryItem(event) {
  event.preventDefault();
  if (!activeTripDestId) return;
  const activity = el("itin-activity").value.trim();
  if (!activity) return showToast("Please enter an activity name.", "error");
  const trip = getTrip(activeTripDestId);
  const itemId = trip.items.length ? Math.max(...trip.items.map((item) => Number(item.id))) + 1 : 1;
  trip.items.push({ id: itemId, day: Number(el("itin-day").value) || 1, time: el("itin-time").value || "", activity, location: el("itin-location").value.trim(), note: el("itin-note").value.trim() });
  saveTrip(trip);
  el("itin-activity").value = ""; el("itin-location").value = ""; el("itin-note").value = "";
  showToast("Added to your itinerary!", "success"); renderItineraryList();
  const destination = userDestinations().find((item) => item.id === activeTripDestId);
  if (destination) renderTripStats(destination);
}
function deleteItineraryItem(itemId) {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId); trip.items = trip.items.filter((item) => item.id !== itemId); saveTrip(trip);
  renderItineraryList(); const destination = userDestinations().find((item) => item.id === activeTripDestId);
  if (destination) renderTripStats(destination); showToast("Activity removed.", "info");
}
function renderItineraryList() {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId); const list = el("itinerary-list"); const count = el("itinerary-count");
  if (!list) return;
  setText("itinerary-count", `${trip.items.length} item${trip.items.length === 1 ? "" : "s"}`);
  if (!trip.items.length) {
    list.innerHTML = '<div class="itin-empty"><div class="itin-empty-icon">🗺️</div><p>No activities yet!</p><small>Use the form above to build your itinerary</small></div>';
    return;
  }
  const groups = {};
  [...trip.items].sort((a, b) => Number(a.day) - Number(b.day) || String(a.time).localeCompare(String(b.time))).forEach((item) => {
    if (!groups[item.day]) groups[item.day] = []; groups[item.day].push(item);
  });
  list.innerHTML = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map((day) => `<div class="itin-day-group"><div class="itin-day-label">✨ Day ${day}</div>${groups[day].map((item) => `<div class="itin-item"><div class="itin-dot"></div><div class="itin-content"><div class="itin-top"><span class="itin-activity">${escHtml(item.activity)}</span>${item.time ? `<span class="itin-time-tag">${escHtml(item.time)}</span>` : ""}</div>${item.location ? `<div class="itin-location">📍 ${escHtml(item.location)}</div>` : ""}${item.note ? `<div class="itin-quick-note">📝 ${escHtml(item.note)}</div>` : ""}</div><button class="itin-del-btn" onclick="deleteItineraryItem(${item.id})" title="Remove"><i class="fas fa-times"></i></button></div>`).join("")}</div>`).join("");
}
function loadGeneralNote() {
  const note = el("trip-general-note"); if (!note || !activeTripDestId) return;
  note.value = getTrip(activeTripDestId).general_note || ""; hideEl("note-saved-hint");
}
function autoSaveNote() {
  if (!activeTripDestId) return;
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(() => {
    const trip = getTrip(activeTripDestId); trip.general_note = el("trip-general-note").value; saveTrip(trip);
    const hint = el("note-saved-hint"); hint?.classList.add("visible");
    setTimeout(() => hint?.classList.remove("visible"), 2000);
  }, 700);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") ["dest-modal", "budget-modal", "confirm-modal"].forEach((id) => { if (el(id)?.style.display === "flex") closeModal(id); });
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadServerData();
    el("login-form")?.addEventListener("submit", handleLogin);
    el("register-form")?.addEventListener("submit", handleRegister);
    el("confirm-action-btn")?.addEventListener("click", () => {
      if (typeof pendingConfirm === "function") { const action = pendingConfirm; pendingConfirm = null; action(); }
    });
    state.sessionId = getSession();
    checkSession();
  } catch (error) {
    showEl("auth-section"); hideEl("app-section");
    showAuthError("login-error", `Could not connect to the server: ${error.message}`);
  }
});