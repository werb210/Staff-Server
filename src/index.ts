import { buildAppWithApiRoutes } from "./app";

export const app = buildAppWithApiRoutes();
export { startServer } from "./server/index";

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
