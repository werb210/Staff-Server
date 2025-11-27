// ===========================================================
//  Azure-safe dotenv bootstrap (no-op if dotenv missing)
// ===========================================================
try {
  // On Azure App Service, dotenv is not installed at runtime.
  // This guard prevents ERR_MODULE_NOT_FOUND and avoids startup failure.
  const dotenv = await import('dotenv').catch(() => null);
  if (dotenv && dotenv.config) {
    dotenv.config();
    console.log('[INIT] dotenv loaded successfully');
  } else {
    console.log('[INIT] dotenv NOT present (expected on Azure)');
  }
} catch (err) {
  console.log('[INIT] dotenv load skipped:', err);
}

// ===========================================================
//  Main server import
// ===========================================================
import { app } from './app.js';

// ===========================================================
//  Server Startup
// ===========================================================
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(PORT, () => {
  console.log(`🚀 Staff Server running on port ${PORT}`);
});
