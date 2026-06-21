export const LS_CARD = "offerboost_card";
export const LS_REPORT = "offerboost_report";
export const LS_INPUTS = "offerboost_inputs";

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
