export type ScoreStyle = {
  textClass: string;
  glowClass: string;
  badgeClass: string;
  barClass: string;
  label: string;
};

/** 匹配度分数 → 视觉样式（红 / 橙 / 黄 / 青 / 绿） */
export function getScoreStyle(score: number): ScoreStyle {
  if (score < 40) {
    return {
      textClass: "text-red-500",
      glowClass: "drop-shadow-[0_0_14px_rgba(239,68,68,0.75)]",
      badgeClass: "bg-red-500/15 text-red-400 border-red-500/50",
      barClass: "bg-red-500",
      label: "匹配偏低",
    };
  }
  if (score < 60) {
    return {
      textClass: "text-orange-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(251,146,60,0.7)]",
      badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/50",
      barClass: "bg-orange-400",
      label: "有待提升",
    };
  }
  if (score < 75) {
    return {
      textClass: "text-amber-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/50",
      barClass: "bg-amber-400",
      label: "中等匹配",
    };
  }
  if (score < 90) {
    return {
      textClass: "text-cyan-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(34,211,238,0.65)]",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/50",
      barClass: "bg-cyan-400",
      label: "较好匹配",
    };
  }
  return {
    textClass: "text-emerald-400",
    glowClass: "drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/50",
    barClass: "bg-emerald-400",
    label: "高度匹配",
  };
}
