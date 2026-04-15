import { config } from "../config/index.js";
import { loadRequiredSecrets } from "../config/secrets.js";

export function validateStartup() {
  loadRequiredSecrets();

  if (!config.auth.jwtSecret) {
    throw new Error("Missing JWT secret");
  }

  if (!config.db.url && !config.db.skip) {
    throw new Error("DATABASE_URL missing");
  }

  if (!config.sentry.dsn) {
    console.warn("[STARTUP] SENTRY_DSN not set — error tracking disabled");
  }

  if (!config.alerting.slackWebhookUrl) {
    console.warn("[STARTUP] SLACK_ALERT_WEBHOOK_URL not set — Slack alerts disabled");
  }
}
