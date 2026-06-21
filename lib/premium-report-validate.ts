import { formatPremiumReportDisplay, parsePremiumReport } from "@/lib/format-premium-report";

/** 检查付费报告是否包含该档位要求的全部章节 */
export function isPremiumReportComplete(raw: string, level: number): boolean {
  const formatted = formatPremiumReportDisplay(raw);
  const parsed = parsePremiumReport(raw);

  if (level === 1) {
    return (
      (/##\s*硬伤诊断/i.test(formatted) || parsed.issues.length >= 2) &&
      (/##\s*STAR/i.test(formatted) || parsed.starBullets.length >= 1) &&
      (/##\s*ATS/i.test(formatted) || parsed.atsKeywords.length >= 2)
    );
  }

  const hasFatal =
    /##\s*致命问题/i.test(formatted) || parsed.issues.length >= 3;
  const hasStar =
    /##\s*STAR/i.test(formatted) || parsed.starBullets.length >= 2;
  const hasAts =
    /##\s*ATS/i.test(formatted) || parsed.atsKeywords.length >= 3;
  const hasInterview =
    /##\s*面试/i.test(formatted) || parsed.interviews.length >= 2;

  if (level === 2) {
    return hasFatal && hasStar && hasAts;
  }

  return hasFatal && hasStar && hasAts && hasInterview;
}
