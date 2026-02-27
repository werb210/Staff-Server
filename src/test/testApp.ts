import { buildAppWithApiRoutes } from "../app";

export function createTestApp() {
  process.env.NODE_ENV = "test";
  return buildAppWithApiRoutes();
}
