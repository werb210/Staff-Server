import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import healthRouter from "./routes/health";
import applicationsRouter from "./routes/applications";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use("/api", healthRouter);
app.use("/api", applicationsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
