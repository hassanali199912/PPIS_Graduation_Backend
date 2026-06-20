/**
 * Unified AI feasibility JSON shape — matches `feasibilityJsonOutputContract()` in
 * `src/services/prompt.service.js`. Import this in your frontend app for typing/parsing.
 */

export interface FeasibilityStudyCosts {
  establishment: string;
  operating: string;
}

/** Single slice for donut / bar charts (capital, revenue, costs) */
export interface FinancialBreakdownItem {
  /** Stable key for frontend mapping, e.g. "directSales" */
  key: string;
  /** Arabic label shown in UI, e.g. "مبيعات مباشرة في الفرع" */
  labelAr: string;
  /** Amount in EGP */
  amount: number;
  /** Share 0–100; items in the same group should sum to ~100 */
  percentage: number;
  /** Optional short Arabic note, e.g. establishment cost details */
  details?: string;
}

/** One month in the 6-month revenue/cost/profit bar chart */
export interface MonthlyFinancialProjection {
  /** 1–6 */
  month: number;
  /** Display label, e.g. "الشهر 1" */
  labelAr: string;
  revenue: number;
  totalCost: number;
  netProfit: number;
}

/** KPI cards row — التوقعات المالية */
export interface FinancialKpis {
  /** e.g. "6-8 أسابيع" */
  breakEvenPoint: string;
  monthlyRevenue: number;
  monthlyNetProfit: number;
  monthlyOperatingCosts: number;
  /** Optional, e.g. 25 */
  profitMarginPercent?: number;
}

/** Chart-ready block for the financial dashboard */
export interface FinancialDashboard {
  currency: "EGP";
  kpis: FinancialKpis;
  /** Exactly 6 months for the bar chart */
  monthlyProjections: MonthlyFinancialProjection[];
  capitalDistribution: {
    total: number;
    items: FinancialBreakdownItem[];
  };
  revenueSources: {
    totalMonthly: number;
    items: FinancialBreakdownItem[];
  };
  operatingCostsBreakdown: {
    totalMonthly: number;
    items: FinancialBreakdownItem[];
  };
}

/**
 * Root object returned by the model.
 * Text fields: Arabic narrative. financialDashboard: structured numbers for charts.
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
  financialDashboard: FinancialDashboard;
}
