import type { Application, Router } from "express";

export type RegisteredRoute = { method: string; path: string };

type ExpressLayer = {
  route?: { path?: string | string[]; methods?: Record<string, boolean> };
  name?: string;
  handle?: { stack?: ExpressLayer[] };
  regexp?: RegExp & { fast_slash?: boolean };
  path?: string;
};

interface RouterStack {
  stack?: ExpressLayer[];
}

function normalizePath(path: string): string {
  if (!path) return "";
  const cleaned = path.replace(/\\\//g, "/");
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function extractMountPath(layer: ExpressLayer): string {
  if (typeof layer.path === "string") {
    return normalizePath(layer.path);
  }

  if (layer.regexp?.fast_slash) return "";

  if (layer.regexp) {
    const stringified = layer.regexp.toString();
    const strictMatch = stringified.match(/^\/\^\\\/?(.+?)\\\/?\(\?=\\\/\|\$\)\/i?$/);
    if (strictMatch?.[1]) {
      return normalizePath(strictMatch[1]);
    }

    const fallback = stringified.match(/^\/\^\\\/?(.+?)\\\/?\$\/i?$/);
    if (fallback?.[1]) {
      return normalizePath(fallback[1]);
    }

    return normalizePath(layer.regexp.source);
  }

  return "";
}

function joinPaths(base: string, path: string): string {
  const combined = `${base}/${path}`.replace(/\/+/g, "/");
  return combined === "/" ? "/" : combined.replace(/\/$/, "");
}

export function listRegisteredRoutes(container: Application | Router, basePath = ""): RegisteredRoute[] {
  const stack =
    ((container as unknown as { _router?: RouterStack })._router?.stack ??
      (container as unknown as RouterStack).stack ??
      []) || [];

  const routes: RegisteredRoute[] = [];

  for (const layer of stack) {
    const { route } = layer;

    if (route?.path && route?.methods) {
      const paths = Array.isArray(route.path) ? route.path : [route.path];
      const methods = Object.keys(route.methods).filter((method) => route.methods?.[method]);

      for (const currentPath of paths) {
        for (const method of methods) {
          routes.push({ method: method.toUpperCase(), path: joinPaths(basePath, currentPath) });
        }
      }
      continue;
    }

    if (layer.name === "router" && layer.handle?.stack) {
      const nestedBase = joinPaths(basePath, extractMountPath(layer));
      routes.push(...listRegisteredRoutes(layer.handle as unknown as Router, nestedBase));
    }
  }

  return Array.from(new Map(routes.map((r) => [`${r.method} ${r.path}`, r])).values());
}
