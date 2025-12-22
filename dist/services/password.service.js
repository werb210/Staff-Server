import bcrypt from "bcrypt";
const TOKEN_SALT_ROUNDS = 10;
const PASSWORD_SALT_ROUNDS = 12;
export const passwordService = {
    async hashPassword(password) {
        return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    },
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    },
    async hashToken(token) {
        return bcrypt.hash(token, TOKEN_SALT_ROUNDS);
    },
    async verifyToken(token, hash) {
        return bcrypt.compare(token, hash);
    },
};
