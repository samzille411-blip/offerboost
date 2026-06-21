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
  rateLimitedIp: "您操作较频繁，请 1 分钟后再试",
  globalQueue: "当前使用人数较多，请稍候片刻后再试",
} as const;

export const LLM_BLOCKED_MARKER = "[[BLOCKED]]";

export function isBlockedLlmOutput(text: string): boolean {
  return (
    text.includes(LLM_BLOCKED_MARKER) ||
    text.includes("检测到违规内容，无法优化") ||
    text.includes("检测到违规内容")
  );
}
