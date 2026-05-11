/**
 * Unified AI feasibility JSON shape — matches `feasibilityJsonOutputContract()` in
 * `src/services/prompt.service.js`. Import this in your frontend app for typing/parsing.
 */

export interface FeasibilityStudyCosts {
  establishment: string;
  operating: string;
}

/**
 * Root object returned by the model (Arabic text in string fields).
 */
export interface FeasibilityStudyResponse {
  executiveSummary: string;
  marketAndCustomersAnalysis: string;
  competitorsAnalysis: string;
  operationsModel: string;
  marketingAndSalesPlan: string;
  costs: FeasibilityStudyCosts;
  revenueAndProfitOutlook: string;
  risksAndMitigation: string;
  recommendations: string;
  ninetyDayActionPlan: string;
}
