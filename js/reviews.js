// js/reviews.js - نظام التقييمات لمنصة كلش هنا

(function() {
'use strict';

const supabase = () => window.getSupabaseClient?.();

// ===== توليد معرّف فريد للزائر =====
function getReviewerToken() {
  let token = localStorage.getItem('kh_reviewer_token');
  if (!token) {
    token = 'r_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
    localStorage.setItem('kh_reviewer_token', token);
  }
  return token;
}

// ===== تحميل تقييمات متجر =====
async function loadStoreReviews(storeEmail) {
  const sb = supabase();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from('reviews')
      .select('*')
      .eq('store_email', storeEmail)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  } catch { return []; }
}

// ===== الحصول على متوسط التقييم =====
async function getStoreRating(storeEmail) {
  const sb = supabase();
  if (!sb) return { avg: 0, total: 0 };
  try {
    const { data } = await sb.rpc('get_store_rating', { p_email: storeEmail });
    if (data?.[0]) return { avg: parseFloat(data[0].avg_rating) || 0, total: parseInt(data[0].total_reviews) || 0 };
  } catch {}
  return { avg: 0, total: 0 };
}

// ===== إضافة تقييم =====
async function submitReview(storeEmail, rating, comment, reviewerName) {
  const sb = supabase();
  if (!sb) return { success: false, error: 'لا يوجد اتصال' };
  
  const token = getReviewerToken();
  
  try {
    // تحقق من عدم التكرار
    const { data: existing } = await sb
      .from('reviews')
      .select('id')
      .eq('store_email', storeEmail)
      .eq('reviewer_token', token)
      .single();
    
    if (existing) return { success: false, error: 'لقد قيّمت هذا المتجر مسبقاً' };

    const { error } = await sb.from('reviews').insert({
      store_email: storeEmail,
      rating: parseInt(rating),
      comment: comment?.trim() || '',
      reviewer_name: reviewerName?.trim() || 'زائر',
      reviewer_token: token,
      is_hidden: false
    });
    
    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || 'حدث خطأ' };
  }
}

// ===== رسم نجوم التقييم (للعرض) =====
function renderStars(rating, interactive = false, onSelect = null) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    if (interactive) {
      stars.push(`<span class="kh-star kh-star-interactive ${filled?'filled':''}" 
        data-val="${i}"
        onmouseover="KHReviews.highlightStars(this,${i})"
        onmouseout="KHReviews.resetStars(this)"
        onclick="KHReviews.selectStar(${i})"
        title="${i} نجوم">★</span>`);
    } else {
      stars.push(`<span class="kh-star ${filled?'filled':''}">★</span>`);
    }
  }
  return stars.join('');
}

// ===== نافذة إضافة تقييم =====
function openReviewModal(storeEmail, storeName) {
  const existing = document.getElementById('khReviewModal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'khReviewModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:rgba(20,20,30,0.98);border:1px solid rgba(0,255,195,0.2);
      border-radius:20px;padding:30px;width:100%;max-width:420px;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:reviewSlide .3s ease;">
      <h3 style="color:#00ffc3;margin:0 0 5px;font-size:18px;">⭐ تقييم المتجر</h3>
      <p style="color:#888;margin:0 0 20px;font-size:13px;">${storeName || storeEmail}</p>
      
      <div style="display:flex;gap:5px;justify-content:center;margin-bottom:20px;" id="reviewStars">
        ${renderStars(0, true)}
      </div>
      <div id="reviewRatingLabel" style="text-align:center;color:#00ffc3;font-size:13px;margin-bottom:15px;min-height:20px;"></div>
      
      <input type="text" id="reviewerName" placeholder="اسمك (اختياري)"
        style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(0,255,195,0.2);
          border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;outline:none;
          box-sizing:border-box;margin-bottom:12px;font-family:inherit;direction:rtl;">
      <textarea id="reviewComment" placeholder="أضف تعليقاً (اختياري)..."
        style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(0,255,195,0.2);
          border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;outline:none;
          box-sizing:border-box;height:90px;resize:none;font-family:inherit;direction:rtl;"></textarea>
      
      <div style="display:flex;gap:10px;margin-top:15px;">
        <button id="submitReviewBtn" onclick="KHReviews.submit('${storeEmail}','${storeName}')"
          style="flex:1;background:linear-gradient(135deg,#00ffc3,#00a896);color:#000;border:none;
            border-radius:12px;padding:12px;font-size:14px;font-weight:bold;cursor:pointer;
            font-family:inherit;transition:opacity .2s;">
          إرسال التقييم
        </button>
        <button onclick="document.getElementById('khReviewModal').remove()"
          style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.1);
            border-radius:12px;padding:12px 20px;cursor:pointer;font-family:inherit;">
          إلغاء
        </button>
      </div>
      <div id="reviewMsg" style="margin-top:12px;font-size:13px;text-align:center;"></div>
    </div>
    <style>
      .kh-star{font-size:32px;cursor:default;color:#444;transition:color .15s;}
      .kh-star.filled{color:#ffc107;}
      .kh-star-interactive{cursor:pointer;}
      .kh-star-interactive:hover,.kh-star-interactive.hover{color:#ffc107;}
      @keyframes reviewSlide{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
    </style>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  window._reviewRating = 0;
}

// ===== عرض تقييمات في صفحة المتجر =====
async function renderReviewsSection(storeEmail, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const [reviews, { avg, total }] = await Promise.all([
    loadStoreReviews(storeEmail),
    getStoreRating(storeEmail)
  ]);
  
  const starsHtml = renderStars(avg);
  container.innerHTML = `
    <div class="kh-reviews-section">
      <div class="kh-reviews-header">
        <h3>⭐ التقييمات</h3>
        <div class="kh-rating-summary">
          <div class="kh-avg-rating">${avg > 0 ? avg.toFixed(1) : '—'}</div>
          <div class="kh-stars-row">${starsHtml}</div>
          <div class="kh-total-count">${total} تقييم</div>
        </div>
        <button class="kh-add-review-btn" onclick="KHReviews.openModal('${storeEmail}', '')">
          ✍️ أضف تقييمك
        </button>
      </div>
      <div class="kh-reviews-list">
        ${reviews.length === 0 ? '<p class="kh-no-reviews">لا توجد تقييمات بعد. كن أول من يقيّم!</p>' :
          reviews.map(r => `
            <div class="kh-review-item">
              <div class="kh-review-top">
                <span class="kh-reviewer">${r.reviewer_name || 'زائر'}</span>
                <span class="kh-review-stars">${renderStars(r.rating)}</span>
                <span class="kh-review-date">${new Date(r.created_at).toLocaleDateString('ar-DZ')}</span>
              </div>
              ${r.comment ? `<p class="kh-review-comment">${r.comment}</p>` : ''}
            </div>
          `).join('')
        }
      </div>
    </div>
    <style>
      .kh-reviews-section{padding:20px 0;border-top:1px solid rgba(0,255,195,0.1);margin-top:20px;}
      .kh-reviews-header{display:flex;align-items:center;gap:15px;flex-wrap:wrap;margin-bottom:20px;}
      .kh-reviews-header h3{color:#00ffc3;margin:0;font-size:18px;}
      .kh-rating-summary{display:flex;align-items:center;gap:8px;}
      .kh-avg-rating{font-size:28px;font-weight:bold;color:#ffc107;}
      .kh-stars-row .kh-star{font-size:18px;}
      .kh-total-count{color:#888;font-size:13px;}
      .kh-add-review-btn{margin-right:auto;background:linear-gradient(135deg,#00ffc3,#00a896);
        color:#000;border:none;padding:8px 18px;border-radius:20px;cursor:pointer;
        font-weight:bold;font-size:13px;font-family:inherit;}
      .kh-review-item{background:rgba(255,255,255,0.03);border:1px solid rgba(0,255,195,0.1);
        border-radius:12px;padding:14px;margin-bottom:10px;}
      .kh-review-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
      .kh-reviewer{color:#00ffc3;font-weight:bold;font-size:14px;}
      .kh-review-stars .kh-star{font-size:14px;}
      .kh-review-date{color:#666;font-size:12px;margin-right:auto;}
      .kh-review-comment{color:#ccc;font-size:13px;margin:0;line-height:1.6;}
      .kh-no-reviews{color:#666;font-size:14px;text-align:center;padding:20px 0;}
    </style>
  `;
}

// ===== واجهة عامة =====
window.KHReviews = {
  openModal: openReviewModal,
  renderSection: renderReviewsSection,
  getStoreRating,
  
  highlightStars(el, val) {
    const parent = el.closest('#reviewStars');
    if (!parent) return;
    parent.querySelectorAll('.kh-star').forEach((s, i) => {
      s.classList.toggle('hover', i < val);
    });
    const labels = ['','رديء 😞','مقبول 😐','جيد 🙂','جيد جداً 😊','ممتاز 🤩'];
    const lbl = document.getElementById('reviewRatingLabel');
    if (lbl) lbl.textContent = labels[val] || '';
  },
  
  resetStars(el) {
    const parent = el.closest('#reviewStars');
    if (!parent) return;
    const cur = window._reviewRating || 0;
    parent.querySelectorAll('.kh-star').forEach((s, i) => {
      s.classList.toggle('hover', false);
      s.classList.toggle('filled', i < cur);
    });
    const labels = ['','رديء 😞','مقبول 😐','جيد 🙂','جيد جداً 😊','ممتاز 🤩'];
    const lbl = document.getElementById('reviewRatingLabel');
    if (lbl) lbl.textContent = cur > 0 ? labels[cur] : '';
  },
  
  selectStar(val) {
    window._reviewRating = val;
    const parent = document.getElementById('reviewStars');
    if (!parent) return;
    parent.querySelectorAll('.kh-star').forEach((s, i) => {
      s.classList.toggle('filled', i < val);
    });
  },
  
  async submit(storeEmail, storeName) {
    const rating = window._reviewRating || 0;
    if (!rating) {
      const msg = document.getElementById('reviewMsg');
      if (msg) { msg.style.color = '#ff4757'; msg.textContent = '⚠️ يرجى اختيار عدد النجوم'; }
      return;
    }
    
    const btn = document.getElementById('submitReviewBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }
    
    const comment = document.getElementById('reviewComment')?.value || '';
    const name = document.getElementById('reviewerName')?.value || 'زائر';
    
    const result = await submitReview(storeEmail, rating, comment, name);
    
    const msg = document.getElementById('reviewMsg');
    if (result.success) {
      if (msg) { msg.style.color = '#00ffc3'; msg.textContent = '✅ تم إرسال تقييمك! شكراً لك.'; }
      setTimeout(() => document.getElementById('khReviewModal')?.remove(), 1500);
    } else {
      if (msg) { msg.style.color = '#ff4757'; msg.textContent = '❌ ' + result.error; }
      if (btn) { btn.disabled = false; btn.textContent = 'إرسال التقييم'; }
    }
  }
};

})();
