// إعداد Supabase من الملف المركزي
const supabaseClient = window.getSupabaseClient();

const dashboardTranslations = window.dashboardT;
let merchantData = null;
let productLimit = 0;
let currentPage = 1;
let allProducts = [];
const productsPerPage = 12;
let searchTimeout = null;
let productFilter = 'all'; // 'all', 'retail', 'wholesale'

// دالة مساعدة: تستخدم dashboardT من ملف الترجمات
function t(key, replacements = {}) {
  if (window.dt) return window.dt(key, replacements);
  // fallback بسيط إذا لم يتحمّل الملف بعد
  const defaults = {
    days_left: "ينتهي خلال: {d} يوم",
    unlimited: "غير محدود",
    usage: "المنتجات: {c} / {l}",
    update_success: "تم التحديث بنجاح",
    delete_confirm: "هل أنت متأكد من حذف هذا المنتج؟",
    upload_error: "فشل في رفع الصورة",
    limit_reached: "وصلت للحد الأقصى في باقتك",
    save_success: "تم حفظ التعديلات بنجاح",
    save_error: "حدث خطأ أثناء الحفظ",
    no_products: "لا توجد منتجات بعد",
    add_first_product: "أضف أول منتج لك",
    product_added: "تمتت إضافة المنتج بنجاح",
    product_deleted: "تم حذف المنتج بنجاح",
    confirm_save: "هل تريد حفظ التغييرات؟",
    unauthorized: "غير مصرح به",
    image_too_large: "حجم الصورة يجب أن يكون أقل من 5MB",
    previous: "السابق",
    next: "التالي",
    page: "صفحة {p}",
    loading: "جاري التحميل...",
    profile_updated: "تم تحديث الملف الشخصي",
    sales_updated: "تم تحديث المبيعات",
    logout_confirm: "هل تريد تسجيل الخروج؟",
    delete_account_confirm: "هل أنت متأكد من حذف الحساب؟"
  };
  let text = defaults[key] || key;
  Object.entries(replacements).forEach(([k, v]) => { text = text.replace(`{${k}}`, v); });
  return text;
}

// دوال مساعدة إضافية

// نسخ رابط المتجر
window.copyStoreLink = function() {
  const linkEl = document.getElementById('storeLinkText');
  if (!linkEl) return;
  const url = window.location.origin + '/' + linkEl.textContent.trim();
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copyLinkBtn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<i class="fas fa-check"></i> ${t('copied')}`;
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    }
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
};

// بحث مع debounce
window.debounceSearch = function(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadProducts(value.trim(), 1);
  }, 400);
};

// تصفية المنتجات لتاجر الجملة
window.switchProductFilter = function(filter) {
  productFilter = filter;
  
  // تحديث الزر النشط في الواجهة
  document.querySelectorAll('.filter-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (filter === 'all') {
    document.getElementById('filterBtnAll')?.classList.add('active');
  } else if (filter === 'retail') {
    document.getElementById('filterBtnRetail')?.classList.add('active');
  } else if (filter === 'wholesale') {
    document.getElementById('filterBtnWholesale')?.classList.add('active');
  }
  
  // إعادة تحميل المنتجات
  const searchInput = document.getElementById('searchInput');
  loadProducts(searchInput ? searchInput.value.trim() : '', 1);
};

// إرسال طلب ترقية الباقة
window.submitUpgradeRequest = async function() {
  const selectedCard = document.querySelector('.up-plan-card.selected');
  if (!selectedCard) {
    showNotification('يرجى اختيار باقة أولاً', 'warning');
    return;
  }
  const plan = selectedCard.dataset.plan;
  const isYearly = document.getElementById('upgradeBillingCycle')?.checked || false;
  const price = isYearly ? selectedCard.dataset.yearly : selectedCard.dataset.monthly;

  const btn = document.getElementById('upgradeSendBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }

  try {
    const [upgradeRes, notifRes] = await Promise.all([
      supabaseClient
        .from('upgrade_requests')
        .insert({
          merchant_email: merchantData?.email,
          current_plan: merchantData?.package_type || 'basic',
          requested_plan: plan,
          status: 'pending',
          created_at: new Date().toISOString()
        }),
      supabaseClient
        .from('admin_notifications')
        .insert({
          type: 'upgrade_request',
          title: 'طلب ترقية باقة',
          message: `التاجر ${merchantData?.email} يطلب الترقية إلى باقة ${plan} - سعر: ${price} دج - ${isYearly ? 'سنوي' : 'شهري'}`,
          user_email: merchantData?.email,
          plan: plan,
          price: parseInt(price),
          is_read: false,
          created_at: new Date().toISOString()
        })
    ]);

    if (upgradeRes.error) throw upgradeRes.error;
    if (notifRes.error) throw notifRes.error;

    showNotification('تم إرسال طلب الترقية! سيتواصل معك الفريق قريباً ✅', 'success');
    document.getElementById('upgradePlanModal').style.display = 'none';
  } catch(err) {
    console.error(err);
    showNotification(t('save_error'), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('upgrade_send_btn'); }
  }
};


// الدالة الأساسية لبدء تشغيل اللوحة
async function initDashboard() {
  try {
    // التحقق من اتصال Supabase
    if (!supabaseClient) {
      throw new Error("فشل في الاتصال بقاعدة البيانات");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error("خطأ في المصادقة:", authError);
      showNotification("خطأ في المصادقة، يرجى تسجيل الدخول مرة أخرى", "error");
      setTimeout(() => window.location.href = "login.html", 2000);
      return;
    }
    
    if (!user) { 
      window.location.href = "login.html"; 
      return; 
    }

    // ✅ الأدمن: يمكنه الدخول للوحة التاجر في وضع المعاينة
    const ADMIN_EMAILS = ['bourekanis@gmail.com'];
    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase().trim());

    if (isAdmin) {
      const urlParams = new URLSearchParams(window.location.search);
      const isPreview = urlParams.get('admin_preview') === 'true';

      if (!isPreview) {
        // توجيه للإدارة افتراضياً
        console.log('✅ أدمن — توجيه للوحة الإدارة...');
        window.location.href = 'admin.html';
        return;
      }

      // وضع معاينة الأدمن: أضف شارة تنبيه، واجتر plan_override من URL
      const planOverride = urlParams.get('plan_override') || localStorage.getItem('admin_preview_plan') || 'vip';
      console.log('🔧 وضع معاينة الأدمن — لوحة التاجر مفتوحة |باقة: ' + planOverride);
      const banner = document.createElement('div');
      banner.id = 'adminPreviewBanner';
      banner.style.cssText = `
        position:fixed;top:0;left:0;right:0;z-index:99999;
        background:linear-gradient(135deg,#bd00ff,#7b00cc);
        color:#fff;text-align:center;padding:10px;font-size:14px;
        font-family:inherit;display:flex;align-items:center;justify-content:center;gap:12px;
      `;
      const planLabels = { basic: 'Basic', gold: 'Gold 🥇', premium: 'Premium 💎', vip: 'VIP 👑' };
      banner.innerHTML = `
        <span>⚡ وضع الأدمن — تجربة باقة ${planLabels[planOverride] || planOverride.toUpperCase()}</span>
        <button onclick="cyclePlanPreview()" style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 14px;
           border-radius:20px;border:1px solid rgba(255,255,255,0.4);cursor:pointer;font-family:inherit;">
          🔄 تغيير الباقة
        </button>
        <a href="admin.html" style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 14px;
           border-radius:20px;text-decoration:none;font-weight:bold;border:1px solid rgba(255,255,255,0.4);">
          ← لوحة الإدارة
        </a>
      `;
      document.body.prepend(banner);
      document.body.style.paddingTop = '44px';
      
      // حفظ planOverride لاستخدامه لاحقاً
      window._adminPlanOverride = planOverride;
    }

    // تطبيق ترجمات لوحة التحكم
  if (window.applyDashboardTranslations) applyDashboardTranslations();
  
  // تفعيل زر اللغة النشط
  const lang = localStorage.getItem('lang') || 'ar';
  const activeLangBtn = document.getElementById(`langBtn${lang.charAt(0).toUpperCase() + lang.slice(1)}`);
  if (activeLangBtn) activeLangBtn.classList.add('active');

  const { data: merchant, error: merchantError } = await supabaseClient
      .from("merchant")
      .select("*")
      .eq("email", user.email)
      .single();

    if (merchantError || !merchant) {
      console.warn("⚠️ لم يتم العثور على سجل merchant، سيتم إنشاؤه تلقائياً...");

      try {
        // إذا لم يكن هناك بريد، نستخدم الهاتف أو المعرف كبديل
        const userIdentifier = user.email || user.phone || user.id;
        const baseSlug = userIdentifier.split('@')[0].toLowerCase()
          .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const finalSlug = baseSlug.length < 3 ? 'store-' + baseSlug : baseSlug;
        const displayName = user.user_metadata?.full_name || userIdentifier.split('@')[0];

        // 1. إنشاء سجل users تلقائياً أولاً لتلبية متطلبات RLS لجدول merchant
        const { error: userCreateErr } = await supabaseClient.from('users').upsert({
          id:             user.id,
          email:          user.email || user.phone,
          full_name:      displayName,
          selected_plan:  'basic',
          plan_price:     0,
          account_status: 'active',
          is_active:      true,
          payment_status: 'paid',
          last_login:     new Date().toISOString(),
          created_at:     new Date().toISOString()
        }, { onConflict: 'id' });

        if (userCreateErr) {
          throw userCreateErr;
        }

        // 2. إنشاء سجل merchant تلقائياً ثانياً
        const adminPackage = ADMIN_EMAILS.includes(user.email?.toLowerCase()) ? 'vip' : 'basic';
        const { data: newMerchant, error: createErr } = await supabaseClient
          .from('merchant')
          .insert({
            email:          user.email || user.phone || user.id,
            name:           displayName,
            slug:           finalSlug,
            package_type:   adminPackage,
            account_status: 'active',
            visitor_count:  0,
            created_at:     new Date().toISOString(),
            updated_at:     new Date().toISOString()
          })
          .select()
          .single();

        if (createErr) {
          throw createErr;
        }

        merchantData = newMerchant;
        showNotification("✅ تم إعداد حسابك بنجاح!", "success");
      } catch (err) {
        console.error("❌ فشل إعداد الحساب أو إنشاء السجل:", err);
        // إيقاف شاشة التحميل لمنع التعليق
        document.getElementById('loading').style.display = 'none';
        showNotification("فشل في استرداد أو إعداد الحساب. يرجى التواصل مع الدعم.", "error");
        return;
      }
    } else {
      merchantData = merchant;
      // ✅ الأدمن: يحصل على الباقة المحددة بـ plan_override أو VIP افتراضياً
      if (isAdmin) {
        merchantData.package_type = window._adminPlanOverride || 'vip';
        merchantData.account_status = 'active';
      }
      
      // تأكيد وجود سجل المستخدم في جدول users لمنع مشاكل RLS
      try {
        const { data: userRecord } = await supabaseClient
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (!userRecord) {
          console.log("⚠️ سجل المستخدم مفقود في جدول users، جاري إنشاؤه...");
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'تاجر';
          await supabaseClient.from('users').upsert({
            id:             user.id,
            email:          user.email || user.phone,
            full_name:      displayName,
            selected_plan:  merchant.package_type || 'basic',
            plan_price:     0,
            account_status: merchant.account_status || 'active',
            is_active:      true,
            payment_status: 'paid',
            last_login:     new Date().toISOString(),
            created_at:     new Date().toISOString()
          }, { onConflict: 'id' });
          console.log("✅ تم إنشاء سجل المستخدم بنجاح.");
        }
      } catch (userErr) {
        console.warn("⚠️ فشل التحقق/إنشاء سجل users:", userErr.message);
      }
    }

    // التحقق من حالة الحساب للمتجر — الأدمن يتجاوز هذا التحقق دائماً
    if (merchantData.account_status !== 'active' && !isAdmin) {

      document.getElementById('loading').style.display = 'none';
      document.getElementById('pendingOverlay').style.display = 'flex';
      
      // جلب حالة الدفع وحالة الحساب العامة من جدول users
      const { data: userData } = await supabaseClient
        .from('users')
        .select('payment_status, account_status, role')
        .eq('email', user.email)
        .single();
        
      if (userData) {
        // إذا كان الدفع قيد المراجعة
        if (userData.payment_status === 'pending_review') {
          const pBtn = document.getElementById('submitReceiptBtn');
          if (pBtn) {
            pBtn.textContent = 'جاري مراجعة الوصل...';
            pBtn.disabled = true;
          }
        }
        
        // توجيه الأدمن لصفحة الإدارة حتى لو كان حسابه التجاري غير مفعل
        if (userData.account_status === 'admin' || userData.role === 'admin') {
           window.location.href = 'admin.html';
           return;
        }
      }
      return; // منع تحميل باقي اللوحة
    } else {
      // إذا كان المتجر نشطاً، نتحقق إن كان المستخدم أدمن لإضافة زر الإدارة
      const { data: userData } = await supabaseClient
        .from('users')
        .select('account_status, role')
        .eq('email', user.email)
        .single();
        
      if (userData && (userData.account_status === 'admin' || userData.role === 'admin')) {
         // إضافة زر لوحة الإدارة في القائمة الجانبية
         const sidebarActions = document.querySelector('.sidebar-actions');
         if (sidebarActions) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'pill-btn';
            adminBtn.style.background = 'linear-gradient(45deg, #ff0055, #ffaa00)';
            adminBtn.onclick = () => window.location.href = 'admin.html';
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> <span>لوحة الإدارة</span>';
            sidebarActions.insertBefore(adminBtn, sidebarActions.firstChild);
         }
      }

      // إظهار زر صفقات الموردين للتجار المسجلين (Retailer / Wholesaler / Supplier / Admin)
      if (userData && ['retailer', 'wholesaler', 'supplier', 'admin'].includes(userData.role)) {
        const btnSupplierDeals = document.getElementById('btnSupplierDeals');
        if (btnSupplierDeals) btnSupplierDeals.style.display = 'block';
      }
    }

    // تطبيق إعدادات الباقة
    applyPlanLogic(merchantData);
    
    // ✅ تطبيق feature gates بناءً على باقة التاجر
    if (window.KH_FeatureGates) {
      KH_FeatureGates.applyAllGates(merchantData.package_type || 'basic');
    }
    
    // ✅ تحميل لوغو المتجر من قاعدة البيانات
    loadStoreLogo(merchantData);
    
    // تحميل إعدادات الكوبون
    if (merchantData.coupon_code) {
      const ccInput = document.getElementById('couponCodeInput');
      const cdInput = document.getElementById('couponDiscountInput');
      if (ccInput) ccInput.value = merchantData.coupon_code;
      if (cdInput) cdInput.value = merchantData.coupon_discount || 0;
    }
    
    // تحميل الطلبات
    loadMerchantOrders(merchantData.email);
    
    // إظهار مصفيات المنتجات لتاجر الجملة
    const isWholesaler = (merchantData && merchantData.is_wholesaler === true);
    const filterEl = document.getElementById("wholesalerProductFilters");
    if (filterEl) {
      filterEl.style.display = isWholesaler ? 'flex' : 'none';
    }

    // تحميل المنتجات (مع ضمان عدم تعبئة خانة البحث بالبريد)
    const _searchEl = document.getElementById('searchInput');
    if (_searchEl) {
      // مسح فوري
      _searchEl.value = '';
      // مسح مؤجل لأن Chrome يملأ الحقل بعد تحميل الصفحة بفارق زمني
      setTimeout(() => { if (_searchEl) _searchEl.value = ''; }, 200);
      setTimeout(() => { if (_searchEl) _searchEl.value = ''; }, 600);
    }
    await loadProducts();

    
    // إضافة إحصائيات إضافية للمستخدمين VIP
    if (merchantData.package_type === 'vip') {
      setupVIPAnalytics();
    }

    // تحميل بيانات إعدادات الملف الشخصي في النموذج
    loadProfileFormData(merchantData);

    
  } catch (error) {
    console.error("خطأ في تحميل اللوحة:", error);
    showNotification("حدث خطأ في تحميل البيانات، يرجى تحديث الصفحة", "error");
  } finally {
    // إخفاء طبقة التحميل
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  }
}

// تطبيق منطق الباقات (Basic, Gold, Premium, VIP)
function applyPlanLogic(m) {
  const type = m.package_type || 'basic';
  const badge = document.getElementById("planBadge");
  const lang = localStorage.getItem("lang") || "ar";

  // قيود المنتجات الجديدة بناءً على الباقة (متوافق مع package.html)
  const limits = { 
    'basic': 5, 
    'gold': 20, 
    'premium': 50, 
    'vip': 9999 
  };
  productLimit = limits[type] || 5;

  // تحديث شارة الباقة واسم المتجر
  if (badge) {
    const planNames = {
      ar: { basic: 'أساسي', gold: 'ذهبي', premium: 'متميز', vip: 'VIP' },
      en: { basic: 'Basic', gold: 'Gold', premium: 'Premium', vip: 'VIP' },
      fr: { basic: 'Basique', gold: 'Or', premium: 'Premium', vip: 'VIP' }
    };
    badge.textContent = planNames[lang]?.[type] || type.toUpperCase();
    badge.className = `plan-badge ${type}`;
    badge.title = t('usage', { c: 0, l: productLimit });
  }

  const merchantNameElement = document.getElementById('merchantName');
  if (merchantNameElement) {
    merchantNameElement.textContent = m.name || 'متجر جديد';
    merchantNameElement.title = m.email || '';
  }

  // تحديث رابط المتجر — يعمل مع file:// و http://
  const storePageUrl = (() => {
    const base = window.location.href.replace(/\/[^/]*$/, '');
    return `${base}/store.html?slug=${m.slug}`;
  })();
  const storeLink = document.getElementById('storeLinkBtn');
  if (storeLink && m.slug) {
    storeLink.href = storePageUrl;
    storeLink.title = storePageUrl;
  }
  const storeLinkText = document.getElementById('storeLinkText');
  if (storeLinkText && m.slug) {
    storeLinkText.textContent = `store.html?slug=${m.slug}`;
  }


  // تفعيل ميزات Premium و VIP (إحصاء المبيعات اليدوي)
  const premiumBox = document.getElementById("premiumFeatureBox");
  if (premiumBox) {
    if (type === 'premium' || type === 'vip') {
      premiumBox.style.display = "flex";
      const salesInput = document.getElementById("manualSalesInput");
      if (salesInput) {
        salesInput.value = m.manual_sales_stats || 0;
      }
    } else {
      premiumBox.style.display = "none";
    }
  }

  // تفعيل ميزات VIP فقط (التحليلات الشاملة والإعلان المخصص)
  const vipBox = document.getElementById("vipAnalyticsBox");
  const customAdSection = document.getElementById("customAdSection");
  if (type === 'vip') {
    if (vipBox) {
      vipBox.style.display = "flex";
      const topRegions = document.getElementById("topRegions");
      const peakTime = document.getElementById("peakTime");
      if (topRegions) topRegions.textContent = m.top_regions || "غير متوفر";
      if (peakTime) peakTime.textContent = m.peak_time || "غير متوفر";
    }
    if (customAdSection) {
      renderVipAdSection(m);
      customAdSection.classList.remove('vip-locked');
    }
  } else {
    if (vipBox) vipBox.style.display = "none";
    if (customAdSection) {
      customAdSection.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="font-size:48px;margin-bottom:12px;opacity:0.3;">📢</div>
          <h3 style="color:#555;margin-bottom:8px;">الإعلان المخصص</h3>
          <p style="color:#444;font-size:13px;margin-bottom:16px;">هذه الميزة متاحة لأصحاب باقة VIP فقط</p>
          <button onclick="showUpgradeModal()" style="background:linear-gradient(135deg,#bd00ff,#7b00cc);color:#fff;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:14px;">🚀 ترقية للـ VIP</button>
        </div>
      `;
    }
  }

  // عرض عدد الزوار
  const visitorCount = document.getElementById("visitorCount");
  if (visitorCount) {
    visitorCount.textContent = (m.visitor_count || 0).toLocaleString();
  }

  // حساب الأيام المتبقية للاشتراك
  const subExpiry = document.getElementById('subExpiry');
  if (subExpiry) {
    if (m.subscription_end) {
      const now = new Date();
      const endDate = new Date(m.subscription_end);
      const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      let label;
      if (days > 0) {
        label = t('days_left', { d: days });
        subExpiry.style.color = days < 7 ? '#ffa500' : '#00ffc3';
      } else if (days === 0) {
        label = 'ينتهي اليوم ⚠️';
        subExpiry.style.color = '#ffa500';
      } else {
        label = 'الاشتراك منتهي ❌';
        subExpiry.style.color = '#ff4757';
      }
      subExpiry.textContent = label;
      subExpiry.title = endDate.toLocaleDateString();
    } else {
      // لا تاريخ انتهاء — باقة مجانية أو غير محدودة
      subExpiry.textContent = 'نشط ✅';
      subExpiry.style.color = '#00ffc3';
    }
  }

  // ========== عرض ميزات الباقة الحالية ==========
  const planFeaturesBox = document.getElementById('planFeaturesBox');
  const planFeaturesList = document.getElementById('planFeaturesList');
  if (planFeaturesBox && planFeaturesList) {
    // محاولة جلب من ملف الترجمات أولاً، ثم الـ fallback الثابت
    const featuresFallback = {
      basic:   ['✔ 5 منتجات', '✔ إحصائيات عدد الزوار', '✔ دعم عبر البريد'],
      gold:    ['✔ 20 منتج', '✔ إحصائيات عدد الزوار', '✔ أولوية عند البحث', '✔ دعم عبر البريد'],
      premium: ['✔ 50 منتج', '✔ إحصائيات الزوار', '✔ إحصاء المبيعات (يدوي)', '✔ ظهور في الواجهة الرئيسية', '✔ أولوية الدعم الفني'],
      vip:     ['✔ منتجات غير محدودة', '✔ إحصاء شامل', '✔ واجهة خاصة', '✔ إعلانات في الواجهة', '✔ أولوية الدعم الفني', '✔ إحصاء المبيعات']
    };
    const features = window.dashboardT?.[lang]?.features?.[type]
                  || window.dashboardT?.ar?.features?.[type]
                  || featuresFallback[type]
                  || featuresFallback.basic;
    planFeaturesList.innerHTML = features.map(f => `<li>${f}</li>`).join('');
    planFeaturesBox.style.display = 'block';
  }

  // ========== زر ترقية الباقة ==========
  const upgradeBox = document.getElementById('upgradePlanBox');
  if (upgradeBox) {
    if (type === 'vip') {
      upgradeBox.style.display = 'none';
    } else {
      upgradeBox.style.display = 'block';
      // إخفاء الباقة الحالية من نافذة الترقية
      document.querySelectorAll('.up-plan-card').forEach(card => {
        card.classList.remove('hidden');
        if (card.dataset.plan === type) card.classList.add('hidden');
      });
      const upgradeDesc = document.getElementById('upgradeDescription');
      const upgradeDescs = window.dashboardT?.[lang]?.upgrade_desc || {};
      const upgradeDescFallback = {
        basic:   'انتقل إلى الذهبية للحصول على 20 منتج وأولوية في البحث!',
        gold:    'انتقل إلى بريميوم للحصول على 50 منتج وإحصاء المبيعات!',
        premium: 'انتقل إلى VIP للحصول على منتجات غير محدودة وإعلانات!'
      };
      if (upgradeDesc) upgradeDesc.textContent = upgradeDescs[type] || upgradeDescFallback[type] || '';
    }
  }
}

// جلب المنتجات وتحديث عداد الاستخدام
async function loadProducts(searchTerm = '', page = 1) {
  try {
    // منع ملء البريد الإلكتروني تلقائياً من قبل المتصفح في حقل البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput && merchantData && searchInput.value.trim() === merchantData.email) {
      searchInput.value = '';
      searchTerm = '';
    }

    const lang = localStorage.getItem("lang") || "ar";
    currentPage = page;
    
    // إظهار حالة التحميل
    const grid = document.getElementById("productsGrid");
    if (grid) {
    grid.innerHTML = `<div class="loading-products"><div class="spinner small"></div><p>${t('loading')}</p></div>`;
    }

    let query = supabaseClient
      .from("products")
      .select("*", { count: 'exact' })
      .eq("owner", merchantData.email);

    // تطبيق البحث إذا كان موجوداً
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // تطبيق تصفية الجملة والتجزئة لتاجر الجملة
    const isWholesaler = (merchantData && merchantData.is_wholesaler === true);
    if (isWholesaler && typeof productFilter !== 'undefined') {
      if (productFilter === 'retail') {
        query = query.eq('show_in_b2b', false);
      } else if (productFilter === 'wholesale') {
        query = query.eq('show_in_b2b', true);
      }
    }

    // حساب الصفحات
    const from = (page - 1) * productsPerPage;
    const to = from + productsPerPage - 1;

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    allProducts = products || [];
    const totalCount = count || 0;

    // تحديث شريط الاستخدام بصرياً
    updateUsageBar(totalCount, lang);

    // تعطيل زر الإضافة إذا تم تجاوز الحد
    toggleAddButton(totalCount >= productLimit, lang);

    // عرض المنتجات مع Pagination
    renderGrid(allProducts);
    renderPagination(totalCount, searchTerm);
    
  } catch (error) {
    console.error("خطأ في تحميل المنتجات:", error);
    const lang = localStorage.getItem("lang") || "ar";
    renderGrid([]);
    showNotification("حدث خطأ في تحميل المنتجات", "error");
  }
}

// تحديث شريط الاستخدام
function updateUsageBar(count, lang) {
  const usageBar = document.getElementById('usageBar');
  const usageText = document.getElementById('usageText');
  
  // تحديث العداد والحد في القائمة الجانبية
  const usageCountEl = document.getElementById('productUsageCount');
  const limitDisplayEl = document.getElementById('productLimitDisplay');
  if (usageCountEl) usageCountEl.textContent = count;
  if (limitDisplayEl) limitDisplayEl.textContent = productLimit > 5000 ? t('unlimited') : productLimit;

  if (usageBar && usageText) {
    const percent = productLimit > 0 ? Math.min((count / productLimit) * 100, 100) : 100;
    usageBar.style.width = `${percent}%`;
    if (percent > 90) {
      usageBar.style.background = '#ff4757';
      usageBar.style.boxShadow = '0 0 10px rgba(255,71,87,0.5)';
    } else if (percent > 70) {
      usageBar.style.background = '#ffa500';
      usageBar.style.boxShadow = '0 0 10px rgba(255,165,0,0.5)';
    } else {
      usageBar.style.background = '#00ffc3';
      usageBar.style.boxShadow = '0 0 10px rgba(0,255,195,0.5)';
    }
    usageBar.style.transition = 'width 0.5s ease, background 0.3s ease';
    const displayLimit = productLimit > 5000 ? t('unlimited') : productLimit;
    usageText.textContent = t('usage', { c: count, l: displayLimit });
  }
}

// تعطيل/تفعيل زر الإضافة
function toggleAddButton(isDisabled, lang) {
  const mainAddBtn = document.getElementById("mainAddBtn");
  if (mainAddBtn) {
    mainAddBtn.disabled = isDisabled;
    if (isDisabled) {
    mainAddBtn.title = t('limit_reached');
      mainAddBtn.style.opacity = "0.5";
      mainAddBtn.style.cursor = "not-allowed";
      mainAddBtn.style.background = "#666";
    } else {
      mainAddBtn.title = "";
      mainAddBtn.style.opacity = "1";
      mainAddBtn.style.cursor = "pointer";
      mainAddBtn.style.background = "#00ffc3";
    }
  }
}

// رسم شبكة المنتجات
function renderGrid(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  const lang = localStorage.getItem("lang") || "ar";
  
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-products">
        <div style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">
          <div style="font-size:64px;margin-bottom:20px;opacity:0.3;">📦</div>
          <h3 style="color:#aaa;margin-bottom:10px;">${t('no_products')}</h3>
          <p style="color:#666;margin-bottom:30px;">${t('add_first_product')}</p>
          <button onclick="showAddProductForm()" class="add-btn-main">
            ➕ ${t('add_first_product')}
          </button>
        </div>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = "";
  
  products.forEach(p => {
    const productCard = document.createElement("div");
    productCard.className = "product-card";
    
    const isWholesaler = (merchantData && merchantData.is_wholesaler === true);
    
    productCard.innerHTML = `
      <div class="product-image-container" style="position: relative;">
        <span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.75); color: ${p.is_published ? '#00ffc3' : '#aaa'}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid ${p.is_published ? '#00ffc3' : '#666'}; z-index: 2;">
          ${p.is_published ? (lang === 'ar' ? '🟢 منشور' : lang === 'fr' ? '🟢 Publié' : '🟢 Published') : (lang === 'ar' ? '⚪ مسودة' : lang === 'fr' ? '⚪ Brouillon' : '⚪ Draft')}
        </span>
        <img src="${p.image}" alt="${p.name}" 
             class="product-image"
             loading="lazy"
             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200/2a2a2a/00ffc3?text=No+Image'">
        ${p.created_at ? `
          <div class="product-date">
            ${new Date(p.created_at).toLocaleDateString()}
          </div>
        ` : ''}
      </div>
      <div class="product-info">
        <h4 class="product-name" title="${p.name}">${p.name}</h4>
        ${p.description ? `<p class="product-desc">${p.description.substring(0, 60)}${p.description.length > 60 ? '...' : ''}</p>` : ''}
        
        <p class="product-price" style="font-weight: bold; color: #00ffc3; margin-bottom: 2px;">
          ${parseFloat(p.price).toLocaleString()} دج
        </p>
        
        ${(isWholesaler && p.wholesale_price) ? `
          <p style="font-size: 12px; color: #aaa; margin: 2px 0 0 0;">
            🏢 ${lang === 'ar' ? 'جملة' : 'Wholesale'}: ${parseFloat(p.wholesale_price).toLocaleString()} دج
          </p>
        ` : ''}
        ${(isWholesaler && p.min_retail_price) ? `
          <p style="font-size: 11px; color: #888; margin: 1px 0 5px 0;">
            🏷️ ${lang === 'ar' ? 'أدنى تجزئة' : 'Min Retail'}: ${parseFloat(p.min_retail_price).toLocaleString()} دج
          </p>
        ` : ''}

        <div class="product-actions" style="margin-top: 10px;">
          <button onclick="editProduct(${p.id})" class="edit-btn" title="تعديل">
            ✏️
          </button>
          <button onclick="viewProduct(${p.id})" class="view-btn" title="عرض">
            👁️
          </button>
          <button onclick="deleteProduct(${p.id})" class="delete-btn" title="حذف">
            🗑️
          </button>
        </div>

        ${isWholesaler ? `
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;" title="تحكم في ظهور المنتج في صفحة B2B للجملة">
            <div class="b2b-toggle-wrap" onclick="toggleB2BVisibility(${p.id}, this)" data-state="${p.show_in_b2b ? 'on' : 'off'}">
              <div class="b2b-toggle-track ${p.show_in_b2b ? 'active' : ''}">
                <div class="b2b-toggle-thumb"></div>
              </div>
            </div>
            <span style="color:${p.show_in_b2b ? '#00c896' : '#888'}; font-weight:700;" class="b2b-label">
              ${p.show_in_b2b ? '🏢 ظاهر في B2B' : '⬜ مخفي من B2B'}
            </span>
          </label>
        </div>` : ''}
      </div>
    `;
    grid.appendChild(productCard);
  });
}

// عرض Pagination
function renderPagination(totalCount, searchTerm = '') {
  const lang = localStorage.getItem("lang") || "ar";
  const totalPages = Math.ceil(totalCount / productsPerPage);
  
  if (totalPages <= 1) return;
  
  const paginationContainer = document.getElementById("paginationContainer");
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  // زر السابق
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.disabled = currentPage === 1;
  prevBtn.innerHTML = `← ${t('previous')}`;
  prevBtn.onclick = () => loadProducts(searchTerm, currentPage - 1);
  
  // عرض رقم الصفحة
  const pageInfo = document.createElement("span");
  pageInfo.className = "page-info";
  pageInfo.textContent = t('page', {p: `${currentPage} / ${totalPages}`});
  
  // زر التالي
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.innerHTML = `${t('next')} →`;
  nextBtn.onclick = () => loadProducts(searchTerm, currentPage + 1);
  
  // أزرار الصفحات المباشرة
  const pageButtons = document.createElement("div");
  pageButtons.className = "page-buttons";
  
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => loadProducts(searchTerm, i);
    pageButtons.appendChild(pageBtn);
  }
  
  paginationContainer.appendChild(prevBtn);
  paginationContainer.appendChild(pageInfo);
  paginationContainer.appendChild(pageButtons);
  paginationContainer.appendChild(nextBtn);
}

// حفظ إعدادات الملف الشخصي
window.saveProfile = async function() {
  const lang = localStorage.getItem("lang") || "ar";
  
  // تعطيل زر الحفظ لمنع النقر المتكرر
  const saveBtn = document.querySelector('#profileModal .save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  }
  
  const nameInput = document.getElementById("merchantNameInput");
  const bioInput = document.getElementById("merchantBioInput");
  const phoneInput = document.getElementById("merchantPhoneInput");
  const addressInput = document.getElementById("merchantAddressInput");
  const logoInput = document.getElementById("storeLogoInput");
  
  // حقول التواصل الاجتماعي
  const igInput = document.getElementById("merchantInstagram");
  const fbInput = document.getElementById("merchantFacebook");
  const tkInput = document.getElementById("merchantTiktok");
  const waInput = document.getElementById("merchantWhatsapp");
  const webInput = document.getElementById("merchantWebsite");
  
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  const bio = bioInput?.value.trim() || '';
  const phone = phoneInput?.value.trim() || '';
  const address = addressInput?.value.trim() || '';
  
  const instagram = igInput?.value.trim() || null;
  const facebook = fbInput?.value.trim() || null;
  const tiktok = tkInput?.value.trim() || null;
  const whatsapp = waInput?.value.trim() || null;
  const website = webInput?.value.trim() || null;

  const yalidineId = document.getElementById("merchantYalidineId")?.value.trim() || null;
  const yalidineToken = document.getElementById("merchantYalidineToken")?.value.trim() || null;
  const zexpressToken = document.getElementById("merchantZExpressToken")?.value.trim() || null;
  const vipAdTitle = document.getElementById("vipAdTitleInput")?.value.trim() || null;
  const vipAdImageInput = document.getElementById("vipAdImageInput");
  const classificationInput = document.getElementById("merchantClassificationInput");
  const isWholesaler = classificationInput ? (classificationInput.value === "wholesale") : false;

  if (!name) {
    showNotification("يرجى إدخال اسم المتجر", "warning");
    return;
  }

  // التحقق من صحة رقم الهاتف
  if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone)) {
    showNotification("رقم الهاتف غير صالح", "warning");
    return;
  }

  try {
    let storeImageUrl = merchantData.store_image || null;

    // رفع اللوغو إذا تم اختيار صورة جديدة
    if (logoInput && logoInput.files && logoInput.files[0]) {
      const file = logoInput.files[0];
      
      // التحقق من الحجم (أقل من 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification("حجم الصورة يجب أن يكون أقل من 5MB", "warning");
        return;
      }

      const timestamp = Date.now();
      const fileName = `store_logo_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(fileName);

      storeImageUrl = publicUrl;
      console.log('✅ تم رفع لوغو المتجر:', publicUrl);
    }

    let vipAdImageUrl = merchantData.ad_image || null;
    if (vipAdImageInput && vipAdImageInput.files && vipAdImageInput.files[0]) {
      const file = vipAdImageInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification("حجم صورة الإعلان يجب أن يكون أقل من 5MB", "warning");
        return;
      }
      const timestamp = Date.now();
      const fileName = `vip_ad_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabaseClient.storage.from("product-images").getPublicUrl(fileName);
      vipAdImageUrl = publicUrl;
    }

    const [merchantUpdate, userUpdate] = await Promise.all([
      supabaseClient
        .from("merchant")
        .update({ 
          name: name,
          bio: bio || null,
          phone: phone || null,
          address: address || null,
          instagram: instagram,
          facebook: facebook,
          tiktok: tiktok,
          whatsapp: whatsapp,
          website: website,
          store_image: storeImageUrl,
          ad_title: vipAdTitle,
          ad_image: vipAdImageUrl,
          is_wholesaler: isWholesaler,
          updated_at: new Date().toISOString()
        })
        .eq("email", merchantData.email),
      supabaseClient
        .from("users")
        .update({
          full_name: name,
          phone: phone || null,
          role: isWholesaler ? 'wholesaler' : 'retailer'
        })
        .eq("email", merchantData.email)
    ]);

    if (merchantUpdate.error) throw merchantUpdate.error;
    if (userUpdate.error) {
      console.warn("⚠️ فشل تحديث جدول users:", userUpdate.error.message);
    }

    // حفظ مفاتيح API الخاصة بالتاجر (جدول منفصل)
    if (yalidineId !== null || yalidineToken !== null || zexpressToken !== null) {
      const { error: apiKeyError } = await supabaseClient
        .from('merchant_api_keys')
        .upsert({
          merchant_email: merchantData.email,
          yalidine_api_id: yalidineId,
          yalidine_api_token: yalidineToken,
          zexpress_api_token: zexpressToken,
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_email' });
      if (apiKeyError) console.warn('⚠️ خطأ حفظ مفاتيح API:', apiKeyError.message);
    }

    // تحديث البيانات المحلية
    merchantData.name = name;
    merchantData.bio = bio;
    merchantData.phone = phone;
    merchantData.address = address;
    merchantData.instagram = instagram;
    merchantData.facebook = facebook;
    merchantData.tiktok = tiktok;
    merchantData.whatsapp = whatsapp;
    merchantData.website = website;
    merchantData.store_image = storeImageUrl;
    merchantData.ad_title = vipAdTitle;
    merchantData.ad_image = vipAdImageUrl;
    merchantData.yalidine_api_id = yalidineId;
    merchantData.yalidine_api_token = yalidineToken;
    merchantData.zexpress_api_token = zexpressToken;
    merchantData.is_wholesaler = isWholesaler;
    
    // تحديث العرض
    const merchantNameElement = document.getElementById("merchantName");
    if (merchantNameElement) {
      merchantNameElement.textContent = name;
    }
    
    // تحديث لوغو المتجر في الـ Sidebar فوراً
    if (storeImageUrl) {
      const sidebarLogo = document.getElementById('sidebarLogoImg');
      if (sidebarLogo) sidebarLogo.src = storeImageUrl;
    }
    
    // إغلاق النافذة المنبثقة
    toggleProfile();
    
    // إظهار رسالة النجاح
    showNotification(t('profile_updated'), "success");

    // إعادة تحميل الصفحة لتحديث التصنيف
    setTimeout(() => {
      location.reload();
    }, 1000);
    
  } catch (error) {
    console.error("خطأ في حفظ الملف الشخصي:", error);
    console.error('تفاصيل الخطأ:', JSON.stringify(error));
    showNotification(t('save_error') + ' (' + (error.message || error.code || 'RLS Error') + ')', "error");
  } finally {
    // إعادة تفعيل زر الحفظ
    const saveBtnFinal = document.querySelector('#profileModal .save-btn');
    if (saveBtnFinal) {
      saveBtnFinal.disabled = false;
      saveBtnFinal.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
    }
  }
};

// معاينة لوغو المتجر قبل الرفع
window.previewStoreLogo = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('storeLogoPreview');
      if (preview) preview.src = e.target.result;
      // تحديث الـ sidebar مباشرةً
      const sidebarLogo = document.getElementById('sidebarLogoImg');
      if (sidebarLogo) sidebarLogo.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// ✅ تحميل بيانات الملف الشخصي في النموذج
function loadProfileFormData(m) {
  const fields = {
    merchantNameInput: m.name || '',
    merchantBioInput: m.bio || '',
    merchantPhoneInput: m.phone || '',
    merchantAddressInput: m.address || '',
    merchantInstagram: m.instagram || '',
    merchantFacebook: m.facebook || '',
    merchantTiktok: m.tiktok || '',
    merchantWhatsapp: m.whatsapp || '',
    merchantWebsite: m.website || ''
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  const classificationEl = document.getElementById("merchantClassificationInput");
  if (classificationEl) {
    classificationEl.value = m.is_wholesaler ? "wholesale" : "retail";
  }
}

// ✅ تحميل ولوغو المتجر من DB وعرضه في الـ sidebar والنموذج
function loadStoreLogo(m) {
  const logoUrl = m.store_image || m.logo_url || null;
  const sidebarLogo = document.getElementById('sidebarLogoImg');
  const profilePreview = document.getElementById('storeLogoPreview');
  if (logoUrl) {
    if (sidebarLogo) {
      sidebarLogo.src = logoUrl;
      sidebarLogo.onerror = () => { sidebarLogo.src = 'images/placeholder.png'; };
    }
    if (profilePreview) {
      profilePreview.src = logoUrl;
      profilePreview.onerror = () => { profilePreview.src = 'images/placeholder.png'; };
    }
  }
}

// ✅ عرض قسم الإعلان VIP بالكامل مع كل الأزرار
function renderVipAdSection(m) {
  const sec = document.getElementById('customAdSection');
  if (!sec) return;

  const hasAd = !!(m.ad_image || m.ad_title);
  const adStatus = m.ad_status || null; // 'pending_design', 'design_ready'

  sec.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <h3 style="color:#bd00ff;display:flex;align-items:center;gap:8px;margin:0;">
        <span>🎯</span> الإعلان المخصص
        <span style="font-size:11px;background:rgba(189,0,255,0.15);color:#bd00ff;padding:3px 10px;border-radius:20px;border:1px solid rgba(189,0,255,0.3);">VIP حصرياً</span>
      </h3>
      ${hasAd ? `<button onclick="deleteAdImage()" style="background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.3);color:#ff4757;padding:7px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;display:flex;align-items:center;gap:5px;"><i class="fas fa-trash"></i> حذف الإعلان</button>` : ''}
    </div>

    ${hasAd ? `
      <div style="position:relative;margin-bottom:16px;border-radius:12px;overflow:hidden;border:1px solid rgba(189,0,255,0.2);">
        ${m.ad_image ? `<img src="${m.ad_image}" style="width:100%;max-height:180px;object-fit:cover;display:block;"
          onerror="this.style.display='none'">` : ''}
        <div style="padding:12px;background:rgba(0,0,0,0.4);">
          <p style="color:#fff;font-weight:bold;margin:0;">${m.ad_title || 'إعلاني'}</p>
          ${m.ad_link ? `<a href="${m.ad_link}" target="_blank" style="color:#bd00ff;font-size:12px;">🔗 ${m.ad_link}</a>` : ''}
        </div>
      </div>
    ` : `<p style="color:#666;font-size:13px;margin-bottom:14px;">لم تقم برفع إعلان بعد. ارفع صورة إعلانية لتظهر لزوار المنصة!</p>`}

    <div style="display:grid;gap:10px;margin-bottom:14px;">
      <input type="text" id="adTitleInput" placeholder="عنوان الإعلان (مثال: تشكيلة صيف 2025)"
        value="${m.ad_title || ''}"
        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(189,0,255,0.3);background:rgba(0,0,0,0.3);color:#fff;box-sizing:border-box;font-family:inherit;">
      <input type="url" id="adLinkInput" placeholder="رابط الإعلان (اختياري)"
        value="${m.ad_link || ''}"
        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(189,0,255,0.3);background:rgba(0,0,0,0.3);color:#fff;box-sizing:border-box;font-family:inherit;">
    </div>

    <label style="display:block;margin-bottom:10px;cursor:pointer;">
      <input type="file" id="adImageInput" accept="image/*" style="display:none;" onchange="previewAdImage(this)">
      <div style="background:rgba(189,0,255,0.1);border:2px dashed rgba(189,0,255,0.4);border-radius:10px;padding:20px;text-align:center;transition:all 0.2s;"
        onmouseover="this.style.background='rgba(189,0,255,0.15)'" onmouseout="this.style.background='rgba(189,0,255,0.1)'">
        <div style="font-size:28px;margin-bottom:6px;">📁</div>
        <p style="color:#bd00ff;margin:0;font-size:13px;">اختر صورة الإعلان (JPG, PNG) - الحجم الموصى: 1200×600</p>
      </div>
    </label>
    <img id="adPreview" style="display:none;width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;border:1px solid rgba(189,0,255,0.3);">

    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button onclick="uploadAdImage()" style="flex:1;background:linear-gradient(135deg,#bd00ff,#7b00cc);color:#fff;border:none;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:bold;min-width:150px;">
        🚀 نشر الإعلان
      </button>
      ${adStatus === 'design_ready' ? `
        <button style="flex:1;background:rgba(0,255,195,0.15);border:1px solid rgba(0,255,195,0.4);color:#00ffc3;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;min-width:150px;" onclick="downloadAdDesign()">
          📥 تحميل التصميم الجاهز
        </button>
      ` : `
        <button onclick="requestAdDesign()" style="flex:1;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);color:#ffd700;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;min-width:150px;">
          ✨ طلب تصميم من الإدارة
          ${adStatus === 'pending_design' ? '<span style="font-size:11px;opacity:0.7;"> (قيد المراجعة)</span>' : ''}
        </button>
      `}
    </div>
    <p id="adUploadMsg" style="font-size:12px;margin-top:8px;text-align:center;color:#aaa;"></p>

    <!-- قسم ترويج مواقع التواصل الاجتماعي - حصري VIP -->
    <div style="margin-top:20px;border-top:1px solid rgba(189,0,255,0.2);padding-top:18px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <h4 style="color:#ffd700;margin:0;display:flex;align-items:center;gap:6px;font-size:14px;">
          <span>📱</span> ترويج مواقع التواصل الاجتماعي
          <span style="font-size:10px;background:rgba(255,215,0,0.15);color:#ffd700;padding:2px 8px;border-radius:12px;border:1px solid rgba(255,215,0,0.3);">VIP حصراً</span>
        </h4>
        <span style="font-size:12px;color:${(m.social_ads_remaining ?? 3) > 0 ? '#00ffc3' : '#ff4757'};background:rgba(0,0,0,0.3);padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);">
          ${m.social_ads_remaining ?? 3} / 3 متبقية هذا الشهر
        </span>
      </div>
      <p style="color:#888;font-size:12px;margin:0 0 10px;">
        سيتم نشر إعلانك على حسابات المنصة الرسمية (Instagram، Facebook، TikTok).
      </p>
      <button onclick="requestSocialAd()" 
        ${(m.social_ads_remaining ?? 3) <= 0 ? 'disabled' : ''}
        style="width:100%;background:${(m.social_ads_remaining ?? 3) > 0 ? 'linear-gradient(135deg,#ffd700,#ff9500)' : 'rgba(255,255,255,0.05)'};color:${(m.social_ads_remaining ?? 3) > 0 ? '#000' : '#666'};border:none;padding:12px;border-radius:10px;cursor:${(m.social_ads_remaining ?? 3) > 0 ? 'pointer' : 'not-allowed'};font-family:inherit;font-size:13px;font-weight:bold;">
        ${(m.social_ads_remaining ?? 3) > 0 ? '📣 طلب ترويج على مواقع التواصل' : '⏳ استنفدت الحصة الشهرية - تجدد الشهر القادم'}
      </button>
    </div>
  `;
}


// ✅ طلب ترويج على مواقع التواصل الاجتماعي (VIP - 3 مرات/شهر)
window.requestSocialAd = async function() {
  const remaining = merchantData.social_ads_remaining ?? 3;
  if (remaining <= 0) {
    showNotification('لقد استنفدت حصتك الشهرية من طلبات الترويج. تتجدد الحصة في بداية الشهر القادم.', 'warning');
    return;
  }
  if (!confirm(`طلب ترويج إعلاني على مواقع التواصل الاجتماعي؟ سيتم خصم 1 من رصيدك (${remaining}/3 متبقية).`)) return;

  try {
    // 1. إرسال إشعار للإدارة
    const { error: notifErr } = await supabaseClient.from('admin_notifications').insert({
      type: 'social_ad_request',
      title: 'طلب ترويج على مواقع التواصل - VIP',
      message: `التاجر ${merchantData.name} (${merchantData.email}) يطلب ترويج إعلانه على مواقع التواصل الاجتماعي. الرصيد المتبقي: ${remaining - 1}/3`,
      user_email: merchantData.email,
      plan: 'vip',
      is_read: false,
      created_at: new Date().toISOString()
    });
    if (notifErr) throw notifErr;

    // 2. خصم 1 من رصيد الطلبات
    const newRemaining = remaining - 1;
    const { error: updateErr } = await supabaseClient.from('merchant')
      .update({ social_ads_remaining: newRemaining })
      .eq('email', merchantData.email);
    if (updateErr) throw updateErr;

    merchantData.social_ads_remaining = newRemaining;
    renderVipAdSection(merchantData);
    showNotification(`✅ تم إرسال طلب الترويج! رصيدك المتبقي: ${newRemaining}/3. ستتلقى ردًا خلال 48 ساعة.`, 'success');
  } catch (e) {
    showNotification('خطأ في إرسال طلب الترويج: ' + e.message, 'error');
  }
};

// ✅ معاينة صورة الإعلان
window.previewAdImage = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('adPreview');
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(input.files[0]);
  }
};

// ✅ رفع صورة الإعلان وحفظها
window.uploadAdImage = async function() {
  const fileInput = document.getElementById('adImageInput');
  const titleInput = document.getElementById('adTitleInput');
  const linkInput = document.getElementById('adLinkInput');
  const msgEl = document.getElementById('adUploadMsg');

  const title = titleInput?.value.trim() || '';
  const link = linkInput?.value.trim() || '';

  if (!title) { showNotification('أدخل عنوان الإعلان أولاً', 'warning'); return; }

  let adImageUrl = merchantData.ad_image || null;

  if (fileInput?.files?.[0]) {
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) { showNotification('حجم الصورة يجب أن يكون أقل من 5MB', 'warning'); return; }

    if (msgEl) msgEl.textContent = 'جاري الرفع...';
    const fileName = `ad_${merchantData.email.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadErr } = await supabaseClient.storage.from('product-images').upload(fileName, file, { upsert: true });
    if (uploadErr) { showNotification('فشل في رفع الصورة: ' + uploadErr.message, 'error'); return; }

    const { data: { publicUrl } } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
    adImageUrl = publicUrl;
  }

  const { error } = await supabaseClient.from('merchant').update({
    ad_image: adImageUrl, ad_title: title, ad_link: link || null, ad_status: 'active'
  }).eq('email', merchantData.email);

  if (error) { showNotification('فشل الحفظ: ' + error.message, 'error'); return; }

  merchantData.ad_image = adImageUrl;
  merchantData.ad_title = title;
  merchantData.ad_link = link || null;
  merchantData.ad_status = 'active';
  renderVipAdSection(merchantData);
  showNotification('✅ تم نشر الإعلان بنجاح!', 'success');
};

// ✅ حذف الإعلان
window.deleteAdImage = async function() {
  if (!confirm('هل تريد حذف الإعلان نهائياً؟')) return;
  const { error } = await supabaseClient.from('merchant').update({
    ad_image: null, ad_title: null, ad_link: null, ad_status: null
  }).eq('email', merchantData.email);
  if (error) { showNotification('فشل الحذف', 'error'); return; }
  merchantData.ad_image = null; merchantData.ad_title = null; merchantData.ad_link = null; merchantData.ad_status = null;
  renderVipAdSection(merchantData);
  showNotification('تم حذف الإعلان', 'success');
};

// ✅ طلب تصميم من الإدارة
window.requestAdDesign = async function() {
  if (!confirm('سيتم إرسال طلب تصميم إعلان للإدارة. سيتواصلون معك قريباً. المتابعة؟')) return;
  const { error } = await supabaseClient.from('admin_notifications').insert({
    type: 'ad_design_request',
    title: 'طلب تصميم إعلان VIP',
    message: `التاجر ${merchantData.name} (${merchantData.email}) يطلب تصميم إعلان مخصص لمتجره.`,
    user_email: merchantData.email,
    plan: 'vip',
    is_read: false
  });
  if (error) { showNotification('فشل إرسال الطلب', 'error'); return; }
  await supabaseClient.from('merchant').update({ ad_status: 'pending_design' }).eq('email', merchantData.email);
  merchantData.ad_status = 'pending_design';
  renderVipAdSection(merchantData);
  showNotification('✅ تم إرسال طلب التصميم! ستتلقى ردًا خلال 24 ساعة.', 'success');
};

// ✅ تحميل التصميم الجاهز من الإدارة
window.downloadAdDesign = function() {
  if (merchantData && merchantData.ad_image) {
    const a = document.createElement('a');
    a.href = merchantData.ad_image;
    a.download = 'ad_design.png';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    showNotification('لا يوجد تصميم متاح للتحميل حالياً', 'warning');
  }
};

// تحديث المبيعات اليدوية (Premium / VIP)
window.updateManualSales = async function() {
  const lang = localStorage.getItem("lang") || "ar";
  const salesInput = document.getElementById("manualSalesInput");
  
  if (!salesInput) return;
  
  const val = parseInt(salesInput.value) || 0;
  
  if (val < 0) {
    showNotification("قيمة المبيعات يجب أن تكون موجبة", "warning");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from("merchant")
      .update({ 
        manual_sales_stats: val,
        updated_at: new Date().toISOString()
      })
      .eq("email", merchantData.email);

    if (error) throw error;

    showNotification(t('sales_updated'), "success");
    
  } catch (error) {
    console.error("خطأ في تحديث المبيعات:", error);
    showNotification(t('save_error'), "error");
  }
};

// دوال المساعدة للتعافي الذاتي من الحقول المفقودة في جدول المنتجات
async function safeInsertProduct(payload) {
  let attemptPayload = { ...payload };
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    const { error } = await supabaseClient
      .from("products")
      .insert([attemptPayload]);

    if (!error) return null; // نجاح العملية

    // التحقق مما إذا كان الخطأ بسبب حقل غير موجود في قاعدة البيانات
    if (error.message && error.message.includes("in the schema cache")) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`⚠️ العمود '${missingCol}' غير موجود في جدول المنتجات. يتم حذفه وإعادة المحاولة.`);
        delete attemptPayload[missingCol];
        attempts++;
        continue;
      }
    }
    return error; // إرجاع الخطأ إذا لم يكن بسبب حقل مفقود
  }
  return new Error("فشلت العملية بسبب وجود حقول مفقودة متعددة");
}

async function safeUpdateProduct(id, updates, email) {
  let attemptUpdates = { ...updates };
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    const { error } = await supabaseClient
      .from("products")
      .update(attemptUpdates)
      .eq("id", id)
      .eq("owner", email);

    if (!error) return null; // نجاح العملية

    // التحقق مما إذا كان الخطأ بسبب حقل غير موجود في قاعدة البيانات
    if (error.message && error.message.includes("in the schema cache")) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`⚠️ العمود '${missingCol}' غير موجود في جدول المنتجات. يتم حذفه وإعادة المحاولة.`);
        delete attemptUpdates[missingCol];
        attempts++;
        continue;
      }
    }
    return error; // إرجاع الخطأ إذا لم يكن بسبب حقل مفقود
  }
  return new Error("فشلت العملية بسبب وجود حقول مفقودة متعددة");
}

// إضافة منتج جديد مع رفع الصورة
window.addProduct = async function() {
  const lang = localStorage.getItem("lang") || "ar";
  const nameInput = document.getElementById("productName");
  const priceInput = document.getElementById("productPrice");
  const descInput = document.getElementById("productDesc");
  const imageInput = document.getElementById("productImageInput");
  
  const typeInput = document.getElementById("productType");
  const colorInput = document.getElementById("productColor");
  const sizeInput = document.getElementById("productSize");
  const dimensionsInput = document.getElementById("productDimensions");
  
  const wholesaleInput = document.getElementById("productWholesalePrice");
  const minRetailInput = document.getElementById("productMinRetailPrice");
  const isPublishedInput = document.getElementById("productIsPublished");
  
  if (!nameInput || !priceInput || !imageInput) return;
  
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const description = descInput?.value.trim() || '';
  const files = Array.from(imageInput.files).slice(0, 8);

  const wholesalePrice = (merchantData && merchantData.is_wholesaler === true && wholesaleInput && wholesaleInput.value) ? parseFloat(wholesaleInput.value) : null;
  const minRetailPrice = (merchantData && merchantData.is_wholesaler === true && minRetailInput && minRetailInput.value) ? parseFloat(minRetailInput.value) : null;
  const isPublished = isPublishedInput ? isPublishedInput.checked : true;

  // التحقق من صحة البيانات
  if (!name || name.length < 3) {
    showNotification("اسم المنتج يجب أن يكون 3 أحرف على الأقل", "warning");
    return;
  }
  
  if (!price || price <= 0 || isNaN(price)) {
    showNotification("السعر يجب أن يكون رقم موجب", "warning");
    return;
  }
  
  if (wholesalePrice !== null && (wholesalePrice <= 0 || isNaN(wholesalePrice))) {
    showNotification("سعر الجملة يجب أن يكون رقم موجب", "warning");
    return;
  }

  if (minRetailPrice !== null && (minRetailPrice <= 0 || isNaN(minRetailPrice))) {
    showNotification("أدنى سعر للتجزئة يجب أن يكون رقم موجب", "warning");
    return;
  }

  if (wholesalePrice !== null && minRetailPrice !== null && wholesalePrice >= minRetailPrice) {
    showNotification("سعر الجملة يجب أن يكون أقل من أدنى سعر للتجزئة", "warning");
    return;
  }
  
  if (files.length === 0) {
    showNotification("يرجى اختيار صورة واحدة على الأقل للمنتج", "warning");
    return;
  }

  // التحقق من حجم ونوع الصور
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 5 * 1024 * 1024) {
      showNotification(t('image_too_large'), "warning");
      return;
    }
    if (!validTypes.includes(files[i].type)) {
      showNotification("نوع الصورة غير مدعوم. يرجى استخدام JPG, PNG, أو WebP", "warning");
      return;
    }
  }

  const btn = document.querySelector("#addForm .save-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = `${t('loading')}...`;
  }

  try {
    // التحقق من عدد المنتجات الحالي
    const { count } = await supabaseClient
      .from("products")
      .select("*", { count: 'exact', head: true })
      .eq("owner", merchantData.email);

    if (count >= productLimit) {
      throw new Error(t('limit_reached'));
    }

    let imageUrls = [];

    // محاولة رفع الصور لـ Supabase Storage
    try {
      for (let i = 0; i < files.length; i++) {
        const imageFile = files[i];
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `product_${timestamp}_${randomStr}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { error: uploadError } = await supabaseClient.storage
          .from("product-images")
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseClient.storage
            .from("product-images")
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        } else {
          console.warn('⚠️ Storage غير متاح, سيتم حفظ الصورة كـ Base64:', uploadError.message);
          const base64Str = await fileToBase64(imageFile);
          imageUrls.push(base64Str);
        }
      }
    } catch(storageErr) {
      console.warn('⚠️ خطأ في Storage, يتم التحويل لـ Base64');
      for (let i = 0; i < files.length; i++) {
        const base64Str = await fileToBase64(files[i]);
        imageUrls.push(base64Str);
      }
    }

    // إضافة المنتج (استخدم الصورة الأولى كصورة رئيسية، والباقي في مصفوفة images إن وجدت)
    // وحفظ التفاصيل في الحقل jsonb
    const minOrderQty = parseInt(document.getElementById('productMinOrderQty')?.value) || 1;
    const tiers = [];
    document.querySelectorAll('#volumeDiscountTiersList .volume-discount-tier-row').forEach(row => {
      const minQtyInput = row.querySelector('.tier-min-qty');
      const priceInput = row.querySelector('.tier-price');
      const minQty = parseInt(minQtyInput?.value);
      const tierPrice = parseFloat(priceInput?.value);
      if (minQty > 0 && tierPrice > 0) {
        tiers.push({ min_qty: minQty, price: tierPrice });
      }
    });
    tiers.sort((a, b) => a.min_qty - b.min_qty);

    const detailsObj = {
      type: typeInput?.value.trim() || null,
      colors: colorInput?.value.trim() ? colorInput.value.trim().split(',').map(s=>s.trim()) : [],
      sizes: sizeInput?.value.trim() ? sizeInput.value.trim().split(',').map(s=>s.trim()) : [],
      dimensions: dimensionsInput?.value.trim() || null,
      volume_discounts: tiers,
      moq: minOrderQty
    };

    let insertPayload = { 
      name, 
      price,
      category: document.getElementById('productB2bCategory')?.value || null,
      wholesale_price: wholesalePrice,
      min_retail_price: minRetailPrice,
      min_order_qty: minOrderQty,
      is_published: isPublished,
      show_in_b2b: !!(wholesalePrice && wholesalePrice > 0),
      description,
      image: imageUrls[0], 
      images: imageUrls,
      details: detailsObj,
      owner: merchantData.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const insertError = await safeInsertProduct(insertPayload);
    if (insertError) throw insertError;

    hideAddProductForm();
    await loadProducts();
    showNotification(t('product_added'), "success");
    
  } catch (err) {
    console.error("خطأ في إضافة المنتج:", err);
    console.error('تفاصيل الخطأ:', JSON.stringify(err));
    const errMsg = err.message || err.code || 'خطأ غير معروف';
    showNotification('فشل نشر المنتج: ' + errMsg, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-rocket"></i> نشر المنتج`;
    }
  }
};

// تحويل ملف لـ Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// حذف منتج مع التحقق من الملكية
window.deleteProduct = async function(id) {
  if (!confirm(t('delete_confirm'))) {
    return;
  }

  try {
    // التحقق من ملكية المنتج أولاً
    const { data: product, error: fetchError } = await supabaseClient
      .from("products")
      .select("owner, image")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    
    if (product.owner !== merchantData.email) {
      showNotification(t('unauthorized'), "error");
      return;
    }

    // حذف الصورة من Storage إذا كانت موجودة
    if (product.image) {
      try {
        const imagePath = product.image.split('/').pop();
        await supabaseClient.storage
          .from("product-images")
          .remove([imagePath]);
      } catch (storageError) {
        console.warn("لم يتم حذف الصورة من التخزين:", storageError);
      }
    }

    // حذف المنتج من قاعدة البيانات
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", id)
      .eq("owner", merchantData.email); // تأكيد الملكية

    if (error) throw error;

    await loadProducts();
    showNotification(t('product_deleted'), "success");
    
  } catch (error) {
    console.error("خطأ في حذف المنتج:", error);
    showNotification("حدث خطأ أثناء حذف المنتج", "error");
  }
};

// تعديل منتج (وظيفة جديدة)
window.editProduct = async function(id) {
  try {
    const { data: product, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("owner", merchantData.email)
      .single();

    if (error || !product) {
      showNotification("المنتج غير موجود أو غير مصرح به", "error");
      return;
    }

    // إظهار نموذج التعديل
    showEditProductForm(product);
    
  } catch (error) {
    console.error("خطأ في تحميل بيانات المنتج:", error);
    showNotification("حدث خطأ في تحميل بيانات المنتج", "error");
  }
};

// عرض منتج (وظيفة جديدة)
window.viewProduct = function(id) {
  if (merchantData && merchantData.slug) {
    window.open(`store.html?slug=${encodeURIComponent(merchantData.slug)}&product=${id}`, '_blank');
  } else if (merchantData && merchantData.email) {
    window.open(`store.html?merchant=${encodeURIComponent(merchantData.email)}&product=${id}`, '_blank');
  } else {
    window.open(`store.html?product=${id}`, '_blank');
  }
};

// وظائف التحكم في النوافذ المنبثقة (Modals)
window.toggleMenu = () => {
  const mi = document.getElementById("menuItems");
  if (mi) {
    mi.classList.toggle("show");
    // إغلاق القائمة عند النقر خارجها
    if (mi.classList.contains("show")) {
      setTimeout(() => {
        document.addEventListener('click', closeMenuOnClickOutside);
      }, 0);
    } else {
      document.removeEventListener('click', closeMenuOnClickOutside);
    }
  }
};

function closeMenuOnClickOutside(event) {
  const menu = document.getElementById("menuItems");
  const menuBtn = document.querySelector('.menu-btn');
  
  if (menu && menuBtn && !menu.contains(event.target) && !menuBtn.contains(event.target)) {
    menu.classList.remove("show");
    document.removeEventListener('click', closeMenuOnClickOutside);
  }
}

window.toggleProfile = () => {
  const modal = document.getElementById("profileModal");
  if (!modal) return;
  
  const isShow = modal.style.display === "flex";
  modal.style.display = isShow ? "none" : "flex";
  
  if (!isShow) {
    // تعبئة الحقول بالبيانات الحالية
    const nameInput = document.getElementById("merchantNameInput");
    const bioInput = document.getElementById("merchantBioInput");
    const phoneInput = document.getElementById("merchantPhoneInput");
    const addressInput = document.getElementById("merchantAddressInput");
    
    const igInput = document.getElementById("merchantInstagram");
    const fbInput = document.getElementById("merchantFacebook");
    const tkInput = document.getElementById("merchantTiktok");
    const waInput = document.getElementById("merchantWhatsapp");
    const webInput = document.getElementById("merchantWebsite");
    
    if (nameInput) nameInput.value = merchantData?.name || "";
    if (bioInput) bioInput.value = merchantData?.bio || "";
    if (phoneInput) phoneInput.value = merchantData?.phone || "";
    if (addressInput) addressInput.value = merchantData?.address || "";
    
    if (igInput) igInput.value = merchantData?.instagram || "";
    if (fbInput) fbInput.value = merchantData?.facebook || "";
    if (tkInput) tkInput.value = merchantData?.tiktok || "";
    if (waInput) waInput.value = merchantData?.whatsapp || "";
    if (webInput) webInput.value = merchantData?.website || "";
    
    const classificationInput = document.getElementById("merchantClassificationInput");
    if (classificationInput) {
      classificationInput.value = merchantData?.is_wholesaler ? "wholesale" : "retail";
    }
    
    // تحميل اللوغو الحالي
    const logoPreview = document.getElementById('storeLogoPreview');
    if (logoPreview) {
      const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%232a2a2a' rx='40'/%3E%3Ctext x='40' y='48' text-anchor='middle' font-size='32' fill='%2300ffc3'%3E%F0%9F%8F%AA%3C/text%3E%3C/svg%3E";
      logoPreview.src = merchantData?.store_image || placeholderSvg;
      logoPreview.onerror = () => { logoPreview.src = placeholderSvg; };
    }
    
    // Yalidine Settings (Gold, Premium, VIP)
    const yalidineSection = document.getElementById('yalidineSettings');
    if (yalidineSection) {
      const plan = merchantData?.package_type || 'basic';
      if (['gold', 'premium', 'vip'].includes(plan)) {
        yalidineSection.style.display = 'block';
        document.getElementById('merchantYalidineId').value = merchantData?.yalidine_api_id || '';
        document.getElementById('merchantYalidineToken').value = merchantData?.yalidine_api_token || '';
        if(document.getElementById('merchantZExpressToken')) {
            document.getElementById('merchantZExpressToken').value = merchantData?.zexpress_api_token || '';
        }
      } else {
        yalidineSection.style.display = 'none';
      }
    }

    // VIP Ad Settings (VIP only)
    const vipAdSection = document.getElementById('vipAdSettings');
    if (vipAdSection) {
      if (merchantData?.package_type === 'vip') {
        vipAdSection.style.display = 'block';
        document.getElementById('vipAdTitleInput').value = merchantData?.ad_title || '';
      } else {
        vipAdSection.style.display = 'none';
      }
    }
    
    // إغلاق القائمة إذا كانت مفتوحة
    const menu = document.getElementById("menuItems");
    if (menu) menu.classList.remove("show");
  }
  
  // منع إغلاق عند النقر داخل المودال
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.onclick = (e) => e.stopPropagation();
  }
  
  // إغلاق عند النقر خارج المودال أو بالزر ESC
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };
  
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      modal.style.display = "none";
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
};

// إضافة فئة خصم للمنتج الجديد
window.addVolumeDiscountTier = (minQty = '', price = '') => {
  const container = document.getElementById('volumeDiscountTiersList');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'volume-discount-tier-row';
  row.style = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="number" class="tier-min-qty" placeholder="الكمية (مثال: 50)" value="${minQty}" min="1" step="1" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-family: inherit;">
    <input type="number" class="tier-price" placeholder="سعر القطعة (دج)" value="${price}" min="0" step="0.01" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-family: inherit;">
    <button type="button" onclick="this.parentElement.remove()" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 6px; padding: 6px 10px; cursor: pointer; font-family: inherit;"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(row);
};

// إضافة فئة خصم للمنتج المعدل
window.addEditVolumeDiscountTier = (minQty = '', price = '') => {
  const container = document.getElementById('editVolumeDiscountTiersList');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'volume-discount-tier-row';
  row.style = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="number" class="tier-min-qty" placeholder="الكمية (مثال: 50)" value="${minQty}" min="1" step="1" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-family: inherit;">
    <input type="number" class="tier-price" placeholder="سعر القطعة (دج)" value="${price}" min="0" step="0.01" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: #fff; font-family: inherit;">
    <button type="button" onclick="this.parentElement.remove()" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 6px; padding: 6px 10px; cursor: pointer; font-family: inherit;"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(row);
};

window.showAddProductForm = () => {
  const f = document.getElementById("addForm");
  if (f) {
    f.style.display = "flex";
    // إغلاق القائمة إذا كانت مفتوحة
    const menu = document.getElementById("menuItems");
    if (menu) menu.classList.remove("show");
    
    // إظهار/إخفاء حقول الجملة بناءً على نوع الحساب
    const wsFields = document.getElementById("wholesaleFields");
    if (wsFields) {
      wsFields.style.display = (merchantData && merchantData.is_wholesaler === true) ? "grid" : "none";
    }

    // إظهار/إخفاء حقل تصنيف B2B
    const b2bCatField = document.getElementById("b2bCategoryField");
    if (b2bCatField) {
      b2bCatField.style.display = (merchantData && merchantData.is_wholesaler === true) ? "block" : "none";
    }

    // إظهار/إخفاء خصومات الكمية بناءً على نوع الحساب
    const vdContainer = document.getElementById("volumeDiscountsContainer");
    if (vdContainer) {
      vdContainer.style.display = (merchantData && merchantData.is_wholesaler === true) ? "block" : "none";
    }
    const tiersList = document.getElementById("volumeDiscountTiersList");
    if (tiersList) tiersList.innerHTML = '';

    // إعداد معاينة الصور
    const imageInput = document.getElementById("productImageInput");
    const previewContainer = document.getElementById("imagePreviewContainer");
    if (imageInput && previewContainer) {
      imageInput.onchange = function(e) {
        previewContainer.innerHTML = '';
        const files = Array.from(e.target.files).slice(0, 8); // حد أقصى 8
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.height = "60px";
            img.style.width = "60px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "4px";
            previewContainer.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      };
    }
    
    // منع إغلاق عند النقر داخل المودال
    const modalContent = f.querySelector('.modal-content');
    if (modalContent) {
      modalContent.onclick = (e) => e.stopPropagation();
    }
    
    // إغلاق عند النقر خارج المودال أو بالزر ESC
    f.onclick = (e) => {
      if (e.target === f) {
        hideAddProductForm();
      }
    };
    
    document.addEventListener('keydown', function closeOnEsc(e) {
      if (e.key === 'Escape') {
        hideAddProductForm();
        document.removeEventListener('keydown', closeOnEsc);
      }
    });
  }
};

window.hideAddProductForm = () => {
  const f = document.getElementById("addForm");
  if (f) {
    f.style.display = "none";
    // إعادة تعيين الحقول
    const nameInput = document.getElementById("productName");
    const priceInput = document.getElementById("productPrice");
    const descInput = document.getElementById("productDesc");
    const imageInput = document.getElementById("productImageInput");
    const imagePreview = document.getElementById("imagePreview");
    
    if (nameInput) nameInput.value = "";
    if (priceInput) priceInput.value = "";
    if (descInput) descInput.value = "";
    if (imageInput) imageInput.value = "";
    if (imagePreview) imagePreview.style.display = "none";
    
    // تفريغ حقول الجملة والنشر
    const wPriceInput = document.getElementById("productWholesalePrice");
    const minRetailInput = document.getElementById("productMinRetailPrice");
    const isPubInput = document.getElementById("productIsPublished");
    
    if (wPriceInput) wPriceInput.value = "";
    if (minRetailInput) minRetailInput.value = "";
    if (isPubInput) isPubInput.checked = true;

    // تفريغ حاوية معاينة الصور المتعددة وتفاصيل المنتج
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    if (imagePreviewContainer) imagePreviewContainer.innerHTML = "";
    
    document.getElementById("productType").value = "";
    document.getElementById("productColor").value = "";
    document.getElementById("productSize").value = "";
    document.getElementById("productDimensions").value = "";
  }
};

// إظهار نموذج تعديل المنتج (وظيفة جديدة)
window.showEditProductForm = (product) => {
  const modalId = "editProductModal";
  let modal = document.getElementById(modalId);
  
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    document.body.appendChild(modal);
  }
  
  const isWholesaler = (merchantData && merchantData.is_wholesaler === true);

  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-modal" onclick="hideEditProductForm()">×</button>
      <h2>تعديل المنتج</h2>
      <input type="text" id="editProductName" placeholder="اسم المنتج" value="${esc(product.name)}">
      <textarea id="editProductDesc" placeholder="وصف المنتج">${esc(product.description || '')}</textarea>
      <input type="number" id="editProductPrice" placeholder="السعر" value="${product.price}">
      
      <!-- حقول الجملة للتاجر الجملة فقط -->
      <div id="editWholesaleFields" style="display: ${isWholesaler ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <div>
          <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">سعر الجملة (دج)</label>
          <input type="number" id="editProductWholesalePrice" placeholder="سعر الجملة" value="${product.wholesale_price || ''}">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">أدنى سعر للتجزئة (دج)</label>
          <input type="number" id="editProductMinRetailPrice" placeholder="أدنى سعر للتجزئة" value="${product.min_retail_price || ''}">
        </div>
        <div>
          <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 4px;">أقل كمية للطلب</label>
          <input type="number" id="editProductMinOrderQty" placeholder="أقل كمية" value="${product.min_order_qty || product.details?.moq || 10}">
        </div>
      </div>

      <!-- تصنيف المنتج في سوق B2B - للتاجر الجملة فقط -->
      ${isWholesaler ? `
      <div style="margin-bottom:15px;">
        <label style="font-size:12px;color:#00c896;display:block;margin-bottom:6px;font-weight:700;"><i class="fas fa-th-large"></i> تصنيف المنتج في سوق الجملة B2B</label>
        <select id="editProductB2bCategory" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(0,200,150,0.3);background:rgba(0,200,150,0.05);color:inherit;font-family:inherit;font-size:13px;cursor:pointer;">
          <option value="">-- اختر التصنيف --</option>
          <option value="electronics" ${product.category==='electronics'?'selected':''}>📱 إلكترونيات</option>
          <option value="clothing" ${product.category==='clothing'?'selected':''}>👗 ملابس وموضة</option>
          <option value="home" ${product.category==='home'?'selected':''}>🛋️ منزل وأثاث</option>
          <option value="cosmetics" ${product.category==='cosmetics'?'selected':''}>💄 تجميل وعناية</option>
          <option value="food" ${product.category==='food'?'selected':''}>🌾 غذاء وزراعة</option>
          <option value="other" ${product.category==='other'?'selected':''}>📦 أخرى</option>
        </select>
      </div>` : ''}

      <!-- قسم خصومات الكمية للموردين/الجملة فقط -->
      <div id="editVolumeDiscountsContainer" style="display: ${isWholesaler ? 'block' : 'none'}; margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
        <label style="font-weight: bold; display: block; margin-bottom: 8px; font-size: 13px; color: #00ffc3;"><i class="fas fa-percentage"></i> فئات خصم الكميات (جملة)</label>
        <div id="editVolumeDiscountTiersList" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
          <!-- dynamic tiers generated here -->
        </div>
        <button type="button" onclick="addEditVolumeDiscountTier()" style="padding: 6px 12px; font-size: 12px; background: rgba(0,200,150,0.1); color: #00c896; border: 1px solid rgba(0,200,150,0.2); border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; width: fit-content; font-family: inherit;">
          <i class="fas fa-plus"></i> إضافة فئة خصم جديدة
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="editProductType" placeholder="النوع (مثال: قطن, حرير)" value="${esc(product.details?.type || '')}">
        <input type="text" id="editProductColor" placeholder="اللون (مثال: أحمر, أزرق)" value="${esc(product.details?.colors ? product.details.colors.join(', ') : '')}">
        <input type="text" id="editProductSize" placeholder="المقاس (مثال: S, M, L)" value="${esc(product.details?.sizes ? product.details.sizes.join(', ') : '')}">
        <input type="text" id="editProductDimensions" placeholder="الأبعاد (مثال: 10x20cm)" value="${esc(product.details?.dimensions || '')}">
      </div>

      <div class="image-upload-container">
        <label for="editProductImageInput" class="image-upload-label">
          <span>📷 تغيير الصور (حتى 8 صور)</span>
          <input type="file" id="editProductImageInput" accept="image/*" multiple style="display: none;">
        </label>
        <div id="editImagePreview" class="image-preview" style="display: flex; gap: 5px; overflow-x: auto; background-image: none;"></div>
      </div>
      
      <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-top: 15px; margin-bottom: ${isWholesaler ? '8px' : '20px'}; ">
        <input type="checkbox" id="editProductIsPublished" ${product.is_published !== false ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; margin: 0;">
        <label for="editProductIsPublished" style="margin-bottom: 0; cursor: pointer;">نشر المنتج مباشرة في المتجر</label>
      </div>

      ${isWholesaler ? `
      <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:10px;background:rgba(0,200,150,0.07);border-radius:8px;border:1px solid rgba(0,200,150,0.2);">
        <input type="checkbox" id="editShowInB2b" ${product.show_in_b2b ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;margin:0;accent-color:#00c896;">
        <div>
          <label for="editShowInB2b" style="margin-bottom:0;cursor:pointer;font-size:13px;font-weight:700;color:#00c896;">🏢 عرض في صفحة B2B (الجملة)</label>
          <p style="margin:2px 0 0;font-size:11px;color:#888;">عند التفعيل يظهر المنتج في منصة الجملة للمشترين</p>
        </div>
      </div>` : ''}

      <button onclick="updateProduct(${product.id})" class="save-btn">حفظ التغييرات</button>
    </div>
  `;
  
  // إعداد معاينة الصور
  const imageInput = document.getElementById("editProductImageInput");
  const imagePreview = document.getElementById("editImagePreview");
  
  if (imageInput && imagePreview) {
    // عرض الصور القديمة
    let oldImagesHTML = '';
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        oldImagesHTML += `<img src="${esc(img)}" style="height:60px; width:60px; object-fit:cover; border-radius:4px;">`;
      });
    } else if (product.image) {
      oldImagesHTML += `<img src="${esc(product.image)}" style="height:60px; width:60px; object-fit:cover; border-radius:4px;">`;
    }
    imagePreview.innerHTML = oldImagesHTML;

    // عرض فئات الخصم الحالية للتحرير
    const editTiersList = document.getElementById("editVolumeDiscountTiersList");
    if (editTiersList) {
      editTiersList.innerHTML = '';
      const existingTiers = product.details?.volume_discounts || [];
      existingTiers.forEach(t => {
        window.addEditVolumeDiscountTier(t.min_qty, t.price);
      });
    }

    imageInput.onchange = function(e) {
      imagePreview.innerHTML = '';
      const files = Array.from(e.target.files).slice(0, 8); // حد أقصى 8
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement("img");
          img.src = e.target.result;
          img.style.height = "60px";
          img.style.width = "60px";
          img.style.objectFit = "cover";
          img.style.borderRadius = "4px";
          imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    };
  }
  
  modal.style.display = "flex";
  
  // إعداد إغلاق المودال
  modal.onclick = (e) => {
    if (e.target === modal) {
      hideEditProductForm();
    }
  };
  
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape') {
      hideEditProductForm();
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
};

window.hideEditProductForm = () => {
  const modal = document.getElementById("editProductModal");
  if (modal) {
    modal.style.display = "none";
  }
};

window.updateProduct = async function(id) {
  const nameInput = document.getElementById("editProductName");
  const descInput = document.getElementById("editProductDesc");
  const priceInput = document.getElementById("editProductPrice");
  const imageInput = document.getElementById("editProductImageInput");
  
  const typeInput = document.getElementById("editProductType");
  const colorInput = document.getElementById("editProductColor");
  const sizeInput = document.getElementById("editProductSize");
  const dimensionsInput = document.getElementById("editProductDimensions");
  
  const wholesaleInput = document.getElementById("editProductWholesalePrice");
  const minRetailInput = document.getElementById("editProductMinRetailPrice");
  const isPublishedInput = document.getElementById("editProductIsPublished");
  
  const wholesalePrice = (merchantData && merchantData.is_wholesaler === true && wholesaleInput && wholesaleInput.value) ? parseFloat(wholesaleInput.value) : null;
  const minRetailPrice = (merchantData && merchantData.is_wholesaler === true && minRetailInput && minRetailInput.value) ? parseFloat(minRetailInput.value) : null;
  const isPublished = isPublishedInput ? isPublishedInput.checked : true;

  if (wholesalePrice !== null && (wholesalePrice <= 0 || isNaN(wholesalePrice))) {
    showNotification("سعر الجملة يجب أن يكون رقم موجب", "warning");
    return;
  }

  if (minRetailPrice !== null && (minRetailPrice <= 0 || isNaN(minRetailPrice))) {
    showNotification("أدنى سعر للتجزئة يجب أن يكون رقم موجب", "warning");
    return;
  }

  if (wholesalePrice !== null && minRetailPrice !== null && wholesalePrice >= minRetailPrice) {
    showNotification("سعر الجملة يجب أن يكون أقل من أدنى سعر للتجزئة", "warning");
    return;
  }

  const minOrderQty = parseInt(document.getElementById('editProductMinOrderQty')?.value) || 1;
  const tiers = [];
  document.querySelectorAll('#editVolumeDiscountTiersList .volume-discount-tier-row').forEach(row => {
    const minQtyInput = row.querySelector('.tier-min-qty');
    const priceInput = row.querySelector('.tier-price');
    const minQty = parseInt(minQtyInput?.value);
    const tierPrice = parseFloat(priceInput?.value);
    if (minQty > 0 && tierPrice > 0) {
      tiers.push({ min_qty: minQty, price: tierPrice });
    }
  });
  tiers.sort((a, b) => a.min_qty - b.min_qty);

  const detailsObj = {
    type: typeInput?.value.trim() || null,
    colors: colorInput?.value.trim() ? colorInput.value.trim().split(',').map(s=>s.trim()) : [],
    sizes: sizeInput?.value.trim() ? sizeInput.value.trim().split(',').map(s=>s.trim()) : [],
    dimensions: dimensionsInput?.value.trim() || null,
    volume_discounts: tiers,
    moq: minOrderQty
  };

  const showInB2bChk = document.getElementById('editShowInB2b');
  const b2bCategoryVal = document.getElementById('editProductB2bCategory')?.value || null;
  const updates = {
    name: nameInput?.value.trim(),
    description: descInput?.value.trim(),
    price: parseFloat(priceInput?.value) || 0,
    category: b2bCategoryVal,
    wholesale_price: wholesalePrice,
    min_retail_price: minRetailPrice,
    min_order_qty: minOrderQty,
    is_published: isPublished,
    show_in_b2b: showInB2bChk ? showInB2bChk.checked : !!(wholesalePrice && wholesalePrice > 0),
    details: detailsObj,
    updated_at: new Date().toISOString()
  };
  
  try {
    // إذا كانت هناك صور جديدة (بحد أقصى 8 صور)
    if (imageInput?.files && imageInput.files.length > 0) {
      const files = Array.from(imageInput.files).slice(0, 8);
      
      let imageUrls = [];
      for (let i = 0; i < files.length; i++) {
        const imageFile = files[i];
        
        if (imageFile.size > 5 * 1024 * 1024) {
          showNotification(t('image_too_large'), "warning");
          return;
        }
        
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `product_${timestamp}_${randomStr}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from("product-images")
          .upload(fileName, imageFile);
        
        if (uploadError) {
           console.warn('⚠️ Storage error, falling back to base64');
           const base64Str = await fileToBase64(imageFile);
           imageUrls.push(base64Str);
        } else {
          const { data: { publicUrl } } = supabaseClient.storage
            .from("product-images")
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }
      
      updates.image = imageUrls[0];
      updates.images = imageUrls;
    }
    
    // تحديث المنتج
    const updateError = await safeUpdateProduct(id, updates, merchantData.email);
    if (updateError) throw updateError;
    
    hideEditProductForm();
    await loadProducts();
    showNotification(t('product_updated') || "تم تحديث المنتج بنجاح", "success");
    
  } catch (error) {
    console.error("خطأ في تحديث المنتج:", error);
    showNotification(t('save_error') || "حدث خطأ أثناء تحديث المنتج", "error");
  }
};

// تسجيل الخروج مع تأكيد

// ── B2B VISIBILITY TOGGLE ─────────────────────────────
window.toggleB2BVisibility = async function(productId, el) {
  const wrap  = el.closest ? el : el.querySelector ? el : el;
  const track = el.querySelector ? el.querySelector('.b2b-toggle-track') : el.previousElementSibling?.querySelector('.b2b-toggle-track');
  const labelEl = el.closest('label')?.querySelector('.b2b-label') ||
                  el.parentElement?.querySelector('.b2b-label');

  // Determine current state from the wrapping div data-state
  const currentState = el.dataset.state === 'on';
  const newState     = !currentState;

  // Optimistic UI update
  el.dataset.state = newState ? 'on' : 'off';
  if (track) track.classList.toggle('active', newState);
  if (labelEl) {
    labelEl.style.color = newState ? '#00c896' : '#888';
    labelEl.textContent = newState ? '🏢 ظاهر في B2B' : '⬜ مخفي من B2B';
  }

  // Persist to DB
  const supabase = supabaseClient;
  if (!supabase) return;
  const { error } = await supabase
    .from('products')
    .update({ show_in_b2b: newState, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('owner', merchantData.email);

  if (error) {
    console.error('B2B toggle error:', error);
    // Revert
    el.dataset.state = currentState ? 'on' : 'off';
    if (track) track.classList.toggle('active', currentState);
    if (labelEl) {
      labelEl.style.color = currentState ? '#00c896' : '#888';
      labelEl.textContent = currentState ? '🏢 ظاهر في B2B' : '⬜ مخفي من B2B';
    }
    showNotification('فشل تحديث حالة B2B', 'error');
  } else {
    showNotification(newState ? 'منتجج ظاهر في B2B بنجاح' : 'تم إخفاء المنتج من B2B', 'success');
  }
};

// Inject toggle CSS once
(function injectB2BToggleCSS() {
  if (document.getElementById('b2bToggleStyle')) return;
  const style = document.createElement('style');
  style.id = 'b2bToggleStyle';
  style.textContent = `
    .b2b-toggle-wrap { display:inline-flex; align-items:center; cursor:pointer; }
    .b2b-toggle-track {
      width: 38px; height: 20px;
      background: rgba(255,255,255,0.1);
      border: 1.5px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      position: relative;
      transition: background 0.25s, border-color 0.25s;
    }
    .b2b-toggle-track.active {
      background: rgba(0,200,150,0.25);
      border-color: #00c896;
    }
    .b2b-toggle-thumb {
      position: absolute;
      top: 2px; right: 2px;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: rgba(255,255,255,0.35);
      transition: right 0.25s, background 0.25s;
    }
    .b2b-toggle-track.active .b2b-toggle-thumb {
      right: calc(100% - 16px);
      background: #00c896;
    }
  `;
  document.head.appendChild(style);
})();
window.logout = async () => {
  if (!confirm(t('logout_confirm'))) {
    return;
  }
  
  try {
    // إظهار حالة التحميل
    showNotification("جاري تسجيل الخروج...", "info");
    
    await supabaseClient.auth.signOut();
    
    // مسح التخزين المحلي
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // الانتقال إلى صفحة تسجيل الدخول
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
    
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);
    showNotification("حدث خطأ أثناء تسجيل الخروج", "error");
  }
};

// حذف الحساب (وظيفة جديدة)
window.deleteAccount = async function() {
  if (!confirm(t('delete_account_confirm'))) {
    return;
  }
  
  try {
    // حذف جميع منتجات التاجر أولاً
    const { error: deleteProductsError } = await supabaseClient
      .from("products")
      .delete()
      .eq("owner", merchantData.email);
    
    if (deleteProductsError) throw deleteProductsError;
    
    // حذف بيانات التاجر
    const { error: deleteMerchantError } = await supabaseClient
      .from("merchant")
      .delete()
      .eq("email", merchantData.email);
    
    if (deleteMerchantError) throw deleteMerchantError;
    
    // تسجيل الخروج
    await supabaseClient.auth.signOut();
    
    showNotification("تم حذف الحساب بنجاح", "success");
    
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    
  } catch (error) {
    console.error("خطأ في حذف الحساب:", error);
    showNotification("حدث خطأ أثناء حذف الحساب", "error");
  }
};

// فتح صفحة المتجر
window.openStorePage = () => {
  if (merchantData?.email) {
    const storeUrl = `store.html?merchant=${encodeURIComponent(merchantData.email)}`;
    window.open(storeUrl, '_blank');
    
    // زيادة عداد الزوار
    updateVisitorCount();
  }
};

// زيادة عداد الزوار (وظيفة جديدة)
async function updateVisitorCount() {
  try {
    const currentCount = merchantData.visitor_count || 0;
    const newCount = currentCount + 1;
    
    const { error } = await supabaseClient
      .from("merchant")
      .update({ visitor_count: newCount })
      .eq("email", merchantData.email);
    
    if (!error) {
      merchantData.visitor_count = newCount;
      const visitorCount = document.getElementById("visitorCount");
      if (visitorCount) {
        visitorCount.textContent = newCount.toLocaleString();
      }
    }
  } catch (error) {
    console.error("خطأ في تحديث عداد الزوار:", error);
  }
}

// تصدير البيانات (وظيفة جديدة)
window.exportData = async function() {
  try {
    const { data: products } = await supabaseClient
      .from("products")
      .select("*")
      .eq("owner", merchantData.email);
    
    const exportData = {
      merchant: merchantData,
      products: products || [],
      export_date: new Date().toISOString(),
      total_products: products?.length || 0
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `store_backup_${merchantData.name}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification("تم تصدير البيانات بنجاح", "success");
    
  } catch (error) {
    console.error("خطأ في تصدير البيانات:", error);
    showNotification("حدث خطأ أثناء تصدير البيانات", "error");
  }
};

// دالة إشعار محسنة
function showNotification(message, type = "info") {
  // إزالة الإشعارات القديمة
  const oldNotifications = document.querySelectorAll('.notification');
  oldNotifications.forEach(n => n.remove());
  
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  
  // أيقونة حسب نوع الإشعار
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notification.innerHTML = `
    <span class="notification-icon">${icons[type] || '💡'}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // إضافة أنماط CSS ديناميكياً
  const styleId = 'notification-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        z-index: 9999;
        animation: notificationSlideIn 0.3s ease;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
      }
      
      .notification.success {
        background: linear-gradient(135deg, rgba(0, 255, 195, 0.9), rgba(0, 200, 155, 0.9));
        color: #000;
      }
      
      .notification.error {
        background: linear-gradient(135deg, rgba(255, 71, 87, 0.9), rgba(200, 50, 65, 0.9));
        color: #fff;
      }
      
      .notification.warning {
        background: linear-gradient(135deg, rgba(255, 165, 0, 0.9), rgba(200, 130, 0, 0.9));
        color: #000;
      }
      
      .notification.info {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(30, 100, 200, 0.9));
        color: #fff;
      }
      
      .notification-icon {
        font-size: 18px;
      }
      
      .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .notification-close {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 20px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s;
        opacity: 0.8;
      }
      
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
        opacity: 1;
      }
      
      @keyframes notificationSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes notificationSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // إضافة زر الإغلاق
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      notification.style.animation = "notificationSlideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    };
  }
  
  // إزالة الإشعار بعد 4 ثواني
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "notificationSlideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 4000);
}

// إعداد تبديل اللغة
function setupLanguageToggle() {
  if (document.querySelector('.lang-toggle')) return;
  
  const lang = localStorage.getItem("lang") || "ar";
  const langNames = { ar: 'العربية', en: 'English', fr: 'Français' };
  
  const langToggle = document.createElement("button");
  langToggle.className = "lang-toggle";
  langToggle.innerHTML = `🌐 ${langNames[lang] || 'AR'}`;
  langToggle.title = "تبديل اللغة";
  langToggle.setAttribute('aria-label', 'تبديل اللغة');
  
  langToggle.onclick = () => {
    const currentLang = localStorage.getItem("lang") || "ar";
    const languages = ['ar', 'en', 'fr'];
    const currentIndex = languages.indexOf(currentLang);
    const newIndex = (currentIndex + 1) % languages.length;
    const newLang = languages[newIndex];
    
    localStorage.setItem("lang", newLang);
    
    // إظهار رسالة تأكيد
    showNotification(`تم تغيير اللغة إلى ${langNames[newLang]}`, "info");
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  };
  
  const headerActions = document.querySelector(".header-actions");
  if (headerActions) {
    headerActions.insertBefore(langToggle, headerActions.children[0]);
  }
}

// إعداد وظيفة البحث
function setupSearchFunctionality() {
  const searchContainer = document.createElement("div");
  searchContainer.className = "search-container";
  searchContainer.innerHTML = `
    <div class="search-wrapper">
      <input type="text" id="productSearch" placeholder="🔍 بحث عن منتج..." 
             class="search-input">
      <button id="clearSearch" class="clear-search-btn" style="display: none;">×</button>
    </div>
  `;
  
  const productsSection = document.querySelector(".products-section");
  if (productsSection) {
    const sectionHeader = productsSection.querySelector(".section-header");
    if (sectionHeader) {
      sectionHeader.appendChild(searchContainer);
    }
  }
  
  const searchInput = document.getElementById("productSearch");
  const clearBtn = document.getElementById("clearSearch");
  
  if (searchInput && clearBtn) {
    let searchTimeout;
    
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.trim();
      
      clearBtn.style.display = term ? "block" : "none";
      
      clearTimeout(searchTimeout);
      
      if (term) {
        searchTimeout = setTimeout(() => {
          loadProducts(term, 1);
        }, 500);
      } else {
        loadProducts('', 1);
      }
    });
    
    clearBtn.onclick = () => {
      searchInput.value = "";
      clearBtn.style.display = "none";
      loadProducts('', 1);
    };
    
    // البحث بالزر Enter
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loadProducts(searchInput.value.trim(), 1);
      }
    });
  }
}

// إعداد تحليلات VIP (وظيفة جديدة)
function setupVIPAnalytics() {
  // هذه وظيفة يمكن توسيعها لجلب تحليلات أكثر تقدمًا
  console.log("تحليلات VIP مفعلة");
  
  // يمكن إضافة:
  // - تحليل مبيعات المنتجات
  // - رسوم بيانية
  // - تقارير شهرية
  // - إشعارات ذكية
}

// إضافة أنماط CSS محسنة
function addCustomStyles() {
  if (document.getElementById('dashboard-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dashboard-custom-styles';
  style.textContent = `
    /* الأنماط الأساسية */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* التحميل */
    .full-page-loading .spinner {
      border: 4px solid rgba(0, 255, 195, 0.2);
      border-top: 4px solid #00ffc3;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    .spinner.small {
      width: 30px;
      height: 30px;
      border-width: 3px;
    }
    
    .loading-products {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: #888;
    }
    
    /* تبديل اللغة */
    .lang-toggle {
      background: rgba(0, 255, 195, 0.1);
      border: 1px solid #00ffc3;
      color: #00ffc3;
      border-radius: 8px;
      padding: 8px 15px;
      cursor: pointer;
      margin-left: 10px;
      transition: all 0.3s ease;
      font-size: 14px;
      font-family: 'Gumela', sans-serif;
    }
    
    .lang-toggle:hover {
      background: rgba(0, 255, 195, 0.2);
      transform: scale(1.05);
    }
    
    /* منتجات */
    .product-image {
      width: 100%;
      height: 180px;
      border-radius: 12px;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .product-image-container {
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      height: 180px;
    }
    
    .product-image-container:hover .product-image {
      transform: scale(1.05);
    }
    
    .product-date {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
    }
    
    .product-info {
      padding: 12px;
    }
    
    .product-name {
      margin: 0 0 8px;
      font-size: 14px;
      line-height: 1.4;
      height: 40px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      color: #fff;
      font-weight: 500;
    }
    
    .product-desc {
      font-size: 12px;
      color: #aaa;
      margin: 0 0 8px;
      line-height: 1.4;
      height: 36px;
      overflow: hidden;
    }
    
    .product-price {
      color: #00ffc3;
      font-weight: bold;
      font-size: 16px;
      margin: 0 0 12px;
    }
    
    .product-actions {
      display: flex;
      gap: 8px;
    }
    
    .product-actions button {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
      border: 1px solid;
      background: transparent;
      color: white;
    }
    
    .edit-btn {
      border-color: #00b894 !important;
      color: #00b894 !important;
    }
    
    .edit-btn:hover {
      background: rgba(0, 184, 148, 0.1) !important;
    }
    
    .view-btn {
      border-color: #0984e3 !important;
      color: #0984e3 !important;
    }
    
    .view-btn:hover {
      background: rgba(9, 132, 227, 0.1) !important;
    }
    
    .delete-btn {
      border-color: #ff4757 !important;
      color: #ff4757 !important;
    }
    
    .delete-btn:hover {
      background: rgba(255, 71, 87, 0.1) !important;
    }
    
    /* Pagination */
    .pagination-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-top: 30px;
      padding: 20px;
    }
    
    .pagination-btn, .page-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'Gumela', sans-serif;
    }
    
    .pagination-btn:hover:not(:disabled),
    .page-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
    
    .pagination-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .page-btn.active {
      background: #00ffc3;
      color: #000;
      font-weight: bold;
    }
    
    .page-info {
      color: #aaa;
      margin: 0 10px;
    }
    
    .page-buttons {
      display: flex;
      gap: 5px;
    }
    
    /* البحث */
    .search-container {
      margin-left: auto;
    }
    
    .search-wrapper {
      position: relative;
      width: 250px;
    }
    
    .search-input {
      width: 100%;
      padding: 10px 40px 10px 15px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-family: 'Gumela', sans-serif;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #00ffc3;
      box-shadow: 0 0 0 2px rgba(0, 255, 195, 0.1);
    }
    
    .clear-search-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .clear-search-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    
    /* المودالات */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    }
    
    .modal-content {
      background: #222;
      padding: 30px;
      border-radius: 15px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    
    .modal-content h2 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #fff;
      text-align: center;
    }
    
    .close-modal {
      position: absolute;
      top: 15px;
      right: 15px;
      background: transparent;
      border: none;
      color: #888;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s;
    }
    
    .close-modal:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    
    /* الحقول */
    input, textarea, select {
      width: 100%;
      padding: 12px 15px;
      margin: 8px 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-family: 'Gumela', sans-serif;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #00ffc3;
      box-shadow: 0 0 0 2px rgba(0, 255, 195, 0.1);
    }
    
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    /* الأزرار */
    .save-btn {
      width: 100%;
      padding: 14px;
      background: #00ffc3;
      color: #000;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 20px;
      transition: all 0.3s;
      font-family: 'Gumela', sans-serif;
      font-size: 16px;
    }
    
    .save-btn:hover:not(:disabled) {
      background: #00e6b0;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 255, 195, 0.3);
    }
    
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    /* القوائم */
    .menu-items {
      position: absolute;
      top: 100%;
      right: 0;
      background: #222;
      padding: 10px;
      border-radius: 12px;
      min-width: 180px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.05);
      z-index: 3000;
      display: none;
      backdrop-filter: blur(10px);
    }
    
    .menu-items.show {
      display: block;
      animation: fadeIn 0.2s ease;
    }
    
    .menu-items button {
      background: transparent;
      border: none;
      color: white;
      padding: 12px 15px;
      width: 100%;
      text-align: right;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      font-family: 'Gumela', sans-serif;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .menu-items button:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateX(-5px);
    }
    
    .menu-items button.danger {
      color: #ff4757;
    }
    
    .menu-items button.danger:hover {
      background: rgba(255, 71, 87, 0.1);
    }
    
    /* شريط الاستخدام */
    .usage-bar-container {
      margin: 15px 0;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 5px;
    }
    
    .usage-bar {
      height: 8px;
      background: #00ffc3;
      border-radius: 4px;
      transition: all 0.5s ease;
    }
    
    .usage-text {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      font-size: 12px;
      color: #aaa;
    }
    
    .usage-percentage {
      font-weight: bold;
      color: #00ffc3;
    }
    
    /* تاريخ الانتهاء */
    .expiry-days {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .expiry-days.normal {
      background: rgba(0, 255, 195, 0.1);
      color: #00ffc3;
    }
    
    .expiry-days.warning {
      background: rgba(255, 165, 0, 0.1);
      color: #ffa500;
      animation: pulse 2s infinite;
    }
    
    .expiry-days.expired {
      background: rgba(255, 71, 87, 0.1);
      color: #ff4757;
    }
    
    /* رفع الصور */
    .image-upload-container {
      margin: 15px 0;
    }
    
    .image-upload-label {
      display: inline-block;
      background: rgba(0, 255, 195, 0.1);
      color: #00ffc3;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      border: 2px dashed #00ffc3;
      text-align: center;
      width: 100%;
      transition: all 0.3s;
    }
    
    .image-upload-label:hover {
      background: rgba(0, 255, 195, 0.2);
    }
    
    .image-preview {
      width: 100%;
      height: 200px;
      margin-top: 15px;
      border-radius: 10px;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border: 2px dashed rgba(255, 255, 255, 0.1);
      display: none;
    }
    
    /* تفاصيل المنتج */
    .product-detail-view {
      max-width: 600px;
    }
    
    .product-detail-image {
      width: 100%;
      max-height: 300px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    
    /* تحسينات للشبكة */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .product-card {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 15px;
      overflow: hidden;
      transition: all 0.3s;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .product-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 255, 195, 0.1);
      border-color: rgba(0, 255, 195, 0.2);
    }
    
    /* زر الإضافة الرئيسي */
    .add-btn-main {
      background: linear-gradient(135deg, #00ffc3, #00b894);
      color: #000;
      border: none;
      padding: 12px 25px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      font-family: 'Gumela', sans-serif;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .add-btn-main:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(0, 255, 195, 0.3);
    }
    
    .add-btn-main:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      background: #666;
    }
    
    /* شارات الباقة */
    .plan-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-left: 10px;
    }
    
    .plan-badge.basic {
      background: rgba(52, 152, 219, 0.2);
      color: #3498db;
      border: 1px solid #3498db;
    }
    
    .plan-badge.gold {
      background: rgba(241, 196, 15, 0.2);
      color: #f1c40f;
      border: 1px solid #f1c40f;
    }
    
    .plan-badge.premium {
      background: rgba(155, 89, 182, 0.2);
      color: #9b59b6;
      border: 1px solid #9b59b6;
    }
    
    .plan-badge.vip {
      background: rgba(231, 76, 60, 0.2);
      color: #e74c3c;
      border: 1px solid #e74c3c;
    }
    
    /* تحسينات للاستجابة */
    @media (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .modal-content {
        width: 95%;
        padding: 20px;
      }
      
      .search-wrapper {
        width: 200px;
      }
      
      .pagination-container {
        flex-wrap: wrap;
      }
      
      .product-image {
        height: 150px;
      }
      
      .product-image-container {
        height: 150px;
      }
    }
    
    @media (max-width: 480px) {
      .products-grid {
        grid-template-columns: 1fr;
      }
      
      .product-actions {
        flex-direction: column;
      }
      
      .search-wrapper {
        width: 150px;
      }
      
      .lang-toggle {
        padding: 6px 10px;
        font-size: 12px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// تحسين القائمة (وظيفة جديدة)
function enhanceMenu() {
  const menu = document.getElementById("menuItems");
  if (!menu) return;
  
  const lang = localStorage.getItem("lang") || "ar";
  
  // إضافة عناصر إضافية للقائمة
  const extraItems = `
    <button onclick="exportData()">
      <span>📥 ${t('export_data')}</span>
    </button>
    <button onclick="window.open('help.html', '_blank')">
      <span>❓ المساعدة</span>
    </button>
    <button onclick="window.open('settings.html', '_blank')">
      <span>⚙️ الإعدادات</span>
    </button>
    <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
    <button onclick="deleteAccount()" class="danger">
      <span>🗑️ حذف الحساب</span>
    </button>
  `;
  
  const logoutBtn = menu.querySelector('button[onclick*="logout"]');
  if (logoutBtn) {
    logoutBtn.insertAdjacentHTML('beforebegin', extraItems);
  }
}

// تشغيل النظام عند التحميل
document.addEventListener("DOMContentLoaded", () => {
  addCustomStyles();
  initDashboard();
  
  // تحسين القائمة بعد تحميل البيانات
  setTimeout(enhanceMenu, 1000);
  
  // إضافة معاينة الصور
  document.addEventListener('change', function(e) {
    if (e.target.id === 'productImageInput' && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
          preview.style.backgroundImage = `url(${event.target.result})`;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });
  
  // إضافة عنصر معاينة الصورة إذا لم يكن موجوداً
  const imageUploadContainer = document.querySelector('.image-upload-container');
  if (imageUploadContainer && !document.getElementById('imagePreview')) {
    const preview = document.createElement('div');
    preview.id = 'imagePreview';
    preview.className = 'image-preview';
    imageUploadContainer.appendChild(preview);
  }
});

window.openStorePage = function() {
  if (merchantData && merchantData.slug) {
    window.open('store.html?slug=' + encodeURIComponent(merchantData.slug), '_blank');
    updateVisitorCount();
  } else if (merchantData && merchantData.email) {
    window.open('store.html?merchant=' + encodeURIComponent(merchantData.email), '_blank');
    updateVisitorCount();
  } else {
    alert('يرجى التأكد من بيانات المتجر أولاً');
  }
};

// وظيفة نسخ رابط المتجر
window.copyStoreLink = function() {
  if (merchantData && merchantData.slug) {
    const url = `${window.location.origin}/store.html?slug=${merchantData.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copyLinkBtn');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-copy"></i> نسخ';
          btn.classList.remove('copied');
        }, 2000);
      }
      showNotification('تم نسخ الرابط بنجاح', 'success');
    }).catch(err => {
      console.error('فشل النسخ: ', err);
      showNotification('لم نتمكن من نسخ الرابط', 'error');
    });
  } else {
    showNotification('رابط المتجر غير متاح حالياً', 'warning');
  }
};

// =========================================
// وظائف رفع وصل الدفع
// =========================================
let pendingReceiptFile = null;

window.handleReceiptUpload = function(input) {
  if (input.files && input.files[0]) {
    pendingReceiptFile = input.files[0];
    document.getElementById('receiptFileName').textContent = pendingReceiptFile.name;
    document.getElementById('submitReceiptBtn').disabled = false;
  }
};

window.submitReceipt = async function() {
  if (!pendingReceiptFile) return;
  
  const btn = document.getElementById('submitReceiptBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الإرسال...';
  
  try {
    const userEmail = merchantData.email;
    const fileExt = pendingReceiptFile.name.split('.').pop();
    const fileName = `receipt_${Date.now()}_${userEmail}.${fileExt}`;
    
    // رفع الصورة إلى التخزين
    const { error: uploadError } = await supabaseClient.storage
      .from('product-images')
      .upload(fileName, pendingReceiptFile, { cacheControl: '3600', upsert: false });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabaseClient.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    // تحديث حالة الدفع
    await supabaseClient.from('users').update({
      payment_status: 'pending_review'
    }).eq('email', userEmail);
    
    // إرسال إشعار للإدارة برابط الوصل
    await supabaseClient.from('admin_notifications').insert({
      type: 'payment_receipt',
      title: 'وصل دفع جديد',
      message: `قام المتجر ${merchantData.name} برفع وصل دفع. الرابط: ${publicUrl}`,
      user_email: userEmail,
      is_read: false
    });
    
    btn.textContent = 'تم الإرسال بنجاح! سيتم المراجعة قريباً.';
    alert('تم إرسال وصل الدفع للإدارة للمراجعة. شكراً لك!');
    
  } catch (err) {
    console.error('خطأ في رفع الوصل:', err);
    alert('حدث خطأ أثناء رفع الوصل. يرجى المحاولة مرة أخرى.');
    btn.disabled = false;
    btn.textContent = 'إرسال للمراجعة';
  }
};

// =====================================================
// إصلاح toggleMenu - القائمة المنسدلة
// =====================================================
window.toggleMenu = function() {
  const menu = document.getElementById('menuItems');
  if (menu) menu.classList.toggle('show');
};

// إغلاق القائمة عند الضغط خارجها
document.addEventListener('click', function(e) {
  const dropdown = document.querySelector('.menu-dropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    const menu = document.getElementById('menuItems');
    if (menu) menu.classList.remove('show');
  }
});

// =====================================================
// دوال ترقية الباقة - Modal داخلي
// =====================================================
let selectedUpgradePlan = null;

window.showUpgradeModal = function() {
  const modal = document.getElementById('upgradePlanModal');
  if (modal) modal.style.display = 'flex';

  const currentPlan = merchantData?.package_type || 'basic';
  const planOrder = ['basic', 'gold', 'premium', 'vip'];
  const currentIndex = planOrder.indexOf(currentPlan);

  const grid = document.getElementById('upgradeOptionsGrid');
  const vipMsg = document.getElementById('vipAlreadyMessage');
  const toggleContainer = document.querySelector('.upgrade-billing-toggle');
  const sendBtn = document.getElementById('upgradeSendBtn');

  if (currentIndex === 3) {
    if (grid) grid.style.display = 'none';
    if (vipMsg) vipMsg.style.display = 'block';
    if (toggleContainer) toggleContainer.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';
  } else {
    if (grid) grid.style.display = 'grid';
    if (vipMsg) vipMsg.style.display = 'none';
    if (toggleContainer) toggleContainer.style.display = 'flex';
    if (sendBtn) {
      sendBtn.style.display = 'block';
      sendBtn.disabled = true;
    }

    // إخفاء الباقات الأدنى من الحالية
    document.querySelectorAll('#upgradeOptionsGrid .up-plan-card').forEach(opt => {
      const planIndex = planOrder.indexOf(opt.dataset.plan);
      opt.style.display = planIndex > currentIndex ? '' : 'none';
      opt.classList.remove('selected');
    });
  }

  selectedUpgradePlan = null;

  // إعادة تعيين toggle
  const toggle = document.getElementById('upgradeBillingCycle');
  if (toggle) toggle.checked = false;
  updateUpgradePrices();
};

window.updateUpgradePrices = function() {
  const isYearly = document.getElementById('upgradeBillingCycle')?.checked;
  document.querySelectorAll('.up-plan-card').forEach(card => {
    const monthly = parseInt(card.dataset.monthly || 0);
    const yearly  = parseInt(card.dataset.yearly  || 0);
    const price   = isYearly ? yearly : monthly;
    const plan    = card.dataset.plan;
    const el      = document.getElementById(`up-price-${plan}`);
    if (el) el.textContent = price.toLocaleString();
    // تحديث unit
    const unitEl = card.querySelector('.up-plan-price span:last-child');
    if (unitEl) unitEl.textContent = isYearly ? 'دج/سنة' : 'دج/شهر';
  });
};

window.selectUpgradePlan = function(el) {
  const card = el.classList.contains('up-plan-card') ? el : el.closest('.up-plan-card');
  if (!card) return;

  document.querySelectorAll('.up-plan-card').forEach(o => o.classList.remove('selected'));
  card.classList.add('selected');
  selectedUpgradePlan = card.dataset.plan;

  const sendBtn = document.getElementById('upgradeSendBtn');
  if (sendBtn) sendBtn.disabled = false;
};

// ===== التنقل بين أقسام الداش بورد =====
window.switchDashboardSection = function(sectionId) {
  document.querySelectorAll('.dashboard-tab-section').forEach(sec => {
    sec.style.display = 'none';
  });
  const activeSec = document.getElementById(sectionId);
  if (activeSec) activeSec.style.display = 'block';
  
  if (sectionId === 'dcbSection') {
    window.loadVendorDCB();
  } else if (sectionId === 'supplierDealsSection') {
    window.loadSupplierDeals();
  }
};

// ===== حفظ إعدادات الكوبون =====
window.saveCouponSettings = async function() {
  const code = document.getElementById('couponCodeInput').value.trim();
  const discount = parseFloat(document.getElementById('couponDiscountInput').value) || 0;
  
  const btn = document.querySelector('#couponsSection .add-btn-main');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  
  try {
    const { error } = await supabaseClient
      .from('merchant')
      .update({ coupon_code: code, coupon_discount: discount })
      .eq('email', merchantData.email);
      
    if (error) throw error;
    showNotification('✅ تم حفظ إعدادات الكوبون بنجاح', 'success');
  } catch (err) {
    showNotification('❌ خطأ في الحفظ', 'error');
  } finally {
    if (btn) btn.innerHTML = 'حفظ الإعدادات';
  }
};

// ===== تحميل وعرض الطلبات =====
window.loadMerchantOrders = async function(email) {
  const tbody = document.querySelector('#merchantOrdersTable tbody');
  const noOrdersMsg = document.getElementById('noOrdersMsg');
  if (!tbody || !noOrdersMsg) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('merchant_email', email)
      .or('deleted_by_merchant.is.null,deleted_by_merchant.eq.false')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      noOrdersMsg.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }
    
    noOrdersMsg.style.display = 'none';
    tbody.innerHTML = '';
    
    data.forEach(order => {
      let itemsList = [];
      if (Array.isArray(order.items)) itemsList = order.items;
      else if (typeof order.items === 'string') itemsList = JSON.parse(order.items);
      
      const itemsText = itemsList.map(i => `${i.qty || i.quantity || 0}x ${i.name || i.product_name || 'منتج'}`).join(' | ');
      const phoneClean = order.customer_phone.replace(/[^0-9]/g, '');
      const waLink = `https://wa.me/${phoneClean}`;
      
      // Calculate B2B values
      const isB2B = itemsList.some(i => i.wholesale === true) || (order.notes && order.notes.includes('B2B'));
      let fullPrice = 0;
      let depositAmount = 0;
      
      if (isB2B) {
          itemsList.forEach(i => {
              const q = parseInt(i.qty || i.quantity || 0);
              const p = parseFloat(i.price || i.unit_price || 0);
              fullPrice += q * p;
              depositAmount += parseFloat(i.deposit_amount || (q * p * 0.20));
          });
          if (fullPrice === 0) {
              const matchTotal = order.notes?.match(/الإجمالي:\s*([\d,]+)/);
              if (matchTotal) fullPrice = parseFloat(matchTotal[1].replace(/,/g, ''));
              const matchDep = order.notes?.match(/العربون:\s*([\d,]+)/);
              if (matchDep) depositAmount = parseFloat(matchDep[1].replace(/,/g, ''));
          }
          if (fullPrice === 0) {
              fullPrice = order.total_price;
          }
          if (depositAmount === 0) {
              depositAmount = order.total_price;
          }
      } else {
          fullPrice = order.total_price;
      }
      
      const isPlatformDeposit = isB2B && (order.status === 'deposit_paid' || (order.notes && order.notes.includes('المنصة')));
      
      const typeBadge = isB2B 
        ? '<span style="background:rgba(0,200,150,0.12); color:var(--brand); padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700;">جملة B2B</span>'
        : '<span style="background:rgba(255,255,255,0.07); color:#aaa; padding:3px 8px; border-radius:4px; font-size:11px;">تجزئة</span>';
      
      const fullPriceText = `${Math.round(fullPrice).toLocaleString('ar-DZ')} دج`;
        
      const depositText = isB2B 
        ? `${Math.round(depositAmount).toLocaleString('ar-DZ')} دج` 
        : '<span style="color:#666;">—</span>';
        
      const platformDepositBadge = isB2B 
        ? (isPlatformDeposit 
            ? '<span style="background:rgba(37,211,102,0.12); color:#25d366; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700;"><i class="fas fa-check-circle"></i> نعم (المنصة)</span>' 
            : '<span style="background:rgba(255,255,255,0.05); color:#999; padding:3px 8px; border-radius:4px; font-size:11px;">لا (مباشر)</span>')
        : '<span style="color:#666;">—</span>';
      
      tbody.innerHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:12px;">#${order.id.substring(0,8)}</td>
          <td style="padding:12px;">${order.customer_name}<br><small>${order.customer_phone}</small></td>
          <td style="padding:12px;">${typeBadge}</td>
          <td style="padding:12px; color:var(--text); font-weight:700;">${fullPriceText}</td>
          <td style="padding:12px; color:var(--neon-green);">${depositText}</td>
          <td style="padding:12px;">${platformDepositBadge}</td>
          <td style="padding:12px;">${
            order.status === 'pending'         ? '<span style="color:#ffa500;font-weight:700;">⏳ قيد الانتظار</span>' :
            order.status === 'pending_contact' ? '<span style="color:#25d366;font-weight:700;"><i class="fab fa-whatsapp"></i> انتظار التواصل</span>' :
            order.status === 'deposit_paid'    ? '<span style="color:var(--brand);font-weight:700;">💳 عربون تم</span>' :
            order.status === 'completed'       ? '<span style="color:#00c896;font-weight:700;">✅ مكتمل</span>' :
            order.status === 'cancelled'       ? '<span style="color:#ef4444;font-weight:700;">❌ ملغي</span>' :
            `<span style="color:#aaa;">${order.status || '—'}</span>`
          }</td>
          <td style="padding:12px;">${new Date(order.created_at).toLocaleDateString()}</td>
          <td style="padding:12px;">
            <button onclick="window.open('${waLink}', '_blank')" style="background:#25d366; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
              <i class="fab fa-whatsapp"></i> تواصل
            </button>
            <button onclick="alert('تفاصيل: ${itemsText.replace(/'/g, "\\'")}')" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
              <i class="fas fa-eye"></i> المنتجات
            </button>
            ${isB2B ? `
            <button onclick="openInvoiceModal('${order.id}')" style="background:#00c896; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" title="الفاتورة">
              <i class="fas fa-file-invoice"></i> الفاتورة
            </button>
            ` : ''}
            <button onclick="deleteMerchantOrder('${order.id}')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" title="حذف الطلب">
              <i class="fas fa-trash"></i> حذف
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('خطأ في تحميل الطلبات:', err);
  }
};

// ===== حذف الطلب للتاجر مع بقائه عند الإدارة =====
window.deleteMerchantOrder = async function(orderId) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب من قائمتك؟ لن يتم حذفه من لوحة الإدارة.')) return;
  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ deleted_by_merchant: true })
      .eq('id', orderId);
      
    if (error) throw error;
    
    showNotification('✅ تم حذف الطلب من قائمتك بنجاح', 'success');
    if (merchantData?.email) {
      await loadMerchantOrders(merchantData.email);
    }
  } catch (err) {
    console.error('خطأ في حذف الطلب:', err);
    showNotification('❌ فشل حذف الطلب', 'error');
  }
};

// ===== تحديث لوغو المتجر في الـ Sidebar =====
function updateSidebarLogo(url) {
  const sidebarLogo = document.getElementById('sidebarLogoImg');
  if (sidebarLogo && url) sidebarLogo.src = url;
}

// ===== دالة تدوير الباقة للأدمن في وضع المعاينة =====
window.cyclePlanPreview = function() {
  const plans = ['basic', 'gold', 'premium', 'vip'];
  const current = window._adminPlanOverride || 'vip';
  const idx = (plans.indexOf(current) + 1) % plans.length;
  const next = plans[idx];
  window._adminPlanOverride = next;
  localStorage.setItem('admin_preview_plan', next);
  
  // تحديث merchantData والواجهة مباشرة
  if (merchantData) {
    merchantData.package_type = next;
    applyPlanLogic(merchantData);
    if (window.KH_FeatureGates) {
      KH_FeatureGates.applyAllGates(next);
    }
  }
  
  // تحديث شارة المعاينة
  const banner = document.getElementById('adminPreviewBanner');
  if (banner) {
    const planLabels = { basic: 'Basic', gold: 'Gold 🥇', premium: 'Premium 💎', vip: 'VIP 👑' };
    const span = banner.querySelector('span');
    if (span) span.textContent = `⚡ وضع الأدمن — تجربة باقة ${planLabels[next] || next.toUpperCase()}`;
  }
  
  showNotification(`تم التبديل إلى باقة: ${next.toUpperCase()} ✅`, 'success');
};

// =========================================================================
//  إعدادات ومعاملات الدفع بالرصيد (DCB) للتاجر
// =========================================================================

window.loadVendorDCB = async function() {
  if (!merchantData) {
    console.warn("⚠️ بيانات المتجر غير متوفرة بعد.");
    return;
  }
  
  const dcbTab = document.getElementById('dcbSection');
  if (!dcbTab) return;

  // إظهار مؤشر التحميل
  const tbody = document.getElementById('vendorDcbTransactionsTable');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل المعاملات...</td></tr>';
  }

  try {
    await Promise.all([
      loadVendorDCBSettings(),
      loadVendorDCBTransactions()
    ]);
  } catch (err) {
    console.error("خطأ في تحميل بيانات DCB للتاجر:", err);
    showNotification("حدث خطأ أثناء تحميل بيانات الدفع بالرصيد", "error");
  }
};

window.loadVendorDCBSettings = async function() {
  if (!merchantData || !merchantData.email) return;
  try {
    const { data, error } = await supabaseClient
      .from('dcb_vendor_settings')
      .select('*')
      .eq('merchant_email', merchantData.email)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const enabledCheckbox = document.getElementById('vendorDcbEnabled');
    const limitInput = document.getElementById('vendorDcbMaxLimit');
    const autoAcceptCheckbox = document.getElementById('vendorDcbAutoAccept');

    if (data) {
      if (enabledCheckbox) enabledCheckbox.checked = !!data.is_enabled;
      if (limitInput) limitInput.value = data.max_limit_override || '';
      if (autoAcceptCheckbox) autoAcceptCheckbox.checked = !!data.auto_accept;
    } else {
      if (enabledCheckbox) enabledCheckbox.checked = false;
      if (limitInput) limitInput.value = '';
      if (autoAcceptCheckbox) autoAcceptCheckbox.checked = true;
    }
  } catch (err) {
    console.error("خطأ في تحميل إعدادات DCB للبائع:", err);
  }
};

window.saveVendorDCBSettings = async function() {
  if (!merchantData || !merchantData.email) {
    showNotification("خطأ: لم يتم تحميل بيانات البائع.", "error");
    return;
  }

  const enabled = document.getElementById('vendorDcbEnabled').checked;
  const limitVal = document.getElementById('vendorDcbMaxLimit').value.trim();
  const limit = limitVal ? parseFloat(limitVal) : null;
  const autoAccept = document.getElementById('vendorDcbAutoAccept').checked;

  const btn = document.querySelector('#dcbSection .add-btn-main');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  }

  try {
    // التحقق أولاً من وجود إعدادات سابقة للبائع
    const { data: existing, error: checkErr } = await supabaseClient
      .from('dcb_vendor_settings')
      .select('id')
      .eq('merchant_email', merchantData.email)
      .limit(1)
      .maybeSingle();

    if (checkErr) throw checkErr;

    const updates = {
      merchant_email: merchantData.email,
      is_enabled: enabled,
      max_limit_override: limit,
      auto_accept: autoAccept,
      updated_at: new Date().toISOString()
    };

    let error;
    if (existing) {
      const { error: updateErr } = await supabaseClient
        .from('dcb_vendor_settings')
        .update(updates)
        .eq('id', existing.id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabaseClient
        .from('dcb_vendor_settings')
        .insert(updates);
      error = insertErr;
    }

    if (error) throw error;

    showNotification("✅ تم حفظ إعدادات الدفع بالرصيد بنجاح!", "success");
    await loadVendorDCBSettings();
  } catch (err) {
    console.error("خطأ في حفظ إعدادات DCB للبائع:", err);
    showNotification("حدث خطأ أثناء حفظ الإعدادات: " + (err.message || err.code), "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> حفظ إعدادات DCB';
    }
  }
};

window.loadVendorDCBTransactions = async function() {
  if (!merchantData || !merchantData.email) return;
  const tbody = document.getElementById('vendorDcbTransactionsTable');
  if (!tbody) return;

  try {
    // جلب تقسيمات المعاملات الخاصة بهذا التاجر
    const { data, error } = await supabaseClient
      .from('dcb_transaction_splits')
      .select(`
        id,
        amount,
        platform_fee,
        net_amount,
        created_at,
        dcb_transactions (
          id,
          phone_number,
          carrier,
          status
        )
      `)
      .eq('merchant_email', merchantData.email)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #888;">لا توجد معاملات دفع بالرصيد لمتجرك بعد.</td></tr>';
      return;
    }

    const carrierNames = {
      mobilis: 'موبيليس',
      djezzy: 'جازي',
      ooredoo: 'أوريدو'
    };

    const statusMap = {
      'pending': '<span style="color: #ff9f43; font-weight: bold;">قيد التحقق</span>',
      'otp_sent': '<span style="color: #ff9f43;">تم إرسال OTP</span>',
      'otp_verified': '<span style="color: #00ffc3;">تم تأكيد OTP</span>',
      'charging': '<span style="color: #ff9f43;">جاري الخصم</span>',
      'completed': '<span style="color: #00ffc3; font-weight: bold;">مكتملة</span>',
      'failed': '<span style="color: #ff4757; font-weight: bold;">فاشلة</span>',
      'refunded': '<span style="color: #aaa;">مسترجعة</span>',
      'expired': '<span style="color: #ff4757;">منتهية</span>'
    };

    tbody.innerHTML = data.map(split => {
      const tx = split.dcb_transactions || {};
      const txId = tx.id ? tx.id.slice(0, 8) + '...' : '—';
      const phone = tx.phone_number || '—';
      const carrier = carrierNames[tx.carrier] || tx.carrier || '—';
      const status = statusMap[tx.status] || tx.status || '—';
      const date = new Date(split.created_at).toLocaleDateString('ar-DZ', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #aaa;">${txId}</td>
          <td style="padding: 10px; color: #fff;">${phone}</td>
          <td style="padding: 10px;">${carrier}</td>
          <td style="padding: 10px; font-weight: bold; color: #fff;">${(split.amount || 0).toLocaleString()} دج</td>
          <td style="padding: 10px; color: #ff4757;">${(split.platform_fee || 0).toLocaleString()} دج</td>
          <td style="padding: 10px; color: #00ffc3; font-weight: bold;">${(split.net_amount || 0).toLocaleString()} دج</td>
          <td style="padding: 10px;">${status}</td>
          <td style="padding: 10px; color: #aaa; font-size: 12px;">${date}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error("خطأ في تحميل سجل معاملات التاجر:", err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #ff4757;">فشل تحميل المعاملات: ${err.message}</td></tr>`;
  }
};

// ==========================================
// 📦 سوق الموردين والصفقات والطلبات B2B
// ==========================================

// ===== تحميل صفقات الموردين B2B =====
window.loadSupplierDeals = async function() {
  const grid = document.getElementById('supplierDealsGrid');
  const noDealsMsg = document.getElementById('noSupplierDealsMsg');
  if (!grid || !noDealsMsg) return;
  
  grid.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل صفقات الموردين...</div>';
  noDealsMsg.style.display = 'none';
  
  try {
    // جلب جميع الموردين النشطين لبناء خريطة بياناتهم
    const { data: suppliersData } = await supabaseClient
      .from('suppliers')
      .select('email, company_name, phone, logo')
      .eq('status', 'active');
      
    const suppliersMap = new Map((suppliersData || []).map(s => [s.email, s]));

    // جلب جميع المنتجات التي تُعرض في سوق الجملة B2B
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('show_in_b2b', true)
      .not('wholesale_price', 'is', 'null')
      .gt('wholesale_price', 0);
      
    if (error) throw error;
    
    // تصفية المنتجات التي يملكها مستخدم بدقة مورد
    const b2bProducts = (products || []).filter(p => suppliersMap.has(p.owner));
    
    if (b2bProducts.length === 0) {
      grid.innerHTML = '';
      noDealsMsg.style.display = 'block';
      return;
    }
    
    grid.innerHTML = '';
    b2bProducts.forEach(p => {
      const sup = suppliersMap.get(p.owner);
      const moq = p.min_order_qty || p.details?.moq || 10;
      
      const card = document.createElement('div');
      card.className = 'dashboard-box';
      card.style = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px; position: relative; text-align: right;';
      
      const discountText = p.details?.volume_discounts?.length > 0
        ? `<span style="background: rgba(0,255,195,0.12); color: #00ffc3; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; position: absolute; top: 15px; left: 15px;">خصومات كمية</span>`
        : '';

      card.innerHTML = `
        ${discountText}
        <img src="${p.image || 'images/placeholder.png'}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px;">
        <h4 style="margin: 0; font-size: 15px; color: #fff;">${p.name}</h4>
        <div style="font-size: 12px; color: #aaa; display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-warehouse"></i> <span>المورد: ${sup.company_name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
          <div>
            <div style="font-size: 11px; color: #aaa;">سعر الجملة</div>
            <strong style="color: #00ffc3; font-size: 14px;">${Math.round(p.wholesale_price).toLocaleString('ar-DZ')} دج</strong>
          </div>
          <div>
            <div style="font-size: 11px; color: #aaa; text-align: left;">أقل كمية (MOQ)</div>
            <strong style="color: #fff; font-size: 13px; display: block; text-align: left;">${moq} قطعة</strong>
          </div>
        </div>
        <button onclick="window.openB2bOrderModal(${p.id})" class="save-btn" style="width: 100%; margin-top: 5px; padding: 8px; font-family: inherit; font-size: 13px; cursor: pointer; border: none;"><i class="fas fa-shopping-cart"></i> طلب شراء بالجملة</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("خطأ في تحميل صفقات الموردين:", err);
    grid.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4757; grid-column: 1 / -1;"><i class="fas fa-exclamation-circle"></i> فشل تحميل صفقات الموردين.</div>';
  }
};

let currentB2bProduct = null;

window.openB2bOrderModal = async function(productId) {
  const modal = document.getElementById('b2bOrderModal');
  if (!modal) return;
  
  try {
    const { data: p, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
      
    if (error || !p) throw error || new Error("لم يتم العثور على المنتج");
    
    currentB2bProduct = p;
    
    const { data: sup } = await supabaseClient
      .from('suppliers')
      .select('company_name')
      .eq('email', p.owner)
      .maybeSingle();
      
    document.getElementById('b2bModalProductImg').src = p.image || 'images/placeholder.png';
    document.getElementById('b2bModalProductName').textContent = p.name;
    document.getElementById('b2bModalProductSupplier').textContent = `المورد: ${sup?.company_name || 'مورد معتمد'}`;
    document.getElementById('b2bModalProductPrice').textContent = `${Math.round(p.wholesale_price).toLocaleString('ar-DZ')} دج`;
    
    const moq = p.min_order_qty || p.details?.moq || 10;
    document.getElementById('b2bModalProductMOQ').textContent = moq;
    
    const qtyInput = document.getElementById('b2bOrderQty');
    qtyInput.value = moq;
    qtyInput.min = moq;
    
    const tiersList = document.getElementById('b2bModalTiersList');
    const tiersContainer = document.getElementById('b2bModalTiersContainer');
    const discounts = p.details?.volume_discounts || [];
    
    if (discounts.length > 0) {
      tiersContainer.style.display = 'block';
      tiersList.innerHTML = discounts.map(d => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(255,255,255,0.03); padding:3px 0;">
          <span>عند طلب ${d.min_qty} قطعة أو أكثر:</span>
          <strong style="color:#00ffc3;">${Math.round(d.price).toLocaleString()} دج/قطعة</strong>
        </div>
      `).join('');
    } else {
      tiersContainer.style.display = 'none';
    }
    
    document.getElementById('b2bBuyerName').value = merchantData?.name || '';
    document.getElementById('b2bBuyerPhone').value = merchantData?.phone || '';
    document.getElementById('b2bBuyerAddress').value = merchantData?.address || '';
    
    calculateB2bOrder();
    
    modal.style.display = 'flex';
  } catch(err) {
    console.error(err);
    showNotification("❌ فشل فتح نافذة الطلب", "error");
  }
};

window.calculateB2bOrder = function() {
  if (!currentB2bProduct) return;
  
  const moq = currentB2bProduct.min_order_qty || currentB2bProduct.details?.moq || 10;
  const qtyInput = document.getElementById('b2bOrderQty');
  let qty = parseInt(qtyInput.value);
  if (isNaN(qty) || qty < moq) {
    qty = moq;
  }
  
  let price = parseFloat(currentB2bProduct.wholesale_price);
  const discounts = currentB2bProduct.details?.volume_discounts || [];
  const sortedDiscounts = [...discounts].sort((a,b) => b.min_qty - a.min_qty);
  for (let d of sortedDiscounts) {
    if (qty >= d.min_qty) {
      price = parseFloat(d.price);
      break;
    }
  }
  
  const total = qty * price;
  const deposit = total * 0.20;
  const remaining = total * 0.80;
  const commission = total * 0.05;
  
  document.getElementById('b2bOrderCurrentPrice').textContent = `${Math.round(price).toLocaleString('ar-DZ')} دج`;
  document.getElementById('b2bOrderTotalVal').textContent = `${Math.round(total).toLocaleString('ar-DZ')} دج`;
  document.getElementById('b2bOrderDepositVal').textContent = `${Math.round(deposit).toLocaleString('ar-DZ')} دج`;
  document.getElementById('b2bOrderRemainingVal').textContent = `${Math.round(remaining).toLocaleString('ar-DZ')} دج`;
  document.getElementById('b2bOrderCommissionVal').textContent = `${Math.round(commission).toLocaleString('ar-DZ')} دج`;
};

window.closeB2bOrderModal = function() {
  const modal = document.getElementById('b2bOrderModal');
  if (modal) modal.style.display = 'none';
  currentB2bProduct = null;
};

window.submitB2bOrder = async function() {
  if (!currentB2bProduct) return;
  
  const name = document.getElementById('b2bBuyerName').value.trim();
  const phone = document.getElementById('b2bBuyerPhone').value.trim();
  const address = document.getElementById('b2bBuyerAddress').value.trim();
  
  const moq = currentB2bProduct.min_order_qty || currentB2bProduct.details?.moq || 10;
  const qtyInput = document.getElementById('b2bOrderQty');
  const qty = parseInt(qtyInput.value) || moq;
  
  if (!name || !phone || !address) {
    showNotification("⚠️ يرجى ملء كافة حقول التوصيل والشحن", "warning");
    return;
  }
  
  const submitBtn = document.getElementById('b2bSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
  
  try {
    let price = parseFloat(currentB2bProduct.wholesale_price);
    const discounts = currentB2bProduct.details?.volume_discounts || [];
    const sortedDiscounts = [...discounts].sort((a,b) => b.min_qty - a.min_qty);
    for (let d of sortedDiscounts) {
      if (qty >= d.min_qty) {
        price = parseFloat(d.price);
        break;
      }
    }
    
    const total = qty * price;
    const deposit = total * 0.20;
    const refCode = 'B2B-MER-' + Date.now().toString(36).toUpperCase();
    
    const { error } = await supabaseClient
      .from('orders')
      .insert({
        merchant_email: currentB2bProduct.owner,
        buyer_email: merchantData.email,
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        items: [{
          id: currentB2bProduct.id,
          name: currentB2bProduct.name,
          qty: qty,
          price: price,
          image: currentB2bProduct.image || '',
          wholesale: true,
          deposit_amount: deposit,
          ref_code: refCode
        }],
        total_price: deposit,
        notes: `[B2B صفقات تجار] الكمية: ${qty} | إجمالي الصفقة: ${total.toLocaleString()} دج | العربون: ${deposit.toLocaleString()} دج | Ref: ${refCode}`,
        status: 'pending'
      });
      
    if (error) throw error;
    
    await supabaseClient.from('notifications').insert({
      recipient_email: currentB2bProduct.owner,
      title: `صفقة جملة جديدة: ${currentB2bProduct.name}`,
      message: `التاجر ${merchantData.name} طلب ${qty} قطعة. العربون: ${deposit.toLocaleString()} دج.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    
    showNotification("✅ تم إرسال طلب الشراء ودفع العربون بنجاح!", "success");
    closeB2bOrderModal();
    
  } catch(err) {
    console.error(err);
    showNotification("❌ فشل تسجيل الطلب", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الطلب ودفع العربون';
  }
};

let currentInvoiceOrder = null;
let currentInvoiceSupplier = null;

window.openInvoiceModal = async function(orderId) {
  const modal = document.getElementById('b2bInvoiceModal');
  if (!modal) return;
  
  try {
    const { data: order, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (error || !order) throw error || new Error("لم يتم العثور على الطلب");
    
    currentInvoiceOrder = order;
    
    const { data: supplier } = await supabaseClient
      .from('suppliers')
      .select('company_name, phone, email, address')
      .eq('email', order.merchant_email)
      .maybeSingle();
      
    currentInvoiceSupplier = supplier || { company_name: "تاجر جملة معتمد", phone: order.merchant_email, email: order.merchant_email };
    
    document.getElementById('invNumber').textContent = order.id.substring(0,8).toUpperCase();
    document.getElementById('invDate').textContent = new Date(order.created_at).toLocaleDateString('ar-DZ');
    
    document.getElementById('invSupplierCompany').textContent = `الشركة: ${currentInvoiceSupplier.company_name}`;
    document.getElementById('invSupplierPhone').textContent = `الهاتف: ${currentInvoiceSupplier.phone || '—'}`;
    document.getElementById('invSupplierEmail').textContent = `البريد: ${currentInvoiceSupplier.email || '—'}`;
    
    document.getElementById('invBuyerName').textContent = `الاسم: ${order.customer_name}`;
    document.getElementById('invBuyerPhone').textContent = `الهاتف: ${order.customer_phone}`;
    document.getElementById('invBuyerAddress').textContent = `العنوان: ${order.customer_address || '—'}`;
    
    let itemsList = [];
    if (Array.isArray(order.items)) itemsList = order.items;
    else if (typeof order.items === 'string') itemsList = JSON.parse(order.items);
    
    let fullTotal = 0;
    const body = document.getElementById('invItemsBody');
    body.innerHTML = itemsList.map(i => {
      const q = parseInt(i.qty || i.quantity || 1);
      const p = parseFloat(i.price || i.unit_price || 0);
      const sub = q * p;
      fullTotal += sub;
      
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${i.name}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${q}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">${Math.round(p).toLocaleString()} دج</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: left; font-weight: bold;">${Math.round(sub).toLocaleString()} دج</td>
        </tr>
      `;
    }).join('');
    
    if (fullTotal === 0) {
      fullTotal = order.total_price * 5.0;
    }
    
    const deposit = fullTotal * 0.20;
    const remaining = fullTotal * 0.80;
    
    document.getElementById('invTotalAmount').textContent = `${Math.round(fullTotal).toLocaleString('ar-DZ')} دج`;
    document.getElementById('invDepositPaid').textContent = `${Math.round(deposit).toLocaleString('ar-DZ')} دج`;
    document.getElementById('invRemainingDue').textContent = `${Math.round(remaining).toLocaleString('ar-DZ')} دج`;
    
    modal.style.display = 'flex';
  } catch(err) {
    console.error(err);
    showNotification("❌ فشل جلب تفاصيل الفاتورة", "error");
  }
};

window.closeInvoiceModal = function() {
  const modal = document.getElementById('b2bInvoiceModal');
  if (modal) modal.style.display = 'none';
  currentInvoiceOrder = null;
  currentInvoiceSupplier = null;
};

window.printB2bInvoice = function() {
  window.print();
};

window.sendInvoiceWhatsApp = function() {
  if (!currentInvoiceOrder) return;
  
  const phone = currentInvoiceOrder.customer_phone.replace(/[^0-9]/g, '');
  let itemsList = [];
  if (Array.isArray(currentInvoiceOrder.items)) itemsList = currentInvoiceOrder.items;
  else if (typeof currentInvoiceOrder.items === 'string') itemsList = JSON.parse(currentInvoiceOrder.items);
  
  const itemsText = itemsList.map(i => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ');
  
  const msg = `مرحباً، إليك تفاصيل فاتورة طلب الجملة الخاص بك من منصة كلش هنا:
رقم الفاتورة: ${currentInvoiceOrder.id.substring(0,8).toUpperCase()}
المنتجات: ${itemsText}
العربون المدفوع: ${Math.round(currentInvoiceOrder.total_price).toLocaleString()} دج
المتبقي للدفع: ${Math.round(currentInvoiceOrder.total_price * 4.0).toLocaleString()} دج
شكراً لتعاملك معنا.`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
};

