// ===== ترجمات لوحة التحكم الكاملة =====
// dashboard-translations.js

const dashboardT = {
  ar: {
    // ===== الصفحة العامة =====
    dashboard_title: "لوحة تحكم التاجر - كلش هنا",
    syncing_data: "جاري مزامنة بيانات متجرك...",
    loading: "جاري التحميل...",

    // ===== الهيدر =====
    view_store: "المتجر",
    settings: "الإعدادات",
    logout: "خروج",

    // ===== الباقات =====
    plan_basic: "أساسي",
    plan_gold: "ذهبي",
    plan_premium: "متميز",
    plan_vip: "VIP",

    // ===== بطاقات الإحصاء =====
    sub_status: "حالة الحساب",
    total_visitors: "إجمالي الزوار",
    visitors_realtime: "تحديث مباشر",
    days_left: "ينتهي خلال: {d} يوم",
    expires_today: "ينتهي اليوم",
    expired: "منتهي",
    unlimited: "غير محدود",
    usage: "المنتجات: {c} / {l}",

    // ===== ميزات الباقة =====
    plan_features_title: "ميزات باقتك",
    features: {
      basic:   ["✔ 5 منتجات", "✔ إحصائيات عدد الزوار", "✔ دعم عبر البريد"],
      gold:    ["✔ 20 منتج", "✔ إحصائيات عدد الزوار", "✔ أولوية عند البحث", "✔ دعم عبر البريد"],
      premium: ["✔ 50 منتج", "✔ إحصائيات عدد الزوار", "✔ إحصاء المبيعات (يدوي)", "✔ ظهور في الواجهة الرئيسية", "✔ أولوية الدعم الفني"],
      vip:     ["✔ منتجات غير محدودة", "✔ إحصاء شامل للمتجر", "✔ واجهة خاصة للمتجر", "✔ إعلانات في الواجهة", "✔ أولوية الدعم الفني", "✔ إحصاء المبيعات", "✔ إعلانات ممولة في مواقع التواصل (3/شهرياً)"]
    },

    // ===== ترقية الباقة =====
    upgrade_title: "طوّر باقتك واحصل على المزيد!",
    upgrade_btn: "طوّر باقتك الآن",
    upgrade_modal_title: "🚀 طوّر باقتك",
    upgrade_modal_desc: "سيتم إرسال طلبك للإدارة وسيتواصلون معك لإتمام الدفع والتفعيل",
    upgrade_monthly: "شهري",
    upgrade_yearly: "سنوي",
    upgrade_discount: "(خصم 20%)",
    upgrade_send_btn: "إرسال طلب الترقية",
    upgrade_select: "اختيار",
    upgrade_desc: {
      basic:   "انتقل إلى الذهبية للحصول على 20 منتج وأولوية في البحث!",
      gold:    "انتقل إلى بريميوم للحصول على 50 منتج وإحصاء المبيعات!",
      premium: "انتقل إلى VIP للحصول على منتجات غير محدودة وإعلانات!"
    },
    per_month: "دج/شهر",
    already_vip_title: "أنت مشترك بالفعل في الباقة القصوى (VIP)",
    already_vip_desc: "شكرًا لثقتك بنا! متجرك يستمتع بجميع الميزات غير المحدودة.",

    // ===== رابط المتجر =====
    store_link_label: "رابط متجرك الخاص",
    copy_link: "نسخ",
    copied: "تم النسخ!",
    open_store: "فتح",

    // ===== إحصاء المبيعات =====
    manual_sales_title: "إحصاء المبيعات للزبائن",
    manual_sales_desc: "العدد الذي تدخله هنا سيظهر في سلة زبائنك لزيادة الثقة.",
    update_btn: "تحديث",

    // ===== التحليلات VIP =====
    vip_analytics_title: "التحليلات الشاملة (VIP)",
    top_regions: "أكثر المناطق:",
    peak_time: "وقت الذروة:",
    download_report: "تحميل التقرير الكامل",
    not_available: "غير متوفر",

    // ===== المنتجات =====
    my_products: "منتجاتي",
    add_product: "منتج جديد",
    no_products: "لا توجد منتجات بعد",
    add_first_product: "أضف أول منتج لك",
    product_added: "تمت إضافة المنتج بنجاح ✅",
    product_deleted: "تم حذف المنتج بنجاح",
    product_updated: "تم تحديث المنتج بنجاح",

    // ===== نافذة إضافة منتج =====
    new_product: "منتج جديد",
    p_name_label: "اسم المنتج",
    p_name_ph: "أدخل اسم المنتج",
    p_price_label: "السعر (دج)",
    p_price_ph: "أدخل السعر",
    p_image_label: "صورة المنتج",
    p_image_hint: "الصور الموصى بها: JPG, PNG, حجم أقل من 5MB",
    publish_btn: "نشر المنتج",
    publishing: "جاري النشر...",

    // ===== نافذة تعديل المنتج =====
    edit_product: "تعديل المنتج",
    edit_image_optional: "تغيير الصورة (اختياري)",
    save_edit_btn: "حفظ التغييرات",

    // ===== إعدادات المتجر =====
    settings_title: "إعدادات المتجر",
    store_logo_label: "لوغو المتجر",
    change_logo: "تغيير الصورة",
    store_name_label: "اسم المتجر",
    store_name_ph: "أدخل اسم متجرك",
    store_bio_label: "وصف المتجر",
    store_bio_ph: "أدخل وصفاً لمتجرك",
    store_phone_label: "رقم الهاتف",
    store_phone_ph: "مثال: 0555 123 456",
    store_address_label: "العنوان",
    store_address_ph: "المدينة، الحي",
    social_section: "روابط التواصل الاجتماعي (اختياري)",
    save_changes: "حفظ التعديلات",
    saving: "جاري الحفظ...",

    // ===== انتظار الموافقة =====
    pending_title: "حسابك قيد الانتظار",
    pending_desc: "لم يتم تفعيل باقتك بعد. الرجاء إرفاق وصل الدفع (CCP أو BaridiMob) ليتم مراجعته وتفعيل المتجر الخاص بك.",
    discount_banner: "عرض خاص: خصم 25% عند الدفع السنوي بالدولار (USD) أو اليورو (EUR). تواصل معنا للحصول على العرض!",
    attach_receipt: "إرفاق صورة الوصل",
    submit_receipt: "إرسال للمراجعة",
    receipt_reviewing: "جاري مراجعة الوصل...",
    contact_support: "هل تحتاج إلى مساعدة؟",
    contact_support_link: "تواصل مع الدعم الفني",
    logout_pending: "تسجيل الخروج",

    // ===== رسائل النجاح والخطأ =====
    update_success: "تم التحديث بنجاح",
    save_success: "تم حفظ التعديلات بنجاح ✅",
    save_error: "حدث خطأ أثناء الحفظ",
    sales_updated: "تم تحديث المبيعات ✅",
    profile_updated: "تم تحديث ملف المتجر ✅",
    upload_error: "فشل في رفع الصورة، يرجى المحاولة مرة أخرى",
    image_too_large: "حجم الصورة يجب أن يكون أقل من 5MB",
    invalid_image_type: "نوع الصورة غير مدعوم. يرجى استخدام JPG, PNG, أو WebP",
    limit_reached: "لقد وصلت للحد الأقصى المسموح به في باقتك",
    unauthorized: "غير مصرح به",
    invalid_phone: "رقم الهاتف غير صالح",
    name_required: "يرجى إدخال اسم المتجر",
    name_too_short: "اسم المنتج يجب أن يكون 3 أحرف على الأقل",
    invalid_price: "السعر يجب أن يكون رقم موجب",
    image_required: "يرجى اختيار صورة للمنتج",
    positive_value: "قيمة المبيعات يجب أن تكون موجبة",

    // ===== تأكيدات =====
    delete_confirm: "هل أنت متأكد من حذف هذا المنتج؟",
    logout_confirm: "هل تريد تسجيل الخروج؟",
    confirm_save: "هل تريد حفظ التغييرات؟",
    delete_account_confirm: "هل أنت متأكد من حذف الحساب؟ هذا الإجراء لا يمكن التراجع عنه.",

    // ===== Pagination =====
    previous: "السابق",
    next: "التالي",
    page: "صفحة {p}",

    // ===== الإخراج =====
    logging_out: "جاري تسجيل الخروج...",
    export_success: "تم تصدير البيانات بنجاح",
    export_data: "تصدير البيانات",
    account_setup: "تم إعداد حسابك بنجاح! ✅",
    setup_error: "فشل في إعداد الحساب. يرجى التواصل مع الدعم.",
  },

  // ================================================================
  fr: {
    dashboard_title: "Tableau de bord - Kolch Hna",
    syncing_data: "Synchronisation de votre boutique...",
    loading: "Chargement...",

    view_store: "Boutique",
    settings: "Paramètres",
    logout: "Déconnexion",

    plan_basic: "Basique",
    plan_gold: "Or",
    plan_premium: "Premium",
    plan_vip: "VIP",

    sub_status: "État du compte",
    total_visitors: "Total visiteurs",
    visitors_realtime: "Mise à jour en temps réel",
    days_left: "Expire dans: {d} jours",
    expires_today: "Expire aujourd'hui",
    expired: "Expiré",
    unlimited: "Illimité",
    usage: "Produits: {c} / {l}",

    plan_features_title: "Fonctionnalités de votre abonnement",
    features: {
      basic:   ["✔ 5 produits", "✔ Statistiques visiteurs", "✔ Support par e-mail"],
      gold:    ["✔ 20 produits", "✔ Statistiques visiteurs", "✔ Priorité dans la recherche", "✔ Support par e-mail"],
      premium: ["✔ 50 produits", "✔ Statistiques visiteurs", "✔ Comptage des ventes (manuel)", "✔ Affiché en page d'accueil", "✔ Support prioritaire"],
      vip:     ["✔ Produits illimités", "✔ Analyses complètes", "✔ Interface personnalisée", "✔ Publicités en page d'accueil", "✔ Support prioritaire", "✔ Comptage des ventes", "✔ Publicités sponsorisées sur les réseaux sociaux (3/mois)"]
    },

    upgrade_title: "Améliorez votre abonnement!",
    upgrade_btn: "Améliorer maintenant",
    upgrade_modal_title: "🚀 Améliorer l'abonnement",
    upgrade_modal_desc: "Votre demande sera envoyée à l'administration pour finaliser le paiement et l'activation.",
    upgrade_monthly: "Mensuel",
    upgrade_yearly: "Annuel",
    upgrade_discount: "(Réduction 20%)",
    upgrade_send_btn: "Envoyer la demande",
    upgrade_select: "Choisir",
    upgrade_desc: {
      basic:   "Passez à Or pour 20 produits et priorité de recherche!",
      gold:    "Passez à Premium pour 50 produits et statistiques de ventes!",
      premium: "Passez à VIP pour des produits illimités et des publicités!"
    },
    per_month: "DA/mois",
    already_vip_title: "Vous êtes déjà abonné au plan maximum (VIP)",
    already_vip_desc: "Merci pour votre confiance! Votre boutique profite de toutes les fonctionnalités illimitées.",

    store_link_label: "Lien de votre boutique",
    copy_link: "Copier",
    copied: "Copié!",
    open_store: "Ouvrir",

    manual_sales_title: "Comptage des ventes",
    manual_sales_desc: "Ce nombre apparaîtra dans le panier de vos clients pour plus de confiance.",
    update_btn: "Mettre à jour",

    vip_analytics_title: "Analyses complètes (VIP)",
    top_regions: "Meilleures régions:",
    peak_time: "Heure de pointe:",
    download_report: "Télécharger le rapport complet",
    not_available: "Non disponible",

    my_products: "Mes produits",
    add_product: "Nouveau produit",
    no_products: "Aucun produit pour l'instant",
    add_first_product: "Ajoutez votre premier produit",
    product_added: "Produit ajouté avec succès ✅",
    product_deleted: "Produit supprimé avec succès",
    product_updated: "Produit mis à jour avec succès",

    new_product: "Nouveau produit",
    p_name_label: "Nom du produit",
    p_name_ph: "Entrez le nom du produit",
    p_price_label: "Prix (DA)",
    p_price_ph: "Entrez le prix",
    p_image_label: "Image du produit",
    p_image_hint: "Formats recommandés: JPG, PNG, taille < 5MB",
    publish_btn: "Publier le produit",
    publishing: "Publication en cours...",

    edit_product: "Modifier le produit",
    edit_image_optional: "Changer l'image (optionnel)",
    save_edit_btn: "Enregistrer",

    settings_title: "Paramètres de la boutique",
    store_logo_label: "Logo de la boutique",
    change_logo: "Changer l'image",
    store_name_label: "Nom de la boutique",
    store_name_ph: "Entrez le nom de votre boutique",
    store_bio_label: "Description",
    store_bio_ph: "Entrez une description",
    store_phone_label: "Numéro de téléphone",
    store_phone_ph: "Ex: 0555 123 456",
    store_address_label: "Adresse",
    store_address_ph: "Ville, Quartier",
    social_section: "Réseaux sociaux (optionnel)",
    save_changes: "Enregistrer les modifications",
    saving: "Enregistrement...",

    pending_title: "Compte en attente",
    pending_desc: "Votre abonnement n'est pas encore activé. Veuillez joindre votre reçu de paiement pour examen.",
    discount_banner: "Offre spéciale: 25% de réduction pour paiement annuel en USD ou EUR. Contactez-nous!",
    attach_receipt: "Joindre le reçu",
    submit_receipt: "Envoyer pour examen",
    receipt_reviewing: "Reçu en cours d'examen...",
    contact_support: "Besoin d'aide?",
    contact_support_link: "Contacter le support",
    logout_pending: "Se déconnecter",

    update_success: "Mis à jour avec succès",
    save_success: "Modifications enregistrées ✅",
    save_error: "Erreur lors de l'enregistrement",
    sales_updated: "Ventes mises à jour ✅",
    profile_updated: "Profil mis à jour ✅",
    upload_error: "Échec du téléchargement, veuillez réessayer",
    image_too_large: "La taille de l'image doit être inférieure à 5MB",
    invalid_image_type: "Type d'image non supporté. Utilisez JPG, PNG ou WebP",
    limit_reached: "Vous avez atteint la limite de votre abonnement",
    unauthorized: "Non autorisé",
    invalid_phone: "Numéro de téléphone invalide",
    name_required: "Veuillez entrer le nom de la boutique",
    name_too_short: "Le nom du produit doit contenir au moins 3 caractères",
    invalid_price: "Le prix doit être un nombre positif",
    image_required: "Veuillez sélectionner une image",
    positive_value: "La valeur des ventes doit être positive",

    delete_confirm: "Êtes-vous sûr de vouloir supprimer ce produit?",
    logout_confirm: "Voulez-vous vous déconnecter?",
    confirm_save: "Voulez-vous enregistrer les modifications?",
    delete_account_confirm: "Êtes-vous sûr de vouloir supprimer ce compte? Cette action est irréversible.",

    previous: "Précédent",
    next: "Suivant",
    page: "Page {p}",

    logging_out: "Déconnexion en cours...",
    export_success: "Données exportées avec succès",
    export_data: "Exporter les données",
    account_setup: "Compte configuré avec succès! ✅",
    setup_error: "Échec de la configuration. Veuillez contacter le support.",
  },

  // ================================================================
  en: {
    dashboard_title: "Merchant Dashboard - Kolch Hna",
    syncing_data: "Syncing your store data...",
    loading: "Loading...",

    view_store: "Store",
    settings: "Settings",
    logout: "Logout",

    plan_basic: "Basic",
    plan_gold: "Gold",
    plan_premium: "Premium",
    plan_vip: "VIP",

    sub_status: "Account Status",
    total_visitors: "Total Visitors",
    visitors_realtime: "Live update",
    days_left: "Expires in: {d} days",
    expires_today: "Expires today",
    expired: "Expired",
    unlimited: "Unlimited",
    usage: "Products: {c} / {l}",

    plan_features_title: "Your Plan Features",
    features: {
      basic:   ["✔ 5 products", "✔ Visitor statistics", "✔ Email support"],
      gold:    ["✔ 20 products", "✔ Visitor statistics", "✔ Search priority", "✔ Email support"],
      premium: ["✔ 50 products", "✔ Visitor statistics", "✔ Sales tracking (manual)", "✔ Featured on homepage", "✔ Priority support"],
      vip:     ["✔ Unlimited products", "✔ Full store analytics", "✔ Custom store interface", "✔ Homepage ads", "✔ Priority support", "✔ Sales tracking", "✔ Sponsored ads on social media (3/month)"]
    },

    upgrade_title: "Upgrade your plan and get more!",
    upgrade_btn: "Upgrade Now",
    upgrade_modal_title: "🚀 Upgrade Your Plan",
    upgrade_modal_desc: "Your request will be sent to the admin who will contact you to complete payment and activation.",
    upgrade_monthly: "Monthly",
    upgrade_yearly: "Yearly",
    upgrade_discount: "(20% off)",
    upgrade_send_btn: "Send Upgrade Request",
    upgrade_select: "Select",
    upgrade_desc: {
      basic:   "Upgrade to Gold for 20 products and search priority!",
      gold:    "Upgrade to Premium for 50 products and sales tracking!",
      premium: "Upgrade to VIP for unlimited products and homepage ads!"
    },
    per_month: "DA/mo",
    already_vip_title: "You are already subscribed to the maximum plan (VIP)",
    already_vip_desc: "Thank you for your trust! Your store enjoys all the unlimited features.",

    store_link_label: "Your store link",
    copy_link: "Copy",
    copied: "Copied!",
    open_store: "Open",

    manual_sales_title: "Sales Counter",
    manual_sales_desc: "This number will appear in your customers' cart to boost trust.",
    update_btn: "Update",

    vip_analytics_title: "Full Analytics (VIP)",
    top_regions: "Top regions:",
    peak_time: "Peak time:",
    download_report: "Download full report",
    not_available: "Not available",

    my_products: "My Products",
    add_product: "New Product",
    no_products: "No products yet",
    add_first_product: "Add your first product",
    product_added: "Product added successfully ✅",
    product_deleted: "Product deleted successfully",
    product_updated: "Product updated successfully",

    new_product: "New Product",
    p_name_label: "Product name",
    p_name_ph: "Enter product name",
    p_price_label: "Price (DA)",
    p_price_ph: "Enter price",
    p_image_label: "Product image",
    p_image_hint: "Recommended: JPG, PNG, size < 5MB",
    publish_btn: "Publish Product",
    publishing: "Publishing...",

    edit_product: "Edit Product",
    edit_image_optional: "Change image (optional)",
    save_edit_btn: "Save Changes",

    settings_title: "Store Settings",
    store_logo_label: "Store Logo",
    change_logo: "Change Image",
    store_name_label: "Store Name",
    store_name_ph: "Enter your store name",
    store_bio_label: "Store Description",
    store_bio_ph: "Enter a description for your store",
    store_phone_label: "Phone Number",
    store_phone_ph: "E.g: 0555 123 456",
    store_address_label: "Address",
    store_address_ph: "City, District",
    social_section: "Social Media Links (optional)",
    save_changes: "Save Changes",
    saving: "Saving...",

    pending_title: "Account Pending",
    pending_desc: "Your plan has not been activated yet. Please attach your payment receipt (CCP or BaridiMob) for review.",
    discount_banner: "Special offer: 25% discount for annual payment in USD or EUR. Contact us to get the offer!",
    attach_receipt: "Attach Payment Receipt",
    submit_receipt: "Submit for Review",
    receipt_reviewing: "Receipt under review...",
    contact_support: "Need help?",
    contact_support_link: "Contact Support",
    logout_pending: "Logout",

    update_success: "Updated successfully",
    save_success: "Changes saved successfully ✅",
    save_error: "An error occurred while saving",
    sales_updated: "Sales updated ✅",
    profile_updated: "Store profile updated ✅",
    upload_error: "Upload failed, please try again",
    image_too_large: "Image size must be less than 5MB",
    invalid_image_type: "Unsupported image type. Please use JPG, PNG, or WebP",
    limit_reached: "You have reached the maximum allowed in your plan",
    unauthorized: "Unauthorized",
    invalid_phone: "Invalid phone number",
    name_required: "Please enter the store name",
    name_too_short: "Product name must be at least 3 characters",
    invalid_price: "Price must be a positive number",
    image_required: "Please select a product image",
    positive_value: "Sales value must be positive",

    delete_confirm: "Are you sure you want to delete this product?",
    logout_confirm: "Do you want to logout?",
    confirm_save: "Do you want to save changes?",
    delete_account_confirm: "Are you sure you want to delete this account? This action cannot be undone.",

    previous: "Previous",
    next: "Next",
    page: "Page {p}",

    logging_out: "Logging out...",
    export_success: "Data exported successfully",
    export_data: "Export data",
    account_setup: "Account set up successfully! ✅",
    setup_error: "Setup failed. Please contact support.",
  }
};

// ===== دالة المساعدة للترجمة =====
function dt(key, replacements = {}) {
  const lang = localStorage.getItem('lang') || 'ar';
  const dict = dashboardT[lang] || dashboardT['ar'];
  let text = dict[key] || dashboardT['ar'][key] || key;
  if (typeof text === 'object') return text; // للمصفوفات مثل features
  Object.entries(replacements).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

// ===== تطبيق الترجمة على عناصر data-key =====
function applyDashboardTranslations() {
  const lang = localStorage.getItem('lang') || 'ar';
  const dict = dashboardT[lang] || dashboardT['ar'];

  // تحديث اتجاه الصفحة — العربية والفرنسية RTL، الإنجليزية LTR
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';

  // تطبيق الترجمات عبر data-key
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    const val = dict[key] || dashboardT['ar'][key];
    if (!val || typeof val !== 'string') return;

    // إذا كان العنصر يحتوي على أيقونة <i>، نحافظ عليها
    const iconEl = el.querySelector('i');
    if (iconEl) {
      // ابحث عن النص الحالي (نود نصي) وعدّله فقط
      Array.from(el.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = ' ' + val;
        }
      });
      // إذا لم يكن هناك نود نصي، أضفه
      const hasText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!hasText) {
        el.appendChild(document.createTextNode(' ' + val));
      }
    } else {
      el.textContent = val;
    }
  });

  // تحديث title الصفحة
  if (dict.dashboard_title) document.title = dict.dashboard_title;
}


// ===== تبديل اللغة =====
function switchDashboardLang(lang) {
  localStorage.setItem('lang', lang);
  location.reload();
}

// تصدير عالمي
window.dashboardT = dashboardT;
window.dashboardTranslations = dashboardT;
window.dt = dt;
window.applyDashboardTranslations = applyDashboardTranslations;
window.switchDashboardLang = switchDashboardLang;
