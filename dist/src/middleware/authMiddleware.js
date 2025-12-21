import { requireAuth } from "./requireAuth";
export function authenticate(req, res, next) {
    return requireAuth(req, res, next);
}
