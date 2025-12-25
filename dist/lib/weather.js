"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherForecast = exports.getWeatherSummary = void 0;
const axios_1 = __importDefault(require("axios"));
const describeWeather = (current) => {
    const { temperature_2m, relative_humidity_2m, precipitation, cloud_cover } = current;
    const parts = [];
    parts.push(`Current field conditions are about ${Math.round(temperature_2m)}°C with roughly ${relative_humidity_2m}% humidity.`);
    if (precipitation > 0) {
        parts.push(`There is active rainfall (${precipitation.toFixed(1)} mm), which can strongly increase the risk of fungal and bacterial diseases.`);
    }
    else {
        parts.push("There is little to no rainfall at the moment, but morning dew or irrigation can still keep leaves wet.");
    }
    if (cloud_cover > 70) {
        parts.push("Skies are mostly cloudy, so leaves may stay wet longer, which favors disease development.");
    }
    else if (cloud_cover < 30) {
        parts.push("Skies are mostly clear, helping leaves dry faster and slightly reducing disease pressure.");
    }
    else {
        parts.push("Skies are partly cloudy, so disease pressure will depend on how long leaves remain wet.");
    }
    parts.push("Monitor humidity and leaf wetness closely over the next 24–48 hours, as these strongly affect most crop diseases in West Africa.");
    return parts.join(" ");
};
const getWeatherSummary = async (latitude, longitude) => {
    var _a;
    try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" +
            latitude +
            "&longitude=" +
            longitude +
            "&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code";
        const response = await axios_1.default.get(url);
        if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.current)) {
            return null;
        }
        const current = response.data.current;
        return {
            summary: describeWeather(current),
            temperatureC: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            precipitationMm: current.precipitation,
            cloudCover: current.cloud_cover,
        };
    }
    catch {
        return null;
    }
};
exports.getWeatherSummary = getWeatherSummary;
const getWeatherForecast = async (latitude, longitude) => {
    var _a, _b;
    try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" +
            latitude +
            "&longitude=" +
            longitude +
            "&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code" +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
            "&timezone=auto";
        const response = await axios_1.default.get(url);
        if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.current) || !((_b = response.data) === null || _b === void 0 ? void 0 : _b.daily)) {
            return null;
        }
        const current = response.data.current;
        const daily = response.data.daily;
        const forecastDays = daily.time.map((date, index) => {
            var _a, _b, _c, _d;
            return ({
                date,
                weatherCode: (_a = daily.weather_code[index]) !== null && _a !== void 0 ? _a : 0,
                tempMax: (_b = daily.temperature_2m_max[index]) !== null && _b !== void 0 ? _b : 0,
                tempMin: (_c = daily.temperature_2m_min[index]) !== null && _c !== void 0 ? _c : 0,
                precipitationProbability: (_d = daily.precipitation_probability_max[index]) !== null && _d !== void 0 ? _d : 0,
            });
        });
        return {
            current: {
                summary: describeWeather(current),
                temperatureC: current.temperature_2m,
                humidity: current.relative_humidity_2m,
                precipitationMm: current.precipitation,
                cloudCover: current.cloud_cover,
            },
            daily: forecastDays,
        };
    }
    catch {
        return null;
    }
};
exports.getWeatherForecast = getWeatherForecast;
//# sourceMappingURL=weather.js.map