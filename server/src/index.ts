import express from "express";
import cors from "cors";

const app = express();

/* --------------------
   Middleware
-------------------- */
app.use(cors());
app.use(express.json());

/* --------------------
   Internal health routes
   (INLINE — no external imports)
-------------------- */
app.get("/api/_int/health", (_req, res) => {
  res.json({ status: "healthy" });
});

app.get("/api/_int/routes", (_req, res) => {
  res.json({
    routes: [
      "/api/_int/health",
      "/api/_int/routes"
    ]
  });
});

/* --------------------
   Root (optional but safe)
-------------------- */
app.get("/", (_req, res) => {
  res.send("Staff Server running");
});

/* --------------------
   Server start
-------------------- */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
