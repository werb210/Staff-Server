# Staff Server Backend

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
5. Run the server type-check (no emit) to ensure the source compiles cleanly:
   ```bash
   npm run typecheck
   ```

> The `typecheck` script runs `tsc` against `server/tsconfig.json` with `--noEmit`, so it is safe to run frequently during
> development and CI pipelines without modifying build artifacts.

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

## Production deployment on Azure

The repository now includes Azure-first assets for deploying the containerized API using infrastructure-as-code and GitHub Actions:

- **`azure/main.bicep`** provisions an Azure Container Registry, user-assigned managed identity, Linux App Service plan, Application Insights, and an App Service for Containers that runs this image with health probes, HTTPS-only enforcement, FTPS disabled, TLS 1.2+, and managed identity-based ACR pulls.
- **`azure/parameters.example.json`** shows sample parameters; copy it, adjust the values, and run the deployment with `az deployment group create` in your target resource group.
- **`.github/workflows/azure-container-deploy.yml`** builds and pushes the container to ACR, then updates the Web App to the new image using OIDC-based authentication. Configure the following GitHub secrets/variables: `AZURE_CREDENTIALS` (federated credentials JSON), `AZURE_CONTAINER_REGISTRY`, `AZURE_RESOURCE_GROUP`, and `AZURE_WEBAPP_NAME`.

### Deploy the infrastructure

1. Log in and select your subscription:
   ```bash
   az login
   az account set --subscription <subscription-id>
   ```
2. Deploy the Bicep template to your resource group (update `parameters.json` to match your naming standards and image tag):
   ```bash
   az deployment group create \
     --resource-group <resource-group-name> \
     --template-file azure/main.bicep \
     --parameters @azure/parameters.example.json \
     --parameters containerImage=staff-server:latest
   ```

### Configure CI/CD

1. Create the GitHub secrets/variables referenced in `.github/workflows/azure-container-deploy.yml` (registry name, resource group, web app name, and Azure federated credentials).
2. Push to `main` (or run the workflow manually) to build the Docker image, push it to ACR, and redeploy the App Service container.

### Runtime expectations

- The container honors `WEBSITES_PORT` (preferred on Azure) and `PORT` environment variables; defaults to `8080` locally.
- `/api/_int/live` is wired as the container health check and App Service probe path.
- The runtime Docker image runs as the non-root `node` user and includes an internal health check for local and container orchestrators.

 
# trigger
# trigger
 
 
# trigger
# trigger
# trigger
