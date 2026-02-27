import { buildApp, registerApiRoutes } from "./app";

const app = buildApp();

registerApiRoutes(app);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
