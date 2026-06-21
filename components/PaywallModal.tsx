"use client";

import { TierInfo } from "@/lib/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  tiers: TierInfo[];
  cardCode: string;
  onCardCodeChange: (v: string) => void;
  onUnlock: () => void;
  loading: boolean;
};

export default function PaywallModal({
  open,
  onClose,
  tiers,
  cardCode,
  onCardCodeChange,
  onUnlock,
  loading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">解锁完整 AI 优化报告</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-400 mb-1">
          本站为工具展示平台，不涉及在线交易。请通过合作平台获取激活码后输入验证。
        </p>
        <p className="text-xs text-gold/90 mb-4">体验版 1 元起 · STAR 改写 · ATS 关键词 · 面试题预测</p>

        <div className="space-y-3 mb-5">
          {tiers.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-800 bg-black/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-accent">{t.name}</span>
                <span className="text-xs text-gray-500">{t.desc}</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 mb-3">
                {t.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
              <a
                href={t.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center rounded-lg bg-gold/90 hover:bg-gold text-black font-semibold py-2 text-sm transition"
              >
                前往获取激活码
              </a>
            </div>
          ))}
        </div>

        <label className="block text-sm text-gray-400 mb-2">已有激活码？输入后验证解锁</label>
        <input
          value={cardCode}
          onChange={(e) => onCardCodeChange(e.target.value)}
          placeholder="例如 EXP_xxxx / STD_xxxx"
          className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm mb-3 focus:border-accent outline-none"
        />
        <button
          onClick={onUnlock}
          disabled={loading || !cardCode.trim()}
          className="w-full rounded-lg bg-accent hover:bg-cyan-400 text-black font-bold py-3 disabled:opacity-50"
        >
          {loading ? "AI 生成中…" : "验证并解锁"}
        </button>
      </div>
    </div>
  );
}
