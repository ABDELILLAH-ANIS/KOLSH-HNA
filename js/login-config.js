// js/login-config.js - النسخة المصححة
// تكوين الترجمة واللغات
const translations = {
  ar: {
    login_title: "تسجيل الدخول - كلش هنا",
    login_heading: "تسجيل الدخول",
    reset_password_title: "إعادة تعيين كلمة المرور",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    login_button: "دخول",
    create_account: "إنشاء حساب جديد",
    forgot_password: "نسيت كلمة المرور؟",
    back_to_login: "رجوع لتسجيل الدخول",
    send_reset_link: "إرسال رابط التعيين",
    back: "⬅ رجوع",
    welcome: "مرحبًا بك في متجرك",
    or: "أو",
    admin_title: "دخول الإدارة - كلش هنا",
    admin_welcome: "لوحة تحكم المسؤول",
    admin_heading: "تسجيل دخول المسؤول",
    admin_login_button: "دخول المسؤول",
    back_to_home: "العودة للرئيسية",
    new_password_label: "كلمة المرور الجديدة",
    confirm_password_label: "تأكيد كلمة المرور الجديدة",
    new_password_placeholder: "أدخل كلمة المرور الجديدة",
    confirm_password_placeholder: "أعد كتابة كلمة المرور الجديدة",
    update_password_btn: "تحديث كلمة المرور",
    reset_desc: "الرجاء إدخال كلمة مرور جديدة قوية لحسابك أدناه."
  },
  fr: {
    login_title: "Connexion - Kolchi Hena",
    login_heading: "Connexion",
    reset_password_title: "Réinitialiser le mot de passe",
    email: "Email",
    password: "Mot de passe",
    login_button: "Se connecter",
    create_account: "Créer un compte",
    forgot_password: "Mot de passe oublié ?",
    back_to_login: "Retour à la connexion",
    send_reset_link: "Envoyer le lien de réinitialisation",
    back: "⬅ Retour",
    welcome: "Bienvenue dans votre boutique",
    or: "Ou",
    admin_title: "Connexion Admin - Kolchi Hena",
    admin_welcome: "Console d'administration",
    admin_heading: "Connexion Admin",
    admin_login_button: "Se connecter (Admin)",
    back_to_home: "Retour à l'accueil",
    new_password_label: "Nouveau mot de passe",
    confirm_password_label: "Confirmer le nouveau mot de passe",
    new_password_placeholder: "Entrez le nouveau mot de passe",
    confirm_password_placeholder: "Confirmez le nouveau mot de passe",
    update_password_btn: "Mettre à jour le mot de passe",
    reset_desc: "Veuillez saisir un nouveau mot de passe fort pour votre compte ci-dessous."
  },
  en: {
    login_title: "Login - Kolchi Hena",
    login_heading: "Login",
    reset_password_title: "Reset Password",
    email: "Email",
    password: "Password",
    login_button: "Login",
    create_account: "Create New Account",
    forgot_password: "Forgot Password?",
    back_to_login: "Back to Login",
    send_reset_link: "Send Reset Link",
    back: "⬅ Back",
    welcome: "Welcome to your store",
    or: "Or",
    admin_title: "Admin Login - Kolchi Hena",
    admin_welcome: "Admin Console",
    admin_heading: "Admin Login",
    admin_login_button: "Login as Admin",
    back_to_home: "Back to Home",
    new_password_label: "New Password",
    confirm_password_label: "Confirm New Password",
    new_password_placeholder: "Enter new password",
    confirm_password_placeholder: "Re-type new password",
    update_password_btn: "Update Password",
    reset_desc: "Please enter a strong new password for your account below."
  }
};

// تأكد من تحميل supabase أولاً
let supabaseClient = null;

function initSupabase() {
  try {
    supabaseClient = window.getSupabaseClient();
    if (supabaseClient) {
      console.log('✅ تم تهيئة Supabase بنجاح');
      return true;
    } else {
      console.error('❌ فشل تهيئة Supabase');
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في تهيئة Supabase:', error);
    return false;
  }
}

// وظائف الترجمة
function applyTranslations(lang) {
  const langDir = {
    'ar': { dir: 'rtl', lang: 'ar' },
    'fr': { dir: 'ltr', lang: 'fr' },
    'en': { dir: 'ltr', lang: 'en' }
  };
  
  // تحديث اتجاه الصفحة ولغتها
  const direction = langDir[lang] || langDir.ar;
  document.documentElement.dir = direction.dir;
  document.documentElement.lang = direction.lang;
  
  // تحديث النصوص
  if (translations[lang]) {
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      if (translations[lang][key]) {
        if (el.tagName === 'INPUT') {
          el.placeholder = translations[lang][key];
        } else {
          el.textContent = translations[lang][key];
        }
      }
    });
    
    // تحديث عنوان الصفحة
    document.title = translations[lang].login_title || "Login";
  }
}

function setLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem("appLanguage", lang);
    localStorage.setItem("lang", lang);
    localStorage.setItem("packageLang", lang);
    applyTranslations(lang);
    
    // إخفاء قائمة اللغة
    const langMenu = document.getElementById("languageMenu");
    if (langMenu) {
      langMenu.classList.remove("show");
    }
  }
}

function toggleLangMenu() {
  const langMenu = document.getElementById("languageMenu");
  if (langMenu) {
    langMenu.classList.toggle("show");
  }
}

// إظهار/إخفاء الرسائل
function showError(message, type = 'login') {
  const errorEl = document.getElementById(type === 'reset' ? 'resetErrorMessage' : 'errorMessage');
  const successEl = document.getElementById(type === 'reset' ? 'resetSuccessMessage' : 'successMessage');
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // إخفاء تلقائي بعد 5 ثواني
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
  
  if (successEl) {
    successEl.style.display = 'none';
  }
}

function showSuccess(message, type = 'login') {
  const errorEl = document.getElementById(type === 'reset' ? 'resetErrorMessage' : 'errorMessage');
  const successEl = document.getElementById(type === 'reset' ? 'resetSuccessMessage' : 'successMessage');
  
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // إخفاء تلقائي بعد 5 ثواني
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 5000);
  }
  
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

// إخفاء جميع الرسائل
function clearAllMessages() {
  const messages = document.querySelectorAll('.error-message, .success-message');
  messages.forEach(msg => {
    msg.style.display = 'none';
  });
}

// تحقق من حالة المصادقة
async function checkAuthStatus() {
  try {
    if (!supabaseClient) {
      const initialized = initSupabase();
      if (!initialized) return null;
    }
    
    const { data, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('❌ خطأ في التحقق من الجلسة:', error);
      return null;
    }
    
    return data.session;
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    return null;
  }
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 تحميل صفحة تسجيل الدخول...');
  
  // 1. تهيئة Supabase
  initSupabase();
  
  // 2. تطبيق اللغة
  const currentLang = localStorage.getItem("appLanguage") || localStorage.getItem("lang") || localStorage.getItem("packageLang") || "ar";
  localStorage.setItem("appLanguage", currentLang);
  localStorage.setItem("lang", currentLang);
  localStorage.setItem("packageLang", currentLang);
  applyTranslations(currentLang);
  
  // 3. التحقق مما إذا كان المستخدم مسجل الدخول بالفعل
  setTimeout(async () => {
    const session = await checkAuthStatus();
    if (session) {
      const email = session.user?.email?.toLowerCase().trim() || '';
      // ✅ الأدمن يُوجَّه مباشرة لـ admin.html بدون المرور بلوحة التاجر
      const ADMIN_EMAILS = ['bourekanis@gmail.com'];
      if (ADMIN_EMAILS.includes(email)) {
        console.log('✅ أدمن — توجيه مباشر لـ admin.html');
        window.location.href = 'admin.html';
      } else {
        console.log('👤 تاجر — توجيه لـ dashboard.html');
        window.location.href = 'dashboard.html';
      }
    }
  }, 500);

  
  // 4. إخفاء قائمة اللغة عند النقر خارجها
  document.addEventListener('click', function(event) {
    const langMenu = document.getElementById('languageMenu');
    const langButton = document.querySelector('.language button');
    
    if (langMenu && langButton) {
      if (!langButton.contains(event.target) && !langMenu.contains(event.target)) {
        langMenu.classList.remove('show');
      }
    }
  });
  
  // 5. إخفاء الرسائل عند التركيز على حقول الإدخال
  const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
  inputs.forEach(input => {
    input.addEventListener('focus', clearAllMessages);
  });
});

// جعل الدوال متاحة عالمياً
window.applyTranslations = applyTranslations;
window.setLanguage = setLanguage;
window.toggleLangMenu = toggleLangMenu;
window.showError = showError;
window.showSuccess = showSuccess;
window.clearAllMessages = clearAllMessages;
window.checkAuthStatus = checkAuthStatus;
window.initSupabase = initSupabase;

// تصدير كائن supabaseClient للاستخدام في ملفات أخرى
window.supabaseClient = supabaseClient;