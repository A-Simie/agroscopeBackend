import { Router, Request, Response } from "express";
import multer from "multer";
import { pool } from "../db";
import { geminiVisionModel } from "../lib/gemini";
import { analyzeWithPerplexity } from "../lib/perplexity";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

interface ScanPayload {
  disease: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | "unknown";
  summary: string;
  recommendations: string[];
  provider: "gemini" | "perplexity";
}

const buildPrompt = (): string => {
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

const parseModelJson = (text: string): ScanPayload | null => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Omit<
      ScanPayload,
      "provider"
    >;
    return {
      ...parsed,
      provider: "gemini",
    };
  } catch {
    return null;
  }
};

router.post(
  "/plant",
  authMiddleware,
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user?.id) {
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

      let scanPayload: ScanPayload | null = null;
      let rawGeminiText = "";

      try {
        const result = await geminiVisionModel.generateContent({
          contents: [{ role: "user", parts }],
        });

        const response = await result.response;
        rawGeminiText = response.text();
        const parsed = parseModelJson(rawGeminiText);

        if (parsed) {
          scanPayload = parsed;
        }
      } catch (err) {
        console.error("GEMINI_SCAN_ERROR", err);
      }

      if (!scanPayload || scanPayload.confidence < 0.6) {
        let description = "Plant image with visible leaves and symptoms.";
        if (scanPayload?.summary) {
          description = scanPayload.summary;
        }

        const pplxResult = await analyzeWithPerplexity(description);

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

      const insertResult = await pool.query<{
        id: string;
        disease: string;
        confidence: number;
        severity: string;
        summary: string;
        recommendations: unknown;
        provider: string;
      }>(
        `
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
        `,
        [
          user.id,
          scanPayload.disease,
          scanPayload.confidence,
          scanPayload.severity,
          scanPayload.summary,
          JSON.stringify(scanPayload.recommendations),
          scanPayload.provider,
          null,
        ]
      );

      const record = insertResult.rows[0];

      if (!record) {
        res.status(500).json({ error: "Failed to save scan result" });
        return;
      }

      res.json({
        id: record.id,
        disease: record.disease,
        confidence: record.confidence,
        severity: record.severity as ScanPayload["severity"],
        summary: record.summary,
        recommendations: record.recommendations as string[],
        provider: record.provider as ScanPayload["provider"],
      });
    } catch (err) {
      console.error("PLANT_SCAN_ERROR", err);
      res.status(500).json({ error: "Failed to analyze plant image" });
    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { id } = req.params;

      const result = await pool.query<{
        id: string;
        disease: string;
        confidence: number;
        severity: string;
        summary: string;
        recommendations: unknown;
        provider: string;
        user_id: string;
      }>(
        `
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
        `,
        [id, user.id]
      );

      const record = result.rows[0];

      if (!record) {
        res.status(404).json({ error: "Scan not found" });
        return;
      }

      res.json({
        id: record.id,
        disease: record.disease,
        confidence: record.confidence,
        severity: record.severity as "mild" | "moderate" | "severe" | "unknown",
        summary: record.summary,
        recommendations: record.recommendations as string[],
        provider: record.provider as "gemini" | "perplexity",
      });
    } catch (err) {
      console.error("GET_SCAN_ERROR", err);
      res.status(500).json({ error: "Failed to load scan" });
    }
  }
);

export default router;
