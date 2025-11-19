# Staff App Clean Backend

This repository contains a minimal Express + TypeScript backend scaffold for the **staff-app-clean** project. It includes routing, middleware, and configuration ready for local development in a GitHub Codespace.

## Features

- Express server written in TypeScript
- API routes for health checks and applications
- Middleware for JSON body parsing and CORS
- Environment variable support via `dotenv`
- Type-safe build configuration with strict TypeScript settings

## Project Structure

```
server/
  src/
    index.ts
    tsconfig.json
    routes/
      health.ts
      applications.ts
    services/
      .gitkeep
    utils/
      index.ts
      .gitkeep
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server with hot compilation:
   ```bash
   npm run dev
   ```
3. Build the TypeScript source:
   ```bash
   npm run build
   ```
4. Run the compiled JavaScript:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/applications` → `{ "status": "ok", "applications": [] }`

## Environment Variables

Create a `.env` file at the project root to override defaults. The server listens on `PORT` if specified (defaults to `5000`).

Additional development toggles:

- `REQUIRE_DATABASE=true` – force the process to exit if the database connection fails.
- `SKIP_DATABASE=true` – skip the initial connection attempt entirely (useful when iterating on HTTP-only endpoints).

## Development Notes

- Utility helpers can be added to `server/src/utils`.
- Service-layer logic can be implemented within `server/src/services`.
- The `server/src/utils/index.ts` file is intentionally empty and ready for future exports.

