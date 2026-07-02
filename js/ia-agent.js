/**
 * ia-agent.js — كلشي AI Agent (V4)
 * ====================================================
 * V4 Features:
 *  1. Local rule-base (instant responses for common queries)
 *  2. pgvector knowledge base search via Supabase RPC
 *  3. Google Gemini API fallback
 *  4. support_tickets escalation INSERT
 *  5. Multi-language: AR / FR / EN
 *  6. Floating chat widget (auto-injected into page)
 *  7. Rate limiting via KH_Security (if available)
 */
(function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const AGENT_NAME  = 'كلشي';
  const ADMIN_WA    = '213000000000'; // ← Replace with real admin WhatsApp
  const MAX_MSGS    = 50;             // Max messages per session
  const SESSION_KEY = 'kh_ia_session_v4';

  // ─── Session ID ───────────────────────────────────────────────────────────
  let _sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!_sessionId) {
    _sessionId = 'ia_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem(SESSION_KEY, _sessionId);
  }
  let _msgCount = 0;

  // ─── Current Language ─────────────────────────────────────────────────────
  function getLang() {
    return localStorage.getItem('kolchhna_lang') || 'ar';
  }

  // ─── UI Strings (trilingual) ──────────────────────────────────────────────
  const UI = {
    ar: {
      title:         AGENT_NAME + ' — المساعد الذكي',
      placeholder:   'اكتب رسالتك...',
      send:          'إرسال',
      greeting:      'مرحباً! أنا **' + AGENT_NAME + '** مساعدك الذكي 🤖\n\nأستطيع مساعدتك في:\n• 💰 الأسعار والباقات\n• 📋 كيفية التسجيل\n• 🚚 الشحن والتوصيل\n• 🏪 إدارة متجرك\n• ❓ الأسئلة الشائعة\n\nبماذا تريد مساعدتك؟',
      thinking:      'أفكر...',
      escalate:      'أدخل بريدك الإلكتروني لفتح تذكرة دعم:',
      escalateSent:  'تم إرسال طلبك! سنتواصل معك قريباً ✅',
      escalateErr:   'خطأ في الإرسال. تواصل معنا مباشرة عبر واتساب.',
      rateLimit:     'يرجى الانتظار قبل إرسال رسالة جديدة.',
      maxMsgs:       'وصلت الحد الأقصى للمحادثة. ابدأ جلسة جديدة.',
      inputError:    'الرجاء كتابة رسالة.',
      contactBtn:    '📞 واتساب مباشر',
      quickBtns:     ['💰 الأسعار', '📋 التسجيل', '🚚 الشحن', '🏪 المتجر', '❓ أسئلة'],
    },
    fr: {
      title:         AGENT_NAME + ' — Assistant IA',
      placeholder:   'Écrivez votre message...',
      send:          'Envoyer',
      greeting:      'Bonjour! Je suis **' + AGENT_NAME + '** votre assistant intelligent 🤖\n\nJe peux vous aider avec:\n• 💰 Tarifs et abonnements\n• 📋 Inscription\n• 🚚 Livraison\n• 🏪 Gestion de boutique\n• ❓ FAQ\n\nComment puis-je vous aider?',
      thinking:      'Je réfléchis...',
      escalate:      'Entrez votre email pour ouvrir un ticket:',
      escalateSent:  'Demande envoyée! Nous vous contacterons bientôt ✅',
      escalateErr:   'Erreur d\'envoi. Contactez-nous via WhatsApp.',
      rateLimit:     'Veuillez patienter avant d\'envoyer un nouveau message.',
      maxMsgs:       'Limite atteinte. Démarrez une nouvelle session.',
      inputError:    'Veuillez écrire un message.',
      contactBtn:    '📞 WhatsApp',
      quickBtns:     ['💰 Tarifs', '📋 S\'inscrire', '🚚 Livraison', '🏪 Boutique', '❓ FAQ'],
    },
    en: {
      title:         AGENT_NAME + ' — AI Assistant',
      placeholder:   'Type your message...',
      send:          'Send',
      greeting:      'Hello! I\'m **' + AGENT_NAME + '** your smart assistant 🤖\n\nI can help you with:\n• 💰 Pricing & plans\n• 📋 Registration\n• 🚚 Shipping & delivery\n• 🏪 Manage your store\n• ❓ FAQs\n\nHow can I help you?',
      thinking:      'Thinking...',
      escalate:      'Enter your email to open a support ticket:',
      escalateSent:  'Request sent! We\'ll contact you soon ✅',
      escalateErr:   'Error sending. Contact us directly via WhatsApp.',
      rateLimit:     'Please wait before sending another message.',
      maxMsgs:       'Session limit reached. Start a new session.',
      inputError:    'Please write a message.',
      contactBtn:    '📞 WhatsApp',
      quickBtns:     ['💰 Pricing', '📋 Sign up', '🚚 Shipping', '🏪 My store', '❓ FAQ'],
    },
  };

  // ─── Local Rule Base ──────────────────────────────────────────────────────
  const RULES = [
    {
      patterns: /سعر|باقة|تكلفة|اشتراك|plan|prix|tarif|abonnement|price|plan|subscription/i,
      category: 'pricing',
    },
    {
      patterns: /تسجيل|إنشاء حساب|سجل|inscription|s'inscrire|register|signup|sign up/i,
      category: 'signup',
    },
    {
      patterns: /شحن|توصيل|ياليدين|زكسبريس|livraison|yalidine|z.express|shipping|delivery/i,
      category: 'shipping',
    },
    {
      patterns: /متجر|منتج|صور|لوحة تحكم|dashboard|boutique|produit|store|product/i,
      category: 'merchant',
    },
    {
      patterns: /مشكلة|خطأ|لا يعمل|problème|erreur|problem|error|bug|not working/i,
      category: 'problem',
    },
    {
      patterns: /تواصل|واتساب|هاتف|contact|whatsapp|phone|téléphone/i,
      category: 'contact',
    },
    {
      patterns: /مرحبا|سلام|bonjour|salut|hello|hi|hey/i,
      category: 'greeting',
    },
    {
      patterns: /vip|مميز|premium|مميز|élite/i,
      category: 'vip',
    },
    {
      patterns: /عقار|شقة|فيلا|immobilier|appartement|real.estate|apartment|villa/i,
      category: 'realestate',
    },
  ];

  const LOCAL_ANSWERS = {
    ar: {
      pricing:
        '💰 **باقات كلش هنا:**\n\n🥉 **Basic** — مجاني للمبتدئين\n• 15 منتج، صورتان/منتج\n\n🥇 **Gold** — 1,500 DA/شهر\n• 50 منتج، 4 صور، كوبونات، شحن API\n\n💎 **Premium** — 3,000 DA/شهر\n• 150 منتج، تحليلات متقدمة، AI، وسيط\n\n👑 **VIP** — 6,000 DA/شهر\n• منتجات غير محدودة، إعلانات hero، تصميم إعلاني\n\nللترقية أرسل لنا على واتساب!',
      signup:
        '📋 **خطوات التسجيل:**\n\n1️⃣ اضغط على "التسجيل" في الصفحة الرئيسية\n2️⃣ أدخل بيانات متجرك (اسم، بريد، هاتف، ولاية)\n3️⃣ اختر الباقة المناسبة\n4️⃣ انتظر تفعيل حسابك من الإدارة\n5️⃣ ستصلك رسالة واتساب للتأكيد ✅\n\nعادةً يتم التفعيل خلال 24 ساعة.',
      shipping:
        '🚚 **الشحن والتوصيل:**\n\nنعمل مع:\n• **Yalidine Express** — شحن لجميع ولايات الجزائر\n• **Z-Express** — خيار بديل\n\nتقدر تدخل مفاتيح API الخاصة بك في لوحة التحكم.\nالتكاليف تختلف حسب الولاية.',
      merchant:
        '🏪 **إدارة متجرك:**\n\nمن لوحة التحكم تقدر:\n• إضافة وتعديل المنتجات\n• رؤية الطلبات والإشعارات\n• إدارة الكوبونات (Gold فأعلى)\n• رؤية إحصائيات الزيارات والمبيعات (Premium فأعلى)\n• ربط حساب شحن (Gold فأعلى)\n\nهل تريد مساعدة في جزء معين؟',
      problem:
        '⚠️ **نأسف لوجود مشكلة!**\n\nيمكنك:\n1. تحديث الصفحة وإعادة المحاولة\n2. التواصل معنا مباشرة على واتساب\n3. فتح تذكرة دعم (سأساعدك بذلك)\n\nهل تريد مني فتح تذكرة دعم الآن؟',
      contact:
        '📞 **معلومات التواصل:**\n\n• واتساب: +213 000 000 000\n• البريد: info@kolchhona.com\n• ساعات العمل: 9 ص – 5 م\n\nيمكنك أيضاً الضغط على زر واتساب أدناه.',
      greeting:
        'مرحباً وأهلاً! 👋\n\nأنا **كلشي**، مساعدك الذكي في منصة كلش هنا.\n\nكيف يمكنني مساعدتك اليوم؟ اختر من القائمة أو اكتب سؤالك مباشرة.',
      vip:
        '👑 **باقة VIP — الأفضل دائماً!**\n\n✅ منتجات غير محدودة (∞)\n✅ 8 صور لكل منتج\n✅ إعلان hero على الصفحة الرئيسية\n✅ تصميم إعلاني من فريقنا\n✅ شارة VIP مميزة\n✅ تحليلات كاملة + AI\n✅ برنامج الوسيط (Broker)\n\n💰 السعر: 6,000 DA/شهر\n\nللاشتراك تواصل معنا على واتساب!',
      realestate:
        '🏠 **قسم العقارات:**\n\nكلش هنا يوفر قسماً متخصصاً للعقارات:\n• شقق للبيع والإيجار\n• فيلات وأراضي\n• محلات تجارية\n• اصطياف\n\nزر صفحة العقارات للبحث بالولاية، النوع، والسعر.\n\n👉 [صفحة العقارات](real-estate.html)',
    },
    fr: {
      pricing:    '💰 **Nos abonnements:**\n\n🥉 Basic — Gratuit\n🥇 Gold — 1.500 DA/mois\n💎 Premium — 3.000 DA/mois\n👑 VIP — 6.000 DA/mois\n\nContactez-nous sur WhatsApp pour vous abonner!',
      signup:     '📋 **Inscription:** Cliquez Inscription → remplissez vos infos → attendez activation (24h).',
      shipping:   '🚚 **Livraison:** Yalidine Express et Z-Express. Configurez vos clés API dans le tableau de bord.',
      merchant:   '🏪 **Gestion boutique:** Produits, commandes, statistiques et coupons depuis le tableau de bord.',
      problem:    '⚠️ Désolé pour ce problème! Contactez-nous via WhatsApp ou ouvrez un ticket de support.',
      contact:    '📞 WhatsApp: +213 000 000 000\nEmail: info@kolchhona.com',
      greeting:   'Bonjour! Je suis **' + AGENT_NAME + '**, comment puis-je vous aider?',
      vip:        '👑 **VIP:** Produits illimités, annonce hero, design pub, badge VIP. Prix: 6.000 DA/mois.',
      realestate: '🏠 Consultez notre page immobilier pour appartements, villas et terrains.',
    },
    en: {
      pricing:    '💰 **Plans:**\n\nBasic (Free) → Gold (1,500 DA) → Premium (3,000 DA) → VIP (6,000 DA/month).\n\nContact us on WhatsApp to subscribe!',
      signup:     '📋 **Sign up:** Click Register → fill your store info → wait for admin activation (24h).',
      shipping:   '🚚 **Shipping:** Yalidine Express and Z-Express. Enter your API keys in the dashboard.',
      merchant:   '🏪 **Store management:** Products, orders, stats and coupons from the dashboard.',
      problem:    '⚠️ Sorry for the issue! Contact us via WhatsApp or open a support ticket.',
      contact:    '📞 WhatsApp: +213 000 000 000\nEmail: info@kolchhona.com',
      greeting:   'Hello! I\'m **' + AGENT_NAME + '**, how can I help you?',
      vip:        '👑 **VIP:** Unlimited products, hero carousel ad, ad design service, VIP badge. Price: 6,000 DA/month.',
      realestate: '🏠 Browse our real estate page for apartments, villas and land for sale/rent.',
    },
  };

  // ─── pgvector Knowledge Base Search ──────────────────────────────────────
  async function searchKnowledgeBase(query, lang) {
    const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!supabase) return null;
    try {
      // Text-based fallback search (ILike). Vector similarity requires server-side embedding.
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('title, content')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .eq('language', lang)
        .limit(2);
      if (error || !data || data.length === 0) return null;
      // Return combined relevant snippet
      const snippet = data.map(d => `**${d.title}**\n${d.content.slice(0, 300)}`).join('\n\n---\n\n');
      return snippet;
    } catch (_) {
      return null;
    }
  }

  // ─── Google Gemini API Fallback ───────────────────────────────────────────
  async function callGemini(userMessage, lang) {
    const cfg = window.KH_AI_CONFIG || {};
    const apiKey = cfg.apiKey || cfg.geminiKey || '';
    if (!apiKey) return null;

    const systemPrompt = {
      ar: `أنت ${AGENT_NAME}، مساعد ذكي لمنصة "كلش هنا" — سوق إلكتروني جزائري متعدد التجار. أجب بشكل ودي ومختصر باللغة العربية أو الدارجة الجزائرية. لا تذكر معلومات خارجية. إذا لم تعرف الإجابة قل أنك ستحيل المستخدم للدعم.`,
      fr: `Vous êtes ${AGENT_NAME}, assistant IA pour "Kolch Hna" — marketplace algérien multi-vendeurs. Répondez en français de manière amicale et concise. Si vous ne savez pas, orientez vers le support.`,
      en: `You are ${AGENT_NAME}, AI assistant for "Kolch Hna" — Algerian multi-vendor marketplace. Reply in English, friendly and concise. If unsure, direct to support.`,
    };

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: (systemPrompt[lang] || systemPrompt.ar) + '\n\nUser: ' + userMessage }] },
            ],
            generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
          }),
        }
      );
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (_) {
      return null;
    }
  }

  // ─── Escalation → support_tickets ────────────────────────────────────────
  async function createSupportTicket(userEmail, lastMessage, lang) {
    const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('support_tickets').insert({
        source:     'ai_escalation',
        user_email: userEmail,
        subject:    'AI Escalation — ' + new Date().toISOString().slice(0, 10),
        message:    `[${lang.toUpperCase()}] ${lastMessage}\n\n[Session: ${_sessionId}]`,
        status:     'open',
        priority:   'normal',
      });
      return !error;
    } catch (_) {
      return false;
    }
  }

  // ─── Process Message ──────────────────────────────────────────────────────
  async function processMessage(userText) {
    const lang = getLang();
    const ui   = UI[lang] || UI.ar;
    const localAnswers = LOCAL_ANSWERS[lang] || LOCAL_ANSWERS.ar;

    // 1. Local rule match
    for (const rule of RULES) {
      if (rule.patterns.test(userText)) {
        const answer = localAnswers[rule.category];
        if (answer) return answer;
        break;
      }
    }

    // 2. pgvector / ilike KB search
    const kbAnswer = await searchKnowledgeBase(userText, lang);
    if (kbAnswer) return kbAnswer;

    // 3. Google Gemini
    const geminiAnswer = await callGemini(userText, lang);
    if (geminiAnswer) return geminiAnswer;

    // 4. Fallback — offer escalation
    return ui.escalate + '\n\n_(اكتب بريدك لفتح تذكرة أو اضغط واتساب أدناه)_';
  }

  // ─── Widget HTML ──────────────────────────────────────────────────────────
  function buildWidget() {
    const el = document.createElement('div');
    el.id = 'khIaWidget';
    el.innerHTML = `
      <style>
        #khIaWidget { position:fixed; bottom:30px; right:30px; z-index:9999; font-family:'Gumela','Inter',sans-serif; direction:rtl; }
        #khIaWidget * { box-sizing:border-box; }
        #khIaToggle {
          width:56px; height:56px; border-radius:50%;
          background:linear-gradient(135deg,#007B5E,#00ffc3);
          border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
          font-size:26px; box-shadow:0 4px 20px rgba(0,255,195,0.35);
          transition:transform .2s,box-shadow .2s;
          position:relative;
        }
        #khIaToggle:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(0,255,195,0.5); }
        #khIaUnread {
          position:absolute; top:-4px; right:-4px;
          background:#ff4757; color:#fff; border-radius:50%;
          width:18px; height:18px; font-size:11px; font-weight:700;
          display:none; align-items:center; justify-content:center;
        }
        #khIaPanel {
          display:none; position:absolute; bottom:70px; right:0;
          width:340px; max-height:520px;
          background:linear-gradient(145deg,#1a1f2e,#13161e);
          border:1px solid rgba(0,255,195,0.2); border-radius:18px;
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
          flex-direction:column; overflow:hidden;
          animation:khIaSlideIn .25s ease;
        }
        #khIaPanel.open { display:flex; }
        @keyframes khIaSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .kh-ia-header {
          padding:14px 16px; background:rgba(0,123,94,0.15);
          border-bottom:1px solid rgba(255,255,255,0.06);
          display:flex; align-items:center; justify-content:space-between;
        }
        .kh-ia-header-title { font-size:14px; font-weight:700; color:#fff; }
        .kh-ia-header-sub { font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; }
        .kh-ia-close { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:20px; line-height:1; padding:4px; }
        .kh-ia-close:hover { color:#fff; }
        .kh-ia-msgs {
          flex:1; overflow-y:auto; padding:14px;
          display:flex; flex-direction:column; gap:10px;
          scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.1) transparent;
        }
        .kh-ia-msg { max-width:85%; padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.6; animation:khIaMsgIn .2s ease; }
        @keyframes khIaMsgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .kh-ia-msg.agent { background:rgba(0,123,94,0.18); border:1px solid rgba(0,255,195,0.15); color:#e6edf3; align-self:flex-start; }
        .kh-ia-msg.user  { background:rgba(0,255,195,0.12); border:1px solid rgba(0,255,195,0.2); color:#e6edf3; align-self:flex-end; }
        .kh-ia-msg.thinking { opacity:.5; font-style:italic; }
        .kh-ia-msg strong { color:#00ffc3; }
        .kh-ia-msg a { color:#00ffc3; text-decoration:underline; }
        .kh-ia-quick {
          display:flex; flex-wrap:wrap; gap:6px;
          padding:8px 14px; border-top:1px solid rgba(255,255,255,.06);
        }
        .kh-ia-qbtn {
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
          color:rgba(255,255,255,.7); padding:5px 10px; border-radius:20px;
          font-size:11px; cursor:pointer; font-family:inherit;
          transition:all .15s;
        }
        .kh-ia-qbtn:hover { background:rgba(0,255,195,.12); border-color:rgba(0,255,195,.3); color:#fff; }
        .kh-ia-footer {
          padding:10px 12px; border-top:1px solid rgba(255,255,255,.06);
          display:flex; gap:8px; align-items:flex-end;
        }
        .kh-ia-input {
          flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
          border-radius:10px; color:#fff; padding:10px 12px;
          font-family:inherit; font-size:13px; resize:none; max-height:80px;
          outline:none; transition:border-color .2s;
        }
        .kh-ia-input:focus { border-color:rgba(0,255,195,.4); }
        .kh-ia-send {
          width:38px; height:38px; border-radius:50%;
          background:linear-gradient(135deg,#007B5E,#00ffc3);
          border:none; cursor:pointer; font-size:16px; color:#fff;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:transform .15s;
        }
        .kh-ia-send:hover { transform:scale(1.1); }
        .kh-ia-wa-btn {
          display:block; margin:4px 14px 8px;
          background:rgba(37,211,102,.12); border:1px solid rgba(37,211,102,.3);
          border-radius:8px; padding:8px 14px; color:#25d366;
          text-decoration:none; font-size:12px; font-weight:600; text-align:center;
          transition:all .2s;
        }
        .kh-ia-wa-btn:hover { background:rgba(37,211,102,.2); }
        /* Escalation email input */
        .kh-ia-escalate-form { display:flex; gap:6px; padding:8px 14px; }
        .kh-ia-escalate-email {
          flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15);
          border-radius:8px; color:#fff; padding:8px 10px; font-family:inherit; font-size:13px; outline:none;
        }
        .kh-ia-escalate-btn {
          background:rgba(0,255,195,.15); border:1px solid rgba(0,255,195,.3);
          border-radius:8px; padding:8px 12px; color:#00ffc3;
          font-family:inherit; font-size:12px; cursor:pointer; font-weight:700;
          transition:all .2s;
        }
        .kh-ia-escalate-btn:hover { background:rgba(0,255,195,.25); }
        @media(max-width:480px) {
          #khIaPanel { width:calc(100vw - 32px); right:0; }
          #khIaWidget { right:20px; bottom:20px; left:auto; }
        }
      </style>

      <!-- Toggle button -->
      <button id="khIaToggle" aria-label="فتح المساعد الذكي" title="المساعد الذكي كلشي">
        🤖
        <span id="khIaUnread" aria-hidden="true">1</span>
      </button>

      <!-- Panel -->
      <div id="khIaPanel" role="dialog" aria-modal="true" aria-label="مساعد كلش هنا الذكي">
        <div class="kh-ia-header">
          <div>
            <div class="kh-ia-header-title" id="khIaTitle">كلشي — المساعد الذكي</div>
            <div class="kh-ia-header-sub" id="khIaSub">متوفر الآن · يرد فوراً ⚡</div>
          </div>
          <button class="kh-ia-close" onclick="window._khIaClose()" aria-label="إغلاق">×</button>
        </div>

        <div class="kh-ia-msgs" id="khIaMsgs"></div>

        <div class="kh-ia-quick" id="khIaQuick"></div>

        <a class="kh-ia-wa-btn" id="khIaWaBtn" href="https://wa.me/${ADMIN_WA}" target="_blank" rel="noopener">
          📞 واتساب مباشر
        </a>

        <div class="kh-ia-escalate-form" id="khIaEscalateForm" style="display:none;">
          <input class="kh-ia-escalate-email" type="email" id="khIaEscalateEmail" placeholder="email@example.com" />
          <button class="kh-ia-escalate-btn" id="khIaEscalateBtn">إرسال</button>
        </div>

        <div class="kh-ia-footer">
          <textarea class="kh-ia-input" id="khIaInput" rows="1" placeholder="اكتب رسالتك..."></textarea>
          <button class="kh-ia-send" id="khIaSend" aria-label="إرسال">➤</button>
        </div>
      </div>
    `;
    return el;
  }

  // ─── Chat Logic ───────────────────────────────────────────────────────────
  let _isOpen = false;
  let _awaitingEscalationEmail = false;
  let _lastUserMessage = '';

  function getEls() {
    return {
      panel:    document.getElementById('khIaPanel'),
      msgs:     document.getElementById('khIaMsgs'),
      input:    document.getElementById('khIaInput'),
      send:     document.getElementById('khIaSend'),
      quick:    document.getElementById('khIaQuick'),
      unread:   document.getElementById('khIaUnread'),
      title:    document.getElementById('khIaTitle'),
      waBtn:    document.getElementById('khIaWaBtn'),
      escForm:  document.getElementById('khIaEscalateForm'),
      escEmail: document.getElementById('khIaEscalateEmail'),
      escBtn:   document.getElementById('khIaEscalateBtn'),
    };
  }

  function renderText(text) {
    // Simple markdown-like: **bold** → <strong>, newline → <br>
    return (text || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g,'<br>');
  }

  function addMsg(text, role) {
    const { msgs } = getEls();
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `kh-ia-msg ${role}`;
    div.innerHTML = renderText(text);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function updateLang() {
    const lang = getLang();
    const ui = UI[lang] || UI.ar;
    const { title, quick, input, waBtn } = getEls();
    if (title) title.textContent = ui.title;
    if (input) input.placeholder = ui.placeholder;
    if (waBtn) waBtn.textContent = ui.contactBtn;
    if (quick) {
      quick.innerHTML = '';
      ui.quickBtns.forEach(label => {
        const btn = document.createElement('button');
        btn.className = 'kh-ia-qbtn';
        btn.textContent = label;
        btn.addEventListener('click', () => handleSend(label));
        quick.appendChild(btn);
      });
    }
  }

  async function handleSend(forcedText) {
    const lang = getLang();
    const ui = UI[lang] || UI.ar;
    const { input, send } = getEls();
    const text = (forcedText !== undefined ? forcedText : (input ? input.value : '')).trim();

    if (!text) return;

    // Rate limit
    if (window.KH_Security && !KH_Security.rateLimiter.check('ia_agent', 20, 60000)) {
      addMsg(ui.rateLimit, 'agent');
      return;
    }

    // Max messages
    if (_msgCount >= MAX_MSGS) {
      addMsg(ui.maxMsgs, 'agent');
      return;
    }

    if (input) input.value = '';
    _msgCount++;
    _lastUserMessage = text;
    addMsg(text, 'user');

    // Escalation email collection mode
    if (_awaitingEscalationEmail) {
      _awaitingEscalationEmail = false;
      const ok = await createSupportTicket(text, _lastUserMessage, lang);
      addMsg(ok ? ui.escalateSent : ui.escalateErr, 'agent');
      const { escForm } = getEls();
      if (escForm) escForm.style.display = 'none';
      return;
    }

    // Thinking indicator
    if (send) send.disabled = true;
    const thinkEl = addMsg(ui.thinking, 'agent thinking');

    const response = await processMessage(text);

    if (thinkEl) thinkEl.remove();
    if (send) send.disabled = false;

    // Check if response is an escalation prompt
    if (response && response.includes(ui.escalate.slice(0, 10))) {
      _awaitingEscalationEmail = true;
      addMsg(response, 'agent');
      const { escForm } = getEls();
      if (escForm) escForm.style.display = 'flex';
    } else {
      addMsg(response || ui.escalateErr, 'agent');
    }
  }

  function togglePanel() {
    _isOpen = !_isOpen;
    const { panel, unread } = getEls();
    if (panel) panel.classList.toggle('open', _isOpen);
    if (unread) unread.style.display = 'none';
    if (_isOpen) {
      updateLang();
      const { msgs } = getEls();
      if (msgs && msgs.children.length === 0) {
        const lang = getLang();
        const ui = UI[lang] || UI.ar;
        addMsg(ui.greeting, 'agent');
      }
    }
  }

  window._khIaClose = function() {
    _isOpen = false;
    const { panel } = getEls();
    if (panel) panel.classList.remove('open');
  };

  // ─── Escalation form button ───────────────────────────────────────────────
  function bindEscalateBtn() {
    const { escBtn, escEmail } = getEls();
    if (!escBtn) return;
    escBtn.addEventListener('click', async () => {
      const email = escEmail ? escEmail.value.trim() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      const ok = await createSupportTicket(email, _lastUserMessage, getLang());
      const lang = getLang();
      const ui = UI[lang] || UI.ar;
      addMsg(ok ? ui.escalateSent : ui.escalateErr, 'agent');
      const { escForm } = getEls();
      if (escForm) escForm.style.display = 'none';
      _awaitingEscalationEmail = false;
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('khIaWidget')) return; // Already mounted
    const widget = buildWidget();
    document.body.appendChild(widget);

    const { unread, send, input } = getEls();

    // Show unread dot on first load
    if (unread) {
      unread.style.display = 'flex';
      setTimeout(() => { if (unread) unread.style.display = 'none'; }, 8000);
    }

    // Toggle
    const toggle = document.getElementById('khIaToggle');
    if (toggle) toggle.addEventListener('click', togglePanel);

    // Send button
    if (send) send.addEventListener('click', () => handleSend());

    // Enter key (Shift+Enter for newline)
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
    }

    bindEscalateBtn();

    // Update WA link if config has different number
    const waBtn = document.getElementById('khIaWaBtn');
    if (waBtn && window.KH_AI_CONFIG && window.KH_AI_CONFIG.adminWhatsApp) {
      waBtn.href = 'https://wa.me/' + window.KH_AI_CONFIG.adminWhatsApp.replace(/\D/g, '');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
