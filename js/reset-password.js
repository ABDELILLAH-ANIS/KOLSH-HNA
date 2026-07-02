// js/reset-password.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 تحميل صفحة إعادة تعيين كلمة المرور...');
    
    // التحقق من وجود توكن إعادة التعيين في الرابط
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    // Supabase يرسل التوكن في hash fragment (مثال: #access_token=...&type=recovery)
    // أو في الرابط نفسه
    const type = hashParams.get('type') || queryParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    if (type === 'recovery' || accessToken) {
        console.log('✅ تم العثور على توكن الاسترداد');
        // يمكننا السماح للمستخدم بتغيير كلمة المرور الآن
    } else {
        // التحقق مما إذا كان المستخدم لديه جلسة نشطة (تم تسجيل دخوله للتو بواسطة الرابط)
        const session = await AuthManager.getSession();
        if (!session) {
            console.warn('⚠️ رابط غير صالح أو منتهي الصلاحية');
            showError('رابط إعادة التعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.');
            document.getElementById('updatePasswordBtn').disabled = true;
        }
    }
    
    const updateBtn = document.getElementById('updatePasswordBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', handlePasswordUpdate);
    }
    
    // تفعيل الإدخال بـ Enter
    document.getElementById('confirm-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePasswordUpdate();
    });
});

async function handlePasswordUpdate() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const btn = document.getElementById('updatePasswordBtn');
    
    // إخفاء الرسائل السابقة
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    // التحقق من المدخلات
    if (!newPassword || !confirmPassword) {
        showError('يرجى ملء جميع الحقول');
        return;
    }
    
    if (newPassword.length < 6) {
        showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('كلمات المرور غير متطابقة');
        return;
    }
    
    // تغيير حالة الزر
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'جاري التحديث...';
    
    try {
        const result = await AuthManager.updatePassword(newPassword);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // نجاح التحديث
        showSuccess('✅ تم تحديث كلمة المرور بنجاح!');
        
        // تفريغ الحقول
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        // توجيه لصفحة تسجيل الدخول بعد 3 ثواني
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        console.error('❌ خطأ في تحديث كلمة المرور:', error);
        showError(error.message || 'حدث خطأ أثناء تحديث كلمة المرور');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // إخفاء رسالة النجاح إن وجدت
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // إخفاء رسالة الخطأ إن وجدت
    document.getElementById('errorMessage').style.display = 'none';
}
