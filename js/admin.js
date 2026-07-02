/**
 * js/admin.js - Kolch Hna SuperAdmin V4.9
 * REBUILT: تم إعادة البناء الكامل لإصلاح تضارب متغير supabase مع CDN
 * المتغير المحلي أُعيد تسميته إلى supabaseAdmin
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE - كل المتغيرات العالمية المحلية بدون تضارب مع CDN
// ═══════════════════════════════════════════════════════════════
// NOTE: اسم المتغير 'supabaseAdmin' بدلاً من 'supabase' لتجنب
// التضارب مع window.supabase الذي يُحقنه Supabase CDN
let supabaseAdmin = null;
let adminUser = null;
let adminEmail = '';
let allUsers = [];
let allStores = [];
let allProducts = [];
let allNotifications = [];
let allTickets = [];
let allRealEstateListings = [];
let revenueChartInstance = null;
let currentTicketId = null;
let currentRealEstateId = null;
const ALGERIA_WILAYAS = [
    'أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار',
    'البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو',
    'الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس',
    'عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر',
    'ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف',
    'تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة',
    'عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون',
    'برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام',
    'تقرت','جانت','المغير','المنيعة'
];

// ═══════════════════════════════════════════════════════════════
// HELPERS - وظائف مساعدة أساسية
// ═══════════════════════════════════════════════════════════════

function redirect(url) {
    window.location.href = url;
}

function safeEl(id) {
    return document.getElementById(id);
}

function getWilayaName(w) {
    if (!w) return '—';
    const idx = parseInt(w);
    if (!isNaN(idx) && idx >= 1 && idx <= ALGERIA_WILAYAS.length) {
        return `${idx} - ${ALGERIA_WILAYAS[idx - 1]}`;
    }
    return w;
}

function showToast(message, type = 'info', duration = 4000) {
    const container = safeEl('adminToastContainer');
    if (!container) { console.log(`[Toast] ${type}: ${message}`); return; }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

function showLoading(sectionId) {
    const section = safeEl(sectionId);
    if (!section) return;
    const existing = section.querySelector('.admin-loading');
    if (!existing) {
        const div = document.createElement('div');
        div.className = 'admin-loading';
        div.innerHTML = '<div class="loading-spinner"></div><p>جاري التحميل...</p>';
        section.appendChild(div);
    }
}

function hideLoading(sectionId) {
    const section = safeEl(sectionId);
    if (!section) return;
    const el = section.querySelector('.admin-loading');
    if (el) el.remove();
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('ar-DZ', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch { return dateStr; }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openWhatsApp(phone, message = '') {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const full = cleanPhone.startsWith('0') ? '213' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

async function logAudit(action, details = {}) {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('audit_logs').insert({
            admin_id: adminUser?.id || null,
            admin_email: adminEmail,
            action,
            details: JSON.stringify(details),
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('[Audit] Could not log:', e.message);
    }
}

function updateBadge(badgeId, count) {
    const badge = safeEl(badgeId);
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Admin] 🚀 تهيئة لوحة الإدارة V4.9...');
    
    supabaseAdmin = window.getSupabaseClient ? window.getSupabaseClient() : null;
    
    if (!supabaseAdmin) {
        console.error('[Admin] ❌ Supabase client unavailable');
        redirect('login_admin.html');
        return;
    }

    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
        
        if (authError || !user) {
            console.warn('[Admin] ❌ Not authenticated:', authError?.message);
            redirect('login_admin.html');
            return;
        }

        console.log('[Admin] ✅ المستخدم موثق:', user.email);

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email, account_status, role, phone')
            .eq('id', user.id)
            .single();

        if (userError) console.warn('[Admin] User fetch warning:', userError.message);

        if (!userData || (userData.role !== 'admin' && userData.account_status !== 'admin')) {
            console.warn('[Admin] ❌ ليس مشرفاً. الحالة:', userData?.account_status, 'الدور:', userData?.role);
            redirect('login_admin.html');
            return;
        }

        adminUser = { ...userData, auth_id: user.id };
        adminEmail = userData.email || user.email;

        // تعبئة بيانات المشرف في الشريط الجانبي
        const nameEl = safeEl('adminName');
        if (nameEl) nameEl.textContent = userData.full_name || 'Admin';
        const avatarEl = safeEl('adminAvatar');
        if (avatarEl) avatarEl.textContent = (userData.full_name || 'A').charAt(0).toUpperCase();

        // إخفاء شاشة التحميل
        const loader = safeEl('adminLoader');
        if (loader) loader.classList.add('hidden');

        // تحميل البيانات الأولية
        await loadOverview();
        await loadBadgeCounts();

        console.log('[Admin] ✅ لوحة الإدارة جاهزة.');
    } catch (err) {
        console.error('[Admin] ❌ خطأ في التهيئة:', err);
        showToast('حدث خطأ في تهيئة لوحة الإدارة', 'error');
        const loader = safeEl('adminLoader');
        if (loader) loader.classList.add('hidden');
    }
});

// ═══════════════════════════════════════════════════════════════
// NAVIGATION - نظام التنقل بين الأقسام
// ═══════════════════════════════════════════════════════════════

function switchSection(sectionId) {
    console.log('[Nav] التبديل إلى القسم:', sectionId);
    
    // إخفاء كل الأقسام
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    // إلغاء تنشيط كل أزرار القائمة
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // تنشيط القسم المطلوب
    const targetSection = safeEl(`sec-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`[Nav] ⚠️ القسم sec-${sectionId} غير موجود في HTML`);
        showToast(`القسم '${sectionId}' قيد التطوير`, 'warning');
        // إعادة تنشيط القسم overview كـ fallback
        const fallback = safeEl('sec-overview');
        if (fallback) fallback.classList.add('active');
    }
    
    // تنشيط زر القائمة المقابل
    const navBtn = safeEl(`nav-${sectionId}`);
    if (navBtn) navBtn.classList.add('active');
    
    // تحميل بيانات القسم
    switch (sectionId) {
        case 'overview':         loadOverview(); break;
        case 'pending':          loadPendingActivations(); break;
        case 'users':            loadUsers(); break;
        case 'stores':           loadStores(); break;
        case 'products':         loadProducts(); break;
        case 'notifications':    loadNotifications(); break;
        case 'helpdesk':         loadHelpdesk(); break;
        case 'upgrade-requests': loadUpgradeRequests(); break;
        case 'broadcast':        loadBroadcast(); break;
        case 'ads':              loadAds(); loadAdDesignRequests(); break;
        case 'realestate':       loadRealEstate(); break;
        case 'announcements':    loadAnnouncements(); break;
        case 'themes':           loadThemes(); break;
        case 'audit':            loadAuditLog(); break;
        case 'dcb':              loadDCB(); break;
        case 'dummydata':        loadDummyDataUI(); break;
        default:
            console.warn('[Nav] لا يوجد loader لـ:', sectionId);
    }
    
    // إغلاق الشريط الجانبي في الموبايل
    const sidebar = safeEl('sidebar');
    if (sidebar && window.innerWidth < 768) {
        sidebar.classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = safeEl('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

async function adminLogout() {
    try {
        if (supabaseAdmin) await supabaseAdmin.auth.signOut();
        redirect('login_admin.html');
    } catch (e) {
        redirect('login_admin.html');
    }
}

function adminSwitchPackage() {
    showToast('يمكنك معاينة الباقات من صفحة الاشتراكات', 'info');
    window.open('package.html', '_blank');
}

// ═══════════════════════════════════════════════════════════════
// BADGE COUNTS - عدادات الإشعارات في القائمة الجانبية
// ═══════════════════════════════════════════════════════════════

async function loadBadgeCounts() {
    if (!supabaseAdmin) return;
    try {
        const [pendingRes, helpdeskRes, upgradeRes, adsRes] = await Promise.allSettled([
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_approval'),
            supabaseAdmin.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
            supabaseAdmin.from('upgrade_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabaseAdmin.from('merchant').select('id', { count: 'exact', head: true }).eq('ad_status', 'pending_design')
        ]);
        
        if (pendingRes.status === 'fulfilled' && !pendingRes.value.error)
            updateBadge('pendingBadge', pendingRes.value.count || 0);
        if (helpdeskRes.status === 'fulfilled' && !helpdeskRes.value.error)
            updateBadge('helpdeskBadge', helpdeskRes.value.count || 0);
        if (upgradeRes.status === 'fulfilled' && !upgradeRes.value.error)
            updateBadge('upgradeBadge', upgradeRes.value.count || 0);
        if (adsRes.status === 'fulfilled' && !adsRes.value.error)
            updateBadge('adsBadge', adsRes.value.count || 0);
    } catch (e) {
        console.warn('[Badges] Error:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: OVERVIEW - لوحة الإحصائيات
// ═══════════════════════════════════════════════════════════════

async function loadOverview() {
    if (!supabaseAdmin) return;
    console.log('[Overview] جاري التحميل...');
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        const [totalUsersRes, newSignupsRes, totalStoresRes, pendingRes, 
               productsRes, ticketsRes, realEstateRes] = await Promise.allSettled([
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
            supabaseAdmin.from('merchant').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('account_status', 'pending_approval'),
            supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
            supabaseAdmin.from('real_estate_listings').select('id', { count: 'exact', head: true })
        ]);
        
        const get = (res) => (res.status === 'fulfilled' && !res.value?.error) ? (res.value?.count || 0) : 0;

        const kpis = {
            kpiTotalUsers: get(totalUsersRes),
            kpiNewSignups: `+${get(newSignupsRes)} اليوم`,
            kpiTotalStores: get(totalStoresRes),
            kpiPendingCount: get(pendingRes),
            kpiProducts: get(productsRes),
            kpiOpenTickets: get(ticketsRes),
            kpiRealEstate: get(realEstateRes)
        };
        
        Object.entries(kpis).forEach(([id, val]) => {
            const el = safeEl(id);
            if (el) el.textContent = val;
        });

        // تحميل الرسم البياني
        await loadRevenueChart();
        
        // تحميل آخر الأنشطة
        await loadRecentActivities();
        
    } catch (e) {
        console.error('[Overview] خطأ:', e);
    }
}

async function loadRevenueChart() {
    const ctx = safeEl('revenueChart');
    if (!ctx || !window.Chart) return;
    
    try {
        if (revenueChartInstance) {
            revenueChartInstance.destroy();
            revenueChartInstance = null;
        }
        
        // جمع بيانات التسجيل خلال آخر 7 أيام
        const dates = [];
        const counts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);
            
            dates.push(d.toLocaleDateString('ar-DZ', { weekday: 'short', day: 'numeric' }));
            
            const { count } = await supabaseAdmin
                .from('users')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', d.toISOString())
                .lt('created_at', nextD.toISOString());
            
            counts.push(count || 0);
        }
        
        revenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'التسجيلات اليومية',
                    data: counts,
                    borderColor: '#00ffc3',
                    backgroundColor: 'rgba(0,255,195,0.12)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00ffc3',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#c9d1d9', font: { size: 12 } } } },
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8b949e', precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    } catch (e) {
        console.warn('[Chart] خطأ في الرسم البياني:', e.message);
    }
}

async function loadRecentActivities() {
    const container = safeEl('recentActivities');
    if (!container) return;
    
    try {
        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error || !data?.length) {
            container.innerHTML = '<p class="empty-state">لا توجد أنشطة حديثة</p>';
            return;
        }
        
        container.innerHTML = data.map(log => `
            <div class="activity-item">
                <div class="activity-icon"><i class="fas fa-history"></i></div>
                <div class="activity-body">
                    <strong>${escapeHtml(log.action)}</strong>
                    <span>${escapeHtml(log.admin_email || '—')}</span>
                </div>
                <span class="activity-time">${formatDate(log.created_at)}</span>
            </div>
        `).join('');
    } catch (e) {
        console.warn('[Activities] خطأ:', e.message);
        container.innerHTML = '<p class="empty-state">تعذر تحميل الأنشطة</p>';
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: PENDING ACTIVATIONS - طلبات التفعيل
// ═══════════════════════════════════════════════════════════════

async function loadPendingActivations() {
    // HTML uses <tbody> inside table#pendingTable - we find the tbody
    const table = safeEl('pendingTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) { console.warn('[Pending] tbody not found in #pendingTable'); return; }
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><div class="loading-spinner"></div> جاري التحميل...</td></tr>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email, phone, selected_plan, created_at, wilaya, whatsapp')
            .eq('account_status', 'pending_approval')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const formattedData = (data || []).map(u => ({
            ...u,
            package_type: u.selected_plan
        }));
        
        if (!formattedData.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">لا توجد طلبات تفعيل معلقة ✅</td></tr>';
            updateBadge('pendingBadge', 0);
            return;
        }
        
        updateBadge('pendingBadge', formattedData.length);
        
        tbody.innerHTML = formattedData.map(user => `
            <tr id="pending-row-${user.id}">
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-sm">${(user.full_name || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="user-name">${escapeHtml(user.full_name || '—')}</div>
                            <div class="user-email">${escapeHtml(user.email || '—')}</div>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.phone || '—')}</td>
                <td>${escapeHtml(getWilayaName(user.wilaya))}</td>
                <td><span class="package-badge package-${user.package_type || 'free'}">${escapeHtml(user.package_type || 'مجاني')}</span></td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <div class="action-btns">
                        <button type="button" class="btn-approve" onclick="activateUser('${user.id}', '${escapeHtml(user.full_name || '')}', '${escapeHtml(user.email || '')}')"> 
                            <i class="fas fa-check"></i> تفعيل
                        </button>
                        <button type="button" class="btn-reject" onclick="rejectUser('${user.id}', '${escapeHtml(user.full_name || '')}')">
                            <i class="fas fa-times"></i> رفض
                        </button>
                        <button type="button" class="btn-whatsapp" onclick="openWhatsApp('${escapeHtml(user.whatsapp || user.phone || '')}', 'مرحباً ${escapeHtml(user.full_name || '')}، تم قبول طلب تفعيل حسابك في منصة كلش هنا')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('[Pending] خطأ:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-row">خطأ في التحميل: ${escapeHtml(e.message)}</td></tr>`;
    }
}

async function activateUser(userId, userName, userEmail) {
    if (!confirm(`تفعيل حساب ${userName}؟`)) return;
    try {
        // 1. تحديث حالة المستخدم في جدول users
        const { error: userErr } = await supabaseAdmin
            .from('users')
            .update({ account_status: 'active', is_active: true })
            .eq('id', userId);
        
        if (userErr) throw userErr;
        
        // 2. تحديث حالة المتجر في جدول merchant (إن توفر البريد)
        if (userEmail) {
            const { error: merchantErr } = await supabaseAdmin
                .from('merchant')
                .update({ account_status: 'active' })
                .eq('email', userEmail);
            if (merchantErr) {
                console.warn('[Activate] فشل تحديث merchant:', merchantErr.message);
            }
        }
        
        await logAudit('تفعيل مستخدم', { userId, userName, userEmail });
        showToast(`✅ تم تفعيل ${userName} وفتح صلاحيات متجره`, 'success');
        
        const row = safeEl(`pending-row-${userId}`);
        if (row) row.remove();
        
        await loadBadgeCounts();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function rejectUser(userId, userName) {
    if (!confirm(`رفض حساب ${userName}؟ سيتم حذف الحساب.`)) return;
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({ account_status: 'rejected' })
            .eq('id', userId);
        
        if (error) throw error;
        
        await logAudit('رفض مستخدم', { userId, userName });
        showToast(`تم رفض ${userName}`, 'warning');
        
        const row = safeEl(`pending-row-${userId}`);
        if (row) row.remove();
        
        await loadBadgeCounts();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: USERS - إدارة المستخدمين
// ═══════════════════════════════════════════════════════════════

let usersSearchTimer = null;

async function loadUsers(searchTerm = '', statusFilter = 'all') {
    const table = safeEl('usersTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) { console.warn('[Users] tbody not found in #usersTable'); return; }
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><div class="loading-spinner"></div> جاري التحميل...</td></tr>';
    
    try {
        let query = supabaseAdmin
            .from('users')
            .select('id, full_name, email, phone, selected_plan, account_status, created_at, wilaya, login_count, whatsapp, payment_status, merchant:merchant!email(badge, is_featured, subscription_end)')
            .order('created_at', { ascending: false });
        
        if (statusFilter && statusFilter !== 'all') query = query.eq('account_status', statusFilter);
        if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        
        const { data, error } = await query.limit(200);
        if (error) throw error;
        
        allUsers = (data || []).map(u => ({
            ...u,
            package_type: u.selected_plan
        }));
        renderUsersTable(allUsers);
    } catch (e) {
        console.error('[Users] خطأ:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-row">خطأ: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function renderUsersTable(users) {
    const table = safeEl('usersTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) return;
    
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">لا يوجد مستخدمون</td></tr>';
        return;
    }
    
    const statusMap = {
        'active': '<span class="status-badge status-active">نشط</span>',
        'pending': '<span class="status-badge status-pending">معلق</span>',
        'admin': '<span class="status-badge status-admin">مشرف</span>',
        'rejected': '<span class="status-badge status-rejected">مرفوض</span>',
        'suspended': '<span class="status-badge status-suspended">موقوف</span>'
    };
    
    tbody.innerHTML = users.map(user => `
        <tr id="user-row-${user.id}">
            <td>
                <div class="user-info-cell">
                    <div class="user-avatar-sm">${(user.full_name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="user-name">${escapeHtml(user.full_name || '—')}</div>
                        <div class="user-email">${escapeHtml(user.email || '—')}</div>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(user.phone || '—')}</td>
            <td>${escapeHtml(getWilayaName(user.wilaya))}</td>
            <td><span class="package-badge package-${user.package_type || 'free'}">${escapeHtml(user.package_type || 'مجاني')}</span></td>
            <td>${statusMap[user.account_status] || user.account_status}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button type="button" class="btn-icon btn-edit" onclick="openEditUser('${user.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon btn-whatsapp" onclick="openWhatsApp('${escapeHtml(user.whatsapp || user.phone || '')}')" title="واتساب">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button type="button" class="btn-icon btn-danger" onclick="suspendUser('${user.id}', '${escapeHtml(user.full_name || '')}')" title="تعليق">
                        <i class="fas fa-ban"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function searchUsers() {
    clearTimeout(usersSearchTimer);
    const term = (safeEl('userSearch')?.value || '').trim();
    const status = safeEl('userStatusFilter')?.value || 'all';
    usersSearchTimer = setTimeout(() => loadUsers(term, status), 400);
}

function filterUsers() {
    const term = (safeEl('userSearch')?.value || '').trim();
    const status = safeEl('userStatusFilter')?.value || 'all';
    loadUsers(term, status);
}

async function openEditUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) { showToast('المستخدم غير موجود', 'error'); return; }
    
    const merchantObj = Array.isArray(user.merchant) ? user.merchant[0] : user.merchant;
    
    const fields = {
        'editUserId': user.id,
        'editUserEmail': user.email || '',
        'editUserName': user.full_name || '',
        'editUserPlan': user.package_type || 'basic',
        'editUserStatus': user.account_status || 'pending',
        'editPaymentStatus': user.payment_status || 'pending',
        'editStoreBadge': merchantObj?.badge || ''
    };
    
    Object.entries(fields).forEach(([id, val]) => {
        const el = safeEl(id);
        if (el) el.value = val;
    });
    
    const checkEl = safeEl('editIsFeatured');
    if (checkEl) checkEl.checked = !!merchantObj?.is_featured;

    // Load subscription end date
    let subEndStr = '';
    if (merchantObj?.subscription_end) {
        const date = new Date(merchantObj.subscription_end);
        const pad = n => String(n).padStart(2, '0');
        subEndStr = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    const subEndEl = safeEl('editSubscriptionEnd');
    if (subEndEl) subEndEl.value = subEndStr;
    
    openModal('editUserModal');
}

async function saveUserEdit() {
    const userId = safeEl('editUserId')?.value;
    if (!userId) return;
    
    const email = safeEl('editUserEmail')?.value;
    const selectedPlan = safeEl('editUserPlan')?.value;
    const accountStatus = safeEl('editUserStatus')?.value;
    const paymentStatus = safeEl('editPaymentStatus')?.value;
    const storeBadge = safeEl('editStoreBadge')?.value || null;
    const isFeatured = safeEl('editIsFeatured')?.checked || false;
    const subEndVal = safeEl('editSubscriptionEnd')?.value;
    const subscriptionEnd = subEndVal ? new Date(subEndVal).toISOString() : null;

    const userUpdates = {
        full_name: safeEl('editUserName')?.value?.trim(),
        selected_plan: selectedPlan,
        account_status: accountStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
    };
    
    try {
        const { error: userErr } = await supabaseAdmin.from('users').update(userUpdates).eq('id', userId);
        if (userErr) throw userErr;
        
        if (email) {
            const merchantUpdates = {
                package_type: selectedPlan,
                badge: storeBadge,
                is_featured: isFeatured,
                subscription_end: subscriptionEnd,
                updated_at: new Date().toISOString()
            };
            if (accountStatus === 'active' || accountStatus === 'suspended') {
                merchantUpdates.account_status = accountStatus;
            }
            await supabaseAdmin.from('merchant').update(merchantUpdates).eq('email', email);
        }
        
        await logAudit('تعديل مستخدم ومتجر', { userId, email, userUpdates });
        showToast('✅ تم حفظ التعديلات بنجاح', 'success');
        closeAllAdminModals();
        await loadUsers();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function suspendUser(userId, userName) {
    if (!confirm(`تعليق حساب ${userName}؟`)) return;
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({ account_status: 'suspended' })
            .eq('id', userId);
        if (error) throw error;
        
        await logAudit('تعليق مستخدم', { userId, userName });
        showToast(`تم تعليق ${userName}`, 'warning');
        await loadUsers();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: STORES - إدارة المتاجر
// ═══════════════════════════════════════════════════════════════

async function loadStores(searchTerm = '') {
    const table = safeEl('storesTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) { console.warn('[Stores] tbody not found in #storesTable'); return; }
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><div class="loading-spinner"></div> جاري التحميل...</td></tr>';
    
    try {
        let query = supabaseAdmin
            .from('merchant')
            .select('id, name, email, category, is_featured, is_wholesaler, account_status, created_at, users(full_name, phone, wilaya)')
            .order('created_at', { ascending: false });
        
        if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,wilaya.ilike.%${searchTerm}%`);
        
        // Apply admin filters
        const planFilter = safeEl('storeFilter')?.value || 'all';
        if (planFilter !== 'all') {
            query = query.eq('package_type', planFilter);
        }
        
        const statusFilter = safeEl('storeStatusFilter')?.value || 'all';
        if (statusFilter !== 'all') {
            query = query.eq('account_status', statusFilter);
        }

        const typeFilter = safeEl('storeTypeFilter')?.value || 'all';
        if (typeFilter !== 'all') {
            if (typeFilter === 'wholesaler') {
                query = query.eq('is_wholesaler', true);
            } else if (typeFilter === 'retailer') {
                query = query.eq('is_wholesaler', false);
            }
        }
        
        const { data, error } = await query.limit(200);
        if (error) throw error;
        
        allStores = data || [];
        
        if (!allStores.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-row">لا توجد متاجر</td></tr>';
            return;
        }
        
        tbody.innerHTML = allStores.map(store => `
            <tr id="store-row-${store.id}">
                <td><strong>${escapeHtml(store.name || '—')}</strong></td>
                <td>${escapeHtml(store.users?.full_name || '—')}</td>
                <td>${escapeHtml(store.category || '—')}</td>
                <td>${escapeHtml(getWilayaName(store.users?.wilaya))}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${store.is_featured ? 'checked' : ''} 
                               onchange="toggleStoreFeatured('${store.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${store.is_wholesaler ? 'checked' : ''} 
                               onchange="toggleStoreWholesaler('${store.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" ${store.account_status === 'active' ? 'checked' : ''} 
                               onchange="toggleStoreActive('${store.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div class="action-btns">
                        <button type="button" class="btn-icon btn-whatsapp" onclick="openWhatsApp('${escapeHtml(store.users?.phone || '')}')" title="واتساب المالك">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger" onclick="deleteStore('${store.id}', '${escapeHtml(store.name || '')}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('[Stores] خطأ:', e);
        tbody.innerHTML = `<tr><td colspan="8" class="error-row">خطأ: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function searchStoresAdmin() {
    const term = (safeEl('storeSearch')?.value || '').trim();
    loadStores(term);
}

function filterStores() {
    const term = (safeEl('storeSearch')?.value || '').trim();
    loadStores(term);
}

function searchStores() { searchStoresAdmin(); }

async function toggleStoreFeatured(storeId, isFeatured) {
    try {
        const { error } = await supabaseAdmin
            .from('merchant').update({ is_featured: isFeatured }).eq('id', storeId);
        if (error) throw error;
        showToast(isFeatured ? '⭐ تم تمييز المتجر' : 'تم إلغاء التمييز', 'success');
        await logAudit('تمييز متجر', { storeId, isFeatured });
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function toggleStoreWholesaler(storeId, isWholesaler) {
    try {
        const { error } = await supabaseAdmin
            .from('merchant').update({ is_wholesaler: isWholesaler }).eq('id', storeId);
        if (error) throw error;
        
        // Update user role in users table
        const store = allStores.find(s => s.id == storeId);
        if (store && store.email) {
            await supabaseAdmin.from('users').update({
                role: isWholesaler ? 'wholesaler' : 'retailer'
            }).eq('email', store.email);
        }
        
        showToast(isWholesaler ? '🤝 تم اعتماد التاجر B2B' : 'تم إلغاء اعتماد التاجر', 'success');
        await logAudit('تعديل اعتماد B2B لمتجر', { storeId, isWholesaler });
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
        // Reset checkbox UI if error occurs
        loadStores((safeEl('storeSearch')?.value || '').trim());
    }
}

async function toggleStoreActive(storeId, isActive) {
    try {
        const { error } = await supabaseAdmin
            .from('merchant').update({ account_status: isActive ? 'active' : 'suspended' }).eq('id', storeId);
        if (error) throw error;
        showToast(isActive ? '✅ المتجر مفعّل' : '⏸️ المتجر موقوف', isActive ? 'success' : 'warning');
        await logAudit('تفعيل/تعطيل متجر', { storeId, isActive });
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function deleteStore(storeId, storeName) {
    if (!confirm(`حذف متجر "${storeName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
        const { error } = await supabaseAdmin.from('merchant').delete().eq('id', storeId);
        if (error) throw error;
        await logAudit('حذف متجر', { storeId, storeName });
        showToast(`🗑️ تم حذف ${storeName}`, 'warning');
        const row = safeEl(`store-row-${storeId}`);
        if (row) row.remove();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: PRODUCTS - إدارة المنتجات
// ═══════════════════════════════════════════════════════════════

// searchProductsAdmin: called from admin.html
function searchProductsAdmin() {
    const term = (safeEl('productSearch')?.value || '').trim();
    loadProducts(term);
}

async function loadProducts(searchTerm = '') {
    // Products section uses a grid, not a table
    const grid = safeEl('adminProductsGrid');
    if (!grid) { console.warn('[Products] #adminProductsGrid not found'); return; }
    grid.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        let query = supabaseAdmin
            .from('products')
            .select('id, name, price, wholesale_price, show_in_b2b, category, is_published, created_at, merchant(name)')
            .order('created_at', { ascending: false });
        
        if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
        
        const { data, error } = await query.limit(200);
        if (error) throw error;
        
        allProducts = data || [];
        
        if (!allProducts.length) {
            grid.innerHTML = '<p class="empty-state">لا توجد منتجات</p>';
            return;
        }
        
        grid.innerHTML = allProducts.map(p => {
            const isWholesale = p.wholesale_price && Number(p.wholesale_price) > 0;
            const b2bBadge = isWholesale
                ? (p.show_in_b2b 
                    ? '<span style="background:rgba(0,200,150,0.12); color:#00c896; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700;">جملة (نشط)</span>'
                    : '<span style="background:rgba(255,255,255,0.05); color:#999; padding:2px 6px; border-radius:4px; font-size:11px;">جملة (مخفي)</span>')
                : '<span style="background:rgba(255,255,255,0.03); color:#666; padding:2px 6px; border-radius:4px; font-size:11px;">تجزئة</span>';

            return `
                <div class="product-admin-card" id="product-row-${p.id}">
                    <div class="pac-name">${escapeHtml(p.name || '—')}</div>
                    <div class="pac-store">${escapeHtml(p.merchant?.name || '—')}</div>
                    <div class="pac-price">
                        تجزئة: ${p.price ? `${Number(p.price).toLocaleString('ar-DZ')} دج` : '—'}
                        ${isWholesale ? `<br><small style="color:var(--brand);font-weight:bold;">جملة: ${Number(p.wholesale_price).toLocaleString('ar-DZ')} دج</small>` : ''}
                    </div>
                    <div class="pac-status" style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
                        <span class="status-badge ${p.is_published !== false ? 'status-active' : 'status-suspended'}">
                            متجر: ${p.is_published !== false ? 'نشط' : 'مخفي'}
                        </span>
                        ${isWholesale ? b2bBadge : ''}
                    </div>
                    <div class="pac-actions">
                        <!-- Toggle Normal Visibility -->
                        <button type="button" class="btn-icon btn-${p.is_published !== false ? 'warning' : 'approve'}" 
                                onclick="toggleProductActive('${p.id}', ${p.is_published === false})" 
                                title="${p.is_published !== false ? 'إخفاء من المتجر' : 'إظهار في المتجر'}">
                            <i class="fas fa-${p.is_published !== false ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        
                        <!-- Toggle B2B Visibility (only if B2B product) -->
                        ${isWholesale ? `
                            <button type="button" class="btn-icon" style="background:${p.show_in_b2b ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.05)'}; color:${p.show_in_b2b ? '#00c896' : '#999'};" 
                                    onclick="toggleProductB2b('${p.id}', ${!p.show_in_b2b})" 
                                    title="${p.show_in_b2b ? 'إخفاء من الجملة' : 'عرض في الجملة'}">
                                <i class="fas fa-building"></i>
                            </button>
                        ` : ''}

                        <button type="button" class="btn-icon btn-danger" onclick="deleteProduct('${p.id}', '${escapeHtml(p.name || '')}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('[Products] خطأ:', e);
        grid.innerHTML = `<p class="error-state">خطأ في تحميل المنتجات: ${escapeHtml(e.message)}</p>`;
    }
}

async function toggleProductActive(productId, newState) {
    try {
        const { error } = await supabaseAdmin
            .from('products').update({ is_published: newState }).eq('id', productId);
        if (error) throw error;
        showToast(newState ? '✅ المنتج مرئي في المتاجر' : '🙈 المنتج مخفي من المتاجر', 'success');
        await loadProducts();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function toggleProductB2b(productId, newState) {
    try {
        const { error } = await supabaseAdmin
            .from('products').update({ show_in_b2b: newState }).eq('id', productId);
        if (error) throw error;
        showToast(newState ? '✅ تم تفعيل ظهور المنتج في صفحة الجملة B2B' : '🙈 تم إخفاء المنتج من صفحة الجملة B2B', 'success');
        await loadProducts();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}
window.toggleProductB2b = toggleProductB2b;
window.toggleProductActive = toggleProductActive;

async function deleteProduct(productId, productName) {
    if (!confirm(`حذف منتج "${productName}"؟`)) return;
    try {
        const { error } = await supabaseAdmin.from('products').delete().eq('id', productId);
        if (error) throw error;
        await logAudit('حذف منتج', { productId, productName });
        showToast(`🗑️ تم حذف ${productName}`, 'warning');
        const row = safeEl(`product-row-${productId}`);
        if (row) row.remove();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: NOTIFICATIONS - الإشعارات
// ═══════════════════════════════════════════════════════════════

async function loadNotifications() {
    const container = safeEl('notificationsList');
    if (!container) { console.warn('[Notifs] #notificationsList not found'); return; }
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const typeFilter = safeEl('notifTypeFilter')?.value || 'all';
        const priorityFilter = safeEl('notifPriorityFilter')?.value || 'all';

        let query = supabaseAdmin
            .from('admin_notifications')
            .select('*');

        if (typeFilter !== 'all') {
            query = query.eq('type', typeFilter);
        }
        if (priorityFilter !== 'all') {
            query = query.eq('priority', priorityFilter);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        allNotifications = data || [];
        
        if (!allNotifications.length) {
            container.innerHTML = '<p class="empty-state">لا توجد إشعارات</p>';
            return;
        }
        
        container.innerHTML = allNotifications.map(n => {
            let priorityBadge = '';
            if (n.priority && n.priority !== 'normal') {
                const badgeLabel = n.priority === 'urgent' ? 'عاجل' : n.priority === 'high' ? 'عالي' : 'منخفض';
                priorityBadge = `<span class="priority-badge priority-${n.priority}" style="font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; display:inline-block; font-weight:bold; background:rgba(255,255,255,0.1);">${badgeLabel}</span>`;
            }
            return `
                <div class="notification-item ${n.is_read ? '' : 'unread'}">
                    <div class="notif-icon"><i class="fas fa-bell"></i></div>
                    <div class="notif-body">
                        <strong>${escapeHtml(n.title || 'إشعار')} ${priorityBadge}</strong>
                        <p>${escapeHtml(n.message || '')}</p>
                    </div>
                    <div class="notif-meta">
                        <span class="notif-time">${formatDate(n.created_at)}</span>
                        <button type="button" class="btn-icon btn-danger" onclick="deleteNotification('${n.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = `<p class="error-state">خطأ في التحميل: ${escapeHtml(e.message)}</p>`;
    }
}

async function deleteNotification(id) {
    try {
        const { error } = await supabaseAdmin.from('admin_notifications').delete().eq('id', id);
        if (error) throw error;
        showToast('تم الحذف', 'success');
        await loadNotifications();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function sendGlobalNotification() {
    const title = safeEl('globalNotifTitle')?.value?.trim();
    const message = safeEl('globalNotifMessage')?.value?.trim();
    
    if (!title || !message) { showToast('يرجى ملء جميع الحقول', 'warning'); return; }
    
    try {
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users').select('id').eq('account_status', 'active');
        if (usersError) throw usersError;
        
        const notifs = (users || []).map(u => ({
            user_id: u.id,
            title,
            message,
            type: 'admin_broadcast',
            is_read: false,
            created_at: new Date().toISOString()
        }));
        
        if (notifs.length) {
            const { error } = await supabaseAdmin.from('notifications').insert(notifs);
            if (error) throw error;
        }
        
        await logAudit('بث إشعار عام', { title, count: notifs.length });
        showToast(`✅ تم إرسال الإشعار لـ ${notifs.length} مستخدم`, 'success');
        if (safeEl('globalNotifTitle')) safeEl('globalNotifTitle').value = '';
        if (safeEl('globalNotifMessage')) safeEl('globalNotifMessage').value = '';
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: HELPDESK - مركز الدعم
// ═══════════════════════════════════════════════════════════════

async function loadHelpdesk(statusFilter = 'open') {
    const container = safeEl('ticketsList');
    if (!container) { console.warn('[Helpdesk] #ticketsList not found'); return; }
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        let query = supabaseAdmin
            .from('support_tickets')
            .select('id, subject, status, priority, created_at, user_id, users(full_name, email, phone)')
            .order('created_at', { ascending: false });
        
        if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
        
        const { data, error } = await query.limit(100);
        if (error) throw error;
        
        allTickets = data || [];
        updateBadge('helpdeskBadge', allTickets.filter(t => t.status === 'open').length);
        
        if (!allTickets.length) {
            container.innerHTML = '<p class="empty-state">لا توجد تذاكر دعم</p>';
            return;
        }
        
        const priorityColors = { high: '#ff4757', medium: '#ffa502', low: '#2ed573' };
        
        container.innerHTML = allTickets.map(t => `
            <div class="ticket-card ${t.status === 'open' ? 'ticket-open' : ''}">
                <div class="ticket-header">
                    <div>
                        <strong>${escapeHtml(t.subject || 'تذكرة دعم')}</strong>
                        <span class="ticket-user">${escapeHtml(t.users?.full_name || '—')}</span>
                    </div>
                    <div class="ticket-meta">
                        <span class="priority-dot" style="background:${priorityColors[t.priority] || '#8b949e'}"></span>
                        <span class="status-badge status-${t.status}">${t.status}</span>
                        <span class="ticket-date">${formatDate(t.created_at)}</span>
                    </div>
                </div>
                <div class="ticket-actions">
                    <button type="button" class="btn-sm btn-primary" onclick="openTicketReply('${t.id}')">
                        <i class="fas fa-reply"></i> رد
                    </button>
                    <button type="button" class="btn-sm btn-whatsapp" onclick="openWhatsApp('${escapeHtml(t.users?.phone || '')}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button type="button" class="btn-sm btn-success" onclick="closeTicket('${t.id}')">
                        <i class="fas fa-check"></i> إغلاق
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="error-state">خطأ: ${escapeHtml(e.message)}</p>`;
    }
}

function openTicketReply(ticketId) {
    currentTicketId = ticketId;
    openModal('replyTicketModal');
}

function filterTickets() {
    const status = safeEl('ticketStatusFilter')?.value || 'open';
    loadHelpdesk(status);
}

async function submitTicketReply() {
    if (!currentTicketId) return;
    const replyText = safeEl('replyText')?.value?.trim();
    const newStatus = safeEl('replyNewStatus')?.value || 'in_progress';
    
    if (!replyText) { showToast('يرجى كتابة رد', 'warning'); return; }
    
    try {
        await Promise.all([
            supabaseAdmin.from('ticket_replies').insert({
                ticket_id: currentTicketId,
                admin_id: adminUser?.id,
                message: replyText,
                created_at: new Date().toISOString()
            }),
            supabaseAdmin.from('support_tickets').update({ status: newStatus }).eq('id', currentTicketId)
        ]);
        
        await logAudit('رد على تذكرة', { ticketId: currentTicketId, newStatus });
        showToast('✅ تم إرسال الرد', 'success');
        closeAllAdminModals();
        if (safeEl('replyText')) safeEl('replyText').value = '';
        await loadHelpdesk();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function closeTicket(ticketId) {
    try {
        const { error } = await supabaseAdmin
            .from('support_tickets').update({ status: 'closed' }).eq('id', ticketId);
        if (error) throw error;
        showToast('✅ تم إغلاق التذكرة', 'success');
        await loadHelpdesk();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: UPGRADE REQUESTS - طلبات الترقية
// ═══════════════════════════════════════════════════════════════

async function loadUpgradeRequests() {
    const container = safeEl('upgradeRequestsList');
    if (!container) { console.warn('[Upgrade] #upgradeRequestsList not found'); return; }
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('upgrade_requests')
            .select('id, merchant_email, current_plan, requested_plan, status, created_at, users:users!fk_upgrade_requests_users_email(id, full_name, email, phone, selected_plan)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const formattedData = (data || []).map(req => ({
            id: req.id,
            user_id: req.users?.id || null,
            requested_package: req.requested_plan,
            status: req.status,
            payment_proof: null,
            created_at: req.created_at,
            users: req.users ? {
                full_name: req.users.full_name,
                email: req.users.email,
                phone: req.users.phone,
                package_type: req.users.selected_plan
            } : null
        }));
        
        if (!formattedData.length) {
            container.innerHTML = '<p class="empty-state">لا توجد طلبات ترقية</p>';
            updateBadge('upgradeBadge', 0);
            return;
        }
        
        updateBadge('upgradeBadge', formattedData.filter(r => r.status === 'pending').length);
        
        container.innerHTML = formattedData.map(req => `
            <div class="upgrade-card">
                <div class="upgrade-header">
                    <div>
                        <strong>${escapeHtml(req.users?.full_name || '—')}</strong>
                        <span class="package-badge package-${req.users?.package_type}">${escapeHtml(req.users?.package_type || '—')}</span>
                        <i class="fas fa-arrow-left" style="margin: 0 8px; color: #8b949e;"></i>
                        <span class="package-badge package-${req.requested_package}">${escapeHtml(req.requested_package || '—')}</span>
                    </div>
                    <span class="status-badge status-${req.status}">${req.status}</span>
                </div>
                <div class="upgrade-meta">
                    <span>${formatDate(req.created_at)}</span>
                    ${req.payment_proof ? `<a href="${escapeHtml(req.payment_proof)}" target="_blank" class="btn-sm btn-secondary"><i class="fas fa-receipt"></i> وصل الدفع</a>` : ''}
                </div>
                ${req.status === 'pending' ? `
                <div class="upgrade-actions">
                    <button type="button" class="btn-approve" onclick="approveUpgrade('${req.id}', '${req.user_id}', '${escapeHtml(req.requested_package)}', '${escapeHtml(req.users?.full_name || '')}')">
                        <i class="fas fa-check"></i> موافقة
                    </button>
                    <button type="button" class="btn-reject" onclick="rejectUpgrade('${req.id}')">
                        <i class="fas fa-times"></i> رفض
                    </button>
                    <button type="button" class="btn-whatsapp" onclick="openWhatsApp('${escapeHtml(req.users?.phone || '')}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="error-state">خطأ: ${escapeHtml(e.message)}</p>`;
    }
}

async function approveUpgrade(requestId, userId, newPackage, userName) {
    if (!confirm(`الموافقة على ترقية ${userName} إلى باقة ${newPackage}؟`)) return;
    try {
        const { data: reqData, error: reqErr } = await supabaseAdmin
            .from('upgrade_requests')
            .select('merchant_email')
            .eq('id', requestId)
            .single();
        if (reqErr) throw reqErr;
        const email = reqData?.merchant_email;

        await Promise.all([
            supabaseAdmin.from('upgrade_requests').update({ status: 'completed' }).eq('id', requestId),
            supabaseAdmin.from('users').update({ selected_plan: newPackage }).eq('id', userId),
            email ? supabaseAdmin.from('merchant').update({ package_type: newPackage }).eq('email', email) : Promise.resolve()
        ]);
        await logAudit('موافقة ترقية', { requestId, userId, newPackage, userName });
        showToast(`✅ تم ترقية ${userName} إلى ${newPackage}`, 'success');
        await loadUpgradeRequests();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function rejectUpgrade(requestId) {
    try {
        const { error } = await supabaseAdmin
            .from('upgrade_requests').update({ status: 'rejected' }).eq('id', requestId);
        if (error) throw error;
        showToast('تم رفض الطلب', 'warning');
        await loadUpgradeRequests();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: BROADCAST - بث واتساب
// ═══════════════════════════════════════════════════════════════

function loadBroadcast() {
    const container = safeEl('broadcastPreview');
    if (container) container.innerHTML = '';
}

async function sendWhatsAppBroadcast() {
    const message = safeEl('broadcastMessage')?.value?.trim();
    const targetGroup = safeEl('broadcastTarget')?.value || 'all';
    
    if (!message) { showToast('يرجى كتابة رسالة', 'warning'); return; }
    
    try {
        let query = supabaseAdmin.from('users').select('phone, whatsapp, full_name');
        if (targetGroup === 'active') query = query.eq('account_status', 'active');
        else if (targetGroup === 'pending') query = query.eq('account_status', 'pending');
        
        const { data, error } = await query;
        if (error) throw error;
        
        const phones = (data || []).map(u => u.whatsapp || u.phone).filter(Boolean);
        
        if (!phones.length) { showToast('لا يوجد أرقام هاتف متاحة', 'warning'); return; }
        
        // فتح واتساب لكل رقم (مع تأخير)
        let opened = 0;
        const preview = safeEl('broadcastPreview');
        if (preview) preview.innerHTML = `<p>جاري الإرسال لـ ${phones.length} جهة اتصال...</p>`;
        
        phones.slice(0, 10).forEach((phone, i) => {
            setTimeout(() => {
                openWhatsApp(phone, message);
                opened++;
                if (preview) preview.innerHTML = `<p>تم فتح واتساب لـ ${opened}/${Math.min(phones.length, 10)} جهة اتصال</p>`;
            }, i * 800);
        });
        
        await logAudit('بث واتساب', { targetGroup, count: phones.length, message: message.substring(0, 100) });
        showToast(`📱 جاري الإرسال لـ ${phones.length} جهة اتصال`, 'success');
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: ADS - إعلانات VIP
// ═══════════════════════════════════════════════════════════════

async function loadAds() {
    const table = safeEl('vipAdsTable');
    const tbody = table ? table.querySelector('tbody') : safeEl('vipAdsTableBody');
    if (!tbody) { console.warn('[Ads] vipAdsTableBody not found'); return; }
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="loading-spinner"></div></td></tr>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('merchant')
            .select('id, name, email, ad_image, ad_title, ad_link, ad_status, package_type')
            .eq('package_type', 'vip');
            
        if (error) throw error;
        
        // تصفية المتاجر التي لديها إعلان مخصص
        const adsData = (data || []).filter(m => m.ad_image || m.ad_title || m.ad_status);
        
        // تحديث الشارة بالطلبات المعلقة فقط
        const pendingCount = adsData.filter(a => a.ad_status === 'pending_design').length;
        updateBadge('adsBadge', pendingCount);
        
        if (!adsData.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">لا توجد إعلانات VIP نشطة حالياً</td></tr>';
            return;
        }
        
        tbody.innerHTML = adsData.map(ad => `
            <tr id="ad-row-${ad.id}">
                <td><strong>${escapeHtml(ad.name || '—')}</strong></td>
                <td>${escapeHtml(ad.email)}</td>
                <td>${escapeHtml(ad.ad_title || '—')}</td>
                <td><span class="status-badge status-${ad.ad_status || 'inactive'}">${ad.ad_status || 'غير نشط'}</span></td>
                <td>
                    ${ad.ad_image ? `<a href="${escapeHtml(ad.ad_image)}" target="_blank"><img src="${escapeHtml(ad.ad_image)}" style="height: 35px; width: 70px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);"></a>` : '—'}
                </td>
                <td>
                    <div class="action-btns">
                        ${ad.ad_status !== 'active' && ad.ad_image ? `
                            <button type="button" class="btn-approve" onclick="approveMerchantAd('${ad.email}')" title="تفعيل الإعلان">
                                <i class="fas fa-check"></i> تفعيل
                            </button>
                        ` : ''}
                        <button type="button" class="btn-icon btn-danger" onclick="deleteMerchantAd('${ad.email}')" title="حذف الإعلان">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-row">خطأ: ${escapeHtml(e.message)}</td></tr>`;
    }
}

async function approveMerchantAd(email) {
    try {
        const { error } = await supabaseAdmin
            .from('merchant')
            .update({ ad_status: 'active' })
            .eq('email', email);
        if (error) throw error;
        await logAudit('تفعيل إعلان VIP', { email });
        showToast('✅ تم تفعيل الإعلان بنجاح', 'success');
        await loadAds();
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function deleteMerchantAd(email) {
    if (!confirm('هل تريد إزالة هذا الإعلان وحذف بياناته؟')) return;
    try {
        const { error } = await supabaseAdmin
            .from('merchant')
            .update({
                ad_image: null,
                ad_title: null,
                ad_link: null,
                ad_status: null
            })
            .eq('email', email);
        if (error) throw error;
        await logAudit('حذف إعلان VIP', { email });
        showToast('🗑️ تم إزالة الإعلان', 'warning');
        await loadAds();
        await loadAdDesignRequests();
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// LOAD AD DESIGN REQUESTS - إدارة طلبات تصميم إعلانات VIP
// ═══════════════════════════════════════════════════════════════

async function loadAdDesignRequests() {
    const container = safeEl('adRequestsList');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('merchant')
            .select('id, name, email, phone, ad_title, ad_link, ad_status')
            .eq('ad_status', 'pending_design');
            
        if (error) throw error;
        
        if (!data?.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-ad"></i><h3>لا توجد طلبات تصميم معلقة</h3></div>';
            return;
        }
        
        container.innerHTML = data.map(req => `
            <div class="upgrade-card" style="border-left: 4px solid #ffd700; background: rgba(255,215,0,0.02); padding: 15px; margin-bottom: 12px; border-radius: 8px;">
                <div class="upgrade-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 15px; color: #fff;">${escapeHtml(req.name || '—')}</strong>
                        <span class="package-badge package-vip" style="margin-left: 8px;">VIP</span>
                    </div>
                    <span class="status-badge status-pending" style="background: rgba(255,215,0,0.15); color: #ffd700; padding: 4px 10px; border-radius: 20px; font-size: 11px;">طلب تصميم</span>
                </div>
                <div class="upgrade-meta" style="margin-top: 10px; font-size: 13px; color: #8b949e;">
                    <span>العنوان المطلوب: <strong>${escapeHtml(req.ad_title || '—')}</strong></span>
                    ${req.ad_link ? `<br><span>الرابط: <a href="${escapeHtml(req.ad_link)}" target="_blank" style="color: #58a6ff; text-decoration: none;">${escapeHtml(req.ad_link)}</a></span>` : ''}
                    <br><span style="font-size: 11px; color: #58a6ff;">البريد الإلكتروني: ${escapeHtml(req.email)}</span>
                </div>
                <div class="upgrade-actions" style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <label class="action-btn primary-btn" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 8px 16px; background: linear-gradient(135deg,#ffd700,#ff9500); color: #000; border: none; border-radius: 6px; font-weight: bold; font-family: inherit; font-size: 12px;">
                        <i class="fas fa-upload"></i> رفع وتفعيل التصميم
                        <input type="file" accept="image/*" style="display: none;" onchange="uploadAdDesignForMerchant('${req.email}', this)">
                    </label>
                    <button type="button" class="btn-reject" onclick="rejectAdDesign('${req.email}')" style="padding: 8px 16px; font-size: 12px;">
                        <i class="fas fa-times"></i> رفض الطلب
                    </button>
                    <button type="button" class="btn-whatsapp" onclick="openWhatsApp('${escapeHtml(req.phone || '')}')" style="padding: 8px 12px; font-size: 12px;">
                        <i class="fab fa-whatsapp"></i> واتساب
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="error-state">خطأ: ${escapeHtml(e.message)}</p>`;
    }
}

window.uploadAdDesignForMerchant = async function(email, fileInput) {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب أن يكون أقل من 5MB', 'warning');
        return;
    }
    
    showToast('جاري رفع التصميم وتحديث الحساب...', 'info');
    
    try {
        const timestamp = Date.now();
        const fileName = `ad_design_${email.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${file.name.split('.').pop()}`;
        
        const { error: uploadErr } = await supabaseAdmin.storage
            .from('product-images')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });
            
        if (uploadErr) throw uploadErr;
        
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('product-images')
            .getPublicUrl(fileName);
            
        const { error: updateErr } = await supabaseAdmin
            .from('merchant')
            .update({
                ad_image: publicUrl,
                ad_status: 'active'
            })
            .eq('email', email);
            
        if (updateErr) throw updateErr;
        
        // إرسال إشعار للتاجر في جدول الإشعارات
        await supabaseAdmin.from('notifications').insert({
            user_email: email,
            title: '🎨 جاهزية تصميم الإعلان',
            message: 'لقد قامت الإدارة بتصميم إعلانك ونشره بنجاح!',
            type: 'ad_design_completed',
            is_read: false
        });
        
        showToast('✅ تم رفع وتفعيل التصميم بنجاح!', 'success');
        await loadAdDesignRequests();
        await loadAds();
        await loadBadgeCounts();
    } catch (e) {
        showToast('خطأ: ' + e.message, 'error');
    }
};

window.rejectAdDesign = async function(email) {
    if (!confirm('هل تريد رفض طلب التصميم؟')) return;
    try {
        const { error } = await supabaseAdmin
            .from('merchant')
            .update({ ad_status: null })
            .eq('email', email);
            
        if (error) throw error;
        
        await supabaseAdmin.from('notifications').insert({
            user_email: email,
            title: '❌ طلب تصميم الإعلان',
            message: 'تم رفض طلب تصميم الإعلان من قبل الإدارة. يرجى مراجعة التفاصيل أو التواصل مع الدعم.',
            type: 'ad_design_rejected',
            is_read: false
        });
        
        showToast('تم رفض طلب التصميم', 'warning');
        await loadAdDesignRequests();
        await loadBadgeCounts();
    } catch (e) {
        showToast('خطأ: ' + e.message, 'error');
    }
};

// ═══════════════════════════════════════════════════════════════
// SECTION 11: REAL ESTATE - إعلانات العقارات
// ═══════════════════════════════════════════════════════════════

async function loadRealEstate(searchTerm = '', statusFilter = '') {
    const tbody = safeEl('realEstateTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><div class="loading-spinner"></div></td></tr>';
    
    try {
        let query = supabaseAdmin
            .from('real_estate_listings')
            .select('id, title, property_type, listing_type, price, wilaya, status, is_featured, images, created_at, user_id, users(full_name, phone)')
            .order('created_at', { ascending: false });
        
        if (statusFilter) query = query.eq('status', statusFilter);
        if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,wilaya.ilike.%${searchTerm}%`);
        
        const { data, error } = await query.limit(200);
        if (error) throw error;
        
        allRealEstateListings = (data || []).map(re => ({
            ...re,
            type: re.property_type,
            offer_type: re.listing_type
        }));
        
        if (!allRealEstateListings.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">لا توجد إعلانات عقارية</td></tr>';
            return;
        }
        
        tbody.innerHTML = allRealEstateListings.map(re => {
            const imgs = Array.isArray(re.images) ? re.images : 
                        (re.images ? [re.images] : []);
            const thumbSrc = imgs[0] || null;
            
            return `
            <tr id="re-row-${re.id}">
                <td>
                    <div class="re-cell">
                        ${thumbSrc ? `<img src="${escapeHtml(thumbSrc)}" class="re-thumbnail" alt="صورة" onerror="this.style.display='none'">` : '<div class="re-thumb-placeholder"><i class="fas fa-building"></i></div>'}
                        <span>${escapeHtml(re.title || '—')}</span>
                    </div>
                </td>
                <td>${escapeHtml(re.type || '—')}</td>
                <td>${escapeHtml(re.offer_type || '—')}</td>
                <td>${re.price ? `${Number(re.price).toLocaleString('ar-DZ')} دج` : '—'}</td>
                <td>${escapeHtml(getWilayaName(re.wilaya))}</td>
                <td><span class="status-badge status-${re.status || 'active'}">${re.status || 'نشط'}</span></td>
                <td>
                    <div class="action-btns">
                        ${imgs.length > 0 ? `
                            <button type="button" class="btn-icon btn-secondary" onclick="viewREPhotos('${re.id}')" title="عرض الصور">
                                <i class="fas fa-images"></i> ${imgs.length}
                            </button>
                        ` : ''}
                        <label class="toggle-switch" title="تمييز">
                            <input type="checkbox" ${re.is_featured ? 'checked' : ''} 
                                   onchange="toggleREFeatured('${re.id}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button type="button" class="btn-icon btn-warning" onclick="toggleREStatus('${re.id}', '${re.status}')" title="إخفاء/إظهار">
                            <i class="fas fa-${re.status === 'hidden' ? 'eye' : 'eye-slash'}"></i>
                        </button>
                        <button type="button" class="btn-icon btn-whatsapp" onclick="openWhatsApp('${escapeHtml(re.users?.phone || '')}')" title="واتساب">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger" onclick="deleteRE('${re.id}', '${escapeHtml(re.title || '')}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('[RE] خطأ:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="error-row">خطأ: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function searchRealEstate() {
    const term = (safeEl('reSearchInput')?.value || '').trim();
    const status = safeEl('reStatusFilter')?.value || '';
    loadRealEstate(term, status);
}

async function toggleREFeatured(id, isFeatured) {
    try {
        const { error } = await supabaseAdmin
            .from('real_estate_listings').update({ is_featured: isFeatured }).eq('id', id);
        if (error) throw error;
        showToast(isFeatured ? '⭐ تم تمييز الإعلان' : 'تم إلغاء التمييز', 'success');
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function toggleREStatus(id, currentStatus) {
    const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
    try {
        const { error } = await supabaseAdmin
            .from('real_estate_listings').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        showToast(newStatus === 'hidden' ? '🙈 تم إخفاء الإعلان' : '✅ تم إظهار الإعلان', 'success');
        await loadRealEstate();
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function deleteRE(id, title) {
    if (!confirm(`حذف إعلان "${title}"؟`)) return;
    try {
        const { error } = await supabaseAdmin.from('real_estate_listings').delete().eq('id', id);
        if (error) throw error;
        await logAudit('حذف إعلان عقار', { id, title });
        showToast(`🗑️ تم حذف الإعلان`, 'warning');
        const row = safeEl(`re-row-${id}`);
        if (row) row.remove();
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

function viewREPhotos(id) {
    const listing = allRealEstateListings.find(r => r.id === id);
    if (!listing) return;
    
    const imgs = Array.isArray(listing.images) ? listing.images :
                (listing.images ? [listing.images] : []);
    
    const container = safeEl('reModalPhotosContainer');
    if (container) {
        if (!imgs.length) {
            container.innerHTML = '<p class="empty-state">لا توجد صور لهذا الإعلان</p>';
        } else {
            container.innerHTML = imgs.map(src => `
                <a href="${escapeHtml(src)}" target="_blank">
                    <img src="${escapeHtml(src)}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;cursor:pointer;" 
                         alt="صورة عقار" onerror="this.parentElement.style.display='none'">
                </a>
            `).join('');
        }
    }
    
    openModal('rePhotosModal');
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: ANNOUNCEMENTS - إعلانات الموقع
// ═══════════════════════════════════════════════════════════════

async function loadAnnouncements() {
    const container = safeEl('announcementsList');
    if (!container) { console.warn('[Announcements] #announcementsList not found'); return; }
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_announcements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data?.length) {
            container.innerHTML = '<p class="empty-state">لا توجد إعلانات موقع</p>';
            return;
        }
        
        container.innerHTML = data.map(ann => `
            <div class="announcement-item" style="overflow:hidden;">
                ${ann.video_url ? `
                <div style="width:100%;height:140px;overflow:hidden;border-radius:8px 8px 0 0;margin:-16px -16px 12px;position:relative;background:#000;">
                    <video src="${escapeHtml(ann.video_url)}" style="width:100%;height:100%;object-fit:cover;" controls muted></video>
                </div>` : (ann.image_url ? `
                <div style="width:100%;height:120px;overflow:hidden;border-radius:8px 8px 0 0;margin:-16px -16px 12px;position:relative;">
                    <img src="${escapeHtml(ann.image_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.display='none'">
                    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6));pointer-events:none;"></div>
                </div>` : '')}
                <div class="announcement-header">
                    <strong>${escapeHtml(ann.title || '—')}</strong>
                    <div class="announcement-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${ann.is_active ? 'checked' : ''}
                                   onchange="toggleAnnouncement('${ann.id}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button type="button" class="btn-icon btn-danger" onclick="deleteAnnouncement('${ann.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p>${escapeHtml(ann.content || '—')}</p>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;">
                    <span class="announcement-type badge-${ann.type}">${ann.type || 'info'}</span>
                    ${(ann.show_on||[]).includes('wholesale') ? '<span style="font-size:10px;background:rgba(0,200,150,0.11);color:#00c896;padding:2px 8px;border-radius:20px;font-weight:700;">🏢 B2B كاروسيل</span>' : ''}
                    ${(ann.show_on||[]).includes('wholesale_left') ? '<span style="font-size:10px;background:rgba(26,115,232,0.11);color:#1a73e8;padding:2px 8px;border-radius:20px;font-weight:700;">🏢 B2B اليسار (ثابت)</span>' : ''}
                    ${(ann.show_on||[]).includes('wholesale_mid_top') ? '<span style="font-size:10px;background:rgba(245,158,11,0.11);color:#f59e0b;padding:2px 8px;border-radius:20px;font-weight:700;">🏢 B2B وسط أعلى</span>' : ''}
                    ${(ann.show_on||[]).includes('wholesale_mid_bottom') ? '<span style="font-size:10px;background:rgba(236,72,153,0.11);color:#ec4899;padding:2px 8px;border-radius:20px;font-weight:700;">🏢 B2B وسط أسفل</span>' : ''}
                    ${ann.cta_text ? `<span style="font-size:10px;color:#888;">زر: ${escapeHtml(ann.cta_text)}</span>` : ''}
                    ${ann.end_at ? `<span style="font-size:10px;color:#888;">ينتهي: ${new Date(ann.end_at).toLocaleDateString('ar-DZ')}</span>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<p class="error-state">خطأ: ${escapeHtml(e.message)}</p>`;
    }
}

async function addAnnouncement() {
    const title       = safeEl('annTitle')?.value?.trim();
    const content     = safeEl('annContent')?.value?.trim();
    const type        = safeEl('annType')?.value || 'info';
    const cta_text    = safeEl('annCtaText')?.value?.trim() || null;
    const cta_url     = safeEl('annCtaUrl')?.value?.trim()  || null;
    const end_at_val  = safeEl('annEndAt')?.value;
    const end_at      = end_at_val ? new Date(end_at_val).toISOString() : null;
    const showOnSelect = safeEl('annShowOn');
    const show_on     = showOnSelect
        ? Array.from(showOnSelect.selectedOptions).map(o => o.value)
        : ['home'];

    if (!title || !content) { showToast('يرجى ملء العنوان والمحتوى', 'warning'); return; }

    // ── Upload image if selected ──
    let image_url = null;
    const imgFile = safeEl('annImageInput')?.files?.[0];
    if (imgFile) {
        if (imgFile.size > 3 * 1024 * 1024) {
            showToast('الصورة أكبر من 3MB، يرجى اختيار صورة أصغر', 'warning');
            return;
        }
        try {
            const ext      = imgFile.name.split('.').pop();
            const fileName = `ads/ann_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
                .from('site-ads')
                .upload(fileName, imgFile, { cacheControl: '3600', upsert: false });

            if (upErr) throw upErr;

            const { data: urlData } = supabaseAdmin.storage
                .from('site-ads')
                .getPublicUrl(fileName);
            image_url = urlData?.publicUrl || null;
        } catch (imgErr) {
            console.warn('Image upload failed, saving as base64:', imgErr.message);
            image_url = await new Promise(res => {
                const fr = new FileReader();
                fr.onload = e => res(e.target.result);
                fr.readAsDataURL(imgFile);
            });
        }
    }

    // ── Upload video if selected ──
    let video_url = null;
    const vidFile = safeEl('annVideoInput')?.files?.[0];
    if (vidFile) {
        if (vidFile.size > 15 * 1024 * 1024) { // Max 15MB for video
            showToast('الفيديو أكبر من 15MB، يرجى اختيار ملف فيديو أصغر أو مضغوط', 'warning');
            return;
        }
        try {
            const ext      = vidFile.name.split('.').pop();
            const fileName = `ads/ann_vid_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
                .from('site-ads')
                .upload(fileName, vidFile, { cacheControl: '3600', upsert: false });

            if (upErr) throw upErr;

            const { data: urlData } = supabaseAdmin.storage
                .from('site-ads')
                .getPublicUrl(fileName);
            video_url = urlData?.publicUrl || null;
        } catch (vidErr) {
            console.warn('Video upload failed, saving as base64:', vidErr.message);
            // fallback base64
            video_url = await new Promise(res => {
                const fr = new FileReader();
                fr.onload = e => res(e.target.result);
                fr.readAsDataURL(vidFile);
            });
        }
    }

    try {
        const { error } = await supabaseAdmin.from('platform_announcements').insert({
            title, content, type, is_active: true,
            cta_text, cta_url, end_at, show_on,
            image_url, video_url,
            created_at: new Date().toISOString(),
            created_by: adminEmail
        });
        if (error) throw error;

        await logAudit('إضافة إعلان موقع', { title });
        showToast('✅ تم إضافة الإعلان بنجاح', 'success');

        // Clear inputs
        ['annTitle','annContent','annCtaText','annCtaUrl','annEndAt'].forEach(id => {
            const el = safeEl(id); if (el) el.value = '';
        });
        if (showOnSelect) Array.from(showOnSelect.options).forEach(o => { o.selected = o.value === 'home'; });
        clearAnnImage();
        clearAnnVideo();

        await loadAnnouncements();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// Video preview helpers
function previewAnnVideo(input) {
    const file    = input.files?.[0];
    const preview = safeEl('annVideoPreview');
    const vid     = safeEl('annVideoPreviewVid');
    if (!file || !preview || !vid) return;
    const reader  = new FileReader();
    reader.onload = e => {
        vid.src            = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearAnnVideo() {
    const input   = safeEl('annVideoInput');
    const preview = safeEl('annVideoPreview');
    const vid     = safeEl('annVideoPreviewVid');
    if (input)   input.value          = '';
    if (vid)     vid.src              = '';
    if (preview) preview.style.display = 'none';
}

// Image preview helpers
function previewAnnImage(input) {
    const file    = input.files?.[0];
    const preview = safeEl('annImagePreview');
    const img     = safeEl('annImagePreviewImg');
    if (!file || !preview || !img) return;
    const reader  = new FileReader();
    reader.onload = e => {
        img.src            = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearAnnImage() {
    const input   = safeEl('annImageInput');
    const preview = safeEl('annImagePreview');
    const img     = safeEl('annImagePreviewImg');
    if (input)   input.value          = '';
    if (img)     img.src              = '';
    if (preview) preview.style.display = 'none';
}

window.publishAnnouncement = addAnnouncement;
window.previewAnnVideo = previewAnnVideo;
window.clearAnnVideo = clearAnnVideo;

async function toggleAnnouncement(id, isActive) {
    try {
        const { error } = await supabaseAdmin
            .from('platform_announcements').update({ is_active: isActive }).eq('id', id);
        if (error) throw error;
        showToast(isActive ? '✅ الإعلان مفعّل' : '⏸️ الإعلان مخفي', 'success');
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function deleteAnnouncement(id) {
    if (!confirm('حذف هذا الإعلان؟')) return;
    try {
        const { error } = await supabaseAdmin.from('platform_announcements').delete().eq('id', id);
        if (error) throw error;
        showToast('🗑️ تم الحذف', 'warning');
        await loadAnnouncements();
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 13: THEMES - ثيمات المناسبات
// ═══════════════════════════════════════════════════════════════

const THEMES_DATA = [
    { id: 'ramadan', name: 'رمضان الكريم', icon: '🌙', primaryColor: '#f5a623', bgColor: '#1a0a2e', gradient: 'linear-gradient(135deg, #1a0a2e, #2d1b4e)' },
    { id: 'eid', name: 'عيد مبارك', icon: '🎉', primaryColor: '#00ffc3', bgColor: '#0a1628', gradient: 'linear-gradient(135deg, #0a1628, #162d42)' },
    { id: 'national', name: 'اليوم الوطني', icon: '🇩🇿', primaryColor: '#006233', bgColor: '#0a1a0f', gradient: 'linear-gradient(135deg, #006233, #00aa57)' },
    { id: 'default', name: 'الثيم الافتراضي', icon: '⭐', primaryColor: '#00ffc3', bgColor: '#0d1117', gradient: 'linear-gradient(135deg, #0d1117, #161b22)' }
];

function loadThemes() {
    const container = safeEl('themesList');
    if (!container) { console.warn('[Themes] #themesList not found'); return; }
    
    container.innerHTML = THEMES_DATA.map(theme => `
        <div class="theme-card" style="background: ${theme.gradient}; border: 2px solid ${theme.primaryColor}20;">
            <div class="theme-icon">${theme.icon}</div>
            <div class="theme-info">
                <h3 style="color: ${theme.primaryColor}">${theme.name}</h3>
                <div class="theme-colors">
                    <span class="color-dot" style="background: ${theme.primaryColor}" title="اللون الأساسي"></span>
                    <span class="color-dot" style="background: ${theme.bgColor}" title="لون الخلفية"></span>
                </div>
            </div>
            <button type="button" class="btn-apply-theme" onclick="applyTheme('${theme.id}')" style="background: ${theme.primaryColor}; color: #000;">
                <i class="fas fa-magic"></i> تطبيق
            </button>
        </div>
    `).join('');
}

async function applyTheme(themeId) {
    const theme = THEMES_DATA.find(t => t.id === themeId);
    if (!theme) return;
    
    try {
        const { error } = await supabaseAdmin.from('site_settings').upsert({
            key: 'active_theme',
            value: themeId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        
        if (error && !error.message.includes('does not exist')) throw error;
        
        await logAudit('تغيير ثيم', { themeId, themeName: theme.name });
        showToast(`✅ تم تطبيق ثيم "${theme.name}"`, 'success');
    } catch (e) {
        console.warn('[Theme] Table may not exist:', e.message);
        showToast(`تم حفظ الثيم: "${theme.name}" (قد لا يكون جدول site_settings موجوداً)`, 'warning');
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 14: AUDIT LOG - سجل التدقيق
// ═══════════════════════════════════════════════════════════════

async function loadAuditLog() {
    const table = safeEl('auditTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) { console.warn('[Audit] auditTable tbody not found'); return; }
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="loading-spinner"></div></td></tr>';
    
    try {
        const { data, error } = await supabaseAdmin
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        if (!data?.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">لا توجد سجلات</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(log => `
            <tr>
                <td>${escapeHtml(log.action || '—')}</td>
                <td>${escapeHtml(log.details ? JSON.parse(log.details || '{}').userId || '—' : '—')}</td>
                <td>—</td>
                <td>${escapeHtml(JSON.stringify(JSON.parse(log.details || '{}')))}</td>
                <td>${escapeHtml(log.admin_email || '—')}</td>
                <td>${formatDate(log.created_at)}</td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="error-row">خطأ: ${escapeHtml(e.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 15: DUMMY DATA - بيانات الاختبار
// ═══════════════════════════════════════════════════════════════

async function loadDummyDataUI() {
    if (!supabaseAdmin) return;
    try {
        const { count: storeCount, error: errStore } = await supabaseAdmin
            .from('merchant')
            .select('*', { count: 'exact', head: true })
            .eq('is_dummy', true);

        const { count: productCount, error: errProd } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_dummy', true);

        const { count: orderCount, error: errOrder } = await supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('is_dummy', true);

        const storeEl = safeEl('dummyStoreCount');
        const prodEl = safeEl('dummyProductCount');
        const orderEl = safeEl('dummyOrderCount');

        if (storeEl) storeEl.textContent = `${storeCount || 0} متجر`;
        if (prodEl) prodEl.textContent = `${productCount || 0} منتج`;
        if (orderEl) orderEl.textContent = `${orderCount || 0} طلب`;
        
        console.log('[DummyData] Counts refreshed:', { storeCount, productCount, orderCount });
    } catch (e) {
        console.error('[DummyData] Failed to load counts:', e);
    }
}

async function generateDummyUsers(count = 5) {
    if (!supabaseAdmin) return;
    const btn = safeEl('generateUsersBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التوليد...'; }
    
    const names = ['أحمد بن علي','فاطمة بوزيدي','محمد تومي','أمينة قاسمي','يوسف بلقاسم','سارة حمدي','كريم بن عمر','نادية مزيان'];
    const packages = ['basic','gold','premium','vip'];
    const categories = ['ملابس','إلكترونيات','مواد غذائية','عطور','إكسسوارات','أثاث','كتب','رياضة'];
    const productNames = ['منتج رائع','قميص أنيق','عطر فاخر','حذاء رياضي','حقيبة جلدية','ساعة ذكية','إكسسوار موضة','منتج حصري'];
    
    let created = 0, skipped = 0;
    
    try {
        for (let i = 0; i < count; i++) {
            const name = names[Math.floor(Math.random() * names.length)];
            const wilayaIndex = Math.floor(Math.random() * ALGERIA_WILAYAS.length) + 1;
            const pkg = packages[Math.floor(Math.random() * packages.length)];
            const phone = `05${Math.floor(10000000 + Math.random() * 89999999)}`;
            const timestamp = Date.now() + i;
            const email = `test_${timestamp}_${i}@kolchhna-test.dz`;
            const slug = `test-store-${timestamp}-${i}`;
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const idVal = window.crypto?.randomUUID?.() || `${timestamp}-${Math.random().toString(36).slice(2)}`;
            
            // 1. إنشاء المستخدم في جدول users
            const { error: userErr } = await supabaseAdmin.from('users').insert({
                id: idVal,
                full_name: name,
                email,
                phone,
                wilaya: wilayaIndex,
                selected_plan: pkg,
                account_status: 'active',
                is_active: true,
                is_test_data: true,
                created_at: new Date().toISOString()
            });
            
            if (userErr) {
                console.warn(`[DummyData] فشل إنشاء مستخدم ${email}:`, userErr.message);
                skipped++;
                continue;
            }
            
            // 2. إنشاء سجل المتجر في merchant
            const subEnd = new Date();
            subEnd.setDate(subEnd.getDate() + 30);
            
            const isWholesaler = Math.random() < 0.40; // 40% wholesalers
            
            const { error: merchantErr } = await supabaseAdmin.from('merchant').insert({
                email,
                name: isWholesaler ? `مجموعة الجملة ${name}` : `متجر ${name}`,
                slug,
                phone,
                category: cat,
                package_type: pkg,
                account_status: 'active',
                visitor_count: Math.floor(Math.random() * 200),
                is_wholesaler: isWholesaler,
                credit_eligible: false,
                total_sales: 0,
                is_dummy: true,
                subscription_end: subEnd.toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            
            if (merchantErr) {
                console.warn(`[DummyData] فشل إنشاء متجر ${email}:`, merchantErr.message);
            }
            
            // 3. إنشاء 3 منتجات تجريبية للمتجر
            const productsToInsert = [];
            for (let p = 0; p < 3; p++) {
                const prodName = `${productNames[Math.floor(Math.random() * productNames.length)]} ${p + 1}`;
                const price = Math.floor(500 + Math.random() * 9500);
                
                let wholesale_price = null;
                let min_retail_price = null;
                let show_in_b2b = false;
                let details = { colors: ['أسود', 'أبيض'], sizes: ['M', 'L'] };

                if (isWholesaler) {
                    wholesale_price = Math.floor(300 + Math.random() * 4000);
                    min_retail_price = wholesale_price + Math.floor(200 + Math.random() * 2000);
                    show_in_b2b = true;
                    details.moq = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
                }

                productsToInsert.push({
                    name: prodName,
                    description: `منتج تجريبي رقم ${p + 1} لمتجر ${name}`,
                    price: isWholesaler ? min_retail_price : price,
                    wholesale_price: wholesale_price,
                    min_retail_price: min_retail_price,
                    category: cat,
                    stock_qty: Math.floor(5 + Math.random() * 95),
                    is_published: true,
                    show_in_b2b: show_in_b2b,
                    details: details,
                    owner: email,
                    is_dummy: true,
                    created_at: new Date().toISOString()
                });
            }
            
            const { data: insertedProds, error: productsErr } = await supabaseAdmin
                .from('products')
                .insert(productsToInsert)
                .select('*');
                
            if (productsErr) {
                console.warn(`[DummyData] فشل إنشاء منتجات ${email}:`, productsErr.message);
            }
            
            // 4. إنشاء طلبيات جملة وهمية للتاجر إذا كان تاجر جملة
            if (isWholesaler && insertedProds && insertedProds.length > 0) {
                const numOrders = Math.floor(Math.random() * 2) + 1; // 1 to 2 orders
                for (let o = 0; o < numOrders; o++) {
                    const buyerName = ['عمر فاروق', 'حميد لعلام', 'لطيفة بوزيد', 'سفيان مدني'][Math.floor(Math.random() * 4)];
                    const carrierPrefix = ['05', '06', '07'][Math.floor(Math.random() * 3)];
                    const buyerPhone = `${carrierPrefix}${Math.floor(10000000 + Math.random() * 89999999)}`;
                    const buyerWilaya = Math.floor(Math.random() * 58) + 1;
                    const randomProd = insertedProds[Math.floor(Math.random() * insertedProds.length)];
                    
                    const moqVal = randomProd.details?.moq || 10;
                    const qty = moqVal * (Math.floor(Math.random() * 3) + 1);
                    const total = randomProd.wholesale_price * qty;
                    const deposit = Math.round(total * 0.20);
                    const refCode = 'B2B-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 100);
                    const payOnPlatform = Math.random() < 0.70; // 70% paid to platform
                    const payLabel = payOnPlatform ? 'عربون عبر المنصة' : 'تواصل مباشر مع التاجر';
                    
                    await supabaseAdmin.from('orders').insert({
                        merchant_email:   email,
                        customer_name:    buyerName,
                        customer_phone:   buyerPhone,
                        customer_address: ALGERIA_WILAYAS[buyerWilaya - 1] || 'الجزائر العاصمة',
                        customer_wilaya:  buyerWilaya,
                        items: [{
                            id:             randomProd.id,
                            name:           randomProd.name,
                            qty:            qty,
                            price:          randomProd.wholesale_price,
                            wholesale:      true,
                            deposit_amount: deposit,
                            ref_code:       refCode
                        }],
                        total_price:      deposit,
                        notes:            `[B2B جملة | ${payLabel}] العربون: ${deposit.toLocaleString('ar-DZ')} دج | الإجمالي: ${Math.round(total).toLocaleString('ar-DZ')} دج | Ref: ${refCode}`,
                        status:           ['pending', 'completed'][Math.floor(Math.random() * 2)],
                        discount_applied: 0,
                        is_dummy:         true,
                        created_at:       new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 3600 * 1000)).toISOString()
                    });
                }
            }
            
            created++;
            // تأخير بسيط لتجنب تعارض الـ timestamps
            await new Promise(r => setTimeout(r, 50));
        }
        
        await logAudit('توليد بيانات اختبار', { count, created, skipped, type: 'users+merchants+products' });
        showToast(`✅ تم إنشاء ${created} متجر اختباري (${skipped} تجاوزات)`, 'success');
        
        const resultEl = safeEl('dummyDataResult');
        if (resultEl) resultEl.textContent = `تم إنشاء ${created} مستخدم + متجر + 3 منتجات لكل متجر. ${skipped > 0 ? `(تجاوز: ${skipped})` : ''}`;
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
        const resultEl = safeEl('dummyDataResult');
        if (resultEl) resultEl.textContent = `خطأ: ${e.message}`;
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'إنشاء بيانات وهمية'; }
        await loadDummyDataUI();
    }
}


async function deleteDummyUsers(bypassConfirm = false) {
    if (!bypassConfirm && !confirm('حذف جميع المستخدمين الاختباريين؟')) return;
    try {
        const { error, count } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('is_test_data', true);
        
        if (error) throw error;
        await logAudit('حذف بيانات اختبار', { type: 'users' });
        showToast(`🗑️ تم حذف المستخدمين الاختباريين`, 'success');
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

async function generateDummyRealEstate(count = 5) {
    const btn = safeEl('generateREBtn');
    if (btn) btn.disabled = true;
    
    const propTypes = ['apartment','villa','land','shop','office'];
    const listTypes = ['rent','sale'];
    
    const propMapAr = {
        apartment: 'شقة',
        villa: 'فيلا',
        land: 'أرض',
        shop: 'محل تجاري',
        office: 'مكتب'
    };
    const listMapAr = {
        rent: 'للكراء',
        sale: 'للبيع'
    };
    
    try {
        const inserted = [];
        for (let i = 0; i < count; i++) {
            const wilayaIndex = Math.floor(Math.random() * ALGERIA_WILAYAS.length) + 1;
            const wilayaName = ALGERIA_WILAYAS[wilayaIndex - 1];
            const propType = propTypes[Math.floor(Math.random() * propTypes.length)];
            const listType = listTypes[Math.floor(Math.random() * listTypes.length)];
            const price = Math.floor(500000 + Math.random() * 9500000);
            
            inserted.push({
                title: `${propMapAr[propType]} ${listMapAr[listType]} - ${wilayaName}`,
                property_type: propType,
                listing_type: listType,
                price,
                wilaya: wilayaIndex,
                status: 'active',
                is_featured: false,
                is_test_data: true,
                user_id: adminUser?.id,
                created_at: new Date().toISOString()
            });
        }
        
        const { error } = await supabaseAdmin.from('real_estate_listings').insert(inserted);
        if (error) throw error;
        
        await logAudit('توليد بيانات عقارات اختبارية', { count });
        showToast(`✅ تم إنشاء ${count} إعلان عقاري اختباري`, 'success');
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function deleteDummyRealEstate(bypassConfirm = false) {
    if (!bypassConfirm && !confirm('حذف جميع الإعلانات العقارية الاختبارية؟')) return;
    try {
        const { error } = await supabaseAdmin
            .from('real_estate_listings').delete().eq('is_test_data', true);
        if (error) throw error;
        showToast(`🗑️ تم حذف الإعلانات الاختبارية`, 'success');
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// MODAL MANAGEMENT - إدارة النوافذ المنبثقة
// ═══════════════════════════════════════════════════════════════

function openModal(modalId) {
    const modal = safeEl(modalId);
    const overlay = safeEl('adminModalOverlay');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAllAdminModals() {
    document.querySelectorAll('.admin-modal').forEach(m => {
        m.classList.remove('active');
        m.setAttribute('aria-hidden', 'true');
    });
    const overlay = safeEl('adminModalOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    currentTicketId = null;
    currentRealEstateId = null;
}

// إغلاق النوافذ بمفتاح Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllAdminModals();
});

// ═══════════════════════════════════════════════════════════════
// EXPORT UTILITIES - تصدير البيانات
// ═══════════════════════════════════════════════════════════════

function exportCSV(data, filename) {
    if (!data?.length) { showToast('لا توجد بيانات للتصدير', 'warning'); return; }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ تم تصدير البيانات', 'success');
}

function exportUsers() { exportCSV(allUsers, 'users'); }
function exportStores() { exportCSV(allStores, 'stores'); }

// ═══════════════════════════════════════════════════════════════
// STUBS & ALIASES - دوال مطلوبة من admin.html
// ═══════════════════════════════════════════════════════════════

// Modal helpers called directly from HTML
function closeEditModal() { closeAllAdminModals(); }
function closeReplyModal() { closeAllAdminModals(); }

// loadRealEstateListings is alias for loadRealEstate (called from HTML refresh button)
function loadRealEstateListings() { loadRealEstate(); }

// Audit search/filter stubs (HTML has search/filter inputs)
function searchAudit() {
    const term = (safeEl('auditSearch')?.value || '').trim().toLowerCase();
    const table = safeEl('auditTable');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = term && !text.includes(term) ? 'none' : '';
    });
}
function filterAudit() { searchAudit(); }

// markAllRead - mark all notifications as read
async function markAllRead() {
    if (!supabaseAdmin) return;
    try {
        const { error } = await supabaseAdmin
            .from('admin_notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        if (error) throw error;
        showToast('✅ تم تعليم كل الإشعارات كمقروءة', 'success');
        await loadNotifications();
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// filterNotifications stub
function filterNotifications() { loadNotifications(); }

// generateBroadcastLinks - called from broadcast section
async function generateBroadcastLinks() {
    const message = safeEl('broadcastMessage')?.value?.trim();
    const target = safeEl('broadcastTarget')?.value || 'active';
    
    if (!message) { showToast('يرجى كتابة رسالة أولاً', 'warning'); return; }
    
    try {
        let query = supabaseAdmin.from('users').select('phone, whatsapp, full_name, package_type');
        if (target === 'pending') query = query.eq('account_status', 'pending');
        else if (target === 'active') query = query.eq('account_status', 'active');
        else if (['basic','gold','premium','vip'].includes(target)) {
            query = query.eq('account_status', 'active').eq('package_type', target);
        }
        
        const { data, error } = await query.limit(50);
        if (error) throw error;
        
        const users = (data || []).filter(u => u.phone || u.whatsapp);
        
        const card = safeEl('broadcastLinksCard');
        const list = safeEl('broadcastLinksList');
        const countEl = safeEl('broadcastCount');
        if (countEl) countEl.textContent = users.length;
        
        if (card) card.style.display = 'block';
        
        if (list) {
            if (!users.length) {
                list.innerHTML = '<p class="empty-state">لا توجد أرقام هاتف</p>';
                return;
            }
            list.innerHTML = users.map(u => {
                const phone = u.whatsapp || u.phone;
                const personalized = message
                    .replace(/{name}/g, u.full_name || 'عميل')
                    .replace(/{plan}/g, u.package_type || '—');
                const cleanPhone = String(phone).replace(/\D/g, '');
                const full = cleanPhone.startsWith('0') ? '213' + cleanPhone.slice(1) : cleanPhone;
                const url = `https://wa.me/${full}?text=${encodeURIComponent(personalized)}`;
                return `
                    <div class="broadcast-link-item">
                        <span>${escapeHtml(u.full_name || '—')} (${escapeHtml(phone)})</span>
                        <a href="${url}" target="_blank" class="btn-sm btn-whatsapp">
                            <i class="fab fa-whatsapp"></i> إرسال
                        </a>
                    </div>
                `;
            }).join('');
        }
        
        showToast(`✅ تم توليد ${users.length} رابط`, 'success');
    } catch (e) {
        showToast(`خطأ: ${e.message}`, 'error');
    }
}

// previewBroadcastTargets
async function previewBroadcastTargets() {
    const target = safeEl('broadcastTarget')?.value || 'active';
    showToast(`جاري حساب المستلمين للفئة: ${target}...`, 'info');
    await generateBroadcastLinks();
}

// Dummy data: generateDummyData, showDummyData, hideDummyData, deleteDummyData
async function generateDummyData() {
    showToast('جاري توليد بيانات الاختبار...', 'info');
    await Promise.all([
        generateDummyUsers(5),
        generateDummyRealEstate(3)
    ]);
}

async function showDummyData() {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('users').update({ is_active: true }).eq('is_test_data', true);
        await supabaseAdmin.from('real_estate_listings').update({ status: 'active' }).eq('is_test_data', true);
        showToast('✅ تم إظهار البيانات الاختبارية', 'success');
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function hideDummyData() {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('users').update({ is_active: false }).eq('is_test_data', true);
        await supabaseAdmin.from('real_estate_listings').update({ status: 'hidden' }).eq('is_test_data', true);
        showToast('✅ تم إخفاء البيانات الاختبارية', 'success');
    } catch (e) { showToast(`خطأ: ${e.message}`, 'error'); }
}

async function deleteDummyData() {
    if (!confirm('حذف كل البيانات الاختبارية نهائياً؟')) return;
    showToast('جاري الحذف...', 'warning');
    await Promise.all([
        deleteDummyUsers(true),
        deleteDummyRealEstate(true)
    ]);
}

// publishAnnouncement - alias already added above
// Theme functions: previewTheme, saveTheme
function previewTheme() {
    const primaryColor = safeEl('themeColorPrimary')?.value || '#007B5E';
    const accentColor = safeEl('themeColorAccent')?.value || '#FFD700';
    const panel = safeEl('previewMockHeader');
    if (panel) {
        panel.style.background = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;
    }
    showToast('تم تحديث المعاينة', 'info');
}

async function saveTheme() {
    const name = safeEl('themeName')?.value?.trim();
    const slug = safeEl('themeSlug')?.value?.trim();
    if (!name || !slug) { showToast('يرجى ملء اسم المناسبة والمعرّف', 'warning'); return; }
    
    const themeData = {
        name,
        slug,
        primary_color: safeEl('themeColorPrimary')?.value,
        accent_color: safeEl('themeColorAccent')?.value,
        banner_url: safeEl('themeBannerUrl')?.value,
        start_at: safeEl('themeStartAt')?.value,
        end_at: safeEl('themeEndAt')?.value,
        css_override: safeEl('themeCssOverride')?.value,
        particles_cfg: safeEl('themeParticlesCfg')?.value,
        is_active: false,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabaseAdmin.from('event_themes').upsert(themeData, { onConflict: 'slug' });
        if (error && !error.message.includes('does not exist')) throw error;
        await logAudit('حفظ ثيم', { name, slug });
        showToast(`✅ تم حفظ ثيم "${name}"`, 'success');
    } catch (e) {
        console.warn('[Theme] Save error:', e.message);
        showToast(`تم الحفظ محلياً (جدول event_themes قد لا يكون موجوداً بعد)`, 'warning');
    }
}

// filterRealEstateListings: called from reAdminFilterWilaya/reAdminFilterType
function filterRealEstateListings() {
    const wilaya = safeEl('reAdminFilterWilaya')?.value || '';
    const type = safeEl('reAdminFilterType')?.value || '';
    
    // فلترة محلية على allRealEstateListings
    let filtered = allRealEstateListings;
    if (wilaya) filtered = filtered.filter(r => String(r.wilaya || '').includes(wilaya));
    if (type) filtered = filtered.filter(r => (r.offer_type || '') === type || (r.type || '') === type);
    
    const tbody = safeEl('realEstateTableBody');
    if (!tbody) return;
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">لا توجد نتائج للفلتر المحدد</td></tr>';
        return;
    }
    
    // Re-render just the tbody rows
    tbody.innerHTML = filtered.map(re => {
        const imgs = Array.isArray(re.images) ? re.images : (re.images ? [re.images] : []);
        const thumbSrc = imgs[0] || null;
        return `
        <tr id="re-row-${re.id}">
            <td>${thumbSrc ? `<img src="${escapeHtml(thumbSrc)}" class="re-thumbnail" onerror="this.style.display='none'">` : '<i class="fas fa-building" style="color:#8b949e;font-size:24px;"></i>'}</td>
            <td><strong>${escapeHtml(re.title || '—')}</strong></td>
            <td>${escapeHtml(getWilayaName(re.wilaya))}</td>
            <td>${re.price ? `${Number(re.price).toLocaleString('ar-DZ')} دج` : '—'}</td>
            <td>${escapeHtml(re.users?.phone || '—')}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${re.status !== 'hidden' ? 'checked' : ''} onchange="toggleREStatus('${re.id}', '${re.status}')">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${re.is_featured ? 'checked' : ''} onchange="toggleREFeatured('${re.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td>${formatDate(re.created_at)}</td>
            <td>
                <div class="action-btns">
                    ${imgs.length ? `<button type="button" class="btn-icon btn-secondary" onclick="viewREPhotos('${re.id}')"><i class="fas fa-images"></i> ${imgs.length}</button>` : ''}
                    <button type="button" class="btn-icon btn-whatsapp" onclick="openWhatsApp('${escapeHtml(re.users?.phone || '')}')"><i class="fab fa-whatsapp"></i></button>
                    <button type="button" class="btn-icon btn-danger" onclick="deleteRE('${re.id}', '${escapeHtml(re.title || '')}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// SECTION: DCB PAYMENTS (DIRECT CARRIER BILLING)
// ═══════════════════════════════════════════════════════════════

async function loadDCB() {
    console.log('[DCB] تحميل إعدادات ومعاملات DCB...');
    showLoading('sec-dcb');
    try {
        await Promise.all([
            loadDCBSettings(),
            loadDCBTransactions(),
            loadDCBStats()
        ]);
    } catch (e) {
        console.error('[DCB] خطأ في تحميل البيانات:', e);
        showToast('فشل في تحميل بيانات الدفع بالرصيد', 'error');
    } finally {
        hideLoading('sec-dcb');
    }
}

async function loadDCBSettings() {
    if (!supabaseAdmin) return;
    try {
        const { data, error } = await supabaseAdmin
            .from('dcb_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        
        if (data) {
            safeEl('dcbGlobalToggle').checked = !!data.is_enabled;
            safeEl('dcbGlobalMaxLimit').value = data.max_limit_per_order || 5000;
            safeEl('dcbGlobalMinOrder').value = data.min_order_amount || 100;
            safeEl('dcbGlobalFeePercent').value = data.platform_fee_percent || 5.00;
            safeEl('dcbGlobalDailyLimit').value = data.daily_limit_per_phone || 15000;
            safeEl('dcbGlobalOtpExpiry').value = data.otp_expiry_seconds || 120;
            safeEl('dcbFeeMobilis').value = data.mobilis_fee_percent || 2.00;
            safeEl('dcbFeeDjezzy').value = data.djezzy_fee_percent || 2.00;
            safeEl('dcbFeeOoredoo').value = data.ooredoo_fee_percent || 2.00;
            
            // Carriers
            const carriers = data.supported_carriers || [];
            safeEl('carrier_mobilis').checked = carriers.includes('mobilis');
            safeEl('carrier_djezzy').checked = carriers.includes('djezzy');
            safeEl('carrier_ooredoo').checked = carriers.includes('ooredoo');

            // Carrier API keys
            const apiKeys = data.carrier_api_keys || {};
            if (apiKeys.mobilis) {
                safeEl('api_key_mobilis').value = apiKeys.mobilis.api_key || '';
                safeEl('api_secret_mobilis').value = apiKeys.mobilis.api_secret || '';
                safeEl('endpoint_mobilis').value = apiKeys.mobilis.endpoint || '';
            }
            if (apiKeys.djezzy) {
                safeEl('api_key_djezzy').value = apiKeys.djezzy.api_key || '';
                safeEl('api_secret_djezzy').value = apiKeys.djezzy.api_secret || '';
                safeEl('endpoint_djezzy').value = apiKeys.djezzy.endpoint || '';
            }
            if (apiKeys.ooredoo) {
                safeEl('api_key_ooredoo').value = apiKeys.ooredoo.api_key || '';
                safeEl('api_secret_ooredoo').value = apiKeys.ooredoo.api_secret || '';
                safeEl('endpoint_ooredoo').value = apiKeys.ooredoo.endpoint || '';
            }
        }
    } catch (e) {
        console.error('[DCB Settings] Error:', e.message);
    }
}

async function saveDCBSettings() {
    if (!supabaseAdmin) return;
    try {
        const carriers = [];
        if (safeEl('carrier_mobilis').checked) carriers.push('mobilis');
        if (safeEl('carrier_djezzy').checked) carriers.push('djezzy');
        if (safeEl('carrier_ooredoo').checked) carriers.push('ooredoo');

        const updates = {
            is_enabled: safeEl('dcbGlobalToggle').checked,
            max_limit_per_order: parseFloat(safeEl('dcbGlobalMaxLimit').value) || 5000,
            min_order_amount: parseFloat(safeEl('dcbGlobalMinOrder').value) || 100,
            platform_fee_percent: parseFloat(safeEl('dcbGlobalFeePercent').value) || 5.00,
            daily_limit_per_phone: parseFloat(safeEl('dcbGlobalDailyLimit').value) || 15000,
            otp_expiry_seconds: parseInt(safeEl('dcbGlobalOtpExpiry').value) || 120,
            mobilis_fee_percent: parseFloat(safeEl('dcbFeeMobilis').value) || 2.00,
            djezzy_fee_percent: parseFloat(safeEl('dcbFeeDjezzy').value) || 2.00,
            ooredoo_fee_percent: parseFloat(safeEl('dcbFeeOoredoo').value) || 2.00,
            supported_carriers: carriers,
            updated_by: adminEmail,
            updated_at: new Date().toISOString()
        };

        const { data: existing } = await supabaseAdmin.from('dcb_settings').select('id').limit(1).maybeSingle();
        
        let err;
        if (existing) {
            const { error } = await supabaseAdmin.from('dcb_settings').update(updates).eq('id', existing.id);
            err = error;
        } else {
            const { error } = await supabaseAdmin.from('dcb_settings').insert(updates);
            err = error;
        }

        if (err) throw err;

        await logAudit('تحديث إعدادات DCB العامة', updates);
        showToast('✅ تم حفظ الإعدادات العامة بنجاح', 'success');
        
        if (window.DCBEngine) {
            window.DCBEngine._settingsCache = null; 
        }
        await loadDCB();
    } catch (e) {
        showToast(`خطأ في الحفظ: ${e.message}`, 'error');
    }
}

async function saveDCBCarriers() {
    if (!supabaseAdmin) return;
    try {
        const carrier_api_keys = {
            mobilis: {
                api_key: safeEl('api_key_mobilis').value.trim(),
                api_secret: safeEl('api_secret_mobilis').value.trim(),
                endpoint: safeEl('endpoint_mobilis').value.trim()
            },
            djezzy: {
                api_key: safeEl('api_key_djezzy').value.trim(),
                api_secret: safeEl('api_secret_djezzy').value.trim(),
                endpoint: safeEl('endpoint_djezzy').value.trim()
            },
            ooredoo: {
                api_key: safeEl('api_key_ooredoo').value.trim(),
                api_secret: safeEl('api_secret_ooredoo').value.trim(),
                endpoint: safeEl('endpoint_ooredoo').value.trim()
            }
        };

        const { data: existing } = await supabaseAdmin.from('dcb_settings').select('id').limit(1).maybeSingle();
        
        let err;
        if (existing) {
            const { error } = await supabaseAdmin
                .from('dcb_settings')
                .update({ 
                    carrier_api_keys,
                    updated_by: adminEmail,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            err = error;
        } else {
            const { error } = await supabaseAdmin.from('dcb_settings').insert({
                carrier_api_keys,
                updated_by: adminEmail
            });
            err = error;
        }

        if (err) throw err;

        await logAudit('تحديث مفاتيح ربط DCB', { info: 'تم تعديل مفاتيح API لشبكات الاتصالات' });
        showToast('✅ تم حفظ مفاتيح الربط بنجاح', 'success');
        
        if (window.DCBEngine) {
            window.DCBEngine._settingsCache = null; 
        }
    } catch (e) {
        showToast(`خطأ في الحفظ: ${e.message}`, 'error');
    }
}

let _dcbTransactions = [];

async function loadDCBTransactions() {
    if (!supabaseAdmin) return;
    const tbody = safeEl('dcbTransactionsTable');
    if (!tbody) return;

    try {
        const { data, error } = await supabaseAdmin
            .from('dcb_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        _dcbTransactions = data || [];
        renderDCBTransactions(_dcbTransactions);
    } catch (e) {
        console.error('[DCB Transactions] Error:', e.message);
        tbody.innerHTML = `<tr><td colspan="9" class="error-row">خطأ في تحميل المعاملات: ${escapeHtml(e.message)}</td></tr>`;
    }
}

function renderDCBTransactions(txs) {
    const tbody = safeEl('dcbTransactionsTable');
    if (!tbody) return;

    if (!txs.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">لا توجد معاملات بعد</td></tr>';
        return;
    }

    const carrierNames = {
        mobilis: 'موبيليس',
        djezzy: 'جازي',
        ooredoo: 'أوريدو'
    };

    const statusMap = {
        'pending': '<span class="status-badge status-pending">قيد التحقق</span>',
        'otp_sent': '<span class="status-badge status-pending">تم إرسال OTP</span>',
        'otp_verified': '<span class="status-badge status-active">تم تأكيد OTP</span>',
        'charging': '<span class="status-badge status-pending">جاري الخصم</span>',
        'completed': '<span class="status-badge status-active">مكتملة</span>',
        'failed': '<span class="status-badge status-rejected">فاشلة</span>',
        'refunded': '<span class="status-badge status-suspended">مسترجعة</span>',
        'expired': '<span class="status-badge status-rejected">منتهية</span>'
    };

    tbody.innerHTML = txs.map(tx => `
        <tr>
            <td style="font-family: monospace; font-size: 11px;">${tx.id.slice(0,8)}...</td>
            <td>${escapeHtml(tx.phone_number)}</td>
            <td>${carrierNames[tx.carrier] || tx.carrier}</td>
            <td style="font-weight: bold; color: #fff;">${(tx.amount || 0).toLocaleString()} دج</td>
            <td style="color: #ff4757;">${(tx.platform_fee || 0).toLocaleString()} دج</td>
            <td style="color: #ffa500;">${(tx.carrier_fee || 0).toLocaleString()} دج</td>
            <td style="color: #00ffc3;">${(tx.net_amount || 0).toLocaleString()} دج</td>
            <td>${statusMap[tx.status] || tx.status}</td>
            <td>${formatDate(tx.created_at)}</td>
        </tr>
    `).join('');
}

function filterDCBTransactions() {
    const phone = (safeEl('dcbSearchPhone')?.value || '').trim().toLowerCase();
    const carrier = safeEl('dcbFilterCarrier')?.value || 'all';
    const status = safeEl('dcbFilterStatus')?.value || 'all';

    let filtered = _dcbTransactions;

    if (phone) {
        filtered = filtered.filter(t => t.phone_number.includes(phone));
    }
    if (carrier !== 'all') {
        filtered = filtered.filter(t => t.carrier === carrier);
    }
    if (status !== 'all') {
        filtered = filtered.filter(t => t.status === status);
    }

    renderDCBTransactions(filtered);
}

async function loadDCBStats() {
    if (!supabaseAdmin) return;
    try {
        const { data: settings } = await supabaseAdmin.from('dcb_settings').select('platform_fee_percent').limit(1).maybeSingle();
        const feePercent = settings ? settings.platform_fee_percent : 5.00;
        
        safeEl('dcbStatFeePercent').textContent = `النسبة الحالية: ${feePercent}%`;

        const { data, error } = await supabaseAdmin.from('dcb_transactions').select('amount, platform_fee, status');
        if (error) throw error;

        const txs = data || [];
        const total = txs.length;
        const successTxs = txs.filter(t => t.status === 'completed');
        const successCount = successTxs.length;
        const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        
        const volume = successTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const fees = successTxs.reduce((sum, t) => sum + (parseFloat(t.platform_fee) || 0), 0);

        safeEl('dcbStatTotalTx').textContent = total.toLocaleString();
        safeEl('dcbStatSuccessRate').textContent = `نسبة النجاح: ${successRate}%`;
        safeEl('dcbStatTotalVolume').textContent = `${volume.toLocaleString()} دج`;
        safeEl('dcbStatFeesRevenue').textContent = `${fees.toLocaleString()} دج`;

        // Calculate B2B sales segmented by carrier
        const { data: b2bOrders } = await supabaseAdmin
            .from('orders')
            .select('items, customer_phone, notes, total_price');
        
        let mobilisSales = 0;
        let djezzySales = 0;
        let ooredooSales = 0;
        
        (b2bOrders || []).forEach(order => {
            const isB2B = (order.notes && order.notes.includes('B2B')) || 
                          (Array.isArray(order.items) && order.items.some(i => i.wholesale === true));
            const isPlatform = isB2B && !(order.notes && order.notes.includes('تواصل مباشر'));
            
            if (isPlatform) {
                let fullPrice = 0;
                let itemsList = Array.isArray(order.items) ? order.items : [];
                try {
                    if (typeof order.items === 'string') {
                        itemsList = JSON.parse(order.items);
                    }
                } catch(e) {}
                
                itemsList.forEach(i => {
                    const q = parseInt(i.qty || i.quantity || 0);
                    const p = parseFloat(i.price || i.unit_price || 0);
                    fullPrice += q * p;
                });
                if (fullPrice === 0) {
                    const matchTotal = order.notes?.match(/الإجمالي:\s*([\d,]+)/);
                    if (matchTotal) fullPrice = parseFloat(matchTotal[1].replace(/,/g, ''));
                }
                if (fullPrice === 0) {
                    fullPrice = (parseFloat(order.total_price) || 0) * 5;
                }
                
                const phone = (order.customer_phone || '').trim().replace(/\D/g, '');
                if (phone.startsWith('05') || phone.startsWith('2135') || phone.startsWith('5')) {
                    djezzySales += fullPrice;
                } else if (phone.startsWith('06') || phone.startsWith('2136') || phone.startsWith('6')) {
                    mobilisSales += fullPrice;
                } else if (phone.startsWith('07') || phone.startsWith('2137') || phone.startsWith('7')) {
                    ooredooSales += fullPrice;
                }
            }
        });

        const mEl = safeEl('b2bSalesMobilis');
        const dEl = safeEl('b2bSalesDjezzy');
        const oEl = safeEl('b2bSalesOoredoo');
        
        if (mEl) mEl.textContent = `${Math.round(mobilisSales).toLocaleString('ar-DZ')} دج`;
        if (dEl) dEl.textContent = `${Math.round(djezzySales).toLocaleString('ar-DZ')} دج`;
        if (oEl) oEl.textContent = `${Math.round(ooredooSales).toLocaleString('ar-DZ')} دج`;

    } catch (e) {
        console.warn('[DCB Stats] Error:', e.message);
    }
}

// Global functions for admin switchSection to bind to
window.saveDCBSettings = saveDCBSettings;
window.saveDCBCarriers = saveDCBCarriers;
window.filterDCBTransactions = filterDCBTransactions;

console.log('[Admin] ✅ admin.js V4.9 تم التحميل بنجاح - supabaseAdmin متغير محلي آمن');

