import { normalizeInputText } from "@/lib/content-hash";
import type { AnalyzeResult } from "@/lib/constants";

/** 右侧体验诱饵：示例简历 + JD（故意留硬伤，便于展示免费诊断效果） */
export const DEMO_RESUME = `张三 | 产品运营
电话：138****1234 | 邮箱：zhangsan@email.com

工作经历
某互联网公司 | 产品运营 | 2021.07 - 至今
- 负责多个运营项目，参与需求讨论和活动策划
- 与产品、设计协作推进功能上线
- 日常数据整理与周报撰写

某电商公司 | 运营助理 | 2019.07 - 2021.06
- 协助店铺活动执行与客服对接
- 整理用户反馈

技能：Excel、PPT、沟通能力、学习能力
教育：某大学 市场营销 本科`;

export const DEMO_JD = `高级产品运营（用户增长方向）

岗位职责：
1. 负责核心产品用户增长与留存，制定并落地增长策略
2. 基于漏斗、留存、转化等数据诊断问题并推动优化
3. 撰写 PRD，协调研发与设计按时交付
4. 策划并复盘 A/B 测试与大型运营活动

任职要求：
1. 3年以上互联网产品/运营经验，有完整增长项目案例
2. 熟练使用 SQL、Excel，能独立做漏斗与留存分析
3. 熟悉 AARRR、GMV、DAU 等指标，有量化成果者优先
4. 本科及以上学历，逻辑清晰、抗压能力强`;

/** 示例数据固定诊断（演示用，避免 LLM 随机波动影响信任） */
export const DEMO_ANALYZE_RESULT: AnalyzeResult = {
  score: 22,
  inputValid: true,
  summary:
    "简历偏基础运营执行，与高级增长岗位要求差距大，需补充增长类案例和数据能力证明。",
  issues: [
    "完全没有用户增长策略与 A/B 测试项目经历，与 JD 核心职责严重脱节",
    "JD 明确要求 SQL 技能，简历中未体现，无法证明漏斗/留存数据分析能力",
    "工作经历描述空洞，缺乏量化数据和具体成果，无法支撑高级岗位",
  ],
};

export function isDemoAnalyzeInput(resume: string, jd: string): boolean {
  return (
    normalizeInputText(resume) === normalizeInputText(DEMO_RESUME) &&
    normalizeInputText(jd) === normalizeInputText(DEMO_JD)
  );
}
