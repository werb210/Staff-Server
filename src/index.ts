import { buildAppWithApiRoutes } from "./app";

const PORT = process.env.PORT || 3000;

const app = buildAppWithApiRoutes();

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`BF Server running on port ${PORT}`);
  });
}

export { app };
