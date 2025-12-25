"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiVisionModel = void 0;
const generative_ai_1 = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
exports.geminiVisionModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
});
//# sourceMappingURL=gemini.js.map