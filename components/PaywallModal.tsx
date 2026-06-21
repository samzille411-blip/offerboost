"use client";

import { TierInfo } from "@/lib/constants";
import { UnlockErrorCode, userMessages } from "@/lib/user-messages";

type Props = {
  open: boolean;
  onClose: () => void;
  tiers: TierInfo[];
  cardCode: string;
  onCardCodeChange: (v: string) => void;
  onUnlock: () => void;
  loading: boolean;
  unlockError?: { code: UnlockErrorCode; message: string } | null;
};

function suggestTierId(cardCode: string): TierInfo["id"] | null {
  const upper = cardCode.trim().toUpperCase();
  if (upper.startsWith("EXP_")) return "exp";
  if (upper.startsWith("STD_")) return "std";
  if (upper.startsWith("VIP_")) return "vip";
  return null;
}

export default function PaywallModal({
  open,
  onClose,
  tiers,
  cardCode,
  onCardCodeChange,
  onUnlock,
  loading,
  unlockError,
}: Props) {
  if (!open) return null;

  const exhausted = unlockError?.code === "card_exhausted";
  const notFound = unlockError?.code === "card_not_found";
  const showAlert = exhausted || notFound || unlockError?.code === "unlock_error";
  const highlightId = exhausted ? suggestTierId(cardCode) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-700 bg-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {exhausted ? userMessages.cardExhaustedTitle : "解锁完整 AI 优化报告"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {showAlert && (
          <div
            role="alert"
            className={`mb-5 rounded-xl border-2 px-4 py-4 ${
              exhausted
                ? "border-amber-400/70 bg-amber-950/50"
                : notFound
                  ? "border-orange-400/60 bg-orange-950/40"
                  : "border-red-400/50 bg-red-950/40"
            }`}
          >
            <p
              className={`font-bold leading-snug ${
                exhausted ? "text-lg text-amber-100" : "text-base text-red-100"
              }`}
            >
              {exhausted
                ? userMessages.cardExhaustedTitle
                : notFound
                  ? "激活码无效"
                  : "验证未通过"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">
              {exhausted
                ? userMessages.cardExhaustedBody
                : notFound
                  ? userMessages.cardNotFoundBody
                  : unlockError?.message}
            </p>
            {exhausted && (
              <p className="mt-3 text-sm font-medium text-gold">
                👇 请在下方选择档位，前往合作平台购买新激活码
              </p>
            )}
          </div>
        )}

        {!exhausted && (
          <>
            <p className="text-sm text-gray-400 mb-1">
              本站为工具展示平台，不涉及在线交易。请通过合作平台获取激活码后输入验证。
            </p>
            <p className="text-xs text-gold/90 mb-4">
              体验版 1 元起 · STAR 改写 · ATS 关键词 · 面试题预测
            </p>
          </>
        )}

        <div className="space-y-3 mb-5">
          {tiers.map((t) => {
            const highlighted = highlightId === t.id;
            return (
              <div
                key={t.id}
                className={`rounded-xl border p-4 transition ${
                  highlighted
                    ? "border-gold bg-gold/10 ring-2 ring-gold/40"
                    : "border-gray-800 bg-black/40"
                }`}
              >
                {highlighted && (
                  <p className="text-xs font-semibold text-gold mb-2">推荐续购 · 与您刚才使用的档位相同</p>
                )}
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
                  className={`inline-block w-full text-center rounded-lg font-semibold py-2.5 text-sm transition ${
                    highlighted
                      ? "bg-gold hover:bg-gold/90 text-black"
                      : "bg-gold/90 hover:bg-gold text-black"
                  }`}
                >
                  {exhausted ? "立即购买新激活码" : "前往获取激活码"}
                </a>
              </div>
            );
          })}
        </div>

        <label className="block text-sm text-gray-400 mb-2">
          {exhausted ? "购卡后在此输入新激活码" : "已有激活码？输入后验证解锁"}
        </label>
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
