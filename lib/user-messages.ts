/** 面向用户的提示文案（温和、可预期） */
export const userMessages = {
  emptyResumeJd: "请粘贴您的简历和目标岗位 JD 后再开始分析",
  emptyUnlock: "请填写卡密、简历与目标岗位 JD 后再解锁",
  invalidContent:
    "暂时无法识别您填写的内容，请补充真实的简历信息与岗位 JD 后重试",
  blockedContent: "当前内容不符合使用规范，请修改后重试",
  parseFailed: "分析暂时遇到问题，请稍后重试",
  tooLong: "内容过长，请精简后重试",
  rateLimited: "操作过于频繁，请稍后再试",
  rateLimitedIp: "您点得频繁了些，请稍等一分钟~",
  globalQueue:
    "当前 OfferBoost 全网匹配人数较多，请稍候 5~10 秒再次点击。感谢您的耐心！",
  cardExhaustedTitle: "该卡密次数已用完",
  cardExhaustedBody:
    "这张激活码的所有次数已消耗完毕。请购买新卡密，继续解锁 STAR 改写、ATS 关键词与面试预测。",
  cardNotFoundBody: "未找到该激活码，请核对后重试，或通过下方合作平台获取。",
} as const;

export type UnlockErrorCode = "card_exhausted" | "card_not_found" | "unlock_error";

export function classifyUnlockError(message: string, httpStatus?: number): UnlockErrorCode {
  if (httpStatus === 403 || message.includes("已耗尽") || message.includes("次数已用完")) {
    return "card_exhausted";
  }
  if (httpStatus === 404 || message.includes("不存在")) {
    return "card_not_found";
  }
  return "unlock_error";
}

export const LLM_BLOCKED_MARKER = "[[BLOCKED]]";

export function isBlockedLlmOutput(text: string): boolean {
  return (
    text.includes(LLM_BLOCKED_MARKER) ||
    text.includes("检测到违规内容，无法优化") ||
    text.includes("检测到违规内容")
  );
}
