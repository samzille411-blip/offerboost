import { getLLMClient, getAnalyzeModel } from "./llm";
import { mapLlmErrorToResponse } from "./llm-errors";

let lastProbeOkAt = 0;

export function getProbeCacheMs(): number {
  return Number(process.env.LLM_PROBE_CACHE_MS || 3600000);
}

export function markLlmProbeOk(): void {
  lastProbeOkAt = Date.now();
}

export function isLlmProbeFresh(): boolean {
  return Date.now() - lastProbeOkAt < getProbeCacheMs();
}

/** 极轻量探活：约数个 token，用于首次分析前确认大模型可用 */
export async function probeLlm(): Promise<
  { ok: true } | { ok: false; error: string; status: number; code: string }
> {
  if (!process.env.LLM_API_KEY) {
    return {
      ok: false,
      error: "AI 服务未配置，请联系管理员",
      status: 503,
      code: "llm_not_configured",
    };
  }

  if (isLlmProbeFresh()) {
    return { ok: true };
  }

  try {
    const client = getLLMClient();
    await client.chat.completions.create({
      model: getAnalyzeModel(),
      max_tokens: Number(process.env.LLM_PROBE_MAX_TOKENS || 5),
      temperature: 0,
      messages: [{ role: "user", content: "1" }],
    });
    markLlmProbeOk();
    return { ok: true };
  } catch (e) {
    const mapped = mapLlmErrorToResponse(e);
    return { ok: false, ...mapped };
  }
}
