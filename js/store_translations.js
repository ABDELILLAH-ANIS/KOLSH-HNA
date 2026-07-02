// js/store_translations.js
// ترجمات صفحة المتجر (عربي / فرنسي / إنجليزي)

const storeTranslations = {
  ar: {
    page_title: 'متجر - كلش هنا',
    back_home: 'الرئيسية',
    loading: 'جاري التحميل...',
    loading_store: 'جاري تحميل المتجر...',
    latest_products: 'أحدث المنتجات',
    footer_rights: 'جميع الحقوق محفوظة © كلش هنا',
    no_products_title: 'لا توجد منتجات حالياً',
    no_products_desc: 'هذا المتجر لم يقم بإضافة أي منتجات بعد.',
    error_title: 'خطأ',
    error_db: 'تعذر الاتصال بقاعدة البيانات.',
    error_no_store: 'لم يتم تحديد المتجر.',
    error_not_found: 'لم يتم العثور على المتجر.',
    error_unexpected: 'حدث خطأ غير متوقع.',
    back_to_home: 'العودة للرئيسية',
    currency: 'دج',
    store_unnamed: 'متجر بدون اسم',
    store_default_title: 'متجر',
    featured_store: 'متجر متميز',
    cartEmpty: 'السلة فارغة',
    storePrefix: 'متجر:',
    cartTitle: '🛒 سلة التسوق',
    promoCodeLabel: 'كود الخصم (إن وجد)',
    fullNameLabel: 'الاسم الكامل',
    fullNamePlaceholder: 'أدخل اسمك الكريم',
    phoneLabel: 'رقم الهاتف للتواصل',
    phonePlaceholder: 'أدخل رقم هاتفك',
    checkoutBtn: 'إتمام الطلب عبر واتساب',
    requiredFieldsAlert: 'يرجى إدخال الاسم ورقم الهاتف لإتمام الطلب.',
    cart: 'السلة',
    add_to_cart: 'إضافة للسلة',
    product_details: 'تفاصيل المنتج',
    total: 'المجموع:'
  },
  fr: {
    page_title: 'Boutique - Tout Ici',
    back_home: 'Accueil',
    loading: 'Chargement...',
    loading_store: 'Chargement de la boutique...',
    latest_products: 'Derniers Produits',
    footer_rights: 'Tous droits réservés © Tout Ici',
    no_products_title: 'Aucun produit disponible',
    no_products_desc: "Cette boutique n'a pas encore ajouté de produits.",
    error_title: 'Erreur',
    error_db: 'Impossible de se connecter à la base de données.',
    error_no_store: 'Aucune boutique spécifiée.',
    error_not_found: 'Boutique introuvable.',
    error_unexpected: 'Une erreur inattendue est survenue.',
    back_to_home: "Retour à l'accueil",
    currency: 'DA',
    store_unnamed: 'Boutique sans nom',
    store_default_title: 'Boutique',
    featured_store: 'Boutique premium',
    cartEmpty: 'Le panier est vide',
    storePrefix: 'Boutique:',
    cartTitle: '🛒 Panier',
    promoCodeLabel: 'Code promo (si disponible)',
    fullNameLabel: 'Nom complet',
    fullNamePlaceholder: 'Entrez votre nom',
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: 'Entrez votre numéro',
    checkoutBtn: 'Passer la commande via WhatsApp',
    requiredFieldsAlert: 'Veuillez entrer le nom et le numéro de téléphone.',
    cart: 'Panier',
    add_to_cart: 'Ajouter au panier',
    product_details: 'Détails du produit',
    total: 'Total :'
  },
  en: {
    page_title: 'Store - Everything Here',
    back_home: 'Home',
    loading: 'Loading...',
    loading_store: 'Loading store...',
    latest_products: 'Latest Products',
    footer_rights: 'All Rights Reserved © Everything Here',
    no_products_title: 'No products available',
    no_products_desc: 'This store has not added any products yet.',
    error_title: 'Error',
    error_db: 'Could not connect to the database.',
    error_no_store: 'No store specified.',
    error_not_found: 'Store not found.',
    error_unexpected: 'An unexpected error occurred.',
    back_to_home: 'Back to Home',
    currency: 'DZD',
    store_unnamed: 'Unnamed Store',
    store_default_title: 'Store',
    featured_store: 'Featured store',
    cartEmpty: 'Cart is empty',
    storePrefix: 'Store:',
    cartTitle: '🛒 Shopping Cart',
    promoCodeLabel: 'Promo Code (if any)',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    checkoutBtn: 'Complete Order via WhatsApp',
    requiredFieldsAlert: 'Please enter name and phone number.',
    cart: 'Cart',
    add_to_cart: 'Add to Cart',
    product_details: 'Product Details',
    total: 'Total:'
  }
};

// اللغة الحالية
let currentStoreLang = localStorage.getItem('appLanguage') || localStorage.getItem('lang') || localStorage.getItem('packageLang') || 'ar';

// دالة الترجمة
function st(key) {
  return storeTranslations[currentStoreLang]?.[key]
      || storeTranslations['ar']?.[key]
      || key;
}

// تبديل اللغة (دائري: ar → fr → en → ar)
function cycleLang() {
  const langs = ['ar', 'fr', 'en'];
  const idx = langs.indexOf(currentStoreLang);
  currentStoreLang = langs[(idx + 1) % langs.length];

  localStorage.setItem('appLanguage', currentStoreLang);
  localStorage.setItem('lang', currentStoreLang);
  localStorage.setItem('packageLang', currentStoreLang);

  applyStoreTranslations();

  // إعادة رسم المنتجات مع اللغة الجديدة
  if (window._cachedProducts) {
    renderProducts(window._cachedProducts);
  }
}

// تطبيق الترجمات على الصفحة
function applyStoreTranslations() {
  // اتجاه الصفحة
  if (currentStoreLang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = currentStoreLang;
  }

  // تحديث عناصر data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = st(key);
    if (el.tagName === 'TITLE') {
      document.title = text;
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });

  // تسمية زر اللغة
  const langLabel = document.getElementById('currentLangLabel');
  if (langLabel) {
    langLabel.textContent = { ar: 'AR', fr: 'FR', en: 'EN' }[currentStoreLang] || 'AR';
  }

  // أيقونة السهم حسب الاتجاه
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    const icon = backBtn.querySelector('i');
    if (icon) {
      icon.className = currentStoreLang === 'ar' ? 'fas fa-arrow-right' : 'fas fa-arrow-left';
    }
  }

  // إعادة رسم عناصر السلة لتحديث لغتها
  if (window.Cart && typeof window.Cart.renderItems === 'function') {
    window.Cart.renderItems();
  }
}

// التصدير العالمي
window.st = st;
window.cycleLang = cycleLang;
window.applyStoreTranslations = applyStoreTranslations;
