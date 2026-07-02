// js/cart.js

const Cart = {
    items: [],
    userInfo: { name: '', phone: '', wilaya: '', address: '' },
    promoCode: '',
    currentStep: 1,
    
    wilayas: [
        "أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة",
        "تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة",
        "سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة",
        "وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تسمسيلت","الوادي","خنشلة",
        "سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون","برج باجي مختار",
        "أولاد جلال","بني عباس","إن صالح","إن قزام","تقرت","جانت","المغير","المنيعة"
    ],

    t(key, defaultValue) {
        if (window.t) {
            const val = window.t(key);
            if (val !== key) return val;
        }
        if (window.st) {
            const val = window.st(key);
            if (val !== key) return val;
        }
        return defaultValue || key;
    },

    init() {
        const savedCart = localStorage.getItem('kh_cart');
        if (savedCart) {
            try { this.items = JSON.parse(savedCart); } catch (e) {}
        }
        
        const savedUser = localStorage.getItem('kh_user_info');
        if (savedUser) {
            try { this.userInfo = JSON.parse(savedUser); } catch (e) {}
        }

        this.injectHTML();
        this.updateCount();
    },

    save() {
        localStorage.setItem('kh_cart', JSON.stringify(this.items));
        localStorage.setItem('kh_user_info', JSON.stringify(this.userInfo));
        this.updateCount();
        this.renderItems();
    },

    add(id, name, price, image, merchantPhone, merchantName, merchantEmail, size = '', color = '') {
        const cartItemId = `${id}_${size}_${color}`;
        const existing = this.items.find(i => (i.cartItemId && i.cartItemId === cartItemId) || (!i.cartItemId && i.id == id && (i.size||'') == size && (i.color||'') == color));
        
        if (existing) {
            existing.qty++;
        } else {
            this.items.push({ 
                cartItemId, 
                id, 
                name, 
                price, 
                image, 
                qty: 1, 
                merchantPhone: merchantPhone || '', 
                merchantName: merchantName || 'متجر', 
                merchantEmail: merchantEmail || '',
                size: size,
                color: color
            });
        }
        this.save();
        this.show();
    },

    remove(cartItemId) {
        this.items = this.items.filter(i => (i.cartItemId || String(i.id)) !== String(cartItemId));
        this.save();
    },

    updateQty(cartItemId, delta) {
        const item = this.items.find(i => (i.cartItemId || String(i.id)) === String(cartItemId));
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                this.remove(cartItemId);
            } else {
                this.save();
            }
        }
    },

    openEditModal(cartItemId) {
        const item = this.items.find(i => (i.cartItemId || String(i.id)) === String(cartItemId));
        if (!item) return;

        const html = `
            <div class="cart-modal-overlay active" id="cartEditModalOverlay">
                <div class="cart-modal">
                    <h3>تعديل المنتج</h3>
                    <p class="cart-modal-item-name">${item.name}</p>
                    
                    <div class="cart-modal-field">
                        <label>المقاس</label>
                        <input type="text" id="editCartSize" value="${item.size || ''}" placeholder="مثل: M, L, XL, 42...">
                    </div>
                    
                    <div class="cart-modal-field">
                        <label>اللون</label>
                        <input type="text" id="editCartColor" value="${item.color || ''}" placeholder="مثل: أحمر، أسود...">
                    </div>
                    
                    <div class="cart-modal-actions">
                        <button class="cart-modal-btn-save" onclick="Cart.saveItemEdit('${cartItemId}')">حفظ</button>
                        <button class="cart-modal-btn-cancel" onclick="document.getElementById('cartEditModalOverlay').remove()">إلغاء</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    saveItemEdit(cartItemId) {
        const size = document.getElementById('editCartSize').value.trim();
        const color = document.getElementById('editCartColor').value.trim();
        
        const index = this.items.findIndex(i => (i.cartItemId || String(i.id)) === String(cartItemId));
        if (index !== -1) {
            const item = this.items[index];
            item.size = size;
            item.color = color;
            item.cartItemId = `${item.id}_${size}_${color}`;
            
            // Check if another item with same size/color exists
            const duplicateIndex = this.items.findIndex((i, idx) => idx !== index && i.cartItemId === item.cartItemId);
            if (duplicateIndex !== -1) {
                // Merge quantities
                this.items[duplicateIndex].qty += item.qty;
                this.items.splice(index, 1);
            }
            
            this.save();
        }
        document.getElementById('cartEditModalOverlay').remove();
    },

    updateCount() {
        const countEl = document.getElementById('cartItemCount');
        if (countEl) {
            const totalQty = this.items.reduce((acc, item) => acc + item.qty, 0);
            countEl.textContent = totalQty;
            countEl.style.display = totalQty > 0 ? 'flex' : 'none';
        }
    },

    show() {
        this.currentStep = 1;
        this.renderItems();
        document.getElementById('cartOverlay').classList.add('active');
        document.getElementById('cartSidebar').classList.add('active');
    },

    hide() {
        document.getElementById('cartOverlay').classList.remove('active');
        document.getElementById('cartSidebar').classList.remove('active');
    },

    renderItems() {
        const container = document.getElementById('cartItemsList');
        const checkoutBox = document.getElementById('cartCheckoutBox');
        const backBtn = document.getElementById('cartBackBtn');
        const step1Box = document.getElementById('cartCheckoutStep1');
        const step2Box = document.getElementById('cartCheckoutStep2');
        
        if (!container) return;

        container.innerHTML = '';
        
        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 40px 0; color: #888;" data-key="cartEmpty" data-i18n="cartEmpty">${this.t('cartEmpty', 'السلة فارغة')}</div>`;
            if (checkoutBox) checkoutBox.style.display = 'none';
            if (backBtn) backBtn.style.display = 'none';
            return;
        }

        // Toggle Step Visibility
        if (this.currentStep === 1) {
            if (step1Box) step1Box.style.display = 'block';
            if (step2Box) step2Box.style.display = 'none';
            if (backBtn) backBtn.style.display = 'none';
        } else {
            if (step1Box) step1Box.style.display = 'none';
            if (step2Box) step2Box.style.display = 'block';
            if (backBtn) backBtn.style.display = 'block';
        }

        let total = 0;

        this.items.forEach(item => {
            total += item.price * item.qty;
            const uid = item.cartItemId || String(item.id);
            const attrs = [];
            if (item.size) attrs.push(`المقاس: ${item.size}`);
            if (item.color) attrs.push(`اللون: ${item.color}`);
            const attrsHtml = attrs.length > 0 ? `<p style="font-size:11px; color:var(--neon-green, #00ffc3); margin:2px 0;">${attrs.join(' | ')}</p>` : '';

            let controlsHtml = '';
            if (this.currentStep === 1) {
                controlsHtml = `
                    <div class="cart-qty-controls">
                        <button class="cart-qty-btn" onclick="Cart.updateQty('${uid}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="cart-qty-btn" onclick="Cart.updateQty('${uid}', 1)">+</button>
                    </div>
                    <div>
                        <button class="action-btn sm secondary-btn" onclick="Cart.openEditModal('${uid}')" style="margin-left:5px;" title="عدل اختيارك">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="cart-remove-btn" onclick="Cart.remove('${uid}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            } else {
                controlsHtml = `
                    <div style="font-size: 13px; color: #aaa; margin-top: 4px;">
                        <span>الكمية: <strong style="color: #00ffc3;">${item.qty}</strong></span>
                    </div>
                `;
            }

            container.innerHTML += `
                <div class="cart-item">
                    <img src="${item.image || 'images/placeholder.png'}" alt="">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.name}</h4>
                        <p class="cart-item-merchant"><span data-key="storePrefix" data-i18n="storePrefix">${this.t('storePrefix', 'متجر:')}</span> ${item.merchantName}</p>
                        ${attrsHtml}
                        <p class="cart-item-price">${item.price.toLocaleString()} دج</p>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            ${controlsHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        const totalEl = document.getElementById('cartTotalAmount');
        if (totalEl) totalEl.textContent = total.toLocaleString() + ' دج';
        if (checkoutBox) checkoutBox.style.display = 'block';
        
        // Populate inputs
        const uName = document.getElementById('cartUserName');
        const uPhone = document.getElementById('cartUserPhone');
        const uWilaya = document.getElementById('cartUserWilaya');
        const uAddress = document.getElementById('cartUserAddress');
        if (uName) uName.value = this.userInfo.name || '';
        if (uPhone) uPhone.value = this.userInfo.phone || '';
        if (uWilaya) uWilaya.value = this.userInfo.wilaya || '';
        if (uAddress) uAddress.value = this.userInfo.address || '';
    },

    confirmProducts() {
        if (this.items.length === 0) return;
        this.currentStep = 2;
        this.renderItems();
        const checkoutBox = document.getElementById('cartCheckoutBox');
        if (checkoutBox) {
            setTimeout(() => {
                checkoutBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    },

    backToStep1() {
        this.currentStep = 1;
        this.renderItems();
    },

    async submitCodOrder() {
        if (window.KH_Security && !KH_Security.rateLimiter.check('cart_checkout', 5, 60000)) {
            alert(this.t('rateLimitExceeded', 'لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة لاحقاً.'));
            return;
        }

        const name = document.getElementById('cartUserName').value.trim();
        const phone = document.getElementById('cartUserPhone').value.trim();
        const wilaya = document.getElementById('cartUserWilaya').value;
        const address = document.getElementById('cartUserAddress').value.trim();
        const promo = document.getElementById('cartPromoCode').value.trim();

        if (!name || !phone || !wilaya || !address) {
            alert('يرجى إدخال جميع المعلومات المطلوبة (الاسم، رقم الهاتف، الولاية، العنوان) لإتمام الطلب.');
            return;
        }

        this.userInfo = { name, phone, wilaya, address };
        this.promoCode = promo;
        this.save();

        const btn = document.getElementById('cartCodBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
        }

        const success = await this.processCheckout('cod', null);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-truck"></i> <span>تقديم الطلب (الدفع عند الاستلام)</span>';
        }
    },

    async submitDcbOrder() {
        if (window.KH_Security && !KH_Security.rateLimiter.check('cart_checkout', 5, 60000)) {
            alert(this.t('rateLimitExceeded', 'لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة لاحقاً.'));
            return;
        }

        const name = document.getElementById('cartUserName').value.trim();
        const phone = document.getElementById('cartUserPhone').value.trim();
        const wilaya = document.getElementById('cartUserWilaya').value;
        const address = document.getElementById('cartUserAddress').value.trim();
        const promo = document.getElementById('cartPromoCode').value.trim();

        if (!name || !phone || !wilaya || !address) {
            alert('يرجى إدخال جميع المعلومات المطلوبة (الاسم، رقم الهاتف، الولاية، العنوان) أولاً.');
            return;
        }

        this.userInfo = { name, phone, wilaya, address };
        this.promoCode = promo;
        this.save();

        const dcbFields = document.getElementById('cartDcbFields');
        if (!dcbFields || dcbFields.style.display === 'none') {
            // Show DCB fields container
            if (dcbFields) {
                dcbFields.style.display = 'block';
                dcbFields.classList.add('fade-in');
            }
            
            // Auto fill phone if valid Algerian phone
            const dcbPhoneInput = document.getElementById('cartDcbPhone');
            if (phone && /^(0|213)[567]\d{8}$/.test(phone) && dcbPhoneInput && !dcbPhoneInput.value) {
                dcbPhoneInput.value = phone;
            }

            // Trigger eligibility check
            this.checkDcbEligibility();

            // Scroll to the bottom of the sidebar
            const sidebar = document.getElementById('cartItemsList');
            if (sidebar) {
                setTimeout(() => {
                    dcbFields.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            }
            return;
        }

        // DCB Fields are already visible, proceed with DCB flow
        const carrier = document.getElementById('cartDcbCarrier').value;
        const dcbPhone = document.getElementById('cartDcbPhone').value.trim();
        
        if (!carrier) {
            alert('يرجى اختيار شركة الاتصالات لإتمام الدفع بالرصيد.');
            return;
        }
        if (!dcbPhone || !/^(0|213)[567]\d{8}$/.test(dcbPhone)) {
            alert('يرجى إدخال رقم هاتف جزائري صحيح (يبدأ بـ 05، 06 أو 07) لإتمام الدفع بالرصيد.');
            return;
        }

        // Validate eligibility before proceeding
        const merchants = {};
        this.items.forEach(item => {
            if (!merchants[item.merchantEmail]) {
                merchants[item.merchantEmail] = { merchantEmail: item.merchantEmail, amount: 0 };
            }
            merchants[item.merchantEmail].amount += (item.price * item.qty);
        });
        const cartItems = Object.values(merchants);
        const totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);

        if (!window.DCBEngine) {
            if (confirm('خدمة الدفع بالرصيد غير متوفرة حالياً. هل ترغب في إتمام الطلب عبر الدفع عند الاستلام (COD) بدلاً من ذلك؟')) {
                this.submitCodOrder();
            }
            return;
        }

        const eligibility = await window.DCBEngine.checkEligibility(cartItems, totalAmount);
        if (!eligibility.eligible) {
            if (confirm(`السلة غير مؤهلة للدفع بالرصيد: ${eligibility.reason}\n\nهل ترغب في إتمام الطلب عبر الدفع عند الاستلام (COD) بدلاً من ذلك؟`)) {
                this.submitCodOrder();
            }
            return;
        }

        const btn = document.getElementById('cartDcbBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال رمز التحقق...';
        }

        try {
            const initRes = await window.DCBEngine.initiatePayment(dcbPhone, carrier, totalAmount, cartItems);
            if (initRes.success) {
                const carrierDisplay = window.DCBEngine.carrierNames[carrier] || carrier;
                this.showOtpModal(initRes.transactionId, dcbPhone, carrierDisplay, initRes.otpExpiry);
            } else {
                if (confirm(`فشل بدء عملية الدفع بالرصيد: ${initRes.error}\n\nهل ترغب في إتمام الطلب عبر الدفع عند الاستلام (COD) بدلاً من ذلك؟`)) {
                    this.submitCodOrder();
                }
            }
        } catch (err) {
            console.error("DCB initiation error:", err);
            if (confirm('حدث خطأ أثناء إرسال كود التحقق. هل ترغب في إتمام الطلب عبر الدفع عند الاستلام (COD) بدلاً من ذلك؟')) {
                this.submitCodOrder();
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-mobile-screen-button"></i> <span>الدفع بالرصيد</span>';
            }
        }
    },

    showSuccessModal() {
        this.hide();
        const html = `
            <div class="cart-modal-overlay active" id="cartSuccessOverlay">
                <div class="cart-modal" style="text-align:center;">
                    <i class="fas fa-check-circle" style="font-size:60px; color:#00ffc3; margin-bottom:20px;"></i>
                    <h2 style="margin-bottom:10px;">تم تسجيل طلبك بنجاح!</h2>
                    <p class="cart-modal-item-name" style="margin-bottom:25px; line-height:1.6;">تم إرسال الطلب مباشرة إلى المتاجر المعنية.<br>سيتم التواصل معك قريباً لتأكيد الطلب وتوصيله إلى عنوانك.</p>
                    <button class="cart-modal-btn-save" onclick="document.getElementById('cartSuccessOverlay').remove()">متابعة التسوق</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    injectHTML() {
        if (document.getElementById('cartFloatingBtn')) return;

        const wilayaOptions = this.wilayas.map((w, i) => `<option value="${i+1}">${i+1} - ${w}</option>`).join('');

        const html = `
            <div class="cart-floating-btn" id="cartFloatingBtn" onclick="Cart.show()">
                <i class="fas fa-shopping-cart"></i>
                <div class="cart-count" id="cartItemCount" style="display: none;">0</div>
            </div>

            <div class="cart-overlay" id="cartOverlay" onclick="Cart.hide()"></div>
            
            <div class="cart-sidebar" id="cartSidebar">
                <div class="cart-header">
                    <button id="cartBackBtn" class="cart-back-btn" onclick="Cart.backToStep1()" style="display: none; background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; margin-right: 10px;">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <h2 data-key="cartTitle" data-i18n="cartTitle">${this.t('cartTitle', '🛒 سلة التسوق')}</h2>
                    <button class="close-cart" onclick="Cart.hide()">&times;</button>
                </div>
                
                <div class="cart-items" id="cartItemsList">
                    <!-- Items will go here -->
                </div>
                
                <div class="cart-footer" id="cartCheckoutBox" style="display: none;">
                    <div class="cart-total-row">
                        <span data-key="total" data-i18n="total">المجموع:</span>
                        <span id="cartTotalAmount">0 دج</span>
                    </div>
                    
                    <div id="cartCheckoutStep1">
                        <button id="cartConfirmBtn" class="checkout-btn cod-btn" onclick="Cart.confirmProducts()" style="margin-top: 10px; width: 100%;">
                            <i class="fas fa-check-double"></i> <span>تأكيد المنتجات والمواصلة</span>
                        </button>
                    </div>

                    <div id="cartCheckoutStep2" style="display: none;">
                        <div class="cart-promo-row">
                            <input type="text" id="cartPromoCode" data-key="promoCodeLabel" data-i18n="promoCodeLabel" placeholder="${this.t('promoCodeLabel', 'كود الخصم (إن وجد)')}">
                        </div>

                        <div class="cart-input-group">
                            <label>الاسم الكامل *</label>
                            <input type="text" id="cartUserName" placeholder="أدخل اسمك الكريم">
                        </div>
                        
                        <div class="cart-input-group">
                            <label>رقم الهاتف *</label>
                            <input type="text" id="cartUserPhone" placeholder="أدخل رقم هاتفك للتواصل">
                        </div>

                        <div class="cart-input-group">
                            <label>الولاية *</label>
                            <select id="cartUserWilaya">
                                <option value="">-- اختر الولاية --</option>
                                ${wilayaOptions}
                            </select>
                        </div>

                        <div class="cart-input-group">
                            <label>العنوان / البلدية *</label>
                            <input type="text" id="cartUserAddress" placeholder="أدخل عنوان التوصيل بالتفصيل">
                        </div>

                        <!-- حقول الدفع بالرصيد المخفية افتراضياً -->
                        <div id="cartDcbFields" class="cart-dcb-fields" style="display: none;">
                            <h4><i class="fas fa-mobile-alt"></i> الدفع برصيد الهاتف</h4>
                            <div id="cartDcbEligibilityMsg" class="dcb-eligibility-msg"></div>
                            <div class="cart-input-group">
                                <label>شركة الاتصالات *</label>
                                <select id="cartDcbCarrier">
                                    <option value="">-- اختر شركة الاتصالات --</option>
                                    <option value="mobilis">موبيليس (Mobilis)</option>
                                    <option value="djezzy">جازي (Djezzy)</option>
                                    <option value="ooredoo">أوريدو (Ooredoo)</option>
                                </select>
                            </div>
                            <div class="cart-input-group" id="cartDcbPhoneGroup" style="display: none;">
                                <label>رقم هاتف الدفع (الرصيد) *</label>
                                <input type="text" id="cartDcbPhone" placeholder="05 / 06 / 07">
                            </div>
                        </div>

                        <div id="cartCheckoutBtnBox" style="margin-top:20px; display: flex; flex-direction: column; gap: 10px;">
                            <button id="cartCodBtn" class="checkout-btn cod-btn" onclick="Cart.submitCodOrder()">
                                <i class="fas fa-truck"></i> <span>تقديم الطلب (الدفع عند الاستلام)</span>
                            </button>
                            <button id="cartDcbBtn" class="checkout-btn dcb-btn" onclick="Cart.submitDcbOrder()">
                                <i class="fas fa-mobile-screen-button"></i> <span>الدفع بالرصيد</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        const carrierSelect = document.getElementById('cartDcbCarrier');
        if (carrierSelect) {
            carrierSelect.addEventListener('change', () => {
                const phoneGroup = document.getElementById('cartDcbPhoneGroup');
                if (phoneGroup) {
                    phoneGroup.style.display = carrierSelect.value ? 'block' : 'none';
                }
            });
        }
    },
    // تم تبسيط الدفع بالرصيد عبر استخدام أزرار مباشرة وتسهيل منطق تفعيل الحقول وتدفق الدفع.

    async checkDcbEligibility() {
        const msgEl = document.getElementById('cartDcbEligibilityMsg');
        const carrierSelect = document.getElementById('cartDcbCarrier');
        const phoneInput = document.getElementById('cartDcbPhone');
        
        msgEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق من أهلية السلة للدفع بالرصيد...';
        msgEl.style.color = '#ff9f43';
        carrierSelect.disabled = true;
        phoneInput.disabled = true;
        
        if (!window.DCBEngine) {
            msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> نظام الدفع بالرصيد غير متوفر حالياً.';
            msgEl.style.color = '#ff4757';
            return;
        }

        // Group cart items by merchant
        const merchants = {};
        this.items.forEach(item => {
            if (!merchants[item.merchantEmail]) {
                merchants[item.merchantEmail] = { merchantEmail: item.merchantEmail, amount: 0 };
            }
            merchants[item.merchantEmail].amount += (item.price * item.qty);
        });
        const cartItems = Object.values(merchants);
        const totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);

        try {
            const eligibility = await window.DCBEngine.checkEligibility(cartItems, totalAmount);
            if (eligibility.eligible) {
                msgEl.innerHTML = '<i class="fas fa-check-circle"></i> السلة مؤهلة! يرجى تحديد شركة الاتصالات وإدخال رقم الهاتف.';
                msgEl.style.color = '#00ffc3';
                carrierSelect.disabled = false;
                phoneInput.disabled = false;
                
                // Populate options based on settings
                const settings = await window.DCBEngine.getSettings();
                if (settings && settings.supported_carriers) {
                    Array.from(carrierSelect.options).forEach(opt => {
                        if (opt.value) {
                            opt.disabled = !settings.supported_carriers.includes(opt.value);
                            if (opt.disabled) {
                                opt.text = opt.text.split(' (')[0] + ' (غير مدعوم)';
                            } else {
                                opt.text = opt.text.split(' (')[0];
                            }
                        }
                    });
                }
            } else {
                msgEl.innerHTML = `<i class="fas fa-times-circle"></i> غير مؤهل: ${eligibility.reason}`;
                msgEl.style.color = '#ff4757';
            }
        } catch (e) {
            console.error("DCB Eligibility Error:", e);
            msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> حدث خطأ أثناء فحص الأهلية.';
            msgEl.style.color = '#ff4757';
        }
    },

    async processCheckout(paymentMethod, transactionId) {
        const merchants = {};
        this.items.forEach(item => {
            if (!merchants[item.merchantEmail]) {
                merchants[item.merchantEmail] = { name: item.merchantName, email: item.merchantEmail, phone: item.merchantPhone, items: [], total: 0 };
            }
            merchants[item.merchantEmail].items.push(item);
            merchants[item.merchantEmail].total += (item.price * item.qty);
        });

        const _sb = window.getSupabaseClient ? window.getSupabaseClient() : window.supabaseClient;
        if (!_sb) {
            alert('خطأ في الاتصال بقاعدة البيانات.');
            return false;
        }

        let successCount = 0;

        for (const mEmail of Object.keys(merchants)) {
            const mData = merchants[mEmail];
            let finalTotal = mData.total;
            let discountApplied = 0;

            if (this.promoCode) {
                try {
                    const { data: storeInfo } = await _sb.from('merchant').select('coupon_code, coupon_discount').eq('email', mEmail).single();
                    if (storeInfo && storeInfo.coupon_code && storeInfo.coupon_code.toLowerCase() === this.promoCode.toLowerCase()) {
                        discountApplied = storeInfo.coupon_discount || 0;
                        if (discountApplied > 0) {
                            finalTotal -= (finalTotal * discountApplied) / 100;
                        }
                    }
                } catch (e) {}
            }

            let orderStatus = 'pending';
            if (paymentMethod === 'dcb') {
                try {
                    const { data: vendorDcb } = await _sb
                        .from('dcb_vendor_settings')
                        .select('auto_accept')
                        .eq('merchant_email', mEmail)
                        .limit(1)
                        .maybeSingle();
                    if (vendorDcb && vendorDcb.auto_accept) {
                        orderStatus = 'completed';
                    }
                } catch(e) { console.warn("Failed to read auto_accept status:", e); }
            }

            try {
                const { error } = await _sb.from('orders').insert({
                    merchant_email: mEmail,
                    customer_name: this.userInfo.name,
                    customer_phone: this.userInfo.phone,
                    customer_wilaya: parseInt(this.userInfo.wilaya) || null,
                    customer_address: this.userInfo.address,
                    items: mData.items,
                    total_price: finalTotal,
                    discount_applied: discountApplied,
                    status: orderStatus,
                    payment_method: paymentMethod,
                    dcb_transaction_id: transactionId,
                    deleted_by_merchant: false
                });
                if (!error) successCount++;
            } catch (err) {
                console.error("Order error:", err);
            }
        }

        if (successCount > 0) {
            this.items = [];
            this.save();
            this.showSuccessModal();
            return true;
        } else {
            alert('حدث خطأ أثناء تسجيل طلبك، يرجى المحاولة لاحقاً.');
            return false;
        }
    },

    showOtpModal(transactionId, phone, carrierName, expiryTime) {
        const existing = document.getElementById('cartOtpModalOverlay');
        if (existing) existing.remove();

        const expiryDate = new Date(expiryTime);
        
        const html = `
            <div class="cart-modal-overlay active" id="cartOtpModalOverlay" style="z-index: 99999; display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);">
                <div class="cart-modal" style="text-align: center; max-width: 420px; padding: 25px; border-radius: 16px; background: #1a1e22; border: 1px solid rgba(0, 255, 195, 0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.5); color: #fff; font-family: 'Gumela', sans-serif;">
                    <h3 style="color: var(--neon-green, #00ffc3); margin-bottom: 15px; font-size: 20px;"><i class="fas fa-shield-alt"></i> تأكيد عملية الدفع</h3>
                    <p style="font-size: 13px; color: #eee; line-height: 1.6; margin-bottom: 20px;">
                        لقد أرسلنا رمز التحقق (OTP) إلى الرقم <strong style="color:#00ffc3;">${phone}</strong> عبر شبكة <strong>${carrierName}</strong> لإتمام الدفع من رصيد الهاتف.
                    </p>

                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">أدخل رمز التأكيد (6 أرقام)</div>
                        <input type="text" id="otpCodeInput" placeholder="XXXXXX" maxlength="6" style="text-align: center; letter-spacing: 8px; font-size: 20px; font-weight: bold; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff;" />
                        <div id="otpTimerDisplay" style="font-size: 13px; color: #ff9f43; margin-top: 10px; font-weight: bold;">
                            الوقت المتبقي: 02:00
                        </div>
                    </div>

                    <div id="otpErrorMsg" style="color: #ff4757; font-size: 12px; margin-bottom: 15px; display: none; text-align: center;"></div>

                    <div class="cart-modal-actions" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <button class="cart-modal-btn-save" id="otpVerifyBtn" onclick="Cart.verifyOtpCode('${transactionId}')" style="width: 100%; padding: 12px; font-size: 14px; font-weight: bold; background: #00ffc3; color: #000; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-check"></i> تأكيد والدفع الآن
                        </button>
                        
                        <button class="cart-modal-btn-cancel" id="otpResendBtn" onclick="Cart.resendOtpCode('${transactionId}')" disabled style="width: 100%; padding: 12px; font-size: 13px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid #444; border-radius: 8px; cursor: not-allowed;">
                            إعادة إرسال الرمز
                        </button>

                        <button class="cart-modal-btn-cancel" onclick="Cart.cancelOtpFlow('${transactionId}')" style="width: 100%; padding: 10px; font-size: 13px; background: transparent; color: #aaa; border: none; cursor: pointer; text-decoration: underline;">
                            إلغاء العملية
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.startOtpTimer(transactionId, expiryDate);
    },

    startOtpTimer(transactionId, expiryDate) {
        if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
        
        const display = document.getElementById('otpTimerDisplay');
        const resendBtn = document.getElementById('otpResendBtn');
        
        this.otpTimerInterval = setInterval(() => {
            const now = new Date();
            const diff = expiryDate - now;
            
            if (diff <= 0) {
                clearInterval(this.otpTimerInterval);
                display.textContent = 'انتهت صلاحية الرمز. يمكنك إعادة إرسال رمز جديد.';
                display.style.color = '#ff4757';
                resendBtn.disabled = false;
                resendBtn.style.cursor = 'pointer';
                resendBtn.style.background = 'rgba(0, 255, 195, 0.1)';
                resendBtn.style.color = '#00ffc3';
                return;
            }
            
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const minStr = String(minutes).padStart(2, '0');
            const secStr = String(seconds).padStart(2, '0');
            
            display.textContent = `الوقت المتبقي: ${minStr}:${secStr}`;
        }, 1000);
    },

    async resendOtpCode(transactionId) {
        const resendBtn = document.getElementById('otpResendBtn');
        const errorEl = document.getElementById('otpErrorMsg');
        
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
        
        try {
            const res = await window.DCBEngine.sendOTP(transactionId);
            if (res.success) {
                const settings = await window.DCBEngine.getSettings();
                const expirySeconds = (settings && settings.otp_expiry_seconds) || 120;
                const newExpiry = new Date(Date.now() + expirySeconds * 1000);
                
                resendBtn.innerHTML = 'إعادة إرسال الرمز';
                resendBtn.style.cursor = 'not-allowed';
                resendBtn.style.background = 'rgba(255,255,255,0.05)';
                resendBtn.style.color = '#fff';
                
                errorEl.style.display = 'none';
                
                const display = document.getElementById('otpTimerDisplay');
                display.style.color = '#ff9f43';
                this.startOtpTimer(transactionId, newExpiry);
            } else {
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'إعادة إرسال الرمز';
                errorEl.textContent = res.message;
                errorEl.style.display = 'block';
            }
        } catch (err) {
            console.error("Resend OTP error:", err);
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'إعادة إرسال الرمز';
        }
    },

    async verifyOtpCode(transactionId) {
        const code = document.getElementById('otpCodeInput').value.trim();
        const errorEl = document.getElementById('otpErrorMsg');
        const verifyBtn = document.getElementById('otpVerifyBtn');
        
        if (!code || code.length < 6) {
            errorEl.textContent = 'يرجى إدخال رمز التأكيد المكون من 6 أرقام.';
            errorEl.style.display = 'block';
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
        errorEl.style.display = 'none';

        try {
            const verifyRes = await window.DCBEngine.verifyOTP(transactionId, code);
            if (verifyRes.verified) {
                verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إتمام الدفع بالرصيد...';
                
                const chargeRes = await window.DCBEngine.chargePhone(transactionId);
                if (chargeRes.success) {
                    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';
                    const success = await this.processCheckout('dcb', transactionId);
                    if (success) {
                        clearInterval(this.otpTimerInterval);
                        const overlay = document.getElementById('cartOtpModalOverlay');
                        if (overlay) overlay.remove();
                    } else {
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد والدفع الآن';
                    }
                } else {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد والدفع الآن';
                    errorEl.textContent = chargeRes.message;
                    errorEl.style.display = 'block';
                }
            } else {
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد والدفع الآن';
                errorEl.textContent = verifyRes.message;
                errorEl.style.display = 'block';
                
                if (verifyRes.attemptsRemaining === 0) {
                    clearInterval(this.otpTimerInterval);
                    setTimeout(() => {
                        const overlay = document.getElementById('cartOtpModalOverlay');
                        if (overlay) overlay.remove();
                    }, 3000);
                }
            }
        } catch (err) {
            console.error("Verify OTP Error:", err);
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check"></i> تأكيد والدفع الآن';
            errorEl.textContent = 'حدث خطأ أثناء معالجة الرمز.';
            errorEl.style.display = 'block';
        }
    },

    cancelOtpFlow(transactionId) {
        if (confirm('هل تريد إلغاء عملية الدفع بالرصيد؟')) {
            clearInterval(this.otpTimerInterval);
            const overlay = document.getElementById('cartOtpModalOverlay');
            if (overlay) overlay.remove();
            
            const btn = document.getElementById('cartDcbBtn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-mobile-screen-button"></i> <span>الدفع بالرصيد</span>';
            }
        }
    },
};

if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(link);
}

document.addEventListener('DOMContentLoaded', () => { Cart.init(); });
if (document.readyState !== 'loading') { Cart.init(); }

window.Cart = Cart;
