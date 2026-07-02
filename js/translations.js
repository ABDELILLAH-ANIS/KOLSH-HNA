// ========== 1. ملف الترجمات الكامل ==========
const translations = {
  ar: {
    // التطبيق الرئيسي
    appName: "كلش هنا",
    themeToggleDark: "الوضع الداكن",
    themeToggleLight: "الوضع الفاتح",
    tagline: "دليل المتاجر الأول",
    
    // القوائم والتنقل
    home: "🏠 الصفحة الرئيسية",
    contactUs: "📞 تواصل معنا",
    aboutMe: "👤 من أنا",
    login: "🔐 تسجيل الدخول",
    mainMenu: "القائمة الرئيسية",
    languageMenu: "قائمة اللغات",
    closeAll: "إغلاق الكل",
    back: "العودة",
    next: "التالي",
    previous: "السابق",
    search: "بحث",
    searchPlaceholder: "ابحث عن متجر...",
    clearSearch: "مسح البحث",
    
    // أقسام المحتوى
    vipStores: "المتاجر المميزة",
    vipAdsTitle: "الواجهات المميزة VIP",
    allStores: "جميع المتاجر",
    loadingStores: "جاري تحميل المتاجر...",
    noStoresFound: "لم يتم العثور على متاجر",
    tryDifferentSearch: "جرب كلمات بحث أخرى",
    storesFound: "تم العثور على {count} متجر",
    
    // معلومات المتاجر
    storeName: "اسم المتجر",
    storeCategory: "التصنيف",
    storeDescription: "الوصف",
    storeLocation: "الموقع",
    storeContact: "الاتصال",
    viewStore: "عرض المتجر",
    visitWebsite: "زيارة الموقع",
    callStore: "اتصال هاتفي",
    
    // الباقات والأولويات
    packageVIP: "باقة VIP",
    packagePremium: "باقة مميزة",
    packageStandard: "باقة عادية",
    packageBasic: "باقة أساسية",
    noPackage: "بدون باقة",
    
    // نافذة التواصل
    contactTitle: "معلومات التواصل",
    contactEmail: "البريد الإلكتروني",
    contactPhone: "الهاتف",
    contactHours: "أوقات العمل",
    contactSupport: "الدعم الفني",
    close: "إغلاق",
    sendMessage: "إرسال رسالة",
    
    // الفوتر
    footerContact: "تواصل معنا",
    footerAbout: "عن الموقع",
    footerPrivacy: "سياسة الخصوصية",
    footerTerms: "الشروط والأحكام",
    footerRights: "جميع الحقوق محفوظة © كلش هنا 2025",
    followUs: "تابعونا",
    
    // صفحات التحكم
    page: "صفحة",
    of: "من",
    itemsPerPage: "عنصر لكل صفحة",
    showingResults: "عرض النتائج {from} إلى {to} من {total}",
    
    // رسائل النظام
    loading: "جاري التحميل...",
    error: "حدث خطأ",
    retry: "إعادة المحاولة",
    success: "تم بنجاح",
    warning: "تحذير",
    info: "معلومة",
    
    // أخطاء
    errorLoadingStores: "تعذر تحميل المتاجر",
    errorNetwork: "خطأ في الاتصال بالشبكة",
    errorServer: "خطأ في الخادم",
    errorNotFound: "لم يتم العثور",
    
    // التنبيهات والإشعارات
    languageChanged: "تم تغيير اللغة إلى العربية",
    searchCleared: "تم مسح البحث",
    dataUpdated: "تم تحديث البيانات",
    welcomeBack: "مرحباً بعودتك",
    
    // أيام الأسبوع
    sunday: "الأحد",
    monday: "الاثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
    
    // أوقات العمل
    workHours: "9:00 ص - 5:00 م",
    alwaysOpen: "مفتوح 24/7",
    
    // فئات المتاجر
    categoriesTitle: "قائمة لتصنيف المتاجر",
    categoryAll: "الكل",
    categoryElectronics: "إلكترونيات",
    categoryClothing: "ملابس",
    categoryBooks: "كتب",
    categorySports: "رياضة",
    categoryFood: "مأكولات",
    categoryTechnology: "تكنولوجيا",
    categoryDecor: "ديكور",
    categoryPerfumes: "عطور",
    categoryGames: "ألعاب",
    categoryJewelry: "مجوهرات",
    categoryFurniture: "أثاث",
    categoryCars: "سيارات",
    categoryHealth: "صحة",
    categoryPets: "حيوانات",
    categoryMusic: "موسيقى",
    categoryOther: "أخرى",
    
    // السلة
    cartEmpty: "السلة فارغة",
    storePrefix: "متجر:",
    
    // الميزات المضافة والصفحات الجديدة
    realEstate: "🏠 العقارات",
    realEstateTitle: "عقارات للبيع والإيجار",
    realEstateSubtitle: "اكتشف أفضل العقارات في الجزائر — شقق، فيلات، أراضي وعقارات تجارية",
    realEstateTitleHeader: "العقارات",
    priceLabel: "السعر",
    areaLabel: "المساحة",
    allWilayas: "كل الولايات",
    back_to_home_btn: "العودة للرئيسية",
    packages: "💎 الباقات",
    viewAll: "عرض الكل ←",
    back_to_home: "العودة للرئيسية",
    back_btn_label: "رجوع",
    
    // ترجمات واجهة العقارات والتصفية
    filterResults: "تصفية النتائج",
    offerType: "نوع العرض",
    propertyType: "نوع العقار",
    wilaya: "الولاية",
    roomsCount: "عدد الغرف",
    priceRange: "نطاق السعر (DA)",
    priceMin: "الأدنى",
    priceMax: "الأعلى",
    area: "المساحة (م²)",
    areaMin: "الأدنى",
    areaMax: "الأعلى",
    searchBtn: "بحث",
    resetBtn: "إعادة ضبط",
    availableListings: "عقار متاح",
    sortBy: "ترتيب حسب",
    sortFeatured: "المميزة أولاً",
    sortNewest: "الأحدث أولاً",
    sortPriceAsc: "السعر: الأقل أولاً",
    sortPriceDesc: "السعر: الأعلى أولاً",
    sortAreaDesc: "المساحة: الأكبر أولاً",
    contactWhatsapp: "واتساب",
    contactPhone: "اتصال",
    details: "التفاصيل",
    rooms: "غرف",
    floor: "الطابق",
    bathrooms: "دورات المياه",
    parking: "موقف سيارة",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    anyCount: "أي عدد",
    oneRoom: "1 غرفة",
    twoRooms: "2 غرف",
    threeRooms: "3 غرف",
    fourRooms: "4 غرف",
    fiveRooms: "5 غرف فأكثر",
    
    // ترجمات السلة الموسعة
    cartTitle: "🛒 سلة التسوق",
    promoCodeLabel: "كود الخصم (إن وجد)",
    fullNameLabel: "الاسم الكامل",
    fullNamePlaceholder: "أدخل اسمك الكريم",
    phoneLabel: "رقم الهاتف للتواصل",
    phonePlaceholder: "أدخل رقم هاتفك",
    checkoutBtn: "إتمام الطلب عبر واتساب",
    requiredFieldsAlert: "يرجى إدخال الاسم ورقم الهاتف لإتمام الطلب.",
    multipleMerchantsAlert: "منتجاتك من عدة متاجر. الرجاء تأكيد الطلب مع كل تاجر:",
    sendToMerchant: "إرسال لمتجر: {name}",
    categoryRealEstate: "عقارات",
    sale: "للبيع",
    rent: "للإيجار",
    vacation: "للاصطياف",
    apartment: "شقة",
    villa: "فيلا",
    land: "أرض",
    propCommercial: "محل تجاري",
    office: "مكتب",
    studio: "استوديو",
    featured: "مميز",
    area_unit: "م²",
    perMonth: "/شهر",
    priceNegotiable: "السعر عند التفاوض",
    contactViaWhatsapp: "تواصل عبر واتساب"
  },
  
  fr: {
    // Application principale
    appName: "Tout Ici",
    themeToggleDark: "Mode sombre",
    themeToggleLight: "Mode clair",
    tagline: "Le Premier Guide des Boutiques",
    
    // Menus et navigation
    home: "🏠 Page d'accueil",
    contactUs: "📞 Contactez-nous",
    aboutMe: "👤 Qui suis-je",
    login: "🔐 Connexion",
    mainMenu: "Menu principal",
    languageMenu: "Menu des langues",
    closeAll: "Tout fermer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    search: "Rechercher",
    searchPlaceholder: "🔍 Rechercher une boutique...",
    clearSearch: "Effacer la recherche",
    
    // Sections du contenu
    vipStores: "Boutiques VIP 💎",
    vipAdsTitle: "Vitrines VIP",
    allStores: "Toutes les boutiques",
    loadingStores: "Chargement des boutiques...",
    noStoresFound: "Aucune boutique trouvée",
    tryDifferentSearch: "Essayez d'autres mots-clés",
    storesFound: "{count} boutique(s) trouvée(s)",
    
    // Informations des boutiques
    storeName: "Nom de la boutique",
    storeCategory: "Catégorie",
    storeDescription: "Description",
    storeLocation: "Emplacement",
    storeContact: "Contact",
    viewStore: "Voir la boutique",
    visitWebsite: "Visiter le site",
    callStore: "Appeler",
    
    // Packages et priorités
    packageVIP: "Pack VIP 💎",
    packagePremium: "Pack Premium ⭐",
    packageStandard: "Pack Standard",
    packageBasic: "Pack Basique",
    noPackage: "Sans pack",
    
    // Fenêtre de contact
    contactTitle: "📞 Informations de contact",
    contactEmail: "📧 E-mail",
    contactPhone: "📞 Téléphone",
    contactHours: "🕒 Heures d'ouverture",
    contactSupport: "💬 Support technique",
    close: "Fermer",
    sendMessage: "Envoyer un message",
    
    // Pied de page
    footerContact: "📞 Contactez-nous",
    footerAbout: "ℹ️ À propos",
    footerPrivacy: "🔒 Politique de confidentialité",
    footerTerms: "📋 Conditions d'utilisation",
    footerRights: "Tous droits réservés © Tout Ici 2025",
    followUs: "Suivez-nous",
    
    // Pages de contrôle
    page: "Page",
    of: "sur",
    itemsPerPage: "éléments par page",
    showingResults: "Affichage des résultats {from} à {to} sur {total}",
    
    // Messages système
    loading: "Chargement...",
    error: "Une erreur est survenue",
    retry: "Réessayer",
    success: "Succès",
    warning: "Avertissement",
    info: "Information",
    
    // Erreurs
    errorLoadingStores: "Impossible de charger les boutiques",
    errorNetwork: "Erreur de connexion réseau",
    errorServer: "Erreur du serveur",
    errorNotFound: "Non trouvé",
    
    // Alertes et notifications
    languageChanged: "Langue changée en français",
    searchCleared: "Recherche effacée",
    dataUpdated: "Données mises à jour",
    welcomeBack: "Bon retour",
    
    // Jours de la semaine
    sunday: "Dimanche",
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    
    // Heures d'ouverture
    workHours: "9h00 - 17h00",
    alwaysOpen: "Ouvert 24h/24",
    
    // Catégories de boutiques
    categoriesTitle: "Liste des catégories de boutiques",
    categoryAll: "Toutes",
    categoryElectronics: "Électronique",
    categoryClothing: "Vêtements",
    categoryBooks: "Livres",
    categorySports: "Sport",
    categoryFood: "Nourriture",
    categoryTechnology: "Technologie",
    categoryDecor: "Décoration",
    categoryPerfumes: "Parfums",
    categoryGames: "Jeux",
    categoryJewelry: "Bijoux",
    categoryFurniture: "Meubles",
    categoryCars: "Voitures",
    categoryHealth: "Santé",
    categoryPets: "Animaux",
    categoryMusic: "Musique",
    categoryOther: "Autre",
    
    // Panier
    cartEmpty: "Le panier est vide",
    storePrefix: "Boutique:",
    
    // Added features and new pages
    realEstate: "🏠 Immobilier",
    realEstateTitle: "Immobilier à vendre et à louer",
    realEstateSubtitle: "Découvrez les meilleurs biens immobiliers en Algérie — appartements, villas, terrains et commerces",
    realEstateTitleHeader: "🏠 Immobilier",
    priceLabel: "Prix",
    areaLabel: "Superficie",
    allWilayas: "Toutes les wilayas",
    back_to_home_btn: "Retour à l'accueil",
    packages: "💎 Packs",
    viewAll: "Voir tout ←",
    back_to_home: "Retour à l'accueil",
    back_btn_label: "Retour",
    
    // Real Estate translations
    filterResults: "Filtrer les résultats",
    offerType: "Type d'offre",
    propertyType: "Type de bien",
    wilaya: "Wilaya",
    roomsCount: "Nombre de pièces",
    priceRange: "Fourchette de prix (DA)",
    priceMin: "Min",
    priceMax: "Max",
    area: "Superficie (m²)",
    areaMin: "Min",
    areaMax: "Max",
    searchBtn: "Rechercher",
    resetBtn: "Réinitialiser",
    availableListings: "biens disponibles",
    sortBy: "Trier par",
    sortFeatured: "Vedettes en premier",
    sortNewest: "Plus récents",
    sortPriceAsc: "Prix : bas en premier",
    sortPriceDesc: "Prix : élevé en premier",
    sortAreaDesc: "Superficie : grand en premier",
    contactWhatsapp: "WhatsApp",
    contactPhone: "Appeler",
    details: "Détails",
    rooms: "pièces",
    floor: "Étage",
    bathrooms: "Salles de bain",
    parking: "Parking",
    yes: "Oui",
    no: "Non",
    all: "Tout",
    anyCount: "Tout nombre",
    oneRoom: "1 pièce",
    twoRooms: "2 pièces",
    threeRooms: "3 pièces",
    fourRooms: "4 pièces",
    fiveRooms: "5 pièces ou plus",
    
    // Expanded Cart translations
    cartTitle: "🛒 Panier",
    promoCodeLabel: "Code promo (si disponible)",
    fullNameLabel: "Nom complet",
    fullNamePlaceholder: "Entrez votre nom",
    phoneLabel: "Numéro de téléphone",
    phonePlaceholder: "Entrez votre numéro",
    checkoutBtn: "Passer la commande via WhatsApp",
    requiredFieldsAlert: "Veuillez entrer le nom et le numéro de téléphone pour compléter la commande.",
    multipleMerchantsAlert: "Vos produits proviennent de plusieurs boutiques. Veuillez confirmer la commande avec chaque vendeur :",
    sendToMerchant: "Envoyer à la boutique : {name}",
    categoryRealEstate: "🏠 Immobilier",
    sale: "À vendre",
    rent: "À louer",
    vacation: "Pour vacances",
    apartment: "Appartement",
    villa: "Villa",
    land: "Terrain",
    propCommercial: "Local commercial",
    office: "Bureau",
    studio: "Studio",
    featured: "⭐ Vedette",
    area_unit: "m²",
    perMonth: "/mois",
    priceNegotiable: "Prix négociable",
    contactViaWhatsapp: "Contacter via WhatsApp"
  },
  
  en: {
    // Main Application
    appName: "Everything Here",
    themeToggleDark: "Dark Mode",
    themeToggleLight: "Light Mode",
    tagline: "The First Store Guide",
    
    // Menus and Navigation
    home: "🏠 Home Page",
    contactUs: "📞 Contact Us",
    aboutMe: "👤 About Me",
    login: "🔐 Login",
    mainMenu: "Main Menu",
    languageMenu: "Language Menu",
    closeAll: "Close All",
    back: "Back",
    next: "Next",
    previous: "Previous",
    search: "Search",
    searchPlaceholder: "🔍 Search for a store...",
    clearSearch: "Clear Search",
    
    // Content Sections
    vipStores: "VIP Stores 💎",
    vipAdsTitle: "VIP Featured Stores",
    allStores: "All Stores",
    loadingStores: "Loading stores...",
    noStoresFound: "No stores found",
    tryDifferentSearch: "Try different keywords",
    storesFound: "Found {count} store(s)",
    
    // Store Information
    storeName: "Store Name",
    storeCategory: "Category",
    storeDescription: "Description",
    storeLocation: "Location",
    storeContact: "Contact",
    viewStore: "View Store",
    visitWebsite: "Visit Website",
    callStore: "Call Store",
    
    // Packages and Priorities
    packageVIP: "VIP Package 💎",
    packagePremium: "Premium Package ⭐",
    packageStandard: "Standard Package",
    packageBasic: "Basic Package",
    noPackage: "No Package",
    
    // Contact Window
    contactTitle: "📞 Contact Information",
    contactEmail: "📧 Email",
    contactPhone: "📞 Phone",
    contactHours: "🕒 Working Hours",
    contactSupport: "💬 Technical Support",
    close: "Close",
    sendMessage: "Send Message",
    
    // Footer
    footerContact: "📞 Contact Us",
    footerAbout: "ℹ️ About",
    footerPrivacy: "🔒 Privacy Policy",
    footerTerms: "📋 Terms & Conditions",
    footerRights: "All Rights Reserved © Everything Here 2025",
    followUs: "Follow Us",
    
    // Control Pages
    page: "Page",
    of: "of",
    itemsPerPage: "items per page",
    showingResults: "Showing results {from} to {to} of {total}",
    
    // System Messages
    loading: "Loading...",
    error: "An error occurred",
    retry: "Retry",
    success: "Success",
    warning: "Warning",
    info: "Information",
    
    // Errors
    errorLoadingStores: "Failed to load stores",
    errorNetwork: "Network connection error",
    errorServer: "Server error",
    errorNotFound: "Not found",
    
    // Alerts and Notifications
    languageChanged: "Language switched to English",
    searchCleared: "Search cleared",
    dataUpdated: "Data updated",
    welcomeBack: "Welcome back",
    
    // Days of the Week
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    
    // Working Hours
    workHours: "9:00 AM - 5:00 PM",
    alwaysOpen: "Open 24/7",
    
    // Store Categories
    categoriesTitle: "Store Categories List",
    categoryAll: "All",
    categoryElectronics: "Electronics",
    categoryClothing: "Clothing",
    categoryBooks: "Books",
    categorySports: "Sports",
    categoryFood: "Food",
    categoryTechnology: "Technology",
    categoryDecor: "Decor",
    categoryPerfumes: "Perfumes",
    categoryGames: "Games",
    categoryJewelry: "Jewelry",
    categoryFurniture: "Furniture",
    categoryCars: "Cars",
    categoryHealth: "Health",
    categoryPets: "Pets",
    categoryMusic: "Music",
    categoryOther: "Other",
    
    // Cart
    cartEmpty: "Cart is empty",
    storePrefix: "Store:",
    
    // Added features and new pages
    realEstate: "🏠 Real Estate",
    realEstateTitle: "Real Estate for Sale & Rent",
    realEstateSubtitle: "Discover the best real estate in Algeria — apartments, villas, lands and commercial properties",
    realEstateTitleHeader: "🏠 Real Estate",
    priceLabel: "Price",
    areaLabel: "Area",
    allWilayas: "All Wilayas",
    back_to_home_btn: "Back to Home",
    packages: "💎 Plans",
    viewAll: "View all ←",
    back_to_home: "Back to Home",
    back_btn_label: "Back",
    
    // Real Estate translations
    filterResults: "Filter Results",
    offerType: "Offer Type",
    propertyType: "Property Type",
    wilaya: "Wilaya",
    roomsCount: "Rooms",
    priceRange: "Price Range (DA)",
    priceMin: "Min",
    priceMax: "Max",
    area: "Area (m²)",
    areaMin: "Min",
    areaMax: "Max",
    searchBtn: "Search",
    resetBtn: "Reset",
    availableListings: "properties available",
    sortBy: "Sort by",
    sortFeatured: "Featured first",
    sortNewest: "Newest first",
    sortPriceAsc: "Price: Low to High",
    sortPriceDesc: "Price: High to Low",
    sortAreaDesc: "Area: Large first",
    contactWhatsapp: "WhatsApp",
    contactPhone: "Call",
    details: "Details",
    rooms: "rooms",
    floor: "Floor",
    bathrooms: "Bathrooms",
    parking: "Parking",
    yes: "Yes",
    no: "No",
    all: "All",
    anyCount: "Any",
    oneRoom: "1 room",
    twoRooms: "2 rooms",
    threeRooms: "3 rooms",
    fourRooms: "4 rooms",
    fiveRooms: "5+ rooms",
    
    // Expanded Cart translations
    cartTitle: "🛒 Shopping Cart",
    promoCodeLabel: "Promo Code (if any)",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    phoneLabel: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    checkoutBtn: "Complete Order via WhatsApp",
    requiredFieldsAlert: "Please enter name and phone number to complete the order.",
    multipleMerchantsAlert: "Your products are from multiple stores. Please confirm with each merchant:",
    sendToMerchant: "Send to: {name}",
    categoryRealEstate: "🏠 Real Estate",
    sale: "For Sale",
    rent: "For Rent",
    vacation: "Vacation",
    apartment: "Apartment",
    villa: "Villa",
    land: "Land",
    propCommercial: "Commercial property",
    office: "Office",
    studio: "Studio",
    featured: "⭐ Featured",
    area_unit: "m²",
    perMonth: "/month",
    priceNegotiable: "Price negotiable",
    contactViaWhatsapp: "Contact via WhatsApp"
  }
};

// ========== 2. مدير الترجمة ==========
class TranslationManager {
  constructor() {
    this.currentLang = 'ar';
    this.observers = [];
    this.init();
  }
  
  init() {
    // محاولة تحميل اللغة المحفوظة
    const savedLang = localStorage.getItem('appLanguage') || localStorage.getItem('lang') || localStorage.getItem('packageLang');
    if (savedLang && translations[savedLang]) {
      this.currentLang = savedLang;
    } else {
      // اكتشاف لغة المتصفح
      const browserLang = navigator.language.substring(0, 2);
      if (translations[browserLang]) {
        this.currentLang = browserLang;
      }
    }
    
    // مزامنة المفاتيح لحالة الاستمرارية
    localStorage.setItem('appLanguage', this.currentLang);
    localStorage.setItem('lang', this.currentLang);
    localStorage.setItem('packageLang', this.currentLang);
    
    // تحديث خاصية lang في HTML
    document.documentElement.lang = this.currentLang;
    
    console.log(`🌍 مدير الترجمة جاهز - اللغة الحالية: ${this.currentLang}`);
  }
  
  // الحصول على ترجمة
  get(key, params = {}) {
    let text = translations[this.currentLang]?.[key] || 
               translations['ar']?.[key] || 
               key;
    
    // استبدال المعلمات
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
      });
    }
    
    return text;
  }
  
  // تغيير اللغة
  setLanguage(lang) {
    if (!translations[lang]) {
      console.error(`❌ اللغة غير مدعومة: ${lang}`);
      return false;
    }
    
    this.currentLang = lang;
    localStorage.setItem('appLanguage', lang);
    localStorage.setItem('lang', lang);
    localStorage.setItem('packageLang', lang);
    document.documentElement.lang = lang;
    
    // إشعار جميع المراقبين
    this.notifyObservers();
    
    console.log(`✅ اللغة تم تغييرها إلى: ${lang}`);
    return true;
  }
  
  // الحصول على اللغة الحالية
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  // الحصول على قائمة اللغات المتاحة
  getAvailableLanguages() {
    return Object.keys(translations).map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      flag: this.getLanguageFlag(lang)
    }));
  }
  
  // الحصول على اسم اللغة
  getLanguageName(lang) {
    const names = {
      ar: 'العربية',
      fr: 'Français',
      en: 'English'
    };
    return names[lang] || lang;
  }
  
  // الحصول على علم اللغة
  getLanguageFlag(lang) {
    const flags = {
      ar: '🇩🇿',
      fr: '🇫🇷',
      en: '🇺🇸'
    };
    return flags[lang] || '🌐';
  }
  
  // إضافة مراقب
  addObserver(callback) {
    this.observers.push(callback);
  }
  
  // إزالة مراقب
  removeObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }
  
  // إشعار المراقبين
  notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.currentLang);
      } catch (error) {
        console.error('❌ خطأ في معالج اللغة:', error);
      }
    });
  }
}

// ========== 3. إنشاء نسخة عامة من المدير ==========
window.translationManager = new TranslationManager();

// ========== 4. دوال مساعدة للترجمة ==========

// دالة الترجمة المباشرة
window.t = function(key, params) {
  return window.translationManager.get(key, params);
};

// دالة تغيير اللغة
window.changeLanguage = function(lang) {
  const success = window.translationManager.setLanguage(lang);
  if (success) {
    // تحديث الواجهة
    updateUIForLanguage(lang);
    
    // إغلاق قائمة اللغات
    const langMenu = document.getElementById('languageMenu');
    if (langMenu) langMenu.classList.remove('show');
    
    // عرض رسالة نجاح
    const message = window.translationManager.get('languageChanged');
    showToast(message, 'success');
  }
  return success;
};

// ========== 5. تحديث واجهة المستخدم ==========
function updateUIForLanguage(lang) {
  console.log(`🔄 تحديث الواجهة للغة: ${lang}`);
  
  // 1. تحديث عناصر البيانات (data-key)
  document.querySelectorAll('[data-key]').forEach(element => {
    const key = element.getAttribute('data-key');
    const text = window.t(key);
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = text;
    } else {
      element.textContent = text;
    }
  });
  
  // 2. تحديث عناصر البيانات (data-translate)
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    // تحقق من وجود المفتاح قبل التطبيق
    const currentLangDict = translations[window.translationManager.getCurrentLanguage()];
    if (!currentLangDict || !currentLangDict[key]) return;
    const text = window.t(key);
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = text;
    } else if (element.hasAttribute('title')) {
      element.title = text;
    } else if (element.hasAttribute('aria-label')) {
      element.setAttribute('aria-label', text);
    } else {
      element.textContent = text;
    }
  });
  
  // 3. تحديث خاصية dir للاتجاه
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl');
    document.body.classList.remove('ltr');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.add('ltr');
    document.body.classList.remove('rtl');
  }
  
  // 4. تحديث عنوان الصفحة
  const appName = window.t('appName');
  const tagline = window.t('tagline');
  document.title = `${appName} - ${tagline}`;
  
  // 5. تحديث أزرار التحكم
  updateControlButtons();
  
  // 6. إعادة ترتيب عناصر القائمة حسب اللغة
  updateMenuItemsOrder(lang);
  
  console.log('✅ تم تحديث الواجهة');
}

// تحديث أزرار التحكم
function updateControlButtons() {
  const elements = {
    'searchBox': 'searchPlaceholder',
    'prevPage': 'previous',
    'nextPage': 'next',
    'closeModalBtn': 'close'
  };
  
  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const key = elements[id];
      const text = window.t(key);
      
      if (element.tagName === 'INPUT') {
        element.placeholder = text;
      } else {
        element.textContent = text;
      }
    }
  });
}

// تحديث ترتيب عناصر القائمة حسب اللغة
function updateMenuItemsOrder(lang) {
  const menu = document.getElementById('mainMenu');
  if (!menu) return;
  
  const menuItems = menu.querySelectorAll('.menu-item');
  const itemsArray = Array.from(menuItems);
  
  if (lang === 'ar') {
    // للعربية: الاتجاه من اليمين لليسار
    itemsArray.forEach((item, index) => {
      item.style.order = index;
      item.style.textAlign = 'right';
    });
  } else {
    // للغات الأخرى: الاتجاه من اليسار لليمين
    itemsArray.forEach((item, index) => {
      item.style.order = itemsArray.length - index - 1;
      item.style.textAlign = 'left';
    });
  }
}

// ========== 6. عرض رسائل التوست ==========
function showToast(message, type = 'info') {
  // إزالة أي رسائل قديمة
  const oldToasts = document.querySelectorAll('.toast-message');
  oldToasts.forEach(toast => toast.remove());
  
  // إنشاء عنصر الرسالة الجديدة
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">×</button>
  `;
  
  // إضافة أنماط CSS
  const style = document.createElement('style');
  style.textContent = `
    .toast-message {
      position: fixed;
      top: 100px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 300px;
      max-width: 400px;
      z-index: 10000;
      animation: toastSlideIn 0.3s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }
    
    .toast-success {
      border-left: 4px solid var(--neon-green);
    }
    
    .toast-error {
      border-left: 4px solid #ff6b6b;
    }
    
    .toast-warning {
      border-left: 4px solid #ffd166;
    }
    
    .toast-info {
      border-left: 4px solid #118ab2;
    }
    
    .toast-close {
      background: transparent;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      margin-right: 10px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .toast-close:hover {
      opacity: 1;
    }
    
    @keyframes toastSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes toastSlideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  
  if (!document.querySelector('#toast-styles')) {
    style.id = 'toast-styles';
    document.head.appendChild(style);
  }
  
  // زر الإغلاق
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.animation = 'toastSlideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  });
  
  // إضافة الرسالة إلى الصفحة
  document.body.appendChild(toast);
  
  // إزالة الرسالة تلقائياً بعد 5 ثوانٍ
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'toastSlideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ========== 7. تهيئة الترجمة عند تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('🌍 تهيئة نظام الترجمة...');
  
  // تحديث الواجهة باللغة الحالية
  updateUIForLanguage(window.translationManager.getCurrentLanguage());
  
  // إضافة مراقب لتحديث الواجهة عند تغيير اللغة
  window.translationManager.addObserver((lang) => {
    updateUIForLanguage(lang);
  });
  
  // تحديث قائمة اللغات في القائمة
  updateLanguageMenu();
  
  console.log('✅ نظام الترجمة جاهز');
});

// تحديث قائمة اللغات
function updateLanguageMenu() {
  const langMenu = document.getElementById('languageMenu');
  if (!langMenu) return;
  
  const languages = window.translationManager.getAvailableLanguages();
  const currentLang = window.translationManager.getCurrentLanguage();
  
  langMenu.innerHTML = languages.map(lang => `
    <li onclick="changeLanguage('${lang.code}')" 
        class="${lang.code === currentLang ? 'active-lang' : ''}">
      ${lang.flag} ${lang.name}
      ${lang.code === currentLang ? '✓' : ''}
    </li>
  `).join('');
  
  // إضافة أنماط CSS للغة النشطة
  const style = document.createElement('style');
  style.textContent = `
    .active-lang {
      background: rgba(0, 255, 195, 0.15) !important;
      color: var(--neon-green) !important;
      font-weight: bold;
    }
    
    .active-lang::after {
      content: ' ✓';
      color: var(--neon-green);
      font-weight: bold;
      margin-right: 5px;
    }
  `;
  
  if (!document.querySelector('#lang-menu-styles')) {
    style.id = 'lang-menu-styles';
    document.head.appendChild(style);
  }
}

// ========== 8. دوال إضافية مفيدة ==========

// ترجمة التاريخ
window.translateDate = function(dateString) {
  const date = new Date(dateString);
  const currentLang = window.translationManager.getCurrentLanguage();
  
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString(currentLang, options);
};

// ترجمة الوقت
window.translateTime = function(timeString) {
  const currentLang = window.translationManager.getCurrentLanguage();
  const date = new Date(`2000-01-01T${timeString}`);
  
  return date.toLocaleTimeString(currentLang, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ترجمة الأرقام (إضافة فواصل)
window.translateNumber = function(number) {
  const currentLang = window.translationManager.getCurrentLanguage();
  return number.toLocaleString(currentLang);
};

// ترجمة العملة
window.translateCurrency = function(amount, currency = 'DZD') {
  const currentLang = window.translationManager.getCurrentLanguage();
  
  const currencies = {
    ar: { DZD: 'د.ج', USD: '$', EUR: '€' },
    fr: { DZD: 'DA', USD: '$', EUR: '€' },
    en: { DZD: 'DZD', USD: 'USD', EUR: 'EUR' }
  };
  
  const symbol = currencies[currentLang]?.[currency] || currency;
  
  if (currentLang === 'ar') {
    return `${amount.toLocaleString('ar')} ${symbol}`;
  } else {
    return `${symbol} ${amount.toLocaleString(currentLang)}`;
  }
};

console.log('🌍 نظام الترجمة محمل وجاهز للاستخدام');