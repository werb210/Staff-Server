// services/db.js
// ---------------------------------------------------------
// Temporary In-Memory DB Layer
// Matches all controllers and health checks
// ---------------------------------------------------------

// Silo type definition
export const Silo = {
  BF: "bf",
  SLF: "slf",
};

// ---------------------------------------------------------
// In-memory tables — non-crashing, safe defaults
// ---------------------------------------------------------

const createTable = () => ({
  data: [],
  insert(record) {
    this.data.push(record);
    return record;
  },
  findById(id) {
    return this.data.find((r) => r.id === id) || null;
  },
  update(id, updates) {
    const idx = this.data.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.data[idx] = { ...this.data[idx], ...updates };
    return this.data[idx];
  },
  delete(id) {
    const idx = this.data.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.data.splice(idx, 1);
    return true;
  },
});

// ---------------------------------------------------------
// Database object exposed to server
// ---------------------------------------------------------

export const db = {
  applications: createTable(),
  documents: createTable(),
  lenders: createTable(),
  pipeline: createTable(),
  communications: createTable(),
  notifications: createTable(),
  users: createTable(),

  // audit logs = simple array instead of table
  auditLogs: [],
};

// ---------------------------------------------------------
// Example seed admin user (matches authController.js)
// ---------------------------------------------------------
db.users.insert({
  id: "1",
  email: "todd.w@boreal.financial",
  role: "admin",
  silo: "bf",
});

// ---------------------------------------------------------
// Utility (used by /api/_int/db)
// ---------------------------------------------------------

export const describeDatabaseUrl = (url) => {
  if (!url) {
    return { status: "missing" };
  }

  try {
    const u = new URL(url);

    return {
      status: "ok",
      driver: u.protocol.replace(":", ""),
      sanitizedUrl: `${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
      host: u.hostname,
      port: u.port,
    };
  } catch (e) {
    return { status: "invalid" };
  }
};
