import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE_ARTIFACT_PATH,
  exportServerRoutesArtifact,
  renderNormalizedRouteLines,
  type NormalizedRouteEntry,
} from "../src/system/routeArtifacts";

type RouteArtifact = {
  schemaVersion: number;
  generatedBy: string;
  routes: NormalizedRouteEntry[];
};

const requiredRoutes = [
  "GET /health",
  "GET /api",
  "GET /api/auth/me",
  "POST /api/auth/verify",
  "POST /api/application/update",
  "GET /api/dashboard/metrics",
] as const;

describe("route artifact export", () => {
  it("exports a deterministic, non-empty server route artifact", async () => {
    const artifactPath = await exportServerRoutesArtifact(DEFAULT_ROUTE_ARTIFACT_PATH);
    expect(artifactPath).toBe(path.resolve(DEFAULT_ROUTE_ARTIFACT_PATH));

    const payload = JSON.parse((await readFile(artifactPath, "utf8"))) as RouteArtifact;

    expect(payload.schemaVersion).toBe(1);
    expect(payload.generatedBy).toBe("bf-server");
    expect(payload.routes.length).toBeGreaterThan(0);

    const normalizedLines = renderNormalizedRouteLines(payload.routes);
    expect(normalizedLines.length).toBeGreaterThan(0);

    const sortedLines = [...normalizedLines].sort((a, b) => a.localeCompare(b));
    expect(normalizedLines).toEqual(sortedLines);

    requiredRoutes.forEach((route) => {
      expect(normalizedLines).toContain(route);
    });
  }, 20000);
});
