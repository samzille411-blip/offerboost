export const LS_CARD = "offerboost_card";
export const LS_REPORT = "offerboost_report";
export const LS_INPUTS = "offerboost_inputs";
export const SS_LLM_PROBE = "offerboost_llm_probe_at";

/** 浏览器会话内探活缓存（毫秒），与 LLM_PROBE_CACHE_MS 保持一致 */
export const LLM_PROBE_CLIENT_TTL_MS = 3600000;

export type AnalyzeResult = {
  score: number;
  issues: string[];
  summary?: string;
};

export type TierInfo = {
  id: "exp" | "std" | "vip";
  name: string;
  desc: string;
  bullets: string[];
  shopUrl: string;
};

export function getTiers(): TierInfo[] {
  return [
    {
      id: "exp",
      name: "体验版",
      desc: "1 次深度优化",
      bullets: ["快速定位核心硬伤", "简短改写示范"],
      shopUrl: process.env.NEXT_PUBLIC_SHOP_URL_EXP || "#",
    },
    {
      id: "std",
      name: "标准版",
      desc: "10 次 · 推荐",
      bullets: ["STAR 法则像素级改写", "ATS 高频关键词植入"],
      shopUrl: process.env.NEXT_PUBLIC_SHOP_URL_STD || "#",
    },
    {
      id: "vip",
      name: "冲刺版",
      desc: "25 次全套",
      bullets: ["含标准版全部能力", "3 道面试题预测 + 回答策略"],
      shopUrl: process.env.NEXT_PUBLIC_SHOP_URL_VIP || "#",
    },
  ];
}
