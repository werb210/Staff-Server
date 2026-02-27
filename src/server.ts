import http from "http";

import { buildApp } from "./app";

export const appPromise = buildApp();

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3000;
  appPromise.then((app) => {
    http.createServer(app).listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  });
}
