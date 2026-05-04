/**
 * موحّد مع واجهة TypeScript: `src/types/feasibilityStudyResponse.ts`
 * @returns {string}
 */
function feasibilityJsonOutputContract() {
  return `
صيغة الإخراج (إلزامية وموحّدة لكل الردود):
- أرجع كائن JSON واحد فقط بالمفاتيح التالية بالضبط (أسماء بالإنجليزية كما هي)، والمحتوى نص عربي كامل في كل حقل:

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
  "ninetyDayActionPlan": "..."
}

قواعد صارمة:
- لا تُضف مفاتيح أخرى في الجذر، ولا تغيّر أسماء المفاتيح.
- الحقل costs يجب أن يكون كائنًا يحتوي فقط establishment و operating.
- كل القيم النصية ضمن JSON بين علامتي تنصيص مزدوجة صالحة لـ JSON.
- لا تستخدم markdown أو أي نص خارج كائن JSON واحد.
- لا تستخدم '''json أو وسوم اللغة — أرجع JSON خام فقط يبدأ بـ { وينتهي بـ }.
- المحتوى العربي يملأ الحقول حسب أسمائها (ملخص، تحليل، خطط، إلخ).
`;
}

/** @param {Record<string, string | number>} data */
const buildFeasibilityPrompt = (data) => {
  const answer = (value) =>
    value == null || value === "" ? "غير محدد" : value;

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

المطلوب في المحتوى (ضعها في الحقول المناسبة في JSON الموحّد أدناه):
- ملخص تنفيذي
- تحليل السوق والعملاء
- تحليل المنافسين
- التكاليف المتوقعة (تأسيس + تشغيل ضمن costs)
- توقع الإيرادات والأرباح
- المخاطر وخطط التخفيف
- توصيات عملية وخطة 90 يوم ضمن الحقول المناسبة

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

المطلوب في الدراسة:
- ملخص تنفيذي
- تحليل السوق والعملاء
- تحليل المنافسين
- نموذج التشغيل والتنفيذ
- خطة تسويق ومبيعات
- تقدير التكاليف (تأسيس + تشغيل)
- توقع الإيرادات والأرباح
- تحليل المخاطر وخطط التخفيف
- توصيات عملية وخطة 90 يوم

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
