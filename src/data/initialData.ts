import { Product, AdminUser, CategoryInfo, Order } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'kettles',
    name: 'غلايات ومشروبات',
    nameEn: 'Kettles & Coffee',
    icon: 'Coffee',
    description: 'غلايات مياه كهربائية وماكينات قهوة احترافية'
  },
  {
    id: 'screens',
    name: 'شاشات وتلفزيونات',
    nameEn: 'Smart TVs',
    icon: 'Tv',
    description: 'شاشات ذكية بدقة 4K و OLED لمتعة المشاهدة'
  },
  {
    id: 'blenders',
    name: 'خلاطات ومحضرات',
    nameEn: 'Blenders & Mixers',
    icon: 'Blend',
    description: 'خلاطات طعام قوية ومحضرات متعددة الاستخدام'
  },
  {
    id: 'cooking',
    name: 'طهي وقلايات هوائية',
    nameEn: 'Air Fryers & Cooking',
    icon: 'Flame',
    description: 'قلايات هوائية صحية وميكروويف وأفران كهربائية'
  },
  {
    id: 'cleaning',
    name: 'مكانس وعناية بالمنزل',
    nameEn: 'Vacuums & Irons',
    icon: 'Sparkles',
    description: 'مكانس روبوت ذكية ومكاوي بخار للعناية بالأقمشة'
  },
  {
    id: 'cooling',
    name: 'تبريد وتكييف',
    nameEn: 'Refrigerators & Cooling',
    icon: 'Wind',
    description: 'ثلاجات إنفرتر موفرة للطاقة وموزعات مياه'
  }
];

export const PRESET_IMAGES = [
  { label: 'كاتيل زجاجي شفاف LED', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80', category: 'kettles' },
  { label: 'كاتيل ستانلس ستيل عصري', url: 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80', category: 'kettles' },
  { label: 'شاشة تلفزيون سمارت 4K', url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80', category: 'screens' },
  { label: 'شاشة سينمائية مع ساوند بار', url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80', category: 'screens' },
  { label: 'خلاط عصير ومحضر سموذي احترافي', url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80', category: 'blenders' },
  { label: 'خلاط ستانلس ستيل عالي الأداء', url: 'https://images.unsplash.com/photo-1585237672814-8f85a80a8e77?auto=format&fit=crop&w=800&q=80', category: 'blenders' },
  { label: 'قلاية هوائية رقمية سوداء', url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80', category: 'cooking' },
  { label: 'ميكروويف وفرن كهربائي ديجيتال', url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80', category: 'cooking' },
  { label: 'مكنسة روبوت ذكية ذاتية الشحن', url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80', category: 'cleaning' },
  { label: 'مكواة بخار سيراميك متطورة', url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80', category: 'cleaning' },
  { label: 'ماكينة قهوة اسبريسو إيطالية', url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80', category: 'kettles' },
  { label: 'ثلاجة حديثة ببابين ستانلس', url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', category: 'cooling' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-kettle-1',
    name: 'غلاية مياه كهربائية فيليبس إسنشال زجاجية 2200 واط',
    nameEn: 'Philips Glass Electric Kettle 2200W',
    category: 'kettles',
    brand: 'فيليبس (Philips)',
    price: 1350,
    originalPrice: 1750,
    stock: 24,
    rating: 4.9,
    reviewsCount: 142,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'غلاية مياه كهربائية أنيقة مصنوعة من زجاج شوت المقاوم للحرارة مع إضاءة زرقاء دائرية مؤشرة عند الغليان، وتتميز بغليان فائق السرعة وفلتر ناعم مانع للترسبات الكلسية وغطاء بلمسة واحدة.',
    features: [
      'زجاج ألماني متين مقاوم للصدمات الحرارية',
      'إضاءة LED زرقاء ساطعة داخلية أثناء الغليان',
      'فصل تلقائي ذكي عند وصول الماء لدرجة الغليان',
      'قاعدة دوارة 360 درجة بدون سلك ومكان لتخزين الكابل',
      'فلتر كلسي قابل للفك والغسيل بسهولة'
    ],
    specs: [
      { label: 'القدرة الكهربائية', value: '2200 واط' },
      { label: 'السعة الإجمالية', value: '1.7 لتر' },
      { label: 'مادة الصنع', value: 'زجاج مقوى + ستانلس ستيل' },
      { label: 'بلد المنشأ', value: 'بولندا (تصميم فيليبس هولندا)' },
      { label: 'نظام الحماية', value: 'حماية ضد الغليان الجاف' }
    ],
    wattage: '2200 واط',
    capacity: '1.7 لتر',
    warranty: 'ضمان دولي سنتين من الوكيل المعتمد',
    isFeatured: true,
    isNewArrival: false,
    createdAt: '2026-10-15T10:00:00Z',
    reviews: [
      {
        id: 'rev-1',
        productId: 'prod-kettle-1',
        userName: 'عمر الشناوي',
        rating: 5,
        comment: 'الكاتيل تحفة بجد وزجاجه ألماني متين وقوي، والإضاءة الزرقاء وقت الغليان شكلها شيك جداً وبتغلي المية في أقل من دقيقتين. استلمت الجهاز وتأكدت منه قبل الدفع.',
        createdAt: '2026-10-25T14:20:00Z',
        isVerifiedPurchase: true,
        helpfulCount: 14
      },
      {
        id: 'rev-2',
        productId: 'prod-kettle-1',
        userName: 'د. ميادة كمال',
        rating: 5,
        comment: 'ممتازة جداً وصحية لأن جسمها زجاجي بالكامل ومفيش أي تفاعل بلاستيك مع الماء المغلي. فلتر الترسبات بيتفك ويتنظف بسهولة.',
        createdAt: '2026-10-27T09:15:00Z',
        isVerifiedPurchase: true,
        helpfulCount: 9
      }
    ]
  },
  {
    id: 'prod-screen-1',
    name: 'شاشة سامسونج 55 بوصة سمارت Crystal UHD 4K مع ريموت طاقة شمسية',
    nameEn: 'Samsung 55" Crystal UHD 4K Smart TV',
    category: 'screens',
    brand: 'سامسونج (Samsung)',
    price: 19499,
    originalPrice: 22999,
    stock: 12,
    rating: 4.8,
    reviewsCount: 89,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'شاشة سامسونج كريستال UHD الذكية تأتيك بدقة 4K فائقة الوضوح مع معالج Crystal 4K لتحسين الألوان وتبسيط التباين، مجهزة بنظام Tizen OS وتطبيقات البث المباشر المدمجة (نتفليكس، شاهد، يوتيوب)، وتصميم نحيف جداً AirSlim بدون حواف.',
    features: [
      'دقة 4K فائقة الوضوح (3840 × 2160 بكسل)',
      'تقنية Dynamic Crystal Color مع مليار تدرج لوني طبيعي',
      'ريموت كنترول صديق للبيئة SolarCell يشحن بالضوء وبدون بطاريات',
      'دعم HDR 10+ وتزامن صوت Q-Symphony مع الساوند بار',
      '3 منافذ HDMI ومنفذين USB مع واي فاي مزدوج النطاق'
    ],
    specs: [
      { label: 'حجم الشاشة', value: '55 بوصة' },
      { label: 'الدقة', value: '4K Ultra HD (3840x2160)' },
      { label: 'معدل التحديث', value: '60 هرتز حقيقي / Motion Xcelerator' },
      { label: 'نظام التشغيل', value: 'Tizen OS الذكي مع متجر التطبيقات' },
      { label: 'الصوت', value: '20 واط محيطي بتقنية OTS Lite' }
    ],
    wattage: '145 واط (كفاءة طاقة A+)',
    capacity: '55 بوصة',
    warranty: 'ضمان سنتين شامل ضد عيوب الصناعة',
    isFeatured: true,
    isNewArrival: true,
    createdAt: '2026-10-20T12:00:00Z',
    reviews: [
      {
        id: 'rev-screen-1',
        productId: 'prod-screen-1',
        userName: 'م. طارق الصاوي',
        rating: 5,
        comment: 'شاشة سامسونج رائعة والألوان 4K نقية جداً وخاصة في الماتشات وأفلام 4K، الريموت الشمسي بدون بطاريات فكرة عبقرية ومريحة جداً.',
        createdAt: '2026-10-28T16:30:00Z',
        isVerifiedPurchase: true,
        helpfulCount: 18
      },
      {
        id: 'rev-screen-2',
        productId: 'prod-screen-1',
        userName: 'حسام النجار',
        rating: 5,
        comment: 'الصوت المحيطي ممتاز مع ميزة OTS والتطبيقات زي شاهد ونتفليكس ويوتيوب سريعة جداً بدون أي تهنيج.',
        createdAt: '2026-10-29T11:45:00Z',
        isVerifiedPurchase: true,
        helpfulCount: 7
      }
    ]
  },
  {
    id: 'prod-blender-1',
    name: 'خلاط ومحضر طعام كينوود تيتانيوم 1200 واط مع مطحنة وتكسير ثلج',
    nameEn: 'Kenwood Blender Titanium 1200W with Mill',
    category: 'blenders',
    brand: 'كينوود (Kenwood)',
    price: 3200,
    originalPrice: 3890,
    stock: 18,
    rating: 4.9,
    reviewsCount: 204,
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1585237672814-8f85a80a8e77?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'محرك جبار بقوة 1200 واط مع شفرات من التيتانيوم الرباعية المتينة المصممة لجرش الثلج وخلط أصعب المكونات خلال ثوانٍ معدودة. يأتي مع دورق زجاجي حراري سعة 2 لتر ومطحنة للحبوب والبهارات والبن.',
    features: [
      'شفرات فولاذية مطلية بالتيتانيوم لحدة تدوم طويلاً',
      'دورق زجاجي سميك حراري يقاوم الصدمات ويتحمل الشوربات الساخنة',
      'نظام نبضي Pulse مع سرعات متعددة متغيرة بسلاسة',
      'مطحنة توابل وحبوب متعددة الاستخدامات مانعة للتسريب',
      'أقدام مطاطية تثبيت مانعة للانزلاق والاهتزاز'
    ],
    specs: [
      { label: 'القدرة الكهربائية', value: '1200 واط' },
      { label: 'سعة الدورق', value: '2.0 لتر سعة نافعة' },
      { label: 'الشفرات', value: '4 شفرات تيتانيوم حادة قابلة للفك' },
      { label: 'الملحقات', value: 'دورق زجاجي + مطحنة توابل مدمجة' },
      { label: 'الأمان', value: 'قفل أمان مزدوج ذكي' }
    ],
    wattage: '1200 واط',
    capacity: '2.0 لتر',
    warranty: 'ضمان 3 سنوات من كينوود',
    isFeatured: true,
    isNewArrival: false,
    createdAt: '2026-10-18T14:30:00Z'
  },
  {
    id: 'prod-fryer-1',
    name: 'قلاية فيليبس إسنشال الهوائية XXL سعة 7.2 لتر ديجيتال بتقنية Rapid CombiAir',
    nameEn: 'Philips Airfryer XXL 7.2L Digital Rapid Air',
    category: 'cooking',
    brand: 'فيليبس (Philips)',
    price: 7600,
    originalPrice: 8950,
    stock: 9,
    rating: 5.0,
    reviewsCount: 318,
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80',
    description: 'طهي صحي بدهون أقل بنسبة تصل إلى 90%. سعة عائلية ضخمة 7.2 لتر تكفي لدجاجة كاملة أو 1.4 كجم بطاطس مقرمشة. شاشة لمس ديجيتال مع 16 برنامج طهي مسبق يشمل الخبز، الشوي، التحمير، وتجفيف الفواكه.',
    features: [
      'تقنية Rapid Air الحاصلة على براءة اختراع لتدوير الهواء الساخن بنسبة 360',
      'سلة وسلطانية قابلة للغسل في غسالة الأطباق بسهولة',
      'شاشة رقمية LED مع تحكم دقيق بدرجة الحرارة والوقت',
      'خاصية الحفاظ على دفء الطعام حتى 30 دقيقة',
      'ربط بتطبيق NutriU لمئات الوصفات العربية والعالمية'
    ],
    specs: [
      { label: 'القدرة الكهربائية', value: '2000 واط' },
      { label: 'السعة', value: '7.2 لتر (تكفي حتى 6 أفراد)' },
      { label: 'البرامج', value: '16 برنامج طهي ذكي بلمسة زر' },
      { label: 'التحكم بالحرارة', value: 'من 40 حتى 200 درجة مئوية' }
    ],
    wattage: '2000 واط',
    capacity: '7.2 لتر (عائلي)',
    warranty: 'ضمان سنتين شامل',
    isFeatured: true,
    isNewArrival: true,
    createdAt: '2026-10-22T08:00:00Z'
  },
  {
    id: 'prod-kettle-2',
    name: 'كاتيل ستانلس ستيل تيمبرتشر كينوود مع تحكم دقيق بدرجات الحرارة وشاشة رقمية',
    nameEn: 'Kenwood Digital Temperature Kettle 2400W',
    category: 'kettles',
    brand: 'كينوود (Kenwood)',
    price: 1890,
    originalPrice: 2200,
    stock: 15,
    rating: 4.7,
    reviewsCount: 76,
    image: 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80',
    description: 'غلاية احترافية لعشاق الشاي الفاخر والقهوة المختصة مع زر لاختيار درجات الحرارة بدقة (70, 80, 90, 100 مئوية) وخاصية الحفاظ على سخونة المياه لمدة 40 دقيقة مع جسم ستانلس ستيل عازل للحرارة الخارجية.',
    features: [
      'شاشة LED رقمية لعرض درجة حرارة الماء لحظة بلحظة',
      '4 برامج درجات حرارة مسبقة لمختلف أنواع المشروبات',
      'هيكل مزدوج الجدار Cool Touch لحماية الأيدي من السخونة',
      'زر الاحتفاظ بالحرارة Keep Warm الذكي',
      'مصفاة شبكية دقيقة من الستانلس ستيل'
    ],
    specs: [
      { label: 'القدرة', value: '2400 واط فائق السرعة' },
      { label: 'السعة', value: '1.7 لتر' },
      { label: 'الخامة', value: 'ستانلس ستيل 304 الغذائي المقاوم للصدأ' },
      { label: 'نطاق الحرارة', value: '40 - 100 درجة مئوية' }
    ],
    wattage: '2400 واط',
    capacity: '1.7 لتر',
    warranty: 'ضمان سنتين معتمد',
    isFeatured: false,
    isNewArrival: true,
    createdAt: '2026-10-25T11:20:00Z'
  },
  {
    id: 'prod-screen-2',
    name: 'شاشة إل جي 65 بوصة OLED 4K بتقنية الذكاء الاصطناعي α9 ونظام webOS',
    nameEn: 'LG OLED 65" 4K AI Cinema Smart TV',
    category: 'screens',
    brand: 'إل جي (LG)',
    price: 43900,
    originalPrice: 48900,
    stock: 5,
    rating: 5.0,
    reviewsCount: 47,
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
    description: 'القمة في عالم الشاشات: شاشة OLED بكسلات ذاتية الإضاءة تمنحك سواداً مثالياً وتباين لا نهائي، معالج الجيل الجديد α9 Gen6 AI 4K، دعم ألعاب فائق 120Hz مع تقنيات G-Sync و Dolby Vision IQ & Atmos.',
    features: [
      'شاشة OLED الذاتية مع درجات سواد مطلقة وألوان لا مثيل لها',
      'معدل تحديث خارق 120Hz مع منفذ HDMI 2.1 لأحدث أجهزة الألعاب',
      'ريموت ماجيك ذكي مع ماوس هوائي وتحكم صوتي عربي',
      'دولبي فيجن ودولبي أتموس لصوت سينمائي ثلاثي الأبعاد',
      'تصميم مفرط النحافة Gallery Design يلتصق بالجدار كلوحة فنية'
    ],
    specs: [
      { label: 'حجم الشاشة', value: '65 بوصة' },
      { label: 'نوع اللوحة', value: 'OLED evo الذاتي' },
      { label: 'المعالج', value: 'α9 Gen6 AI Processor 4K' },
      { label: 'معدل التحديث', value: '120Hz حقيقي VRR' }
    ],
    wattage: '180 واط',
    capacity: '65 بوصة',
    warranty: 'ضمان 3 سنوات من إل جي مع تغطية الشاشة',
    isFeatured: true,
    isNewArrival: false,
    createdAt: '2026-10-10T16:00:00Z'
  },
  {
    id: 'prod-clean-1',
    name: 'مكنسة روبوت ذكية Dreame D9 Max مع مسح وملاحة ليدار وقوة شفط 4000Pa',
    nameEn: 'Dreame D9 Max Robot Vacuum & Mop 4000Pa',
    category: 'cleaning',
    brand: 'دريمي (Dreame / شاومي)',
    price: 11200,
    originalPrice: 13500,
    stock: 8,
    rating: 4.8,
    reviewsCount: 65,
    image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80',
    description: 'تنظيف المنزل بالكامل بضغطة زر من هاتفك! ملاحة ليدار ليزرية دقيقة 360 درجة لرسم خريطة المنزل، قوة شفط جبارة 4000 باسكال تلتقط الأتربة وشعر الحيوانات، ووحدة مسح مائي ذكية بتحكم إلكتروني.',
    features: [
      'مستشعر ليدار LDS يرسم خريطة الغرف في دقائق متفادياً السلالم والأثاث',
      'قوة شفط فائقة 4000Pa مع 4 مستويات قابلة للضبط',
      'خزان ماء ذكي سعة 270 مل يوزع المياه بالتساوي لحماية الباركيه والرخام',
      'بطارية ضخمة 5200mAh تعمل حتى 150 دقيقة متواصلة مع شحن تلقائي',
      'التحكم الكامل عبر تطبيق الهاتف باللغة العربية مع جدولة المواعيد'
    ],
    specs: [
      { label: 'قوة الشفط', value: '4000 باسكال (Pa)' },
      { label: 'البطارية', value: '5200 مللي أمبير ليثيوم' },
      { label: 'سعة صندوق الأتربة', value: '570 مل' },
      { label: 'الاتصال', value: 'واي فاي 2.4GHz وتطبيق ذكي' }
    ],
    wattage: '40 واط',
    capacity: 'صندوق 570 مل + ماء 270 مل',
    warranty: 'ضمان سنتين معتمد',
    isFeatured: false,
    isNewArrival: true,
    createdAt: '2026-10-24T09:15:00Z'
  },
  {
    id: 'prod-clean-2',
    name: 'مكواة بخار تيفال التيمات بيور 3200 واط مع فلتر ميكرو كالك مانع للبقع',
    nameEn: 'Tefal Ultimate Pure Steam Iron 3200W Micro-Calc',
    category: 'cleaning',
    brand: 'تيفال (Tefal)',
    price: 3650,
    originalPrice: 4200,
    stock: 22,
    rating: 4.8,
    reviewsCount: 93,
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
    description: 'أقوى مكواة بخار يدوية من تيفال بقوة 3200 واط تمنحك تسخيناً فورياً وبخاراً مكثفاً ينفذ إلى عمق الأقمشة، مع قاعدة دوريليوم إيرجلايد الأسرع انزلاقاً وفلتر كلسي يضمن بخاراً نقياً 100% بدون بقع.',
    features: [
      'قوة 3200 واط لتسخين فائق السرعة وأداء بخار استثنائي',
      'تعزيز بخار خارق حتى 260 جم/الدقيقة لأصعب التجاعيد في الأقمشة السميكة',
      'فلتر Micro-Calc الثوري يمنع تسرب الترسبات على الملابس البيضاء',
      'قاعدة انزلاق Durilium Airglide ذاتية التنظيف ومقاومة للخدش',
      'فصل أمان تلقائي في حال ترك المكواة بدون حركة'
    ],
    specs: [
      { label: 'القدرة', value: '3200 واط' },
      { label: 'ضغط البخار', value: 'بخار مستمر 60 جم/د وتعزيز 260 جم/د' },
      { label: 'سعة خزان الماء', value: '350 مل مع فتحة تعبئة واسعة' },
      { label: 'الصنع', value: 'صنع في فرنسا (Made in France)' }
    ],
    wattage: '3200 واط',
    capacity: '350 مل',
    warranty: 'ضمان سنتين من تيفال مصر',
    isFeatured: false,
    isNewArrival: false,
    createdAt: '2026-10-12T13:40:00Z'
  },
  {
    id: 'prod-coffee-1',
    name: 'ماكينة قهوة ديلونجي ديديكا اسبريسو ستانلس ستيل مع مبخر حليب كابتشينو',
    nameEn: 'DeLonghi Dedica Espresso Machine 1350W 15-Bar',
    category: 'kettles',
    brand: 'ديلونجي (DeLonghi)',
    price: 8850,
    originalPrice: 10400,
    stock: 7,
    rating: 4.9,
    reviewsCount: 180,
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
    description: 'تمتع بمذاق الإسبريسو الإيطالي الأصيل في منزلك! ماكينة مدمجة بعرض 15 سم فقط، بمضخة ضغط احترافية 15 بار ونظام ثيرموبلوك سريع يسخن خلال 40 ثانية مع عصا تبخير حليب احترافية للكابتشينو واللاتيه.',
    features: [
      'مضخة إيطالية احترافية بقوة ضغط 15 بار لكريمة اسبريسو كثيفة وغنية',
      'تصميم مدمج ونحيف جداً مناسب لجميع المطابخ وأركان القهوة',
      'نظام تسخين Thermoblock المزدوج الجاهز خلال 40 ثانية',
      'فوهة تبخير حليب قابلة للتعديل للحصول على رغوة مخملية كريمية',
      'تتسع لكوب فردي أو مزدوج وتدعم كبسولات E.S.E الورقية'
    ],
    specs: [
      { label: 'القدرة الكهربائية', value: '1350 واط' },
      { label: 'ضغط المضخة', value: '15 بار' },
      { label: 'سعة خزان الماء', value: '1.1 لتر قابل للإزالة' },
      { label: 'مادة الصنع', value: 'ستانلس ستيل بالكامل' }
    ],
    wattage: '1350 واط',
    capacity: '1.1 لتر',
    warranty: 'ضمان سنتين معتمد',
    isFeatured: true,
    isNewArrival: false,
    createdAt: '2026-10-19T17:00:00Z'
  },
  {
    id: 'prod-micro-1',
    name: 'ميكروويف ديجيتال شارب سعة 34 لتر مع شواية 1000 واط من الستانلس ستيل',
    nameEn: 'Sharp 34L Digital Microwave with Grill 1000W',
    category: 'cooking',
    brand: 'شارب (Sharp)',
    price: 6400,
    originalPrice: 7200,
    stock: 14,
    rating: 4.7,
    reviewsCount: 52,
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80',
    description: 'ميكروويف شارب العائلي سعة 34 لتر مزود بشواية لتسخين وطهي وتحمير مختلف الأطعمة، يتميز بـ 9 قوائم طهي تلقائية، ومؤقت دقيق، ووظيفة إذابة التجميد الذكية بالوزن والوقت.',
    features: [
      'سعة داخلية واسعة 34 لتر تتسع للأطباق الكبيرة والصواني',
      'شواية مدمجة بقوة 1100 واط لتحمير الدجاج والمعجنات',
      '9 برامج طهي تلقائية (بيتزا، بطاطس، خضار، لحوم، أسماك)',
      'لوحة تحكم رقمية كاملة باللمس مع شاشة رقمية واضحة وقفل أمان للأطفال',
      'جسم وتجويف داخلي من الستانلس المقاوم للصدأ وسهل التنظيف'
    ],
    specs: [
      { label: 'قدرة الميكروويف', value: '1000 واط' },
      { label: 'قدرة الشواية', value: '1100 واط' },
      { label: 'السعة الداخلية', value: '34 لتر' },
      { label: 'قطر الصينية الدوارة', value: '31.5 سم زجاج مقوى' }
    ],
    wattage: '1000 واط / شواية 1100 واط',
    capacity: '34 لتر',
    warranty: 'ضمان سنتين العربي جروب',
    isFeatured: false,
    isNewArrival: false,
    createdAt: '2026-10-14T11:00:00Z'
  }
];

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-super-1',
    name: 'م. محمد الغنيمي',
    email: 'mohmmedgano@gmail.com',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    phone: '01012345678',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    lastLogin: '2026-10-31T15:45:00Z',
    password: 'admin'
  },
  {
    id: 'admin-product-2',
    name: 'سارة الشريف',
    email: 'sara@albayt.com',
    role: 'product_manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    phone: '01123456789',
    active: true,
    createdAt: '2026-03-15T00:00:00Z',
    lastLogin: '2026-10-30T11:20:00Z',
    password: 'admin'
  },
  {
    id: 'admin-orders-3',
    name: 'أحمد فؤاد',
    email: 'ahmed@albayt.com',
    role: 'orders_manager',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    phone: '01234567890',
    active: true,
    createdAt: '2026-05-10T00:00:00Z',
    lastLogin: '2026-10-31T14:10:00Z',
    password: 'admin'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-84920',
    customer: {
      name: 'كريم عبد العزيز',
      phone: '01099887766',
      city: 'القاهرة - المعادي',
      address: 'شارع 9، برج النخيل، الدور الرابع شقة 8',
      notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
      paymentMethod: 'cod'
    },
    items: [
      {
        productId: 'prod-kettle-1',
        productName: 'غلاية مياه كهربائية فيليبس إسنشال زجاجية 2200 واط',
        productImage: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        price: 1350,
        quantity: 1
      },
      {
        productId: 'prod-blender-1',
        productName: 'خلاط ومحضر طعام كينوود تيتانيوم 1200 واط',
        productImage: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
        price: 3200,
        quantity: 1
      }
    ],
    subtotal: 4550,
    shippingFee: 50,
    discount: 0,
    total: 4600,
    status: 'processing',
    createdAt: '2026-10-31T11:30:00Z',
    assignedAdminId: 'admin-orders-3'
  },
  {
    id: 'ORD-84919',
    customer: {
      name: 'هدى مصطفى',
      phone: '01211223344',
      city: 'الجيزة - الشيخ زايد',
      address: 'كمبوند الياسمين، فيلا 24',
      notes: 'التسليم في الفترة المسائية',
      paymentMethod: 'vodafone'
    },
    items: [
      {
        productId: 'prod-screen-1',
        productName: 'شاشة سامسونج 55 بوصة سمارت Crystal UHD 4K',
        productImage: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
        price: 19499,
        quantity: 1
      }
    ],
    subtotal: 19499,
    shippingFee: 0,
    discount: 500,
    total: 18999,
    status: 'shipped',
    createdAt: '2026-10-30T16:20:00Z',
    assignedAdminId: 'admin-orders-3'
  },
  {
    id: 'ORD-84918',
    customer: {
      name: 'محمود سلامة',
      phone: '01155443322',
      city: 'الإسكندرية - سموحة',
      address: 'شارع فوزي معاذ، عمارة الأطباء',
      paymentMethod: 'cod'
    },
    items: [
      {
        productId: 'prod-fryer-1',
        productName: 'قلاية فيليبس إسنشال الهوائية XXL سعة 7.2 لتر ديجيتال',
        productImage: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80',
        price: 7600,
        quantity: 1
      }
    ],
    subtotal: 7600,
    shippingFee: 75,
    discount: 0,
    total: 7675,
    status: 'delivered',
    createdAt: '2026-10-28T09:45:00Z',
    assignedAdminId: 'admin-orders-3'
  }
];
