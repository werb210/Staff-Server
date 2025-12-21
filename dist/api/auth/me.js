"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = me;
function me(req, res) {
    return res.status(200).json(req.user);
}
