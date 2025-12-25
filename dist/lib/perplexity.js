"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithPerplexity = void 0;
const axios_1 = __importDefault(require("axios"));
const pplxApiKey = process.env.PPLX_API_KEY;
if (!pplxApiKey) {
    throw new Error("PPLX_API_KEY is not set in environment variables");
}
const PPLX_API_URL = "https://api.perplexity.ai/chat/completions";
const buildPerplexityPrompt = (contextDescription) => {
    return `
You are an agronomy and plant disease expert.

You will receive a description of a plant image and should respond strictly in JSON.

Plant image description:
${contextDescription}

Respond with ONLY JSON in this exact structure:

{
  "disease": string,
  "confidence": number,
  "severity": "mild" | "moderate" | "severe" | "unknown",
  "summary": string,
  "recommendations": string[]
}

Guidelines:
- If the plant sounds healthy, set "disease" to "Healthy" and "severity" to "unknown".
- Consider Nigerian / West African smallholder farmers when suggesting treatments.
- Do not include any text outside the JSON.
`;
};
const analyzeWithPerplexity = async (description) => {
    var _a, _b, _c, _d, _e;
    const prompt = buildPerplexityPrompt(description);
    const response = await axios_1.default.post(PPLX_API_URL, {
        model: "sonar-reasoning-pro",
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        max_tokens: 800,
    }, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pplxApiKey}`,
        },
    });
    const content = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) !== null && _e !== void 0 ? _e : "";
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    try {
        const parsed = JSON.parse(content.slice(start, end + 1));
        return parsed;
    }
    catch {
        return null;
    }
};
exports.analyzeWithPerplexity = analyzeWithPerplexity;
//# sourceMappingURL=perplexity.js.map