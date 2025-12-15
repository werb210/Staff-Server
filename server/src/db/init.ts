// server/src/db/init.ts
//
// This module is imported for side-effects during server startup.
// It must exist in the compiled output as: dist/db/init.js
//
// Keep it safe + minimal: just ensure the DB layer modules load.

import "./client";
import "./schema";

// No exports needed (side-effects only)
export {};
