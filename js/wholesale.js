// js/wholesale.js — Complete rewrite v2
// ═══════════════════════════════════════════════════════

/* ── STATE ── */
let allWholesaleProducts    = [];
let filteredWholesaleProducts = [];
let currentCategory         = 'all';
let selectedProduct         = null;
let currentImageIndex       = 0;
let productImages           = [];
let adSlides                = [];
let adCurrentIdx            = 0;
let adTimer                 = null;
let wholesaleMerchants      = [];

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    initWholesale();
    // close dropdown on outside click
    document.addEventListener('click', e => {
        const wrap = document.getElementById('merchantsDropdownWrap');
        if (wrap && !wrap.contains(e.target)) closeMerchantsDropdown();
    });
});

function applyTheme() {
    const t = localStorage.getItem('kh_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    const icon  = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon)  icon.textContent  = t === 'dark' ? 'dark_mode' : 'light_mode';
    if (label) label.textContent = t === 'dark' ? 'داكن' : 'فاتح';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kh_theme', next);
    applyTheme();
}

async function initWholesale() {
    await Promise.all([
        fetchWholesaleProducts(),
        fetchSiteAds()
    ]);
}

/* ══════════════════════════════════════════════════════
   FETCH PRODUCTS
══════════════════════════════════════════════════════ */
let approvedMerchants = []; // التجار المعتمدون فقط (is_wholesaler=true) — لقائمة dropdown

async function fetchWholesaleProducts() {
    const supabase   = window.getSupabaseClient?.();
    const loader     = document.getElementById('wholesaleLoader');
    const grid       = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');

    if (!supabase) {
        if (loader) loader.innerHTML = '<p style="color:red;font-size:13px;">خطأ: تعذر الاتصال بقاعدة البيانات.</p>';
        return;
    }

    try {
        // ① جميع التجار النشطين (لعرض معلومات المنتج)
        const { data: allMerchants, error: merchantError } = await supabase
            .from('merchant')
            .select('email,name,phone,store_image,whatsapp,is_wholesaler')
            .eq('account_status', 'active');

        if (merchantError) {
            console.error("Error fetching B2B merchants:", merchantError);
        }

        wholesaleMerchants = (allMerchants || []).map(m => ({
            ...m,
            logo: m.store_image // map store_image to logo for compatibility
        }));
        
        const merchantMap = new Map(wholesaleMerchants.map(m => [m.email, m]));

        // ② التجار المعتمدون فقط — للقائمة dropdown
        approvedMerchants = wholesaleMerchants.filter(m => m.is_wholesaler === true);

        // ③ كل منتجات الجملة (show_in_b2b = true)
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .not('wholesale_price', 'is', 'null')
            .gt('wholesale_price', 0);

        if (error) throw error;

        // Filter: show_in_b2b must be strictly true
        const visible = (products || []).filter(p => p.show_in_b2b === true);

        allWholesaleProducts = visible.map(p => {
            const m = merchantMap.get(p.owner) || {};
            return {
                ...p,
                merchant_name:      m.name      || 'مورد معتمد',
                merchant_phone:     m.phone     || '',
                merchant_whatsapp:  m.whatsapp  || m.phone || '',
                merchant_logo:      m.logo      || '',
                is_approved:        m.is_wholesaler === true,
                moq: p.min_order_qty || (p.details?.moq ? parseInt(p.details.moq) : 10) || 10
            };
        });

        filteredWholesaleProducts = [...allWholesaleProducts];

        // Update hero stats — count all approved merchants (even without products)
        const sS = document.getElementById('statSuppliers');
        const sP = document.getElementById('statProducts');
        if (sS) sS.textContent = (approvedMerchants.length) + '+';
        if (sP) sP.textContent = allWholesaleProducts.length + '+';

        if (loader) loader.style.display = 'none';
        if (grid) grid.style.display = 'grid';
        renderProducts();

        // ✅ تحديث dropdown التجار بعد اكتمال جلب البيانات مباشرة
        renderMerchantsDropdown();

    } catch (err) {
        console.error('Wholesale fetch error:', err);
        if (loader) loader.innerHTML =
            `<p style="color:var(--brand);font-size:13px;">خطأ: ${err.message}</p>`;
    }
}

/* ══════════════════════════════════════════════════════
   B2B FIXED SITE ADS
══════════════════════════════════════════════════════ */
async function fetchSiteAds() {
    const supabase = window.getSupabaseClient?.();
    if (!supabase) { renderFallbackAds(); return; }

    try {
        const now = new Date().toISOString();
        // Fetch all active ads from platform_announcements
        const { data, error } = await supabase
            .from('platform_announcements')
            .select('*')
            .eq('is_active', true)
            .or(`end_at.is.null,end_at.gt.${now}`)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) { renderFallbackAds(); return; }

        // Filter ads by their targeted B2B fixed slots
        const leftAd      = data.find(ad => ad.show_on?.includes('wholesale_left'));
        const midTopAd    = data.find(ad => ad.show_on?.includes('wholesale_mid_top'));
        const midBottomAd = data.find(ad => ad.show_on?.includes('wholesale_mid_bottom'));

        renderFixedAd('adWholesaleLeft', leftAd);
        renderFixedAd('adWholesaleMidTop', midTopAd);
        renderFixedAd('adWholesaleMidBottom', midBottomAd);

    } catch (e) {
        console.error("Error loading B2B ads:", e);
        renderFallbackAds();
    }
}

function renderFallbackAds() {
    renderFixedAd('adWholesaleLeft', null);
    renderFixedAd('adWholesaleMidTop', null);
    renderFixedAd('adWholesaleMidBottom', null);
}

function renderFixedAd(elementId, ad) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!ad) {
        el.innerHTML = `<div class="ad-card-placeholder">📢 مساحة إعلانية شاغرة B2B</div>`;
        el.style.cursor = 'default';
        el.onclick = null;
        return;
    }

    const typeLabels = {
        promo:   'ترويج',
        info:    'تنويه',
        warning: 'تحذير',
        event:   'حدث'
    };

    let mediaHtml = '';
    if (ad.video_url) {
        mediaHtml = `
            <div class="ad-media-wrap">
                <video src="${ad.video_url}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
            </div>`;
    } else if (ad.image_url) {
        mediaHtml = `
            <div class="ad-media-wrap">
                <img src="${ad.image_url}" alt="${ad.title || ''}" onerror="this.parentElement.style.display='none'">
            </div>`;
    } else {
        mediaHtml = `<div class="ad-media-wrap"><div class="ad-card-placeholder">📢</div></div>`;
    }

    el.innerHTML = `
        ${mediaHtml}
        <div class="ad-overlay"></div>
        <div class="ad-info-overlay">
            <span class="ad-title-tag">${typeLabels[ad.type] || 'إعلان'}</span>
            <div class="ad-heading">${ad.title || ''}</div>
            <div class="ad-desc">${ad.content || ''}</div>
            ${ad.cta_text ? `<a class="ad-action-btn" href="${ad.cta_url || '#'}" target="_blank">${ad.cta_text}</a>` : ''}
        </div>
    `;

    // Click behavior if CTA text is absent but CTA url is provided
    if (ad.cta_url && !ad.cta_text) {
        el.style.cursor = 'pointer';
        el.onclick = () => window.open(ad.cta_url, '_blank');
    } else {
        el.style.cursor = 'default';
        el.onclick = null;
    }
}

/* ══════════════════════════════════════════════════════
   MERCHANTS DROPDOWN
══════════════════════════════════════════════════════ */
function renderMerchantsDropdown() {
    const list = document.getElementById('merchantsDropdownList');
    if (!list) return;

    // عدد المنتجات لكل تاجر
    const countMap = {};
    allWholesaleProducts.forEach(p => {
        countMap[p.owner] = (countMap[p.owner] || 0) + 1;
    });

    if (approvedMerchants.length === 0) {
        list.innerHTML = '<div class="dropdown-empty">لا يوجد تجار معتمدون حالياً</div>';
        return;
    }

    list.innerHTML = `
        <div class="dropdown-merchants-list">
            ${approvedMerchants.map(m => {
                const count    = countMap[m.email] || 0;
                const initials = (m.name || 'M')[0];
                const avatarHtml = m.logo
                    ? `<img src="${m.logo}" onerror="this.parentElement.textContent='${initials}'">`
                    : initials;
                return `
                <div class="merchant-card-mini" onclick="filterByMerchant('${m.email}')">
                    <div class="merchant-avatar">${avatarHtml}</div>
                    <div class="merchant-info-mini">
                        <div class="m-name">
                            ${m.name}
                            <span style="display:inline-flex;align-items:center;gap:2px;background:linear-gradient(135deg,#00c896,#00a87a);color:#fff;font-size:9px;padding:1px 5px;border-radius:10px;margin-right:4px;font-weight:700;vertical-align:middle;">✓ معتمد</span>
                        </div>
                        <div class="m-meta">
                            <span class="m-products">
                                <span class="material-symbols-outlined" style="font-size:11px;">inventory_2</span>
                                ${count} منتج B2B
                            </span>
                        </div>
                    </div>
                    <span class="material-symbols-outlined" style="font-size:16px;color:var(--brand);">chevron_left</span>
                </div>`;
            }).join('')}
        </div>
        <div class="dropdown-footer">
            <a href="#" onclick="filterByMerchant('all'); return false;">عرض كل المنتجات</a>
        </div>`;
}

function toggleMerchantsDropdown() {
    const menu    = document.getElementById('merchantsDropdownMenu');
    const chevron = document.getElementById('merchantsChevron');
    if (!menu) return;
    const isOpen = menu.classList.toggle('open');
    if (chevron) chevron.textContent = isOpen ? 'expand_less' : 'expand_more';
    if (isOpen && wholesaleMerchants.length === 0) {
        // Still loading — try again
        renderMerchantsDropdown();
    }
}

function closeMerchantsDropdown() {
    const menu    = document.getElementById('merchantsDropdownMenu');
    const chevron = document.getElementById('merchantsChevron');
    if (menu)    menu.classList.remove('open');
    if (chevron) chevron.textContent = 'expand_more';
}

function filterByMerchant(email) {
    closeMerchantsDropdown();
    if (email === 'all') {
        filteredWholesaleProducts = [...allWholesaleProducts];
    } else {
        filteredWholesaleProducts = allWholesaleProducts.filter(p => p.owner === email);
    }
    renderProducts();
    scrollToProducts();
}

/* ══════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════ */
const CAT_MAP = {
    all:         { label: 'كل المنتجات', icon: 'apps' },
    electronics: { label: 'إلكترونيات',  icon: 'devices' },
    clothing:    { label: 'ملابس وموضة', icon: 'checkroom' },
    home:        { label: 'منزل وأثاث',  icon: 'weekend' },
    cosmetics:   { label: 'تجميل وعناية',icon: 'spa' },
    food:        { label: 'غذاء وزراعة', icon: 'nutrition' },
    other:       { label: 'أخرى',        icon: 'more_horiz' }
};

function filterByCategory(category, btn) {
    currentCategory = category;

    // Update pill active state
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList) btn.classList.add('active');

    // Filter
    filteredWholesaleProducts = allWholesaleProducts.filter(p => {
        const catOk    = category === 'all' || p.category === category;
        const searchQ  = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
        const searchOk = !searchQ || p.name.toLowerCase().includes(searchQ) ||
                         (p.description||'').toLowerCase().includes(searchQ) ||
                         p.merchant_name.toLowerCase().includes(searchQ);
        return catOk && searchOk;
    });
    renderProducts();
}

function filterProducts() {
    filterByCategory(currentCategory,
        document.querySelector(`.cat-pill[data-cat="${currentCategory}"]`));
}

/* ══════════════════════════════════════════════════════
   RENDER PRODUCTS GRID
══════════════════════════════════════════════════════ */
function renderProducts() {
    const grid       = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const label      = document.getElementById('productCountLabel');
    if (!grid) return;

    // Sort
    const sortBy = document.getElementById('sortBy')?.value || 'recent';
    const arr    = [...filteredWholesaleProducts];
    if (sortBy === 'price-low')  arr.sort((a,b) => a.wholesale_price - b.wholesale_price);
    else if (sortBy === 'price-high') arr.sort((a,b) => b.wholesale_price - a.wholesale_price);
    else if (sortBy === 'moq-low')    arr.sort((a,b) => a.moq - b.moq);
    else                              arr.sort((a,b) => b.id - a.id);

    if (label) label.textContent = arr.length
        ? `${arr.length} منتج — مباشرة من الموردين الموثّقين`
        : 'لا توجد منتجات';

    if (arr.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = 'grid';

    grid.innerHTML = arr.map((p, i) => {
        const deposit  = Math.round(p.wholesale_price * p.moq * 0.20).toLocaleString('ar-DZ');
        const img      = p.image || 'images/placeholder.png';
        const catLabel = CAT_MAP[p.category]?.label || '';

        // شرائح الأسعار — محددة من التاجر فقط
        const volDiscounts = p.details?.volume_discounts || [];
        let tiersHtml = `<div class="price-tier">
                <span class="tier-range">${p.moq}+ قطعة</span>
                <span class="tier-price best">${p.wholesale_price.toLocaleString('ar-DZ')} دج</span>
            </div>`;
        if (volDiscounts.length > 0) {
            const sorted = [...volDiscounts].sort((a,b) => a.min_qty - b.min_qty).slice(0, 2);
            sorted.forEach(tier => {
                const discPct = Math.round((1 - (tier.price / p.wholesale_price)) * 100);
                tiersHtml += `<div class="price-tier">
                <span class="tier-range">${tier.min_qty}+ قطعة${discPct > 0 ? ` <em style="color:#f59e0b;font-size:10px;font-style:normal;">−${discPct}%</em>` : ''}</span>
                <span class="tier-price">${parseFloat(tier.price).toLocaleString('ar-DZ')} دج</span>
            </div>`;
            });
        }

        return `
        <div class="prod-card anim-fade-up" style="animation-delay:${Math.min(i*0.04,0.6)}s"
             onclick="openProductModal(${JSON.stringify(p.id)})">
            <div class="card-img-wrap">
                <img class="card-img" src="${img}" alt="${p.name}"
                     onerror="this.src='images/placeholder.png'"/>
                <div class="card-badge-wrap">
                    <span class="badge badge-gold">عربون 20%</span>
                </div>
                ${catLabel ? `<div class="card-badge-wrap-left">
                    <span class="badge badge-blue">${catLabel}</span>
                </div>` : ''}
            </div>
            <div class="card-body">
                <div class="card-merchant">
                    <span class="material-symbols-outlined" style="font-size:13px;">store</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90px;">${p.merchant_name}</span>
                    ${p.is_approved
                        ? `<span class="material-symbols-outlined verified-icon" style="margin-right:auto;color:#00c896;" title="تاجر معتمد من الإدارة">verified</span>`
                        : ''}
                </div>
                <div class="card-name">${p.name}</div>
                <div class="price-tiers">
                    ${tiersHtml}
                </div>
                <div class="card-footer-info">
                    <span class="moq">MOQ: ${p.moq}</span>
                    <span class="delivery">
                        <span class="material-symbols-outlined" style="font-size:11px;">payments</span>
                        ${deposit} دج
                    </span>
                </div>
            </div>
        </div>`;
    }).join('');
}

/* ══════════════════════════════════════════════════════
   OPEN PRODUCT → redirect to order page
══════════════════════════════════════════════════════ */
function openProductModal(productId) {
    const p = allWholesaleProducts.find(x => x.id === productId);
    if (!p) return;
    // Store product in sessionStorage then redirect to order page
    sessionStorage.setItem('b2b_selected_product', JSON.stringify(p));
    window.location.href = `wholesale-order.html?pid=${productId}`;
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function scrollToProducts() {
    const el = document.getElementById('productsSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}
