import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";
export const OPENAI_MODEL_VISION = "gpt-4o";
