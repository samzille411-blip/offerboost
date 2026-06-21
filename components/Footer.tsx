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
    <footer className="border-t border-gray-800 mt-16 py-8 text-center text-xs text-gray-500 space-y-2">
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
