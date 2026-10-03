import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
}

export async function streamGemini(
  contents: Parameters<GoogleGenAI["models"]["generateContentStream"]>[0]["contents"],
) {
  return getClient().models.generateContentStream({
    model: MODEL,
    contents,
    config: { temperature: 0.7, maxOutputTokens: 4096 },
  });
}
