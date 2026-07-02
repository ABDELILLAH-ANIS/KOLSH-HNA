# دليل التاجر | Merchant Guide — Kolch Hna

## Metadata
- Platform: كلش هنا (Kolch Hna)
- Type: Merchant Dashboard & Operations Guide
- Audience: Active Merchants / التجار النشطون
- Last Updated: 2026-05-23

---

## 1. Dashboard Overview / نظرة عامة على لوحة التحكم

Upon logging in, the merchant sees the main dashboard (لوحة التحكم الرئيسية) which includes:

| Section | Arabic | Purpose |
|---------|--------|---------|
| Overview | الرئيسية | Summary stats: orders, revenue, visitors |
| Products | المنتجات | Add, edit, delete product listings |
| Orders | الطلبات | View and manage incoming orders |
| Store Profile | ملف المتجر | Edit store info, logo, contact details |
| Shipping | الشحن | Configure Yalidine / Z-Express API |
| Analytics | الإحصائيات | Detailed sales and traffic analytics |
| Ads (VIP) | الإعلانات | VIP-exclusive ad campaign module |
| Settings | الإعدادات | Account settings, subscription, notifications |

---

## 2. How to Add Products / كيفية إضافة المنتجات

### Accessing the Product Module
- Dashboard → **Products / المنتجات** → **Add New Product / إضافة منتج جديد**

### Product Fields / حقول المنتج

| Field | Arabic | Notes |
|-------|--------|-------|
| Product Name | اسم المنتج | Clear, descriptive name |
| Description | الوصف | Detailed product description |
| Category | الفئة | Choose from available categories |
| Price | السعر | In DZD (دج) |
| Stock Quantity | الكمية في المخزون | How many units available |
| Product Images | صور المنتج | Max images depends on plan |
| Price Variants | تنوعات الأسعار | Sizes, colors, models (Gold+ only) |
| Weight | الوزن | Used for shipping cost estimation |
| SKU | رمز المنتج | Optional internal reference code |
| Status | الحالة | Active / Hidden / Out of Stock |

### Product Images Limit by Plan / حد الصور حسب الباقة

| Plan | Max Images per Product |
|------|----------------------|
| Basic 🟢 | 2 images |
| Gold 🟡 | 4 images |
| Premium 🔵 | 6 images |
| VIP 👑 | **8 images** |

### Image Guidelines / إرشادات الصور
- Recommended format: **JPG or PNG**
- Minimum resolution: **800×800 pixels**
- White or neutral backgrounds preferred for product shots
- First image = main thumbnail shown in listings
- No watermarks, no competitor branding in images

### Price Variants (Gold, Premium, VIP) / تنوعات الأسعار
- Add variants like: **Size** (S, M, L, XL), **Color** (أحمر, أزرق, أبيض), **Model** (Type A, Type B)
- Each variant can have its own:
  - Price
  - Stock quantity
  - Additional images
- Example: "حذاء رياضي — مقاس 42 — لون أسود — 3,500 دج"

### Product Listing Limits by Plan / حد المنتجات حسب الباقة

| Plan | Max Active Products |
|------|-------------------|
| Basic | 20 |
| Gold | 100 |
| Premium | 500 |
| VIP | Unlimited |

---

## 3. Stock Management / إدارة المخزون

- Update stock quantities manually after each sale if shipping integration is not used.
- When stock reaches **0**, product status automatically changes to **"Out of Stock / نفدت الكمية"**
- Customers cannot order out-of-stock products.
- You can set a **low stock alert** threshold (e.g., notify when quantity < 5).
- **Bulk stock update**: Gold+ plans can import stock via CSV upload.

---

## 4. How to Manage Orders / كيفية إدارة الطلبات

### Order Lifecycle / دورة حياة الطلب

```
New Order → Confirmed → Processing → Shipped → Delivered → Completed
     ↓
  Cancelled
```

### Order Statuses / حالات الطلب

| Status | Arabic | Meaning |
|--------|--------|---------|
| New | جديد | Order just placed by customer |
| Confirmed | مؤكد | Merchant confirmed the order |
| Processing | قيد التجهيز | Being packed/prepared |
| Shipped | تم الشحن | Handed to carrier |
| Delivered | تم التوصيل | Customer received the order |
| Cancelled | ملغى | Order cancelled |
| Returned | مرتجع | Order returned by customer |

### Managing an Order / كيفية التعامل مع الطلب
1. Dashboard → **Orders / الطلبات**
2. Click on a **New Order** to open it.
3. Review customer details, product, wilaya, delivery type.
4. Click **Confirm / تأكيد** (sends WhatsApp notification to customer automatically).
5. Prepare the order.
6. Create shipment via Yalidine / Z-Express (see `shipping_guide.md`).
7. Print label → hand over to carrier.
8. Click **Mark as Shipped / تم الشحن** and enter tracking number.
9. Customer receives tracking notification.

### WhatsApp Order Notifications
- Every new order triggers an automatic **WhatsApp message** to the merchant's registered WhatsApp number.
- Message includes: customer name, phone, product ordered, wilaya, delivery type.
- Make sure your WhatsApp number is correct in Store Profile settings.

---

## 5. Store Profile Setup / إعداد ملف المتجر

### How to Access / كيفية الوصول
- Dashboard → **Store Profile / ملف المتجر**

### Profile Fields / حقول الملف

| Field | Arabic | Notes |
|-------|--------|-------|
| Store Logo | شعار المتجر | PNG/JPG, square format recommended |
| Store Name | اسم المتجر | Publicly visible |
| Store Slug | رابط المتجر | yourstore.kolchhna.com/slug |
| Store Description | وصف المتجر | Tell customers about your brand |
| WhatsApp Number | رقم الواتساب | For order notifications and customer contact |
| Phone Number | رقم الهاتف | Optional secondary contact |
| Wilaya | الولاية | Your operating location |
| Facebook Page | صفحة فيسبوك | Optional social link |
| Instagram | إنستغرام | Optional social link |
| TikTok | تيك توك | Optional social link |
| Business Category | فئة النشاط | Type of products/business |
| Store Banner | بانر المتجر | Large header image for your store page |

### Store Slug / رابط المتجر المخصص
- The slug is your store's unique URL identifier.
- Example: if slug = `tech-oran`, your store page = `[platform]/store/tech-oran`
- Slug rules:
  - Lowercase letters, numbers, hyphens only
  - No spaces, no Arabic characters
  - Must be unique across the platform
  - Cannot be changed after 30 days (contact admin for exceptions)

---

## 6. VIP Ad Module / وحدة الإعلانات (VIP فقط)

### What Is the VIP Ad Module?
- Exclusive to **VIP plan merchants** only.
- Allows merchants to create **promotional ad campaigns** that appear on the platform homepage and category pages.
- Ads appear as banners, featured product spots, or carousel slides.

### How to Create an Ad Campaign / كيفية إنشاء حملة إعلانية
1. Dashboard → **Ads / الإعلانات** (VIP only)
2. Click **New Campaign / حملة جديدة**
3. Fill in:
   - Campaign name
   - Ad image (recommended size: 1200×400px or 800×800px)
   - Target URL (product page or store page)
   - Campaign start and end dates
   - Target wilaya (or all of Algeria)
4. Submit for admin approval.
5. Admin reviews and activates within **24 hours**.

### Ad Design Request / طلب تصميم إعلاني
- **Premium plan**: 1 free ad design per month from admin.
- **VIP plan**: Priority ad design service from admin.
- To request: Dashboard → Ads → **Request Design / طلب تصميم**
- Or contact admin directly via WhatsApp with:
  - Product name and images
  - Brand colors (if any)
  - Text to include in the design
  - Desired dimensions

---

## 7. Broker / Affiliate Links / روابط الوسيط والتسويق بالعمولة

> Available for **Premium** and **VIP** plans only.

### What Are Broker Links?
- A system that allows other users (brokers/affiliates) to share your product links.
- When a sale is made through a broker's unique link, the broker earns a commission.
- Great for expanding reach through social media influencers and resellers.

### How to Set Up / كيفية الإعداد
1. Dashboard → **Settings / الإعدادات** → **Broker Program / برنامج الوسطاء**
2. Enable the broker program for your store.
3. Set the commission rate (e.g., 5% of sale price).
4. Share the broker enrollment link with potential affiliates.
5. Affiliates register and get their unique tracking links for your products.

---

## 8. Analytics Interpretation / تفسير الإحصائيات

### Available Metrics by Plan / المقاييس المتاحة حسب الباقة

| Metric | Basic | Gold | Premium | VIP |
|--------|-------|------|---------|-----|
| Total Orders | ✅ | ✅ | ✅ | ✅ |
| Total Revenue | ✅ | ✅ | ✅ | ✅ |
| Store Page Views | ✅ | ✅ | ✅ | ✅ |
| Top Products | ❌ | ✅ | ✅ | ✅ |
| Orders by Wilaya | ❌ | ✅ | ✅ | ✅ |
| Conversion Rate | ❌ | ❌ | ✅ | ✅ |
| Customer Repeat Rate | ❌ | ❌ | ✅ | ✅ |
| Revenue by Time Period | ❌ | ❌ | ✅ | ✅ |
| Ad Campaign Performance | ❌ | ❌ | ❌ | ✅ |
| Broker Link Performance | ❌ | ❌ | ✅ | ✅ |

### Key Metrics Explained / شرح المقاييس الرئيسية

**Store Page Views / زيارات صفحة المتجر**
- Number of times your store page was visited. Higher = more visibility.

**Conversion Rate / معدل التحويل**
- Percentage of visitors who placed an order. Formula: (Orders ÷ Visitors) × 100
- Industry benchmark: 1–3% is normal for e-commerce.

**Top Products / أفضل المنتجات**
- Shows which products generate the most orders and revenue.
- Use this to decide which products to restock or promote.

**Orders by Wilaya / الطلبات حسب الولاية**
- Geographic breakdown of where your orders come from.
- Useful for targeting delivery regions or ad campaigns.

---

## 9. Tips for Merchant Success / نصائح لنجاح المتجر

1. **صور عالية الجودة** — High-quality product photos significantly increase sales.
2. **وصف واضح ودقيق** — Clear descriptions reduce returns and customer complaints.
3. **رد سريع** — Respond to customers within 24 hours for best conversion.
4. **تحديث المخزون** — Keep stock quantities accurate to avoid disappointed customers.
5. **استخدم روابط الوسيط** — Leverage broker links for organic growth (Premium/VIP).
6. **استغل الإعلانات** — VIP merchants should actively use the ad module for visibility.
7. **اربط حساب الشحن** — Setting up Yalidine/Z-Express API makes order fulfillment much faster.
8. **احرص على اسم متجرك** — A good store slug and professional logo build customer trust.

---

*For merchant support: bourekanis@gmail.com | WhatsApp support available 9:00–17:00 GMT+1*
