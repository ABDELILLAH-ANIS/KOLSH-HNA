// js/package_translations.js
const packageTranslations = {
  ar: {
    back: "رجوع",
    choose_plan_title: "اختر الباقة المناسبة لمتجرك",
    monthly: "شهري",
    yearly: "سنوي",
    currency: "دج",
    select_button: "اختيار",
    select_language: "اختر اللغة",
    close_btn: "إغلاق",
    plan_basic: "الأساسية (Basic)",
    plan_gold: "الذهبية (Gold)",
    plan_premium: "بريميوم (Premium)",
    plan_vip: "VIP",
    plan_badge_gold: "شائعة",
    plan_badge_vip: "الأفضل",
    f_basic_1: "5 منتجات",
    f_gold_1: "20 منتج",
    f_premium_1: "50 منتج",
    f_unlimited: "منتجات غير محدودة",
    f_visitors: "إحصائيات عدد الزوار",
    f_email_support: "دعم عبر البريد الإلكتروني",
    f_priority: "أولوية عند البحث",
    f_sales_stats: "إحصاء المبيعات (يدوي)",
    f_homepage: "ظهور في الواجهة الرئيسية",
    f_priority_support: "أولوية الدعم الفني",
    f_full_analytics: "إحصاء شامل للمتجر",
    f_custom_ui: "واجهة خاصة للمتجر",
    f_vip_ads: "إعلانات في الواجهة",
    f_social_ads: "إعلانات ممولة في مواقع التواصل (3/شهرياً)",
    already_subscribed: "أنت مشترك بالفعل",
    login_to_view: "سجل الدخول لعرض باقاتك",
    logout: "تسجيل الخروج",
    login_btn: "تسجيل الدخول"
  },
  
  fr: {
    back: "Retour",
    choose_plan_title: "Choisir le forfait idéal",
    monthly: "Mensuel",
    yearly: "Annuel",
    currency: "DA",
    select_button: "Choisir",
    select_language: "Choisir la langue",
    close_btn: "Fermer",
    plan_basic: "Basique (Basic)",
    plan_gold: "Or (Gold)",
    plan_premium: "Premium",
    plan_vip: "VIP",
    plan_badge_gold: "Populaire",
    plan_badge_vip: "Le meilleur",
    f_basic_1: "5 produits",
    f_gold_1: "20 produits",
    f_premium_1: "50 produits",
    f_unlimited: "Produits illimités",
    f_visitors: "Statistiques des visiteurs",
    f_email_support: "Support par email",
    f_priority: "Priorité de recherche",
    f_sales_stats: "Statistiques de ventes (Manuel)",
    f_homepage: "Sur la page d'accueil",
    f_priority_support: "Support prioritaire",
    f_full_analytics: "Analyses complètes",
    f_custom_ui: "Interface personnalisée",
    f_vip_ads: "Publicités d'accueil",
    f_social_ads: "Publicités sponsorisées sur les réseaux sociaux (3/mois)",
    already_subscribed: "Vous êtes déjà abonné",
    login_to_view: "Connectez-vous pour voir vos forfaits",
    logout: "Déconnexion",
    login_btn: "Connexion"
  },
  
  en: {
    back: "Back",
    choose_plan_title: "Choose the right plan",
    monthly: "Monthly",
    yearly: "Yearly",
    currency: "DA",
    select_button: "Select",
    select_language: "Select Language",
    close_btn: "Close",
    plan_basic: "Basic Plan",
    plan_gold: "Gold Plan",
    plan_premium: "Premium Plan",
    plan_vip: "VIP Plan",
    plan_badge_gold: "Popular",
    plan_badge_vip: "Best",
    f_basic_1: "5 products",
    f_gold_1: "20 products",
    f_premium_1: "50 products",
    f_unlimited: "Unlimited products",
    f_visitors: "Visitor statistics",
    f_email_support: "Email support",
    f_priority: "Search priority",
    f_sales_stats: "Sales stats (Manual)",
    f_homepage: "Homepage visibility",
    f_priority_support: "Priority support",
    f_full_analytics: "Full analytics",
    f_custom_ui: "Custom store UI",
    f_vip_ads: "Homepage ads",
    f_social_ads: "Sponsored ads on social media (3/month)",
    already_subscribed: "You're already subscribed",
    login_to_view: "Login to view your plans",
    logout: "Logout",
    login_btn: "Login"
  }
};

// نظام الترجمة المبسط
class PackageTranslationManager {
  constructor() {
    this.currentLang = localStorage.getItem("appLanguage") || localStorage.getItem("lang") || localStorage.getItem("packageLang") || "ar";
    // Sync all language keys
    localStorage.setItem("appLanguage", this.currentLang);
    localStorage.setItem("lang", this.currentLang);
    localStorage.setItem("packageLang", this.currentLang);
    this.applyTranslations();
  }
  
  getDictionary() {
    return packageTranslations[this.currentLang] || packageTranslations.ar;
  }
  
  applyTranslations() {
    const lang = this.currentLang;
    const dict = this.getDictionary();
    
    document.querySelectorAll("[data-key]").forEach(el => {
      const key = el.getAttribute("data-key");
      if (dict[key]) {
        if (el.tagName === 'INPUT') {
          el.placeholder = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });
    
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // تحديث العملة في الأسعار
    this.updateCurrency();
  }
  
  updateCurrency() {
    const lang = this.currentLang;
    const currency = packageTranslations[lang]?.currency || "دج";
    
    document.querySelectorAll(".price span").forEach(span => {
      if (span.getAttribute("data-key") === "currency") {
        span.textContent = currency;
      }
    });
  }
  
  updatePricing() {
    if (typeof window.updatePricing === 'function') {
      window.updatePricing();
    }
  }
  
  switchLanguage(lang) {
    if (packageTranslations[lang]) {
      this.currentLang = lang;
      localStorage.setItem("appLanguage", lang);
      localStorage.setItem("lang", lang);
      localStorage.setItem("packageLang", lang);
      this.applyTranslations();
      this.updatePricing(); // تحديث الأسعار مع العملة الجديدة
      return true;
    }
    return false;
  }
}

// إنشاء نسخة عامة
window.packageTranslation = new PackageTranslationManager();

// دوال عامة للمساعدة
window.packageSwitchLanguage = function(lang) {
  window.packageTranslation.switchLanguage(lang);
  toggleLangModal();
};