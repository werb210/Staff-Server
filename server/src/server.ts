import app from "./index.js";

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on ${HOST}:${PORT}`);
});
