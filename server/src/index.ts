import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Routes
import documentRouter, {
  applicationDocumentsRouter,
} from "./routes/index.js"; // this matches YOUR file path

// Create server instance
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* ---------------------------------------------------------
   HEALTH CHECK (required by tests + Azure deployment)
--------------------------------------------------------- */
app.get("/api/_int/build", (_req, res) => {
  res.json({ ok: true, message: "Server running" });
});

/* ---------------------------------------------------------
   DOCUMENT ROUTES
--------------------------------------------------------- */
app.use("/api/documents", documentRouter);

/* ---------------------------------------------------------
   APPLICATION-SCOPED DOCUMENT ROUTES
--------------------------------------------------------- */
app.use("/api/applications", applicationDocumentsRouter);

/* ---------------------------------------------------------
   SERVER START
--------------------------------------------------------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

export default app;
