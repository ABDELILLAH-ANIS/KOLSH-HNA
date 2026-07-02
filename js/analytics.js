/**
 * @file analytics.js
 * @description KH Analytics — lightweight, non-blocking analytics helpers for
 *              the Kolch Hna platform.
 *
 * Exposes: window.KH_Analytics
 *
 * Design principles:
 *  - All functions are async and fire-and-forget: errors are caught silently
 *    so analytics failures can NEVER break the UI.
 *  - Unique-visit deduplication uses sessionStorage per merchant slug.
 *  - sessionId is generated once per browser session (UUID v4, stored in
 *    sessionStorage so it resets when the tab is closed).
 *
 * Dependencies: window.getSupabaseClient() from js/config.js
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * SESSION ID
   * A UUID v4 generated once per browser session.
   * Persisted in sessionStorage so it survives page navigations
   * within the same tab but resets when the tab is closed.
   * ───────────────────────────────────────────────────────────── */

  const SESSION_KEY = 'kh_analytics_session_id';

  /**
   * Generate a UUID v4 string.
   * Uses crypto.randomUUID() when available (modern browsers);
   * falls back to a manual Math.random()-based approach.
   *
   * @returns {string} UUID v4
   */
  function _generateUUID() {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    // Polyfill for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Retrieve the persistent session ID, creating one if it doesn't exist.
   * @returns {string}
   */
  function _getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = _generateUUID();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      // sessionStorage unavailable (private mode edge cases) — generate ephemeral ID
      return _generateUUID();
    }
  }

  /** @type {string} Unique identifier for the current browser session */
  const sessionId = _getSessionId();

  /* ─────────────────────────────────────────────────────────────
   * UNIQUE VISIT TRACKING
   * Per-merchant deduplication within a single browser session.
   * Key pattern: kh_visited_<merchantSlug>
   * ───────────────────────────────────────────────────────────── */

  /**
   * Check whether this session has already counted a visit to a store.
   *
   * @param {string} merchantSlug - The merchant's unique URL slug
   * @returns {boolean} true if this session already visited this store
   */
  function isUniqueVisit(merchantSlug) {
    if (!merchantSlug) return false;
    try {
      return sessionStorage.getItem(`kh_visited_${merchantSlug}`) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Mark a store as visited for the current session so we don't double-count.
   * @param {string} merchantSlug
   */
  function _markVisited(merchantSlug) {
    try {
      sessionStorage.setItem(`kh_visited_${merchantSlug}`, '1');
    } catch { /* ignore */ }
  }

  /* ─────────────────────────────────────────────────────────────
   * SUPABASE HELPER
   * ───────────────────────────────────────────────────────────── */

  /**
   * Get the Supabase client, returning null silently if unavailable.
   * @returns {import('@supabase/supabase-js').SupabaseClient|null}
   */
  function _client() {
    return window.getSupabaseClient ? window.getSupabaseClient() : null;
  }

  /* ─────────────────────────────────────────────────────────────
   * CORE ANALYTICS FUNCTIONS
   * All are async. Errors are swallowed — analytics must not crash the UI.
   * ───────────────────────────────────────────────────────────── */

  /**
   * Increment the visitor_count for a merchant store.
   *
   * Deduplication: if isUniqueVisit() returns true (already visited this
   * session), the function returns immediately without calling Supabase.
   *
   * Uses an RPC function `increment_visitor_count(slug)` if available,
   * falling back to a SELECT + UPDATE pattern.
   *
   * @param {string} merchantSlug - The merchant's unique URL slug
   * @returns {Promise<void>}
   */
  async function trackVisit(merchantSlug) {
    try {
      if (!merchantSlug) return;

      // Deduplicate — skip if already counted this session
      if (isUniqueVisit(merchantSlug)) return;

      // Mark immediately so concurrent calls don't double-track
      _markVisited(merchantSlug);

      const supabase = _client();
      if (!supabase) return;

      // Attempt RPC first (atomic server-side increment — no race conditions)
      const { error: rpcError } = await supabase.rpc('increment_visitor_count', {
        p_slug: merchantSlug,
      });

      if (!rpcError) return; // success via RPC

      // RPC not available — fall back to manual increment
      // 1. Fetch current count
      const { data: merchant, error: fetchError } = await supabase
        .from('merchant')
        .select('visitor_count')
        .eq('slug', merchantSlug)
        .single();

      if (fetchError || !merchant) return;

      // 2. Increment and write back
      await supabase
        .from('merchant')
        .update({ visitor_count: (merchant.visitor_count || 0) + 1 })
        .eq('slug', merchantSlug);

    } catch (err) {
      // Silent — analytics must never break the store UI
      console.debug('[KH_Analytics] trackVisit error (non-critical):', err);
    }
  }

  /**
   * Record a completed order and update the merchant's total sales figures.
   *
   * Updates the `merchant` table:
   *  - order_count  (incremented by 1)
   *  - total_revenue (incremented by orderTotal)
   *
   * @param {string} merchantEmail - Merchant's email (primary key in merchant table)
   * @param {number} orderTotal    - Order value in DZD
   * @returns {Promise<void>}
   */
  async function recordOrder(merchantEmail, orderTotal) {
    try {
      if (!merchantEmail || typeof orderTotal !== 'number') return;

      const supabase = _client();
      if (!supabase) return;

      // Fetch current totals
      const { data: merchant, error: fetchError } = await supabase
        .from('merchant')
        .select('order_count, total_revenue')
        .eq('email', merchantEmail)
        .single();

      if (fetchError || !merchant) return;

      await supabase
        .from('merchant')
        .update({
          order_count:   (merchant.order_count   || 0) + 1,
          total_revenue: (merchant.total_revenue  || 0) + orderTotal,
        })
        .eq('email', merchantEmail);

    } catch (err) {
      console.debug('[KH_Analytics] recordOrder error (non-critical):', err);
    }
  }

  /**
   * Retrieve aggregated stats for a merchant from the `merchant` table.
   *
   * Returns:
   *  - visitors:       total visitor_count
   *  - orders:         total order_count
   *  - revenue:        total_revenue in DZD
   *  - conversionRate: (orders / visitors) * 100, rounded to 2 decimal places
   *
   * @param {string} merchantEmail
   * @returns {Promise<{visitors: number, orders: number, revenue: number, conversionRate: number}>}
   */
  async function getMerchantStats(merchantEmail) {
    const defaults = { visitors: 0, orders: 0, revenue: 0, conversionRate: 0 };

    try {
      if (!merchantEmail) return defaults;

      const supabase = _client();
      if (!supabase) return defaults;

      const { data, error } = await supabase
        .from('merchant')
        .select('visitor_count, order_count, total_revenue')
        .eq('email', merchantEmail)
        .single();

      if (error || !data) return defaults;

      const visitors = data.visitor_count  || 0;
      const orders   = data.order_count    || 0;
      const revenue  = data.total_revenue  || 0;

      const conversionRate = visitors > 0
        ? Math.round((orders / visitors) * 10000) / 100  // 2 decimal places
        : 0;

      return { visitors, orders, revenue, conversionRate };

    } catch (err) {
      console.debug('[KH_Analytics] getMerchantStats error (non-critical):', err);
      return defaults;
    }
  }

  /**
   * Retrieve daily analytics for a merchant over a given number of past days.
   *
   * Queries the `analytics_daily` table which should have columns:
   *   date (date), merchant_email (text), visitors (int), orders (int), revenue (numeric)
   *
   * If the table doesn't exist yet, returns an empty array silently.
   *
   * @param {string} merchantEmail
   * @param {number} [days=30] - Number of past days to include
   * @returns {Promise<Array<{date: string, visitors: number, orders: number, revenue: number}>>}
   */
  async function getDailyStats(merchantEmail, days = 30) {
    try {
      if (!merchantEmail) return [];

      const supabase = _client();
      if (!supabase) return [];

      // Calculate the start date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startIso = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from('analytics_daily')
        .select('date, visitors, orders, revenue')
        .eq('merchant_email', merchantEmail)
        .gte('date', startIso)
        .order('date', { ascending: true });

      if (error) {
        // Table may not exist yet — non-critical
        console.debug('[KH_Analytics] getDailyStats error (non-critical):', error.message);
        return [];
      }

      // Normalise rows to guarantee numeric types
      return (data || []).map(row => ({
        date:     row.date,
        visitors: Number(row.visitors) || 0,
        orders:   Number(row.orders)   || 0,
        revenue:  Number(row.revenue)  || 0,
      }));

    } catch (err) {
      console.debug('[KH_Analytics] getDailyStats error (non-critical):', err);
      return [];
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * PLATFORM KPIs (Admin Dashboard)
   * ───────────────────────────────────────────────────────────── */

  /**
   * Retrieve aggregated platform KPIs for the admin dashboard.
   * @returns {Promise<Object>}
   */
  async function getPlatformKPIs() {
    const supabase = _client();
    const defaults = {
      totalUsers: 0, activeMerchants: 0, totalMerchants: 0,
      totalOrders: 0, totalRevenue: 0, newSignupsToday: 0,
      planCounts: { basic: 0, gold: 0, premium: 0, vip: 0 }
    };

    try {
      if (!supabase) return defaults;

      const today = new Date().toISOString().split('T')[0];

      const [usersRes, merchantRes, ordersRes, todayRes] = await Promise.all([
        supabase.from('users').select('id, account_status', { count: 'exact' }),
        supabase.from('merchant').select('email, package_type, account_status, total_revenue'),
        supabase.from('orders').select('id, total_price', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).gte('created_at', today + 'T00:00:00Z')
      ]);

      const merchants = merchantRes.data || [];
      const planCounts = { basic: 0, gold: 0, premium: 0, vip: 0 };
      let totalRevenue = 0;
      let activeMerchants = 0;

      merchants.forEach(m => {
        if (planCounts[m.package_type] !== undefined) planCounts[m.package_type]++;
        if (m.account_status === 'active') activeMerchants++;
        totalRevenue += (m.total_revenue || 0);
      });

      // Supplement with orders total
      if (!totalRevenue && ordersRes.data) {
        totalRevenue = (ordersRes.data || []).reduce((s, o) => s + (o.total_price || o.total || 0), 0);
      }

      return {
        totalUsers: usersRes.count || 0,
        activeMerchants,
        totalMerchants: merchants.length,
        totalOrders: ordersRes.count || 0,
        totalRevenue,
        newSignupsToday: todayRes.count || 0,
        planCounts
      };
    } catch (err) {
      console.debug('[KH_Analytics] getPlatformKPIs error:', err);
      return defaults;
    }
  }

  /**
   * Format a number as DZD currency.
   * @param {number} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('ar-DZ') + ' DA';
  }

  /* ─────────────────────────────────────────────────────────────
   * PUBLIC API
   * ───────────────────────────────────────────────────────────── */

  /**
   * @namespace KH_Analytics
   * @description Global analytics utility namespace for the Kolch Hna platform.
   */
  window.KH_Analytics = Object.freeze({
    /** @type {string} Unique session identifier for the current browser tab */
    sessionId,
    trackVisit,
    recordOrder,
    getMerchantStats,
    getDailyStats,
    getPlatformKPIs,
    formatCurrency,
    isUniqueVisit,
  });

  console.log('✅ KH_Analytics loaded');
})();
