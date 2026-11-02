// The 27 governorates of Egypt
export const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية', 'الغربية', 'المنوفية',
  'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد',
  'مطروح', 'شمال سيناء', 'جنوب سيناء',
];

// Arabic/Persian digits -> Latin, strip spaces and dashes
export const normalizePhone = (v: string) =>
  v
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[\s\-()]/g, '')
    .replace(/^\+?20(?=1)/, '0');

export const isEgyptMobile = (v: string) => /^01[0125]\d{8}$/.test(normalizePhone(v));

// At least three words of two letters or more
export const isTripleName = (v: string) => v.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 3;
