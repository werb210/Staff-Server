import type { Server } from "http";

const isCodespaces =
  process.env.CODESPACES === "true" ||
  Boolean(process.env.CODESPACE_NAME) ||
  Boolean(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);

const localhostPattern = /localhost|127\.0\.0\.1/i;

function formatHost(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}

export function resolveBaseUrl(server?: Server): string {
  const baseUrl = process.env.BASE_URL;
  const shouldPreferServer =
    process.env.NODE_ENV === "test" &&
    Boolean(server) &&
    (!baseUrl || localhostPattern.test(baseUrl));
  if (baseUrl && !shouldPreferServer) {
    if (isCodespaces && localhostPattern.test(baseUrl)) {
      throw new Error("BASE_URL must be a real Codespaces URL (no localhost).");
    }
    return baseUrl;
  }

  if (!server) {
    throw new Error("BASE_URL was not configured for runtime health checks.");
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve server address.");
  }

  let host = address.address;
  if (host === "0.0.0.0") {
    host = "127.0.0.1";
  }
  if (host === "::") {
    host = "::1";
  }

  return `http://${formatHost(host)}:${address.port}`;
}
