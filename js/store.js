// js/store.js
// منطق صفحة المتجر (الترجمات في store_translations.js)

// تخزين مؤقت للمنتجات
window._cachedProducts = null;

// ========== التهيئة الرئيسية ==========
document.addEventListener('DOMContentLoaded', async () => {
    // تطبيق الترجمة أولاً
    if (window.applyStoreTranslations) applyStoreTranslations();

    const supabaseClient = window.getSupabaseClient();
    if (!supabaseClient) {
        showError(st('error_db'));
        return;
    }

    // استخراج معرف المتجر من الرابط (?slug=  أو  ?email=  أو  ?merchant=  أو  ?id=)
    const urlParams = new URLSearchParams(window.location.search);
    const storeSlug  = urlParams.get('slug');
    const storeEmail = urlParams.get('email') || urlParams.get('merchant');
    const storeId    = urlParams.get('id');

    if (!storeSlug && !storeEmail && !storeId) {
        showError(st('error_no_store'));
        return;
    }

    try {
        // 1. جلب بيانات المتجر (slug له الأولوية)
        let query = supabaseClient.from('merchant').select('*');
        if (storeSlug) {
            query = query.eq('slug', storeSlug);
        } else if (storeEmail) {
            query = query.eq('email', storeEmail);
        } else if (storeId) {
            query = query.eq('id', storeId);
        }

        const { data: storeData, error: storeError } = await query.single();

        if (storeError || !storeData) {
            throw new Error(st('error_not_found'));
        }


        renderStoreHeader(storeData);
        
        // ✅ تخزين بيانات المتجر عالمياً للتقييم
        window._storeEmail = storeData.email;
        window._storeName = storeData.name || storeData.email;


        // 2. جلب منتجات المتجر
        const { data: productsData, error: productsError } = await supabaseClient
            .from('products')
            .select('*')
            .eq('owner', storeData.email)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (productsError) {
            console.error('خطأ في جلب المنتجات:', productsError);
            window._cachedProducts = [];
        } else {
            window._cachedProducts = productsData || [];
        }

        renderProducts(window._cachedProducts, storeData);

        // فتح نافذة تفاصيل المنتج تلقائياً إذا كان المعرّف ممرراً في الرابط
        const productId = urlParams.get('product');
        if (productId) {
            setTimeout(() => {
                if (window.openProductModal) {
                    window.openProductModal(productId);
                }
            }, 300);
        }

        // إخفاء التحميل وإظهار المحتوى
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('storeHeader').style.display = 'flex';
        document.getElementById('storeBioContact').style.display = 'block';
        document.getElementById('mainContainer').style.display = 'block';
        
        // تحميل إعلانات الـ VIP
        loadVIPAds(supabaseClient);
        
        // ✅ تحميل قسم التقييمات
        setTimeout(() => {
          if (window.KHReviews) {
            window.KHReviews.renderSection(storeData.email, '#storeReviewsContainer');
          }
        }, 500);


        // 3. تحديث عداد الزيارات
        incrementVisitorCount(storeData.email, supabaseClient);

    } catch (error) {
        console.error('خطأ:', error);
        showError(error.message || st('error_unexpected'));
    }
});

// ========== عرض هيدر المتجر ==========
function renderStoreHeader(store) {
    const siteName = st('page_title').split(' - ')[1] || 'كلش هنا';
    document.title = `${store.name || st('store_default_title')} - ${siteName}`;
    document.getElementById('storeName').textContent = store.name || st('store_unnamed');

    const logoEl = document.getElementById('storeLogo');
    logoEl.src = store.store_image || 'images/placeholder.png';
    logoEl.alt = store.name || '';

    const bioEl = document.getElementById('storeBio');
    if (store.bio) {
        bioEl.textContent = store.bio;
        bioEl.style.display = '';
    } else {
        bioEl.style.display = 'none';
    }

    // بيانات التواصل
    const contactContainer = document.getElementById('contactInfo');
    contactContainer.innerHTML = '';

    if (store.phone) {
        contactContainer.innerHTML += `
            <div class="contact-item">
                <i class="fas fa-phone"></i> <a href="tel:${store.phone}">${store.phone}</a>
            </div>
        `;
    }

    if (store.address) {
        contactContainer.innerHTML += `
            <div class="contact-item">
                <i class="fas fa-map-marker-alt"></i> ${store.address}
            </div>
        `;
    }

    // إضافة روابط التواصل الاجتماعي
    const socialLinks = document.createElement('div');
    socialLinks.className = 'social-links';
    socialLinks.style.cssText = 'display: flex; gap: 10px; margin-top: 15px; justify-content: center; width: 100%;';
    
    if (store.instagram) {
        socialLinks.innerHTML += `<a href="${store.instagram}" target="_blank" class="social-btn ig" style="color: #fff; background: #833ab4; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none;"><i class="fab fa-instagram"></i></a>`;
    }
    if (store.facebook) {
        socialLinks.innerHTML += `<a href="${store.facebook}" target="_blank" class="social-btn fb" style="color: #fff; background: #1877f2; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none;"><i class="fab fa-facebook-f"></i></a>`;
    }
    if (store.tiktok) {
        socialLinks.innerHTML += `<a href="${store.tiktok}" target="_blank" class="social-btn tk" style="color: #fff; background: #010101; border: 1px solid #333; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none;"><i class="fab fa-tiktok"></i></a>`;
    }
    if (store.whatsapp) {
        // تأكد من تنسيق الواتساب
        let waNumber = store.whatsapp.replace(/\D/g,'');
        socialLinks.innerHTML += `<a href="https://wa.me/${waNumber}" target="_blank" class="social-btn wa" style="color: #fff; background: #25d366; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none;"><i class="fab fa-whatsapp"></i></a>`;
    }
    if (store.website) {
        socialLinks.innerHTML += `<a href="${store.website}" target="_blank" class="social-btn web" style="color: #00ffc3; background: #2c5364; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none;"><i class="fas fa-globe"></i></a>`;
    }

    if (socialLinks.innerHTML !== '') {
        contactContainer.appendChild(socialLinks);
    }
}

// ========== تحميل إعلانات VIP ==========
let _storeVipInterval = null;
let _storeVipIndex = 0;

async function loadVIPAds(supabase) {
    try {
        const { data: vipStores, error } = await supabase
            .from('merchant')
            .select('name, store_image, email, ad_image, ad_title, slug')
            .eq('package_type', 'vip')
            .eq('account_status', 'active')
            .limit(10);
            
        if (error || !vipStores || vipStores.length === 0) return;
        
        const gallery = document.getElementById('storeVipGallery');
        if (!gallery) return;
        
        gallery.innerHTML = '';
        vipStores.forEach((store, index) => {
            const item = document.createElement('div');
            item.className = `gallery-item ${index === 0 ? 'active' : ''}`;
            const storeName = store.name || store.email || 'متجر';
            const imgSrc = store.ad_image || store.store_image || 'images/placeholder.png';
            item.innerHTML = `
              <img src="${imgSrc}" alt="${storeName}" loading="lazy">
              <div class="item-info">
                <span class="vip-tag">👑 VIP</span>
                <h3>${store.ad_title || storeName}</h3>
                <span class="gallery-visit-hint">زيارة المتجر ←</span>
              </div>
            `;
            // Hover to expand
            item.addEventListener('mouseenter', () => {
                document.querySelectorAll('#storeVipGallery .gallery-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                if (_storeVipInterval) clearInterval(_storeVipInterval);
            });
            // Click to visit store
            item.addEventListener('click', () => {
                window.location.href = 'store.html?email=' + encodeURIComponent(store.email);
            });
            gallery.appendChild(item);
        });

        // استئناف الدوران عند مغادرة المعرض
        gallery.addEventListener('mouseleave', () => startStoreVipRotation(gallery));

        // بدء الدوران التلقائي كل 8 ثوانٍ
        startStoreVipRotation(gallery);
    } catch (e) {
        console.error('خطأ في تحميل إعلانات VIP', e);
    }
}

function startStoreVipRotation(gallery) {
    if (_storeVipInterval) clearInterval(_storeVipInterval);
    _storeVipIndex = 0;
    _storeVipInterval = setInterval(() => {
        const items = gallery.querySelectorAll('.gallery-item');
        if (items.length === 0) return;
        items[_storeVipIndex].classList.remove('active');
        _storeVipIndex = (_storeVipIndex + 1) % items.length;
        items[_storeVipIndex].classList.add('active');
    }, 8000);
}

// ========== عرض المنتجات ==========
function renderProducts(products, storeData) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-box-open"></i>
                <h3>${st('no_products_title')}</h3>
                <p>${st('no_products_desc')}</p>
            </div>
        `;
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const imgSrc = p.image || 'https://via.placeholder.com/300x200/2a2a2a/00ffc3?text=No+Image';
        const price = parseFloat(p.price) || 0;

        card.innerHTML = `
            <div class="product-image-container" onclick="openProductModal('${p.id}')" style="cursor: pointer;">
                <img src="${imgSrc}"
                     alt="${p.name}" class="product-image" loading="lazy">
                <div class="product-price-badge">${price.toLocaleString()} ${st('currency')}</div>
            </div>
            <div class="product-info">
                <h3 class="product-name" onclick="openProductModal('${p.id}')" style="cursor: pointer;">${p.name}</h3>
                ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
                <div class="product-actions">
                    <button class="btn-details" onclick="openProductModal('${p.id}')">
                        <i class="fas fa-eye"></i> ${st('product_details')}
                    </button>
                    <button class="btn-cart-quick" onclick="quickAddToCart('${p.id}')">
                        <i class="fas fa-cart-plus"></i> ${st('add_to_cart')}
                    </button>
                </div>
            </div>
        `;
        // Save store data globally for the modal
        if (!window._currentStoreData) window._currentStoreData = storeData;
        grid.appendChild(card);
    });
}

// ========== عرض الخطأ ==========
function showError(message) {
    document.getElementById('loadingState').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle" style="color: #ff4757;"></i>
            <h3>${st('error_title')}</h3>
            <p>${message}</p>
            <a href="index.html" class="back-btn" style="display: inline-flex; margin-top: 20px;">${st('back_to_home')}</a>
        </div>
    `;
}

// ========== تحديث عداد الزيارات ==========
async function incrementVisitorCount(email, supabase) {
    try {
        const { data } = await supabase.from('merchant').select('visitor_count').eq('email', email).single();
        const currentCount = data?.visitor_count || 0;
        await supabase.from('merchant').update({ visitor_count: currentCount + 1 }).eq('email', email);
    } catch (e) {
        console.warn('Failed to update visitor count', e);
    }
}

// ========== نافذة تفاصيل المنتج ==========
window.openProductModal = function(productId) {
    const product = window._cachedProducts.find(p => p.id == productId);
    if (!product) return;

    // تهيئة البيانات الأساسية
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = `${parseFloat(product.price).toLocaleString()} ${st('currency')}`;
    document.getElementById('modalProductDesc').textContent = product.description || '';

    // تهيئة معرض الصور
    const mainImg = document.getElementById('modalMainImage');
    const thumbnailsContainer = document.getElementById('modalThumbnails');
    thumbnailsContainer.innerHTML = '';
    
    let images = [];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        images = product.images;
    } else if (product.image) {
        images = [product.image];
    } else {
        images = ['https://via.placeholder.com/300x200/2a2a2a/00ffc3?text=No+Image'];
    }

    mainImg.src = images[0];

    if (images.length > 1) {
        images.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            if (index === 0) thumb.classList.add('active');
            thumb.onclick = () => {
                mainImg.src = imgUrl;
                document.querySelectorAll('.thumbnails img').forEach(i => i.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbnailsContainer.appendChild(thumb);
        });
    }

    // تهيئة المتغيرات (Type, Color, Size, Dimensions)
    const variantsContainer = document.getElementById('modalVariants');
    variantsContainer.innerHTML = '';
    
    const pDetails = product.details || {};
    
    const variantsList = [
        { key: 'type', label: 'النوع', value: pDetails.type || product.type },
        { key: 'color', label: 'اللون', value: (pDetails.colors && pDetails.colors.length > 0) ? pDetails.colors.join(',') : product.color },
        { key: 'size', label: 'المقاس', value: (pDetails.sizes && pDetails.sizes.length > 0) ? pDetails.sizes.join(',') : product.size },
        { key: 'dimensions', label: 'الأبعاد', value: pDetails.dimensions || product.dimensions }
    ];

    variantsList.forEach(v => {
        if (v.value && v.value.trim() !== '') {
            const options = v.value.split(',').map(s => s.trim()).filter(s => s);
            if (options.length > 0) {
                const group = document.createElement('div');
                group.className = 'variant-group';
                group.innerHTML = `
                    <label>${v.label}</label>
                    <select id="modal_variant_${v.key}">
                        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                `;
                variantsContainer.appendChild(group);
            }
        }
    });

    // تهيئة زر الإضافة للسلة ليأخذ المتغيرات
    const storeData = window._currentStoreData || {};
    const addBtn = document.getElementById('modalAddToCartBtn');
    
    addBtn.onclick = () => {
        let variantString = '';
        variantsList.forEach(v => {
            const selectEl = document.getElementById(`modal_variant_${v.key}`);
            if (selectEl) {
                variantString += ` - ${v.label}: ${selectEl.value}`;
            }
        });

        const finalName = product.name + variantString;
        
        Cart.add(
            product.id, 
            finalName.replace(/'/g, "\\'"), 
            product.price, 
            images[0] || '', 
            storeData.whatsapp || storeData.phone || '', 
            (storeData.name || '').replace(/'/g, "\\'"),
            storeData.email
        );
        
        closeProductModal();
    };

    // إظهار النافذة
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
};

window.closeProductModal = function() {
    document.getElementById('productModal').style.display = 'none';
};

// ========== إضافة سريعة للسلة (بدون فتح المودال) ==========
window.quickAddToCart = function(productId) {
    const product = window._cachedProducts && window._cachedProducts.find(p => p.id == productId);
    if (!product) return;

    const storeData = window._currentStoreData || {};
    const imgSrc = (product.images && product.images[0]) || product.image || '';

    Cart.add(
        product.id,
        product.name,
        parseFloat(product.price) || 0,
        imgSrc,
        storeData.whatsapp || storeData.phone || '',
        storeData.name || 'متجر',
        storeData.email || ''
    );

    // تأثير بصري مؤقت على الزر
    const allBtns = document.querySelectorAll('.btn-cart-quick');
    allBtns.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(productId)) {
            const original = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-check"></i> تمت الإضافة`;
            btn.style.background = '#00ffc3';
            btn.style.color = '#000';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '';
                btn.style.color = '';
            }, 1500);
        }
    });
};

// التصدير
window.renderProducts = renderProducts;
window.quickAddToCart = window.quickAddToCart;
