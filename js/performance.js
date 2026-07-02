// أدوات مراقبة وتحسين الأداء

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTime = performance.now();
  }
  
  startMeasure(name) {
    this.metrics[name] = {
      start: performance.now(),
      end: null,
      duration: null
    };
  }
  
  endMeasure(name) {
    if (this.metrics[name]) {
      this.metrics[name].end = performance.now();
      this.metrics[name].duration = 
        this.metrics[name].end - this.metrics[name].start;
      
      console.log(`⏱️ ${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
      
      // تحذير إذا كانت الحركة بطيئة جداً
      if (this.metrics[name].duration > 100) {
        console.warn(`⚠️ ${name} بطيء جداً!`);
      }
    }
  }
  
  report() {
    console.log('📊 تقرير الأداء:');
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].duration) {
        console.log(`  ${key}: ${this.metrics[key].duration.toFixed(2)}ms`);
      }
    });
    
    const totalTime = performance.now() - this.startTime;
    console.log(`  ⚡ الوقت الكلي: ${totalTime.toFixed(2)}ms`);
  }
}

// إنشاء مثول المراقب
const perfMonitor = new PerformanceMonitor();
window.perfMonitor = perfMonitor;

// مراقبة أداء القوائم
const originalToggleMenu = window.toggleMenu;
window.toggleMenu = function(...args) {
  perfMonitor.startMeasure('menu-toggle');
  const result = originalToggleMenu.apply(this, args);
  setTimeout(() => perfMonitor.endMeasure('menu-toggle'), 0);
  return result;
};

const originalToggleLangMenu = window.toggleLangMenu;
window.toggleLangMenu = function(...args) {
  perfMonitor.startMeasure('lang-menu-toggle');
  const result = originalToggleLangMenu.apply(this, args);
  setTimeout(() => perfMonitor.endMeasure('lang-menu-toggle'), 0);
  return result;
};

// تشغيل تقرير الأداء عند التحميل
window.addEventListener('load', () => {
  setTimeout(() => {
    perfMonitor.report();
  }, 2000);
});

console.log('🎯 مراقب الأداء جاهز');