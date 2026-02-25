import http from "http";

import { buildApp } from "./app";

export const app = buildApp();

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3000;
  http.createServer(app).listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
