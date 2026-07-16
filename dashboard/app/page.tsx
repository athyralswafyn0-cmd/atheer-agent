'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { CrystalButton } from '@/components/ui/CrystalButton';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'وكلاء ذكية متخصصة',
    description: 'أنشئ وكلاء AI مخصصة لمهام محددة - خدمة العملاء، المبيعات، التحليل، البرمجة، وأكثر.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'محادثات ذكية متعددة القنوات',
    description: 'تواصل مع عملائك عبر واتساب، تليجرام، البريد الإلكتروني، الدردشة المباشرة، وأكثر.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'تحليلات متقدمة ورؤى',
    description: 'لوحة تحليلات شاملة مع تقارير آلية، تحليل المشاعر، وتوقعات الأداء.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'أمان وامتثال على مستوى المؤسسات',
    description: 'تشفير من طرف لطرف، امتثال GDPR، SOC2، ISO27001، وإدارة صلاحيات متقدمة.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-6.954a4 4 0 115.656 0l-4 4a4 4 0 10-5.656-5.656l1.102-1.102m0 0a4 4 0 005.656 0l4-4a4 4 0 01-5.656-5.656l-1.102-1.101m0 0a4 4 0 00-5.656 0l-4-4a4 4 0 015.656 5.656l1.102 1.101m-6.05 6.05c3.906 3.906 10.237 3.906 14.142 0" />
      </svg>
    ),
    title: 'تكامل سلس مع أدواتك',
    description: 'أكثر من 100 تكامل جاهز - CRM، ERP، أدوات التواصل، منصات التجارة، وأكثر.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-2.004-3.356-2.857M7 20H7v-2c0-.656-.126-2.004-3.356-2.857M7 20v-2c0-.656.126-2.004 3.356-2.857M18.364 5.636l-3.536 3.536m0 0a3 3 0 114.243 4.242M15.05 5.05a8.14 8.14 0 014.06 0M15.05 5.05a8 8 0 0111.31 0" />
      </svg>
    ),
    title: 'نموذج العلامة البيضاء الكامل',
    description: 'أطلق وكلاء تحت علامتك التجارية - نطاقك، بريدك، هويتك، تحكمك الكامل.',
  },
];

const steps = [
  {
    number: '01',
    title: 'صمّم وكيلك',
    description: 'اختر من قوالب جاهزة أو ابدأ من الصفر. حدد الشخصية، المعرفة، والأدوات التي سيستخدمها وكيلك.',
  },
  {
    number: '02',
    title: 'درّب واختبر',
    description: 'أضف مستنداتك، موقعك، وبياناتك. اختبر وكيلك في بيئة آمنة قبل النشر.',
  },
  {
    number: '03',
    title: 'انشر في دقائق',
    description: 'انشر وكيلك على موقعك، واتساب، تليجرام، سلاك، أو عبر API بنقرة واحدة.',
  },
  {
    number: '04',
    title: 'راقب وحسّن',
    description: 'راقب الأداء عبر لوحة تحليلات مباشرة. حسّن الإجابات وأضف معرفة جديدة باستمرار.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: 'مجاني',
    period: '/شهر',
    description: 'للشركات الناشئة والمطورين',
    features: [
      'وكيل AI واحد',
      '1,000 رسالة/شهر',
      'مؤسسة واحدة',
      '3 أعضاء فريق',
      'ويدجت دردشة أساسي',
      'تحليلات أساسية',
      'دعم مجتمعي',
    ],
    cta: 'ابدأ مجاناً',
    variant: 'outline',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/شهر',
    description: 'للشركات النامية',
    features: [
      '5 وكلاء AI',
      '50,000 رسالة/شهر',
      '3 مؤسسات',
      '15 عضو فريق',
      'ويدجت متقدم + براند مخصص',
      'تحليلات مفصلة + تصدير',
      'تكامل WhatsApp/Email/Slack',
      'دعم أولوية (البريد الإلكتروني)',
      'Webhooks و API Access',
    ],
    cta: 'اشترك الآن',
    variant: 'default',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/شهر',
    description: 'للمؤسسات والفرق الكبيرة',
    features: [
      'وكلاء غير محدودين',
      'رسائل غير محدودة',
      'مؤسسات غير محدودة',
      'أعضاء فريق غير محدودين',
      'White-label كامل (نطاقك، بريدك)',
      'SSO (SAML/OIDC) + SCIM',
      'SLA 99.9% + دعم مخصص',
      'نشر على سحابتك (BYOC)',
      'تدقيق أمان وتدريب نموذج مخصص',
      'مدير نجاح عملاء مخصص',
    ],
    cta: 'تواصل مع المبيعات',
    variant: 'outline',
    popular: false,
  },
];

const testimonials = [
  {
    quote: 'أثّر غير طريقة تعاملنا مع العملاء تماماً. انخفض وقت الاستجابة من ساعات إلى ثوانٍ، وارتفعت نسبة التحويل بنسبة 340%.',
    author: 'سارة المحمدي',
    role: 'مديرة تجربة العملاء',
    company: 'شركة تقنية رائدة',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    quote: 'نموذج العلامة البيضاء مكننا من إطلاق منتج AI خاص بنا في أسبوعين بدلاً من سنة تطوير. وفرنا ملايين الدولارات.',
    author: 'أحمد الزهراني',
    role: 'المدير التقني',
    company: 'منصة تجارة إلكترونية',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
  },
  {
    quote: 'التكامل مع أنظمتنا الحالية كان سلساً بشكل لا يصدق. فريق الدعم التقني من أفضل الفرق التي تعاملت معها في مسيرتي.',
    author: 'فاطمة العتيبي',
    role: 'نائب الرئيس للهندسة',
    company: 'مؤسسة مالية كبرى',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
  },
];

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({} as Record<string, HTMLDivElement | null>);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      
      // Calculate scroll progress (0-1) based on document height
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.max(0, Math.min(1, y / docHeight)) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealedSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isRevealed = (id: string) => revealedSections.has(id);

  return (
    <>
      <AuroraBackground />
      <div className="fixed inset-0 z-0 pointer-events-none opacity-35 mix-blend-overlay atheer-grain" aria-hidden="true" />

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-space/80 backdrop-blur-[20px] border-b border-white/10' : 'bg-transparent'}`} role="navigation" aria-label="التنقل الرئيسي">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3" aria-label="Atheer Agent AI - الرئيسية">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <svg className="w-6 h-6 text-space" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <span className="font-display text-xl font-medium text-ink hidden sm:block">Atheer Agent AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-ink/70 hover:text-gold transition-colors">المميزات</Link>
              <Link href="#how-it-works" className="text-sm font-medium text-ink/70 hover:text-gold transition-colors">كيف يعمل</Link>
              <Link href="#pricing" className="text-sm font-medium text-ink/70 hover:text-gold transition-colors">الأسعار</Link>
              <Link href="#testimonials" className="text-sm font-medium text-ink/70 hover:text-gold transition-colors">آراء العملاء</Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-ink/70 hover:text-gold transition-colors hidden sm:block">تسجيل الدخول</Link>
              <Link href="/register">
                <CrystalButton size="lg" rightIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5l-10 0"/></svg>}>
                  ابدأ مجاناً
                </CrystalButton>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* === CHAPTER I - HERO === */}
        <section id="hero" data-chapter="hero" data-chapter-progress="0.0" className="min-h-screen flex items-center justify-center px-6 relative" ref={(el) => { sectionRefs.current.hero = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-5xl text-center ${isRevealed('hero') ? 'animate-fade-in-up' : 'reveal'}`} id="hero">
            <div className="chapter-mark">الفصل الأول</div>
            <div className="chapter-eyebrow">البداية</div>
            <h1 className="chapter-heading text-5xl sm:text-6xl lg:text-7xl font-display font-light leading-[1.1] tracking-tight mb-8">
              في البداية،<br />
              كانت <em className="text-gradient">نقطة ضوء واحدة.</em>
            </h1>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto mb-12">
              قبل الشبكات. قبل الآلات. قبل اللغة حتى — كانت هناك فقط أصغر شرارة، والهدوء الذي احتواها.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/register">
                <CrystalButton size="xl" rightIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5l-10 0"/></svg>}>
                  ابدأ رحلتك مجاناً
                </CrystalButton>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg">
                  استكشف المميزات
                </Button>
              </Link>
            </div>

            {/* Interactive Dashboard Preview */}
            <div className="relative max-w-4xl mx-auto" style={{ perspective: '1000px' }}>
              <div className="relative transform-gpu" style={{ transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-amethyst/5 rounded-3xl blur-3xl opacity-50" aria-hidden="true" />
                <div className="relative bg-white/3 border border-white/10 rounded-3xl p-6 backdrop-blur-[20px] transform-gpu transition-all duration-700 hover:scale-[1.01] hover:shadow-[0_30px_80px_rgba(91,75,138,0.3)]" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(2deg) rotateY(-2deg)' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-2 bg-white/10 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-gold to-gold-light animate-shimmer" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'وكلاء نشطون', value: '2,847', trend: '+12%' },
                      { label: 'رسائل اليوم', value: '1.2M', trend: '+23%' },
                      { label: 'معدل الرضا', value: '98.7%', trend: '+2%' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/3 border border-white/10 rounded-2xl p-4 text-center transform-gpu" style={{ transform: `translateZ(${10 + i * 10}px)` }}>
                        <p className="text-2xl sm:text-3xl font-display font-medium text-gold mb-1">{stat.value}</p>
                        <p className="text-sm text-ink/60 mb-1">{stat.label}</p>
                        <p className="text-xs text-emerald-400 font-medium">{stat.trend}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'وكيل الدعم', status: 'نشط', messages: '12,453', color: 'text-emerald-400' },
                      { name: 'وكيل المبيعات', status: 'نشط', messages: '8,234', color: 'text-emerald-400' },
                      { name: 'وكيل التحليل', status: 'معطل', messages: '0', color: 'text-slate-400' },
                    ].map((agent, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl transform-gpu group" style={{ transform: `translateZ(${10 + i * 10}px)` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                            <svg className="w-5 h-5 text-space" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                          </div>
                          <div>
                            <p className="font-medium text-ink">{agent.name}</p>
                            <p className="text-xs text-ink/50">{agent.status} • {agent.messages} رسالة</p>
                          </div>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${agent.color}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === CHAPTER II === */}
        <section id="chapter2" data-chapter="features" data-chapter-progress="0.15" className="min-h-[100vh] flex items-center justify-center px-6" ref={(el) => { sectionRefs.current.chapter2 = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-3xl text-center ${isRevealed('chapter2') ? 'animate-fade-in-right' : 'reveal reveal-right'}`} id="chapter2">
            <div className="chapter-mark">الفصل الثاني</div>
            <div className="chapter-eyebrow">ولادة التواصل</div>
            <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
              بدأ الضوء<br />
              <em className="text-gradient">في السفر.</em>
            </h2>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
              نقطة واحدة أصبحت اثنتين. اثنتان أصبحتا ألفاً. كل اتصال كان سؤالاً تمت إجابته، فكرة نُقلت — الشكل الأول الباهت لعقل أكبر من أي من أجزائه.
            </p>
          </div>
        </section>

        {/* === CHAPTER III - FEATURES === */}
        <section id="features" data-chapter="features" data-chapter-progress="0.3" className="min-h-[120vh] px-6" ref={(el) => { sectionRefs.current.features = el as HTMLDivElement; }}>
          <div className="container mx-auto max-w-7xl">
            <div className={`text-center mb-20 ${isRevealed('features') ? 'animate-fade-in-up' : 'reveal'}`} id="features-header">
              <div className="chapter-mark">الفصل الثالث</div>
              <div className="chapter-eyebrow">ثورة الذكاء</div>
              <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
                البيانات تعلمت<br />
                أن تنساب <em className="text-gradient">كأنهار من ضوء.</em>
              </h2>
              <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
                معمارية زجاجية ارتفعت حيث كان الضجيج. المعلومات أصبحت مقروءة، ثم جميلة. العالم أصبح أسرع — وبطريقة ما، أكثر هدوءاً.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  ref={(el) => { sectionRefs.current[`feature-${index}`] = el as HTMLDivElement; }}
                  className={`group ${isRevealed(`feature-${index}`) ? 'animate-fade-in-up' : 'reveal'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  id={`feature-${index}`}
                >
                  <GlassCard variant="default" hover className="h-full p-8 flex flex-col">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-amethyst/20 flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-display font-medium text-ink mb-3">{feature.title}</h3>
                    <p className="text-ink/60 leading-relaxed flex-1">{feature.description}</p>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === CHAPTER IV === */}
        <section id="chapter4" data-chapter="howitworks" data-chapter-progress="0.45" className="min-h-[100vh] flex items-center justify-center px-6" ref={(el) => { sectionRefs.current.chapter4 = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-3xl text-center ${isRevealed('chapter4') ? 'animate-fade-in-right' : 'reveal reveal-right'}`} id="chapter4">
            <div className="chapter-mark">الفصل الرابع</div>
            <div className="chapter-eyebrow">الذكاء الاصطناعي يستيقظ</div>
            <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
              ثم، الذكاء<br />
              <em className="text-gradient">فتح عينيه.</em>
            </h2>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
              ليست آلات. ليست روبوتات. كيانات من ضوء تستمع، تستنتج، وتتصرف — وكلاء لا تحاكي الفهم، بل تحمله بهدوء، إلى كل محادثة.
            </p>
          </div>
        </section>

        {/* === CHAPTER V - HOW IT WORKS === */}
        <section id="how-it-works" data-chapter="howitworks" data-chapter-progress="0.3" className="min-h-[120vh] px-6" ref={(el) => { sectionRefs.current.howItWorks = el as HTMLDivElement; }}>
          <div className="container mx-auto max-w-7xl">
            <div className={`text-center mb-20 ${isRevealed('how-it-works') ? 'animate-fade-in-up' : 'reveal'}`} id="how-it-works-header">
              <div className="chapter-mark">الفصل الخامس</div>
              <div className="chapter-eyebrow">عصر الشراكة</div>
              <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
                العالم<br />
                بدأ <em className="text-gradient">في الاتصال.</em>
              </h2>
              <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
                وكالات. شركاء. شركات، واحدة تلو الأخرى، تنضم لنفس الشبكة الحية — كل منها تطلق وكلاءها الخاصة، حتى بدأت صناعات بأكملها تتوهج.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  ref={(el) => { sectionRefs.current[`step-${index}`] = el as HTMLDivElement; }}
                  className={`group ${isRevealed(`step-${index}`) ? 'animate-fade-in-up' : 'reveal'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                  id={`step-${index}`}
                >
                  <GlassCard variant="bordered" hover className="h-full p-8 flex flex-col text-center group">
                    <div className="mb-6">
                      <span className="text-5xl sm:text-6xl font-display font-medium text-gold/30 group-hover:text-gold transition-colors duration-500">{step.number}</span>
                    </div>
                    <h3 className="text-xl font-display font-medium text-ink mb-3">{step.title}</h3>
                    <p className="text-ink/60 leading-relaxed flex-1">{step.description}</p>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === CHAPTER VI - WHITE LABEL === */}
        <section id="chapter6" data-chapter="whitelabel" data-chapter-progress="0.45" className="min-h-[100vh] flex items-center justify-center px-6" ref={(el) => { sectionRefs.current.chapter6 = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-3xl text-center ${isRevealed('chapter6') ? 'animate-fade-in-right' : 'reveal reveal-right'}`} id="chapter6">
            <div className="chapter-mark">الفصل السادس</div>
            <div className="chapter-eyebrow">عالم العلامة البيضاء</div>
            <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
              منصة واحدة.<br />
              <em className="text-gradient">هويات لا نهائية.</em>
            </h2>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto mb-12">
              نفس الذكاء، يرتدي ألف وجه — علامة كل شريك التجارية، صوت كل شريك، فوراً.
            </p>
            <div className="relative max-w-md mx-auto">
              <GlassCard variant="strong" className="p-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-display text-lg text-ink">Atheer Agent AI</span>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* === CHAPTER VII === */}
        <section id="chapter7" data-chapter="testimonials" data-chapter-progress="0.9" className="min-h-[100vh] flex items-center justify-center px-6" ref={(el) => { sectionRefs.current.chapter7 = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-3xl text-center ${isRevealed('chapter7') ? 'animate-fade-in-left' : 'reveal reveal-left'}`} id="chapter7">
            <div className="chapter-mark">الفصل السابع</div>
            <div className="chapter-eyebrow">المستقبل</div>
            <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
              ملايين الوكلاء.<br />
              <em className="text-gradient">شبكة حية واحدة.</em>
            </h2>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
              ابتعد بعيداً بما يكفي، وكل محادثة، كل شريك، كل نقطة ضوء تنحل في كائن حي واحد يتنفس — هادئ، قوي، وغالباً، غير مرئي.
            </p>
          </div>
        </section>

        {/* === PRICING === */}
        <section id="pricing" data-chapter="pricing" data-chapter-progress="0.75" className="min-h-[120vh] px-6" ref={(el) => { sectionRefs.current.pricing = el as HTMLDivElement; }}>
          <div className="container mx-auto max-w-7xl">
            <div className={`text-center mb-20 ${isRevealed('pricing') ? 'animate-fade-in-up' : 'reveal'}`} id="pricing-header">
              <div className="chapter-mark">الأسعار</div>
              <div className="chapter-eyebrow">بسيط. شفاف. عادل.</div>
              <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
                اختر خطتك<br />
                <em className="text-gradient">وابدأ البناء.</em>
              </h2>
              <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto">
                جميع الخطط تشمل تجربة مجانية لمدة 14 يوماً. لا بطاقة ائتمان مطلوبة.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  ref={(el) => { sectionRefs.current[`plan-${index}`] = el as HTMLDivElement; }}
                  className={`group ${isRevealed(`plan-${index}`) ? 'animate-fade-in-up' : 'reveal'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                  id={`plan-${index}`}
                >
                  <GlassCard variant={plan.popular ? 'strong' : 'default'} hover className={`h-full p-8 flex flex-col relative ${plan.popular ? 'border-gold/50 shadow-[0_0_60px_rgba(212,168,67,0.15)]' : ''}`} id={`plan-${index}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-gold to-gold-light text-space text-sm font-medium rounded-full">
                        الأكثر رواجاً
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="text-xl font-display font-medium text-ink mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-5xl font-display font-medium text-ink">{plan.price}</span>
                        <span className="text-ink/50">{plan.period}</span>
                      </div>
                      <p className="text-ink/60 text-center">{plan.description}</p>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-ink/70 group-hover:text-ink transition-colors">
                          <svg className="w-5 h-5 flex-shrink-0 text-gold mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-ink/70">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.popular ? '/register' : '#contact'}>
                      <Button className="w-full" variant={plan.variant as any} size="lg">
                        {plan.cta}
                      </Button>
                    </Link>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === TESTIMONIALS === */}
        <section id="testimonials" data-chapter="testimonials" data-chapter-progress="0.75" className="min-h-[100vh] px-6" ref={(el) => { sectionRefs.current.testimonials = el as HTMLDivElement; }}>
          <div className="container mx-auto max-w-7xl">
            <div className={`text-center mb-20 ${isRevealed('testimonials') ? 'animate-fade-in-up' : 'reveal'}`} id="testimonials-header">
              <div className="chapter-mark">آراء العملاء</div>
              <div className="chapter-eyebrow">يثق بهم القادة</div>
              <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
                نتائج حقيقية.<br />
                <em className="text-gradient">شركات حقيقية.</em>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.author}
                  ref={(el) => { sectionRefs.current[`testimonial-${index}`] = el as HTMLDivElement; }}
                  className={`group ${isRevealed(`testimonial-${index}`) ? 'animate-fade-in-up' : 'reveal'}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                  id={`testimonial-${index}`}
                >
                  <GlassCard variant="default" hover className="h-full p-8 flex flex-col">
                    <div className="flex items-center gap-1 mb-4">
                      <svg className="w-6 h-6 text-gold/50" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.017 21v-6.841c0-1.183.715-1.883 1.639-2.004l.339-.043c.654-.084 1.113-.534 1.113-1.165 0-.529-.286-.996-.744-1.208l-1.498-.688c-.931-.428-1.602-1.361-1.602-2.524 0-.679.444-1.252 1.089-1.537.282-.124.561-.275.864-.417.402-.192.788-.422 1.096-.667.164-.13.307-.281.475-.415.164-.124.306-.28.466-.42.008-.008.023-.016.031-.024.15-.15.33-.297.51-.44.39-.313.856-.543 1.307-.752.425-.197.859-.36 1.308-.49.03-.01.05-.03.09-.03.08 0 .16.02.22.05.07.03.14.06.21.1.1.06.18.13.28.22.22.19.39.45.66.73.51.54 1.12 1.2 1.75 1.77 1.22 1.08 2.25 2.48 2.9 3.5 1.1 1.72 1.72 3.72 1.72 5.77 0 1.27-.19 2.5-.56 3.65-.6 1.85-1.77 3.34-3.62 4.43-1.56.92-3.5 1.46-5.66 1.46-1.55 0-3.06-.38-4.5-1.14-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67" /></svg>
                      <svg className="w-6 h-6 text-gold/50" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.017 21v-6.841c0-1.183.715-1.883 1.639-2.004l.339-.043c.654-.084 1.113-.534 1.113-1.165 0-.529-.286-.996-.744-1.208l-1.498-.688c-.931-.428-1.602-1.361-1.602-2.524 0-.679.444-1.252 1.089-1.537.282-.124.561-.275.864-.417.402-.192.788-.422 1.096-.667.164-.13.307-.281.475-.415.164-.124.306-.28.466-.42.008-.008.023-.016.031-.024.15-.15.33-.297.51-.44.39-.313.856-.543 1.307-.752.425-.197.859-.36 1.308-.49.03-.01.05-.03.09-.03.08 0 .16.02.22.05.07.03.14.06.21.1.1.06.18.13.28.22.22.19.39.45.66.73.51.54 1.12 1.2 1.75 1.77 1.22 1.08 2.25 2.48 2.9 3.5 1.1 1.72 1.72 3.72 1.72 5.77 0 1.27-.19 2.5-.56 3.65-.6 1.85-1.77 3.34-3.62 4.43-1.56.92-3.5 1.46-5.66 1.46-1.55 0-3.06-.38-4.5-1.14-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67" /></svg>
                      <svg className="w-6 h-6 text-gold/50" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.017 21v-6.841c0-1.183.715-1.883 1.639-2.004l.339-.043c.654-.084 1.113-.534 1.113-1.165 0-.529-.286-.996-.744-1.208l-1.498-.688c-.931-.428-1.602-1.361-1.602-2.524 0-.679.444-1.252 1.089-1.537.282-.124.561-.275.864-.417.402-.192.788-.422 1.096-.667.164-.13.307-.281.475-.415.164-.124.306-.28.466-.42.008-.008.023-.016.031-.024.15-.15.33-.297.51-.44.39-.313.856-.543 1.307-.752.425-.197.859-.36 1.308-.49.03-.01.05-.03.09-.03.08 0 .16.02.22.05.07.03.14.06.21.1.1.06.18.13.28.22.22.19.39.45.66.73.51.54 1.12 1.2 1.75 1.77 1.22 1.08 2.25 2.48 2.9 3.5 1.1 1.72 1.72 3.72 1.72 5.77 0 1.27-.19 2.5-.56 3.65-.6 1.85-1.77 3.34-3.62 4.43-1.56.92-3.5 1.46-5.66 1.46-1.55 0-3.06-.38-4.5-1.14-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67 0-2.74 2.14-4.96 4.77-4.96 1.38 0 2.64.47 3.71 1.32 1.12.89 2.01 2.08 2.64 3.48 1.15 2.57.67 5.5-1.24 7.39-.6 1.2-1.62 2.06-3.02 2.53-2.13.72-5.1 1.54-7.26 1.54-2.03 0-4-.42-5.74-1.24-1.32-.68-2.46-1.66-3.3-2.9-.73-1.08-1.09-2.38-1.09-3.67" /></svg>
                    </div>
                    <p className="text-ink/60 leading-relaxed flex-1 mb-6">{testimonial.quote}</p>
                    <div className="flex items-center gap-4">
                      <img
                        src={testimonial.avatar}
                        alt=""
                        className="w-12 h-12 rounded-full border-2 border-gold/30"
                        aria-hidden="true"
                      />
                      <div className="text-left">
                        <p className="font-medium text-ink">{testimonial.author}</p>
                        <p className="text-xs text-ink/50">{testimonial.role}، {testimonial.company}</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === CTA SECTION === */}
        <section id="cta" data-chapter="cta" data-chapter-progress="1.0" className="min-h-[80vh] flex items-center justify-center px-6" ref={(el) => { sectionRefs.current.cta = el as HTMLDivElement; }}>
          <div className={`container mx-auto max-w-3xl text-center ${isRevealed('cta') ? 'animate-fade-in-up' : 'reveal'}`} id="cta">
            <div className="chapter-mark">الفصل القادم</div>
            <div className="chapter-eyebrow">رحلتك تبدأ الآن</div>
            <h2 className="chapter-heading text-5xl sm:text-6xl font-display font-light leading-[1.1] mb-8">
              المستقبل لا ينتظر.<br />
              <em className="text-gradient">ابنِ وكيلك اليوم.</em>
            </h2>
            <p className="chapter-text text-lg sm:text-xl max-w-2xl mx-auto mb-12">
              انضم إلى آلاف الشركات التي غيرت طريقة عملها مع Atheer Agent AI.
              ابدأ مجاناً، بدون بطاقة ائتمان.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <CrystalButton size="xl" rightIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5l-10 0"/></svg>}>
                  ابدأ مجاناً الآن
                </CrystalButton>
              </Link>
              <Link href="#contact">
                <Button variant="outline" size="lg">
                  تواصل مع المبيعات
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* === FOOTER === */}
        <footer className="relative z-10 py-16 border-t border-white/10 bg-space/50 backdrop-blur-[20px]">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
              <div className="lg:col-span-2">
                <Link href="/" className="flex items-center gap-3 mb-6" aria-label="Atheer Agent AI">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-space" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <span className="font-display text-xl font-medium text-ink">Atheer Agent AI</span>
                </Link>
                <p className="text-ink/60 leading-relaxed max-w-sm mb-6">
                  منصة الوكلاء الذكية الرائدة في المنطقة. ابنِ وكلاء AI مخصصة، أتمت عملياتك، وحقّق النمو.
                </p>
                <div className="flex gap-4">
                  <a href="https://twitter.com/atheerai" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink/60 hover:text-gold hover:border-gold/50 transition-all duration-300" aria-label="Twitter">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.83L1.68 2.25h3.081l7.13 9.25 7.66-10.18Z"/></svg>
                  </a>
                  <a href="https://linkedin.com/company/atheerai" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink/60 hover:text-gold hover:border-gold/50 transition-all duration-300" aria-label="LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.92 3.37-1.92 2.375 0 2.84 1.774 2.84 4.092v6.753ZM5.005 6.727c-1.294 0-2.284-1.074-2.284-2.4 0-1.325 1.056-2.4 2.363-2.4 1.287 0 2.274 1.062 2.287 2.393 0 1.333-.997 2.398-2.375 2.4H5.005ZM1.502 20.452H0V6.448h3.993V20.452ZM24 20.452h-3.88l-.05-3.696c0-1.708-.464-3.12-2.205-3.12-2.118 0-2.756 1.826-2.756 3.374v3.745h-3.552V6.448h3.557v1.562h.04c.628-1.198 2.186-3.43 4.392-3.43 2.568 0 3.338 1.918 3.338 4.043v6.71Z"/></svg>
                  </a>
                  <a href="https://github.com/atheerai" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink/60 hover:text-gold hover:border-gold/50 transition-all duration-300" aria-label="GitHub">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.804 2.807 1.301 3.492.997.077-.78.468-1.305.849-1.604-2.665-.305-5.464-1.332-5.464-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 2.988.39.814-1.133 2.396-1.72 3.413-1.914.099.759.22 1.524.115 3.176.771.84 1.271 1.911 1.235 3.221 0 4.61-2.805 5.904-5.479 5.931.43.372.81 1.096.81 2.2 0 1.538-.012 2.774-.012 3.162 0 .319.21.678.793.577C20.566 17.3 24 12.867 24 12c0-6.627-5.373-12-12-12z"/></svg>
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-display text-lg font-medium text-ink mb-4">المنتج</h4>
                <ul className="space-y-3">
                  <li><Link href="#features" className="text-ink/60 hover:text-gold transition-colors">المميزات</Link></li>
                  <li><Link href="#pricing" className="text-ink/60 hover:text-gold transition-colors">الأسعار</Link></li>
                  <li><Link href="/docs" className="text-ink/60 hover:text-gold transition-colors">التوثيق</Link></li>
                  <li><Link href="/api" className="text-ink/60 hover:text-gold transition-colors">API</Link></li>
                  <li><Link href="/changelog" className="text-ink/60 hover:text-gold transition-colors">سجل التغييرات</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-display text-lg font-medium text-ink mb-4">الشركة</h4>
                <ul className="space-y-3">
                  <li><Link href="/about" className="text-ink/60 hover:text-gold transition-colors">من نحن</Link></li>
                  <li><Link href="/blog" className="text-ink/60 hover:text-gold transition-colors">المدونة</Link></li>
                  <li><Link href="/careers" className="text-ink/60 hover:text-gold transition-colors">الوظائف</Link></li>
                  <li><Link href="/press" className="text-ink/60 hover:text-gold transition-colors">الصحافة</Link></li>
                  <li><Link href="/partners" className="text-ink/60 hover:text-gold transition-colors">الشراكات</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-display text-lg font-medium text-ink mb-4">الموارد</h4>
                <ul className="space-y-3">
                  <li><Link href="/docs" className="text-ink/60 hover:text-gold transition-colors">التوثيق</Link></li>
                  <li><Link href="/community" className="text-ink/60 hover:text-gold transition-colors">المجتمع</Link></li>
                  <li><Link href="/support" className="text-ink/60 hover:text-gold transition-colors">الدعم</Link></li>
                  <li><Link href="/status" className="text-ink/60 hover:text-gold transition-colors">حالة النظام</Link></li>
                  <li><Link href="/security" className="text-ink/60 hover:text-gold transition-colors">الأمان</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-display text-lg font-medium text-ink mb-4">القانونية</h4>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className="text-ink/60 hover:text-gold transition-colors">الخصوصية</Link></li>
                  <li><Link href="/terms" className="text-ink/60 hover:text-gold transition-colors">الشروط</Link></li>
                  <li><Link href="/cookies" className="text-ink/60 hover:text-gold transition-colors">ملفات تعريف الارتباط</Link></li>
                  <li><Link href="/compliance" className="text-ink/60 hover:text-gold transition-colors">الامتثال</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-ink/40 text-sm">
                  © 2024 Atheer Agent AI. جميع الحقوق محفوظة.
                </p>
                <div className="flex items-center gap-6 text-sm text-ink/50">
                  <Link href="/privacy" className="hover:text-gold transition-colors">الخصوصية</Link>
                  <Link href="/terms" className="hover:text-gold transition-colors">الشروط</Link>
                  <Link href="/cookies" className="hover:text-gold transition-colors">الكوكيز</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}