"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PaywallModal from "@/components/PaywallModal";
import Footer from "@/components/Footer";
import { AnalyzeResult, LS_CARD, LS_INPUTS, LS_REPORT, getTiers } from "@/lib/constants";

function uuid() {
  return crypto.randomUUID();
}

export default function HomePage() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [analyze, setAnalyze] = useState<AnalyzeResult | null>(null);
  const [aiReport, setAiReport] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [cardCode, setCardCode] = useState("");
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [error, setError] = useState("");

  const tiers = useMemo(() => getTiers(), []);

  useEffect(() => {
    try {
      const savedCard = localStorage.getItem(LS_CARD);
      const savedReport = localStorage.getItem(LS_REPORT);
      const savedInputs = localStorage.getItem(LS_INPUTS);
      if (savedInputs) {
        const p = JSON.parse(savedInputs);
        if (p.resume) setResume(p.resume);
        if (p.jd) setJd(p.jd);
      }
      if (savedCard) setCardCode(savedCard);
      if (savedReport) {
        setAiReport(savedReport);
        setUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistUnlock = useCallback((code: string, report: string, inputs: { resume: string; jd: string }) => {
    localStorage.setItem(LS_CARD, code);
    localStorage.setItem(LS_REPORT, report);
    localStorage.setItem(LS_INPUTS, JSON.stringify(inputs));
  }, []);

  const handleAnalyze = async () => {
    setError("");
    setLoadingAnalyze(true);
    setAnalyze(null);
    setUnlocked(false);
    setAiReport("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");
      setAnalyze(data);
      setShowPaywall(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const handleUnlock = async () => {
    setError("");
    setLoadingUnlock(true);
    const requestId = uuid();
    try {
      const res = await fetch("/api/use-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_code: cardCode, resume, jd, request_id: requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "验证失败");
      setAiReport(data.aiContent);
      setUnlocked(true);
      setShowPaywall(false);
      persistUnlock(cardCode, data.aiContent, { resume, jd });
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoadingUnlock(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-800 bg-black/50">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Offer<span className="text-accent">Boost</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">AI 简历智能匹配 · 像素级对标 JD</p>
          </div>
          <span className="text-xs text-glow border border-glow/30 rounded-full px-3 py-1">免注册使用</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">粘贴你的简历</label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={10}
              placeholder="工作经历、项目、技能…"
              className="w-full rounded-xl border border-gray-800 bg-panel p-4 text-sm focus:border-accent outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">粘贴目标岗位 JD</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={10}
              placeholder="岗位职责、任职要求…"
              className="w-full rounded-xl border border-gray-800 bg-panel p-4 text-sm focus:border-accent outline-none"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loadingAnalyze || !resume.trim() || !jd.trim()}
            className="w-full rounded-xl bg-accent hover:bg-cyan-400 text-black font-bold py-3 disabled:opacity-40 transition"
          >
            {loadingAnalyze ? "AI 分析中…" : "开始 AI 智能匹配"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-panel p-5 min-h-[420px]">
          {!analyze ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center px-6">
              请在左侧输入简历与 JD，点击「开始 AI 智能匹配」
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-glow">{analyze.score}</span>
                <span className="text-gray-400 text-sm pb-2">/ 100 匹配度</span>
              </div>
              {analyze.summary && <p className="text-sm text-gray-300">{analyze.summary}</p>}
              <div>
                <h3 className="text-sm font-semibold text-accent mb-2">毒舌硬伤诊断（免费）</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  {analyze.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ol>
              </div>

              <div className="relative rounded-xl border border-gray-800 bg-black/40 p-4 mt-4">
                {!unlocked && <div className="absolute inset-0 z-10 rounded-xl bg-black/30 backdrop-blur-[2px]" />}
                <div className={!unlocked ? "blur-lock" : ""}>
                  <h3 className="text-sm font-semibold text-gold mb-2">AI 深度优化报告</h3>
                  <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans leading-relaxed">
                    {unlocked && aiReport
                      ? aiReport
                      : "STAR 法则改写 · ATS 关键词 · 面试题预测…\n（验证卡密后显示完整内容）"}
                  </pre>
                </div>
                {!unlocked && (
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="absolute inset-x-4 bottom-4 z-20 rounded-lg bg-gold text-black font-bold py-2 text-sm"
                  >
                    获取卡密解锁完整报告
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        tiers={tiers}
        cardCode={cardCode}
        onCardCodeChange={setCardCode}
        onUnlock={handleUnlock}
        loading={loadingUnlock}
      />

      <Footer />
    </main>
  );
}
