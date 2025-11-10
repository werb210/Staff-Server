import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Import your first route
import healthRouter from "./routes/health";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Mount your route
app.use(healthRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
