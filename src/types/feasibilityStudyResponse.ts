/**
 * Unified AI feasibility JSON shape — matches `feasibilityJsonOutputContract()` in
 * `src/services/prompt.service.js`. Import this in your frontend app for typing/parsing.
 */

export interface FeasibilityStudyCosts {
  establishment: string;
  operating: string;
}

export type FeasibilityRiskLevel = "منخفض" | "متوسط" | "مرتفع";

export type MarketReadinessLabel = "ضعيف" | "مقبول" | "جيد" | "ممتاز";

/**
 * Root object returned by the model (Arabic text in string fields).
 */
export interface FeasibilityStudyResponse {
  executiveSummary: string;
  executiveTags: string[];
  riskLevel: FeasibilityRiskLevel;
  riskScore: number;
  roiPercent: number;
  roiTrend: number[];
  marketReadinessScore: number;
  marketReadinessLabel: MarketReadinessLabel;
  marketAndCustomersAnalysis: string;
  competitorsAnalysis: string;
  operationsModel: string;
  marketingAndSalesPlan: string;
  costs: FeasibilityStudyCosts;
  revenueAndProfitOutlook: string;
  technicalRequirements: string;
  risksAndMitigation: string;
  recommendations: string;
  ninetyDayActionPlan: string;
}
