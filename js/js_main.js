// ========== المتغيرات العامة ==========

let cachedElements = {};
let allStores = [];
let filteredStores = [];
let currentPage = 1;
const itemsPerPage = 12;

// أولويات الباقات (الأعلى يظهر أولاً)
const PACKAGE_PRIORITY = { vip: 4, premium: 3, gold: 2, basic: 1 };

// ========== 1. تخزين العناصر ==========

function cacheElements() {
  cachedElements = {
    mainMenu: document.getElementById('mainMenu'),
    languageMenu: document.getElementById('languageMenu'),
    modalOverlay: document.getElementById('modalOverlay'),
    contactModal: document.getElementById('contactModal'),
    langButton: document.querySelector('.language-dropdown button'),
    menuButton: document.querySelector('.menu-button')
  };
}

// ========== 2. وظائف القوائم ==========

function toggleMenu(event) {
  if (event) event.stopPropagation();
  const { mainMenu, modalOverlay, languageMenu } = cachedElements;
  if (!mainMenu || !modalOverlay) return;
  if (languageMenu && languageMenu.classList.contains('show')) languageMenu.classList.remove('show');
  const isOpening = !mainMenu.classList.contains('show');
  if (isOpening) {
    mainMenu.classList.add('show');
    modalOverlay.classList.add('active');
    document.body.classList.add('no-scroll');
  } else {
    mainMenu.classList.remove('show');
    modalOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
}

function toggleLangMenu(event) {
  if (event) event.stopPropagation();
  const { languageMenu, mainMenu, modalOverlay } = cachedElements;
  if (!languageMenu) return;
  if (mainMenu && mainMenu.classList.contains('show')) {
    mainMenu.classList.remove('show');
    if (modalOverlay) modalOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
  languageMenu.classList.toggle('show');
}

function toggleContactModal(event) {
  if (event) event.stopPropagation();
  const { contactModal, modalOverlay } = cachedElements;
  if (!contactModal || !modalOverlay) return;
  const isOpening = !contactModal.classList.contains('active');
  if (isOpening) {
    closeAllModals();
    contactModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.classList.add('no-scroll');
  } else {
    contactModal.classList.remove('active');
    modalOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
}

function closeAllModals() {
  const { mainMenu, languageMenu, contactModal, modalOverlay } = cachedElements;
  if (mainMenu) mainMenu.classList.remove('show');
  if (languageMenu) languageMenu.classList.remove('show');
  if (contactModal) contactModal.classList.remove('active');
  if (modalOverlay) modalOverlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
}

// ========== 3. إدارة الأحداث ==========

function setupOptimizedEventListeners() {
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAllModals();
  }, true);
}

function handleClickOutside(event) {
  const { languageMenu, langButton, mainMenu, menuButton, modalOverlay } = cachedElements;
  if (languageMenu && languageMenu.classList.contains('show')) {
    if (!languageMenu.contains(event.target) && !(langButton && langButton.contains(event.target))) {
      languageMenu.classList.remove('show');
    }
  }
  if (mainMenu && mainMenu.classList.contains('show')) {
    if (!mainMenu.contains(event.target) && !(menuButton && menuButton.contains(event.target))) {
      closeAllModals();
    }
  }
  if (modalOverlay && modalOverlay.classList.contains('active')) {
    if (event.target === modalOverlay) closeAllModals();
  }
}

// ========== 4. تحميل المتاجر من Supabase (مرتبة حسب الباقة) ==========

async function loadStores() {
  const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
  const loadingEl = document.getElementById('loadingMessage');
  const container = document.getElementById('storesContainer');

  if (!supabase) {
    if (loadingEl) loadingEl.textContent = 'تعذر الاتصال بقاعدة البيانات';
    console.error('❌ Supabase غير متصل');
    return;
  }

  if (loadingEl) loadingEl.style.display = 'block';

  try {
    // جلب جميع التجار النشطين
    const { data, error } = await supabase
      .from('merchant')
      .select('*')
      .eq('account_status', 'active');

    if (error) throw error;

    allStores = (data || []).map(m => ({
      ...m,
      store_name: m.name || 'متجر بدون اسم',
      store_image: m.store_image || m.avatar || '',
      category: m.category || '',
      package_type: m.package_type || 'basic',
      priority: PACKAGE_PRIORITY[m.package_type] || 1
    }));

    // ترتيب: VIP أولاً → Premium → Gold → Basic
    allStores.sort((a, b) => b.priority - a.priority);

    filteredStores = [...allStores];

    // عرض شريط إعلانات VIP
    renderVIPAdsBanner();

    // عرض المتاجر
    renderStoresGrid();

    if (loadingEl) loadingEl.style.display = 'none';

    console.log(`✅ تم تحميل ${allStores.length} متجر (مرتبة حسب الباقة)`);
  } catch (err) {
    console.error('❌ خطأ في تحميل المتاجر:', err);
    if (loadingEl) loadingEl.textContent = 'حدث خطأ في تحميل المتاجر';
  }
}

// ========== 5. شريط إعلانات VIP (معرض متمدد — hover للتوسع) ==========

let vipSlideIndex = 0;
let vipSlideInterval = null;

function renderVIPAdsBanner() {
  const gallery = document.getElementById('vipGallery');
  const section = document.getElementById('vipGallerySection');
  if (!gallery) return;

  const vipStores = allStores.filter(s => s.package_type === 'vip').slice(0, 8);

  if (vipStores.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  gallery.innerHTML = '';
  const fragment = document.createDocumentFragment();

  vipStores.forEach((store, index) => {
    const item = document.createElement('div');
    item.className = `gallery-item ${index === 0 ? 'active' : ''}`;
    const imgSrc = store.ad_image || store.store_image || 'images/placeholder.png';
    item.innerHTML = `
      <img src="${imgSrc}" alt="${store.ad_title || store.store_name}" loading="lazy">
      <div class="item-info">
        <span class="vip-tag">👑 VIP</span>
        <h3>${store.ad_title || store.store_name}</h3>
        <p>${store.category || 'متجر متميز'}</p>
        <span class="gallery-visit-hint">اضغط للزيارة ←</span>
      </div>
    `;
    // Hover expands the item
    item.addEventListener('mouseenter', () => {
      document.querySelectorAll('#vipGallery .gallery-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      if (vipSlideInterval) clearInterval(vipSlideInterval);
    });
    // Click navigates to store
    item.addEventListener('click', () => {
      window.location.href = 'store.html?email=' + encodeURIComponent(store.email);
    });
    fragment.appendChild(item);
  });

  gallery.appendChild(fragment);
  if (section) section.style.display = 'block';

  // سلايدر تلقائي كل 8 ثوانٍ (يُوقف عند الـ hover)
  if (vipStores.length > 1) {
    if (vipSlideInterval) clearInterval(vipSlideInterval);
    vipSlideIndex = 0;
    vipSlideInterval = setInterval(() => {
      const items = gallery.querySelectorAll('.gallery-item');
      if (items.length === 0) return;
      items[vipSlideIndex].classList.remove('active');
      vipSlideIndex = (vipSlideIndex + 1) % items.length;
      items[vipSlideIndex].classList.add('active');
    }, 8000);
    // استئناف السلايدر عند مغادرة المعرض
    gallery.addEventListener('mouseleave', () => {
      if (vipSlideInterval) clearInterval(vipSlideInterval);
      vipSlideIndex = 0;
      vipSlideInterval = setInterval(() => {
        const items = gallery.querySelectorAll('.gallery-item');
        if (items.length === 0) return;
        items[vipSlideIndex].classList.remove('active');
        vipSlideIndex = (vipSlideIndex + 1) % items.length;
        items[vipSlideIndex].classList.add('active');
      }, 8000);
    });
  }
}

// ========== 6. عرض شبكة المتاجر (مع شارات الباقات) ==========

function renderStoresGrid() {
  const container = document.getElementById('storesContainer');
  if (!container) return;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredStores.slice(startIndex, startIndex + itemsPerPage);

  const fragment = document.createDocumentFragment();

  const badgeMap = {
    vip:     { text: '👑 VIP',     cls: 'badge-vip' },
    premium: { text: '💎 Premium', cls: 'badge-premium' },
    gold:    { text: '🥇 Gold',    cls: 'badge-gold' },
    basic:   { text: '',           cls: '' }
  };

  pageItems.forEach((store, index) => {
    const badge = badgeMap[store.package_type] || badgeMap.basic;

    // ─── شارات FOMO ───
    const now = new Date();
    const created = store.created_at ? new Date(store.created_at) : null;
    const isNew      = created && (now - created) / (1000 * 60 * 60 * 24) < 7;
    const isFeatured = !!store.is_featured;
    const isHot      = (store.visitor_count || 0) > 50;
    const fomoHtml = [
      isFeatured ? '<span class="fomo-badge featured">⭐ مميز</span>' : '',
      isNew       ? '<span class="fomo-badge new-store">✨ جديد</span>'  : '',
      isHot       ? '<span class="fomo-badge hot">🔥 شائع</span>'        : ''
    ].join('');

    const storeCard = document.createElement('div');
    storeCard.className = `store-card pkg-${store.package_type}`;
    storeCard.style.animationDelay = `${index * 0.03}s`;
    storeCard.innerHTML = `
      ${badge.text ? `<span class="store-badge ${badge.cls}">${badge.text}</span>` : ''}
      <div class="store-image">
        <img src="images/placeholder.png"
             data-src="${store.store_image || 'images/placeholder.png'}"
             alt="${store.store_name}"
             loading="lazy"
             class="lazy-image">
        ${fomoHtml ? `<div class="fomo-badges">${fomoHtml}</div>` : ''}
      </div>
      <div class="store-info">
        <h3 class="store-name">${store.store_name}</h3>
        <span class="store-category">${store.category || 'عام'}</span>
      </div>
    `;
    storeCard.addEventListener('click', () => {
      window.location.href = 'store.html?email=' + encodeURIComponent(store.email);
    });
    fragment.appendChild(storeCard);
  });

  container.innerHTML = '';

  if (pageItems.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;padding:40px;">لا توجد متاجر حالياً</p>';
  } else {
    container.appendChild(fragment);
  }

  updatePaginationUI();
  setupLazyLoading();
}

// ========== 7. البحث والتصنيف ==========

window.filterByCategory = function(category) {
  // تحديث الستايل للقائمة الجانبية
  document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
  const clickedItem = event ? event.currentTarget : null;
  if (clickedItem) clickedItem.classList.add('active');

  const searchBox = document.getElementById('searchBox');
  if (searchBox) searchBox.value = '';

  if (!category || category === '') {
    filteredStores = [...allStores];
  } else {
    filteredStores = allStores.filter(s => 
      (s.category || '').toLowerCase().includes(category.toLowerCase())
    );
  }
  currentPage = 1;
  renderStoresGrid();
};

function searchStores() {
  // إزالة الفلتر الجانبي عند البحث
  document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
  document.querySelector('.category-list li:first-child')?.classList.add('active');

  const searchBox = document.getElementById('searchBox');
  if (!searchBox) return;
  const query = searchBox.value.trim().toLowerCase();
  if (query === '') {
    filteredStores = [...allStores];
  } else {
    filteredStores = allStores.filter(s =>
      (s.store_name || '').toLowerCase().includes(query) ||
      (s.category || '').toLowerCase().includes(query)
    );
  }
  currentPage = 1;
  renderStoresGrid();
}

// ========== 8. التحكم بالصفحات ==========

function changePage(direction) {
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage) || 1;
  const newPage = currentPage + direction;
  if (newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  renderStoresGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationUI() {
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage) || 1;
  const pageInfo = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  if (pageInfo) {
    if (window.t) {
      pageInfo.textContent = `${window.t('page')} ${currentPage} ${window.t('of')} ${totalPages}`;
    } else {
      pageInfo.textContent = `صفحة ${currentPage} من ${totalPages}`;
    }
  }
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ========== 9. تحميل كسول للصور ==========

function setupLazyLoading() {
  const lazyImages = document.querySelectorAll('img[data-src]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });
    lazyImages.forEach(img => observer.observe(img));
  } else {
    lazyImages.forEach(img => { img.src = img.dataset.src; });
  }
}

// ========== 10. تهيئة التطبيق ==========

document.addEventListener('DOMContentLoaded', function() {
  cacheElements();
  setupOptimizedEventListeners();
  loadStores();

  // ─── V4: الميزات الجديدة ───
  loadHeroCarousel();
  loadAnnouncementBar();
  loadRealEstate();

  // أزرار الكاروسيل (السابق / التالي)
  const carouselPrev = document.getElementById('carouselPrev');
  const carouselNext = document.getElementById('carouselNext');
  if (carouselPrev) carouselPrev.addEventListener('click', () => goToSlide((_currentSlide - 1 + _totalSlides) % _totalSlides));
  if (carouselNext) carouselNext.addEventListener('click', () => goToSlide((_currentSlide + 1) % _totalSlides));

  console.log('🚀 التطبيق محمل (V4)');
});

// ========== 11. التكامل مع نظام الترجمة ==========

window.addEventListener('load', function() {
  setupLazyLoading();

  if (window.translationManager) {
    window.translationManager.addObserver((lang) => {
      setTimeout(() => {
        loadStores();
        updatePaginationUI();
      }, 100);
    });
  }
});

// ========== 12. التصدير العالمي ==========

window.toggleMenu = toggleMenu;
window.toggleLangMenu = toggleLangMenu;
window.toggleContactModal = toggleContactModal;
window.closeAllModals = closeAllModals;
window.loadStores = loadStores;
window.searchStores = searchStores;
window.changePage = changePage;
window.renderStoresGrid = renderStoresGrid;
window.renderVIPGallery = renderVIPAdsBanner;
window.loadHeroCarousel = loadHeroCarousel;
window.loadAnnouncementBar = loadAnnouncementBar;
window.loadRealEstate = loadRealEstate;
window.goToSlide = goToSlide;

// ========== 13. V4 — كاروسيل إعلانات VIP ==========

let _carouselInterval = null;
let _currentSlide = 0;
let _totalSlides = 0;
let _isPaused = false;
const CAROUSEL_INTERVAL = 10000; // 10 ثوانٍ

/**
 * جلب إعلانات VIP وبناء الكاروسيل البطولي.
 * تُخفى القسم تلقائياً إذا لم تتوفر إعلانات نشطة.
 */
async function loadHeroCarousel() {
  const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!supabase) return;

  try {
    const { data: ads } = await supabase
      .from('merchant')
      .select('name, ad_image, ad_title, ad_link, slug, email')
      .eq('package_type', 'vip')
      .eq('account_status', 'active')
      .not('ad_image', 'is', null);

    const track = document.getElementById('carouselTrack');
    const dotsContainer = document.getElementById('carouselDots');
    if (!track) return;

    if (!ads || ads.length === 0) {
      const section = document.getElementById('heroCarousel');
      if (section) section.style.display = 'none';
      return;
    }

    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    ads.forEach((ad, i) => {
      // ─── الشريحة ───
      const slide = document.createElement('div');
      slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = `url('${ad.ad_image}')`;
      slide.setAttribute('data-index', i);
      // استخدام KH_Security إن وُجد وإلا التعقيم اليدوي
      const escFn = window.KH_Security ? window.KH_Security.escapeHtml : _escHtml;
      slide.innerHTML = `
        <div class="carousel-overlay"></div>
        <div class="slide-content">
          <div class="slide-merchant-name">${escFn(ad.name)} — VIP ⭐</div>
          <h2 class="slide-title">${escFn(ad.ad_title || ad.name)}</h2>
          <a href="store.html?email=${encodeURIComponent(ad.email)}" class="slide-cta" data-key="viewStore">${typeof window.t === 'function' ? window.t('viewStore') : 'زيارة المتجر'}</a>
        </div>
      `;
      track.appendChild(slide);

      // ─── النقطة ───
      if (dotsContainer) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `الشريحة ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
      }
    });

    startCarousel(ads.length);
    setupCarouselSwipe(track);

    // إيقاف مؤقت عند تمرير الماوس
    const section = document.getElementById('heroCarousel');
    if (section) {
      section.addEventListener('mouseenter', pauseCarousel);
      section.addEventListener('mouseleave', resumeCarousel);
    }
  } catch (err) {
    console.warn('[Carousel] خطأ في تحميل إعلانات VIP:', err);
    const section = document.getElementById('heroCarousel');
    if (section) section.style.display = 'none';
  }
}

/** دالة تعقيم HTML احتياطية إذا لم يتوفر KH_Security */
function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function startCarousel(total) {
  _totalSlides = total;
  _currentSlide = 0;
  clearInterval(_carouselInterval);
  _carouselInterval = setInterval(() => {
    if (!_isPaused) {
      _currentSlide = (_currentSlide + 1) % _totalSlides;
      goToSlide(_currentSlide);
    }
  }, CAROUSEL_INTERVAL);
  resetTimerBar();
}

function goToSlide(index) {
  _currentSlide = index;
  document.querySelectorAll('.carousel-slide').forEach((s, i) => s.classList.toggle('active', i === index));
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === index));
  resetTimerBar();
}

function resetTimerBar() {
  const fill = document.getElementById('carouselTimerFill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '0%';
  // إعادة التدفق لإعادة تشغيل الحركة
  void fill.offsetWidth;
  fill.style.transition = `width ${CAROUSEL_INTERVAL}ms linear`;
  fill.style.width = '100%';
}

function pauseCarousel()  { _isPaused = true; }
function resumeCarousel() { _isPaused = false; }

function setupCarouselSwipe(track) {
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goToSlide((_currentSlide - 1 + _totalSlides) % _totalSlides);
      else           goToSlide((_currentSlide + 1) % _totalSlides);
    }
  }, { passive: true });
}

// ========== 14. V4 — شريط الإعلانات ==========

/**
 * يجلب أول إعلان نشط مخصص للصفحة الرئيسية ويعرضه في الشريط العلوي.
 */
async function loadAnnouncementBar() {
  const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!supabase) return;
  try {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('platform_announcements')
      .select('title, content, cta_text, cta_url, type')
      .eq('is_active', true)
      .contains('show_on', ['home'])
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;

    const bar  = document.getElementById('announcementBar');
    const text = document.getElementById('annBarText');
    const cta  = document.getElementById('annBarCta');
    if (!bar || !text) return;

    text.textContent = data.title + (data.content ? ' — ' + data.content : '');
    bar.setAttribute('data-type', data.type || 'info');

    if (data.cta_text && data.cta_url && cta) {
      cta.textContent = data.cta_text;
      cta.href = data.cta_url;
      cta.style.display = 'inline-block';
    }
    bar.style.display = 'flex';
  } catch { /* صامت — شريط الإعلانات غير جوهري */ }
}

// ========== 15. V4 — قسم العقارات ==========

// ترجمات سريعة للولايات والأنواع (يمكن توسيعها لاحقاً)
const RE_WILAYAS = {
  16: 'الجزائر', 31: 'وهران', 25: 'قسنطينة',
  9: 'البليدة',  19: 'سطيف',  6: 'بجاية', 15: 'تيزي وزو'
};
const RE_TYPES = {
  rent: 'للإيجار', sale: 'للبيع', vacation: 'للاصطياف', commercial: 'تجاري'
};

/**
 * يجلب أحدث 6 عقارات متاحة ويبنيها في شبكة العقارات.
 * يخفي القسم بالكامل إذا لم تكن هناك بيانات.
 */
async function loadRealEstate() {
  const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('real_estate_listings')
      .select('id, title, listing_type, property_type, wilaya, price, price_unit, area_m2, rooms, images')
      .eq('is_available', true)
      .order('is_featured', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(6);

    const grid    = document.getElementById('realEstateGrid');
    const section = document.getElementById('realEstateSection');
    if (!grid) return;

    if (!data || data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    const escFn = window.KH_Security ? window.KH_Security.escapeHtml : _escHtml;

    grid.innerHTML = data.map(listing => {
      const img         = (listing.images && listing.images[0]) || '';
      const wilayaName  = RE_WILAYAS[listing.wilaya] || `ولاية ${listing.wilaya}`;
      const listingType = RE_TYPES[listing.listing_type] || listing.listing_type;
      const price       = listing.price
        ? listing.price.toLocaleString('ar-DZ') + ' DA'
        : 'السعر عند التفاوض';

      return `
        <article class="re-card">
          <img class="re-card-img" src="${img || 'images/placeholder.png'}" alt="${escFn(listing.title)}" loading="lazy">
          <div class="re-card-body">
            <span class="re-card-type">${escFn(listingType)}</span>
            <h3 class="re-card-title">${escFn(listing.title)}</h3>
            <div class="re-card-meta">
              <span>📍 ${escFn(wilayaName)}</span>
              ${listing.area_m2 ? `<span>📐 ${listing.area_m2} م²</span>` : ''}
              ${listing.rooms   ? `<span>🛏 ${listing.rooms} غرف</span>`  : ''}
            </div>
            <div class="re-card-price">${price}</div>
          </div>
        </article>
      `;
    }).join('');
  } catch { /* صامت — قسم العقارات غير جوهري */ }
}