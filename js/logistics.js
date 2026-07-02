/**
 * @file logistics.js
 * @description KH Logistics — Yalidine Express & Z-Express API client.
 *
 * Exposes: window.KH_Logistics
 *
 * Credentials are stored in module-private variables only.
 * They should be loaded by calling setCredentials() with data fetched
 * from the `merchant_api_keys` Supabase table.
 *
 * All network errors (including CORS) are caught and returned as
 * { success: false, error: '<message>' } — never thrown to callers.
 *
 * Dependencies: none (fetch API required — all modern browsers)
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
   * PRIVATE CREDENTIAL STORE
   * Never exposed on window — only accessible via module closure.
   * ───────────────────────────────────────────────────────────── */

  /**
   * @typedef {Object} YalidineCredentials
   * @property {string} apiId    - X-API-ID header value
   * @property {string} apiToken - X-API-TOKEN header value
   */

  /**
   * @typedef {Object} ZExpressCredentials
   * @property {string} token - Bearer token for Authorization header
   */

  /** @type {YalidineCredentials|null} */
  let _yalidineCredentials = null;

  /** @type {ZExpressCredentials|null} */
  let _zexpressCredentials = null;

  /** @type {'yalidine'|'zexpress'|null} */
  let _activeProvider = null;

  /* ─────────────────────────────────────────────────────────────
   * BASE URLs
   * ───────────────────────────────────────────────────────────── */

  const YALIDINE_BASE = 'https://api.yalidine.app/v1';
  const ZEXPRESS_BASE = 'https://www.zr-express.dz/api';

  /* ─────────────────────────────────────────────────────────────
   * CREDENTIAL MANAGEMENT
   * ───────────────────────────────────────────────────────────── */

  /**
   * Store merchant API credentials for a logistics provider.
   * Call this during merchant dashboard initialisation with data
   * fetched from the `merchant_api_keys` Supabase table.
   *
   * @param {'yalidine'|'zexpress'} provider
   * @param {YalidineCredentials|ZExpressCredentials} credentials
   *
   * @example
   * // Yalidine
   * KH_Logistics.setCredentials('yalidine', { apiId: '...', apiToken: '...' });
   *
   * // Z-Express
   * KH_Logistics.setCredentials('zexpress', { token: '...' });
   */
  function setCredentials(provider, credentials) {
    if (!credentials || typeof credentials !== 'object') {
      console.warn('[KH_Logistics] setCredentials: invalid credentials object');
      return;
    }

    switch (provider) {
      case 'yalidine':
        _yalidineCredentials = {
          apiId:    String(credentials.apiId    || ''),
          apiToken: String(credentials.apiToken || ''),
        };
        _activeProvider = 'yalidine';
        break;

      case 'zexpress':
        _zexpressCredentials = {
          token: String(credentials.token || ''),
        };
        // Only make z-express active if yalidine hasn't been set
        if (!_yalidineCredentials) _activeProvider = 'zexpress';
        break;

      default:
        console.warn(`[KH_Logistics] Unknown provider: "${provider}"`);
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * HTTP HELPER
   * Centralised fetch wrapper that gracefully handles CORS / network
   * errors and returns a structured result object.
   * ───────────────────────────────────────────────────────────── */

  /**
   * @typedef {Object} ApiResult
   * @property {boolean} success
   * @property {*}       [data]
   * @property {string}  [error]
   */

  /**
   * Perform an HTTP request and return a normalised ApiResult.
   *
   * @param {string}  url
   * @param {RequestInit} options - fetch options (method, headers, body ...)
   * @returns {Promise<ApiResult>}
   */
  async function _request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
          ...(options.headers || {}),
        },
      });

      // Try to parse JSON even for error responses (providers often embed details)
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: (data && data.message) || `HTTP ${response.status}: ${response.statusText}`,
          data,
        };
      }

      return { success: true, data };

    } catch (err) {
      // Covers CORS preflight failures, DNS errors, network timeouts, etc.
      const isCors =
        err instanceof TypeError &&
        (err.message.includes('NetworkError') ||
         err.message.includes('Failed to fetch') ||
         err.message.includes('CORS'));

      return {
        success: false,
        error: isCors
          ? 'CORS or network error — check provider API credentials and allowed origins'
          : String(err.message || err),
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * ORDER FORMAT CONVERTER
   * Transforms a generic KH order object into a provider-specific
   * payload. Extend per provider as the API schemas evolve.
   * ───────────────────────────────────────────────────────────── */

  /**
   * @typedef {Object} GenericOrder
   * @property {string} customerName
   * @property {string} customerPhone
   * @property {string} customerAddress
   * @property {number} wilayaId           - Destination wilaya code (1-58)
   * @property {number} [fromWilayaId]     - Origin wilaya (default: merchant's)
   * @property {number} totalPrice         - COD amount in DZD
   * @property {number} [weight]           - Package weight in kg (default: 1)
   * @property {boolean} [homeDelivery]    - true = home delivery; false = desk pickup
   * @property {string} [productList]      - Comma-separated product names
   * @property {string} [orderId]          - Internal order reference
   * @property {string} [remarks]          - Optional delivery instructions
   */

  /**
   * Convert a generic KH order into the payload format expected by a provider.
   *
   * @param {GenericOrder}            order
   * @param {'yalidine'|'zexpress'}   provider
   * @returns {object} Provider-specific payload ready to POST
   */
  function formatOrderForProvider(order, provider) {
    switch (provider) {
      case 'yalidine':
        return {
          firstname:        order.customerName?.split(' ')[0]  || '',
          familyname:       order.customerName?.split(' ').slice(1).join(' ') || '',
          contact_phone:    order.customerPhone   || '',
          address:          order.customerAddress || '',
          to_wilaya_id:     order.wilayaId        || 1,
          from_wilaya_id:   order.fromWilayaId    || 16, // default: Alger
          price:            order.totalPrice       || 0,
          do_insurance:     0,
          declared_value:   order.totalPrice       || 0,
          height:           10,
          width:            20,
          length:           30,
          weight:           order.weight           || 1,
          product_list:     order.productList      || 'منتجات',
          freeshipping:     0,
          is_stopdesk:      order.homeDelivery === false ? 1 : 0,
          has_exchange:     0,
          order_id:         order.orderId          || '',
          remarks:          order.remarks          || '',
        };

      case 'zexpress':
        return {
          nom:         order.customerName    || '',
          telephone:   order.customerPhone   || '',
          adresse:     order.customerAddress || '',
          wilaya:      order.wilayaId        || 1,
          montant:     order.totalPrice       || 0,
          poids:       order.weight           || 1,
          a_domicile:  order.homeDelivery !== false ? 1 : 0,
          produits:    order.productList      || '',
          remarque:    order.remarks          || '',
          ref_commande: order.orderId         || '',
        };

      default:
        console.warn(`[KH_Logistics] formatOrderForProvider: unknown provider "${provider}"`);
        return { ...order };
    }
  }

  /* ─────────────────────────────────────────────────────────────
   * YALIDINE CLIENT
   * Docs: https://yalidine.app/developer/
   * ───────────────────────────────────────────────────────────── */

  /**
   * Build Yalidine auth headers from stored credentials.
   * Returns null (with a console warning) if credentials are missing.
   * @returns {Record<string,string>|null}
   */
  function _yalidineHeaders() {
    if (!_yalidineCredentials) {
      console.warn('[KH_Logistics] Yalidine credentials not set — call setCredentials() first');
      return null;
    }
    return {
      'X-API-ID':    _yalidineCredentials.apiId,
      'X-API-TOKEN': _yalidineCredentials.apiToken,
    };
  }

  const yalidine = {
    /**
     * Create a new parcel / shipment on the Yalidine platform.
     *
     * @param {GenericOrder} orderData - KH generic order object
     * @returns {Promise<{success: boolean, tracking?: string, data?: *, error?: string}>}
     */
    async createParcel(orderData) {
      const headers = _yalidineHeaders();
      if (!headers) return { success: false, error: 'Yalidine credentials not configured' };

      const payload = formatOrderForProvider(orderData, 'yalidine');
      const result  = await _request(`${YALIDINE_BASE}/parcels/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (result.success && result.data) {
        return {
          success:  true,
          tracking: result.data.tracking       ||
                    result.data.order_id        ||
                    result.data[0]?.tracking,
          data:     result.data,
        };
      }
      return { success: false, error: result.error, data: result.data };
    },

    /**
     * Retrieve the current status of a parcel by tracking number.
     *
     * @param {string} tracking - Yalidine tracking code
     * @returns {Promise<{success: boolean, status?: string, data?: *, error?: string}>}
     */
    async getParcelStatus(tracking) {
      const headers = _yalidineHeaders();
      if (!headers) return { success: false, error: 'Yalidine credentials not configured' };

      const result = await _request(`${YALIDINE_BASE}/parcels/${encodeURIComponent(tracking)}/`, {
        method: 'GET',
        headers,
      });

      if (result.success) {
        return {
          success: true,
          status:  result.data?.status || result.data?.last_status,
          data:    result.data,
        };
      }
      return { success: false, error: result.error };
    },

    /**
     * Fetch the list of all Algerian wilayas served by Yalidine.
     *
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    async getWilayas() {
      const headers = _yalidineHeaders();
      if (!headers) return { success: false, error: 'Yalidine credentials not configured' };

      const result = await _request(`${YALIDINE_BASE}/wilayas/`, {
        method: 'GET',
        headers,
      });

      return result.success
        ? { success: true,  data:  result.data?.data || result.data }
        : { success: false, error: result.error };
    },

    /**
     * Get delivery fee for a route between two wilayas.
     *
     * @param {number} from_wilaya - Origin wilaya ID
     * @param {number} to_wilaya   - Destination wilaya ID
     * @returns {Promise<{success: boolean, desk_fee?: number, home_fee?: number, error?: string}>}
     */
    async getDeliveryFees(from_wilaya, to_wilaya) {
      const headers = _yalidineHeaders();
      if (!headers) return { success: false, error: 'Yalidine credentials not configured' };

      const result = await _request(
        `${YALIDINE_BASE}/delivery_fees/?from_wilaya_id=${from_wilaya}&to_wilaya_id=${to_wilaya}`,
        { method: 'GET', headers }
      );

      if (result.success && result.data) {
        const fee = Array.isArray(result.data) ? result.data[0] : result.data;
        return {
          success:   true,
          desk_fee:  fee?.desk_fee  ?? fee?.tarif_stop_desk ?? null,
          home_fee:  fee?.home_fee  ?? fee?.tarif_domicile  ?? null,
          data:      fee,
        };
      }
      return { success: false, error: result.error };
    },

    /**
     * Generate the print-label URL for a given tracking number.
     * Opens in a new tab or can be used as an iframe src.
     *
     * @param {string} tracking
     * @returns {string} URL to the printable label PDF / page
     */
    printLabel(tracking) {
      return `${YALIDINE_BASE}/parcels/${encodeURIComponent(tracking)}/label/`;
    },
  };

  /* ─────────────────────────────────────────────────────────────
   * Z-EXPRESS CLIENT
   * Docs: https://www.zr-express.dz/
   * ───────────────────────────────────────────────────────────── */

  /**
   * Build Z-Express auth headers from stored credentials.
   * @returns {Record<string,string>|null}
   */
  function _zexpressHeaders() {
    if (!_zexpressCredentials) {
      console.warn('[KH_Logistics] Z-Express credentials not set — call setCredentials() first');
      return null;
    }
    return {
      'Authorization': `Bearer ${_zexpressCredentials.token}`,
    };
  }

  const zexpress = {
    /**
     * Create a new parcel on the Z-Express platform.
     *
     * @param {GenericOrder} orderData
     * @returns {Promise<{success: boolean, tracking?: string, data?: *, error?: string}>}
     */
    async createParcel(orderData) {
      const headers = _zexpressHeaders();
      if (!headers) return { success: false, error: 'Z-Express credentials not configured' };

      const payload = formatOrderForProvider(orderData, 'zexpress');
      const result  = await _request(`${ZEXPRESS_BASE}/colis`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (result.success && result.data) {
        return {
          success:  true,
          tracking: result.data.tracking_code ||
                    result.data.code          ||
                    result.data.id,
          data:     result.data,
        };
      }
      return { success: false, error: result.error, data: result.data };
    },

    /**
     * Get the current status of a Z-Express parcel.
     *
     * @param {string} tracking
     * @returns {Promise<{success: boolean, status?: string, data?: *, error?: string}>}
     */
    async getParcelStatus(tracking) {
      const headers = _zexpressHeaders();
      if (!headers) return { success: false, error: 'Z-Express credentials not configured' };

      const result = await _request(
        `${ZEXPRESS_BASE}/colis/${encodeURIComponent(tracking)}`,
        { method: 'GET', headers }
      );

      if (result.success) {
        return {
          success: true,
          status:  result.data?.statut || result.data?.status,
          data:    result.data,
        };
      }
      return { success: false, error: result.error };
    },

    /**
     * Get delivery fees for a specific destination wilaya.
     *
     * @param {number} wilaya - Destination wilaya ID (1-58)
     * @returns {Promise<{success: boolean, desk_fee?: number, home_fee?: number, error?: string}>}
     */
    async getDeliveryFees(wilaya) {
      const headers = _zexpressHeaders();
      if (!headers) return { success: false, error: 'Z-Express credentials not configured' };

      const result = await _request(
        `${ZEXPRESS_BASE}/tarifs/${encodeURIComponent(wilaya)}`,
        { method: 'GET', headers }
      );

      if (result.success && result.data) {
        return {
          success:   true,
          desk_fee:  result.data.tarif_stop_desk ?? result.data.desk_fee ?? null,
          home_fee:  result.data.tarif_domicile  ?? result.data.home_fee ?? null,
          data:      result.data,
        };
      }
      return { success: false, error: result.error };
    },
  };

  /* ─────────────────────────────────────────────────────────────
   * PUBLIC API
   * ───────────────────────────────────────────────────────────── */

  /**
   * @namespace KH_Logistics
   * @description Global logistics utility namespace for the Kolch Hna platform.
   */
  window.KH_Logistics = Object.freeze({
    setCredentials,
    yalidine,
    zexpress,
    formatOrderForProvider,

    /**
     * Returns the currently active provider, or null if none is configured.
     * @returns {'yalidine'|'zexpress'|null}
     */
    getActiveProvider() {
      return _activeProvider;
    },
  });

  console.log('✅ KH_Logistics loaded');
})();
