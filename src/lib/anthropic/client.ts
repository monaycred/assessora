import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Modelo padrão para classificação e tarefas rápidas
export const AI_MODEL = "claude-haiku-4-5-20251001";

// Modelo avançado para visão (imagens) e tarefas complexas
export const AI_MODEL_VISION = "claude-sonnet-4-6";
