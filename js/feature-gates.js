/**
 * @file feature-gates.js
 * @description KH Feature Gates — plan-based access control for the Kolch Hna platform.
 *
 * Exposes: window.KH_FeatureGates
 *
 * Usage:
 *   KH_FeatureGates.can('gold', 'COUPON_CODES')      // → true
 *   KH_FeatureGates.getLimit('basic', 'MAX_PRODUCTS') // → 15
 *   KH_FeatureGates.applyAllGates('basic')            // scans DOM
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * PLAN HIERARCHY
   * Higher ordinal = higher tier. Used for "at least" comparisons.
   * ───────────────────────────────────────────────────────────── */

  /**
   * Numeric rank for each subscription plan.
   * @type {Record<string, number>}
   */
  const PLAN_HIERARCHY = Object.freeze({
    basic:   0,
    gold:    1,
    premium: 2,
    vip:     3,
  });

  /* ─────────────────────────────────────────────────────────────
   * FEATURE DEFINITIONS
   * Each feature key maps to a per-plan value.
   * - boolean: feature is on/off for that plan
   * - number:  feature has a numeric cap (Infinity = unlimited)
   * ───────────────────────────────────────────────────────────── */

  /**
   * Master feature table.
   * @type {Record<string, Record<string, boolean|number>>}
   */
  const FEATURES = Object.freeze({
    MAX_PRODUCTS: Object.freeze({
      basic: 15, gold: 50, premium: 150, vip: Infinity,
    }),
    MAX_IMAGES_PER_PRODUCT: Object.freeze({
      basic: 2, gold: 4, premium: 6, vip: 8,
    }),
    ADVANCED_ANALYTICS: Object.freeze({
      basic: false, gold: false, premium: true, vip: true,
    }),
    REVENUE_STATS: Object.freeze({
      basic: false, gold: false, premium: true, vip: true,
    }),
    COUPON_CODES: Object.freeze({
      basic: false, gold: true, premium: true, vip: true,
    }),
    STORE_SECTIONS: Object.freeze({
      basic: false, gold: true, premium: true, vip: true,
    }),
    BULK_IMPORT: Object.freeze({
      basic: false, gold: false, premium: true, vip: true,
    }),
    LOGISTICS_API: Object.freeze({
      basic: false, gold: true, premium: true, vip: true,
    }),
    VIP_ADS: Object.freeze({
      basic: false, gold: false, premium: false, vip: true,
    }),
    AD_DESIGN_REQUEST: Object.freeze({
      basic: false, gold: false, premium: false, vip: true,
    }),
    AI_AGENT: Object.freeze({
      basic: false, gold: false, premium: true, vip: true,
    }),
    BROKER_PROGRAM: Object.freeze({
      basic: false, gold: false, premium: true, vip: true,
    }),
    REAL_ESTATE: Object.freeze({
      basic: true, gold: true, premium: true, vip: true,
    }),
    SOCIAL_ADS: Object.freeze({
      basic: 0, gold: 0, premium: 0, vip: 3,
    }),
    SOCIAL_ADS_MONTHLY: Object.freeze({
      basic: 0, gold: 0, premium: 0, vip: 3,
    }),
  });

  /* ─────────────────────────────────────────────────────────────
   * CORE HELPERS
   * ───────────────────────────────────────────────────────────── */

  /**
   * Normalise a plan string to lowercase; fall back to 'basic' if unknown.
   * @param {string} plan
   * @returns {string}
   */
  function _normalisePlan(plan) {
    const p = (plan || '').toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(PLAN_HIERARCHY, p) ? p : 'basic';
  }

  /**
   * Determine whether the given plan has access to a feature.
   *
   * - For boolean features: returns the boolean value directly.
   * - For numeric features: returns true when the limit > 0.
   * - Unknown features: returns false (safe default).
   *
   * @param {string} plan    - e.g. 'gold'
   * @param {string} feature - e.g. 'COUPON_CODES'
   * @returns {boolean}
   */
  function can(plan, feature) {
    const p = _normalisePlan(plan);
    const featureConfig = FEATURES[feature];

    if (!featureConfig) {
      console.warn(`[KH_FeatureGates] Unknown feature: "${feature}"`);
      return false;
    }

    const value = featureConfig[p];

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
  }

  /**
   * Get the numeric limit (or boolean cast to 0/1) for a feature on a plan.
   * Returns 0 for features that are unavailable or boolean-false.
   *
   * @param {string} plan
   * @param {string} feature
   * @returns {number}
   */
  function getLimit(plan, feature) {
    const p = _normalisePlan(plan);
    const featureConfig = FEATURES[feature];

    if (!featureConfig) {
      console.warn(`[KH_FeatureGates] Unknown feature: "${feature}"`);
      return 0;
    }

    const value = featureConfig[p];

    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  /* ─────────────────────────────────────────────────────────────
   * DOM GATE HELPERS
   * ───────────────────────────────────────────────────────────── */

  /**
   * Apply a feature gate to a single DOM element.
   *
   * If the plan cannot access the feature:
   *  - Adds the CSS class `feature-locked` to the element.
   *  - If the element has a `data-upgrade-msg` attribute, injects a
   *    semi-transparent overlay <div> inside it showing the message.
   *
   * If the plan CAN access the feature, any previously applied gate
   * is removed so this function is safe to call on plan changes.
   *
   * @param {HTMLElement} element
   * @param {string}      plan
   * @param {string}      feature
   */
  function applyGate(element, plan, feature) {
    if (!(element instanceof HTMLElement)) return;

    const OVERLAY_CLASS = 'kh-feature-overlay';
    const LOCK_CLASS    = 'feature-locked';

    if (!can(plan, feature)) {
      // Mark as locked
      element.classList.add(LOCK_CLASS);
      element.setAttribute('aria-disabled', 'true');

      // Inject upgrade-message overlay if requested and not already present
      const upgradeMsg = element.getAttribute('data-upgrade-msg');
      if (upgradeMsg && !element.querySelector(`.${OVERLAY_CLASS}`)) {
        const overlay = document.createElement('div');
        overlay.className = OVERLAY_CLASS;

        // Inline styles keep the overlay self-contained (no CSS file dependency)
        overlay.style.cssText = [
          'position:absolute',
          'inset:0',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'background:rgba(0,0,0,0.65)',
          'backdrop-filter:blur(4px)',
          '-webkit-backdrop-filter:blur(4px)',
          'border-radius:inherit',
          'z-index:10',
          'padding:12px',
          'text-align:center',
          'color:#fff',
          'font-size:13px',
          'font-weight:600',
          'pointer-events:none',
        ].join(';');

        // Sanitize the upgrade message to prevent XSS
        const safeMsg = window.KH_Security
          ? window.KH_Security.sanitizeText(upgradeMsg)
          : upgradeMsg.replace(/<[^>]*>/g, '');

        overlay.textContent = safeMsg;

        // Ensure parent has relative positioning for the overlay to work
        const pos = getComputedStyle(element).position;
        if (pos === 'static') element.style.position = 'relative';

        element.appendChild(overlay);
      }
    } else {
      // Unlock: remove gate indicators
      element.classList.remove(LOCK_CLASS);
      element.removeAttribute('aria-disabled');

      // Remove any injected overlay
      const existing = element.querySelector(`.${OVERLAY_CLASS}`);
      if (existing) existing.remove();
    }
  }

  /**
   * Scan the entire document for elements carrying `data-feature` attributes
   * and apply the appropriate gate for the given plan.
   *
   * HTML usage:
   *   <div data-feature="COUPON_CODES" data-upgrade-msg="Upgrade to Gold to use coupons!">
   *     ...
   *   </div>
   *
   * @param {string} plan - The merchant's current plan
   */
  function applyAllGates(plan) {
    const gatedElements = document.querySelectorAll('[data-feature]');
    gatedElements.forEach(el => {
      const feature = el.getAttribute('data-feature');
      applyGate(/** @type {HTMLElement} */ (el), plan, feature);
    });
  }

  /* ─────────────────────────────────────────────────────────────
   * PUBLIC API
   * ───────────────────────────────────────────────────────────── */

  /**
   * @namespace KH_FeatureGates
   * @description Global feature-gate namespace for the Kolch Hna platform.
   */
  window.KH_FeatureGates = Object.freeze({
    PLAN_HIERARCHY,
    FEATURES,
    can,
    getLimit,
    applyGate,
    applyAllGates,
  });

  console.log('✅ KH_FeatureGates loaded');
})();
