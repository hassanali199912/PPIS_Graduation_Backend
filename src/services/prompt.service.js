/**
 * موحّد مع واجهة TypeScript: `src/types/feasibilityStudyResponse.ts`
 * @returns {string}
 */
function feasibilityJsonOutputContract() {
  return `
صيغة الإخراج (إلزامية وموحّدة لكل الردود):
- أرجع كائن JSON واحد فقط بالمفاتيح التالية بالضبط (أسماء بالإنجليزية كما هي).
- الحقول النصية الطويلة: محتوى عربي كامل.
- الحقل financialDashboard: أرقام محسوبة من إجابات هذا المشروع فقط — ليست قيمًا ثابتة.

هيكل JSON (التزم بالمفاتيح؛ استبدل كل قيمة رقمية بحسابك الخاص):

{
  "executiveSummary": "...",
  "marketAndCustomersAnalysis": "...",
  "competitorsAnalysis": "...",
  "operationsModel": "...",
  "marketingAndSalesPlan": "...",
  "costs": {
    "establishment": "...",
    "operating": "..."
  },
  "revenueAndProfitOutlook": "...",
  "risksAndMitigation": "...",
  "recommendations": "...",
  "ninetyDayActionPlan": "...",
  "financialDashboard": {
    "currency": "EGP",
    "kpis": {
      "breakEvenPoint": "<نص عربي قصير>",
      "monthlyRevenue": <integer>,
      "monthlyNetProfit": <integer>,
      "monthlyOperatingCosts": <integer>,
      "profitMarginPercent": <number>
    },
    "monthlyProjections": [
      { "month": 1, "labelAr": "الشهر 1", "revenue": <integer>, "totalCost": <integer>, "netProfit": <integer> }
      /* ... 6 عناصر بالضبط (month 1–6) — قيم مختلفة شهرًا بشهر */
    ],
    "capitalDistribution": {
      "total": <integer>,
      "items": [
        { "key": "<englishKey>", "labelAr": "<عربي>", "amount": <integer>, "percentage": <number>, "details": "<اختياري>" }
      ]
    },
    "revenueSources": {
      "totalMonthly": <integer>,
      "items": [ /* 3–4 مصادر مرتبطة بـ q10/q11 */ ]
    },
    "operatingCostsBreakdown": {
      "totalMonthly": <integer>,
      "items": [ /* 4–5 بنود مرتبطة بـ q18 ونوع النشاط */ ]
    }
  }
}

قواعد financialDashboard (صارمة):
- currency دائما "EGP".
- كل الأرقام يجب أن تُشتق من «مراسي مالية إلزامية» أعلاه (q10–q12, q16–q20) — لا تستخدم أرقامًا عامة أو متكررة بين المشاريع.
- kpis.breakEvenPoint: نص عربي قصير مخصص لهذا المشروع.
- monthlyNetProfit ≈ monthlyRevenue - monthlyOperatingCosts (±5%).
- profitMarginPercent ≈ (monthlyNetProfit / monthlyRevenue) × 100 عندما revenue > 0.
- monthlyProjections: 6 أشهر بتدرّج منطقي (غالبًا شهر 1–2 أقل ثم نمو) — لا تكرر نفس revenue/totalCost/netProfit في كل شهر.
- capitalDistribution.total ≈ رأس المال من q16 (بعد تحويله لرقم إن كان نصًا).
- revenueSources.totalMonthly ≈ kpis.monthlyRevenue؛ operatingCostsBreakdown.totalMonthly ≈ kpis.monthlyOperatingCosts.
- مجموع items[].percentage في كل قسم ≈ 100.
- labels و keys و amounts تختلف حسب نوع النشاط (q2/q9) — لا تنسخ نفس المصادر أو بنود التكلفة لمشاريع مختلفة.

قواعد عامة:
- لا تُضف مفاتيح أخرى في الجذر خارج القائمة أعلاه.
- costs يبقى كائنًا نصيًا (establishment, operating) للتحليل المكتوب.
- financialDashboard منفصل للرسوم البيانية في الواجهة.
- لا markdown — JSON خام فقط يبدأ بـ { وينتهي بـ }.
`;
}

/** @param {Record<string, string | number | undefined>} data */
function buildFinancialAnchors(data) {
  const answer = (value) =>
    value == null || value === "" ? "غير محدد" : value;

  return `
مراسي مالية إلزامية — اشتق financialDashboard منها فقط (مخصصة لهذا المشروع):

| المرجع | إجابة المستخدم |
|--------|----------------|
| فكرة المشروع (q1) | ${answer(data.q1)} |
| نوع النشاط (q2) | ${answer(data.q2)} |
| نموذج الإيراد (q10) | ${answer(data.q10)} |
| قنوات الوصول (q11) | ${answer(data.q11)} |
| حجم البداية (q12) | ${answer(data.q12)} |
| رأس المال (q16) | ${answer(data.q16)} |
| مصدر التمويل (q17) | ${answer(data.q17)} |
| أهم بنود الصرف (q18) | ${answer(data.q18)} |
| سياسة التسعير (q19) | ${answer(data.q19)} |
| توقع الأرباح الشهرية (q20) | ${answer(data.q20)} |
| توقع الطلب (q21) | ${answer(data.q21)} |
| المواسم (q22) | ${answer(data.q22)} |

خطوات الحساب (نفّذها قبل كتابة JSON):
1. حوّل q16 إلى رقم EGP لـ capitalDistribution.total (مثلاً "500 ألف" → 500000).
2. اجعل kpis.monthlyNetProfit متسقًا مع q20 (±20% واقعيًا حسب q21/q22).
3. monthlyOperatingCosts = monthlyRevenue - monthlyNetProfit.
4. revenueSources: 3–4 بنود من q10/q11 (مثلاً فرع، توصيل، أونلاين — حسب الإجابات).
5. operatingCostsBreakdown: 4–5 بنود من q18 ونوع النشاط q2.
6. monthlyProjections: 6 أشهر بقيم مختلفة تعكس ramp-up ثم استقرار/نمو.

تحذير: إذا كانت إجابة q16 أو q20 «غير محدد»، قدّر نطاقًا واقعيًا لحجم q12 ونوع q2 في السوق المصري — ولا تستخدم أرقامًا افتراضية ثابتة بين المشاريع.
`;
}

/** @param {Record<string, string | number>} data */
const buildFeasibilityPrompt = (data) => {
  const answer = (value) =>
    value == null || value === "" ? "غير محدد" : value;

  const financialAnchors = buildFinancialAnchors(data);
  const financialDashboardHint = `
مهم للواجهة الأمامية (financialDashboard):
- KPI cards: نقطة التعادل، الإيرادات الشهرية، صافي الربح، التكاليف التشغيلية.
- Bar chart: monthlyProjections × 6 أشهر.
- Donut/bar: capitalDistribution، revenueSources، operatingCostsBreakdown.
- كل رقم في financialDashboard يجب أن يختلف بين المشاريع حسب جدول المراسي المالية أدناه.
`;

  // Backward-compatible: if old payload is used, keep existing prompt style.
  if (!data.q1 && data.project_name) {
    return `
أنت خبير دراسات جدوى.

قم بإنشاء دراسة جدوى شاملة للمشروع التالي:

اسم المشروع: ${data.project_name}
الوصف: ${data.description}
الموقع: ${data.location}
الفئة المستهدفة: ${data.target_audience}
الميزانية: ${data.budget}
نمط العلامة التجارية: ${data.brand_style}

${financialAnchors}

${financialDashboardHint}

${feasibilityJsonOutputContract()}
`;
  }

  return `
أنت خبير دراسات جدوى محترف.

قم بإعداد دراسة جدوى كاملة بناء على إجابات المستخدم في التالية (24 سؤال):

[المرحلة الأولى: الهوية]
1) إيه هي فكرة مشروعك؟ => ${answer(data.q1)}
2) تصنيف نشاط المشروع الرئيسي؟ => ${answer(data.q2)}
3) الوضع القانوني الحالي؟ => ${answer(data.q3)}

[المرحلة الثانية: السوق والعملاء]
4) من هو العميل المستهدف؟ => ${answer(data.q4)}
5) النطاق الجغرافي للنشاط؟ => ${answer(data.q5)}
6) ليه العميل هيختارك أنت بالذات؟ => ${answer(data.q6)}
7) حالة السوق اللي هتدخله؟ => ${answer(data.q7)}
8) مين منافسينك الأساسيين؟ => ${answer(data.q8)}

[المرحلة الثالثة: التشغيل والتنفيذ]
9) هتقدم منتجك للناس إزاي؟ => ${answer(data.q9)}
10) هتكسب فلوسك إزاي؟ => ${answer(data.q10)}
11) هتوصل للناس إزاي؟ => ${answer(data.q11)}
12) ناوي تبدأ بمشروع حجمه قد إيه؟ => ${answer(data.q12)}
13) الاحتياج التكنولوجي؟ => ${answer(data.q13)}
14) مستوى خبرة فريقك؟ => ${answer(data.q14)}
15) سهولة تلاقي موظفين شاطرين؟ => ${answer(data.q15)}

[المرحلة الرابعة: التوقعات المالية]
16) رأس المال اللي هتبدأ بيه؟ => ${answer(data.q16)}
17) هتجيب الفلوس منين؟ => ${answer(data.q17)}
18) أكتر حاجة هتصرف فيها فلوس؟ => ${answer(data.q18)}
19) هتسعر منتجك بناء على إيه؟ => ${answer(data.q19)}
20) توقعك للأرباح الشهرية؟ => ${answer(data.q20)}

[المرحلة الخامسة: التوقعات والمخاطر]
21) شايف الطلب على فكرتك هيكون إزاي؟ => ${answer(data.q21)}
22) هل مشروعك مرتبط بمواسم معينة؟ => ${answer(data.q22)}
23) أكبر خطر ممكن يواجهك؟ => ${answer(data.q23)}
24) طموحك إيه بعد سنتين؟ => ${answer(data.q24)}

${financialAnchors}

${financialDashboardHint}

${feasibilityJsonOutputContract()}
`;
};

/**
 * يضيف مقتطفات دراسة السوق (من RAG) أسفل الـ prompt الأساسي.
 * @param {string} basePrompt
 * @param {string} ragContext ناتج getRelevantContext — فارغ يُهمل
 */
function mergeFeasibilityPromptWithRag(basePrompt, ragContext) {
  const ctx = ragContext && String(ragContext).trim();
  if (!ctx) return basePrompt;
  return `${basePrompt}

استخدم أيضًا المقتطفات التالية من دراسة السوق المرجعية عند بناء الدراسة:
- إذا تعارض المرجع مع إجابات المستخدم، أوضح ذلك في التحليل ولا تنسخ حرفيًا دون تمييز.

--- بداية المرجع ---
${ctx}
--- نهاية المرجع ---
`;
}

module.exports = {
  buildFeasibilityPrompt,
  mergeFeasibilityPromptWithRag,
  feasibilityJsonOutputContract,
};
