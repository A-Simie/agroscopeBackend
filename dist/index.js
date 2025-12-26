"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const passport_1 = __importDefault(require("./config/passport"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const scan_route_1 = __importDefault(require("./routes/scan.route"));
const weather_route_1 = __importDefault(require("./routes/weather.route"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.set("trust proxy", 1);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = [
    "https://agroscope.vercel.app",
    "http://localhost:5173",
    "http://localhost:5175",
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(passport_1.default.initialize());
app.get("/", (_req, res) => {
    res.json({ message: "AgroScope API is running", status: "healthy" });
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/api/auth", auth_route_1.default);
app.use("/api/scan", scan_route_1.default);
app.use("/api/weather", weather_route_1.default);
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});
exports.default = app;
//# sourceMappingURL=index.js.map