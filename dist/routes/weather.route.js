"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weather_1 = require("../lib/weather");
const router = (0, express_1.Router)();
router.get("/current", async (req, res) => {
    var _a, _b;
    const latParam = (_a = req.query.lat) !== null && _a !== void 0 ? _a : "6.52";
    const lonParam = (_b = req.query.lon) !== null && _b !== void 0 ? _b : "3.38";
    const latitude = Number(latParam);
    const longitude = Number(lonParam);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        res
            .status(400)
            .json({ error: "Invalid lat/lon. Provide numeric coordinates." });
        return;
    }
    const weather = await (0, weather_1.getWeatherSummary)(latitude, longitude);
    if (!weather) {
        res
            .status(503)
            .json({ error: "Weather service unavailable. Try again later." });
        return;
    }
    res.json(weather);
});
router.get("/forecast", async (req, res) => {
    var _a, _b;
    const latParam = (_a = req.query.lat) !== null && _a !== void 0 ? _a : "6.52";
    const lonParam = (_b = req.query.lon) !== null && _b !== void 0 ? _b : "3.38";
    const latitude = Number(latParam);
    const longitude = Number(lonParam);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        res
            .status(400)
            .json({ error: "Invalid lat/lon. Provide numeric coordinates." });
        return;
    }
    const forecast = await (0, weather_1.getWeatherForecast)(latitude, longitude);
    if (!forecast) {
        res
            .status(503)
            .json({ error: "Weather service unavailable. Try again later." });
        return;
    }
    res.json(forecast);
});
exports.default = router;
//# sourceMappingURL=weather.route.js.map