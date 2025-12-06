import app from "./app";
import { config } from "dotenv";
config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
