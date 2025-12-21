function normalizePath(path) {
    if (!path)
        return "";
    const cleaned = path.replace(/\\\//g, "/");
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}
function extractMountPath(layer) {
    if (typeof layer.path === "string") {
        return normalizePath(layer.path);
    }
    if (layer.regexp?.fast_slash)
        return "";
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
function joinPaths(base, path) {
    const combined = `${base}/${path}`.replace(/\/+/g, "/");
    return combined === "/" ? "/" : combined.replace(/\/$/, "");
}
export function listRegisteredRoutes(container, basePath = "") {
    const stack = (container._router?.stack ??
        container.stack ??
        []) || [];
    const routes = [];
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
            routes.push(...listRegisteredRoutes(layer.handle, nestedBase));
        }
    }
    return Array.from(new Map(routes.map((r) => [`${r.method} ${r.path}`, r])).values());
}
