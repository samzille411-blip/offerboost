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

  const message =
    e && typeof e === "object" && "message" in e
      ? String((e as { message?: string }).message)
      : "";

  if (
    status === 400 &&
    /context|maximum context|token limit|too long|length exceeded/i.test(message)
  ) {
    return {
      error: "您的简历/JD 过长，请精简至核心内容后再试",
      status: 400,
      code: "context_length",
    };
  }

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
