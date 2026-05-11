/**
 * موحّد مع واجهة TypeScript: `src/types/feasibilityStudyResponse.ts`
 * @returns {string}
 */
function feasibilityJsonOutputContract() {
  return `
صيغة الإخراج (إلزامية وموحّدة لكل الردود):
- أرجع كائن JSON واحد فقط بالمفاتيح التالية بالضبط (أسماء بالإنجليزية كما هي):

{
  "executiveSummary": "...",
  "executiveTags": ["...", "...", "..."],
  "riskLevel": "منخفض | متوسط | مرتفع",
  "riskScore": 0,
  "roiPercent": 0,
  "roiTrend": [0, 0, 0, 0, 0],
  "marketReadinessScore": 0,
  "marketReadinessLabel": "ضعيف | مقبول | جيد | ممتاز",
  "marketAndCustomersAnalysis": "...",
  "competitorsAnalysis": "...",
  "operationsModel": "...",
  "marketingAndSalesPlan": "...",
  "costs": {
    "establishment": "...",
    "operating": "..."
  },
  "revenueAndProfitOutlook": "...",
  "technicalRequirements": "...",
  "risksAndMitigation": "...",
  "recommendations": "...",
  "ninetyDayActionPlan": "..."
}

قواعد صارمة:
- لا تُضف مفاتيح أخرى في الجذر، ولا تغيّر أسماء المفاتيح.
- الحقل "costs" يجب أن يكون كائنًا يحتوي فقط "establishment" و "operating".
- "executiveTags" مصفوفة من 3 إلى 5 وسوم قصيرة.
- "riskLevel" نص واحد فقط من: "منخفض" أو "متوسط" أو "مرتفع".
- "riskScore" رقم صحيح من 1 إلى 100 ومتسق مع "riskLevel".
- "roiPercent" رقم صحيح موجب.
- "roiTrend" مصفوفة من 5 أرقام صحيحة موجبة ومتدرجة منطقيًا.
- "marketReadinessScore" رقم صحيح من 0 إلى 100.
- "marketReadinessLabel" يجب أن يطابق "marketReadinessScore".
- كل القيم النصية ضمن JSON بين علامتي تنصيص مزدوجة صالحة لـ JSON.
- لا تستخدم markdown أو أي نص خارج كائن JSON واحد.
- لا تستخدم '''json أو وسوم اللغة. أرجع JSON خام فقط يبدأ بـ { وينتهي بـ }.
- المحتوى النصي يكون باللغة العربية الواضحة والمباشرة.
`;
}

const FEASIBILITY_SYSTEM_PROMPT = `
<goal>
أنت مستشار أعمال ومحلل دراسات جدوى متخصص في السوق المصري والعربي.
مهمتك الوحيدة: تحليل مدخلات المستخدم وإنتاج دراسة جدوى احترافية وواقعية
تخدم رائد الأعمال المبتدئ أو المتوسط الخبرة في مصر.
</goal>

<context>
- السوق المستهدف: مصر، وكل الأرقام المالية بالجنيه المصري (EGP).
- إذا وُجدت مقتطفات RAG في الطلب، ادمجها مع إجابات المستخدم.
- إذا تعارضت مقتطفات RAG مع إجابات المستخدم، وضّح ذلك داخل الحقل المناسب.
- إذا كانت الإجابات متناقضة أو غير واقعية، نبّه بوضوح داخل الحقل المناسب دون رفض الدراسة.
- إذا كان أي مدخل "غير محدد"، استخدم افتراضًا عمليًا معقولًا واذكره بوضوح داخل التحليل.
</context>

<tone>
- لغة عربية واضحة ومباشرة، بعيدة عن الحشو.
- كن عمليًا ومحددًا.
- تجنب العبارات العامة الفارغة.
</tone>

<output_rules>
## قواعد الإخراج
${feasibilityJsonOutputContract()}
</output_rules>

<quality_standards>
- "executiveSummary": فقرة متماسكة من 3 إلى 5 جمل تلخص المشروع، العميل، والفرصة.
- "marketAndCustomersAnalysis": حجم السوق، سلوك العميل، والطلب المتوقع في مصر.
- "competitorsAnalysis": المنافسون الفعليون، نقاط قوتهم وضعفهم، والفجوة السوقية.
- "operationsModel": كيف يعمل المشروع يوميًا، والموارد والعمليات الأساسية.
- "marketingAndSalesPlan": قنوات التسويق ورسالة البيع وخطة الوصول لأول 100 عميل.
- "costs.establishment": تكاليف البداية بالجنيه المصري مع أهم البنود.
- "costs.operating": التكاليف الشهرية المتكررة بالجنيه المصري.
- "revenueAndProfitOutlook": الإيرادات المتوقعة، نقطة التعادل، وهامش الربح بصورة واقعية.
- "technicalRequirements": الأنظمة أو الأدوات أو البرمجيات المطلوبة للمشروع.
- "risksAndMitigation": من 3 إلى 5 مخاطر محددة مع إجراء تخفيف عملي لكل خطر.
- "recommendations": من 3 إلى 5 توصيات عملية مرتبة بالأولوية.
- "ninetyDayActionPlan": خطة واضحة للشهر الأول والثاني والثالث.
</quality_standards>

<planning_guidance>
قبل صياغة الإجابة:
1. حدّد نوع المشروع وقطاعه.
2. قيّم واقعية رأس المال مقارنة بحجم المشروع في السوق المصري.
3. اكشف التناقضات أو الافتراضات اللازمة.
4. احسب "riskScore" و "marketReadinessScore" و "roiPercent" بشكل متسق منطقيًا.
5. اجعل "roiTrend" متصاعدًا بشكل طبيعي.
6. اختر "executiveTags" تعكس أهم الفرص الإيجابية الحقيقية للمشروع.
7. أخرج JSON فقط.
</planning_guidance>
`.trim();

/** @param {Record<string, string | number>} data */
const buildFeasibilityPrompt = (data) => {
  const answer = (value) =>
    value == null || value === "" ? "غير محدد" : value;

  // Backward-compatible: if old payload is used, keep existing prompt style.
  if (!data.q1 && data.project_name) {
    return `${FEASIBILITY_SYSTEM_PROMPT}

<user_input>
قم بإعداد دراسة جدوى شاملة بناء على البيانات التالية:

اسم المشروع: ${answer(data.project_name)}
الوصف: ${answer(data.description)}
الموقع: ${answer(data.location)}
الفئة المستهدفة: ${answer(data.target_audience)}
الميزانية: ${answer(data.budget)}
نمط العلامة التجارية: ${answer(data.brand_style)}

طبّق تعليمات النظام أعلاه، والتزم بنفس عقد JSON الموحّد تمامًا.
</user_input>`;
  }

  return `${FEASIBILITY_SYSTEM_PROMPT}

<user_input>
قم بإعداد دراسة جدوى كاملة بناء على بيانات المستخدم التالية:

اسم المشروع: ${answer(data.project_name)}

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

طبّق تعليمات النظام أعلاه، والتزم بنفس عقد JSON الموحّد تمامًا.
</user_input>`;
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
  FEASIBILITY_SYSTEM_PROMPT,
};
