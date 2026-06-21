import { Settings } from "./client";

export function resolveProvider(settings: Settings | null): { provider: string; model: string } {
  if (!settings) return { provider: "ollama", model: "llama3" };

  if (settings.llm_provider === "ollama") {
    return { provider: "ollama", model: settings.ollama_model };
  }

  // "api" mode — use the specific api_provider (anthropic / openai)
  return { provider: settings.api_provider, model: settings.api_model };
}
