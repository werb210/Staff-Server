/****************************************************************************************
 * BLOCK 1 — Staff-Server (BACKEND)
 *
 * REPO: werb210/Staff-Server
 * FILE: server/src/index.ts
 * ACTION: REPLACE ENTIRE FILE
 *
 * CONTRACT (DO NOT VIOLATE):
 * - ALL API ROUTES ARE DEFINED INSIDE registerRoutes()
 * - registerRoutes() MUST ALREADY PREFIX ROUTES WITH /api
 * - DO NOT ADD /api ANYWHERE ELSE
 *
 * REQUIRED ROUTES (MUST EXIST IN registerRoutes):
 *   GET /api/health            → public (200 OK)
 *   GET /api/applications      → auth required (401 if no token)
 *
 * CORS REQUIREMENTS:
 * - Origin: https://staff.boreal.financial
 * - Authorization header allowed
 * - OPTIONS must match EXACTLY
 ****************************************************************************************/

import express from "express";
import { registerRoutes } from "./routes";
import { applyCors } from "./config/cors";

const app = express();

// CORS + preflight (MUST MATCH EXACTLY)
applyCors(app);

app.use(express.json());

// ALL ROUTES REGISTERED ONCE — NO PREFIXING HERE
registerRoutes(app);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
