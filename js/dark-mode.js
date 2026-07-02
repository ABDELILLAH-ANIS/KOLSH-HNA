// js/dark-mode.js - الوضع الليلي/النهاري v2 - حل فعّال
// يعمل عن طريق overlay كامل على الصفحة

(function () {
  'use strict';

  const STORAGE_KEY = 'kh_theme';

  // نقوم بحقن CSS لعنصر html مع ::after overlay
  const isHomepage = !!document.getElementById('storesContainer') || !!document.getElementById('heroCarousel') || window.location.pathname.toLowerCase().endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

  // صفحة المتجر تستخدم CSS variables بدلاً من filter inversion (مثل الصفحة الرئيسية)
  const isStorePage = window.location.pathname.toLowerCase().includes('store.html') ||
    (!!document.getElementById('cartSidebar') && !document.getElementById('storesContainer')) ||
    !!document.querySelector('.store-top-header');

  // الصفحات التي تعتمد على CSS variables لا تستخدم filter inversion
  const useVariableMode = isHomepage || isStorePage;

  const LIGHT_CSS = useVariableMode ? `
    /* No generic filter inversion - using custom CSS override variables */
    
    /* زر الثيم في الهيدر الرئيسي (index.html) */
    .theme-header-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      font-size: 20px;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
    }
    .theme-header-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: #00ffc3 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 255, 195, 0.15);
    }
    html.kh-light-mode .theme-header-btn {
      background: rgba(0, 0, 0, 0.06) !important;
      border-color: rgba(0, 0, 0, 0.12) !important;
      color: #1a1a1a !important;
    }

    /* زر الثيم في شريط التنقل (store.html) */
    .theme-back-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(0, 255, 195, 0.3);
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-family: 'Gumela', sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.3s ease;
      height: 38px;
    }
    .theme-back-btn:hover {
      background: rgba(0, 255, 195, 0.15);
      border-color: #00ffc3 !important;
      transform: scale(1.05);
    }
    html.kh-light-mode .theme-back-btn {
      background: rgba(0, 0, 0, 0.05) !important;
      color: #1a1a1a !important;
      border-color: rgba(0, 0, 0, 0.15) !important;
    }
  ` : `
    html.kh-light-mode {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    html.kh-light-mode img,
    html.kh-light-mode video,
    html.kh-light-mode picture,
    html.kh-light-mode canvas,
    html.kh-light-mode .store-card img,
    html.kh-light-mode .product-card img,
    html.kh-light-mode .product-image,
    html.kh-light-mode .store-logo,
    html.kh-light-mode .logo-preview-img,
    html.kh-light-mode #storeLogo,
    html.kh-light-mode #sidebarLogoImg,
    html.kh-light-mode .ia-avatar span {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    
    /* زر الثيم في الهيدر الرئيسي (index.html) */
    .theme-header-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      font-size: 20px;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
    }
    .theme-header-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: #00ffc3 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 255, 195, 0.15);
    }
    html.kh-light-mode .theme-header-btn {
      background: rgba(0, 0, 0, 0.06) !important;
      border-color: rgba(0, 0, 0, 0.12) !important;
      color: #1a1a1a !important;
    }
    
    /* زر الثيم في شريط التنقل (store.html) */
    .theme-back-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(0, 255, 195, 0.3);
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-family: 'Gumela', sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.3s ease;
      height: 38px;
    }
    .theme-back-btn:hover {
      background: rgba(0, 255, 195, 0.15);
      border-color: #00ffc3 !important;
      transform: scale(1.05);
    }
    html.kh-light-mode .theme-back-btn {
      background: rgba(0, 0, 0, 0.05) !important;
      color: #1a1a1a !important;
      border-color: rgba(0, 0, 0, 0.15) !important;
    }
    
    /* زر الثيم في لوحة التحكم (dashboard.html) */
    .theme-dashboard-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 8px 16px;
      border-radius: 50px;
      font-family: 'Gumela', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      height: 38px;
    }
    .theme-dashboard-btn:hover {
      background: rgba(0, 255, 195, 0.1);
      border-color: #00ffc3 !important;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,255,195,0.4);
    }
    html.kh-light-mode .theme-dashboard-btn {
      background: rgba(0, 0, 0, 0.05) !important;
      color: #1a1a1a !important;
      border-color: rgba(0, 0, 0, 0.15) !important;
    }
    .top-bar-menu {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  `;

  function injectCSS() {
    if (document.getElementById('kh-dark-mode-style')) return;
    const style = document.createElement('style');
    style.id = 'kh-dark-mode-style';
    style.textContent = LIGHT_CSS;
    document.head.appendChild(style);
  }

  function getCurrentTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function applyTheme(mode) {
    injectCSS();
    const html = document.documentElement;
    if (mode === 'light') {
      html.classList.add('kh-light-mode');
    } else {
      html.classList.remove('kh-light-mode');
    }
    localStorage.setItem(STORAGE_KEY, mode);

    // تحديث الأيقونة
    const icon = document.getElementById('dmIcon');
    if (icon) icon.textContent = mode === 'light' ? '🌙' : '☀️';

    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.title = mode === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';

    // تحديث خيار القائمة الجانبية المضاف
    const sidebarToggle = document.getElementById('sidebarDarkModeToggle');
    if (sidebarToggle) {
      const sideIcon = sidebarToggle.querySelector('i');
      const textSpan = sidebarToggle.querySelector('span');
      if (sideIcon) {
        sideIcon.className = mode === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
      }
      if (textSpan) {
        const key = mode === 'light' ? 'themeToggleDark' : 'themeToggleLight';
        textSpan.setAttribute('data-key', key);
        textSpan.textContent = typeof window.t === 'function' ? window.t(key) : (mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح');
      }
    }
  }

  function toggle() {
    applyTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
  }

  function injectBtn() {
    if (document.getElementById('darkModeToggle')) return;

    const btn = document.createElement('button');
    btn.id = 'darkModeToggle';
    btn.innerHTML = `<span id="dmIcon">${getCurrentTheme() === 'dark' ? '☀️' : '🌙'}</span>`;
    btn.title = getCurrentTheme() === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي';

    const headerLeft = document.querySelector('.header-left');
    const backNav = document.querySelector('.back-nav');
    const topBarMenu = document.querySelector('.top-bar-menu');
    const reHeaderActions = document.querySelector('.re-page-header .header-actions');
    const langSwitcher = document.querySelector('.lang-switcher');
    const languageDiv = document.querySelector('.language');

    if (headerLeft) {
      btn.className = 'theme-header-btn';
      headerLeft.appendChild(btn);
    } else if (reHeaderActions) {
      btn.className = 'theme-header-btn';
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        reHeaderActions.insertBefore(btn, backBtn);
      } else {
        reHeaderActions.appendChild(btn);
      }
    } else if (backNav) {
      btn.className = 'theme-back-btn';
      const langBtn = document.getElementById('langSwitchBtn');
      if (langBtn) {
        let topLeftWrapper = document.getElementById('backNavTopLeftActions');
        if (!topLeftWrapper) {
          topLeftWrapper = document.createElement('div');
          topLeftWrapper.id = 'backNavTopLeftActions';
          topLeftWrapper.style.cssText = 'display:flex; gap:10px; align-items:center;';
          langBtn.parentNode.insertBefore(topLeftWrapper, langBtn);
          topLeftWrapper.appendChild(langBtn);
        }
        topLeftWrapper.appendChild(btn);
      } else {
        backNav.appendChild(btn);
      }
    } else if (topBarMenu) {
      btn.className = 'theme-dashboard-btn';
      topBarMenu.appendChild(btn);
    } else if (langSwitcher) {
      btn.className = 'lang-btn';
      btn.style.marginLeft = '8px';
      langSwitcher.appendChild(btn);
    } else if (languageDiv) {
      btn.className = 'theme-header-btn';
      btn.style.cssText = `
        position: fixed;
        top: 22px;
        left: 80px;
        z-index: 99999;
        width: 44px; height: 44px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(10px);
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(btn);
    } else {
      btn.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 99999;
        width: 38px; height: 38px;
        border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.12);
        backdrop-filter: blur(10px);
        cursor: pointer;
        font-size: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
        box-shadow: 0 2px 12px rgba(0,0,0,0.35);
      `;
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; btn.style.background = 'rgba(0,255,195,0.2)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; btn.style.background = 'rgba(255,255,255,0.12)'; });
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', toggle);
  }

  function init() {
    injectCSS();
    // تطبيق الوضع المحفوظ فوراً
    applyTheme(getCurrentTheme());
    injectBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.DarkMode = { toggle, apply: applyTheme, get: getCurrentTheme };

})();
