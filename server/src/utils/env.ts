import { config } from "dotenv";
import { logInfo } from "./logger.js";

let isLoaded = false;

export const loadEnv = (): void => {
  if (isLoaded) {
    return;
  }

  const result = config();
  if (result.error) {
    logInfo("No .env file found, relying on process environment");
  } else {
    logInfo("Environment variables loaded from .env");
  }

  isLoaded = true;
};
