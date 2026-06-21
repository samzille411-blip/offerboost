/** 将 LLM API 异常映射为用户可见文案（不暴露欠费/密钥细节） */
export function mapLlmErrorToResponse(e: unknown): {
  error: string;
  status: number;
  code: string;
} {
  const status =
    e && typeof e === "object" && "status" in e
      ? Number((e as { status?: number }).status)
      : undefined;

  if (status === 402) {
    console.error("[LLM] balance exhausted (402) — 请在 DeepSeek 控制台充值");
    return {
      error: "AI 服务暂不可用，请稍后再试",
      status: 503,
      code: "llm_balance",
    };
  }
  if (status === 401) {
    console.error("[LLM] authentication failed (401) — 请检查 LLM_API_KEY");
    return {
      error: "AI 服务暂不可用，请稍后再试",
      status: 503,
      code: "llm_auth",
    };
  }
  if (status === 429) {
    return {
      error: "AI 服务繁忙，请稍后再试",
      status: 429,
      code: "llm_rate",
    };
  }

  console.error("[LLM] unexpected error", e);
  return {
    error: "AI 服务暂不可用，请稍后再试",
    status: 503,
    code: "llm_error",
  };
}
