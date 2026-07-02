/**
 * js/security.js
 * ===================================================================
 * Kolch Hna V4 — Security Utilities
 * XSS Prevention, Input Sanitization, Rate Limiting, Validation
 * ===================================================================
 */

window.KH_Security = (() => {

    // ── Rate Limiter (in-memory, per session) ─────────────────────
    const _rateLimitStore = new Map(); // key → { calls: [], windowMs }

    const rateLimiter = {
        /**
         * Check if an action is within rate limit
         * @param {string} key - Unique identifier for the rate-limited action
         * @param {number} maxCalls - Maximum allowed calls
         * @param {number} windowMs - Time window in milliseconds
         * @returns {boolean} - true = allowed, false = rate limit exceeded
         */
        check(key, maxCalls = 10, windowMs = 60000) {
            const now = Date.now();
            const entry = _rateLimitStore.get(key) || { calls: [] };

            // Remove calls outside the window
            entry.calls = entry.calls.filter(ts => now - ts < windowMs);

            if (entry.calls.length >= maxCalls) {
                _rateLimitStore.set(key, entry);
                console.warn(`[Security] Rate limit exceeded for: ${key}`);
                return false;
            }

            entry.calls.push(now);
            _rateLimitStore.set(key, entry);
            return true;
        },

        /**
         * Reset rate limit for a specific key
         * @param {string} key
         */
        reset(key) {
            _rateLimitStore.delete(key);
        },

        /**
         * Get remaining calls for a key
         * @param {string} key
         * @param {number} maxCalls
         * @param {number} windowMs
         * @returns {number}
         */
        remaining(key, maxCalls = 10, windowMs = 60000) {
            const now = Date.now();
            const entry = _rateLimitStore.get(key);
            if (!entry) return maxCalls;
            const recent = entry.calls.filter(ts => now - ts < windowMs);
            return Math.max(0, maxCalls - recent.length);
        }
    };

    // ── HTML Escaping ─────────────────────────────────────────────
    const _escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML special characters
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"'`=/]/g, s => _escapeMap[s] || s);
    }

    /**
     * Sanitize HTML — removes dangerous tags and attributes
     * Uses DOMPurify if available, falls back to manual stripping
     * @param {string} html
     * @returns {string}
     */
    function sanitize(html) {
        if (!html || typeof html !== 'string') return '';

        // Prefer DOMPurify
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span', 'ul', 'li', 'ol'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                FORBID_SCRIPT: true,
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
            });
        }

        // Manual fallback — strip all HTML tags
        return sanitizeText(html);
    }

    /**
     * Strip ALL HTML — returns plain text only
     * @param {string} str
     * @returns {string}
     */
    function sanitizeText(str) {
        if (!str || typeof str !== 'string') return '';
        // Remove all HTML tags
        let clean = str.replace(/<[^>]*>/g, '');
        // Decode common HTML entities
        clean = clean
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ');
        // Remove null bytes and control characters
        clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return clean.trim();
    }

    /**
     * Safe set of textContent (protects against prototype pollution)
     * @param {HTMLElement} el
     * @param {string} text
     */
    function safeSetText(el, text) {
        if (!el) return;
        el.textContent = sanitizeText(text);
    }

    /**
     * Safe set of innerHTML with sanitization
     * @param {HTMLElement} el
     * @param {string} html
     */
    function safeSetHtml(el, html) {
        if (!el) return;
        el.innerHTML = sanitize(html);
    }

    // ── Validators ────────────────────────────────────────────────

    /**
     * Validate Algerian phone number
     * Accepts: +213XXXXXXXXX, 0XXXXXXXXX (mobile: 05x, 06x, 07x)
     * @param {string} phone
     * @returns {boolean}
     */
    function validateAlgerianPhone(phone) {
        if (!phone) return false;
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        return /^(\+213|0)(5|6|7)\d{8}$/.test(cleaned);
    }

    /**
     * Normalize Algerian phone to +213 format
     * @param {string} phone
     * @returns {string}
     */
    function normalizePhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
        if (cleaned.startsWith('0')) {
            return '+213' + cleaned.substring(1);
        }
        return cleaned;
    }

    /**
     * Validate email address
     * @param {string} email
     * @returns {boolean}
     */
    function validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
    }

    /**
     * Validate URL (must be http/https)
     * @param {string} url
     * @returns {boolean}
     */
    function validateUrl(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Validate slug format (alphanumeric + hyphens, 3-50 chars)
     * @param {string} slug
     * @returns {boolean}
     */
    function validateSlug(slug) {
        if (!slug) return false;
        return /^[a-z0-9][a-z0-9\-\.]{1,48}[a-z0-9]$/.test(slug);
    }

    /**
     * Validate price (non-negative number)
     * @param {*} price
     * @returns {boolean}
     */
    function validatePrice(price) {
        const num = parseFloat(price);
        return !isNaN(num) && num >= 0 && isFinite(num);
    }

    /**
     * Sanitize a form data object — trims strings, removes XSS
     * @param {Object} data
     * @returns {Object}
     */
    function sanitizeFormData(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                result[key] = sanitizeText(value.trim());
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                result[key] = value;
            } else if (value === null || value === undefined) {
                result[key] = value;
            } else if (Array.isArray(value)) {
                result[key] = value.map(v => typeof v === 'string' ? sanitizeText(v) : v);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * Generate a cryptographically secure random token
     * @param {number} length
     * @returns {string}
     */
    function generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Inject Content Security Policy meta tag
     * Call once in <head> initialization
     */
    function injectCSP() {
        if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
        const meta = document.createElement('meta');
        meta.setAttribute('http-equiv', 'Content-Security-Policy');
        meta.setAttribute('content', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
            "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://r2.cloudflarestorage.com https://ui-avatars.com https://picsum.photos https://fastly.picsum.photos https://images.unsplash.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.yalidine.app https://www.zr-express.dz",
            "media-src 'self' blob: https://*.supabase.co",
            "frame-src 'none'",
            "object-src 'none'"
        ].join('; '));
        document.head.prepend(meta);
    }

    // Auto-inject CSP when security.js loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCSP);
    } else {
        injectCSP();
    }

    // ── Public API ─────────────────────────────────────────────────
    return {
        sanitize,
        sanitizeText,
        sanitizeFormData,
        safeSetText,
        safeSetHtml,
        escapeHtml,
        validateAlgerianPhone,
        normalizePhone,
        validateEmail,
        validateUrl,
        validateSlug,
        validatePrice,
        generateToken,
        injectCSP,
        rateLimiter
    };

})();
