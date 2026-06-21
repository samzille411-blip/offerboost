import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OfferBoost — AI 简历智能优化",
  description: "粘贴简历与 JD，AI 匹配诊断与深度优化",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
