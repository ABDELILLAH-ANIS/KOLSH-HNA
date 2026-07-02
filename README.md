# كلش هنا — Kolch Hna 🛒

منصة تجارة إلكترونية جزائرية متكاملة تجمع بين المتاجر الإلكترونية، العقارات، الجملة، والدفع بالتقسيط — مبنية بـ HTML/CSS/JS مع Supabase كـ Backend.

> **Algerian all-in-one e-commerce platform** — online stores, real estate listings, wholesale orders, and instalment payments (DCB) — built with vanilla HTML/CSS/JS and Supabase as the backend.

---

## ✨ المميزات / Features

| الميزة | Feature |
|--------|---------|
| متاجر إلكترونية للتجار | Merchant storefronts |
| قسم العقارات | Real-estate listings |
| طلبات الجملة | Wholesale ordering |
| الدفع  (DCB) | Instalment payment engine |
| لوحة إدارة متكاملة | Full admin dashboard |
| وكيل ذكاء اصطناعي (IA Agent) | AI assistant / IA agent |
| إشعارات فورية | Real-time notifications |
| نقاط ولاء وبرنامج وسطاء | Loyalty points & broker programme |
| دعم كامل للعربية والفرنسية | Arabic & French UI |

---

## 🛠️ التقنيات المستخدمة / Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript (no framework)
- **Backend / Database** — [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS)
- **Delivery APIs** — Yalidine, Z-Express (configured per merchant)
- **AI** — Gemini API (IA Agent feature)

---

### 2. اضبط إعدادات Supabase / Configure Supabase credentials

افتح `js/config.js` واستبدل القيمتين بقيم مشروعك:

```js
const CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_KEY: 'YOUR_ANON_PUBLIC_KEY'
};
```

> The **anon key** is designed to be public — your data is protected by Row Level Security (RLS) policies already defined in the SQL schema. Never use your **service role key** here.
---

## 📁 هيكل المشروع / Project Structure

```
kolch-hna/
├── index.html              # Landing page
├── store.html              # Store page
├── real-estate.html        # Real-estate section
├── wholesale.html          # Wholesale section
├── dashboard.html          # Merchant dashboard
├── admin.html              # Admin panel
├── signup.html / login.html
├── js/
│   ├── config.js           # Supabase URL & anon key (safe to commit)
│   ├── admin.js
│   ├── dashboard.js
│   ├── dcb-engine.js       # Instalment payment engine
│   └── ...
├── css/
├── images/
├── kolchhna_database.sql   # Full DB schema (fill in placeholders before running)
└── start_server.bat        # Quick-start on Windows
```

---

## 🔐 الأمان / Security Notes

- **RLS enabled on every table** with fine-grained policies.
- **Never commit** your `service_role` key — only the `anon` key belongs in client code.
- `.env` files are gitignored by default.
- Delivery API keys (Yalidine / Z-Express) are stored in the `merchant_api_keys` table, not in source code.

---

## 📜 License

This project is proprietary. All rights reserved.
