const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  randomBytes,
  scrypt,
  timingSafeEqual,
} = require("crypto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const SESSION_COOKIE = "wt_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();

const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  budgets: path.join(DATA_DIR, "budgets.json"),
  destinations: path.join(DATA_DIR, "destinations.json"),
  trips: path.join(DATA_DIR, "trips.json"),
  groupFund: path.join(DATA_DIR, "groupFund.json"),
  groups: path.join(DATA_DIR, "groups.json"),
  groupMembers: path.join(DATA_DIR, "groupMembers.json"),
  contributions: path.join(DATA_DIR, "contributions.json"),
  expenses: path.join(DATA_DIR, "expenses.json"),
};

const DEMO_DATA = {
  users: [{
    user_id: 1,
    fullname: "Demo Student",
    username: "demo",
    email: "demo@wanderlust.vn",
    phone: "0987654321",
    password: "scrypt$a3ce49c5bc98667d4ee17b60e412b15d$c4b21cfd00081535618e63a86fdf3f2f86d94018408feab787f921fc052f3844c83f4725dc6232ac1a3bce75e23cbb4316ec2f25ae9e497ff63159efcf1cddb8",
  }],
  budgets: [
    { source_id: 1, source_name: "Part-time Job Savings", init_amount: 12000000, user_id: 1 },
    { source_id: 2, source_name: "Family Support", init_amount: 8000000, user_id: 1 },
    { source_id: 3, source_name: "Scholarship Fund", init_amount: 5000000, user_id: 1 },
  ],
  destinations: [
    { id: 1, name: "Da Lat Highlands", category: "Mountain", budget: 3500000, priority: 5, status: 1, source_id: 1, start_date: "2026-08-01", end_date: "2026-08-06" },
    { id: 2, name: "Phu Quoc Island", category: "Beach", budget: 8200000, priority: 4, status: 0, source_id: 1, start_date: "2026-09-18", end_date: "2026-09-22" },
    { id: 3, name: "Hoi An Ancient Town", category: "Culture", budget: 4800000, priority: 3, status: 1, source_id: 2, start_date: "2026-07-10", end_date: "2026-07-13" },
    { id: 4, name: "Sapa Trekking", category: "Adventure", budget: 3000000, priority: 5, status: 0, source_id: 2, start_date: "2026-10-02", end_date: "2026-10-06" },
    { id: 5, name: "Ha Giang Loop", category: "Adventure", budget: 2200000, priority: 4, status: 0, source_id: 3, start_date: "2026-11-12", end_date: "2026-11-16" },
  ],
  expenses: [
    { expense_id: 1, dest_id: 1, user_id: 1, amount: 850000, category: "Transport", note: "Coach ticket and local rides", spent_on: "2026-08-02", created_at: "2026-08-02T09:00:00.000Z" },
    { expense_id: 2, dest_id: 3, user_id: 1, amount: 620000, category: "Food", note: "Dinner and coffee", spent_on: "2026-08-05", created_at: "2026-08-05T12:00:00.000Z" },
    { expense_id: 3, dest_id: 2, user_id: 1, amount: 450000, category: "Booking", note: "Homestay deposit", spent_on: "2026-09-12", created_at: "2026-09-12T08:30:00.000Z" },
  ],
  trips: [
    {
      dest_id: 1,
      user_id: 1,
      items: [
        { id: 1, day: 1, time: "08:00", activity: "Visit the flower market", location: "Da Lat Night Market", note: "Bring cash and a camera", completed: true, sort_order: 0 },
        { id: 2, day: 1, time: "19:30", activity: "Try local street food", location: "Da Lat Night Market", note: "Book a ride back to the hotel", completed: false, sort_order: 1 },
      ],
      general_note: "Pack a light jacket and book transport in advance.",
    },
  ],
  groups: [
    { group_id: 1, name: "Da Lat Trip 2026", goal: 20000000, invite_code: "W2ZURR", owner_id: 1, created_at: "2026-08-19" },
  ],
  groupMembers: [
    { group_id: 1, user_id: 1, role: "owner", joined_at: "2026-08-19" },
  ],
  contributions: [
    { contribution_id: 1, group_id: 1, user_id: 1, amount: 5000000, note: "Initial contribution", created_at: "2026-08-19" },
  ],
};

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(express.static(PUBLIC_DIR, { index: false }));

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(type, fallback = []) {
  ensureDataDirectory();
  const filePath = FILES[type];
  if (!filePath) throw new Error(`Unknown data file: ${type}`);
  if (!fs.existsSync(filePath)) {
    if (["trips", "groupFund", "groups", "groupMembers", "contributions", "expenses"].includes(type)) {
      writeJSON(type, fallback);
      return fallback;
    }
    throw new Error(`Missing required file: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function writeJSON(type, value) {
  ensureDataDirectory();
  const filePath = FILES[type];
  if (!filePath) throw new Error(`Unknown data file: ${type}`);
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function safeUser(user) {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
}

function nextId(records, field) {
  return records.reduce((max, record) => {
    const value = Number(record[field]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0) + 1;
}

function stringValue(body, field, fallback = "") {
  if (!body || body[field] === undefined || body[field] === null) return fallback;
  return String(body[field]).trim();
}

const USERNAME_PATTERN = /^[A-Za-z0-9]{3,30}$/;

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function numberValue(body, field, fallback = 0) {
  const value = Number(body?.[field]);
  return Number.isFinite(value) ? value : fallback;
}

function safeCompare(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== "string") return Promise.resolve(false);
  if (!storedPassword.startsWith("scrypt$")) {
    // Allows a one-time migration of the original demo JSON.
    return Promise.resolve(safeCompare(password, storedPassword));
  }
  const [, salt, expectedHex] = storedPassword.split("$");
  if (!salt || !expectedHex) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    scrypt(String(password), salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(safeCompare(derivedKey.toString("hex"), expectedHex));
    });
  });
}

function cookieValue(header, name) {
  const cookies = String(header || "").split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function setCookie(res, name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || "/"}`,
    `Max-Age=${options.maxAge ?? Math.floor(SESSION_TTL_MS / 1000)}`,
    `SameSite=${options.sameSite || "Lax"}`,
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0, httpOnly: true });
}

function createSession(userId, res) {
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  sessions.set(token, {
    userId: Number(userId),
    csrfToken,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  setCookie(res, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return csrfToken;
}

function currentSession(req) {
  const token = cookieValue(req.headers.cookie, SESSION_COOKIE);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, session };
}

function requireAuth(req, res, next) {
  const active = currentSession(req);
  if (!active) return sendError(res, 401, "Please sign in to continue.");
  const user = readJSON("users").find((item) => Number(item.user_id) === active.session.userId);
  if (!user) {
    sessions.delete(active.token);
    clearCookie(res, SESSION_COOKIE);
    return sendError(res, 401, "Your account is no longer available.");
  }
  req.auth = active;
  req.user = user;
  return next();
}

function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const supplied = req.get("X-CSRF-Token");
  if (!supplied || !safeCompare(supplied, req.auth.session.csrfToken)) {
    return sendError(res, 403, "Invalid security token. Refresh and try again.");
  }
  return next();
}

function isPublicPath(req) {
  return req.path === "/" ||
    req.path === "/health" ||
    req.path === "/auth/login" ||
    req.path === "/auth/register" ||
    req.path === "/auth/session" ||
    req.path === "/map/geocode";
}

// Every API route except login, registration, session discovery, and health is protected.
app.use((req, res, next) => {
  if (isPublicPath(req)) return next();
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    return requireCsrf(req, res, next);
  });
});

app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/health", (_req, res) => res.json({ ok: true, storage: "data" }));

app.get("/map/geocode", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return sendError(res, 400, "A place name is required.");
  if (query.length > 120) return sendError(res, 400, "The place name is too long.");
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("accept-language", "vi");
    url.searchParams.set("countrycodes", "vn");
    url.searchParams.set("q", query);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WanderlustTracker/1.0 (travel planning app)",
      },
    });
    if (!response.ok) return sendError(res, 502, "The map search service is unavailable.");
    const results = await response.json();
    return res.json(Array.isArray(results) ? results : []);
  } catch (error) {
    console.error("Map geocoding failed:", error.message);
    return sendError(res, 502, "The map search service is unavailable.");
  }
});

app.get("/auth/session", (req, res) => {
  const active = currentSession(req);
  if (!active) return sendError(res, 401, "No active session.");
  const user = readJSON("users").find((item) => Number(item.user_id) === active.session.userId);
  if (!user) return sendError(res, 401, "No active session.");
  return res.json({ user: safeUser(user), csrfToken: active.session.csrfToken });
});

app.post("/auth/login", async (req, res) => {
  const identifier = stringValue(req.body, "usernameOrEmail");
  const normalizedIdentifier = identifier.toLowerCase();
  const password = String(req.body?.password || "");
  const users = readJSON("users");
  const index = users.findIndex((item) =>
    normalizeUsername(item.username) === normalizedIdentifier ||
    String(item.email || "").toLowerCase() === normalizedIdentifier);
  const user = index >= 0 ? users[index] : null;
  if (!user || !(await verifyPassword(password, user.password))) {
    return sendError(res, 401, "Invalid username/email or password.");
  }
  if (!String(user.password).startsWith("scrypt$")) {
    users[index].password = await hashPassword(password);
    writeJSON("users", users);
  }
  const csrfToken = createSession(user.user_id, res);
  return res.json({ user: safeUser(users[index]), csrfToken });
});

app.post("/auth/register", async (req, res) => {
  const users = readJSON("users");
  const username = normalizeUsername(req.body?.username);
  const fullname = stringValue(req.body, "fullname");
  const email = stringValue(req.body, "email").toLowerCase();
  const phone = stringValue(req.body, "phone");
  const password = String(req.body?.password || "");
  if (!username || !fullname || !email || !phone || !password) {
    return sendError(res, 400, "All registration fields are required.");
  }
  if (!USERNAME_PATTERN.test(username)) {
    return sendError(res, 400, "Username must be 3-30 characters using only unaccented letters and numbers, without spaces.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, "Please enter a valid email address.");
  }
  if (password.length < 6) return sendError(res, 400, "Password must be at least 6 characters.");
  if (users.some((user) => normalizeUsername(user.username) === username)) {
    return sendError(res, 409, "That username is already in use.");
  }
  if (users.some((user) => String(user.email).toLowerCase() === email)) {
    return sendError(res, 409, "An account with this email already exists.");
  }
  const userId = nextId(users, "user_id");
  const newUser = {
    user_id: userId,
    fullname,
    username,
    email,
    phone,
    password: await hashPassword(password),
  };
  users.push(newUser);
  writeJSON("users", users);
  const budgets = readJSON("budgets");
  budgets.push({
    source_id: nextId(budgets, "source_id"),
    source_name: "My Savings",
    init_amount: 5000000,
    user_id: userId,
  });
  writeJSON("budgets", budgets);
  const csrfToken = createSession(userId, res);
  return res.status(201).json({ user: safeUser(newUser), csrfToken });
});

app.post("/auth/logout", (req, res) => {
  sessions.delete(req.auth.token);
  clearCookie(res, SESSION_COOKIE);
  return res.json({ message: "Signed out." });
});

function userBudgetIds(userId) {
  return new Set(readJSON("budgets")
    .filter((budget) => Number(budget.user_id) === Number(userId))
    .map((budget) => Number(budget.source_id)));
}

function userDestinations(userId) {
  const sourceIds = userBudgetIds(userId);
  return readJSON("destinations").filter((destination) => sourceIds.has(Number(destination.source_id)));
}

function ownsBudget(userId, sourceId) {
  return userBudgetIds(userId).has(Number(sourceId));
}

function ownsDestination(userId, destination) {
  return Boolean(destination) && ownsBudget(userId, destination.source_id);
}

function validateDestination(body, existing = {}) {
  const startDate = stringValue(body, "start_date", existing.start_date || "");
  const endDate = stringValue(body, "end_date", existing.end_date || "");
  const destination = {
    name: stringValue(body, "name", existing.name),
    category: stringValue(body, "category", existing.category),
    budget: numberValue(body, "budget", existing.budget ?? 0),
    priority: Math.round(numberValue(body, "priority", existing.priority ?? 3)),
    status: Math.round(numberValue(body, "status", existing.status ?? 0)),
    source_id: Math.round(numberValue(body, "source_id", existing.source_id ?? 0)),
    start_date: startDate,
    end_date: endDate,
  };
  if (!destination.name) return { error: "Destination name is required." };
  if (!destination.category) return { error: "Destination category is required." };
  if (destination.budget < 0) return { error: "Destination budget cannot be negative." };
  if (destination.priority < 1 || destination.priority > 5) return { error: "Priority must be between 1 and 5." };
  if (![0, 1].includes(destination.status)) return { error: "Status must be 0 (planned) or 1 (visited)." };
  if (!destination.source_id) return { error: "A budget source is required." };
  if ((startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
    return { error: "Dates must use the YYYY-MM-DD format." };
  }
  if (startDate && endDate && endDate < startDate) return { error: "End date cannot be before start date." };
  return { value: destination };
}

function validateBudget(body, existing = {}) {
  const budget = {
    source_name: stringValue(body, "source_name", stringValue(body, "sourceName", existing.source_name)),
    init_amount: numberValue(body, "init_amount", numberValue(body, "amount", existing.init_amount ?? 0)),
  };
  if (!budget.source_name) return { error: "Budget source name is required." };
  if (budget.init_amount < 0) return { error: "Budget amount cannot be negative." };
  return { value: budget };
}

app.get("/users/me", (req, res) => res.json(safeUser(req.user)));

app.put("/users/me", async (req, res) => {
  const users = readJSON("users");
  const index = users.findIndex((user) => Number(user.user_id) === Number(req.user.user_id));
  const current = users[index];
  const username = normalizeUsername(stringValue(req.body, "username", current.username));
  const fullname = stringValue(req.body, "fullname", current.fullname);
  const email = stringValue(req.body, "email", current.email).toLowerCase();
  const phone = stringValue(req.body, "phone", current.phone);
  const password = req.body?.password ? String(req.body.password) : "";
  if (!username || !fullname || !email) return sendError(res, 400, "Username, name, and email are required.");
  if (!USERNAME_PATTERN.test(username)) {
    return sendError(res, 400, "Username must be 3-30 characters using only unaccented letters and numbers, without spaces.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, "Please enter a valid email address.");
  if (password && password.length < 6) return sendError(res, 400, "Password must be at least 6 characters.");
  if (users.some((user) => user.user_id !== current.user_id &&
      (normalizeUsername(user.username) === username || String(user.email).toLowerCase() === email))) {
    return sendError(res, 409, "That username or email is already in use.");
  }
  users[index] = {
    ...current,
    username,
    fullname,
    email,
    phone,
    ...(password ? { password: await hashPassword(password) } : {}),
  };
  writeJSON("users", users);
  return res.json({ user: safeUser(users[index]) });
});

app.delete("/users/me", (req, res) => {
  const userId = Number(req.user.user_id);
  const budgets = readJSON("budgets");
  const sourceIds = new Set(budgets.filter((item) => Number(item.user_id) === userId).map((item) => Number(item.source_id)));
  const destinationIds = new Set(readJSON("destinations")
    .filter((item) => sourceIds.has(Number(item.source_id)))
    .map((item) => Number(item.id)));
  const ownedGroups = new Set(readJSON("groups")
    .filter((group) => Number(group.owner_id) === userId)
    .map((group) => Number(group.group_id)));
  writeJSON("users", readJSON("users").filter((user) => Number(user.user_id) !== userId));
  writeJSON("budgets", budgets.filter((item) => Number(item.user_id) !== userId));
  writeJSON("destinations", readJSON("destinations").filter((item) => !sourceIds.has(Number(item.source_id))));
  writeJSON("trips", readJSON("trips").filter((trip) => Number(trip.user_id) !== userId && !destinationIds.has(Number(trip.dest_id))));
  writeJSON("expenses", readJSON("expenses").filter((expense) => Number(expense.user_id) !== userId && !destinationIds.has(Number(expense.dest_id))));
  writeJSON("groupFund", readJSON("groupFund").filter((fund) => Number(fund.user_id) !== userId));
  writeJSON("groups", readJSON("groups").filter((group) => !ownedGroups.has(Number(group.group_id))));
  writeJSON("groupMembers", readJSON("groupMembers").filter((member) =>
    Number(member.user_id) !== userId && !ownedGroups.has(Number(member.group_id))));
  writeJSON("contributions", readJSON("contributions").filter((item) =>
    Number(item.user_id) !== userId && !ownedGroups.has(Number(item.group_id))));
  sessions.delete(req.auth.token);
  clearCookie(res, SESSION_COOKIE);
  return res.json({ message: "Account deleted." });
});

app.get("/destinations", (req, res) => res.json(userDestinations(req.user.user_id)));

app.get("/destinations/:id", (req, res) => {
  const destination = userDestinations(req.user.user_id)
    .find((item) => Number(item.id) === Number(req.params.id));
  return destination ? res.json(destination) : sendError(res, 404, "Destination not found.");
});

app.post("/destinations", (req, res) => {
  const validation = validateDestination(req.body);
  if (validation.error) return sendError(res, 400, validation.error);
  if (!ownsBudget(req.user.user_id, validation.value.source_id)) {
    return sendError(res, 403, "You cannot use that budget source.");
  }
  const destinations = readJSON("destinations");
  const destination = { id: nextId(destinations, "id"), ...validation.value };
  destinations.push(destination);
  writeJSON("destinations", destinations);
  return res.status(201).json(destination);
});

app.put("/destinations/:id", (req, res) => {
  const destinations = readJSON("destinations");
  const index = destinations.findIndex((item) => Number(item.id) === Number(req.params.id));
  if (index < 0 || !ownsDestination(req.user.user_id, destinations[index])) {
    return sendError(res, 404, "Destination not found.");
  }
  const validation = validateDestination(req.body, destinations[index]);
  if (validation.error) return sendError(res, 400, validation.error);
  if (!ownsBudget(req.user.user_id, validation.value.source_id)) {
    return sendError(res, 403, "You cannot use that budget source.");
  }
  destinations[index] = { ...destinations[index], ...validation.value };
  writeJSON("destinations", destinations);
  return res.json(destinations[index]);
});

app.delete("/destinations/:id", (req, res) => {
  const destinationId = Number(req.params.id);
  const destinations = readJSON("destinations");
  const destination = destinations.find((item) => Number(item.id) === destinationId);
  if (!ownsDestination(req.user.user_id, destination)) return sendError(res, 404, "Destination not found.");
  writeJSON("destinations", destinations.filter((item) => Number(item.id) !== destinationId));
  writeJSON("trips", readJSON("trips").filter((trip) => Number(trip.dest_id) !== destinationId));
  writeJSON("expenses", readJSON("expenses").filter((expense) => Number(expense.dest_id) !== destinationId));
  return res.json({ message: "Destination deleted." });
});

function ownedDestinationForRequest(userId, destinationId) {
  return userDestinations(userId).find((item) => Number(item.id) === Number(destinationId));
}

app.get("/expenses", (req, res) => {
  const destinationId = req.query.dest_id ? Number(req.query.dest_id) : null;
  const ownedIds = new Set(userDestinations(req.user.user_id).map((item) => Number(item.id)));
  const expenses = readJSON("expenses").filter((expense) =>
    Number(expense.user_id) === Number(req.user.user_id) &&
    ownedIds.has(Number(expense.dest_id)) &&
    (!destinationId || Number(expense.dest_id) === destinationId));
  return res.json(expenses);
});

app.post("/expenses", (req, res) => {
  const destinationId = Math.round(Number(req.body?.dest_id));
  if (!ownedDestinationForRequest(req.user.user_id, destinationId)) {
    return sendError(res, 404, "Destination not found.");
  }
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return sendError(res, 400, "Expense amount must be greater than zero.");
  }
  const spentOn = stringValue(req.body, "spent_on", new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return sendError(res, 400, "Expense date must use the YYYY-MM-DD format.");
  }
  const expenses = readJSON("expenses");
  const expense = {
    expense_id: nextId(expenses, "expense_id"),
    dest_id: destinationId,
    user_id: Number(req.user.user_id),
    amount,
    category: stringValue(req.body, "category", "Other"),
    note: stringValue(req.body, "note"),
    spent_on: spentOn,
    created_at: new Date().toISOString(),
  };
  expenses.push(expense);
  writeJSON("expenses", expenses);
  return res.status(201).json(expense);
});

app.delete("/expenses/:id", (req, res) => {
  const expenseId = Number(req.params.id);
  const expenses = readJSON("expenses");
  const expense = expenses.find((item) =>
    Number(item.expense_id) === expenseId &&
    Number(item.user_id) === Number(req.user.user_id));
  if (!expense) return sendError(res, 404, "Expense not found.");
  writeJSON("expenses", expenses.filter((item) => Number(item.expense_id) !== expenseId));
  return res.json({ message: "Expense deleted." });
});

app.get("/budgets", (req, res) => {
  res.json(readJSON("budgets").filter((budget) => Number(budget.user_id) === Number(req.user.user_id)));
});

app.post("/budgets", (req, res) => {
  const validation = validateBudget(req.body);
  if (validation.error) return sendError(res, 400, validation.error);
  const budgets = readJSON("budgets");
  const budget = { source_id: nextId(budgets, "source_id"), user_id: req.user.user_id, ...validation.value };
  budgets.push(budget);
  writeJSON("budgets", budgets);
  return res.status(201).json(budget);
});

app.put("/budgets/:id", (req, res) => {
  const budgets = readJSON("budgets");
  const index = budgets.findIndex((item) =>
    Number(item.source_id) === Number(req.params.id) &&
    Number(item.user_id) === Number(req.user.user_id));
  if (index < 0) return sendError(res, 404, "Budget source not found.");
  const validation = validateBudget(req.body, budgets[index]);
  if (validation.error) return sendError(res, 400, validation.error);
  budgets[index] = { ...budgets[index], ...validation.value };
  writeJSON("budgets", budgets);
  return res.json(budgets[index]);
});

app.delete("/budgets/:id", (req, res) => {
  const sourceId = Number(req.params.id);
  const budgets = readJSON("budgets");
  const owns = budgets.some((item) => Number(item.source_id) === sourceId &&
    Number(item.user_id) === Number(req.user.user_id));
  if (!owns) return sendError(res, 404, "Budget source not found.");
  const destinations = readJSON("destinations");
  const destinationIds = new Set(destinations
    .filter((item) => Number(item.source_id) === sourceId)
    .map((item) => Number(item.id)));
  writeJSON("budgets", budgets.filter((item) => Number(item.source_id) !== sourceId));
  writeJSON("destinations", destinations.filter((item) => Number(item.source_id) !== sourceId));
  writeJSON("trips", readJSON("trips").filter((trip) => !destinationIds.has(Number(trip.dest_id))));
  writeJSON("expenses", readJSON("expenses").filter((expense) => !destinationIds.has(Number(expense.dest_id))));
  return res.json({ message: "Budget source deleted." });
});

function validateTrip(body, userId) {
  const destId = Math.round(Number(body?.dest_id));
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!destId || !userDestinations(userId).some((destination) => Number(destination.id) === destId)) {
    return { error: "A destination owned by your account is required." };
  }
  if (!items.every((item) => item && Number(item.day) >= 1 && String(item.activity || "").trim())) {
    return { error: "Each itinerary item needs a day and activity." };
  }
  return {
    value: {
      dest_id: destId,
      user_id: Number(userId),
      items: items.map((item, index) => ({
        id: Number.isFinite(Number(item.id)) ? Math.round(Number(item.id)) : index + 1,
        day: Math.max(1, Math.round(Number(item.day))),
        time: String(item.time || ""),
        activity: String(item.activity).trim(),
        location: String(item.location || "").trim(),
        note: String(item.note || "").trim(),
        completed: item.completed === true || item.completed === 1 || item.completed === "true",
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      })),
      general_note: typeof body.general_note === "string" ? body.general_note : "",
    },
  };
}

app.get("/trips", (req, res) => {
  res.json(readJSON("trips").filter((trip) => Number(trip.user_id) === Number(req.user.user_id)));
});

app.put("/trips", (req, res) => {
  const allTrips = readJSON("trips");
  const existing = allTrips.filter((trip) => Number(trip.user_id) !== Number(req.user.user_id));
  const input = Array.isArray(req.body) ? req.body : [req.body];
  const updated = [];
  for (const item of input) {
    const validation = validateTrip(item, req.user.user_id);
    if (validation.error) return sendError(res, 400, validation.error);
    updated.push(validation.value);
  }
  const result = [...existing, ...updated];
  writeJSON("trips", result);
  return res.json(Array.isArray(req.body) ? updated : updated[0]);
});

function makeInviteCode(groups) {
  let code = "";
  do code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  while (groups.some((group) => group.invite_code === code));
  return code;
}

function isGroupMember(groupId, userId) {
  return readJSON("groupMembers").some((member) =>
    Number(member.group_id) === Number(groupId) && Number(member.user_id) === Number(userId));
}

app.get("/group-fund", (req, res) => {
  res.json(readJSON("groupFund").filter((fund) => Number(fund.user_id) === Number(req.user.user_id)));
});

app.put("/group-fund", (req, res) => {
  const funds = readJSON("groupFund");
  const index = funds.findIndex((fund) => Number(fund.user_id) === Number(req.user.user_id));
  const fund = {
    fund_id: index >= 0 ? funds[index].fund_id : Date.now(),
    user_id: Number(req.user.user_id),
    goal: Math.max(0, Number(req.body?.goal || 0)),
    contributions: Array.isArray(req.body?.contributions) ? req.body.contributions : [],
  };
  if (index >= 0) funds[index] = fund; else funds.push(fund);
  writeJSON("groupFund", funds);
  return res.json(fund);
});

app.get("/groups", (req, res) => {
  const memberships = readJSON("groupMembers").filter((member) =>
    Number(member.user_id) === Number(req.user.user_id));
  const allMembers = readJSON("groupMembers");
  return res.json(readJSON("groups")
    .filter((group) => memberships.some((member) => Number(member.group_id) === Number(group.group_id)))
    .map((group) => ({
      ...group,
      member_count: allMembers.filter((member) => Number(member.group_id) === Number(group.group_id)).length,
    })));
});

app.post("/groups", (req, res) => {
  const groups = readJSON("groups");
  const members = readJSON("groupMembers");
  const name = stringValue(req.body, "name");
  const goal = Number(req.body?.goal);
  if (!name) return sendError(res, 400, "Fund name is required.");
  if (!Number.isFinite(goal) || goal < 0) return sendError(res, 400, "A valid, non-negative goal is required.");
  const group = {
    group_id: nextId(groups, "group_id"),
    name,
    goal,
    invite_code: makeInviteCode(groups),
    owner_id: Number(req.user.user_id),
    created_at: new Date().toISOString().slice(0, 10),
  };
  groups.push(group);
  members.push({ group_id: group.group_id, user_id: Number(req.user.user_id), role: "owner", joined_at: group.created_at });
  writeJSON("groups", groups);
  writeJSON("groupMembers", members);
  return res.status(201).json({ ...group, member_count: 1 });
});

app.post("/groups/join", (req, res) => {
  const code = stringValue(req.body, "invite_code").toUpperCase();
  const groups = readJSON("groups");
  const group = groups.find((item) => item.invite_code === code);
  if (!group) return sendError(res, 404, "Invalid invite code.");
  if (isGroupMember(group.group_id, req.user.user_id)) return sendError(res, 409, "You are already a member of this fund.");
  const members = readJSON("groupMembers");
  members.push({
    group_id: group.group_id,
    user_id: Number(req.user.user_id),
    role: "member",
    joined_at: new Date().toISOString().slice(0, 10),
  });
  writeJSON("groupMembers", members);
  return res.json({ ...group, member_count: members.filter((m) => Number(m.group_id) === Number(group.group_id)).length });
});

app.get("/groups/:id", (req, res) => {
  const groupId = Number(req.params.id);
  if (!isGroupMember(groupId, req.user.user_id)) return sendError(res, 403, "You are not a member of this fund.");
  const group = readJSON("groups").find((item) => Number(item.group_id) === groupId);
  if (!group) return sendError(res, 404, "Fund not found.");
  const users = readJSON("users");
  const members = readJSON("groupMembers").filter((member) => Number(member.group_id) === groupId)
    .map((member) => ({ ...member, user: safeUser(users.find((user) => Number(user.user_id) === Number(member.user_id))) }));
  const contributions = readJSON("contributions").filter((item) => Number(item.group_id) === groupId)
    .map((item) => ({ ...item, user: safeUser(users.find((user) => Number(user.user_id) === Number(item.user_id))) }));
  return res.json({ ...group, members, contributions });
});

app.post("/groups/:id/leave", (req, res) => {
  const groupId = Number(req.params.id);
  const groups = readJSON("groups");
  const group = groups.find((item) => Number(item.group_id) === groupId);
  if (!group || !isGroupMember(groupId, req.user.user_id)) {
    return sendError(res, 404, "Fund not found.");
  }
  if (Number(group.owner_id) === Number(req.user.user_id)) {
    return sendError(res, 400, "The owner must delete the fund instead of leaving it.");
  }
  writeJSON("groupMembers", readJSON("groupMembers").filter((member) =>
    !(Number(member.group_id) === groupId && Number(member.user_id) === Number(req.user.user_id))));
  return res.json({ message: "You left the shared fund." });
});

app.delete("/groups/:id", (req, res) => {
  const groupId = Number(req.params.id);
  const groups = readJSON("groups");
  const group = groups.find((item) => Number(item.group_id) === groupId);
  if (!group) return sendError(res, 404, "Fund not found.");
  if (Number(group.owner_id) !== Number(req.user.user_id)) {
    return sendError(res, 403, "Only the fund owner can delete it.");
  }
  writeJSON("groups", groups.filter((item) => Number(item.group_id) !== groupId));
  writeJSON("groupMembers", readJSON("groupMembers").filter((member) => Number(member.group_id) !== groupId));
  writeJSON("contributions", readJSON("contributions").filter((item) => Number(item.group_id) !== groupId));
  return res.json({ message: "Shared fund deleted." });
});

app.post("/groups/:id/contributions", (req, res) => {
  const groupId = Number(req.params.id);
  if (!isGroupMember(groupId, req.user.user_id)) return sendError(res, 403, "You are not a member of this fund.");
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(res, 400, "Contribution must be greater than zero.");
  const contributions = readJSON("contributions");
  const contribution = {
    contribution_id: nextId(contributions, "contribution_id"),
    group_id: groupId,
    user_id: Number(req.user.user_id),
    amount,
    note: stringValue(req.body, "note"),
    created_at: new Date().toISOString().slice(0, 10),
  };
  contributions.push(contribution);
  writeJSON("contributions", contributions);
  return res.status(201).json(contribution);
});

app.delete("/groups/:groupId/contributions/:id", (req, res) => {
  const groupId = Number(req.params.groupId);
  const contributionId = Number(req.params.id);
  if (!isGroupMember(groupId, req.user.user_id)) return sendError(res, 403, "You are not a member of this fund.");
  const contributions = readJSON("contributions");
  const contribution = contributions.find((item) =>
    Number(item.contribution_id) === contributionId && Number(item.group_id) === groupId);
  const group = readJSON("groups").find((item) => Number(item.group_id) === groupId);
  if (!contribution || !group) return sendError(res, 404, "Contribution not found.");
  if (Number(contribution.user_id) !== Number(req.user.user_id) &&
      Number(group.owner_id) !== Number(req.user.user_id)) {
    return sendError(res, 403, "You cannot delete this contribution.");
  }
  writeJSON("contributions", contributions.filter((item) => Number(item.contribution_id) !== contributionId));
  return res.json({ message: "Contribution deleted." });
});

app.post("/data/reset", (_req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_RESET !== "true") {
    return sendError(res, 403, "Demo reset is disabled in production.");
  }
  for (const type of ["users", "budgets", "destinations", "trips", "groupFund", "groups", "groupMembers", "contributions", "expenses"]) {
    writeJSON(type, DEMO_DATA[type] || []);
  }
  for (const token of sessions.keys()) sessions.delete(token);
  clearCookie(res, SESSION_COOKIE);
  return res.json({ message: "Demo data restored." });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  return sendError(res, 500, "The server could not complete that request.");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Wanderlust Tracker is running at http://localhost:${PORT}`);
    console.log(`JSON data directory: ${DATA_DIR}`);
  });
}

module.exports = app;