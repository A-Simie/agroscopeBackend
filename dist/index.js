"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const scan_route_1 = __importDefault(require("./routes/scan.route"));
const weather_route_1 = __importDefault(require("./routes/weather.route"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: "*",
    credentials: false,
    exposedHeaders: ["Authorization"],
}));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("AgroScope API is running");
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/auth", auth_route_1.default);
app.use("/api/scan", scan_route_1.default);
app.use("/api/weather", weather_route_1.default);
app.listen(PORT, () => {
    console.log(`AgroScope API running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map