// js/auth.js
// نظام المصادقة والصلاحيات المركزي

// ================================
// 🔧 التهيئة والإعداد
// ================================

// تأكد من تحميل Supabase
// NOTE: تم تغيير اسم المتغير من 'supabase' إلى 'supabaseAuth' لتفادي
// التضارب مع كائن window.supabase الذي يتم حقنه من مكتبة Supabase CDN
let supabaseAuth = null;

function initAuth() {
    try {
        supabaseAuth = window.getSupabaseClient();
        if (!supabaseAuth) return false;
        
        console.log('✅ تم تهيئة نظام المصادقة');
        return true;
    } catch (error) {
        console.error('❌ خطأ في تهيئة نظام المصادقة:', error);
        return false;
    }
}

// ================================
// 👤 وظائف المستخدم الأساسية
// ================================

/**
 * التحقق من حالة تسجيل الدخول الحالية
 * @returns {Promise<Object|null>} بيانات الجلسة أو null
 */
async function getCurrentSession() {
    try {
        if (!supabaseAuth) initAuth();
        
        const { data, error } = await supabaseAuth.auth.getSession();
        
        if (error) {
            console.error('❌ خطأ في جلب الجلسة:', error);
            return null;
        }
        
        return data.session;
    } catch (error) {
        console.error('❌ خطأ غير متوقع:', error);
        return null;
    }
}

/**
 * الحصول على بيانات المستخدم الحالي
 * @returns {Promise<Object|null>} بيانات المستخدم
 */
async function getCurrentUser() {
    try {
        const session = await getCurrentSession();
        
        if (!session) return null;
        
        // جلب بيانات إضافية من جدول users
        const { data: userData, error } = await supabaseAuth
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (error) {
            console.warn('⚠️ لم يتم العثور على بيانات إضافية للمستخدم:', error.message);
            return { ...session.user, role: 'user', approved: false };
        }
        
        return {
            ...session.user,
            ...userData,
            fullData: userData
        };
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        return null;
    }
}

/**
 * تسجيل الدخول بالبريد وكلمة المرور
 * @param {string} email البريد الإلكتروني
 * @param {string} password كلمة المرور
 * @returns {Promise<Object>} نتيجة التسجيل
 */
async function loginWithEmail(email, password) {
    try {
        if (!supabaseAuth) initAuth();
        
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        if (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            return { success: false, error: error.message };
        }
        
        // تحديث آخر تسجيل دخول
        await updateLastLogin(data.user.id);
        
        console.log('✅ تم تسجيل الدخول بنجاح');
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ خطأ غير متوقع في تسجيل الدخول:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

/**
 * تسجيل الدخول برقم الهاتف وكلمة المرور
 * @param {string} phone رقم الهاتف
 * @param {string} password كلمة المرور
 * @returns {Promise<Object>} نتيجة التسجيل
 */
async function loginWithPhone(phone, password) {
    try {
        if (!supabaseAuth) initAuth();
        
        const { data: email, error: rpcError } = await supabaseAuth.rpc('get_email_by_phone', { p_phone: phone });
        
        if (rpcError) {
            console.error('❌ خطأ في البحث عن رقم الهاتف:', rpcError);
            return { success: false, error: 'حدث خطأ أثناء البحث عن الحساب' };
        }
        
        if (!email) {
            return { success: false, error: 'رقم الهاتف غير مسجل أو غير صحيح' };
        }
        
        return await loginWithEmail(email, password);
    } catch (error) {
        console.error('❌ خطأ غير متوقع في تسجيل الدخول بالرقم:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

/**
 * تسجيل الدخول بحساب Google
 * @returns {Promise<Object>} نتيجة التسجيل
 */
async function loginWithGoogle() {
    try {
        if (!supabaseAuth) initAuth();
        
        const { data, error } = await supabaseAuth.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth-callback.html`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) {
            console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ خطأ غير متوقع في تسجيل الدخول بـ Google:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

/**
 * تسجيل الخروج
 * @returns {Promise<Object>} نتيجة تسجيل الخروج
 */
async function logout() {
    try {
        if (!supabaseAuth) initAuth();
        
        const { error } = await supabaseAuth.auth.signOut();
        
        if (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            return { success: false, error: error.message };
        }
        
        clearLocalStorage();
        
        console.log('✅ تم تسجيل الخروج بنجاح');
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ غير متوقع في تسجيل الخروج:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

// ================================
// 🔐 إدارة كلمة المرور
// ================================

async function resetPassword(email) {
    try {
        if (!supabaseAuth) initAuth();
        
        const { error } = await supabaseAuth.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/reset-password.html` }
        );
        
        if (error) {
            console.error('❌ خطأ في إرسال رابط إعادة التعيين:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ تم إرسال رابط إعادة التعيين');
        return { success: true };
    } catch (error) {
        console.error('❌ خطأ غير متوقع:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

async function updatePassword(newPassword) {
    try {
        if (!supabaseAuth) initAuth();
        
        const { data, error } = await supabaseAuth.auth.updateUser({ password: newPassword });
        
        if (error) {
            console.error('❌ خطأ في تحديث كلمة المرور:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ تم تحديث كلمة المرور');
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ خطأ غير متوقع:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

// ================================
// 🛡️ حماية الصفحات والصلاحيات
// ================================

async function protectPage(redirectTo = 'login.html') {
    const session = await getCurrentSession();
    
    if (!session) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = redirectTo;
        return false;
    }
    
    return true;
}

async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.role === 'admin' || 
           user.user_metadata?.role === 'admin' ||
           user.fullData?.role === 'admin';
}

async function protectAdminPage() {
    const isAuthenticated = await protectPage('login.html');
    if (!isAuthenticated) return false;
    
    const adminCheck = await isAdmin();
    
    if (!adminCheck) {
        showNotification('⚠️ ليس لديك صلاحيات للوصول لهذه الصفحة', 'error');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
        return false;
    }
    
    return true;
}

async function isAccountApproved() {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.approved === true || 
           user.user_metadata?.approved === true ||
           user.fullData?.account_status === 'active' ||
           user.fullData?.approved === true;
}

// ================================
// 💾 التخزين المحلي والذاكرة
// ================================

function saveUserToLocalStorage(userData) {
    try {
        localStorage.setItem('currentUser', JSON.stringify({
            id: userData.id,
            email: userData.email,
            name: userData.user_metadata?.full_name || userData.fullData?.full_name,
            role: userData.role || userData.user_metadata?.role || 'user',
            avatar: userData.user_metadata?.avatar_url,
            lastLogin: new Date().toISOString()
        }));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userId', userData.id);
    } catch (error) {
        console.error('❌ خطأ في حفظ بيانات المستخدم:', error);
    }
}

function getUserFromLocalStorage() {
    try {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', error);
        return null;
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('redirectAfterLogin');
        
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('user_') || key.startsWith('auth_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.error('❌ خطأ في مسح التخزين:', error);
    }
}

async function updateLastLogin(userId) {
    try {
        if (!supabaseAuth) return;
        const { data: currentData } = await supabaseAuth
            .from('users')
            .select('login_count')
            .eq('id', userId)
            .single();

        await supabaseAuth
            .from('users')
            .update({ 
                last_login: new Date().toISOString(),
                login_count: (currentData?.login_count || 0) + 1
            })
            .eq('id', userId);
    } catch (error) {
        console.warn('⚠️ لم يتم تحديث آخر تسجيل دخول:', error.message);
    }
}

// ================================
// 📱 الاستماع لتغيرات حالة المصادقة
// ================================

function setupAuthListener() {
    if (!supabaseAuth) initAuth();
    if (!supabaseAuth) return;
    
    supabaseAuth.auth.onAuthStateChange((event, session) => {
        console.log(`🔐 حدث مصادقة: ${event}`, session ? 'جلسة نشطة' : 'لا توجد جلسة');
        
        switch (event) {
            case 'SIGNED_IN':
                if (session) {
                    saveUserToLocalStorage(session.user);
                    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                    if (redirectUrl && redirectUrl !== window.location.pathname) {
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirectUrl;
                    }
                }
                break;
            case 'SIGNED_OUT':
                clearLocalStorage();
                break;
            case 'TOKEN_REFRESHED':
                console.log('✅ تم تحديث التوكن');
                break;
            case 'USER_UPDATED':
                if (session) saveUserToLocalStorage(session.user);
                break;
        }
    });
}

// ================================
// 📊 وظائف المساعدة والإشعارات
// ================================

function showNotification(message, type = 'info') {
    const colors = {
        success: '#00ffc3',
        error: '#ff4757',
        warning: '#ffa502',
        info: '#2ed573'
    };
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: ${type === 'success' || type === 'warning' ? '#000' : '#fff'};
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 9999;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: inherit;
            font-size: 14px;
        `;
        notification.textContent = message;
        notification.id = 'auth-notification';
        
        const oldNotification = document.getElementById('auth-notification');
        if (oldNotification) oldNotification.remove();
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 5000);
    }
}

// ================================
// 🚀 التهيئة التلقائية
// ================================

(function initialize() {
    console.log('🔐 تحميل نظام المصادقة...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAuth();
            setupAuthListener();
        });
    } else {
        initAuth();
        setupAuthListener();
    }
})();

// ================================
// 📤 التصدير للاستخدام العالمي
// ================================

window.AuthManager = {
    init: initAuth,
    getSession: getCurrentSession,
    getUser: getCurrentUser,
    loginEmail: loginWithEmail,
    loginPhone: loginWithPhone,
    loginGoogle: loginWithGoogle,
    logout: logout,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    protectPage: protectPage,
    protectAdminPage: protectAdminPage,
    isAdmin: isAdmin,
    isApproved: isAccountApproved,
    getLocalUser: getUserFromLocalStorage,
    clearStorage: clearLocalStorage,
    showNotification: showNotification,
    supabase: () => supabaseAuth
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AuthManager;
}

console.log('✅ نظام المصادقة جاهز للاستخدام');