export const API_BASE =
  process.env.API_BASE_URL ||
  "https://api.staff.boreal.financial";

export const PUBLIC_BASE =
  process.env.PUBLIC_BASE_URL ||
  "https://staff.boreal.financial";

export const CLIENT_BASE =
  process.env.CLIENT_BASE_URL ||
  "https://client.boreal.financial";

export const ALLOWED_ORIGINS = [PUBLIC_BASE, CLIENT_BASE];
