/** @param {Record<string, string | number>} data */
const buildFeasibilityPrompt = (data) => {
  return `
أنت خبير دراسات جدوى.

قم بإنشاء دراسة جدوى شاملة للمشروع التالي:

اسم المشروع: ${data.project_name}
الوصف: ${data.description}
الموقع: ${data.location}
الفئة المستهدفة: ${data.target_audience}
الميزانية: ${data.budget}
نمط العلامة التجارية: ${data.brand_style}

المطلوب:
- تحليل السوق
- المنافسين
- التكاليف المتوقعة
- الأرباح
- المخاطر
- توصيات

ارجع النتيجة في JSON فقط بدون أي نص إضافي.

مهم:
- كل القيم النصية تكون بين ""
- لا تستخدم markdown
- لا تستخدم '''json
`;
};

module.exports = {
  buildFeasibilityPrompt,
};
