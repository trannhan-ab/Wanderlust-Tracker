
"use strict";

const CHART_COLORS = ["#e2628a", "#2db87b", "#f59e0b", "#a78bfa", "#f43f5e", "#38bdf8", "#fb923c"];
const USERNAME_PATTERN = /^[A-Za-z0-9]{3,30}$/;
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
  expenses: [],
  groupFunds: [],
  groups: [],
  activeGroup: null,
  sessionId: null,
  currentUser: null,
  csrfToken: null,
  map: null,
  mapMarkers: [],
  mapSearchMarker: null,
  celebratedGoals: new Set(),
};
const writeQueues = {};

const MAP_SEED_COORDS = {
  "da lat": [11.9404, 108.4583],
  "đà lạt": [11.9404, 108.4583],
  "phu quoc": [10.2899, 103.9840],
  "phú quốc": [10.2899, 103.9840],
  "hoi an": [15.8801, 108.3380],
  "hội an": [15.8801, 108.3380],
  "sapa": [22.3364, 103.8438],
  "ha giang": [22.7662, 104.9389],
  "hà giang": [22.7662, 104.9389],
  "nha trang": [12.2388, 109.1967],
  "hanoi": [21.0278, 105.8342],
  "hà nội": [21.0278, 105.8342],
  "ho chi minh": [10.8231, 106.6297],
  "đà nẵng": [16.0544, 108.2022],
  "da nang": [16.0544, 108.2022],
  "hai phong": [20.8449, 106.6881],
  "hải phòng": [20.8449, 106.6881],
  "ha long": [20.9101, 107.1839],
  "hạ long": [20.9101, 107.1839],
  "cat ba": [20.7278, 107.0482],
  "cát bà": [20.7278, 107.0482],
};

function el(id) { return document.getElementById(id); }
function showEl(id) { const node = el(id); if (node) node.style.display = ""; }
function hideEl(id) { const node = el(id); if (node) node.style.display = "none"; }
function setText(id, value) { const node = el(id); if (node) node.textContent = value; }
function setHTML(id, value) { const node = el(id); if (node) node.innerHTML = value; }

async function apiRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && state.csrfToken && !options.skipCsrf) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }
  let response;
  try {
    response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      method,
      headers,
    });
  } catch (_) {
    const error = new Error("Không thể kết nối đến máy chủ. Hãy kiểm tra server và thử lại.");
    error.status = 0;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Không thể hoàn tất yêu cầu.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadServerData() {
  const [budgets, dests, trips, groupFunds, expenses] = await Promise.all([
    apiRequest("/budgets"),
    apiRequest("/destinations"),
    apiRequest("/trips"),
    apiRequest("/group-fund"),
    apiRequest("/expenses"),
  ]);
  state.users = state.currentUser ? [state.currentUser] : [];
  state.budgets = budgets;
  state.dests = dests;
  state.trips = trips;
  state.groupFunds = groupFunds;
  state.expenses = expenses;
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
function formatToday() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}
function renderToday() {
  setText("current-date", `Hôm nay · ${formatToday()}`);
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
function categoryLabel(category) {
  const labels = {
    mountain: "Núi", beach: "Biển", culture: "Văn hóa", adventure: "Phiêu lưu",
    city: "Thành phố", explore: "Khám phá", "khám phá": "Khám phá",
  };
  return labels[String(category || "").trim().toLowerCase()] || String(category || "Khác");
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
function setFormBusy(formId, busy, busyLabel = "Đang xử lý…") {
  const submit = el(formId)?.querySelector('button[type="submit"]');
  if (!submit) return;
  if (busy) {
    if (!submit.dataset.originalHtml) submit.dataset.originalHtml = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${busyLabel}`;
  } else {
    submit.disabled = false;
    if (submit.dataset.originalHtml) {
      submit.innerHTML = submit.dataset.originalHtml;
      delete submit.dataset.originalHtml;
    }
  }
}

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
  if (!usernameOrEmail || !password) return showAuthError("login-error", "Vui lòng điền đầy đủ thông tin.");

  setFormBusy("login-form", true, "Đang đăng nhập…");
  try {
    const result = await apiRequest("/auth/login", {
      method: "POST", skipCsrf: true, body: JSON.stringify({ usernameOrEmail, password }),
    });
    state.currentUser = result.user;
    state.users = [result.user];
    state.csrfToken = result.csrfToken;
    setSession(result.user.user_id);
    await loadServerData();
    enterApp(result.user);
  } catch (error) {
    showAuthError("login-error", `${error.message} Gợi ý tài khoản mẫu: demo / 123456789`);
  } finally {
    setFormBusy("login-form", false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideAuthError("register-error");
  const fullname = el("reg-fullname").value.trim();
  const username = el("reg-username").value.trim().toLowerCase();
  const email = el("reg-email").value.trim();
  const phone = el("reg-phone").value.trim();
  const password = el("reg-password").value;
  const confirm = el("reg-confirm").value;
  if (!fullname || !username || !email || !phone || !password || !confirm) return showAuthError("register-error", "Vui lòng điền đầy đủ thông tin.");
  if (!USERNAME_PATTERN.test(username)) {
    return showAuthError("register-error", "Tên đăng nhập phải dài 3–30 ký tự, chỉ gồm chữ không dấu và số, không có khoảng trắng.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError("register-error", "Vui lòng nhập địa chỉ email hợp lệ.");
  if (password.length < 6) return showAuthError("register-error", "Mật khẩu phải có ít nhất 6 ký tự.");
  if (password !== confirm) return showAuthError("register-error", "Mật khẩu xác nhận không khớp.");

  setFormBusy("register-form", true, "Đang tạo tài khoản…");
  try {
    const result = await apiRequest("/auth/register", {
      method: "POST", skipCsrf: true, body: JSON.stringify({ username, fullname, email, phone, password }),
    });
    state.currentUser = result.user;
    state.users = [result.user];
    state.csrfToken = result.csrfToken;
    setSession(result.user.user_id);
    await loadServerData();
    showToast("Tạo tài khoản thành công! Chào mừng bạn đến với Wanderlust.", "success");
    enterApp(result.user);
  } catch (error) {
    showAuthError("register-error", error.message);
  } finally {
    setFormBusy("register-form", false);
  }
}

async function logout() {
  try {
    if (state.csrfToken) await apiRequest("/auth/logout", { method: "POST", body: "{}" });
  } catch (error) {
    showToast(error.message, "error");
  }
  clearSession();
  state.csrfToken = null;
  state.users = [];
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
  loadSharedGroups();
  navigateTo("dashboard", document.querySelector('[data-view="dashboard"]'), true);
}
function updateUserDisplay(user) {
  const name = user.fullname || user.username || "Bạn";
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
  document.querySelectorAll(".view").forEach((node) => { node.style.display = "none"; node.classList.remove("view-enter"); });
  const activeView = el(`view-${viewName}`);
  activeView?.style.removeProperty("display");
  if (activeView) {
    void activeView.offsetWidth;
    activeView.classList.add("view-enter");
  }
  const titles = { dashboard: "Dashboard", destinations: "Destinations", map: "Map", budgets: "Budgets", "group-fund": "Group Fund", settings: "Settings" };
  setText("topbar-page-title", titles[viewName] || viewName);
  currentView = viewName; closeSidebar();
  if (viewName === "dashboard") renderDashboard();
  if (viewName === "destinations") renderDestinations();
  if (viewName === "map") renderMap();
  if (viewName === "budgets") renderBudgets();
  if (viewName === "group-fund") renderGroupFund();
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
function userExpenses() {
  const destinationIds = new Set(userDestinations().map((destination) => Number(destination.id)));
  return state.expenses.filter((expense) => destinationIds.has(Number(expense.dest_id)));
}
function renderDashboard() {
  renderGreetingBanner(); renderAchievements();
  renderMetrics(); renderFinancialStory(); renderItineraryProgress();
  renderBudgetChart(); renderCategoryChart(); renderRecentActivity(); renderBudgetAlerts(); renderUpcomingTrip();
}

function renderGreetingBanner() {
  const user = getCurrentUser();
  const hour = new Date().getHours();
  let hello, emoji;
  if (hour < 5) { hello = "Khuya rồi, đi ngủ sớm nhé"; emoji = "🌙"; }
  else if (hour < 11) { hello = "Chào buổi sáng"; emoji = "☀️"; }
  else if (hour < 13) { hello = "Chào buổi trưa"; emoji = "🌤️"; }
  else if (hour < 18) { hello = "Chào buổi chiều"; emoji = "🌇"; }
  else { hello = "Chào buổi tối"; emoji = "🌙"; }
  const name = user?.fullname || user?.username || "bạn";
  setText("greeting-hello", hello);
  setText("greeting-name", `${name}! ${emoji}`);
  setText("greeting-quote", "");
  setText("greeting-emoji", emoji === "🌙" ? "🌙" : emoji === "☀️" ? "🌸" : "🌤️");
}
function renderAchievements() {
  const container = el("achievements-strip");
  if (!container) return;
  const dests = userDestinations();
  const visited = dests.filter((item) => Number(item.status) === 1).length;
  const totalDests = dests.length;
  const budgets = userBudgets();
  const totalFunds = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const actualSpent = userExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const savedPercent = totalFunds ? Math.max(0, Math.round(((totalFunds - actualSpent) / totalFunds) * 100)) : 0;

  const tiers = [
    { min: 0, icon: "🌱", name: "Người mới bắt đầu" },
    { min: 1, icon: "⭐", name: "Nhà thám hiểm" },
    { min: 3, icon: "🏔️", name: "Lữ khách dày dạn" },
    { min: 5, icon: "👑", name: "Bậc thầy du lịch" },
    { min: 8, icon: "🌍", name: "Huyền thoại xê dịch" },
  ];
  let current = tiers[0];
  let next = null;
  for (const tier of tiers) {
    if (visited >= tier.min) current = tier;
    else if (!next) next = tier;
  }
  const nextText = next
    ? `Còn ${next.min - visited} chuyến nữa để lên hạng "${next.name}" ${next.icon}`
    : "Bạn đã đạt hạng cao nhất! Thật đáng ngưỡng mộ 🎉";

  container.innerHTML = `
    <div class="achievement-badge-card">
      <div class="achievement-badge-icon">${current.icon}</div>
      <div>
        <p class="achievement-badge-rank">${escHtml(current.name)}</p>
        <p class="achievement-badge-next">${escHtml(nextText)}</p>
      </div>
    </div>
    <div class="achievement-chip"><span>🗺️</span><div><strong>${totalDests}</strong><small>Điểm đến</small></div></div>
    <div class="achievement-chip"><span>🚩</span><div><strong>${visited}</strong><small>Đã khám phá</small></div></div>
    <div class="achievement-chip"><span>💰</span><div><strong>${savedPercent}%</strong><small>Ngân sách còn lại</small></div></div>
  `;
}

function celebrate() {
  const container = el("confetti-container");
  if (!container) return;
  const colors = ["#e2628a", "#f4a7c8", "#a78bfa", "#2db87b", "#f59e0b", "#38bdf8"];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2 + Math.random() * 1.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.setProperty("--rot", `${Math.random() * 360}deg`);
    if (Math.random() > 0.5) piece.style.borderRadius = "50%";
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4200);
  }
}

function downloadCSV(filename, rows) {
  const csvContent = rows.map((row) => row.map((cell) => {
    const value = cell === null || cell === undefined ? "" : String(cell);
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
function exportDestinationsCSV() {
  const dests = userDestinations();
  if (!dests.length) return showToast("Chưa có điểm đến để xuất dữ liệu.", "error");
  const budgets = userBudgets();
  const rows = [["Tên điểm đến", "Nhóm", "Ngân sách dự kiến", "Độ ưu tiên", "Trạng thái", "Ngày bắt đầu", "Ngày kết thúc", "Nguồn tiền"]];
  dests.forEach((destination) => {
    const source = budgets.find((budget) => budget.source_id === destination.source_id);
    rows.push([
      destination.name, destination.category, destination.budget, destination.priority,
      Number(destination.status) === 1 ? "Đã ghé thăm" : "Đang lên kế hoạch",
      destination.start_date || "", destination.end_date || "",
      source ? source.source_name : "",
    ]);
  });
  downloadCSV("wanderlust-destinations.csv", rows);
  showToast("Đã xuất danh sách điểm đến!", "success");
}
function exportBudgetsCSV() {
  const budgets = userBudgets();
  if (!budgets.length) return showToast("Chưa có nguồn ngân sách để xuất dữ liệu.", "error");
  const dests = userDestinations();
  const rows = [["Tên nguồn", "Số tiền ban đầu", "Đã phân bổ", "Còn lại", "Điểm đến liên kết"]];
  budgets.forEach((budget) => {
    const linked = dests.filter((destination) => destination.source_id === budget.source_id);
    const allocated = linked.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
    rows.push([budget.source_name, budget.init_amount, allocated, Number(budget.init_amount) - allocated, linked.length]);
  });
  downloadCSV("wanderlust-budgets.csv", rows);
  showToast("Đã xuất danh sách nguồn ngân sách!", "success");
}
function exportExpensesCSV() {
  const expenses = userExpenses();
  if (!expenses.length) return showToast("Chưa có khoản chi để xuất dữ liệu.", "error");
  const dests = userDestinations();
  const rows = [["Điểm đến", "Số tiền", "Nhóm chi", "Ghi chú", "Ngày chi"]];
  expenses.forEach((expense) => {
    const destination = dests.find((item) => item.id === Number(expense.dest_id));
    rows.push([destination ? destination.name : "—", expense.amount, expense.category || "", expense.note || "", expense.spent_on || ""]);
  });
  downloadCSV("wanderlust-expenses.csv", rows);
  showToast("Đã xuất danh sách khoản chi!", "success");
}
function printBudgetReport() {
  const user = getCurrentUser();
  const budgets = userBudgets();
  const dests = userDestinations();
  const expenses = userExpenses();
  const totalFunds = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const plannedSpend = dests.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
  const actualSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const cashRemaining = totalFunds - actualSpent;
  const rowsHtml = dests.map((destination) => {
    const source = budgets.find((budget) => budget.source_id === destination.source_id);
    const spent = destinationExpenses(destination.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return `<tr><td>${escHtml(destination.name)}</td><td>${escHtml(destination.category)}</td><td>${escHtml(source ? source.source_name : "—")}</td>
      <td style="text-align:right">${formatVND(destination.budget)}</td><td style="text-align:right">${formatVND(spent)}</td>
      <td>${Number(destination.status) === 1 ? "Đã ghé thăm" : "Đang lên kế hoạch"}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Wanderlust Tracker — Budget report</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#2d1a26;padding:36px;}
  h1{color:#e2628a;margin-bottom:2px;font-size:24px;}
  .sub{color:#7a5a6a;margin-bottom:24px;font-size:13px;}
  .summary{display:flex;gap:16px;margin-bottom:26px;flex-wrap:wrap;}
  .box{border:1.5px solid #f3c7d8;border-radius:12px;padding:14px 20px;min-width:150px;}
  .box b{display:block;font-size:19px;color:#e2628a;} .box span{font-size:11px;color:#7a5a6a;text-transform:uppercase;letter-spacing:.04em;}
  table{width:100%;border-collapse:collapse;margin-top:6px;}
  th,td{padding:9px 10px;border-bottom:1px solid #f3c7d8;font-size:13px;text-align:left;}
  th{background:#fce4f0;color:#7a5a6a;text-transform:uppercase;font-size:10px;letter-spacing:.04em;}
  footer{margin-top:30px;font-size:11px;color:#b59faa;}
  @media print { body{padding:14px;} }
</style></head><body>
  <h1>🌸 Wanderlust Tracker — Báo cáo ngân sách</h1>
  <p class="sub">Người dùng: ${escHtml(user?.fullname || user?.username || "")} · Ngày tạo: ${new Date().toLocaleDateString("vi-VN")}</p>
  <div class="summary">
     <div class="box"><b>${formatVND(totalFunds)}</b><span>Tổng quỹ</span></div>
     <div class="box"><b>${formatVND(plannedSpend)}</b><span>Dự toán</span></div>
     <div class="box"><b>${formatVND(actualSpent)}</b><span>Đã chi</span></div>
     <div class="box"><b style="color:${cashRemaining < 0 ? "#f43f5e" : "#2db87b"}">${formatVND(cashRemaining)}</b><span>Còn lại</span></div>
  </div>
   <table><thead><tr><th>Điểm đến</th><th>Nhóm</th><th>Nguồn tiền</th><th style="text-align:right">Ngân sách</th><th style="text-align:right">Đã chi</th><th>Trạng thái</th></tr></thead>
   <tbody>${rowsHtml || '<tr><td colspan="6">Chưa có điểm đến.</td></tr>'}</tbody></table>
   <footer>Báo cáo được tạo từ Wanderlust Tracker 🌸</footer>
</body></html>`;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return showToast("Hãy cho phép cửa sổ bật lên để in báo cáo.", "error");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
function renderMetrics() {
  const budgets = userBudgets();
  const dests = userDestinations();
  const totalFunds = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const plannedSpend = dests.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
  const actualSpent = userExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const cashRemaining = totalFunds - actualSpent;
  const plannedPercent = totalFunds ? Math.round((plannedSpend / totalFunds) * 100) : 0;
  setText("metric-funds", formatVND(totalFunds));
  setText("metric-funds-sub", `${budgets.length} nguồn tiền`);
  setText("metric-planned", formatVND(plannedSpend));
  setText("metric-planned-sub", `${plannedPercent}% tổng quỹ`);
  setText("metric-actual", formatVND(actualSpent));
  setText("metric-actual-sub", `${userExpenses().length} khoản chi`);
  setText("metric-cash", formatVND(cashRemaining));
  setText("metric-cash-sub", cashRemaining < 0 ? "Vượt quá tổng quỹ" : "Sau các khoản chi");
  el("metric-cash")?.classList.toggle("metric-value--danger", cashRemaining < 0);
}
function renderFinancialStory() {
  const budgets = userBudgets();
  const destinations = userDestinations();
  const totalFunds = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const plannedSpend = destinations.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
  const actualSpent = userExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const cashRemaining = totalFunds - actualSpent;
  const plannedPercent = totalFunds ? Math.min((plannedSpend / totalFunds) * 100, 100) : 0;
  const actualPercent = totalFunds ? Math.min((actualSpent / totalFunds) * 100, 100) : 0;
  setText("story-planned", formatVND(plannedSpend));
  setText("story-actual", formatVND(actualSpent));
  setText("story-cash", formatVND(cashRemaining));
  if (el("story-planned-bar")) el("story-planned-bar").style.width = `${plannedPercent}%`;
  if (el("story-actual-bar")) el("story-actual-bar").style.width = `${actualPercent}%`;
  const status = el("finance-story-status");
  if (status) {
     status.textContent = cashRemaining < 0 ? "Vượt quỹ" : plannedPercent >= 80 ? "Sắp hết ngân sách" : "Đang ổn";
    status.className = `pill ${cashRemaining < 0 ? "pill--danger" : plannedPercent >= 80 ? "pill--warning" : "pill--pink"}`;
  }
}
function renderItineraryProgress() {
  const trips = getAllTrips().filter((trip) => Number(trip.user_id) === Number(getCurrentUser()?.user_id));
  const items = trips.flatMap((trip) => Array.isArray(trip.items) ? trip.items : []);
  const completed = items.filter((item) => item.completed === true || item.completed === 1 || item.completed === "true").length;
  const percent = items.length ? Math.round((completed / items.length) * 100) : 0;
  setText("itinerary-progress-value", `${percent}%`);
  setText("itinerary-progress-percent", `${percent}%`);
   setText("itinerary-progress-caption", items.length ? `${completed}/${items.length} hoạt động đã hoàn thành` : "Chưa có hoạt động");
   setText("itinerary-progress-meta", items.length ? "Mỗi hoạt động hoàn thành đưa bạn gần hơn đến chuyến đi." : "Thêm hoạt động để theo dõi tiến độ chuyến đi.");
  const ring = el("itinerary-progress-ring");
  if (ring) ring.style.setProperty("--progress", `${percent * 3.6}deg`);
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
     data: { labels, datasets: [{ label: "Điểm đến", data: labels.map((label) => counts[label]), backgroundColor: labels.map((_, i) => `${CHART_COLORS[i % CHART_COLORS.length]}cc`), borderColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderWidth: 2, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
}
function renderRecentActivity() {
  const container = el("recent-activity");
  if (!container) return;
  const budgets = userBudgets();
  const destinations = userDestinations().sort((a, b) => b.id - a.id).slice(0, 5);
  if (!destinations.length) {
     container.innerHTML = '<div class="activity-empty">Chưa có điểm đến. Hãy thêm điểm đến đầu tiên nhé!</div>';
    return;
  }
  container.innerHTML = destinations.map((destination) => {
    const visited = Number(destination.status) === 1;
    const source = budgets.find((budget) => budget.source_id === destination.source_id);
    return `<div class="activity-item">
      <div class="activity-icon activity-icon--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check-circle" : "fa-clock"}"></i></div>
      <div class="activity-info"><p class="activity-name">${escHtml(destination.name)}</p><p class="activity-meta">${escHtml(categoryLabel(destination.category))}${source ? ` · ${escHtml(source.source_name)}` : ""}</p></div>
       <div class="activity-right"><p class="activity-budget">${formatVND(destination.budget)}</p><p class="activity-priority">Ưu tiên ${destination.priority}/5</p></div>
       <span class="badge badge--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check" : "fa-clock"}"></i>${visited ? "Đã ghé thăm" : "Đang lên kế hoạch"}</span>
    </div>`;
  }).join("");
}

function localDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function dateLabel(value) {
  const date = localDate(value);
  return date ? date.toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function daysFromToday(value) {
  const date = localDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
}
function renderBudgetAlerts() {
  const container = el("budget-alerts");
  if (!container) return;
  const budgets = userBudgets();
  const destinations = userDestinations();
  const totalFunds = budgets.reduce((sum, budget) => sum + Number(budget.init_amount || 0), 0);
  const totalPlanned = destinations.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
  const actualSpent = userExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const alerts = budgets.map((budget) => {
    const allocated = userDestinations()
      .filter((destination) => Number(destination.source_id) === Number(budget.source_id))
      .reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
    const percent = Number(budget.init_amount) > 0 ? allocated / Number(budget.init_amount) * 100 : 0;
    return { budget, allocated, percent };
  }).filter((item) => item.percent >= 80);
  const messages = alerts.map(({ budget, allocated, percent }) => {
    const danger = percent >= 100;
    return `<div class="budget-alert budget-alert--${danger ? "danger" : "warning"}">
      <i class="fas ${danger ? "fa-triangle-exclamation" : "fa-circle-exclamation"}"></i>
       <span><strong>${escHtml(budget.source_name)}</strong> đã phân bổ ${percent.toFixed(0)}% (${formatVND(allocated)} / ${formatVND(budget.init_amount)}).</span>
    </div>`;
  });
  if (totalFunds > 0 && totalPlanned > totalFunds) {
    messages.unshift(`<div class="budget-alert budget-alert--danger"><i class="fas fa-triangle-exclamation"></i><span>Dự toán đã vượt tổng quỹ <strong>${formatVND(totalPlanned - totalFunds)}</strong>.</span></div>`);
  }
  if (totalFunds > 0 && actualSpent > totalFunds) {
    messages.unshift(`<div class="budget-alert budget-alert--danger"><i class="fas fa-receipt"></i><span>Chi tiêu thực tế đã vượt tổng quỹ <strong>${formatVND(actualSpent - totalFunds)}</strong>.</span></div>`);
  }
  if (!messages.length) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }
  container.style.display = "";
  container.innerHTML = messages.join("");
}
function renderUpcomingTrip() {
  const card = el("next-trip-card");
  if (!card) return;
  const upcoming = userDestinations()
    .filter((destination) => destination.start_date && Number(destination.status) !== 1 && (daysFromToday(destination.start_date) ?? -1) >= 0)
    .sort((a, b) => localDate(a.start_date) - localDate(b.start_date))[0];
  if (!upcoming) {
    card.style.display = "none";
    return;
  }
  const days = daysFromToday(upcoming.start_date);
  card.style.display = "";
  setText("next-trip-name", upcoming.name);
  setText("next-trip-dates", `${dateLabel(upcoming.start_date)} → ${dateLabel(upcoming.end_date)}`);
  setText("next-trip-countdown", days === 0 ? "Hôm nay" : `${days} ngày`);
  setText("next-trip-countdown-label", "đến ngày khởi hành");
}

function renderDestinations() { populateCategoryFilter(); filterDestinations(); }

/* ── MAP EXPLORER ───────────────────────────────────────────── */
function mapStorage() {
  try { return JSON.parse(localStorage.getItem("wt_map_coords") || "{}"); } catch (_) { return {}; }
}
function saveMapStorage(value) {
  try { localStorage.setItem("wt_map_coords", JSON.stringify(value)); } catch (_) { /* private mode */ }
}
function mapKey(destination) {
  return `${destination.id}:${String(destination.name || "").trim().toLowerCase()}`;
}
function normalizePlaceName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function knownMapCoords(name) {
  const normalized = normalizePlaceName(name);
  const match = Object.keys(MAP_SEED_COORDS).find((key) => normalized.includes(normalizePlaceName(key)));
  return match ? [...MAP_SEED_COORDS[match]] : null;
}
function coordsForDestination(destination) {
  const lat = Number(destination.latitude ?? destination.lat);
  const lng = Number(destination.longitude ?? destination.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  const stored = mapStorage()[mapKey(destination)];
  if (Array.isArray(stored) && stored.length === 2 &&
      Number.isFinite(Number(stored[0])) && Number.isFinite(Number(stored[1]))) {
    return [Number(stored[0]), Number(stored[1])];
  }
  return knownMapCoords(destination.name);
}
async function geocodeDestination(destination) {
  const known = knownMapCoords(destination.name);
  if (known) return known;
  try {
    const response = await fetch(`/map/geocode?q=${encodeURIComponent(`${destination.name}, Việt Nam`)}`);
    if (!response.ok) return null;
    const results = await response.json();
    const lat = Number(results[0]?.lat);
    const lng = Number(results[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  } catch (_) {
    return null;
  }
}
async function ensureDestinationCoords(destination) {
  const existing = coordsForDestination(destination);
  if (existing) return existing;
  const coords = await geocodeDestination(destination);
  if (!coords) return null;
  const storage = mapStorage();
  storage[mapKey(destination)] = coords;
  saveMapStorage(storage);
  return coords;
}
function mapMarkerIcon(visited) {
  return L.divIcon({
    className: "wanderlust-marker-wrap",
    html: `<span class="wanderlust-marker ${visited ? "wanderlust-marker--visited" : ""}"><i class="fas fa-location-dot"></i></span>`,
    iconSize: [36, 42], iconAnchor: [18, 38], popupAnchor: [0, -34],
  });
}
function fullMapUrl(coords) {
  if (!coords || coords.length !== 2) return "https://www.google.com/maps";
  const [lat, lng] = coords.map(Number);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
function openFullMapView() {
  if (!state.map) return showToast("Bản đồ chưa sẵn sàng.", "info");
  const center = state.map.getCenter();
  const url = fullMapUrl([center.lat, center.lng]);
  window.open(url, "_blank", "noopener,noreferrer");
}
function renderMap() {
  const mapElement = el("travel-map");
  if (!mapElement || typeof L === "undefined") {
    setText("map-status", "Cần kết nối Internet để tải bản đồ");
    return;
  }
  if (!state.map) {
    state.map = L.map(mapElement, { zoomControl: false, scrollWheelZoom: true }).setView([16.0471, 108.2068], 5.3);
    L.control.zoom({ position: "bottomright" }).addTo(state.map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
       maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
    }).addTo(state.map);
  }
  setTimeout(() => state.map?.invalidateSize(), 80);
  renderMapDestinationList();
  renderMapMarkers();
  void hydrateMapCoordinates();
}
function renderMapDestinationList() {
  const destinations = userDestinations();
  setText("map-destination-count", `${destinations.length} điểm đến`);
  const list = el("map-destination-list");
  if (!list) return;
  if (!destinations.length) {
     list.innerHTML = '<div class="activity-empty">Chưa có điểm đến. Hãy thêm địa điểm đầu tiên ✨</div>';
    return;
  }
  list.innerHTML = destinations.map((destination) => {
    const visited = Number(destination.status) === 1;
    const coords = coordsForDestination(destination);
    return `<button class="map-destination-item" onclick="focusDestinationOnMap(${destination.id})">
      <span class="map-list-pin ${visited ? "is-visited" : ""}"><i class="fas fa-location-dot"></i></span>
       <span class="map-list-copy"><strong>${escHtml(destination.name)}</strong><small>${escHtml(categoryLabel(destination.category))} · ${formatVND(destination.budget)}</small></span>
      <span class="map-list-arrow">${coords ? "→" : "⌖"}</span>
    </button>`;
  }).join("");
}
function renderMapMarkers() {
  if (!state.map) return;
  state.mapMarkers.forEach((marker) => marker.remove());
  state.mapMarkers = [];
  const destinations = userDestinations();
  destinations.forEach((destination) => {
    const coords = coordsForDestination(destination);
    if (!coords) return;
    const visited = Number(destination.status) === 1;
    const marker = L.marker(coords, { icon: mapMarkerIcon(visited), title: destination.name }).addTo(state.map);
     marker.bindPopup(`<div class="map-popup"><span class="map-popup-kicker">${visited ? "ĐÃ GHÉ THĂM" : "DANH SÁCH MUỐN ĐẾN"}</span>
       <strong>${escHtml(destination.name)}</strong><small>${escHtml(categoryLabel(destination.category))} · ${formatVND(destination.budget)}</small>
       <span class="map-popup-date">${destination.start_date ? `📅 ${dateLabel(destination.start_date)}` : "📅 Chưa chọn ngày đi"}</span>
       <button class="btn-primary btn-small" onclick="openTripView(${destination.id})">Mở lịch trình <i class="fas fa-arrow-right"></i></button>
       <a class="map-popup-link" href="${fullMapUrl(coords)}" target="_blank" rel="noopener noreferrer">Mở Google Maps ↗</a></div>`);
    marker.on("click", () => marker.openPopup());
    state.mapMarkers.push(marker);
  });
   setText("map-status", `Đã ghim ${state.mapMarkers.length} điểm đến`);
}
async function hydrateMapCoordinates() {
  const destinations = userDestinations().filter((destination) => !coordsForDestination(destination)).slice(0, 6);
  if (!destinations.length) return;
  // Nominatim asks clients to avoid bursts of parallel requests.
  for (const destination of destinations) {
    await ensureDestinationCoords(destination);
  }
  if (currentView === "map") { renderMapDestinationList(); renderMapMarkers(); }
}
async function focusDestinationOnMap(id) {
  const destination = userDestinations().find((item) => Number(item.id) === Number(id));
  if (!destination) return;
  let coords = coordsForDestination(destination);
  if (!coords) {
    setText("map-status", `Đang tìm "${destination.name}"…`);
    coords = await ensureDestinationCoords(destination);
    if (coords) {
      renderMapDestinationList();
      renderMapMarkers();
    }
  }
  if (!coords) {
    el("map-search-input").value = destination.name;
    return searchMapPlace();
  }
  state.map?.flyTo(coords, 12, { duration: 0.8 });
  const marker = state.mapMarkers.find((item) => item.options.title === destination.name);
  if (marker) marker.openPopup();
  else showToast("Đã tìm thấy địa điểm nhưng chưa tạo được ghim bản đồ.", "info");
}
function openDestinationMap(id) {
  navigateTo("map", document.querySelector('[data-view="map"]'));
  window.setTimeout(() => { void focusDestinationOnMap(id); }, 120);
}
function fitAllDestinations() {
  if (!state.map) return;
  const points = state.mapMarkers.map((marker) => marker.getLatLng());
  if (points.length === 1) state.map.setView(points[0], 11);
  else if (points.length > 1) state.map.fitBounds(L.latLngBounds(points), { padding: [34, 34] });
  else state.map.setView([16.0471, 108.2068], 5.3);
}
async function searchMapPlace() {
  const input = el("map-search-input");
  const query = input?.value.trim();
  if (!query) return showToast("Hãy nhập một địa điểm để tìm kiếm.", "info");
  if (!state.map) renderMap();
  if (!state.map) return showToast("Bản đồ chưa sẵn sàng. Hãy kiểm tra kết nối Internet.", "error");

  const matchingDestination = userDestinations().find((destination) =>
    normalizePlaceName(destination.name).includes(normalizePlaceName(query)) ||
    normalizePlaceName(query).includes(normalizePlaceName(destination.name)));
  if (matchingDestination) {
    let destinationCoords = coordsForDestination(matchingDestination);
    if (!destinationCoords) destinationCoords = await ensureDestinationCoords(matchingDestination);
    if (destinationCoords) {
      renderMapDestinationList();
      renderMapMarkers();
      state.map.flyTo(destinationCoords, 12, { duration: 0.8 });
      const marker = state.mapMarkers.find((item) => item.options.title === matchingDestination.name);
      if (marker) marker.openPopup();
      setText("map-status", `Đã tìm thấy "${matchingDestination.name}"`);
      return;
    }
  }

  const known = knownMapCoords(query);
  if (known) {
    state.map.flyTo(known, 12, { duration: 0.8 });
    state.mapSearchMarker?.remove();
    state.mapSearchMarker = L.marker(known, { icon: mapMarkerIcon(false) }).addTo(state.map)
      .bindPopup(`<div class="map-popup"><span class="map-popup-kicker">KẾT QUẢ TÌM KIẾM</span><strong>${escHtml(query)}</strong><small>Vị trí đã nhận diện trong Việt Nam</small></div>`)
      .openPopup();
    state.lastMapSearch = { name: query, lat: known[0], lng: known[1] };
    setText("map-status", "Đã tìm thấy địa điểm");
    return;
  }

  setText("map-status", "Đang tìm địa điểm…");
  try {
    const response = await fetch(`/map/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Geocoding request failed");
    const results = await response.json();
    if (!results[0]) {
      setText("map-status", "Không tìm thấy địa điểm");
      return showToast("Không tìm thấy địa điểm này.", "info");
    }
    const place = results[0];
    const point = [Number(place.lat), Number(place.lon)];
    if (!point.every(Number.isFinite)) throw new Error("Invalid map coordinates");
    state.map.flyTo(point, 12, { duration: 0.8 });
    state.mapSearchMarker?.remove();
    state.mapSearchMarker = L.marker(point, { icon: mapMarkerIcon(false) }).addTo(state.map)
       .bindPopup(`<div class="map-popup"><span class="map-popup-kicker">KẾT QUẢ TÌM KIẾM</span><strong>${escHtml(place.display_name.split(",")[0])}</strong><small>${escHtml(place.display_name)}</small><button class="btn-primary btn-small" onclick="addSearchResultToWishlist()">♡ Lưu vào danh sách</button><a class="map-popup-link" href="${fullMapUrl(point)}" target="_blank" rel="noopener noreferrer">Mở bản đồ đầy đủ ↗</a></div>`)
      .openPopup();
    state.lastMapSearch = { name: place.display_name.split(",")[0], lat: point[0], lng: point[1] };
    setText("map-status", "Đã tìm thấy địa điểm");
  } catch (_) {
    showToast("Dịch vụ tìm kiếm bản đồ đang tạm thời không khả dụng.", "error");
    setText("map-status", "Bản đồ sẵn sàng");
  }
}
function addSearchResultToWishlist() {
  const result = state.lastMapSearch;
  if (!result) return;
   const category = "Khám phá";
  const budget = userBudgets()[0];
   if (!budget) return showToast("Hãy tạo nguồn ngân sách trước.", "info");
  openDestModal();
  el("dest-name").value = result.name;
  el("dest-category").value = category;
  el("dest-source").value = budget.source_id;
  const storage = mapStorage();
  storage[`new:${result.name.toLowerCase()}`] = [result.lat, result.lng];
  saveMapStorage(storage);
   showToast("Địa điểm đã được đưa vào biểu mẫu điểm muốn đến.", "success");
}
async function loadSharedGroups() {
  const user = getCurrentUser();
  if (!user) return;
  try {
    state.groups = await apiRequest("/groups");
    if (currentView === "group-fund") renderGroupFund();
  } catch (error) { showToast(error.message, "error"); }
}
function renderGroupFund() {
  const list = el("shared-fund-list");
  if (!list) return;
  if (!state.groups.length) {
    list.innerHTML = '<div class="activity-empty">Bạn chưa tạo hoặc tham gia quỹ chung nào.</div>';
    hideEl("shared-fund-detail");
    return;
  }
  list.innerHTML = state.groups.map((group) => `<button class="btn-plan-trip" style="margin:6px;" onclick="openSharedFund(${group.group_id})">${escHtml(group.name)} · ${group.member_count} thành viên</button>`).join("");
  if (state.activeGroup) openSharedFund(state.activeGroup.group_id);
}
async function createSharedFund(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user?.user_id) return showToast("Vui lòng đăng nhập lại trước khi tạo quỹ.", "error");
  const name = el("new-group-name").value.trim();
  const goalInput = el("new-group-goal").value.trim();
  const goal = Number(goalInput);
  if (!name || !goalInput || !Number.isFinite(goal) || goal < 0) return showToast("Hãy nhập tên quỹ và mục tiêu hợp lệ.", "error");
  try {
    const group = await apiRequest("/groups", { method: "POST", body: JSON.stringify({ name, goal }) });
    state.groups.push(group);
    el("new-group-name").value = ""; el("new-group-goal").value = "";
    renderGroupFund(); await openSharedFund(group.group_id); showToast("Đã tạo quỹ chung!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
async function joinSharedFund(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const invite_code = el("join-group-code").value.trim().toUpperCase();
  if (!invite_code) return showToast("Hãy nhập mã mời.", "error");
  try {
    const group = await apiRequest("/groups/join", { method: "POST", body: JSON.stringify({ invite_code }) });
    state.groups = state.groups.filter((item) => item.group_id !== group.group_id).concat(group);
    el("join-group-code").value = ""; renderGroupFund(); await openSharedFund(group.group_id); showToast("Bạn đã tham gia quỹ chung!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
async function openSharedFund(groupId) {
  const user = getCurrentUser();
  try {
    const group = await apiRequest(`/groups/${groupId}`);
    state.activeGroup = group;
    const total = group.contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const goal = Number(group.goal || 0);
    const percentage = goal ? Math.min(100, total / goal * 100) : 0;
    setText("shared-fund-name", group.name); setText("shared-fund-code", `Mã mời: ${group.invite_code}`);
    setText("shared-fund-members", `${group.members.length} thành viên`);
    setText("shared-fund-total", formatVND(total)); setText("shared-fund-goal", formatVND(goal));
    setText("shared-fund-progress-label", `${percentage.toFixed(1)}% mục tiêu`);
    if (el("shared-fund-progress")) el("shared-fund-progress").style.width = percentage + "%";
    setHTML("shared-fund-actions", Number(group.owner_id) === Number(user.user_id)
      ? `<button class="btn-danger btn-small" onclick="deleteSharedFund()">Xóa quỹ</button>`
      : `<button class="btn-ghost btn-small" onclick="leaveSharedFund()">Rời quỹ</button>`);
    setHTML("shared-fund-member-list", group.members.map((member) => `<p><strong>${escHtml(member.user?.fullname || member.user?.username || "Thành viên")}</strong> <small>(${escHtml(member.role === "owner" ? "chủ quỹ" : "thành viên")})</small></p>`).join(""));
    setHTML("shared-fund-contribution-list", group.contributions.map((item) => `<div class="group-fund-contribution"><strong>${escHtml(item.user?.fullname || item.user?.username || "Thành viên")}</strong><small>${escHtml(item.note || "")} · ${escHtml(item.created_at)}</small><span>${formatVND(item.amount)} <button class="btn-icon btn-icon--danger" onclick="deleteSharedContribution(${item.contribution_id})"><i class="fas fa-trash"></i></button></span></div>`).join("") || '<div class="activity-empty">Chưa có khoản đóng góp.</div>');
    showEl("shared-fund-detail");
    if (goal > 0 && total >= goal && !state.celebratedGoals.has(group.group_id)) {
      state.celebratedGoals.add(group.group_id);
      celebrate();
      showToast(`🎉 "${group.name}" đã đạt mục tiêu!`, "success");
    }
  } catch (error) { showToast(error.message, "error"); }
}
async function leaveSharedFund() {
  if (!state.activeGroup) return;
  showConfirm("Rời quỹ chung", "Bạn sẽ không còn thấy quỹ này trong danh sách. Lịch sử đóng góp hiện tại vẫn được giữ lại.", async () => {
    try {
      const groupId = state.activeGroup.group_id;
      await apiRequest(`/groups/${groupId}/leave`, { method: "POST", body: "{}" });
      state.groups = state.groups.filter((group) => Number(group.group_id) !== Number(groupId));
      state.activeGroup = null; closeModal("confirm-modal"); renderGroupFund(); showToast("Bạn đã rời quỹ chung.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}
async function deleteSharedFund() {
  if (!state.activeGroup) return;
  showConfirm("Xóa quỹ chung", "Quỹ, thành viên và lịch sử đóng góp sẽ bị xóa vĩnh viễn.", async () => {
    try {
      const groupId = state.activeGroup.group_id;
      await apiRequest(`/groups/${groupId}`, { method: "DELETE", body: "{}" });
      state.groups = state.groups.filter((group) => Number(group.group_id) !== Number(groupId));
      state.activeGroup = null; closeModal("confirm-modal"); renderGroupFund(); showToast("Đã xóa quỹ chung.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}
async function addSharedContribution(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!state.activeGroup) return showToast("Hãy chọn một quỹ trước.", "error");
  const amount = Number(el("shared-contribution-amount").value);
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Hãy nhập số tiền hợp lệ.", "error");
  try {
    await apiRequest(`/groups/${state.activeGroup.group_id}/contributions`, { method: "POST", body: JSON.stringify({ amount, note: el("shared-contribution-note").value.trim() }) });
    el("shared-contribution-amount").value = ""; el("shared-contribution-note").value = "";
    await openSharedFund(state.activeGroup.group_id); showToast("Đã thêm khoản đóng góp!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
async function deleteSharedContribution(contributionId) {
  const user = getCurrentUser();
  if (!state.activeGroup) return;
  try {
    await apiRequest(`/groups/${state.activeGroup.group_id}/contributions/${contributionId}`, { method: "DELETE", body: "{}" });
    await openSharedFund(state.activeGroup.group_id); showToast("Đã xóa khoản đóng góp.", "info");
  } catch (error) { showToast(error.message, "error"); }
}
function populateCategoryFilter() {
  const select = el("dest-filter-cat");
  if (!select) return;
  const selected = select.value;
  const categories = [...new Set(userDestinations().map((destination) => destination.category))].sort();
  select.innerHTML = `<option value="all">Tất cả nhóm</option>${categories.map((category) => `<option value="${escHtml(category)}">${escHtml(categoryLabel(category))}</option>`).join("")}`;
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
    const actualSpent = destinationExpenses(destination.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const spendPercent = Number(destination.budget) > 0 ? Math.min((actualSpent / Number(destination.budget)) * 100, 100) : 0;
    const spendClass = actualSpent > Number(destination.budget) ? "progress-bar-fill--danger" : spendPercent >= 80 ? "progress-bar-fill--warning" : "";
    return `<tr>
       <td>${escHtml(destination.name)}</td><td><span class="badge badge--indigo">${escHtml(categoryLabel(destination.category))}</span></td>
      <td class="mono">${formatVND(destination.budget)}</td>
       <td class="destination-spend-cell"><strong class="${actualSpent > Number(destination.budget) ? "text-danger" : ""}">${formatVND(actualSpent)}</strong><div class="destination-spend-track"><span class="progress-bar-fill ${spendClass}" style="width:${spendPercent.toFixed(1)}%"></span></div><small>${spendPercent.toFixed(0)}% đã dùng</small></td>
      <td>${starsHTML(destination.priority)}</td>
       <td><span class="badge badge--${visited ? "visited" : "planned"}"><i class="fas ${visited ? "fa-check" : "fa-clock"}"></i>${visited ? "Đã ghé thăm" : "Đang lên kế hoạch"}</span></td>
      <td style="color:var(--text-muted);font-size:13px;">${source ? escHtml(source.source_name) : "—"}</td>
       <td class="text-center"><button class="btn-plan-trip" onclick="openTripView(${destination.id})">🗺️ Mở${trip.items.length ? ` (${trip.items.length})` : ""}</button></td>
       <td><div class="action-btns"><button class="btn-icon" onclick="openDestinationMap(${destination.id})" title="Xem trên bản đồ"><i class="fas fa-map"></i></button><button class="btn-icon" onclick="editDestination(${destination.id})" title="Chỉnh sửa"><i class="fas fa-pen"></i></button><button class="btn-icon btn-icon--danger" onclick="confirmDeleteDest(${destination.id})" title="Xóa"><i class="fas fa-trash"></i></button></div></td>
    </tr>`;
  }).join("");
}
function openDestModal(destination) {
  const budgets = userBudgets();
  const source = el("dest-source");
  source.innerHTML = budgets.length ? budgets.map((budget) => `<option value="${budget.source_id}">${escHtml(budget.source_name)} (${formatVND(budget.init_amount)})</option>`).join("") : '<option value="">Chưa có nguồn tiền</option>';
  if (destination) {
    setText("dest-modal-title", "Chỉnh sửa điểm đến"); el("dest-edit-id").value = destination.id;
    el("dest-name").value = destination.name; el("dest-category").value = destination.category;
    el("dest-budget").value = destination.budget; el("dest-priority").value = destination.priority;
    el("dest-status").value = destination.status; source.value = destination.source_id;
    // Load dates from this destination only. Do not reuse another row's values.
    el("dest-start-date").value = destination.start_date || "";
    el("dest-end-date").value = destination.end_date || "";
  } else {
    setText("dest-modal-title", "Thêm điểm đến"); el("dest-form").reset(); el("dest-edit-id").value = "";
    el("dest-priority").value = "3"; el("dest-status").value = "0";
    el("dest-start-date").value = "";
    el("dest-end-date").value = "";
    if (budgets.length) source.value = budgets[0].source_id;
  }
  openModal("dest-modal");
}
async function saveDestination(event) {
  event.preventDefault();
  const name = el("dest-name").value.trim(), category = el("dest-category").value.trim();
  const budget = Number(el("dest-budget").value), priority = Number(el("dest-priority").value);
  const status = Number(el("dest-status").value), sourceId = Number(el("dest-source").value);
  const startDate = el("dest-start-date")?.value || "";
  const endDate = el("dest-end-date")?.value || "";
  const editId = el("dest-edit-id").value;
  if (!name || !category || !Number.isFinite(budget) || budget < 0 || !sourceId) return showToast("Vui lòng điền đủ thông tin điểm đến.", "error");
  if (startDate && endDate && endDate < startDate) return showToast("Ngày kết thúc không thể trước ngày bắt đầu.", "error");
  const previousStatus = editId ? getDests().find((item) => item.id === Number(editId))?.status : null;
  setFormBusy("dest-form", true, "Đang lưu…");
  try {
    const result = await apiRequest(editId ? `/destinations/${editId}` : "/destinations", {
      method: editId ? "PUT" : "POST",
      body: JSON.stringify({ name, category, budget, priority, status, source_id: sourceId, start_date: startDate, end_date: endDate }),
    });
    if (editId) state.dests = state.dests.map((item) => item.id === Number(editId) ? result : item);
    else state.dests.push(result);
    if (!editId && state.lastMapSearch && String(state.lastMapSearch.name).toLowerCase() === String(result.name).toLowerCase()) {
      const storage = mapStorage();
      storage[mapKey(result)] = [state.lastMapSearch.lat, state.lastMapSearch.lng];
      saveMapStorage(storage);
      state.lastMapSearch = null;
    }
    closeModal("dest-modal"); populateCategoryFilter(); filterDestinations(); renderDashboard();
    const justCompleted = editId && Number(previousStatus) !== 1 && Number(status) === 1;
    if (justCompleted) {
      celebrate();
       showToast(`🎉 Chúc mừng bạn đã hoàn thành "${result.name}"!`, "success");
    } else {
       showToast(editId ? "Đã cập nhật điểm đến!" : "Đã thêm điểm đến!", "success");
    }
  } catch (error) { showToast(error.message, "error"); }
  finally { setFormBusy("dest-form", false); }
}
function editDestination(id) { const destination = getDests().find((item) => item.id === id); if (destination) openDestModal(destination); }
function confirmDeleteDest(id) {
  const destination = getDests().find((item) => item.id === id);
  showConfirm("Xóa điểm đến", `Bạn chắc chắn muốn xóa "${destination?.name || "điểm đến này"}"? Hành động này không thể hoàn tác.`, async () => {
    try {
      await apiRequest(`/destinations/${id}`, { method: "DELETE" });
      state.dests = state.dests.filter((item) => item.id !== id);
      state.trips = state.trips.filter((trip) => trip.dest_id !== id);
       closeModal("confirm-modal"); filterDestinations(); populateCategoryFilter(); renderDashboard(); showToast("Đã xóa điểm đến.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}

function renderBudgets() { renderBudgetCards(); renderBudgetTable(); }
function renderBudgetCards() {
  const container = el("budget-cards");
  const budgets = userBudgets();
  if (!budgets.length) { container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-wallet"></i><p>Chưa có nguồn ngân sách</p><small>Thêm một nguồn tiền để bắt đầu theo dõi</small></div>'; return; }
  container.innerHTML = budgets.map((budget) => {
    const destinations = getDests().filter((destination) => destination.source_id === budget.source_id);
    const allocated = destinations.reduce((sum, destination) => sum + Number(destination.budget || 0), 0);
    const remaining = Number(budget.init_amount) - allocated;
    const percent = Number(budget.init_amount) > 0 ? Math.min((allocated / Number(budget.init_amount)) * 100, 100) : 0;
    const fillClass = percent >= 100 ? "progress-bar-fill--danger" : percent >= 80 ? "progress-bar-fill--warning" : "";
    return `<div class="budget-source-card"><div class="budget-card-header"><div class="budget-card-title-row"><div class="budget-card-icon"><i class="fas fa-wallet"></i></div><span class="budget-card-name">${escHtml(budget.source_name)}</span></div><div class="budget-card-actions"><button class="btn-icon" onclick="editBudgetSource(${budget.source_id})"><i class="fas fa-pen"></i></button><button class="btn-icon btn-icon--danger" onclick="confirmDeleteBudget(${budget.source_id})"><i class="fas fa-trash"></i></button></div></div>
       <div class="budget-stat"><p class="budget-stat-label">Tổng số tiền</p><p class="budget-stat-value">${formatVND(budget.init_amount)}</p></div>
       <div class="budget-alloc-row"><span>Đã phân bổ</span><span>${formatVND(allocated)}</span></div><div class="progress-bar-track"><div class="progress-bar-fill ${fillClass}" style="width:${percent.toFixed(1)}%"></div></div>
       <div class="budget-remaining-row"><span class="budget-remaining-label">${percent.toFixed(1)}% đã dùng</span><span class="budget-remaining-val ${remaining < 0 ? "text-danger" : "text-success"}">${remaining >= 0 ? `${formatVND(remaining)} còn lại` : `Vượt ${formatVND(Math.abs(remaining))}`}</span></div>
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
   if (budget) { setText("budget-modal-title", "Chỉnh sửa nguồn tiền"); el("budget-edit-id").value = budget.source_id; el("budget-source-name").value = budget.source_name; el("budget-source-amount").value = budget.init_amount; }
   else { setText("budget-modal-title", "Thêm nguồn tiền"); el("budget-form").reset(); el("budget-edit-id").value = ""; }
  openModal("budget-modal");
}
async function saveBudgetSource(event) {
  event.preventDefault();
  const name = el("budget-source-name").value.trim(), amount = Number(el("budget-source-amount").value), editId = el("budget-edit-id").value;
  if (!name || !Number.isFinite(amount) || amount < 0) return showToast("Hãy nhập nguồn tiền hợp lệ.", "error");
  try {
    const result = await apiRequest(editId ? `/budgets/${editId}` : "/budgets", { method: editId ? "PUT" : "POST", body: JSON.stringify({ source_name: name, init_amount: amount, user_id: getCurrentUser().user_id }) });
    if (editId) state.budgets = state.budgets.map((item) => item.source_id === Number(editId) ? result : item);
    else state.budgets.push(result);
    closeModal("budget-modal"); renderBudgets(); renderDashboard(); showToast(editId ? "Đã cập nhật nguồn tiền!" : "Đã thêm nguồn tiền!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
function editBudgetSource(id) { const budget = getBudgets().find((item) => item.source_id === id); if (budget) openBudgetModal(budget); }
function confirmDeleteBudget(id) {
  const budget = getBudgets().find((item) => item.source_id === id);
  const count = getDests().filter((destination) => destination.source_id === id).length;
  showConfirm("Xóa nguồn tiền", `Bạn muốn xóa "${budget?.source_name || "nguồn tiền này"}"?${count ? ` ${count} điểm đến liên kết cũng sẽ bị xóa.` : ""} Hành động này không thể hoàn tác.`, async () => {
    try {
      await apiRequest(`/budgets/${id}`, { method: "DELETE" });
      state.budgets = state.budgets.filter((item) => item.source_id !== id);
      state.dests = state.dests.filter((item) => item.source_id !== id);
       closeModal("confirm-modal"); renderBudgets(); renderDashboard(); showToast("Đã xóa nguồn tiền.", "info");
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
  const username = el("settings-username").value.trim().toLowerCase(), fullname = el("settings-fullname").value.trim();
  const email = el("settings-email").value.trim(), phone = el("settings-phone").value.trim(), password = el("settings-password").value;
  if (!username || !fullname) return showToast("Tên đăng nhập và họ tên là bắt buộc.", "error");
  if (!USERNAME_PATTERN.test(username)) {
    return showToast("Tên đăng nhập phải dài 3–30 ký tự, chỉ gồm chữ không dấu và số, không có khoảng trắng.", "error");
  }
  if (password && password.length < 6) return showToast("Mật khẩu phải có ít nhất 6 ký tự.", "error");
  try {
    const result = await apiRequest("/users/me", { method: "PUT", body: JSON.stringify({ username, fullname, email, phone, ...(password ? { password } : {}) }) });
    state.currentUser = result.user;
    state.users = state.users.map((item) => item.user_id === user.user_id ? result.user : item);
    updateUserDisplay(result.user); renderSettings(); showToast("Đã lưu hồ sơ thành công!", "success");
  } catch (error) { showToast(error.message, "error"); }
}
function confirmReset() {
  showConfirm("Đặt lại dữ liệu mẫu", "Toàn bộ dữ liệu hiện tại sẽ bị xóa và khôi phục về bộ dữ liệu mẫu. Bạn chắc chắn chứ?", async () => {
    try {
      await apiRequest("/data/reset", { method: "POST", body: "{}" });
      clearSession(); state.csrfToken = null; state.users = []; state.budgets = []; state.dests = []; state.trips = []; state.expenses = [];
      closeModal("confirm-modal"); showLogin(); hideEl("app-section"); showEl("auth-section"); showToast("Đã khôi phục dữ liệu mẫu.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function confirmDeleteAccount() {
  const user = getCurrentUser();
  showConfirm("Xóa tài khoản", `Bạn muốn xóa vĩnh viễn tài khoản "${user?.username || ""}"? Toàn bộ dữ liệu liên quan sẽ bị xóa.`, async () => {
    try {
      await apiRequest("/users/me", { method: "DELETE", body: "{}" });
      state.users = state.users.filter((item) => item.user_id !== user.user_id);
      state.budgets = state.budgets.filter((item) => item.user_id !== user.user_id);
      state.expenses = [];
      clearSession(); closeModal("confirm-modal"); hideEl("app-section"); showEl("auth-section"); showLogin(); showToast("Đã xóa tài khoản.", "info");
    } catch (error) { showToast(error.message, "error"); }
  });
}

let activeTripDestId = null;
let noteSaveTimer = null;
let countdownTimer = null;
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
  if (!destination) return showToast("Không tìm thấy điểm đến.", "error");
  activeTripDestId = destId;
  document.querySelectorAll(".view").forEach((node) => { node.style.display = "none"; });
  el("view-trip").style.display = "";
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
  setText("topbar-page-title", "Trip Planner");
  renderTripHero(destination); renderTripStats(destination); renderTripCountdown(destination); renderItineraryList(); renderTripExpenses(destination); loadGeneralNote(); closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function closeTripView() { activeTripDestId = null; clearInterval(countdownTimer); resetItineraryForm(); navigateTo("destinations", document.querySelector('[data-view="destinations"]')); }
function renderTripHero(destination) {
  const visited = Number(destination.status) === 1;
  setText("trip-hero-cat", categoryLabel(destination.category)); setText("trip-hero-name", destination.name); setHTML("trip-hero-emoji", catEmoji(destination.category));
  setHTML("trip-hero-meta", `<span class="trip-hero-chip">💰 ${formatVND(destination.budget)}</span><span class="trip-hero-chip">⭐ Ưu tiên ${destination.priority}/5</span>`);
  setHTML("trip-hero-badges", `<span class="trip-status-badge trip-status-badge--${visited ? "visited" : "planned"}">${visited ? "Đã ghé thăm" : "Đang lên kế hoạch"}</span>`);
}
function renderTripStats(destination) {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId);
  const maxDay = trip.items.length ? Math.max(...trip.items.map((item) => Number(item.day))) : 0;
  const completed = trip.items.filter((item) => item.completed).length;
  setText("stat-days", maxDay || "—"); setText("stat-activities", trip.items.length); setText("stat-budget", formatVND(destination.budget)); setText("stat-status", Number(destination.status) === 1 ? "Đã ghé thăm" : `${completed}/${trip.items.length} hoàn thành`);
}
function renderTripCountdown(destination) {
  const card = el("trip-countdown");
  if (!card) return;
  clearInterval(countdownTimer);
  if (!destination.start_date) {
    card.style.display = "none";
    return;
  }
  const update = () => {
    const days = daysFromToday(destination.start_date);
    const endDays = daysFromToday(destination.end_date);
    card.style.display = "";
    if (days > 0) {
      setText("trip-countdown-value", `${days} ngày`);
      setText("trip-countdown-status", `khởi hành ${dateLabel(destination.start_date)}`);
    } else if (endDays !== null && endDays >= 0) {
      setText("trip-countdown-value", "Đang diễn ra");
      setText("trip-countdown-status", `kết thúc ${dateLabel(destination.end_date)}`);
    } else {
      setText("trip-countdown-value", "Đã kết thúc");
      setText("trip-countdown-status", `kết thúc ngày ${dateLabel(destination.end_date || destination.start_date)}`);
    }
  };
  update();
  countdownTimer = setInterval(update, 60000);
}
function resetItineraryForm() {
  el("itinerary-form")?.reset();
  el("itin-day").value = "1";
  el("itin-time").value = "08:00";
  el("itin-edit-id").value = "";
  setHTML("itin-submit-btn", '<i class="fas fa-plus-circle"></i> Thêm vào lịch trình');
  hideEl("itin-cancel-btn");
}
function addItineraryItem(event) {
  event.preventDefault();
  if (!activeTripDestId) return;
  const activity = el("itin-activity").value.trim();
  if (!activity) return showToast("Vui lòng nhập tên hoạt động.", "error");
  const trip = getTrip(activeTripDestId);
  const editId = Number(el("itin-edit-id").value);
  const payload = {
    id: editId || (trip.items.length ? Math.max(...trip.items.map((item) => Number(item.id))) + 1 : 1),
    day: Math.max(1, Number(el("itin-day").value) || 1),
    time: el("itin-time").value || "",
    activity,
    location: el("itin-location").value.trim(),
    note: el("itin-note").value.trim(),
    completed: editId ? Boolean(trip.items.find((item) => Number(item.id) === editId)?.completed) : false,
    sort_order: editId ? Number(trip.items.find((item) => Number(item.id) === editId)?.sort_order || 0) : trip.items.length,
  };
  if (editId) {
    trip.items = trip.items.map((item) => Number(item.id) === editId ? payload : item);
  } else {
    trip.items.push(payload);
  }
  saveTrip(trip);
  resetItineraryForm();
  showToast(editId ? "Đã cập nhật hoạt động!" : "Đã thêm vào lịch trình!", "success"); renderItineraryList();
  const destination = userDestinations().find((item) => item.id === activeTripDestId);
  if (destination) renderTripStats(destination);
}
function editItineraryItem(itemId) {
  const item = getTrip(activeTripDestId).items.find((entry) => Number(entry.id) === Number(itemId));
  if (!item) return;
  el("itin-edit-id").value = item.id;
  el("itin-day").value = item.day;
  el("itin-time").value = item.time || "";
  el("itin-activity").value = item.activity || "";
  el("itin-location").value = item.location || "";
  el("itin-note").value = item.note || "";
  setHTML("itin-submit-btn", '<i class="fas fa-save"></i> Lưu hoạt động');
  showEl("itin-cancel-btn");
  el("itin-activity")?.focus();
}
function cancelItineraryEdit() { resetItineraryForm(); }
function toggleItineraryComplete(itemId) {
  const trip = getTrip(activeTripDestId);
  trip.items = trip.items.map((item) => Number(item.id) === Number(itemId) ? { ...item, completed: !item.completed } : item);
  saveTrip(trip); renderItineraryList();
  const destination = userDestinations().find((item) => item.id === activeTripDestId);
  if (destination) renderTripStats(destination);
}
function moveItineraryItem(itemId, direction) {
  const trip = getTrip(activeTripDestId);
  const sorted = [...trip.items].sort((a, b) => Number(a.day) - Number(b.day) || String(a.time).localeCompare(String(b.time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const index = sorted.findIndex((item) => Number(item.id) === Number(itemId));
  const otherIndex = index + direction;
  if (index < 0 || otherIndex < 0 || otherIndex >= sorted.length) return;
  const currentOrder = Number(sorted[index].sort_order || index);
  sorted[index].sort_order = Number(sorted[otherIndex].sort_order || otherIndex);
  sorted[otherIndex].sort_order = currentOrder;
  trip.items = sorted;
  saveTrip(trip); renderItineraryList();
}
function deleteItineraryItem(itemId) {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId); trip.items = trip.items.filter((item) => item.id !== itemId); saveTrip(trip);
  renderItineraryList(); const destination = userDestinations().find((item) => item.id === activeTripDestId);
  if (destination) renderTripStats(destination); showToast("Đã xóa hoạt động.", "info");
}
function renderItineraryList() {
  if (!activeTripDestId) return;
  const trip = getTrip(activeTripDestId); const list = el("itinerary-list"); const count = el("itinerary-count");
  if (!list) return;
  const completed = trip.items.filter((item) => item.completed).length;
  setText("itinerary-count", `${completed}/${trip.items.length} hoàn thành`);
  if (!trip.items.length) {
    list.innerHTML = '<div class="itin-empty"><div class="itin-empty-icon">🗺️</div><p>Chưa có hoạt động!</p><small>Dùng biểu mẫu phía trên để tạo lịch trình</small></div>';
    return;
  }
  const groups = {};
  [...trip.items].sort((a, b) => Number(a.day) - Number(b.day) || String(a.time).localeCompare(String(b.time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0)).forEach((item) => {
    if (!groups[item.day]) groups[item.day] = []; groups[item.day].push(item);
  });
  const ordered = [...trip.items].sort((a, b) => Number(a.day) - Number(b.day) || String(a.time).localeCompare(String(b.time)) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
   list.innerHTML = Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map((day) => `<div class="itin-day-group"><div class="itin-day-label">✨ Ngày ${day}</div>${groups[day].map((item) => {
    const position = ordered.findIndex((entry) => Number(entry.id) === Number(item.id));
    return `<div class="itin-item ${item.completed ? "itin-item--completed" : ""}">
      <button class="itin-check-btn ${item.completed ? "is-complete" : ""}" onclick="toggleItineraryComplete(${item.id})" title="${item.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}"><i class="fas fa-check"></i></button>
      <div class="itin-content"><div class="itin-top"><span class="itin-activity">${escHtml(item.activity)}</span>${item.time ? `<span class="itin-time-tag">${escHtml(item.time)}</span>` : ""}</div>${item.location ? `<div class="itin-location">📍 ${escHtml(item.location)}</div>` : ""}${item.note ? `<div class="itin-quick-note">📝 ${escHtml(item.note)}</div>` : ""}</div>
      <div class="itin-actions"><button class="itin-action-btn" onclick="moveItineraryItem(${item.id},-1)" ${position === 0 ? "disabled" : ""} title="Di chuyển lên"><i class="fas fa-chevron-up"></i></button><button class="itin-action-btn" onclick="moveItineraryItem(${item.id},1)" ${position === ordered.length - 1 ? "disabled" : ""} title="Di chuyển xuống"><i class="fas fa-chevron-down"></i></button><button class="itin-action-btn" onclick="editItineraryItem(${item.id})" title="Chỉnh sửa"><i class="fas fa-pen"></i></button><button class="itin-action-btn itin-action-btn--danger" onclick="deleteItineraryItem(${item.id})" title="Xóa"><i class="fas fa-times"></i></button></div>
    </div>`;
  }).join("")}</div>`).join("");
}
function destinationExpenses(destId) {
  return state.expenses.filter((expense) => Number(expense.dest_id) === Number(destId));
}
function renderTripExpenses(destination) {
  const expenses = destinationExpenses(destination.id);
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const percent = Number(destination.budget) > 0 ? total / Number(destination.budget) * 100 : 0;
  setText("expense-total", formatVND(total));
  const progress = el("expense-progress");
  if (progress) {
    progress.innerHTML = `<div class="expense-progress-meta"><span>${percent.toFixed(0)}% ngân sách dự kiến</span><span>${formatVND(destination.budget)}</span></div><div class="progress-bar-track"><div class="progress-bar-fill ${percent >= 100 ? "progress-bar-fill--danger" : percent >= 80 ? "progress-bar-fill--warning" : ""}" style="width:${Math.min(percent, 100).toFixed(1)}%"></div></div>${percent >= 100 ? '<p class="expense-warning">⚠️ Chi tiêu thực tế đã vượt ngân sách dự kiến.</p>' : ""}`;
  }
  const list = el("expense-list");
  if (!list) return;
  list.innerHTML = expenses.length ? expenses.sort((a, b) => String(b.spent_on).localeCompare(String(a.spent_on))).map((expense) =>
    `<div class="expense-row"><div><strong>${formatVND(expense.amount)}</strong><small>${escHtml(expense.category)} · ${escHtml(expense.spent_on)}${expense.note ? ` · ${escHtml(expense.note)}` : ""}</small></div><button class="btn-icon btn-icon--danger" onclick="deleteExpense(${expense.expense_id})" title="Xóa khoản chi"><i class="fas fa-trash"></i></button></div>`
  ).join("") : '<div class="activity-empty">Chưa có khoản chi thực tế.</div>';
}
async function addExpense(event) {
  event.preventDefault();
  if (!activeTripDestId) return;
  const amount = Number(el("expense-amount").value);
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Hãy nhập số tiền chi hợp lệ.", "error");
  try {
    const expense = await apiRequest("/expenses", {
      method: "POST",
      body: JSON.stringify({
        dest_id: activeTripDestId,
        amount,
        category: el("expense-category").value.trim() || "Khác",
        note: el("expense-note").value.trim(),
        spent_on: el("expense-date").value || new Date().toISOString().slice(0, 10),
      }),
    });
    state.expenses.push(expense);
    el("expense-form").reset();
    const destination = userDestinations().find((item) => Number(item.id) === Number(activeTripDestId));
    if (destination) renderTripExpenses(destination);
    showToast("Đã thêm khoản chi.", "success");
  } catch (error) { showToast(error.message, "error"); }
}
async function deleteExpense(expenseId) {
  try {
    await apiRequest(`/expenses/${expenseId}`, { method: "DELETE", body: "{}" });
    state.expenses = state.expenses.filter((expense) => Number(expense.expense_id) !== Number(expenseId));
    const destination = userDestinations().find((item) => Number(item.id) === Number(activeTripDestId));
    if (destination) renderTripExpenses(destination);
    showToast("Đã xóa khoản chi.", "info");
  } catch (error) { showToast(error.message, "error"); }
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
  renderToday();
  el("login-form")?.addEventListener("submit", handleLogin);
  el("register-form")?.addEventListener("submit", handleRegister);
  el("confirm-action-btn")?.addEventListener("click", () => {
    if (typeof pendingConfirm === "function") { const action = pendingConfirm; pendingConfirm = null; action(); }
  });
  try {
    const session = await apiRequest("/auth/session", { skipCsrf: true });
    state.currentUser = session.user;
    state.users = [session.user];
    state.csrfToken = session.csrfToken;
    setSession(session.user.user_id);
    await loadServerData();
    checkSession();
  } catch (error) {
    showEl("auth-section"); hideEl("app-section");
    if (error.status !== 401) {
      showAuthError("login-error", `Không thể kết nối đến máy chủ: ${error.message}`);
    }
  }
});