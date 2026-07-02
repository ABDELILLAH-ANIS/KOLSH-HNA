/**
 * =============================================================================
 *  محرك الدفع عبر فاتورة الهاتف (DCB Engine)
 *  منصة "كلش هنا" - Direct Carrier Billing
 * =============================================================================
 *
 *  هذا الملف يحتوي على محرك الدفع عبر فاتورة الهاتف المحمول.
 *  يتم تحميله كـ script tag ويوفر الكائن العام window.DCBEngine
 *
 *  الجداول المستخدمة:
 *    - dcb_settings: إعدادات DCB العامة
 *    - dcb_vendor_settings: إعدادات DCB لكل بائع
 *    - dcb_transactions: سجلات المعاملات
 *    - dcb_transaction_splits: تقسيمات المعاملات بين البائعين
 *    - orders: الطلبات (payment_method, dcb_transaction_id)
 *
 *  @version 1.0.0
 *  @license MIT
 */

(function () {
  'use strict';

  // ─── أسماء شركات الاتصالات ────────────────────────────────────────────────
  const CARRIER_DISPLAY_NAMES = {
    mobilis: 'موبيليس',
    djezzy: 'جازي',
    ooredoo: 'أوريدو'
  };

  // ─── مدة صلاحية الكاش (5 دقائق) ──────────────────────────────────────────
  const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

  // ─── الحد الأقصى لمحاولات OTP ─────────────────────────────────────────────
  const MAX_OTP_ATTEMPTS = 3;

  // ─── كاش الإعدادات ─────────────────────────────────────────────────────────
  let _settingsCache = null;
  let _settingsCacheTime = 0;

  // ─── الحصول على عميل Supabase ──────────────────────────────────────────────
  /**
   * يُرجع عميل Supabase النشط
   * @returns {object} عميل Supabase
   */
  function _getSupabase() {
    const _sb = window.getSupabaseClient
      ? window.getSupabaseClient()
      : window.supabaseClient;
    if (!_sb) {
      throw new Error('عميل Supabase غير متوفر. تأكد من تحميل Supabase أولاً.');
    }
    return _sb;
  }

  // ─── توليد كود OTP عشوائي (6 أرقام) ───────────────────────────────────────
  /**
   * يولّد كود OTP مكون من 6 أرقام
   * @returns {string} كود OTP
   */
  function _generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // ─── توليد مرجع وهمي لشركة الاتصالات ──────────────────────────────────────
  /**
   * يولّد مرجع وهمي يحاكي مرجع شركة الاتصالات
   * @returns {string} مرجع وهمي بصيغة SIM-{timestamp}-{random}
   */
  function _generateCarrierRef() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SIM-${timestamp}-${random}`;
  }

  // ─── تأخير محاكاة الشبكة ──────────────────────────────────────────────────
  /**
   * تأخير اصطناعي لمحاكاة تأخر الشبكة
   * @param {number} ms - المدة بالميلي ثانية
   * @returns {Promise<void>}
   */
  function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── الحصول على بداية اليوم (UTC) ─────────────────────────────────────────
  /**
   * يُرجع بداية اليوم الحالي بتوقيت UTC بصيغة ISO
   * @returns {string} تاريخ بداية اليوم
   */
  function _todayStartUTC() {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now.toISOString();
  }

  // =========================================================================
  //  المحرك الرئيسي - DCBEngine
  // =========================================================================

  const DCBEngine = {

    /** أسماء شركات الاتصالات للعرض */
    carrierNames: CARRIER_DISPLAY_NAMES,

    // ─────────────────────────────────────────────────────────────────────────
    //  init - تهيئة المحرك وتحميل الإعدادات مسبقاً
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * تهيئة محرك DCB وتحميل الإعدادات مسبقاً
     * يُفضّل استدعاء هذه الدالة عند تحميل الصفحة
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async init() {
      try {
        const settings = await this.getSettings();
        if (!settings) {
          return { success: false, message: 'فشل في تحميل إعدادات DCB.' };
        }
        console.log('✅ [DCB] تم تهيئة محرك الدفع عبر فاتورة الهاتف بنجاح.');
        return { success: true, message: 'تم تهيئة محرك DCB بنجاح.' };
      } catch (err) {
        console.error('❌ [DCB] خطأ في التهيئة:', err);
        return { success: false, message: 'فشل في تهيئة محرك DCB: ' + err.message };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getSettings - جلب الإعدادات العامة مع كاش 5 دقائق
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * جلب إعدادات DCB العامة من جدول dcb_settings
     * يتم تخزين النتيجة مؤقتاً لمدة 5 دقائق
     * @returns {Promise<object|null>} كائن الإعدادات أو null في حالة الخطأ
     */
    async getSettings() {
      try {
        // التحقق من الكاش
        const now = Date.now();
        if (_settingsCache && (now - _settingsCacheTime) < SETTINGS_CACHE_TTL_MS) {
          return _settingsCache;
        }

        const sb = _getSupabase();
        const { data, error } = await sb
          .from('dcb_settings')
          .select('is_enabled, max_limit_per_order, platform_fee_percent, supported_carriers, carrier_api_keys, min_order_amount, daily_limit_per_phone, otp_expiry_seconds, mobilis_fee_percent, djezzy_fee_percent, ooredoo_fee_percent')
          .limit(1)
          .single();

        if (error) {
          console.error('❌ [DCB] خطأ في جلب الإعدادات:', error.message);
          return null;
        }

        // تحديث الكاش
        _settingsCache = data;
        _settingsCacheTime = Date.now();

        return data;
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getSettings:', err);
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getVendorSettings - جلب إعدادات بائع معين
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * جلب إعدادات DCB الخاصة ببائع معين
     * @param {string} merchantEmail - البريد الإلكتروني للبائع
     * @returns {Promise<object|null>} إعدادات البائع أو null إذا لم يكن مهيأً
     */
    async getVendorSettings(merchantEmail) {
      try {
        if (!merchantEmail) {
          console.warn('⚠️ [DCB] لم يتم تمرير بريد البائع.');
          return null;
        }

        const sb = _getSupabase();
        const { data, error } = await sb
          .from('dcb_vendor_settings')
          .select('merchant_email, is_enabled, max_limit_override, auto_accept')
          .eq('merchant_email', merchantEmail)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('❌ [DCB] خطأ في جلب إعدادات البائع:', error.message);
          return null;
        }

        return data || null;
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getVendorSettings:', err);
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  checkEligibility - فحص أهلية السلة للدفع عبر DCB
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * فحص ما إذا كانت السلة مؤهلة للدفع عبر فاتورة الهاتف
     * @param {Array<{merchantEmail: string, amount: number}>} cartItems - عناصر السلة مجمّعة حسب البائع
     * @param {number} totalAmount - المبلغ الإجمالي
     * @returns {Promise<{eligible: boolean, reason: string, ineligibleMerchants: string[]}>}
     */
    async checkEligibility(cartItems, totalAmount) {
      try {
        const settings = await this.getSettings();

        // 1) فحص تفعيل DCB عالمياً
        if (!settings || !settings.is_enabled) {
          return {
            eligible: false,
            reason: 'خدمة الدفع عبر فاتورة الهاتف غير مفعّلة حالياً.',
            ineligibleMerchants: []
          };
        }

        // 2) فحص الحد الأدنى للطلب
        if (totalAmount < (settings.min_order_amount || 0)) {
          return {
            eligible: false,
            reason: `الحد الأدنى للدفع عبر فاتورة الهاتف هو ${settings.min_order_amount} د.ج. المبلغ الحالي ${totalAmount} د.ج غير كافٍ.`,
            ineligibleMerchants: []
          };
        }

        // 3) فحص الحد الأقصى للطلب
        const globalMax = settings.max_limit_per_order || Infinity;
        if (totalAmount > globalMax) {
          return {
            eligible: false,
            reason: `المبلغ الإجمالي ${totalAmount} د.ج يتجاوز الحد الأقصى المسموح به (${globalMax} د.ج) للدفع عبر فاتورة الهاتف.`,
            ineligibleMerchants: []
          };
        }

        // 4) و 5) فحص إعدادات كل بائع
        const ineligibleMerchants = [];

        for (const item of cartItems) {
          const vendorSettings = await this.getVendorSettings(item.merchantEmail);

          // البائع ليس لديه إعدادات DCB أو غير مفعّل
          if (!vendorSettings || !vendorSettings.is_enabled) {
            ineligibleMerchants.push(item.merchantEmail);
            continue;
          }

          // فحص الحد الأقصى الخاص بالبائع
          const vendorMax = vendorSettings.max_limit_override || globalMax;
          if (item.amount > vendorMax) {
            ineligibleMerchants.push(item.merchantEmail);
          }
        }

        if (ineligibleMerchants.length > 0) {
          return {
            eligible: false,
            reason: `بعض البائعين لا يدعمون الدفع عبر فاتورة الهاتف أو تم تجاوز الحد المسموح لهم.`,
            ineligibleMerchants
          };
        }

        return {
          eligible: true,
          reason: 'السلة مؤهلة للدفع عبر فاتورة الهاتف.',
          ineligibleMerchants: []
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ في فحص الأهلية:', err);
        return {
          eligible: false,
          reason: 'حدث خطأ أثناء فحص أهلية الدفع. يرجى المحاولة لاحقاً.',
          ineligibleMerchants: []
        };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getDailyUsage - الاستعلام عن الاستخدام اليومي لرقم هاتف
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * الحصول على الاستخدام اليومي لرقم هاتف معين
     * @param {string} phoneNumber - رقم الهاتف
     * @returns {Promise<{used: number, remaining: number, limit: number}>}
     */
    async getDailyUsage(phoneNumber) {
      try {
        const settings = await this.getSettings();
        const dailyLimit = (settings && settings.daily_limit_per_phone) || 0;

        const sb = _getSupabase();
        const todayStart = _todayStartUTC();

        const { data, error } = await sb
          .from('dcb_transactions')
          .select('amount')
          .eq('phone_number', phoneNumber)
          .in('status', ['completed', 'charging'])
          .gte('created_at', todayStart);

        if (error) {
          console.error('❌ [DCB] خطأ في جلب الاستخدام اليومي:', error.message);
          return { used: 0, remaining: dailyLimit, limit: dailyLimit };
        }

        const used = (data || []).reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
        const remaining = Math.max(0, dailyLimit - used);

        return { used, remaining, limit: dailyLimit };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getDailyUsage:', err);
        return { used: 0, remaining: 0, limit: 0 };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  initiatePayment - بدء عملية الدفع
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * بدء عملية دفع جديدة عبر فاتورة الهاتف
     * @param {string} phoneNumber - رقم الهاتف
     * @param {string} carrier - شركة الاتصالات (mobilis, djezzy, ooredoo)
     * @param {number} amount - المبلغ الإجمالي
     * @param {Array<{merchantEmail: string, amount: number}>} cartItems - عناصر السلة
     * @returns {Promise<{transactionId: string|null, otpExpiry: string|null, success: boolean, error?: string}>}
     */
    async initiatePayment(phoneNumber, carrier, amount, cartItems) {
      try {
        // التحقق من المدخلات
        if (!phoneNumber || !carrier || !amount || !cartItems || cartItems.length === 0) {
          return {
            transactionId: null,
            otpExpiry: null,
            success: false,
            error: 'بيانات الدفع غير مكتملة. يرجى التأكد من إدخال جميع البيانات المطلوبة.'
          };
        }

        const settings = await this.getSettings();
        if (!settings || !settings.is_enabled) {
          return {
            transactionId: null,
            otpExpiry: null,
            success: false,
            error: 'خدمة الدفع عبر فاتورة الهاتف غير مفعّلة حالياً.'
          };
        }

        // فحص الحد اليومي
        const usage = await this.getDailyUsage(phoneNumber);
        if (amount > usage.remaining) {
          return {
            transactionId: null,
            otpExpiry: null,
            success: false,
            error: `لقد تجاوزت الحد اليومي للدفع عبر الهاتف. المتبقي: ${usage.remaining} د.ج من أصل ${usage.limit} د.ج.`
          };
        }

        // توليد OTP
        const otpCode = _generateOTP();
        const otpExpirySeconds = settings.otp_expiry_seconds || 120;
        const otpExpiresAt = new Date(Date.now() + otpExpirySeconds * 1000).toISOString();

        // إنشاء سجل المعاملة
        const sb = _getSupabase();
        const { data, error } = await sb
          .from('dcb_transactions')
          .insert({
            phone_number: phoneNumber,
            carrier: carrier,
            amount: amount,
            status: 'otp_sent',
            otp_code: otpCode,
            otp_expires_at: otpExpiresAt,
            otp_attempts: 0,
            platform_fee: 0,
            net_amount: 0,
            metadata: { cart_items: cartItems }
          })
          .select('id')
          .single();

        if (error) {
          console.error('❌ [DCB] خطأ في إنشاء المعاملة:', error.message);
          return {
            transactionId: null,
            otpExpiry: null,
            success: false,
            error: 'فشل في إنشاء المعاملة. يرجى المحاولة لاحقاً.'
          };
        }

        // محاكاة: طباعة OTP في الكونسول
        const carrierName = CARRIER_DISPLAY_NAMES[carrier] || carrier;
        console.log(`🔐 [DCB محاكاة] كود OTP: ${otpCode} | الهاتف: ${phoneNumber} | شركة: ${carrierName}`);

        return {
          transactionId: data.id,
          otpExpiry: otpExpiresAt,
          success: true
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في initiatePayment:', err);
        return {
          transactionId: null,
          otpExpiry: null,
          success: false,
          error: 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.'
        };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  sendOTP - إرسال (إعادة إرسال) كود OTP (محاكاة)
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * إرسال أو إعادة إرسال كود OTP (محاكاة)
     * في البيئة الحقيقية، سيتم استدعاء API شركة الاتصالات
     * @param {string} transactionId - معرّف المعاملة
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async sendOTP(transactionId) {
      try {
        if (!transactionId) {
          return { success: false, message: 'معرّف المعاملة مطلوب.' };
        }

        const settings = await this.getSettings();
        const otpExpirySeconds = (settings && settings.otp_expiry_seconds) || 120;

        // توليد كود OTP جديد
        const otpCode = _generateOTP();
        const otpExpiresAt = new Date(Date.now() + otpExpirySeconds * 1000).toISOString();

        const sb = _getSupabase();

        // تحديث المعاملة بالكود الجديد
        const { data, error } = await sb
          .from('dcb_transactions')
          .update({
            otp_code: otpCode,
            otp_expires_at: otpExpiresAt,
            otp_attempts: 0,
            status: 'otp_sent'
          })
          .eq('id', transactionId)
          .select('phone_number, carrier')
          .single();

        if (error) {
          console.error('❌ [DCB] خطأ في إرسال OTP:', error.message);
          return { success: false, message: 'فشل في إرسال كود التحقق. يرجى المحاولة لاحقاً.' };
        }

        if (!data) {
          return { success: false, message: 'المعاملة غير موجودة.' };
        }

        // محاكاة: طباعة OTP في الكونسول
        const carrierName = CARRIER_DISPLAY_NAMES[data.carrier] || data.carrier;
        console.log(`🔐 [DCB محاكاة] كود OTP: ${otpCode} | الهاتف: ${data.phone_number} | شركة: ${carrierName}`);

        return {
          success: true,
          message: `تم إرسال كود التحقق إلى رقم ${data.phone_number} عبر ${carrierName}.`
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في sendOTP:', err);
        return { success: false, message: 'حدث خطأ غير متوقع أثناء إرسال كود التحقق.' };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  verifyOTP - التحقق من كود OTP
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * التحقق من كود OTP المُدخل من المستخدم
     * @param {string} transactionId - معرّف المعاملة
     * @param {string} userCode - الكود المُدخل من المستخدم
     * @returns {Promise<{verified: boolean, message: string, attemptsRemaining: number}>}
     */
    async verifyOTP(transactionId, userCode) {
      try {
        if (!transactionId || !userCode) {
          return {
            verified: false,
            message: 'معرّف المعاملة وكود التحقق مطلوبان.',
            attemptsRemaining: 0
          };
        }

        const sb = _getSupabase();

        // جلب بيانات المعاملة
        const { data: txn, error: fetchErr } = await sb
          .from('dcb_transactions')
          .select('otp_code, otp_expires_at, otp_attempts, status')
          .eq('id', transactionId)
          .single();

        if (fetchErr || !txn) {
          console.error('❌ [DCB] خطأ في جلب المعاملة:', fetchErr?.message);
          return {
            verified: false,
            message: 'المعاملة غير موجودة أو حدث خطأ.',
            attemptsRemaining: 0
          };
        }

        // التحقق من حالة المعاملة
        if (txn.status === 'failed') {
          return {
            verified: false,
            message: 'هذه المعاملة فشلت. يرجى بدء عملية دفع جديدة.',
            attemptsRemaining: 0
          };
        }

        if (txn.status === 'otp_verified' || txn.status === 'completed' || txn.status === 'charging') {
          return {
            verified: true,
            message: 'تم التحقق من هذه المعاملة مسبقاً.',
            attemptsRemaining: MAX_OTP_ATTEMPTS - (txn.otp_attempts || 0)
          };
        }

        // التحقق من انتهاء صلاحية OTP
        const now = new Date();
        const expiresAt = new Date(txn.otp_expires_at);
        if (now > expiresAt) {
          await sb
            .from('dcb_transactions')
            .update({ status: 'failed', failure_reason: 'انتهت صلاحية كود التحقق' })
            .eq('id', transactionId);

          return {
            verified: false,
            message: 'انتهت صلاحية كود التحقق. يرجى طلب كود جديد أو بدء عملية دفع جديدة.',
            attemptsRemaining: 0
          };
        }

        // زيادة عداد المحاولات
        const newAttempts = (txn.otp_attempts || 0) + 1;
        const attemptsRemaining = Math.max(0, MAX_OTP_ATTEMPTS - newAttempts);

        // التحقق من تطابق الكود
        const trimmedUserCode = String(userCode).trim();
        if (trimmedUserCode === txn.otp_code) {
          // ✅ الكود صحيح
          await sb
            .from('dcb_transactions')
            .update({
              status: 'otp_verified',
              otp_attempts: newAttempts
            })
            .eq('id', transactionId);

          return {
            verified: true,
            message: 'تم التحقق من كود التأكيد بنجاح.',
            attemptsRemaining
          };
        }

        // ❌ الكود خاطئ
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          // تجاوز الحد الأقصى للمحاولات
          await sb
            .from('dcb_transactions')
            .update({
              status: 'failed',
              otp_attempts: newAttempts,
              failure_reason: 'تجاوز الحد الأقصى لمحاولات التحقق'
            })
            .eq('id', transactionId);

          return {
            verified: false,
            message: 'لقد تجاوزت الحد الأقصى لمحاولات التحقق. يرجى بدء عملية دفع جديدة.',
            attemptsRemaining: 0
          };
        }

        // محاولات متبقية
        await sb
          .from('dcb_transactions')
          .update({ otp_attempts: newAttempts })
          .eq('id', transactionId);

        return {
          verified: false,
          message: `كود التحقق غير صحيح. لديك ${attemptsRemaining} محاولة متبقية.`,
          attemptsRemaining
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في verifyOTP:', err);
        return {
          verified: false,
          message: 'حدث خطأ أثناء التحقق من الكود. يرجى المحاولة لاحقاً.',
          attemptsRemaining: 0
        };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  chargePhone - خصم المبلغ من فاتورة الهاتف (محاكاة)
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * خصم المبلغ من فاتورة الهاتف (محاكاة)
     * في البيئة الحقيقية، سيتم استدعاء API الخصم لشركة الاتصالات
     * @param {string} transactionId - معرّف المعاملة
     * @returns {Promise<{success: boolean, carrierRef: string|null, message: string}>}
     */
    async chargePhone(transactionId) {
      try {
        if (!transactionId) {
          return { success: false, carrierRef: null, message: 'معرّف المعاملة مطلوب.' };
        }

        const sb = _getSupabase();

        // جلب بيانات المعاملة
        const { data: txn, error: fetchErr } = await sb
          .from('dcb_transactions')
          .select('id, status, amount, carrier, phone_number, metadata')
          .eq('id', transactionId)
          .single();

        if (fetchErr || !txn) {
          console.error('❌ [DCB] خطأ في جلب المعاملة:', fetchErr?.message);
          return { success: false, carrierRef: null, message: 'المعاملة غير موجودة.' };
        }

        // التحقق من أن المعاملة بالحالة الصحيحة
        if (txn.status !== 'otp_verified') {
          return {
            success: false,
            carrierRef: null,
            message: `لا يمكن خصم المبلغ. حالة المعاملة الحالية: ${txn.status}. يجب التحقق من OTP أولاً.`
          };
        }

        // تحديث الحالة إلى "جاري الخصم"
        await sb
          .from('dcb_transactions')
          .update({ status: 'charging' })
          .eq('id', transactionId);

        // ⏳ محاكاة تأخر الشبكة (1.5 ثانية)
        const carrierName = CARRIER_DISPLAY_NAMES[txn.carrier] || txn.carrier;
        console.log(`⏳ [DCB محاكاة] جاري الخصم من ${carrierName} للرقم ${txn.phone_number}...`);
        await _delay(1500);

        // حساب الرسوم
        const settings = await this.getSettings();
        const feePercent = (settings && settings.platform_fee_percent) || 0;
        
        let carrierFeePercent = 0;
        if (txn.carrier === 'mobilis') carrierFeePercent = (settings && settings.mobilis_fee_percent) || 0;
        else if (txn.carrier === 'djezzy') carrierFeePercent = (settings && settings.djezzy_fee_percent) || 0;
        else if (txn.carrier === 'ooredoo') carrierFeePercent = (settings && settings.ooredoo_fee_percent) || 0;

        const platformFee = parseFloat(((txn.amount * feePercent) / 100).toFixed(2));
        const carrierFee = parseFloat(((txn.amount * carrierFeePercent) / 100).toFixed(2));
        const netAmount = parseFloat((txn.amount - platformFee - carrierFee).toFixed(2));

        // توليد مرجع وهمي
        const carrierRef = _generateCarrierRef();

        // تحديث المعاملة كمكتملة
        const { error: updateErr } = await sb
          .from('dcb_transactions')
          .update({
            status: 'completed',
            platform_fee: platformFee,
            carrier_fee: carrierFee,
            net_amount: netAmount,
            carrier_ref: carrierRef,
            completed_at: new Date().toISOString()
          })
          .eq('id', transactionId);

        if (updateErr) {
          console.error('❌ [DCB] خطأ في تحديث المعاملة بعد الخصم:', updateErr.message);
          // محاولة إرجاع الحالة
          await sb
            .from('dcb_transactions')
            .update({
              status: 'failed',
              failure_reason: 'فشل في تحديث المعاملة بعد الخصم: ' + updateErr.message
            })
            .eq('id', transactionId);

          return { success: false, carrierRef: null, message: 'فشل في إتمام عملية الخصم.' };
        }

        // إنشاء التقسيمات للبائعين
        const cartItems = (txn.metadata && txn.metadata.cart_items) || [];
        if (cartItems.length > 0) {
          await this.createSplits(transactionId, cartItems, feePercent, carrierFeePercent);
        }

        console.log(`✅ [DCB محاكاة] تم الخصم بنجاح. المرجع: ${carrierRef} | المبلغ: ${txn.amount} د.ج`);

        return {
          success: true,
          carrierRef: carrierRef,
          message: `تم خصم ${txn.amount} د.ج من فاتورة ${carrierName} بنجاح. المرجع: ${carrierRef}`
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في chargePhone:', err);

        // محاولة تحديث حالة المعاملة إلى فاشلة
        try {
          const sb = _getSupabase();
          await sb
            .from('dcb_transactions')
            .update({
              status: 'failed',
              failure_reason: 'خطأ غير متوقع أثناء الخصم: ' + err.message
            })
            .eq('id', transactionId);
        } catch (_) { /* تجاهل الخطأ الثانوي */ }

        return {
          success: false,
          carrierRef: null,
          message: 'حدث خطأ غير متوقع أثناء عملية الخصم. يرجى المحاولة لاحقاً.'
        };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  createSplits - إنشاء تقسيمات المعاملة بين البائعين
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * إنشاء تقسيمات المعاملة بين البائعين في جدول dcb_transaction_splits
     * @param {string} transactionId - معرّف المعاملة
     * @param {Array<{merchantEmail: string, amount: number}>} cartItems - عناصر السلة
     * @param {number} platformFeePercent - نسبة رسوم المنصة
     * @param {number} carrierFeePercent - نسبة رسوم شركة الاتصالات
     * @returns {Promise<Array>} مصفوفة التقسيمات المُنشأة
     */
    async createSplits(transactionId, cartItems, platformFeePercent, carrierFeePercent) {
      try {
        if (!transactionId || !cartItems || cartItems.length === 0) {
          console.warn('⚠️ [DCB] بيانات غير كافية لإنشاء التقسيمات.');
          return [];
        }

        const feePercent = platformFeePercent || 0;
        const cFeePercent = carrierFeePercent || 0;
        const splits = cartItems.map(item => {
          const itemPlatformFee = parseFloat(((item.amount * feePercent) / 100).toFixed(2));
          const itemCarrierFee = parseFloat(((item.amount * cFeePercent) / 100).toFixed(2));
          const itemNet = parseFloat((item.amount - itemPlatformFee - itemCarrierFee).toFixed(2));

          return {
            transaction_id: transactionId,
            merchant_email: item.merchantEmail,
            amount: item.amount,
            platform_fee: itemPlatformFee,
            carrier_fee: itemCarrierFee,
            net_amount: itemNet,
            status: 'completed'
          };
        });

        const sb = _getSupabase();
        const { data, error } = await sb
          .from('dcb_transaction_splits')
          .insert(splits)
          .select();

        if (error) {
          console.error('❌ [DCB] خطأ في إنشاء التقسيمات:', error.message);
          return [];
        }

        return data || [];
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في createSplits:', err);
        return [];
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getTransactionStatus - جلب حالة معاملة مع التقسيمات
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * جلب سجل المعاملة الكامل مع التقسيمات
     * @param {string} transactionId - معرّف المعاملة
     * @returns {Promise<object|null>} سجل المعاملة مع التقسيمات أو null
     */
    async getTransactionStatus(transactionId) {
      try {
        if (!transactionId) {
          return null;
        }

        const sb = _getSupabase();

        // جلب المعاملة
        const { data: txn, error: txnErr } = await sb
          .from('dcb_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (txnErr || !txn) {
          console.error('❌ [DCB] خطأ في جلب المعاملة:', txnErr?.message);
          return null;
        }

        // جلب التقسيمات
        const { data: splits, error: splitsErr } = await sb
          .from('dcb_transaction_splits')
          .select('*')
          .eq('transaction_id', transactionId);

        if (splitsErr) {
          console.warn('⚠️ [DCB] خطأ في جلب التقسيمات:', splitsErr.message);
        }

        // إضافة اسم شركة الاتصالات للعرض
        txn.carrier_display_name = CARRIER_DISPLAY_NAMES[txn.carrier] || txn.carrier;
        txn.splits = splits || [];

        return txn;
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getTransactionStatus:', err);
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getTransactions - جلب قائمة المعاملات مع فلاتر
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * جلب قائمة المعاملات مع إمكانية التصفية
     * للوحات تحكم المشرف والبائعين
     * @param {object} filters - فلاتر البحث
     * @param {string} [filters.merchantEmail] - تصفية حسب البائع
     * @param {string} [filters.status] - تصفية حسب الحالة
     * @param {string} [filters.dateFrom] - تاريخ البداية (ISO string)
     * @param {string} [filters.dateTo] - تاريخ النهاية (ISO string)
     * @param {number} [filters.limit=50] - الحد الأقصى للنتائج
     * @param {number} [filters.offset=0] - بداية النتائج
     * @returns {Promise<Array>} مصفوفة المعاملات
     */
    async getTransactions(filters = {}) {
      try {
        const sb = _getSupabase();
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        // إذا كان الفلتر حسب البائع، نبحث في التقسيمات أولاً
        if (filters.merchantEmail) {
          // جلب معرّفات المعاملات الخاصة بالبائع
          let splitsQuery = sb
            .from('dcb_transaction_splits')
            .select('transaction_id')
            .eq('merchant_email', filters.merchantEmail);

          const { data: splitsData, error: splitsErr } = await splitsQuery;

          if (splitsErr) {
            console.error('❌ [DCB] خطأ في جلب تقسيمات البائع:', splitsErr.message);
            return [];
          }

          const txnIds = (splitsData || []).map(s => s.transaction_id);
          if (txnIds.length === 0) return [];

          let query = sb
            .from('dcb_transactions')
            .select('*')
            .in('id', txnIds)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (filters.status) query = query.eq('status', filters.status);
          if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
          if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

          const { data, error } = await query;

          if (error) {
            console.error('❌ [DCB] خطأ في جلب المعاملات:', error.message);
            return [];
          }

          return (data || []).map(txn => {
            txn.carrier_display_name = CARRIER_DISPLAY_NAMES[txn.carrier] || txn.carrier;
            return txn;
          });
        }

        // بدون فلتر بائع – جلب جميع المعاملات
        let query = sb
          .from('dcb_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

        const { data, error } = await query;

        if (error) {
          console.error('❌ [DCB] خطأ في جلب المعاملات:', error.message);
          return [];
        }

        return (data || []).map(txn => {
          txn.carrier_display_name = CARRIER_DISPLAY_NAMES[txn.carrier] || txn.carrier;
          return txn;
        });
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getTransactions:', err);
        return [];
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  getStats - إحصائيات المعاملات
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * جلب إحصائيات المعاملات (عامة أو لبائع معين)
     * @param {string} [merchantEmail] - بريد البائع (اختياري، إذا لم يُحدد يتم جلب الإحصائيات العامة)
     * @returns {Promise<{totalTransactions: number, successfulTransactions: number, failedTransactions: number, totalAmount: number, totalFees: number, successRate: number}>}
     */
    async getStats(merchantEmail) {
      try {
        const sb = _getSupabase();

        // إحصائيات لبائع معين
        if (merchantEmail) {
          // جلب التقسيمات الخاصة بالبائع
          const { data: splits, error: splitsErr } = await sb
            .from('dcb_transaction_splits')
            .select('transaction_id, amount, platform_fee, net_amount, status')
            .eq('merchant_email', merchantEmail);

          if (splitsErr) {
            console.error('❌ [DCB] خطأ في جلب إحصائيات البائع:', splitsErr.message);
            return this._emptyStats();
          }

          if (!splits || splits.length === 0) return this._emptyStats();

          // جلب المعاملات المرتبطة لمعرفة حالاتها
          const txnIds = [...new Set(splits.map(s => s.transaction_id))];
          const { data: txns, error: txnErr } = await sb
            .from('dcb_transactions')
            .select('id, status')
            .in('id', txnIds);

          if (txnErr) {
            console.error('❌ [DCB] خطأ في جلب المعاملات للإحصائيات:', txnErr.message);
            return this._emptyStats();
          }

          const statusMap = {};
          (txns || []).forEach(t => { statusMap[t.id] = t.status; });

          const totalTransactions = txnIds.length;
          let successfulTransactions = 0;
          let failedTransactions = 0;
          let totalAmount = 0;
          let totalFees = 0;

          splits.forEach(split => {
            const txnStatus = statusMap[split.transaction_id];
            if (txnStatus === 'completed') {
              successfulTransactions++;
              totalAmount += parseFloat(split.amount) || 0;
              totalFees += parseFloat(split.platform_fee) || 0;
            } else if (txnStatus === 'failed') {
              failedTransactions++;
            }
          });

          const successRate = totalTransactions > 0
            ? parseFloat(((successfulTransactions / totalTransactions) * 100).toFixed(1))
            : 0;

          return {
            totalTransactions,
            successfulTransactions,
            failedTransactions,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            totalFees: parseFloat(totalFees.toFixed(2)),
            successRate
          };
        }

        // إحصائيات عامة (جميع المعاملات)
        const { data: allTxns, error: allErr } = await sb
          .from('dcb_transactions')
          .select('status, amount, platform_fee');

        if (allErr) {
          console.error('❌ [DCB] خطأ في جلب الإحصائيات العامة:', allErr.message);
          return this._emptyStats();
        }

        if (!allTxns || allTxns.length === 0) return this._emptyStats();

        const totalTransactions = allTxns.length;
        let successfulTransactions = 0;
        let failedTransactions = 0;
        let totalAmount = 0;
        let totalFees = 0;

        allTxns.forEach(txn => {
          if (txn.status === 'completed') {
            successfulTransactions++;
            totalAmount += parseFloat(txn.amount) || 0;
            totalFees += parseFloat(txn.platform_fee) || 0;
          } else if (txn.status === 'failed') {
            failedTransactions++;
          }
        });

        const successRate = totalTransactions > 0
          ? parseFloat(((successfulTransactions / totalTransactions) * 100).toFixed(1))
          : 0;

        return {
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          totalFees: parseFloat(totalFees.toFixed(2)),
          successRate
        };
      } catch (err) {
        console.error('❌ [DCB] خطأ غير متوقع في getStats:', err);
        return this._emptyStats();
      }
    },

    /**
     * كائن إحصائيات فارغ (مساعد داخلي)
     * @returns {object}
     */
    _emptyStats() {
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalAmount: 0,
        totalFees: 0,
        successRate: 0
      };
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  أدوات مساعدة
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * مسح كاش الإعدادات يدوياً
     * مفيد بعد تعديل الإعدادات من لوحة التحكم
     */
    clearSettingsCache() {
      _settingsCache = null;
      _settingsCacheTime = 0;
      console.log('🗑️ [DCB] تم مسح كاش الإعدادات.');
    },

    /**
     * الحصول على اسم شركة الاتصالات للعرض
     * @param {string} carrierKey - مفتاح الشركة (mobilis, djezzy, ooredoo)
     * @returns {string} اسم الشركة بالعربية
     */
    getCarrierDisplayName(carrierKey) {
      return CARRIER_DISPLAY_NAMES[carrierKey] || carrierKey;
    },

    /**
     * الحصول على جميع أسماء شركات الاتصالات
     * @returns {object} كائن أسماء الشركات
     */
    getCarrierNames() {
      return { ...CARRIER_DISPLAY_NAMES };
    }
  };

  // ─── تسجيل المحرك عالمياً ──────────────────────────────────────────────────
  window.DCBEngine = DCBEngine;

  console.log('📱 [DCB] تم تحميل محرك الدفع عبر فاتورة الهاتف (v1.0.0)');

})();
