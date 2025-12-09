import app from "./app";
import { config } from "./config/config";

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
