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
| الدفع بالتقسيط (DCB) | Instalment payment engine |
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

## 🚀 الإعداد المحلي / Local Setup

### 1. أنشئ مشروع Supabase / Create a Supabase project

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً.
   Go to [supabase.com](https://supabase.com) and create a new project.
2. من **SQL Editor**، شغّل ملف `kolchhna_database.sql` الكامل.
   From the **SQL Editor**, run the full `kolchhna_database.sql` file.

> **Before running the SQL file**, open it and replace the four placeholders in section 7 (admin bootstrap):
> ```
> ADMIN_EMAIL_PLACEHOLDER    →  your admin e-mail
> ADMIN_PASSWORD_PLACEHOLDER →  a strong password
> ADMIN_NAME_PLACEHOLDER     →  your display name
> ADMIN_PHONE_PLACEHOLDER    →  e.g. +213xxxxxxxxx
> ```
> You can also create the admin user directly from **Supabase Dashboard → Authentication → Users** and skip that block entirely.

### 2. اضبط إعدادات Supabase / Configure Supabase credentials

افتح `js/config.js` واستبدل القيمتين بقيم مشروعك:

```js
const CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_KEY: 'YOUR_ANON_PUBLIC_KEY'
};
```

> The **anon key** is designed to be public — your data is protected by Row Level Security (RLS) policies already defined in the SQL schema. Never use your **service role key** here.

### 3. شغّل المشروع محلياً / Run locally

**Quickest way — Python built-in server:**

```bash
python -m http.server 8080
# then open: http://localhost:8080
```

**Or using the batch file (Windows):**

```bat
start_server.bat
```

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
