import axios from "axios";

const pplxApiKey = process.env.PPLX_API_KEY;

if (!pplxApiKey) {
  throw new Error("PPLX_API_KEY is not set in environment variables");
}

const PPLX_API_URL = "https://api.perplexity.ai/chat/completions";

export interface PplxScanResult {
  disease: string;
  confidence: number;
  severity: "mild" | "moderate" | "severe" | "unknown";
  summary: string;
  recommendations: string[];
}

const buildPerplexityPrompt = (contextDescription: string): string => {
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

export const analyzeWithPerplexity = async (
  description: string
): Promise<PplxScanResult | null> => {
  const prompt = buildPerplexityPrompt(description);

  const response = await axios.post(
    PPLX_API_URL,
    {
      model: "sonar-reasoning-pro",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pplxApiKey}`,
      },
    }
  );

  const content = response.data?.choices?.[0]?.message?.content ?? "";

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as PplxScanResult;
    return parsed;
  } catch {
    return null;
  }
};
