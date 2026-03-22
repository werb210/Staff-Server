"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtp = createOtp;
exports.verifyOtp = verifyOtp;
const store = new Map();
function createOtp(phone) {
    const code = '123456';
    store.set(phone, { phone, code });
    return code;
}
function verifyOtp(phone, code) {
    const session = store.get(phone);
    if (!session)
        return false;
    return session.code === code;
}
