// js/auth-callback.js
// معالجة العودة من Google OAuth - نسخة مُصلحة (V4.1)
// الإصلاح: منع إعادة تعيين بيانات المستخدمين المسجلين مسبقاً
// الإصلاح: تحويل المستخدمين الجدد إلى حالة pending_approval

document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('statusText');
    const errorText  = document.getElementById('errorText');
    const spinner    = document.getElementById('spinner');
    const returnBtn  = document.getElementById('returnBtn');

    const supabase = window.getSupabaseClient();

    function showError(msg) {
        if (spinner)    spinner.style.display    = 'none';
        if (errorText)  { errorText.textContent  = msg; errorText.style.display = 'block'; }
        if (returnBtn)  returnBtn.style.display   = 'inline-block';
        if (statusText) statusText.style.display  = 'none';
        console.error('❌ auth-callback error:', msg);
    }

    function setStatus(msg) {
        if (statusText) statusText.textContent = msg;
        console.log('ℹ️', msg);
    }

    if (!supabase) {
        showError('خطأ في الاتصال بقاعدة البيانات');
        return;
    }

    try {
        setStatus('جاري التحقق من المصادقة...');

        // Supabase v2 يعالج الـ hash تلقائياً عند استدعاء getSession()
        await new Promise(r => setTimeout(r, 800));

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            showError(`خطأ في المصادقة: ${sessionError.message}`);
            return;
        }

        if (!session) {
            const params = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.replace('#', '?').slice(1));
            const errDesc = params.get('error_description') || hashParams.get('error_description');

            if (errDesc) {
                showError(`فشلت المصادقة: ${errDesc}`);
            } else {
                showError('لم يتم الحصول على جلسة. ربما ألغيت تسجيل الدخول.');
            }
            return;
        }

        const user = session.user;
        console.log('✅ جلسة نشطة للمستخدم:', user.email);

        // ─── الخطوة 1: التحقق إن كان المستخدم موجوداً فعلاً في قاعدة البيانات ───
        setStatus('جاري فحص الحساب...');

        const { data: existingUser, error: lookupErr } = await supabase
            .from('users')
            .select('id, account_status, email, selected_plan')
            .eq('id', user.id)
            .maybeSingle();

        // ─── حالة A: مستخدم موجود مسبقاً (تسجيل دخول عادي) ───
        if (existingUser && !lookupErr) {
            console.log('✅ مستخدم موجود مسبقاً - حالة الحساب:', existingUser.account_status);

            // تحديث آخر دخول فقط - بدون المساس بأي بيانات أخرى
            supabase.from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id)
                .then(() => {});

            // التحقق من حالة الحساب قبل التوجيه
            if (existingUser.account_status === 'pending_approval') {
                // الحساب لا يزال معلقاً - توجيه لصفحة الانتظار
                setStatus('حسابك معلق في انتظار موافقة الإدارة...');
                setTimeout(() => { window.location.href = 'welcome.html'; }, 2000);
                return;
            }

            if (existingUser.account_status === 'suspended') {
                showError('تم تعليق حسابك. يرجى التواصل مع الإدارة.');
                return;
            }

            // الحساب نشط - توجيه للوحة التحكم
            setStatus('✅ مرحباً بعودتك! جاري التوجيه للوحة التحكم...');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
            return;
        }

        // ─── حالة B: مستخدم جديد عبر Google (أول تسجيل) ───
        setStatus('جاري إعداد حسابك الجديد...');

        // استرجاع بيانات الباقة المحفوظة قبل انتقال OAuth
        let selectedPlan = { plan: 'basic', price: 0, isYearly: false, phone: null, role: 'retailer' };
        try {
            const saved = localStorage.getItem('pendingGoogleSignup');
            if (saved) selectedPlan = { ...selectedPlan, ...JSON.parse(saved) };
        } catch (e) { /* تجاهل - الباقة الافتراضية ستُستخدم */ }

        const fullName = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email.split('@')[0];

        // ─── إنشاء سجل users بحالة pending_approval ───
        const { error: userInsertErr } = await supabase.from('users').insert({
            id:             user.id,
            email:          user.email,
            full_name:      fullName,
            phone:          selectedPlan.phone || null,
            role:           selectedPlan.role || 'retailer',
            selected_plan:  selectedPlan.plan || 'basic',
            plan_price:     selectedPlan.price || 0,
            billing_period: selectedPlan.isYearly ? 'yearly' : 'monthly',
            account_status: 'pending_approval',   // ← معلق - يحتاج موافقة إدارية
            payment_status: 'pending',
            is_active:      false,
            broker_points:  0,
            created_at:     new Date().toISOString(),
            last_login:     new Date().toISOString()
        });

        if (userInsertErr) {
            console.warn('⚠️ users INSERT failed (RLS?):', userInsertErr.message);
        } else {
            console.log('✅ تم إنشاء سجل المستخدم بحالة pending_approval');
        }

        // ─── توليد Slug فريد للمتجر ───
        const baseSlug = generateStoreSlug(user.email);
        let finalSlug = baseSlug, slugCounter = 0;

        while (slugCounter < 20) {
            const { data: slugCheck } = await supabase
                .from('merchant').select('slug')
                .eq('slug', finalSlug).maybeSingle();
            if (!slugCheck) break;
            slugCounter++;
            finalSlug = `${baseSlug}-${slugCounter}`;
        }

        // ─── إنشاء سجل merchant بحالة pending_approval ───
        const subEnd = new Date();
        subEnd.setDate(subEnd.getDate() + (selectedPlan.isYearly ? 365 : 30));

        const { error: merchantErr } = await supabase.from('merchant').insert({
            email:            user.email,
            name:             fullName,
            slug:             finalSlug,
            package_type:     selectedPlan.plan || 'basic',
            account_status:   'pending_approval',  // ← معلق - يفتح بعد تفعيل الإدارة
            visitor_count:    0,
            manual_sales_stats: 0,
            total_sales:      0,
            is_wholesaler:    selectedPlan.role === 'wholesaler',
            credit_eligible:  false,
            subscription_end: subEnd.toISOString(),
            created_at:       new Date().toISOString(),
            updated_at:       new Date().toISOString()
        });

        if (merchantErr) {
            console.warn('⚠️ merchant INSERT failed:', merchantErr.message);
        } else {
            console.log('✅ تم إنشاء سجل المتجر بحالة pending_approval');
        }

        // ─── إشعار الإدارة بالتسجيل الجديد عبر Google ───
        supabase.from('admin_notifications').insert({
            type:       'new_signup',
            title:      'تسجيل جديد عبر Google - يحتاج تفعيل',
            message:    `مستخدم جديد: ${fullName} (${user.email}) | الباقة: ${selectedPlan.plan || 'basic'}`,
            user_email: user.email,
            plan:       selectedPlan.plan || 'basic',
            price:      selectedPlan.price || 0,
            is_read:    false,
            created_at: new Date().toISOString()
        }).then(() => { console.log('✅ تم إرسال إشعار التسجيل للإدارة'); });

        // ─── تنظيف localStorage ───
        ['pendingGoogleSignup', 'selectedPackageData', 'selectedPackage', 'isYearlyBilling']
            .forEach(k => localStorage.removeItem(k));

        // ─── التوجيه لصفحة الانتظار (كالتسجيل العادي تماماً) ───
        setStatus('🎉 تم إنشاء حسابك! في انتظار موافقة الإدارة...');
        setTimeout(() => { window.location.href = 'welcome.html'; }, 2000);

    } catch (err) {
        console.error('❌ خطأ عام في auth-callback:', err);
        showError(`حدث خطأ: ${err.message || 'خطأ غير متوقع'}`);
    }
});

// --- توليد slug من البريد ---
function generateStoreSlug(email) {
    let base = email.split('@')[0].toLowerCase()
        .replace(/[^a-z0-9\-\.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base.length < 3 ? 'store-' + base : base;
}
