// js/login.js - نسخة مُصلحة بالكامل

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 تحميل صفحة تسجيل الدخول...');

  // --- التحقق من جلسة موجودة ---
  try {
    const supabase = window.getSupabaseClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const email = session.user?.email?.toLowerCase().trim() || '';
        const ADMIN_EMAILS = ['bourekanis@gmail.com'];
        if (ADMIN_EMAILS.includes(email)) {
          console.log('✅ أدمن — توجيه لـ admin.html');
          window.location.href = 'admin.html';
        } else {
          console.log('👤 تاجر — توجيه لـ dashboard.html');
          window.location.href = 'dashboard.html';
        }
        return;
      }

    }
  } catch (err) {
    console.warn('⚠️ خطأ في فحص الجلسة:', err);
  }

  // --- تسجيل الدخول ---
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) { console.error('❌ loginBtn غير موجود'); return; }

  loginBtn.addEventListener('click', handleLogin);

  // --- إنشاء حساب ---
  document.getElementById('createAccountBtn')?.addEventListener('click', () => {
    window.location.href = 'package.html';
  });

  // --- Google ---
  document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
    const supabase = window.getSupabaseClient();
    if (!supabase) { showMsg('❌ خطأ في الاتصال', 'error'); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-callback.html` }
    });
    if (error) showMsg(error.message, 'error');
  });

  // --- نسيت كلمة المرور ---
  document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('forgotPasswordBox').style.display = 'block';
    clearMsgs();
  });

  document.getElementById('sendResetBtn')?.addEventListener('click', handleResetPassword);

  document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    document.getElementById('forgotPasswordBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
    clearMsgs();
  });

  // --- رجوع ---
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // --- Enter key ---
  ['email', 'password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleLogin();
    });
  });

  document.getElementById('reset-email')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleResetPassword();
  });

  console.log('✅ تهيئة صفحة الدخول اكتملت');
});

// =====================================================
// معالج تسجيل الدخول
// =====================================================
async function handleLogin() {
  const supabase = window.getSupabaseClient();
  if (!supabase) { showMsg('❌ خطأ في الاتصال بقاعدة البيانات', 'error'); return; }

  const loginBtn  = document.getElementById('loginBtn');
  const inputVal  = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;

  if (!inputVal || !password) {
    showMsg('يرجى ملء جميع الحقول', 'error');
    return;
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal);
  const isPhone = /^[\d+]{7,15}$/.test(inputVal.replace(/\s/g, ''));

  if (!isEmail && !isPhone) {
    showMsg('يرجى إدخال بريد إلكتروني أو رقم هاتف صحيح', 'error');
    return;
  }

  // تعطيل الزر
  loginBtn.disabled = true;
  const origText = loginBtn.textContent;
  loginBtn.textContent = '...جاري تسجيل الدخول';

  try {
    let email = inputVal;

    // --- تسجيل الدخول برقم الهاتف ---
    if (!isEmail) {
      const { data: found, error: rpcErr } = await supabase.rpc('get_email_by_phone', { p_phone: inputVal });
      if (rpcErr || !found) {
        showMsg('رقم الهاتف غير مرتبط بأي حساب', 'error');
        return;
      }
      email = found;
    }

    // --- محاولة تسجيل الدخول ---
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      const msgs = {
        'Invalid login credentials':  'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'Email not confirmed':         'يرجى تأكيد بريدك الإلكتروني أولاً (تحقق من صندوق الوارد)',
        'Too many requests':           'محاولات كثيرة جداً، انتظر دقيقة وحاول مرة أخرى',
      };
      throw new Error(msgs[authErr.message] || authErr.message);
    }

    const userId = data.user.id;

    // --- التحقق من حالة الحساب ---
    const { data: userData, error: dbErr } = await supabase
      .from('users')
      .select('account_status, is_active')
      .eq('id', userId)
      .single();

    // إذا لم يجد السجل (مشكلة RLS أو عدم وجود السجل) → يسمح بالدخول مؤقتاً
    if (!dbErr && userData) {
      const status = userData.account_status;
      if (status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('🚫 تم تعليق حسابك. تواصل مع الإدارة.');
      }
      if (status === 'pending_approval') {
        await supabase.auth.signOut();
        throw new Error('⏳ حسابك لا يزال بانتظار موافقة الإدارة على الدفع.');
      }
    }

    // --- نجاح تسجيل الدخول ---
    // ✅ الأدمن يُوجَّه مباشرة لـ admin.html
    const ADMIN_EMAILS = ['bourekanis@gmail.com'];
    const userEmailLower = data.user.email?.toLowerCase().trim() || '';
    if (ADMIN_EMAILS.includes(userEmailLower) || 
        (userData && userData.account_status === 'admin')) {
      showMsg('✅ مرحباً بالأدمن! جاري التوجيه...', 'success');
      setTimeout(() => { window.location.href = 'admin.html'; }, 800);
      return;
    }

    // تحديث آخر دخول (بدون انتظار)
    supabase.from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {});

    showMsg('✅ تم تسجيل الدخول بنجاح!', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);


  } catch (err) {
    console.error('خطأ في الدخول:', err);
    showMsg(err.message || 'حدث خطأ غير متوقع', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = origText;
  }
}

// =====================================================
// معالج نسيت كلمة المرور
// =====================================================
async function handleResetPassword() {
  const supabase = window.getSupabaseClient();
  const sendBtn  = document.getElementById('sendResetBtn');
  const email    = document.getElementById('reset-email')?.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMsg('يرجى إدخال بريد إلكتروني صالح', 'error', 'reset');
    return;
  }

  sendBtn.disabled = true;
  const origText = sendBtn.textContent;
  sendBtn.textContent = '...جاري الإرسال';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    if (error) throw error;

    showMsg('✅ تم الإرسال! تحقق من بريدك الإلكتروني', 'success', 'reset');
    document.getElementById('reset-email').value = '';

    setTimeout(() => {
      document.getElementById('forgotPasswordBox').style.display = 'none';
      document.getElementById('loginBox').style.display = 'block';
      clearMsgs();
    }, 5000);

  } catch (err) {
    const msg = err.message?.includes('rate limit')
      ? 'تجاوزت عدد المحاولات المسموح بها، انتظر قليلاً'
      : (err.message || 'حدث خطأ في الإرسال');
    showMsg(msg, 'error', 'reset');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = origText;
  }
}

// =====================================================
// دوال العرض - مُبسطة وبدون حلقة لا نهائية
// =====================================================
function showMsg(message, type = 'error', section = 'login') {
  const prefix    = section === 'reset' ? 'reset' : '';
  const errId     = prefix ? 'resetErrorMessage'   : 'errorMessage';
  const succId    = prefix ? 'resetSuccessMessage'  : 'successMessage';
  const showId    = type === 'success' ? succId : errId;
  const hideId    = type === 'success' ? errId  : succId;

  const showEl = document.getElementById(showId);
  const hideEl = document.getElementById(hideId);

  if (hideEl) hideEl.style.display = 'none';
  if (showEl) {
    showEl.textContent = message;
    showEl.style.display = 'block';
    setTimeout(() => { showEl.style.display = 'none'; }, 6000);
  }
}

function clearMsgs() {
  ['errorMessage','successMessage','resetErrorMessage','resetSuccessMessage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// --- دوال خارجية (للتوافق مع login-config.js) ---
window.showError   = (msg, type) => showMsg(msg, 'error',   type);
window.showSuccess = (msg, type) => showMsg(msg, 'success', type);
window.clearAllMessages = clearMsgs;
window.goBack = () => { window.location.href = 'index.html'; };