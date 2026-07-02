document.addEventListener('DOMContentLoaded', async () => {
  console.log('🛡️ تحميل صفحة دخول الإدارة...');

  // فحص الجلسة الموجودة
  try {
    const supabase = window.getSupabaseClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // التحقق إن كان أدمن
        const { data: userData } = await supabase
          .from('users')
          .select('account_status, role')
          .eq('id', session.user.id)
          .single();

        if (userData && (userData.role === 'admin' || userData.account_status === 'admin')) {
          window.location.href = 'admin.html';
          return;
        } else {
          // ليس أدمن، طرده
          await supabase.auth.signOut();
        }
      }
    }
  } catch (err) {}

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleAdminLogin);
  }

  ['email', 'password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleAdminLogin();
    });
  });
});

async function handleAdminLogin() {
  const supabase = window.getSupabaseClient();
  if (!supabase) { showMsg('❌ خطأ في الاتصال بقاعدة البيانات'); return; }

  const loginBtn = document.getElementById('loginBtn');
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    showMsg('يرجى ملء جميع الحقول');
    return;
  }

  loginBtn.disabled = true;
  const origText = loginBtn.textContent;
  loginBtn.textContent = '...جاري التحقق';

  try {
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');

    const userId = data.user.id;

    // التحقق من حالة الحساب للتأكد أنه أدمن
    const { data: userData, error: dbErr } = await supabase
      .from('users')
      .select('account_status, role')
      .eq('id', userId)
      .single();

    if (dbErr || !userData || (userData.role !== 'admin' && userData.account_status !== 'admin')) {
      await supabase.auth.signOut();
      throw new Error('🚫 غير مصرح لك بالدخول إلى هذه اللوحة');
    }

    showMsg('✅ تم التحقق، جاري الدخول...', 'success');
    setTimeout(() => { window.location.href = 'admin.html'; }, 1000);

  } catch (err) {
    console.error('Admin Login Error:', err);
    showMsg(err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = origText;
  }
}

function showMsg(message, type = 'error') {
  const errEl = document.getElementById('errorMessage');
  const succEl = document.getElementById('successMessage');
  
  errEl.style.display = 'none';
  succEl.style.display = 'none';

  if (type === 'success') {
    succEl.textContent = message;
    succEl.style.display = 'block';
  } else {
    errEl.textContent = message;
    errEl.style.display = 'block';
  }
}
