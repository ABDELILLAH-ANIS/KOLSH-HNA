// js/translations.js
const SignupTranslations = {
    ar: {
        // العناوين
        title: "تسجيل حساب جديد - كلش هنا",
        signup_title: "تسجيل حساب جديد",
        signup_subtitle: "أنشئ متجرك الإلكتروني في دقائق",
        
        // معلومات الباقة
        plan_loading: "جارٍ تحميل الباقة المختارة...",
        plan_yearly: "باقة سنوية (خصم 20%)",
        plan_monthly: "باقة شهرية",
        plan_names: {
            basic: "الباقة الأساسية",
            gold: "الباقة الذهبية",
            premium: "الباقة المميزة",
            vip: "باقة VIP",
            new_signup: "تسجيل جديد",
            new_user: "مستخدم جديد",
        },
        
        // حقول النموذج
        full_name: "الاسم الكامل",
        full_name_placeholder: "أدخل اسمك الكامل",
        email: "البريد الإلكتروني",
        email_placeholder: "example@gmail.com",
        password: "كلمة المرور",
        password_placeholder: "أدخل كلمة مرور قوية",
        confirm_password: "تأكيد كلمة المرور",
        confirm_password_placeholder: "أعد إدخال كلمة المرور",
        phone: "رقم الهاتف",
        phone_placeholder: "555123456",
        
        // الأزرار
        create_account: "إنشاء الحساب",
        back: "الرجوع",
        login_link: "لديك حساب بالفعل؟ <a href='login.html'>سجل الدخول هنا</a>",
        
        // التسجيل الاجتماعي
        or_divider: "أو التسجيل عبر",
        google_signup: "تسجيل بحساب Google",
        email_signup: "التسجيل بالبريد الإلكتروني",
        
        // إشعارات الدفع
        payment_notice_title: "إشعار مهم",
        payment_notice_1: "بعد إنشاء الحساب، سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع وتفعيل حسابك.",
        payment_notice_2: "للدفع عبر: البنك / التحويل الإلكتروني / ويصا",
        payment_contact: "📞 للاستفسار: 0555-12-34-56",
        
        // رسائل التحقق
        required_fields: "يرجى ملء جميع الحقول المطلوبة",
        passwords_not_match: "كلمات المرور غير متطابقة",
        password_length: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        invalid_email: "البريد الإلكتروني غير صالح",
        invalid_phone: "رقم الهاتف يجب أن يكون 9 أرقام",
        no_plan_selected: "لم يتم اختيار باقة. الرجاء العودة واختيار باقة أولاً.",
        email_required: "الرجاء إدخال البريد الإلكتروني أولاً",
        
        // رسائل النجاح
        signup_success_title: "تم إنشاء حسابك بنجاح!",
        account_details: "تفاصيل حسابك:",
        name_label: "• الاسم:",
        email_label: "• البريد:",
        phone_label: "• الهاتف:",
        plan_label: "• الباقة:",
        price_label: "• السعر:",
        period_label: "• الفترة:",
        account_status: "حالة الحساب: بانتظار الموافقة",
        contact_notice: "📞 سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع وتفعيل حسابك",
        email_confirmation: "📧 تم إرسال رسالة تأكيد إلى بريدك الإلكتروني",
        can_login: "🔐 يمكنك تسجيل الدخول الآن ببياناتك",
        
        // رسائل الخطأ
        already_registered: "هذا البريد الإلكتروني مسجل بالفعل. الرجاء تسجيل الدخول.",
        signup_error: "حدث خطأ أثناء إنشاء الحساب",
        google_signup_error: "حدث خطأ أثناء التسجيل بحساب Google",
        plan_load_error: "حدث خطأ في تحميل بيانات الباقة",
        
        // حالات التحميل
        creating_account: "جارٍ إنشاء الحساب...",
        loading: "جارٍ التحميل...",
        
        // أدوات مساعدة
        password_tooltip: "كلمة المرور يجب أن تكون 6 أحرف على الأقل، وتحتوي على حروف وأرقام",
        
        // تنسيقات
        currency: "دج",
        yearly: "سنوية",
        monthly: "شهرية",
        
        // الأدوار والوسيط
        role_selector_label: "نوع الحساب",
        role_retailer_name: "تاجر تجزئة",
        role_retailer_desc: "افتح متجرك وبيع مباشرة للزبائن",
        role_wholesaler_name: "تاجر جملة",
        role_wholesaler_desc: "وزع منتجاتك على التجار",
        role_supplier_name: "مستورد / مصنع",
        role_supplier_desc: "مورد جملة للمنصة والتجار",
        role_broker_name: "مسوق",
        role_broker_desc: "روّج وابدأ تكسب بدون رأس مال",
        broker_note_text: "🎉 <strong>المسوق لا يحتاج رأس مال!</strong><br>تسجل مجاناً، تحصل على رابط خاص لكل منتج، وكل بيعة تكسب منها نقاط قابلة للسحب. الباقة الحالية تُحتسب فقط إذا أردت لوحة تحكم متقدمة.",

        // صفحة الترحيب
        welcome_title: "مرحباً بك - كلش هنا",
        welcome_header: "مرحباً بك في كلش هنا!",
        welcome_box_title: "تم إنشاء حسابك بنجاح",
        welcome_box_desc: "شكراً لك على اختيارك منصة \"كلش هنا\". نحن سعداء بانضمامك إلينا.",
        welcome_steps_title: "الخطوات التالية:",
        welcome_step_1: "1. تحقق من بريدك الإلكتروني للرسالة التفعيلية",
        welcome_step_2: "2. سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع",
        welcome_step_3: "3. بعد تأكيد الدفع، سيتم تفعيل حسابك بالكامل",
        welcome_contact_title: "للتواصل:",
        welcome_contact_email: "البريد الإلكتروني: support@kolshihena.com",
        welcome_contact_phone: "رقم الهاتف: 000000000",
        welcome_contact_hours: "ساعات العمل: 9:00 صباحاً - 5:00 مساءً",
        welcome_login_btn: "🔐 تسجيل الدخول",
        welcome_home_btn: "🏠 الصفحة الرئيسية"
    },
    
    en: {
        title: "Create New Account - Kolshi Hna",
        signup_title: "Create New Account",
        signup_subtitle: "Create your online store in minutes",
        
        plan_loading: "Loading selected plan...",
        plan_yearly: "Yearly plan (20% discount)",
        plan_monthly: "Monthly plan",
        plan_names: {
            basic: "Basic Plan",
            gold: "Gold Plan",
            premium: "Premium Plan",
            vip: "VIP Plan",
            new_signup: "New Signup",
            new_user: "New User",
        },
        
        full_name: "Full Name",
        full_name_placeholder: "Enter your full name",
        email: "Email Address",
        email_placeholder: "example@gmail.com",
        password: "Password",
        password_placeholder: "Enter a strong password",
        confirm_password: "Confirm Password",
        confirm_password_placeholder: "Re-enter your password",
        phone: "Phone Number",
        phone_placeholder: "555123456",
        
        create_account: "Create Account",
        back: "Back",
        login_link: "Already have an account? <a href='login.html'>Login here</a>",
        
        or_divider: "Or sign up with",
        google_signup: "Sign up with Google",
        email_signup: "Sign up with Email",
        
        payment_notice_title: "Important Notice",
        payment_notice_1: "After creating your account, you will be contacted within 24 hours to confirm payment and activate your account.",
        payment_notice_2: "Payment methods: Bank / E-transfer / Visa",
        payment_contact: "📞 For inquiries: 0555-12-34-56",
        
        required_fields: "Please fill in all required fields",
        passwords_not_match: "Passwords do not match",
        password_length: "Password must be at least 6 characters",
        invalid_email: "Invalid email address",
        invalid_phone: "Phone number must be 9 digits",
        no_plan_selected: "No plan selected. Please go back and select a plan first.",
        email_required: "Please enter your email first",
        
        signup_success_title: "Your account has been created successfully!",
        account_details: "Your account details:",
        name_label: "• Name:",
        email_label: "• Email:",
        phone_label: "• Phone:",
        plan_label: "• Plan:",
        price_label: "• Price:",
        period_label: "• Period:",
        account_status: "Account Status: Pending Approval",
        contact_notice: "📞 You will be contacted within 24 hours to confirm payment and activate your account",
        email_confirmation: "📧 A confirmation email has been sent to your email",
        can_login: "🔐 You can now login with your credentials",
        
        already_registered: "This email is already registered. Please login.",
        signup_error: "An error occurred while creating your account",
        google_signup_error: "An error occurred while signing up with Google",
        plan_load_error: "An error occurred while loading plan data",
        
        creating_account: "Creating account...",
        loading: "Loading...",
        
        password_tooltip: "Password must be at least 6 characters and contain letters and numbers",
        
        currency: "DZD",
        yearly: "Yearly",
        monthly: "Monthly",

        // Roles & Broker
        role_selector_label: "Account Type",
        role_retailer_name: "Retailer",
        role_retailer_desc: "Open your store and sell directly to customers",
        role_wholesaler_name: "Wholesaler",
        role_wholesaler_desc: "Distribute your products to merchants",
        role_supplier_name: "Supplier / Importer",
        role_supplier_desc: "Manufacturer or importer supplying the platform & merchants",
        role_broker_name: "Marketer",
        role_broker_desc: "Promote and start earning without capital",
        broker_note_text: "🎉 <strong>Marketer doesn't need capital!</strong><br>Register for free, get a special link for each product, and earn withdrawable points for every sale. The current plan is only required if you want an advanced dashboard.",

        // Welcome Page
        welcome_title: "Welcome - Kolch Hna",
        welcome_header: "Welcome to Kolch Hna!",
        welcome_box_title: "Account Created Successfully",
        welcome_box_desc: "Thank you for choosing \"Kolch Hna\". We are happy to have you on board.",
        welcome_steps_title: "Next Steps:",
        welcome_step_1: "1. Check your email for confirmation link",
        welcome_step_2: "2. We will contact you within 24 hours to confirm payment",
        welcome_step_3: "3. After payment confirmation, your account will be fully activated",
        welcome_contact_title: "Contact Us:",
        welcome_contact_email: "Email: support@kolshihena.com",
        welcome_contact_phone: "Phone: 000000000",
        welcome_contact_hours: "Business Hours: 9:00 AM - 5:00 PM",
        welcome_login_btn: "🔐 Login",
        welcome_home_btn: "🏠 Homepage"
    },
    
    fr: {
        title: "Créer un nouveau compte - Kolshi Hna",
        signup_title: "Créer un nouveau compte",
        signup_subtitle: "Créez votre boutique en ligne en quelques minutes",
        
        plan_loading: "Chargement du plan sélectionné...",
        plan_yearly: "Plan annuel (20% de réduction)",
        plan_monthly: "Plan mensuel",
        plan_names: {
            basic: "Plan Basique",
            gold: "Plan Gold",
            premium: "Plan Premium",
            vip: "Plan VIP",
            new_signup: "Nouvelle inscription",
            new_user: "Nouvel utilisateur",
        },
        
        full_name: "Nom complet",
        full_name_placeholder: "Entrez votre nom complet",
        email: "Adresse e-mail",
        email_placeholder: "example@gmail.com",
        password: "Mot de passe",
        password_placeholder: "Entrez un mot de passe fort",
        confirm_password: "Confirmer le mot de passe",
        confirm_password_placeholder: "Ré-entrez votre mot de passe",
        phone: "Numéro de téléphone",
        phone_placeholder: "555123456",
        
        create_account: "Créer un compte",
        back: "Retour",
        login_link: "Vous avez déjà un compte ? <a href='login.html'>Connectez-vous ici</a>",
        
        or_divider: "Ou s'inscrire avec",
        google_signup: "S'inscrire avec Google",
        email_signup: "S'inscrire avec E-mail",
        
        payment_notice_title: "Avis important",
        payment_notice_1: "Après la création de votre compte, vous serez contacté dans les 24 heures pour confirmer le paiement et activer votre compte.",
        payment_notice_2: "Méthodes de paiement : Banque / Virement électronique / Visa",
        payment_contact: "📞 Pour les questions : 0555-12-34-56",
        
        required_fields: "Veuillez remplir tous les champs obligatoires",
        passwords_not_match: "Les mots de passe ne correspondent pas",
        password_length: "Le mot de passe doit comporter au moins 6 caractères",
        invalid_email: "Adresse e-mail invalide",
        invalid_phone: "Le numéro de téléphone doit comporter 9 chiffres",
        no_plan_selected: "Aucun plan sélectionné. Veuillez revenir et sélectionner un plan d'abord.",
        email_required: "Veuillez d'abord entrer votre e-mail",
        
        signup_success_title: "Votre compte a été créé avec succès !",
        account_details: "Détails de votre compte :",
        name_label: "• Nom :",
        email_label: "• Email :",
        phone_label: "• Téléphone :",
        plan_label: "• Plan :",
        price_label: "• Prix :",
        period_label: "• Période :",
        account_status: "Statut du compte : En attente d'approbation",
        contact_notice: "📞 Vous serez contacté dans les 24 heures pour confirmer le paiement et activer votre compte",
        email_confirmation: "📧 Un e-mail de confirmation a été envoyé à votre adresse e-mail",
        can_login: "🔐 Vous pouvez maintenant vous connecter avec vos identifiants",
        
        already_registered: "Cet e-mail est déjà enregistré. Veuillez vous connecter.",
        signup_error: "Une erreur est survenue lors de la création de votre compte",
        google_signup_error: "Une erreur est survenue lors de l'inscription avec Google",
        plan_load_error: "Une erreur est survenue lors du chargement des données du plan",
        
        creating_account: "Création du compte...",
        loading: "Chargement...",
        
        password_tooltip: "Le mot de passe doit comporter au moins 6 caractères et contenir des lettres et des chiffres",
        
        currency: "DZD",
        yearly: "Annuel",
        monthly: "Mensuel",

        // Rôles & Courtier
        role_selector_label: "Type de compte",
        role_retailer_name: "Détaillant",
        role_retailer_desc: "Ouvrez votre boutique et vendez directement aux clients",
        role_wholesaler_name: "Grossiste",
        role_wholesaler_desc: "Distribuez vos produits aux marchands",
        role_supplier_name: "Fournisseur / Importateur",
        role_supplier_desc: "Fabricant ou importateur fournissant la plateforme et les marchands",
        role_broker_name: "Marketeur",
        role_broker_desc: "Promouvez et commencez à gagner sans capital",
        broker_note_text: "🎉 <strong>Le marketeur n'a pas besoin de capital !</strong><br>Inscrivez-vous gratuitement, obtenez un lien spécial pour chaque produit et gagnez des points retirables pour chaque vente. Le forfait actuel n'est requis que si vous souhaitez un tableau de bord avancé.",

        // Page d'accueil/Bienvenue
        welcome_title: "Bienvenue - Kolch Hna",
        welcome_header: "Bienvenue sur Kolch Hna !",
        welcome_box_title: "Compte créé avec succès",
        welcome_box_desc: "Merci d'avoir choisi la plateforme \"Kolch Hna\". Nous sommes heureux de vous compter parmi nous.",
        welcome_steps_title: "Prochaines étapes :",
        welcome_step_1: "1. Vérifiez votre boîte de réception pour le mail de confirmation",
        welcome_step_2: "2. Vous serez contacté dans les 24 heures pour confirmer le paiement",
        welcome_step_3: "3. Après confirmation, votre compte sera pleinement activé",
        welcome_contact_title: "Contact :",
        welcome_contact_email: "Email : support@kolshihena.com",
        welcome_contact_phone: "Téléphone : 000000000",
        welcome_contact_hours: "Heures de travail : 9:00 - 17:00",
        welcome_login_btn: "🔐 Connexion",
        welcome_home_btn: "🏠 Page d'accueil"
    }
};

// دالة للحصول على اللغة الحالية
function getCurrentLang() {
    return localStorage.getItem('appLanguage') || localStorage.getItem('lang') || localStorage.getItem('packageLang') || 'ar';
}

// دالة للحصول على نص مترجم
function translate(key, params = {}) {
    const lang = getCurrentLang();
    const keys = key.split('.');
    let value = SignupTranslations[lang];
    
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            // Fallback إلى العربية
            let fallbackValue = SignupTranslations['ar'];
            for (const k2 of keys) {
                if (fallbackValue && fallbackValue[k2] !== undefined) {
                    fallbackValue = fallbackValue[k2];
                } else {
                    return key; // إرجاع المفتاح نفسه إذا لم يتم العثور
                }
            }
            value = fallbackValue;
            break;
        }
    }
    
    // استبدال المعاملات إذا كانت النص يحتوي على {param}
    if (typeof value === 'string' && params) {
        Object.keys(params).forEach(param => {
            value = value.replace(`{${param}}`, params[param]);
        });
    }
    
    return value || key;
}

// دالة لتعيين اتجاه الصفحة بناءً على اللغة
function setPageDirection() {
    const lang = getCurrentLang();
    const html = document.documentElement;
    
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // مزامنة مفاتيح اللغات
    localStorage.setItem('appLanguage', lang);
    localStorage.setItem('lang', lang);
    localStorage.setItem('packageLang', lang);

    // إضافة صنف للغة
    html.classList.remove('lang-ar', 'lang-en', 'lang-fr');
    html.classList.add(`lang-${lang}`);
}

// جعل الدوال متاحة عالمياً
window.SignupTranslations = SignupTranslations;
window.translate = translate;
window.getCurrentLang = getCurrentLang;
window.setPageDirection = setPageDirection;