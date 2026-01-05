"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = void 0;
exports.isRole = isRole;
exports.ROLES = {
    ADMIN: "admin",
    STAFF: "staff",
    USER: "user",
};
const roleSet = new Set(Object.values(exports.ROLES));
function isRole(value) {
    return roleSet.has(value);
}
