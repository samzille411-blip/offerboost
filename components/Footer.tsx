"use client";

import { useEffect, useRef, useState } from "react";

export default function Footer() {
  const [clicks, setClicks] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const legacy = process.env.NEXT_PUBLIC_LEGACY_SITE_URL || "http://120.27.247.36/";
  const compliance =
    process.env.NEXT_PUBLIC_COMPLIANCE_NOTICE ||
    "本站为 AI 简历优化工具展示平台，不涉及在线交易；卡密请通过合作平台获取。";
  const icp = process.env.NEXT_PUBLIC_ICP || "";

  const onHiddenClick = () => {
    const next = clicks + 1;
    setClicks(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setClicks(0), 6000);
    if (next >= 5) {
      setClicks(0);
      window.location.href = legacy;
    }
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <footer className="border-t border-gray-800 mt-16 py-8 text-center text-xs text-gray-500 space-y-4">
      <div className="max-w-2xl mx-auto px-4">
        <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3.5 text-left sm:text-center leading-relaxed text-emerald-100/90">
          <span className="font-semibold text-emerald-300">🛡️ 安全防线：</span>
          本站采用阅后即焚机制。不设注册、不留日志、不存储任何简历和 JD 文本。您的个人隐私与求职轨迹，除您自身浏览器外，在这个世界上不留任何痕迹。
        </p>
      </div>
      <p
        className="cursor-default select-none"
        data-admin-hidden
        onClick={onHiddenClick}
      >
        {compliance}
      </p>
      <p>
        <a href={legacy} className="hover:text-gray-300 underline-offset-2 hover:underline">
          历史站点
        </a>
        {icp && (
          <>
            {" "}
            ·{" "}
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
              {icp}
            </a>
          </>
        )}
      </p>
      <p>© {new Date().getFullYear()} OfferBoost</p>
    </footer>
  );
}
