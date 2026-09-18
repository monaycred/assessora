import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não está configurada");
  }
  client ??= new OpenAI({ apiKey });
  return client;
}

export const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";
export const OPENAI_MODEL_VISION = "gpt-4o";
