// إعداد Supabase من الملف المركزي
const supabaseClient = window.getSupabaseClient ? window.getSupabaseClient() : null;

// أسعار الباقات الأربع المحدثة
const pricing = {
  basic: { monthly: 500, yearly: 4800 },
  gold: { monthly: 3000, yearly: 28800 },
  premium: { monthly: 8500, yearly: 81600 },
  vip: { monthly: 14000, yearly: 134400 }
};

// حالة الاختيار
let selectedPlan = null;

// دوال إدارة الواجهة
function updatePricing() {
  const isYearly = document.getElementById('billingCycle').checked;
  const currentLang = localStorage.getItem("packageLang") || "ar";
  
  // تحديث كل الباقات
  for (let plan in pricing) {
    const amountElement = document.getElementById(`amount-${plan}`);
    const amount = isYearly ? pricing[plan].yearly : pricing[plan].monthly;
    
    if (amountElement) {
      amountElement.textContent = amount.toLocaleString(); // تنسيق الأرقام
    }
  }
  
  // تحديث النص حسب اللغة
  const monthlyText = document.querySelector('[data-key="monthly"]');
  const yearlyText = document.querySelector('[data-key="yearly"]');
  
  if (window.packageTranslation && monthlyText && yearlyText) {
    const dict = window.packageTranslation.getDictionary();
    monthlyText.textContent = dict.monthly;
    yearlyText.innerHTML = isYearly ? 
      `${dict.yearly} <small class="discount">(${currentLang === 'ar' ? 'خصم 20%' : '20% off'})</small>` : 
      dict.yearly;
  }
}

// دوال إدارة القوائم
function toggleLangModal() {
  const modal = document.getElementById("langModal");
  const overlay = document.getElementById("modalOverlay");
  const isShow = modal.style.display === "block";
  modal.style.display = isShow ? "none" : "block";
  overlay.style.display = isShow ? "none" : "block";
}

function closeAllModals() {
  document.getElementById("langModal").style.display = "none";
  document.getElementById("modalOverlay").style.display = "none";
}

function goBack() { 
  window.location.href = "index.html"; 
}

// إدارة اختيار الباقة
function selectPlan(planId) {
  // إزالة التحديد عن جميع الباقات
  document.querySelectorAll('.plan').forEach(plan => {
    plan.classList.remove('selected');
    plan.style.transform = '';
    plan.style.boxShadow = '';
  });
  
  const selectedElement = document.querySelector(`[data-plan="${planId}"]`);
  if (selectedElement) {
    selectedElement.classList.add('selected');
    selectedPlan = planId;
    
    // حفظ الباقة المختارة في localStorage
    const isYearly = document.getElementById('billingCycle').checked;
    localStorage.setItem("selectedPackage", planId);
    localStorage.setItem("isYearlyBilling", isYearly);
    
    const price = isYearly ? pricing[planId].yearly : pricing[planId].monthly;
    const period = isYearly ? "yearly" : "monthly";
    
    const packageData = {
      plan: planId,
      period: period,
      price: price,
      isYearly: isYearly,
      selectedAt: new Date().toISOString()
    };
    
    localStorage.setItem("selectedPackageData", JSON.stringify(packageData));
    
    console.log(`✅ تم اختيار الباقة: ${planId}`);
    
    // التمرير إلى الباقة المختارة ليراها المستخدم
    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // الانتقال بعد 800ms حتى يرى المستخدم تأثير التحديد
    setTimeout(() => {
      redirectToSignup();
    }, 800);
  }
}

// الانتقال إلى صفحة التسجيل مع بيانات الباقة
function redirectToSignup() {
  if (!selectedPlan) {
    alert("يرجى اختيار باقة أولاً");
    return;
  }
  
  const isYearly = document.getElementById('billingCycle').checked;
  const price = isYearly ? pricing[selectedPlan].yearly : pricing[selectedPlan].monthly;
  const period = isYearly ? "yearly" : "monthly";
  
  // تخزين بيانات الباقة في localStorage
  const packageData = {
    plan: selectedPlan,
    period: period,
    price: price,
    isYearly: isYearly,
    selectedAt: new Date().toISOString()
  };
  
  localStorage.setItem("selectedPackageData", JSON.stringify(packageData));
  
  // الانتقال إلى صفحة التسجيل
  window.location.href = `signup.html?plan=${selectedPlan}&period=${period}&price=${price}`;
}

// الانتقال إلى صفحة تسجيل الدخول للمشتركين القدامى
function redirectToLogin() {
  // إذا كان هناك باقة مختارة، احفظها أولاً
  if (selectedPlan) {
    const isYearly = document.getElementById('billingCycle').checked;
    const price = isYearly ? pricing[selectedPlan].yearly : pricing[selectedPlan].monthly;
    
    const packageData = {
      plan: selectedPlan,
      period: isYearly ? "yearly" : "monthly",
      price: price,
      isYearly: isYearly,
      selectedAt: new Date().toISOString()
    };
    
    localStorage.setItem("selectedPackageData", JSON.stringify(packageData));
  }
  
  // الانتقال إلى صفحة تسجيل الدخول
  window.location.href = "login.html?redirect=package";
}

// دوال مساعدة
function getPlanName(planType) {
  const names = {
    basic: "الأساسية",
    gold: "الذهبية",
    premium: "المميزة",
    vip: "VIP"
  };
  return names[planType] || planType;
}

// تهيئة الصفحة
document.addEventListener("DOMContentLoaded", async () => {
  // تطبيق الترجمات
  if (window.packageTranslation) {
    window.packageTranslation.applyTranslations();
  }
  
  // تفعيل تأثير ضوء المسرح
  const plans = document.querySelectorAll('.plan');
  plans.forEach(plan => {
    plan.addEventListener('mousemove', (e) => {
      const rect = plan.getBoundingClientRect();
      plan.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      plan.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
    
    plan.addEventListener('mouseleave', () => {
      plan.style.setProperty('--mouse-x', '50%');
      plan.style.setProperty('--mouse-y', '50%');
    });
  });
  
  // استعادة الباقة المختارة سابقاً (إذا كان المستخدم رجع للصفحة)
  try {
    const savedPackage = localStorage.getItem("selectedPackageData");
    if (savedPackage) {
      const packageData = JSON.parse(savedPackage);
      selectedPlan = packageData.plan;
      
      // تحديث مفتاح الشهري/السنوي
      if (packageData.isYearly) {
        document.getElementById('billingCycle').checked = true;
      }
      
      // إظهار الباقة المختارة
      highlightSelectedPlan(selectedPlan);
    }
  } catch (error) {
    console.log("لا توجد باقة مختارة سابقاً");
  }
  
  // تحديث الأسعار أول مرة
  updatePricing();
  
  // التحقق من حالة تسجيل الدخول
  await checkLoginStatus();
});

// التحقق من حالة تسجيل الدخول
async function checkLoginStatus() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const loginBtn = document.querySelector('.login-nav-btn');
  
  if (session && loginBtn) {
    // إذا كان المستخدم مسجلاً بالفعل، نغير نص الزر
    loginBtn.innerHTML = '👤';
    loginBtn.title = "حسابك";
    loginBtn.onclick = function() { redirectToAccount(); };
    
    // إظهار رسالة للمستخدم
    showLoggedInNotification();
  }
}

// إظهار إشعار للمستخدم المسجل
function showLoggedInNotification() {
  // يمكن إضافة إشعار لطيف
  const notification = document.createElement('div');
  notification.className = 'login-notification';
  notification.innerHTML = `
    <p>أنت مسجل الدخول بالفعل! يمكنك <a href="dashboard.html">الذهاب إلى لوحة التحكم</a></p>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: rgba(0, 255, 195, 0.1);
    border: 1px solid var(--neon-green);
    padding: 15px;
    border-radius: 10px;
    z-index: 1000;
    max-width: 300px;
    backdrop-filter: blur(10px);
  `;
  
  document.body.appendChild(notification);
  
  // إزالة الإشعار بعد 5 ثوانٍ
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// الذهاب إلى صفحة الحساب
function redirectToAccount() {
  window.location.href = "account.html";
}

// إظهار الباقة المختارة
function highlightSelectedPlan(planId) {
  document.querySelectorAll('.plan').forEach(plan => {
    plan.classList.remove('selected');
  });
  
  const selectedElement = document.querySelector(`[data-plan="${planId}"]`);
  if (selectedElement) {
    selectedElement.classList.add('selected');
  }
}

// جعل الدوال متاحة عالمياً
window.updatePricing = updatePricing;
window.toggleLangModal = toggleLangModal;
window.closeAllModals = closeAllModals;
window.goBack = goBack;
window.selectPlan = selectPlan;
window.redirectToLogin = redirectToLogin;
window.redirectToSignup = redirectToSignup;