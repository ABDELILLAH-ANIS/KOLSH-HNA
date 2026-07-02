// js/onboarding.js - الجولة التعريفية للتجار الجدد

(function() {
'use strict';

const STORAGE_KEY = 'kh_onboarding_done';

const steps = [
  {
    target: '#merchantName',
    title: '👋 مرحباً بك في كلش هنا!',
    text: 'هذا اسم متجرك. يمكنك تعديله من إعدادات الملف الشخصي.',
    position: 'bottom'
  },
  {
    target: '#mainAddBtn',
    title: '➕ إضافة منتج',
    text: 'اضغط هنا لإضافة منتجك الأول! أضف صورة، اسماً، وسعراً.',
    position: 'right'
  },
  {
    target: '#usageText',
    title: '📊 حصتك من المنتجات',
    text: 'هذا يوضح عدد المنتجات المستخدمة مقارنة بالحد الأقصى في باقتك.',
    position: 'bottom'
  },
  {
    target: '.sidebar-actions',
    title: '⚙️ إعدادات المتجر',
    text: 'من هنا تتحكم في ملفك الشخصي، والروابط، وتسجيل الخروج.',
    position: 'right'
  }
];

let currentStep = 0;

function getTarget(selector) {
  return document.querySelector(selector);
}

function injectCSS() {
  if (document.getElementById('onboarding-css')) return;
  const style = document.createElement('style');
  style.id = 'onboarding-css';
  style.textContent = `
    .ob-overlay { position:fixed;inset:0;z-index:9500;pointer-events:none; }
    .ob-highlight {
      position:fixed;border-radius:10px;
      box-shadow:0 0 0 9999px rgba(0,0,0,0.6);
      border:2px solid #00ffc3;z-index:9501;
      transition:all .4s ease;pointer-events:none;
    }
    .ob-tooltip {
      position:fixed;z-index:9502;
      background:rgba(20,20,30,0.98);border:1px solid rgba(0,255,195,0.3);
      border-radius:16px;padding:20px;max-width:min(280px, calc(100vw - 32px));
      box-shadow:0 10px 40px rgba(0,0,0,0.5);
      animation:ob-fadeIn .3s ease;
    }
    @keyframes ob-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .ob-step-label{color:#00ffc3;font-size:11px;font-weight:bold;margin-bottom:6px;}
    .ob-title{color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px;}
    .ob-text{color:#aaa;font-size:13px;line-height:1.6;margin-bottom:16px;}
    .ob-btns{display:flex;gap:8px;justify-content:flex-end;}
    .ob-btn-skip{background:transparent;border:1px solid rgba(255,255,255,0.15);color:#888;
      padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;}
    .ob-btn-next{background:linear-gradient(135deg,#00ffc3,#00a896);color:#000;border:none;
      padding:7px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;font-family:inherit;}
    .ob-progress{display:flex;gap:4px;margin-bottom:12px;}
    .ob-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);transition:background .3s;}
    .ob-dot.active{background:#00ffc3;}
  `;
  document.head.appendChild(style);
}

function getRect(el) {
  const r = el.getBoundingClientRect();
  return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
}

function positionTooltip(tooltip, rect, position) {
  const margin = 12;
  const tw = tooltip.offsetWidth || 280;
  const th = tooltip.offsetHeight || 180;
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  
  // إذا كانت الشاشة صغيرة (موبايل)، نضع التلميح بالأسفل أو الأعلى تجنباً للاختفاء الجانبي
  let bestPos = position;
  if (ww < 768) {
    bestPos = (rect.top + rect.height + th + margin > wh) ? 'top' : 'bottom';
  }
  
  let top = 0;
  let left = 0;
  
  if (bestPos === 'bottom') {
    top = rect.top + rect.height + margin;
    left = rect.left + (rect.width - tw) / 2;
  } else if (bestPos === 'right') {
    top = rect.top + (rect.height - th) / 2;
    left = rect.left + rect.width + margin;
    // إذا فاض من اليمين، نضعه على اليسار
    if (left + tw > ww - margin) {
      left = rect.left - tw - margin;
    }
  } else if (bestPos === 'left') {
    top = rect.top + (rect.height - th) / 2;
    left = rect.left - tw - margin;
  } else { // 'top'
    top = rect.top - th - margin;
    left = rect.left + (rect.width - tw) / 2;
  }
  
  // تقييد الإحداثيات داخل حدود الشاشة المرئية 100%
  top = Math.max(margin, Math.min(top, wh - th - margin));
  left = Math.max(margin, Math.min(left, ww - tw - margin));
  
  tooltip.style.top = top + 'px';
  tooltip.style.left = left + 'px';
}

let highlightEl = null, tooltipEl = null;

function showStep(index) {
  const step = steps[index];
  if (!step) { finish(); return; }
  
  const target = getTarget(step.target);
  if (!target) { showStep(index + 1); return; }
  
  // إزالة العناصر القديمة
  highlightEl?.remove(); tooltipEl?.remove();
  
  const rect = getRect(target);
  
  // Highlight
  highlightEl = document.createElement('div');
  highlightEl.className = 'ob-highlight';
  Object.assign(highlightEl.style, {
    top: rect.top + 'px', left: rect.left + 'px',
    width: rect.width + 'px', height: rect.height + 'px'
  });
  document.body.appendChild(highlightEl);
  
  // Tooltip
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'ob-tooltip';
  const isLast = index === steps.length - 1;
  tooltipEl.innerHTML = `
    <div class="ob-progress">
      ${steps.map((_,i) => `<div class="ob-dot ${i===index?'active':''}"></div>`).join('')}
    </div>
    <div class="ob-step-label">خطوة ${index+1} من ${steps.length}</div>
    <div class="ob-title">${step.title}</div>
    <div class="ob-text">${step.text}</div>
    <div class="ob-btns">
      <button class="ob-btn-skip" onclick="window._KHOnboarding.finish()">تخطي</button>
      <button class="ob-btn-next" onclick="window._KHOnboarding.next()">
        ${isLast ? '🎉 ابدأ الآن!' : 'التالي →'}
      </button>
    </div>
  `;
  document.body.appendChild(tooltipEl);
  
  // تمركز الـ tooltip
  requestAnimationFrame(() => positionTooltip(tooltipEl, rect, step.position));
  
  // تمرير للعنصر
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function finish() {
  localStorage.setItem(STORAGE_KEY, 'true');
  highlightEl?.remove(); tooltipEl?.remove();
  highlightEl = null; tooltipEl = null;
  // إظهار رسالة ترحيبية
  const msg = document.createElement('div');
  msg.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);
    background:linear-gradient(135deg,#00ffc3,#00a896);color:#000;
    padding:14px 28px;border-radius:14px;z-index:9999;font-weight:bold;
    font-size:14px;box-shadow:0 8px 25px rgba(0,255,195,0.4);
    animation:ob-fadeIn .3s ease;`;
  msg.textContent = '🎉 أنت جاهز! استمتع بتجربة كلش هنا.';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

function start() {
  if (localStorage.getItem(STORAGE_KEY)) return; // لا تبدأ مرة ثانية
  injectCSS();
  currentStep = 0;
  showStep(0);
}

window._KHOnboarding = {
  next() { showStep(++currentStep); },
  finish,
  restart() { localStorage.removeItem(STORAGE_KEY); start(); }
};

window.KHOnboarding = { start };

// تشغيل تلقائي للتاجر الجديد في لوحة التحكم بعد تأخير
if (window.location.pathname.includes('dashboard')) {
  window.addEventListener('load', () => {
    setTimeout(start, 2000);
  });
}

})();
