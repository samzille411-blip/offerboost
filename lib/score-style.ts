export type ScoreStyle = {
  /** 大分数字与进度条填充色（inline style，避免 Tailwind 未扫描 lib 导致样式丢失） */
  color: string;
  barColor: string;
  glow: string;
  textClass: string;
  glowClass: string;
  badgeClass: string;
  barClass: string;
  label: string;
};

/** 匹配度分数 → 视觉样式（红 / 橙 / 黄 / 青 / 绿） */
export function getScoreStyle(rawScore: number): ScoreStyle {
  const score = Math.min(100, Math.max(0, Number(rawScore) || 0));

  if (score < 40) {
    return {
      color: "#ef4444",
      barColor: "#ef4444",
      glow: "0 0 14px rgba(239,68,68,0.75)",
      textClass: "text-red-500",
      glowClass: "drop-shadow-[0_0_14px_rgba(239,68,68,0.75)]",
      badgeClass: "bg-red-500/15 text-red-400 border-red-500/50",
      barClass: "bg-red-500",
      label: "匹配偏低",
    };
  }
  if (score < 60) {
    return {
      color: "#fb923c",
      barColor: "#fb923c",
      glow: "0 0 14px rgba(251,146,60,0.7)",
      textClass: "text-orange-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(251,146,60,0.7)]",
      badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/50",
      barClass: "bg-orange-400",
      label: "有待提升",
    };
  }
  if (score < 75) {
    return {
      color: "#fbbf24",
      barColor: "#fbbf24",
      glow: "0 0 14px rgba(251,191,36,0.65)",
      textClass: "text-amber-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/50",
      barClass: "bg-amber-400",
      label: "中等匹配",
    };
  }
  if (score < 90) {
    return {
      color: "#22d3ee",
      barColor: "#22d3ee",
      glow: "0 0 14px rgba(34,211,238,0.65)",
      textClass: "text-cyan-400",
      glowClass: "drop-shadow-[0_0_14px_rgba(34,211,238,0.65)]",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/50",
      barClass: "bg-cyan-400",
      label: "较好匹配",
    };
  }
  return {
    color: "#34d399",
    barColor: "#34d399",
    glow: "0 0 16px rgba(52,211,153,0.8)",
    textClass: "text-emerald-400",
    glowClass: "drop-shadow-[0_0_16px_rgba(52,211,153,0.8)]",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/50",
    barClass: "bg-emerald-400",
    label: "高度匹配",
  };
}

export function clampScore(rawScore: number): number {
  return Math.min(100, Math.max(0, Number(rawScore) || 0));
}
