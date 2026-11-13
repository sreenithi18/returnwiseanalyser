// Server-only: AI return-reason classification through Lovable AI Gateway.
import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, NoObjectGeneratedError, Output, streamText } from "ai";
import { normalizeClassification, type Classification } from "./reasons";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

type Item = { id: number; text: string; category: string };
type Raw = { results: { id: number; issue_label: string; theme: string; confidence: "high" | "medium" | "low" }[] };

const schema = jsonSchema<Raw>({
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "issue_label", "theme", "confidence"],
        properties: {
          id: { type: "integer" },
          issue_label: { type: "string" },
          theme: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
  },
});

const INSTRUCTIONS = `You classify e-commerce product return reasons written by Indian online buyers (Amazon, Flipkart, Meesho).
Texts may be English, Hinglish, or other Indian languages written in English letters, with typos and slang. Understand them.
For every item return:
- issue_label: the specific problem in short plain English (2-5 words), e.g. "Size too small", "Battery drains fast", "Box arrived crushed".
- theme: a broad theme for charts, e.g. "Size & fit", "Defective product", "Damaged in delivery", "Wrong item sent", "Not as described", "Late delivery", "Changed mind". Use 4 to 10 themes for the whole dataset, chosen from the data itself. Reuse an existing theme whenever it fits; only add a new one when nothing fits.
- confidence: high, medium or low.
Use the product category only as context (e.g. "small" means size for clothing, but may mean product size for electronics).
Never invent a reason. If a text is meaningless or too vague (e.g. "ok", "personal", "-"), use issue_label "Unclear reason", theme "Unclear", confidence low.
Return exactly one result per input id.`;

export class AiUnavailableError extends Error {}

/** Classify one batch (up to 100). Only reason text and product category are sent. */
export async function classifyBatch(items: Item[], existingThemes: string[]): Promise<Map<number, Classification>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiUnavailableError("AI key missing");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const prompt = JSON.stringify({
    existing_themes: existingThemes,
    items: items.map((i) => ({ id: i.id, text: i.text, category: i.category })),
  });
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      prompt,
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    let out: Raw;
    try {
      out = (await result.output) as Raw;
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e) && e.text) out = JSON.parse(e.text) as Raw;
      else throw e;
    }
    const map = new Map<number, Classification>();
    for (const r of out.results ?? []) {
      const c = normalizeClassification(r);
      if (c && items.some((i) => i.id === r.id)) map.set(r.id, c);
    }
    return map;
  } catch (e) {
    console.error("AI classification failed:", e instanceof Error ? e.message : e);
    throw new AiUnavailableError("AI classification failed");
  }
}
