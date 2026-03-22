"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/test", (_req, res) => {
    res.json({ ok: true, route: "test" });
});
function mountSafe(path, modulePath) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(modulePath);
        const handler = loaded.default ?? loaded;
        router.use(path, handler);
    }
    catch (e) {
        console.error("ROUTE LOAD FAIL:", e);
    }
}
mountSafe("/lenders", "./lenders");
mountSafe("/applications", "./applications");
mountSafe("/crm", "./crm");
mountSafe("/users", "./users");
mountSafe("/lender-products", "./lenderProducts");
exports.default = router;
