import cors from "cors";
const allowedOrigins = ["https://staff.boreal.financial"];
export const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    credentials: false,
};
export function applyCors(app) {
    const corsMiddleware = cors(corsOptions);
    app.use(corsMiddleware);
    app.options("*", corsMiddleware);
    app.use((req, res, next) => {
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        return next();
    });
}
