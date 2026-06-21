"use client";

import { useState } from "react";
import { cleanStarBullet, parsePremiumReport } from "@/lib/format-premium-report";

type Props = { content: string };

function isCopyableSection(title: string): boolean {
  return /STAR/i.test(title) || /ATS|高频关键词/i.test(title);
}

function linesToCopyText(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, ""))
    .join("\n");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-medium text-gold hover:bg-gold/20 transition"
    >
      {copied ? "✓ 已复制" : "📋 一键复制改写结果"}
    </button>
  );
}

function SectionHeader({ title, copyText }: { title: string; copyText?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <h4 className="text-sm font-semibold text-accent">{title}</h4>
      {copyText ? <CopyButton text={copyText} /> : null}
    </div>
  );
}

function Section({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0">
      <SectionHeader title={title} copyText={copyText} />
      {children}
    </section>
  );
}

function Markdownish({ text }: { text: string }) {
  const blocks = text.split(/\n(?=## )/);

  return (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.trim().split("\n");
        const first = lines[0] || "";
        if (first.startsWith("## ")) {
          const title = first.replace(/^##\s*/, "");
          const bodyLines = lines.slice(1);
          const copyText = isCopyableSection(title) ? linesToCopyText(bodyLines) : undefined;
          return (
            <section key={i}>
              <SectionHeader title={title} copyText={copyText} />
              <div className="space-y-2">
                {bodyLines.map((line, j) => {
                  const t = line.trim();
                  if (!t) return null;
                  if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) {
                    return (
                      <p key={j} className="pl-1">
                        {t.replace(/^[-*]\s*/, "• ")}
                      </p>
                    );
                  }
                  return (
                    <p key={j} className="text-gray-300">
                      {t}
                    </p>
                  );
                })}
              </div>
            </section>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}

export default function PremiumReport({ content }: Props) {
  const parsed = parsePremiumReport(content);

  if (parsed.plainText) {
    return <Markdownish text={parsed.plainText} />;
  }

  const hasContent =
    parsed.issues.length > 0 ||
    parsed.starBullets.length > 0 ||
    parsed.atsKeywords.length > 0 ||
    parsed.interviews.length > 0;

  if (!hasContent) {
    return (
      <p className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
        {content}
      </p>
    );
  }

  const starCopyText = parsed.starBullets.map((item) => cleanStarBullet(item)).join("\n\n");
  const atsCopyText = parsed.atsKeywords
    .map((kw) => (kw.position ? `${kw.keyword} — ${kw.position}` : kw.keyword))
    .join("\n");

  return (
    <div className="space-y-1 text-sm text-gray-300 leading-relaxed">
      {parsed.issues.length > 0 && (
        <Section title="致命问题诊断">
          <ol className="list-decimal list-inside space-y-2">
            {parsed.issues.map((issue, i) => (
              <li key={i}>{issue.replace(/^致命问题\d+[：:]\s*/, "")}</li>
            ))}
          </ol>
        </Section>
      )}

      {parsed.starBullets.length > 0 && (
        <Section title="STAR 法则像素级改写" copyText={starCopyText}>
          <ul className="space-y-3">
            {parsed.starBullets.map((item, i) => (
              <li key={i} className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-gray-200">
                {cleanStarBullet(item)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {parsed.atsKeywords.length > 0 && (
        <Section title="ATS 高频关键词植入建议" copyText={atsCopyText}>
          <ul className="space-y-2">
            {parsed.atsKeywords.map((kw, i) => (
              <li key={i} className="border-l-2 border-glow/40 pl-3">
                <span className="text-glow font-medium">{kw.keyword}</span>
                {kw.position && (
                  <p className="text-gray-400 text-xs mt-0.5">{kw.position}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {parsed.interviews.length > 0 && (
        <Section title="面试必问题预测">
          <ul className="space-y-3">
            {parsed.interviews.map((item, i) => (
              <li key={i} className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 whitespace-pre-wrap">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
