/**
 * @file themes-engine.js
 * @description KH Themes Engine — event-driven CSS theme injector for the
 *              Kolch Hna platform.
 *
 * Exposes: window.KH_ThemesEngine
 *
 * Queries the `event_themes` Supabase table for an active theme, injects its
 * CSS override into a <style> tag in <head>, sets CSS custom properties, and
 * optionally inserts an event banner below the page header.
 *
 * Theme data is persisted to localStorage for offline resilience.
 *
 * Dependencies: window.getSupabaseClient() from js/config.js
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * CONSTANTS
   * ───────────────────────────────────────────────────────────── */

  /** ID of the injected <style> tag in <head>. */
  const STYLE_TAG_ID   = 'kh-event-theme';

  /** ID of the optional banner element injected after <header>. */
  const BANNER_ID      = 'kh-event-banner';

  /** localStorage key for offline theme persistence. */
  const STORAGE_KEY    = 'kh_active_theme';

  const PREDEFINED_THEMES = {
    ramadan: {
      name: 'رمضان الكريم',
      primary_color: '#f5a623',
      accent_color: '#ffd700',
      css_override: `
        :root {
          --theme-primary: #f5a623;
          --theme-accent: #ffd700;
          --bg-primary: #1a0a2e;
          --bg-secondary: #2d1b4e;
        }
        body {
          background-color: #1a0a2e;
          background-image: radial-gradient(circle at top, #2d1b4e 0%, #1a0a2e 70%);
        }
      `
    },
    eid: {
      name: 'عيد مبارك',
      primary_color: '#00ffc3',
      accent_color: '#00ffc3',
      css_override: `
        :root {
          --theme-primary: #00ffc3;
          --theme-accent: #00ffc3;
          --bg-primary: #0a1628;
          --bg-secondary: #162d42;
        }
        body {
          background-color: #0a1628;
          background-image: radial-gradient(circle at top, #162d42 0%, #0a1628 70%);
        }
      `
    },
    national: {
      name: 'اليوم الوطني',
      primary_color: '#006233',
      accent_color: '#00aa57',
      css_override: `
        :root {
          --theme-primary: #006233;
          --theme-accent: #00aa57;
          --bg-primary: #0a1a0f;
          --bg-secondary: #006233;
        }
        body {
          background-color: #0a1a0f;
          background-image: radial-gradient(circle at top, #006233 0%, #0a1a0f 70%);
        }
      `
    },
    default: {
      name: 'الافتراضي',
      primary_color: '#00ffc3',
      accent_color: '#00ffc3',
      css_override: ''
    }
  };

  /* ─────────────────────────────────────────────────────────────
   * MODULE STATE
   * ───────────────────────────────────────────────────────────── */

  /** @type {object|null} Currently applied theme object */
  let _currentTheme = null;

  /* ─────────────────────────────────────────────────────────────
   * HELPERS
   * ───────────────────────────────────────────────────────────── */

  /**
   * Get (or create) the <style id="kh-event-theme"> element in <head>.
   * @returns {HTMLStyleElement}
   */
  function _getOrCreateStyleTag() {
    let tag = document.getElementById(STYLE_TAG_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_TAG_ID;
      tag.setAttribute('data-source', 'KH_ThemesEngine');
      document.head.appendChild(tag);
    }
    return /** @type {HTMLStyleElement} */ (tag);
  }

  /**
   * Inject or update the event banner element.
   * The banner is inserted immediately after the first <header> tag,
   * or at the very top of <body> if no <header> exists.
   *
   * @param {string} bannerUrl - Image URL for the banner
   * @param {string} [altText] - Accessible alt text
   */
  function _injectBanner(bannerUrl, altText = 'Event Banner') {
    // Remove any existing banner first
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();

    // Sanitise the URL — only allow http(s) URLs to prevent javascript: injections
    try {
      const parsed = new URL(bannerUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    } catch {
      return; // invalid URL
    }

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = [
      'width:100%',
      'max-height:200px',
      'overflow:hidden',
      'text-align:center',
      'line-height:0',
      'z-index:50',
    ].join(';');

    const img = document.createElement('img');
    img.src   = bannerUrl;
    img.alt   = altText;
    img.style.cssText = 'width:100%;max-height:200px;object-fit:cover;display:block;';

    banner.appendChild(img);

    // Insert after first <header>, or prepend to <body>
    const header = document.querySelector('header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else if (header) {
      header.after(banner);
    } else {
      document.body.prepend(banner);
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * CORE API
   * ───────────────────────────────────────────────────────────── */

  /**
   * Apply a theme object to the page.
   *
   * Sets:
   *  - <style id="kh-event-theme"> with theme.css_override
   *  - CSS custom properties --theme-primary and --theme-accent on :root
   *  - Optional event banner image below the <header>
   *
   * Persists theme data to localStorage for offline use.
   *
   * @param {object}  themeData
   * @param {string}  [themeData.css_override]   - Raw CSS to inject
   * @param {string}  [themeData.primary_color]  - Hex/CSS colour for --theme-primary
   * @param {string}  [themeData.accent_color]   - Hex/CSS colour for --theme-accent
   * @param {string}  [themeData.banner_url]     - Optional banner image URL
   * @param {string}  [themeData.banner_alt]     - Optional banner alt text
   * @param {string}  [themeData.name]           - Theme display name
   */
  function applyTheme(themeData) {
    if (!themeData || typeof themeData !== 'object') return;

    // ── 1. Inject CSS override ──────────────────────────────────
    const styleTag = _getOrCreateStyleTag();
    styleTag.textContent = themeData.css_override || '';

    // ── 2. Set CSS custom properties on :root ──────────────────
    const root = document.documentElement;
    if (themeData.primary_color) {
      root.style.setProperty('--theme-primary', themeData.primary_color);
    }
    if (themeData.accent_color) {
      root.style.setProperty('--theme-accent', themeData.accent_color);
    }

    // ── 3. Event banner ────────────────────────────────────────
    if (themeData.banner_url) {
      _injectBanner(themeData.banner_url, themeData.banner_alt || themeData.name || 'Event');
    } else {
      // Remove existing banner if the new theme has none
      const existing = document.getElementById(BANNER_ID);
      if (existing) existing.remove();
    }

    // ── 4. Store state ─────────────────────────────────────────
    _currentTheme = themeData;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themeData));
    } catch {
      // Storage quota exceeded — non-critical
    }
  }

  /**
   * Remove all theme overrides applied by the engine.
   * Clears the injected <style> tag, CSS custom properties,
   * the banner element, module state, and localStorage cache.
   */
  function removeTheme() {
    // Clear injected CSS
    const styleTag = document.getElementById(STYLE_TAG_ID);
    if (styleTag) styleTag.textContent = '';

    // Remove CSS variables set by the theme
    const root = document.documentElement;
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-accent');

    // Remove banner
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();

    // Clear module state and localStorage
    _currentTheme = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  /**
   * Check whether a theme is currently active.
   * @returns {boolean}
   */
  function isThemeActive() {
    return _currentTheme !== null;
  }

  /**
   * Return the currently applied theme object, or null if none is active.
   * @returns {object|null}
   */
  function getCurrentTheme() {
    return _currentTheme;
  }

  /**
   * Fetch the currently active event theme from the `event_themes` Supabase
   * table and apply it to the page.
   *
   * Query conditions:
   *   - is_active = TRUE
   *   - start_at IS NULL OR start_at <= NOW()
   *   - end_at   IS NULL OR end_at   >= NOW()
   *
   * Falls back to the localStorage-cached theme when the network is unavailable.
   *
   * @returns {Promise<void>}
   */
  async function loadActiveTheme() {
    const supabase = window.getSupabaseClient();

    // ── Offline fallback: restore cached theme immediately ──────
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        applyTheme(parsedCache);
      }
    } catch {
      // Corrupted cache — ignore
    }

    if (!supabase) {
      console.warn('[KH_ThemesEngine] Supabase client unavailable — using cached theme only');
      return;
    }

    try {
      const now = new Date().toISOString();

      const { data: theme, error } = await supabase
        .from('event_themes')
        .select('*')
        .eq('is_active', true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // returns null (not error) when no row matches

      if (error) {
        console.error('[KH_ThemesEngine] DB error fetching theme:', error.message);
        return; // keep cached theme if any
      }

      if (theme) {
        applyTheme(theme);
      } else {
        // Fallback: query site_settings for active_theme
        const { data: setting, error: settingErr } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'active_theme')
          .maybeSingle();

        if (!settingErr && setting && PREDEFINED_THEMES[setting.value]) {
          applyTheme(PREDEFINED_THEMES[setting.value]);
        } else {
          // No active theme in DB or site_settings — remove any stale cached theme
          removeTheme();
        }
      }

    } catch (err) {
      console.error('[KH_ThemesEngine] Unexpected error:', err);
      // Cached theme (applied above) stays intact
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * PUBLIC API
   * ───────────────────────────────────────────────────────────── */

  /**
   * @namespace KH_ThemesEngine
   * @description Global event-theme engine for the Kolch Hna platform.
   */
  window.KH_ThemesEngine = Object.freeze({
    loadActiveTheme,
    applyTheme,
    removeTheme,
    isThemeActive,
    getCurrentTheme,
  });

  console.log('✅ KH_ThemesEngine loaded');
})();
