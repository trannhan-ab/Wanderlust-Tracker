
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