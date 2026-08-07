const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  budgets: path.join(DATA_DIR, "budgets.json"),
  destinations: path.join(DATA_DIR, "destinations.json"),
  // Created only when the itinerary feature first saves data.
  trips: path.join(DATA_DIR, "trips.json"),
};

const DEMO_DATA = {
  users: [
    {
      user_id: 1,
      fullname: "Demo Student",
      username: "demo",
      email: "demo@wanderlust.vn",
      phone: "0987654321",
      password: "123456789",
    },
  ],
  budgets: [
    {
      source_id: 1,
      source_name: "Part-time Job Savings",
      init_amount: 12000000,
      user_id: 1,
    },
    {
      source_id: 2,
      source_name: "Family Support",
      init_amount: 8000000,
      user_id: 1,
    },
    {
      source_id: 3,
      source_name: "Scholarship Fund",
      init_amount: 5000000,
      user_id: 1,
    },
  ],
  destinations: [
    {
      id: 1,
      name: "Da Lat Highlands",
      category: "Mountain",
      budget: 3500000,
      priority: 5,
      status: 1,
      source_id: 1,
    },
    {
      id: 2,
      name: "Phu Quoc Island",
      category: "Beach",
      budget: 8200000,
      priority: 4,
      status: 0,
      source_id: 1,
    },
    {
      id: 3,
      name: "Hoi An Ancient Town",
      category: "Culture",
      budget: 4800000,
      priority: 3,
      status: 1,
      source_id: 2,
    },
    {
      id: 4,
      name: "Sapa Trekking",
      category: "Adventure",
      budget: 3000000,
      priority: 5,
      status: 0,
      source_id: 2,
    },
    {
      id: 5,
      name: "Ha Giang Loop",
      category: "Adventure",
      budget: 2200000,
      priority: 4,
      status: 0,
      source_id: 3,
    },
  ],
};

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(type, fallback = []) {
  ensureDataDirectory();
  const filePath = FILES[type];

  if (!filePath) {
    throw new Error(`Unknown data file: ${type}`);
  }

  if (!fs.existsSync(filePath)) {
    if (type === "trips") {
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

  if (!filePath) {
    throw new Error(`Unknown data file: ${type}`);
  }

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
  return (
    records.reduce((maximum, record) => {
      const value = Number(record[field]);
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, 0) + 1
  );
}

function stringValue(body, field, fallback = "") {
  if (body[field] === undefined || body[field] === null) {
    return fallback;
  }
  return String(body[field]).trim();
}

function numberValue(body, field, fallback = 0) {
  const value = Number(body[field]);
  return Number.isFinite(value) ? value : fallback;
}

function validateDestination(body, existing = {}) {
  const destination = {
    name: stringValue(body, "name", existing.name),
    category: stringValue(body, "category", existing.category),
    budget: numberValue(body, "budget", existing.budget ?? 0),
    priority: Math.round(numberValue(body, "priority", existing.priority ?? 3)),
    status: Math.round(numberValue(body, "status", existing.status ?? 0)),
    source_id: Math.round(
      numberValue(body, "source_id", existing.source_id ?? 0),
    ),
  };

  if (!destination.name) {
    return { error: "Destination name is required." };
  }
  if (!destination.category) {
    return { error: "Destination category is required." };
  }
  if (destination.budget < 0) {
    return { error: "Destination budget cannot be negative." };
  }
  if (destination.priority < 1 || destination.priority > 5) {
    return { error: "Priority must be between 1 and 5." };
  }
  if (![0, 1].includes(destination.status)) {
    return { error: "Status must be 0 (planned) or 1 (visited)." };
  }
  if (!destination.source_id) {
    return { error: "A budget source is required." };
  }

  return { value: destination };
}

function validateBudget(body, existing = {}) {
  const budget = {
    source_name: stringValue(
      body,
      "source_name",
      stringValue(body, "sourceName", existing.source_name),
    ),
    init_amount: numberValue(
      body,
      "init_amount",
      numberValue(body, "amount", existing.init_amount ?? 0),
    ),
  };

  if (!budget.source_name) {
    return { error: "Budget source name is required." };
  }
  if (budget.init_amount < 0) {
    return { error: "Budget amount cannot be negative." };
  }

  return { value: budget };
}

function validateTrip(body, existing = {}) {
  const destId = Math.round(Number(body.dest_id ?? existing.dest_id));
  const userId = Math.round(Number(body.user_id ?? existing.user_id));
  const items = Array.isArray(body.items) ? body.items : existing.items || [];
  const generalNote =
    typeof body.general_note === "string"
      ? body.general_note
      : existing.general_note || "";

  if (!destId || !userId) {
    return { error: "A destination and user are required." };
  }

  if (
    !items.every(
      (item) =>
        item &&
        Number(item.day) >= 1 &&
        String(item.activity || "").trim(),
    )
  ) {
    return { error: "Each itinerary item needs a day and activity." };
  }

  return {
    value: {
      dest_id: destId,
      user_id: userId,
      items: items.map((item) => ({
        id: Math.round(Number(item.id)),
        day: Math.max(1, Math.round(Number(item.day))),
        time: String(item.time || ""),
        activity: String(item.activity).trim(),
        location: String(item.location || "").trim(),
        note: String(item.note || "").trim(),
      })),
      general_note: generalNote,
    },
  };
}

function resetDemoData() {
  for (const type of ["users", "budgets", "destinations"]) {
    writeJSON(type, DEMO_DATA[type]);
  }

  writeJSON("trips", []);
}

// The existing public/index.html is served unchanged.
app.get("/", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, storage: "data" });
});

// Authentication
app.post("/auth/login", (req, res) => {
  const identifier = stringValue(req.body, "usernameOrEmail");
  const password = String(req.body.password || "");
  const user = readJSON("users").find(
    (item) =>
      (item.username === identifier || item.email === identifier) &&
      item.password === password,
  );

  if (!user) {
    return sendError(res, 401, "Invalid username/email or password.");
  }

  return res.json({ user: safeUser(user) });
});

app.post("/auth/register", (req, res) => {
  const users = readJSON("users");
  const fullname = stringValue(req.body, "fullname");
  const email = stringValue(req.body, "email").toLowerCase();
  const phone = stringValue(req.body, "phone");
  const password = String(req.body.password || "");

  if (!fullname || !email || !phone || !password) {
    return sendError(res, 400, "All registration fields are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, "Please enter a valid email address.");
  }
  if (password.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters.");
  }
  if (users.some((user) => user.email.toLowerCase() === email)) {
    return sendError(res, 409, "An account with this email already exists.");
  }

  const userId = nextId(users, "user_id");
  const baseUsername =
    fullname.toLowerCase().replace(/\s+/g, "") || "traveler";
  const newUser = {
    user_id: userId,
    fullname,
    username: `${baseUsername}${userId}`,
    email,
    phone,
    password,
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

  return res.status(201).json({ user: safeUser(newUser) });
});

app.get("/users", (_req, res) => {
  res.json(readJSON("users").map(safeUser));
});

app.put("/users/:id", (req, res) => {
  const users = readJSON("users");
  const userId = Number(req.params.id);
  const index = users.findIndex((user) => user.user_id === userId);

  if (index < 0) {
    return sendError(res, 404, "User not found.");
  }

  const current = users[index];
  const username = stringValue(req.body, "username", current.username);
  const fullname = stringValue(req.body, "fullname", current.fullname);
  const email = stringValue(req.body, "email", current.email).toLowerCase();
  const phone = stringValue(req.body, "phone", current.phone);
  const password = stringValue(req.body, "password", current.password);

  if (!username || !fullname || !email) {
    return sendError(res, 400, "Username, name, and email are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, "Please enter a valid email address.");
  }
  if (password.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters.");
  }
  if (
    users.some(
      (user) =>
        user.user_id !== userId &&
        (user.username === username || user.email === email),
    )
  ) {
    return sendError(res, 409, "That username or email is already in use.");
  }

  users[index] = {
    ...current,
    username,
    fullname,
    email,
    phone,
    password,
  };
  writeJSON("users", users);

  return res.json({ user: safeUser(users[index]) });
});

app.delete("/users/:id", (req, res) => {
  const userId = Number(req.params.id);
  const users = readJSON("users");

  if (!users.some((user) => user.user_id === userId)) {
    return sendError(res, 404, "User not found.");
  }

  const allBudgets = readJSON("budgets");
  const userBudgetIds = new Set(
    allBudgets
      .filter((budget) => budget.user_id === userId)
      .map((budget) => budget.source_id),
  );

  writeJSON(
    "users",
    users.filter((user) => user.user_id !== userId),
  );
  writeJSON(
    "budgets",
    allBudgets.filter((budget) => budget.user_id !== userId),
  );
  writeJSON(
    "destinations",
    readJSON("destinations").filter(
      (destination) => !userBudgetIds.has(destination.source_id),
    ),
  );
  writeJSON(
    "trips",
    readJSON("trips").filter((trip) => trip.user_id !== userId),
  );

  return res.json({ message: "Account deleted." });
});

// Destinations
app.get("/destinations", (_req, res) => {
  res.json(readJSON("destinations"));
});

app.get("/destinations/:id", (req, res) => {
  const destination = readJSON("destinations").find(
    (item) => item.id === Number(req.params.id),
  );

  if (!destination) {
    return sendError(res, 404, "Destination not found.");
  }

  return res.json(destination);
});

app.post("/destinations", (req, res) => {
  const validation = validateDestination(req.body);
  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  const destinations = readJSON("destinations");
  const destination = {
    id: nextId(destinations, "id"),
    ...validation.value,
  };

  destinations.push(destination);
  writeJSON("destinations", destinations);
  return res.status(201).json(destination);
});

app.put("/destinations/:id", (req, res) => {
  const destinations = readJSON("destinations");
  const index = destinations.findIndex(
    (item) => item.id === Number(req.params.id),
  );

  if (index < 0) {
    return sendError(res, 404, "Destination not found.");
  }

  const validation = validateDestination(req.body, destinations[index]);
  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  destinations[index] = {
    ...destinations[index],
    ...validation.value,
  };
  writeJSON("destinations", destinations);
  return res.json(destinations[index]);
});

app.delete("/destinations/:id", (req, res) => {
  const destinationId = Number(req.params.id);
  const destinations = readJSON("destinations");
  const filtered = destinations.filter(
    (item) => item.id !== destinationId,
  );

  if (filtered.length === destinations.length) {
    return sendError(res, 404, "Destination not found.");
  }

  writeJSON("destinations", filtered);
  writeJSON(
    "trips",
    readJSON("trips").filter((trip) => trip.dest_id !== destinationId),
  );

  return res.json({ message: "Destination deleted." });
});

// Supports the current public/script.js bulk synchronization calls.
app.put("/destinations", (req, res) => {
  if (!Array.isArray(req.body)) {
    return sendError(res, 400, "Expected an array of destinations.");
  }

  writeJSON("destinations", req.body);
  return res.json(req.body);
});

// Budgets
app.get("/budgets", (_req, res) => {
  res.json(readJSON("budgets"));
});

app.post("/budgets", (req, res) => {
  const validation = validateBudget(req.body);
  const userId = Math.round(
    Number(req.body.user_id ?? req.body.userId),
  );

  if (validation.error) {
    return sendError(res, 400, validation.error);
  }
  if (!userId) {
    return sendError(res, 400, "A user is required.");
  }

  const budgets = readJSON("budgets");
  const budget = {
    source_id: nextId(budgets, "source_id"),
    user_id: userId,
    ...validation.value,
  };

  budgets.push(budget);
  writeJSON("budgets", budgets);
  return res.status(201).json(budget);
});

app.put("/budgets/:id", (req, res) => {
  const budgets = readJSON("budgets");
  const index = budgets.findIndex(
    (item) => item.source_id === Number(req.params.id),
  );

  if (index < 0) {
    return sendError(res, 404, "Budget source not found.");
  }

  const validation = validateBudget(req.body, budgets[index]);
  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  budgets[index] = {
    ...budgets[index],
    ...validation.value,
  };
  writeJSON("budgets", budgets);
  return res.json(budgets[index]);
});

app.delete("/budgets/:id", (req, res) => {
  const sourceId = Number(req.params.id);
  const budgets = readJSON("budgets");
  const filtered = budgets.filter((item) => item.source_id !== sourceId);

  if (filtered.length === budgets.length) {
    return sendError(res, 404, "Budget source not found.");
  }

  const destinations = readJSON("destinations").filter(
    (item) => item.source_id !== sourceId,
  );

  writeJSON("budgets", filtered);
  writeJSON("destinations", destinations);

  const destinationIds = new Set(
    destinations.map((destination) => destination.id),
  );
  writeJSON(
    "trips",
    readJSON("trips").filter((trip) => destinationIds.has(trip.dest_id)),
  );

  return res.json({ message: "Budget source deleted." });
});

app.put("/budgets", (req, res) => {
  if (!Array.isArray(req.body)) {
    return sendError(res, 400, "Expected an array of budgets.");
  }

  writeJSON("budgets", req.body);
  return res.json(req.body);
});

// Itineraries and notes. data/trips.json is created automatically only when
// the existing public client first loads or saves trip-planning data.
app.get("/trips", (req, res) => {
  const trips = readJSON("trips");
  const userId = req.query.user_id ? Number(req.query.user_id) : null;

  return res.json(
    userId ? trips.filter((trip) => trip.user_id === userId) : trips,
  );
});

app.put("/trips", (req, res) => {
  if (Array.isArray(req.body)) {
    writeJSON("trips", req.body);
    return res.json(req.body);
  }

  const trips = readJSON("trips");
  const index = trips.findIndex(
    (trip) =>
      trip.dest_id === Number(req.body.dest_id) &&
      trip.user_id === Number(req.body.user_id),
  );
  const validation = validateTrip(
    req.body,
    index >= 0 ? trips[index] : {},
  );

  if (validation.error) {
    return sendError(res, 400, validation.error);
  }

  if (index >= 0) {
    trips[index] = {
      ...trips[index],
      ...validation.value,
    };
  } else {
    trips.push(validation.value);
  }

  writeJSON("trips", trips);
  return res.json(validation.value);
});

app.post("/data/reset", (_req, res) => {
  resetDemoData();
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
    console.log(`Public files directory: ${PUBLIC_DIR}`);
  });
}

module.exports = app;