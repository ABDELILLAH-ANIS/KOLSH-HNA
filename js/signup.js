// signup.js
// إعداد Supabase من الملف المركزي
(function() {
const supabase = window.getSupabaseClient();
const tr = (key, params) => typeof window.translate === 'function' ? window.translate(key, params) : key;

// ========== توليد slug من البريد الإلكتروني ==========
function generateStoreSlug(email) {
    // خذ الجزء قبل @
    let base = email.split('@')[0].toLowerCase();
    // أبق فقط حروف، أرقام، نقطة، شرطة
    base = base.replace(/[^a-z0-9\-\.]/g, '-');
    // ازل الشرطات المتكررة
    base = base.replace(/-+/g, '-');
    // ازل الشرطة من البداية والنهاية
    base = base.replace(/^-+|-+$/g, '');
    if (base.length < 3) base = 'store-' + base;
    return base;
}

// حالة التطبيق
let selectedPlanData = null;

// تحميل بيانات الباقة المختارة
function loadSelectedPlan() {
    try {
        let planData = JSON.parse(localStorage.getItem('selectedPackageData'));
        
        // Fallback: Read from URL query params if local storage is empty
        if (!planData) {
            const urlParams = new URLSearchParams(window.location.search);
            const plan = urlParams.get('plan');
            const period = urlParams.get('period');
            const price = parseFloat(urlParams.get('price'));
            
            if (plan && period && !isNaN(price)) {
                planData = {
                    plan: plan,
                    period: period,
                    price: price,
                    isYearly: period === 'yearly',
                    selectedAt: new Date().toISOString()
                };
                localStorage.setItem('selectedPackageData', JSON.stringify(planData));
                localStorage.setItem('selectedPackage', plan);
                localStorage.setItem('isYearlyBilling', period === 'yearly');
                console.log('✅ Loaded package from URL query params:', planData);
            }
        }
        
        if (planData) {
            selectedPlanData = planData;
            
            // Translate values dynamically using signup.js translate function if available
            const tr = window.translate || (k => k);
            const planIdLower = String(planData.plan || 'basic').toLowerCase();
            const planNameKey = `plan_names.${planIdLower}`;
            const planNameTranslated = tr(planNameKey);
            const planPeriodTranslated = planData.isYearly ? tr('plan_yearly') : tr('plan_monthly');
            const currencyTranslated = tr('currency');
            
            // تحديث واجهة معلومات الباقة
            document.getElementById('selectedPlanName').textContent = planNameTranslated;
            document.getElementById('selectedPlanPrice').textContent = 
                `${planData.price.toLocaleString()} ${currencyTranslated}`;
            document.getElementById('selectedPlanPeriod').textContent = planPeriodTranslated;
            
            console.log('✅ تم تحميل بيانات الباقة:', planData);
            
            // إضافة إشعار الدفع
            showPaymentNotice();
        } else {
            const tr = window.translate || (k => k);
            showError(tr('no_plan_selected') || 'لم يتم اختيار باقة. الرجاء العودة واختيار باقة أولاً.');
            const planInfo = document.getElementById('planInfo');
            if (planInfo) planInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات الباقة:', error);
        showError(tr('plan_load_error'));
    }
}

// الحصول على الاسم العربي للباقة
function getPlanArabicName(planId) {
    const plans = {
        basic: 'الباقة الأساسية',
        gold: 'الباقة الذهبية',
        premium: 'الباقة المميزة',
        vip: 'باقة VIP'
    };
    return plans[planId] || planId;
}

// إشعار الدفع
function showPaymentNotice() {
    // Remove existing payment notices if any
    const oldNotices = document.querySelectorAll('.payment-notice');
    oldNotices.forEach(n => n.remove());

    const tr = window.translate || (k => k);

    const notice = document.createElement('div');
    notice.className = 'payment-notice';
    notice.innerHTML = `
        <div class="payment-notice-title">${tr('payment_notice_title') || '⚠️ إشعار مهم'}</div>
        <p>${tr('payment_notice_1') || 'بعد إنشاء الحساب، سيتم التواصل معك خلال 24 ساعة لتأكيد الدفع وتفعيل حسابك.'}</p>
        <p>${tr('payment_notice_2') || 'للدفع عبر: البنك / التحويل الإلكتروني / ويصا'}</p>
        <p>${tr('payment_contact') || '📞 للاستفسار: 0555-12-34-56'}</p>
    `;

    // إدراج الإشعار بعد الباقة وقبل زر Google
    const googleBtn = document.getElementById('googleSignupBtn');
    if (googleBtn && googleBtn.parentNode) {
        googleBtn.parentNode.insertBefore(notice, googleBtn);
    } else {
        const planInfo = document.getElementById('planInfo');
        if (planInfo) planInfo.parentNode.insertBefore(notice, planInfo.nextSibling);
    }
}

// عرض إشعار
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // إضافة زر للإغلاق
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        left: 5px;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 12px;
        padding: 2px 6px;
    `;
    closeBtn.onclick = () => notification.style.display = 'none';
    
    // إزالة الأزرار القديمة
    const oldButtons = notification.querySelectorAll('button');
    oldButtons.forEach(btn => btn.remove());
    
    notification.appendChild(closeBtn);
    
    // إخفاء تلقائي بعد 10 ثواني
    setTimeout(() => {
        if (notification.style.display === 'block') {
            notification.style.display = 'none';
        }
    }, 10000);
}

// عرض خطأ
function showError(message) {
    showNotification(message, 'error');
}

// التحقق من صحة النموذج
function validateForm() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    const phoneInput = document.getElementById('phone');
    // تنظيف رقم الهاتف تلقائياً من الفراغات والشرطات وأكواد الاتصال المحلية والدولية
    let phone = phoneInput.value.trim().replace(/[\s\-\(\)\+]/g, '');
    if (phone.startsWith('213')) phone = phone.slice(3);
    if (phone.startsWith('0')) phone = phone.slice(1);
    phoneInput.value = phone; // عرض الرقم بعد تنظيفه للمستخدم
    
    // التحقق من الحقول المطلوبة
    if (!fullName || !email || !password || !confirmPassword || !phone) {
        showError(tr('required_fields'));
        return false;
    }
    
    // التحقق من تطابق كلمة المرور
    if (password !== confirmPassword) {
        showError(tr('passwords_not_match'));
        return false;
    }
    
    // التحقق من قوة كلمة المرور
    if (password.length < 6) {
        showError(tr('password_length'));
        return false;
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError(tr('invalid_email'));
        return false;
    }
    
    // التحقق من رقم الهاتف (يجب أن يكون 9 أرقام بعد التنظيف)
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
        showError(tr('invalid_phone'));
        return false;
    }
    
    return true;
}

// تسجيل المستخدم
async function signupUser(userData) {
    try {
        const btn = document.getElementById('signupBtn');
        btn.disabled = true;
        btn.textContent = 'جارٍ إنشاء الحساب...';
        btn.classList.add('loading');
        
        // 1. تسجيل المستخدم في Supabase Auth
        const userRole = (typeof getSelectedRole === 'function') ? getSelectedRole() : 'retailer';
        const safeOrigin = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.fullName,
                    phone: userData.fullPhone,
                    selected_plan: selectedPlanData?.plan || 'basic',
                    plan_price: selectedPlanData?.price || 0,
                    is_yearly: selectedPlanData?.isYearly || false,
                    role: userRole
                },
                emailRedirectTo: `${safeOrigin}/auth-callback.html`
            }
        });
        
        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error(tr('already_registered'));
            }
            throw authError;
        }
        
        // 2. حفظ معلومات إضافية في جدول المستخدمين
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: userData.email,
                full_name: userData.fullName,
                phone: userData.fullPhone,
                country_code: '+213',
                selected_plan: selectedPlanData?.plan || 'basic',
                plan_price: selectedPlanData?.price || 0,
                billing_period: selectedPlanData?.isYearly ? 'yearly' : 'monthly',
                account_status: 'pending_approval',
                role: userRole,
                broker_points: 0,
                created_at: new Date().toISOString(),
                is_active: false,
                payment_status: 'pending',
                last_login: new Date().toISOString()
            });
        
        if (dbError) {
            console.warn('⚠️ خطأ في حفظ بيانات users (RLS محتمل):', dbError.message);
            // نكمل العملية لأن الحساب تم إنشاؤه في auth بنجاح
        }

        // 2.5 إنشاء سجل التاجر تلقائياً
        const subDays = selectedPlanData?.isYearly ? 365 : 30;
        const subEnd = new Date();
        subEnd.setDate(subEnd.getDate() + subDays);

        // توليد slug فريد
        const baseSlug = generateStoreSlug(userData.email);
        // تحقق من التكرار في قاعدة البيانات
        let finalSlug = baseSlug;
        let slugCounter = 0;
        while (true) {
            const { data: existing } = await supabase
                .from('merchant')
                .select('slug')
                .eq('slug', finalSlug)
                .maybeSingle();
            if (!existing) break;
            slugCounter++;
            finalSlug = `${baseSlug}-${slugCounter}`;
        }

        const { error: merchantError } = await supabase
            .from('merchant')
            .insert({
                email: userData.email,
                name: userData.fullName,
                slug: finalSlug,
                package_type: selectedPlanData?.plan || 'basic',
                account_status: 'pending_approval',
                visitor_count: 0,
                manual_sales_stats: 0,
                subscription_end: subEnd.toISOString(),
                is_wholesaler: userRole === 'wholesaler' || userRole === 'supplier',
                credit_eligible: false,
                total_sales: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (merchantError) {
            console.warn('⚠️ خطأ في إنشاء سجل التاجر:', merchantError);
        } else {
            console.log('✅ تم إنشاء سجل التاجر');
            
            // إذا كان المسجل مورد، ننشئ له سجل في جدول الموردين
            if (userRole === 'supplier') {
                const { error: supplierError } = await supabase
                    .from('suppliers')
                    .insert({
                        email: userData.email,
                        company_name: userData.fullName,
                        phone: userData.fullPhone,
                        status: 'pending_approval',
                        supplier_type: 'importer'
                    });
                if (supplierError) {
                    console.error('⚠️ خطأ في إنشاء سجل المورد:', supplierError.message);
                } else {
                    console.log('✅ تم إنشاء سجل المورد بنجاح');
                }
            }
        }
        
        // 3. إرسال إشعار إلى الإدارة
        await sendAdminNotification(userData);
        
        // 4. عرض رسالة النجاح الخاصة بطلب التفعيل
        const planIdLower = String(selectedPlanData?.plan || 'basic').toLowerCase();
        const planNameTranslated = tr(`plan_names.${planIdLower}`);
        const planPeriodTranslated = selectedPlanData?.isYearly ? tr('plan_yearly') : tr('plan_monthly');
        const currencyTranslated = tr('currency');
        const roleNameTranslated = tr(`role_${userRole}_name`);

        const successMessage = `
            ${tr('signup_success_title')}
            
            ${tr('account_details')}
            ${tr('name_label')} ${userData.fullName}
            ${tr('email_label')} ${userData.email}
            ${tr('phone_label')} ${userData.fullPhone}
            ${tr('plan_label')} ${planNameTranslated} (${planPeriodTranslated})
            • ${tr('role_selector_label')}: ${roleNameTranslated}
            
            ${tr('account_status')}
            ${tr('contact_notice')}
            ${tr('email_confirmation')}
            ${tr('can_login')}
        `.trim().replace(/\n[ \t]+/g, '\n');
        
        showNotification(successMessage, 'success');
        
        // 5. إرسال بريد ترحيبي
        await sendWelcomeEmail(userData);
        
        // حفظ تفاصيل التسجيل لعرضها في صفحة الترحيب
        const signupDetails = {
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.fullPhone,
            plan: planIdLower,
            price: selectedPlanData?.price || 0,
            isYearly: selectedPlanData?.isYearly || false,
            role: userRole
        };
        localStorage.setItem('lastSignupDetails', JSON.stringify(signupDetails));
        
        // 6. تنظيف localStorage        // إعادة تعيين الزر
        setTimeout(() => {
            localStorage.removeItem('selectedPackageData');
            localStorage.removeItem('selectedPackage');
            localStorage.removeItem('isYearlyBilling');
            document.getElementById('signupForm').reset();
            btn.disabled = false;
            btn.textContent = tr('create_account');
            btn.classList.remove('loading');

            // توجيه المستخدم لصفحة الانتظار (أو تسجيل الدخول)
            setTimeout(() => { window.location.href = 'welcome.html'; }, 6000);
        }, 2000);
        
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        showError(error.message || tr('signup_error'));
        
        const btn = document.getElementById('signupBtn');
        btn.disabled = false;
        btn.textContent = tr('create_account');
        btn.classList.remove('loading');
    }
}

// إرسال إشعار للإدارة
async function sendAdminNotification(userData) {
    try {
        const { error } = await supabase
            .from('admin_notifications')
            .insert({
                type: 'new_signup',
                title: 'تسجيل جديد باقة: ' + (selectedPlanData?.plan || 'basic').toUpperCase(),
                message: `مستخدم جديد: ${userData.fullName} - ${userData.email} | الباقة: ${selectedPlanData?.plan || 'basic'} | السعر: ${selectedPlanData?.price || 0} DA`,
                user_id: null,
                user_email: userData.email,
                user_phone: userData.fullPhone,
                plan: selectedPlanData?.plan || 'basic',
                price: selectedPlanData?.price || 0,
                created_at: new Date().toISOString(),
                is_read: false
            });
        
        if (!error) {
            console.log('✅ تم إرسال إشعار للإدارة');
        } else {
            console.warn('⚠️ خطأ في إرسال إشعار الإدارة:', error.message);
        }
    } catch (error) {
        console.error('❌ خطأ في إرسال إشعار الإدارة:', error);
    }
}

// إرسال بريد ترحيبي (اختياري - يتجاهل إذا فشل)
async function sendWelcomeEmail(userData) {
    try {
        await supabase.functions.invoke('send-welcome-email', {
            body: {
                to: userData.email,
                name: userData.fullName,
                plan: getPlanArabicName(selectedPlanData?.plan || 'basic'),
                price: selectedPlanData?.price || 0,
                period: selectedPlanData?.isYearly ? 'سنوية' : 'شهرية'
            }
        });
        console.log('✅ تم إرسال بريد الترحيب');
    } catch (error) {
        // تجاهل الخطأ - البريد الترحيبي اختياري
        console.warn('⚠️ فشل إرسال بريد الترحيب (غير ضروري):', error.message);
    }
}


// تسجيل الدخول بحساب Google
async function signupWithGoogle() {
    try {
        if (!selectedPlanData) {
            showError(tr('no_plan_selected'));
            return;
        }
        
        // Grab phone number and role if they are filled in the form
        const phoneInput = document.getElementById('phone');
        let phoneVal = null;
        if (phoneInput && phoneInput.value.trim()) {
            phoneVal = '+213' + phoneInput.value.trim();
        }
        
        const userRole = (typeof getSelectedRole === 'function') ? getSelectedRole() : 'retailer';
        
        const googleSignupData = {
            ...selectedPlanData,
            phone: phoneVal,
            role: userRole
        };
        
        // حفظ بيانات الباقة مؤقتًا للاستخدام بعد التسجيل
        localStorage.setItem('pendingGoogleSignup', JSON.stringify(googleSignupData));
        
        const safeOrigin = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${safeOrigin}/auth-callback.html`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) throw error;
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
        showError(tr('google_signup_error'));
    }
}

// معالجة تسجيل الدخول بالبريد
function handleEmailSignup() {
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showError(tr('email_required'));
        document.getElementById('email').focus();
        return;
    }
    
    // التركيز على حقل كلمة المرور
    document.getElementById('password').focus();
}

// العودة للخلف
function goBack(page) {
    window.location.href = page || 'package.html';
}

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحميل بيانات الباقة
    loadSelectedPlan();
    
    // إرسال النموذج
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        if (!selectedPlanData) {
            showError(tr('no_plan_selected'));
            return;
        }
        
        const userData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            phone: document.getElementById('phone').value.trim(),
            fullPhone: '+213' + document.getElementById('phone').value.trim()
        };
        
        await signupUser(userData);
    });
    
    // زر Google
    document.getElementById('googleSignupBtn').addEventListener('click', signupWithGoogle);
    
    // التحقق من كلمة المرور أثناء الكتابة
    document.getElementById('confirmPassword').addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirm = this.value;
        
        if (confirm && password !== confirm) {
            this.style.borderColor = 'var(--danger-red)';
        } else if (confirm) {
            this.style.borderColor = 'var(--neon-green)';
        } else {
            this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    });
    
    // إضافة تلميحات للأدوات
    addTooltips();
});

// إضافة تلميحات للأدوات
function addTooltips() {
    const passwordInput = document.getElementById('password');
    const passwordLabel = document.querySelector('label[for="password"]');
    
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = '❓';
    tooltip.title = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل، وتحتوي على حروف وأرقام';
    
    passwordLabel.appendChild(tooltip);
}

// جعل الدوال متاحة عالمياً
window.goBack = goBack;
window.signupWithGoogle = signupWithGoogle;
window.loadSelectedPlan = loadSelectedPlan;
})();