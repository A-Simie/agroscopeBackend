"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const db_1 = require("../db");
const gemini_1 = require("../lib/gemini");
const perplexity_1 = require("../lib/perplexity");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
const buildPrompt = () => {
    return `
You are an agronomy and plant pathology expert.

You will receive a single plant image (usually a close-up of leaves or a crop).
Analyze ONLY what is visible in the image and respond strictly in JSON:

{
  "disease": string,
  "confidence": number,
  "severity": "mild" | "moderate" | "severe" | "unknown",
  "summary": string,
  "recommendations": string[]
}

Guidelines:
- If the plant looks healthy, set "disease" to "Healthy" and "severity" to "unknown".
- Consider Nigerian / West African smallholder farmers when suggesting treatments.
- Do not include any explanation outside the JSON.
`;
};
const parseModelJson = (text) => {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        return {
            ...parsed,
            provider: "gemini",
        };
    }
    catch {
        return null;
    }
};
router.post("/plant", auth_middleware_1.authMiddleware, upload.single("image"), async (req, res) => {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!req.file) {
            res
                .status(400)
                .json({ error: "Image file is required (field: image)" });
            return;
        }
        const mimeType = req.file.mimetype;
        const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!supportedTypes.includes(mimeType)) {
            res
                .status(400)
                .json({ error: "Unsupported image type. Use JPG, PNG, or WEBP." });
            return;
        }
        const prompt = buildPrompt();
        const base64 = req.file.buffer.toString("base64");
        const parts = [
            { text: prompt },
            {
                inlineData: {
                    mimeType,
                    data: base64,
                },
            },
        ];
        let scanPayload = null;
        let rawGeminiText = "";
        try {
            const result = await gemini_1.geminiVisionModel.generateContent({
                contents: [{ role: "user", parts }],
            });
            const response = await result.response;
            rawGeminiText = response.text();
            const parsed = parseModelJson(rawGeminiText);
            if (parsed) {
                scanPayload = parsed;
            }
        }
        catch (err) {
            console.error("GEMINI_SCAN_ERROR", err);
        }
        if (!scanPayload || scanPayload.confidence < 0.6) {
            let description = "Plant image with visible leaves and symptoms.";
            if (scanPayload === null || scanPayload === void 0 ? void 0 : scanPayload.summary) {
                description = scanPayload.summary;
            }
            const pplxResult = await (0, perplexity_1.analyzeWithPerplexity)(description);
            if (!pplxResult) {
                res.status(500).json({
                    error: "Failed to analyze plant image with both providers",
                    geminiRaw: rawGeminiText,
                });
                return;
            }
            scanPayload = {
                disease: pplxResult.disease,
                confidence: pplxResult.confidence,
                severity: pplxResult.severity,
                summary: pplxResult.summary,
                recommendations: pplxResult.recommendations,
                provider: "perplexity",
            };
        }
        const insertResult = await db_1.pool.query(`
        INSERT INTO scans (
          user_id,
          disease,
          confidence,
          severity,
          summary,
          recommendations,
          provider,
          image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, disease, confidence, severity, summary, recommendations, provider
        `, [
            user.id,
            scanPayload.disease,
            scanPayload.confidence,
            scanPayload.severity,
            scanPayload.summary,
            JSON.stringify(scanPayload.recommendations),
            scanPayload.provider,
            null,
        ]);
        const record = insertResult.rows[0];
        if (!record) {
            res.status(500).json({ error: "Failed to save scan result" });
            return;
        }
        res.json({
            id: record.id,
            disease: record.disease,
            confidence: record.confidence,
            severity: record.severity,
            summary: record.summary,
            recommendations: record.recommendations,
            provider: record.provider,
        });
    }
    catch (err) {
        console.error("PLANT_SCAN_ERROR", err);
        res.status(500).json({ error: "Failed to analyze plant image" });
    }
});
router.get("/:id", auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const result = await db_1.pool.query(`
        SELECT
          id,
          disease,
          confidence,
          severity,
          summary,
          recommendations,
          provider,
          user_id
        FROM scans
        WHERE id = $1 AND user_id = $2
        `, [id, user.id]);
        const record = result.rows[0];
        if (!record) {
            res.status(404).json({ error: "Scan not found" });
            return;
        }
        res.json({
            id: record.id,
            disease: record.disease,
            confidence: record.confidence,
            severity: record.severity,
            summary: record.summary,
            recommendations: record.recommendations,
            provider: record.provider,
        });
    }
    catch (err) {
        console.error("GET_SCAN_ERROR", err);
        res.status(500).json({ error: "Failed to load scan" });
    }
});
exports.default = router;
//# sourceMappingURL=scan.route.js.map