// js/config.js
// إعدادات المشروع المركزية

// تفعيل بديل آمن للذاكرة المحلية في حال تم حظرها (مثلاً عند التشغيل كملف محلي مباشرة file://)
(function polyfillLocalStorage() {
    try {
        const testKey = '__test_ls__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
    } catch (e) {
        console.warn('⚠️ الذاكرة المحلية (LocalStorage) محظورة أو غير متاحة (غالباً بسبب تشغيل الصفحة كملف محلي). تفعيل البديل الآمن المؤقت.');
        
        const store = {};
        const fallbackStorage = {
            getItem(key) {
                return store[key] !== undefined ? store[key] : null;
            },
            setItem(key, value) {
                store[key] = String(value);
            },
            removeItem(key) {
                delete store[key];
            },
            clear() {
                for (const key in store) {
                    delete store[key];
                }
            },
            key(index) {
                const keys = Object.keys(store);
                return keys[index] || null;
            },
            get length() {
                return Object.keys(store).length;
            }
        };
        
        try {
            Object.defineProperty(window, 'localStorage', {
                value: fallbackStorage,
                writable: true,
                configurable: true
            });
        } catch (err) {
            console.error('❌ فشل تعيين البديل للذاكرة المحلية:', err);
        }
    }
})();

const CONFIG = {
    SUPABASE_URL: 'https://njiqxzueixpfluldcvtf.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaXF4enVlaXhwZmx1bGRjdnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjU2MzUsImV4cCI6MjA5MzE0MTYzNX0.JX-kb50B5yoMoUNAKmHioe4XCeXM_BpN7KgXp2Jnb5k'
};

let supabaseClientInstance = null;

// دالة مركزية للحصول على عميل Supabase
function getSupabaseClient() {
    if (supabaseClientInstance) {
        return supabaseClientInstance;
    }

    if (typeof window.supabase === 'undefined') {
        console.error('❌ مكتبة Supabase غير محملة');
        return null;
    }

    try {
        supabaseClientInstance = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        console.log('✅ تم تهيئة اتصال Supabase المركزي');
        return supabaseClientInstance;
    } catch (error) {
        console.error('❌ خطأ في تهيئة Supabase:', error);
        return null;
    }
}

// جعل الإعدادات متاحة عالمياً
window.AppConfig = CONFIG;
window.getSupabaseClient = getSupabaseClient;

