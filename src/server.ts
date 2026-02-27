import http from "http";

import { buildAppWithApiRoutes } from "./app";

export const app = buildAppWithApiRoutes();

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3000;
  http.createServer(app).listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
