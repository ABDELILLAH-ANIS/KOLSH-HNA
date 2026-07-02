# دليل الشحن والتوصيل | Shipping & Delivery Guide — Kolch Hna

## Metadata
- Platform: كلش هنا (Kolch Hna)
- Type: Shipping Integration Guide
- Carriers: Yalidine Express, Z-Express
- Coverage: All 58 Wilayas of Algeria
- Last Updated: 2026-05-23

---

## Overview / نظرة عامة

كلش هنا تتكامل مع شركتي توصيل رائدتين في الجزائر:
- **Yalidine Express** — متاح لجميع الباقات (Basic, Gold, Premium, VIP)
- **Z-Express** — متاح لباقات Gold, Premium, VIP

كلا الشركتين تغطيان **جميع ولايات الجزائر الـ 58**.

---

## 1. Yalidine Express

### About Yalidine / عن يليدين
- One of Algeria's leading express delivery companies.
- Operates across all **58 wilayas**.
- Offers both **home delivery** and **desk pickup** (agency pickup).
- Real-time parcel tracking via their portal and API.
- Website: [yalidine.app](https://yalidine.app)

### Service Types / أنواع الخدمة

| Service | Arabic | Delivery Time | Notes |
|---------|--------|---------------|-------|
| Home Delivery | التوصيل للمنزل | 2–5 business days | Door-to-door |
| Desk Pickup | سحب من الوكالة | 1–3 business days | Customer picks up from nearest agency |
| Express | عاجل | 1–2 days | Availability varies by wilaya |

### Coverage / التغطية
- **All 58 wilayas of Algeria** including remote areas.
- Major cities (Alger, Oran, Constantine, Annaba, Sétif, etc.): fastest delivery.
- Remote wilayas (Tamanrasset, Illizi, Tindouf, etc.): may take up to 7 days.

### How Yalidine Works for Merchants / كيف يعمل يليدين للتاجر

#### Step 1: Create a Parcel / إنشاء الطرد
1. From your merchant dashboard → **Orders / الطلبات**
2. Select the order you want to ship.
3. Click **Create Shipment / إنشاء شحنة** → Select **Yalidine**.
4. Fill in:
   - Customer name and phone
   - Delivery wilaya and commune
   - Service type (home / desk)
   - Declared product value (for insurance)
   - Number of packages
5. Click **Confirm / تأكيد** — the parcel is registered with Yalidine.

#### Step 2: Print Label / طباعة الملصق
- After creating the shipment, a **tracking label PDF** is generated automatically.
- Print the label and stick it on the package.
- The label includes: barcode, tracking number, customer details, wilaya code.

#### Step 3: Hand Over to Yalidine / تسليم الطرد
- Drop off at the nearest **Yalidine agency** or schedule a **pickup** (if available in your area).
- Always get a **handover receipt** from the agency.

#### Step 4: Track Your Parcel / تتبع الشحنة
- Tracking is available:
  - From your merchant dashboard → **Orders** → **Track**
  - Directly at yalidine.app using the tracking number
  - Via Yalidine WhatsApp bot (if available)
- Share the tracking number with your customer via WhatsApp.

### Delivery Cost Estimation / تقدير تكلفة التوصيل
- Costs vary by wilaya zone and package weight/size.
- Yalidine pricing is set by Yalidine, not by كلش هنا.
- Merchants can check current rates at: yalidine.app or via API in the dashboard.
- Typical ranges (subject to change):
  - Same zone: ~300–400 DZD
  - Distant wilayas: ~450–650 DZD
  - Fragile/heavy items: surcharges apply

### Payment of Delivery Fees / دفع رسوم التوصيل
- Delivery fees are paid **directly to Yalidine** by the merchant.
- Merchants can operate on **credit account** with Yalidine (requires separate contract with Yalidine).
- COD (Cash on Delivery) amounts collected from customers are transferred back to the merchant by Yalidine per their schedule.

---

## 2. Z-Express

### About Z-Express / عن Z-Express
- A growing Algerian delivery service provider.
- Available for **Gold, Premium, and VIP** plan merchants.
- Competitive rates for high-volume merchants.
- Covers all **58 wilayas**.

### Service Types / أنواع الخدمة

| Service | Arabic | Delivery Time |
|---------|--------|---------------|
| Home Delivery | توصيل منزلي | 2–5 business days |
| Desk Pickup | سحب من نقطة تجميع | 1–3 business days |

### How Z-Express Works for Merchants / كيف يعمل Z-Express للتاجر

The process is similar to Yalidine:
1. Dashboard → Orders → Create Shipment → Select **Z-Express**
2. Fill customer and delivery details.
3. Print label and hand over to Z-Express.
4. Track via dashboard or Z-Express tracking portal.

---

## 3. Setting Up API Credentials in Dashboard / إعداد بيانات API في لوحة التحكم

To enable delivery integrations, merchants must enter their API credentials from the carrier.

### For Yalidine API Setup:

**Step 1: Get API credentials from Yalidine**
1. Register a merchant account at [yalidine.app](https://yalidine.app)
2. Go to your Yalidine dashboard → **API Access / الوصول للـ API**
3. Generate your **API ID** and **API Token**

**Step 2: Enter credentials in كلش هنا dashboard**
1. Login to your كلش هنا merchant dashboard.
2. Go to **Settings / الإعدادات** → **Shipping / الشحن** → **Yalidine**
3. Enter:
   - API ID
   - API Token
4. Click **Save & Test / حفظ واختبار**
5. If successful, a green confirmation appears: "Yalidine Connected ✅"

### For Z-Express API Setup:

1. Register at Z-Express merchant portal.
2. Obtain your **API Key** and **Store ID**.
3. In كلش هنا dashboard → Settings → Shipping → Z-Express.
4. Enter credentials and test connection.

### Troubleshooting API Connection / استكشاف أخطاء API
- **Invalid credentials**: Double-check API ID and Token — no extra spaces.
- **Connection timeout**: Check your internet. Try again after 5 minutes.
- **Account not approved**: Your Yalidine/Z-Express account may not be fully activated yet.
- Still stuck? Contact admin: bourekanis@gmail.com or WhatsApp support.

---

## 4. Delivery Times Summary / ملخص أوقات التوصيل

| Zone | Home Delivery | Desk Pickup | Notes |
|------|--------------|-------------|-------|
| Major cities (Alger, Oran, Constantine) | 1–3 days | 1–2 days | Fastest |
| Medium wilayas | 2–4 days | 1–3 days | Standard |
| Remote wilayas (South) | 4–7 days | 3–5 days | Variable |

> These are **estimates only**. Actual delivery depends on carrier capacity and conditions.

---

## 5. COD (Cash on Delivery) — الدفع عند الاستلام

- Both carriers support **COD (Dafع 3end el-istehlam / الدفع عند الاستلام)**.
- Customer pays the delivery agent upon receiving the package.
- The carrier collects the money and transfers it to the merchant on a weekly/bi-weekly schedule (as per carrier contract).
- Merchants should clarify COD transfer terms directly with Yalidine / Z-Express.

---

## 6. Returns and Failed Deliveries / الإرجاع والتوصيل الفاشل

### When Delivery Fails
- If customer is unreachable after **2–3 attempts**, the parcel is returned to sender.
- Return fees may apply (charged by the carrier).
- Merchant is notified via dashboard.

### Return Process
- Returned parcels are sent back to the merchant's address on file with the carrier.
- Merchant must arrange re-delivery or refund to customer.
- كلش هنا does not handle returns directly — it's between merchant and carrier.

---

## 7. Coverage Map — All 58 Wilayas / تغطية كل الولايات الـ 58

Both Yalidine and Z-Express cover all 58 wilayas including:

**North / الشمال**: Alger (16), Oran (31), Constantine (25), Annaba (23), Blida (09), Tizi Ouzou (15), Béjaïa (06), Sétif (19), Batna (05), Sidi Bel Abbès (22), Tlemcen (13), Médéa (26), Mostaganem (27), Chlef (02), Skikda (21), Guelma (24), Jijel (18), M'Sila (28), Bordj Bou Arréridj (34), Boumerdès (35), El Tarf (36), Khenchela (40), Souk Ahras (41), Tipaza (42), Mila (43), Ain Defla (44), Naâma (45), Ain Témouchent (46), Ghardaïa (47), Relizane (48)...

**High Plateaus / الهضاب العليا**: Tiaret (14), Saïda (20), El Bayadh (32), Tissemssilt (38), Laghouat (03), Biskra (07), Khenchela (40)...

**South / الجنوب**: Tamanrasset (11), Adrar (01), Illizi (33), Tindouf (37), Béchar (08), El Oued (39), Ouargla (30), Ghardaïa (47), In Salah, In Guezzam...

---

*For delivery support, contact the carrier directly. For platform integration issues: bourekanis@gmail.com*
