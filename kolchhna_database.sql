-- ============================================================
--   ██╗  ██╗ ██████╗ ██╗      ██████╗██╗  ██╗    ██╗  ██╗███╗   ██╗ █████╗
--   ██║ ██╔╝██╔═══██╗██║     ██╔════╝██║  ██║    ██║  ██║████╗  ██║██╔══██╗
--   █████╔╝ ██║   ██║██║     ██║     ███████║    ███████║██╔██╗ ██║███████║
--   ██╔═██╗ ██║   ██║██║     ██║     ██╔══██║    ██╔══██║██║╚██╗██║██╔══██║
--   ██║  ██╗╚██████╔╝███████╗╚██████╗██║  ██║    ██║  ██║██║ ╚████║██║  ██║
--   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
-- ============================================================
-- قاعدة بيانات منصة "كلش هنا" - النسخة الكاملة الموحدة V6
-- آخر تحديث: يونيو 2026 — إضافة دعم B2B كامل
-- ينفَّذ في: Supabase Dashboard → SQL Editor → New Query
-- ملاحظة: آمن للتشغيل المتكرر (كل الأوامر تستخدم IF NOT EXISTS / ON CONFLICT)
-- ============================================================
-- الهيكل:
--   0. امتدادات PostgreSQL
--   1. ترقية آمنة للجداول الموجودة (ALTER TABLE IF EXISTS)
--   2. إنشاء الجداول الجديدة (CREATE TABLE IF NOT EXISTS)
--   3. الفهارس (CREATE INDEX IF NOT EXISTS)
--   4. الدوال والـ Triggers
--   5. سياسات الأمان RLS
--   6. Storage Buckets
--   7. إعداد حساب الأدمن
--   8. التحقق النهائي
-- ============================================================


-- ============================================================
-- 0. امتدادات PostgreSQL المطلوبة
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 1. ترقية آمنة للجداول الموجودة (Safe Upgrade)
-- ============================================================

-- جدول users
ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS role           TEXT DEFAULT 'retailer',
    ADD COLUMN IF NOT EXISTS broker_points  NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS referred_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS login_count    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_login     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_dummy       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_test_data   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wilaya         INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS whatsapp       TEXT DEFAULT NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('wholesaler','retailer','broker','customer','admin'));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('pending_approval','active','suspended','admin'));

-- جدول merchant
ALTER TABLE IF EXISTS public.merchant
    ADD COLUMN IF NOT EXISTS category           TEXT DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS total_sales        NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ad_image           TEXT,
    ADD COLUMN IF NOT EXISTS ad_title           TEXT,
    ADD COLUMN IF NOT EXISTS ad_link            TEXT,
    ADD COLUMN IF NOT EXISTS ad_status          TEXT DEFAULT NULL
        CHECK (ad_status IN ('active','pending_design','design_ready') OR ad_status IS NULL),
    ADD COLUMN IF NOT EXISTS is_wholesaler      BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS credit_eligible    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS credit_limit       NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rating_avg         NUMERIC(3,1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_count       INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS badge              TEXT DEFAULT NULL
        CHECK (badge IN ('trusted','top_seller','new','featured') OR badge IS NULL),
    ADD COLUMN IF NOT EXISTS health_score       INTEGER DEFAULT 0
        CHECK (health_score BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS social_ads_remaining INT DEFAULT 3,
    ADD COLUMN IF NOT EXISTS is_dummy           BOOLEAN DEFAULT FALSE;

ALTER TABLE public.merchant DROP CONSTRAINT IF EXISTS merchant_account_status_check;
ALTER TABLE public.merchant ADD CONSTRAINT merchant_account_status_check
    CHECK (account_status IN ('active','suspended','pending','pending_approval'));

-- جدول products
ALTER TABLE IF EXISTS public.products
    ADD COLUMN IF NOT EXISTS wholesale_price    NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS min_retail_price   NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS video_url          TEXT,
    ADD COLUMN IF NOT EXISTS category           TEXT DEFAULT 'other',
    ADD COLUMN IF NOT EXISTS stock_qty          INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_published       BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS allow_marketing    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS broker_commission  NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_type    TEXT DEFAULT 'fixed'
        CHECK (commission_type IN ('fixed','percentage')),
    ADD COLUMN IF NOT EXISTS show_in_b2b        BOOLEAN DEFAULT FALSE,  -- تحكم التاجر في ظهور المنتج بصفحة الجملة B2B
    ADD COLUMN IF NOT EXISTS min_order_qty      INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS is_dummy           BOOLEAN DEFAULT FALSE;

-- تفعيل show_in_b2b تلقائياً للمنتجات الجملة الموجودة مسبقاً
UPDATE public.products
    SET show_in_b2b = TRUE
    WHERE wholesale_price IS NOT NULL AND wholesale_price > 0 AND show_in_b2b = FALSE;

-- جدول orders
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS customer_wilaya    INTEGER CHECK (customer_wilaya BETWEEN 1 AND 58),
    ADD COLUMN IF NOT EXISTS customer_address   TEXT,
    ADD COLUMN IF NOT EXISTS delivery_status    TEXT DEFAULT 'pending'
        CHECK (delivery_status IN ('pending','processing','shipped','delivered','returned','cancelled')),
    ADD COLUMN IF NOT EXISTS delivery_company   TEXT DEFAULT 'none'
        CHECK (delivery_company IN ('yalidine','zr_express','other','none')),
    ADD COLUMN IF NOT EXISTS tracking_number    TEXT,
    ADD COLUMN IF NOT EXISTS broker_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS commission_amount  NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_paid    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes              TEXT,
    ADD COLUMN IF NOT EXISTS is_dummy           BOOLEAN DEFAULT FALSE;

-- جدول orders - أعمدة DCB
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS payment_method      TEXT DEFAULT 'cod'
        CHECK (payment_method IN ('cod','dcb','bank_transfer','online')),
    ADD COLUMN IF NOT EXISTS dcb_transaction_id  UUID;

-- جدول admin_notifications
ALTER TABLE IF EXISTS public.admin_notifications
    ADD COLUMN IF NOT EXISTS action_url         TEXT,
    ADD COLUMN IF NOT EXISTS priority           TEXT DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high','urgent')),
    ADD COLUMN IF NOT EXISTS expires_at         TIMESTAMPTZ;

-- جدول real_estate_listings
ALTER TABLE IF EXISTS public.real_estate_listings
    ADD COLUMN IF NOT EXISTS is_test_data       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS user_id            UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- جدول support_tickets
ALTER TABLE IF EXISTS public.support_tickets
    ADD COLUMN IF NOT EXISTS user_id            UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- جدول platform_announcements — دعم B2B
ALTER TABLE IF EXISTS public.platform_announcements
    ADD COLUMN IF NOT EXISTS image_url          TEXT DEFAULT NULL;  -- صورة الإعلان (تظهر في كاروسيل B2B)

-- تعيين القيم الافتراضية للمستخدمين القدامى
UPDATE public.users SET role = 'retailer' WHERE role IS NULL;


-- ============================================================
-- 2. إنشاء الجداول الجديدة
-- ============================================================

-- ---- جدول users ----
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    full_name       TEXT,
    phone           TEXT,
    country_code    TEXT        DEFAULT '+213',
    selected_plan   TEXT        DEFAULT 'basic'
        CHECK (selected_plan IN ('basic','gold','premium','vip')),
    plan_price      NUMERIC(10,2) DEFAULT 0,
    billing_period  TEXT        DEFAULT 'monthly'
        CHECK (billing_period IN ('monthly','yearly')),
    account_status  TEXT        DEFAULT 'pending_approval'
        CHECK (account_status IN ('pending_approval','active','suspended','admin')),
    payment_status  TEXT        DEFAULT 'pending'
        CHECK (payment_status IN ('pending','pending_review','paid','failed')),
    role            TEXT        DEFAULT 'retailer'
        CHECK (role IN ('wholesaler','retailer','broker','customer','admin')),
    broker_points   NUMERIC(12,2) DEFAULT 0,
    referred_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active       BOOLEAN     DEFAULT FALSE,
    login_count     INTEGER     DEFAULT 0,
    last_login      TIMESTAMPTZ,
    is_dummy        BOOLEAN     DEFAULT FALSE,
    is_test_data    BOOLEAN     DEFAULT FALSE,
    wilaya          INTEGER     DEFAULT NULL,
    whatsapp        TEXT        DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول merchant ----
CREATE TABLE IF NOT EXISTS public.merchant (
    id                  BIGSERIAL   PRIMARY KEY,
    email               TEXT        NOT NULL UNIQUE REFERENCES public.users(email) ON DELETE CASCADE,
    name                TEXT        NOT NULL,
    bio                 TEXT,
    phone               TEXT,
    address             TEXT,
    store_image         TEXT,
    slug                TEXT        UNIQUE,
    instagram           TEXT,
    facebook            TEXT,
    tiktok              TEXT,
    whatsapp            TEXT,
    website             TEXT,
    category            TEXT        DEFAULT 'other',
    package_type        TEXT        DEFAULT 'basic'
        CHECK (package_type IN ('basic','gold','premium','vip')),
    account_status      TEXT        DEFAULT 'active'
        CHECK (account_status IN ('active','suspended','pending','pending_approval')),
    visitor_count       INTEGER     DEFAULT 0,
    manual_sales_stats  INTEGER     DEFAULT 0,
    total_sales         NUMERIC(14,2) DEFAULT 0,
    top_regions         TEXT,
    peak_time           TEXT,
    coupon_code         TEXT        DEFAULT '',
    coupon_discount     NUMERIC     DEFAULT 0,
    ad_image            TEXT,
    ad_title            TEXT,
    ad_link             TEXT,
    ad_status           TEXT        DEFAULT NULL
        CHECK (ad_status IN ('active','pending_design','design_ready') OR ad_status IS NULL),
    is_wholesaler       BOOLEAN     DEFAULT FALSE,
    credit_eligible     BOOLEAN     DEFAULT FALSE,
    credit_limit        NUMERIC(12,2) DEFAULT 0,
    verified_at         TIMESTAMPTZ,
    subscription_end    TIMESTAMPTZ,
    rating_avg          NUMERIC(3,1) DEFAULT 0,
    rating_count        INTEGER     DEFAULT 0,
    is_featured         BOOLEAN     DEFAULT FALSE,
    badge               TEXT        DEFAULT NULL
        CHECK (badge IN ('trusted','top_seller','new','featured') OR badge IS NULL),
    health_score        INTEGER     DEFAULT 0
        CHECK (health_score BETWEEN 0 AND 100),
    social_ads_remaining INT        DEFAULT 3,
    is_dummy            BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول products ----
CREATE TABLE IF NOT EXISTS public.products (
    id                  BIGSERIAL   PRIMARY KEY,
    name                TEXT        NOT NULL,
    description         TEXT,
    price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    wholesale_price     NUMERIC(10,2),
    min_retail_price    NUMERIC(10,2),
    image               TEXT,
    images              TEXT[]      DEFAULT '{}',
    video_url           TEXT,
    details             JSONB       DEFAULT '{"colors":[],"sizes":[]}'::jsonb,
    category            TEXT        DEFAULT 'other',
    stock_qty           INTEGER     DEFAULT 0,
    is_published        BOOLEAN     DEFAULT TRUE,
    allow_marketing     BOOLEAN     DEFAULT FALSE,
    broker_commission   NUMERIC(8,2) DEFAULT 0,
    commission_type     TEXT        DEFAULT 'fixed'
        CHECK (commission_type IN ('fixed','percentage')),
    show_in_b2b         BOOLEAN     DEFAULT FALSE,        -- يتحكم التاجر في ظهور المنتج بصفحة الجملة B2B
    min_order_qty       INTEGER     DEFAULT 10,
    owner               TEXT        NOT NULL REFERENCES public.merchant(email) ON DELETE CASCADE,
    is_dummy            BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول orders ----
CREATE TABLE IF NOT EXISTS public.orders (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_email      TEXT        NOT NULL REFERENCES public.merchant(email) ON DELETE CASCADE,
    customer_name       TEXT        NOT NULL,
    customer_phone      TEXT        NOT NULL,
    customer_wilaya     INTEGER     CHECK (customer_wilaya BETWEEN 1 AND 58),
    customer_address    TEXT,
    items               JSONB       NOT NULL DEFAULT '[]'::jsonb,
    total_price         NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_applied    NUMERIC(5,2) NOT NULL DEFAULT 0,
    status              TEXT        NOT NULL DEFAULT 'pending',
    delivery_status     TEXT        DEFAULT 'pending'
        CHECK (delivery_status IN ('pending','processing','shipped','delivered','returned','cancelled')),
    delivery_company    TEXT        DEFAULT 'none'
        CHECK (delivery_company IN ('yalidine','zr_express','other','none')),
    tracking_number     TEXT,
    broker_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    commission_amount   NUMERIC(10,2) DEFAULT 0,
    commission_paid     BOOLEAN     DEFAULT FALSE,
    notes               TEXT,
    is_dummy            BOOLEAN     DEFAULT FALSE,
    deleted_by_merchant BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---- جدول admin_notifications ----
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id          BIGSERIAL   PRIMARY KEY,
    type        TEXT        DEFAULT 'new_signup',
    title       TEXT,
    message     TEXT,
    user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email  TEXT,
    user_phone  TEXT,
    plan        TEXT,
    price       NUMERIC(10,2),
    is_read     BOOLEAN     DEFAULT FALSE,
    action_url  TEXT,
    priority    TEXT        DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high','urgent')),
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول reviews ----
CREATE TABLE IF NOT EXISTS public.reviews (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_email     TEXT        NOT NULL,
    product_id      BIGINT,
    rating          INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT        DEFAULT '',
    reviewer_name   TEXT        DEFAULT 'زائر',
    reviewer_token  TEXT        DEFAULT '',
    is_hidden       BOOLEAN     DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول ai_conversations ----
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT        NOT NULL,
    user_msg    TEXT        NOT NULL,
    ai_response TEXT        NOT NULL,
    lang        TEXT        DEFAULT 'ar',
    page_url    TEXT        DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول point_exchange_requests ----
CREATE TABLE IF NOT EXISTS public.point_exchange_requests (
    id              BIGSERIAL   PRIMARY KEY,
    broker_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    broker_email    TEXT        NOT NULL,
    points_amount   NUMERIC(12,2) NOT NULL CHECK (points_amount > 0),
    status          TEXT        DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','paid')),
    payment_method  TEXT        DEFAULT 'ccp',
    payment_details JSONB       DEFAULT '{}'::jsonb,
    admin_note      TEXT,
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول real_estate_listings ----
CREATE TABLE IF NOT EXISTS public.real_estate_listings (
    id              BIGSERIAL   PRIMARY KEY,
    merchant_email  TEXT        REFERENCES public.merchant(email) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    description     TEXT,
    listing_type    TEXT        NOT NULL DEFAULT 'rent'
        CHECK (listing_type IN ('rent','sale','vacation','commercial')),
    property_type   TEXT        DEFAULT 'apartment'
        CHECK (property_type IN ('apartment','villa','studio','shop','office','land','other')),
    wilaya          INTEGER     NOT NULL CHECK (wilaya BETWEEN 1 AND 58),
    commune         TEXT,
    address         TEXT,
    price           NUMERIC(14,2) CHECK (price >= 0),
    price_unit      TEXT        DEFAULT 'monthly'
        CHECK (price_unit IN ('monthly','yearly','total','per_night')),
    area_m2         NUMERIC(8,2),
    rooms           INTEGER,
    floors          INTEGER,
    images          TEXT[]      DEFAULT '{}',
    video_url       TEXT,
    amenities       JSONB       DEFAULT '[]'::jsonb,
    contact_phone   TEXT,
    contact_whatsapp TEXT,
    is_available    BOOLEAN     DEFAULT TRUE,
    is_featured     BOOLEAN     DEFAULT FALSE,
    view_count      INTEGER     DEFAULT 0,
    is_test_data    BOOLEAN     DEFAULT FALSE,
    user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    status          TEXT        DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول commission_ledger ----
CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id              BIGSERIAL   PRIMARY KEY,
    broker_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id        UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
    product_name    TEXT,
    amount          NUMERIC(10,2) NOT NULL,
    type            TEXT        DEFAULT 'earned' CHECK (type IN ('earned','redeemed')),
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول platform_announcements ----
CREATE TABLE IF NOT EXISTS public.platform_announcements (
    id          BIGSERIAL   PRIMARY KEY,
    title       TEXT        NOT NULL,
    content     TEXT,
    type        TEXT        NOT NULL DEFAULT 'info'
        CHECK (type IN ('info','warning','promo','event')),
    cta_text    TEXT,
    cta_url     TEXT,
    image_url   TEXT,                                     -- صورة الإعلان (تظهر في كاروسيل B2B)
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    show_on     TEXT[]      NOT NULL DEFAULT ARRAY['home'],  -- home | store | wholesale | dashboard
    start_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at      TIMESTAMPTZ,
    created_by  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول event_themes ----
CREATE TABLE IF NOT EXISTS public.event_themes (
    id              BIGSERIAL   PRIMARY KEY,
    name            TEXT        NOT NULL,
    slug            TEXT        NOT NULL UNIQUE,
    css_override    TEXT,
    banner_url      TEXT,
    color_primary   TEXT        NOT NULL DEFAULT '#007B5E',
    color_accent    TEXT        NOT NULL DEFAULT '#FFD700',
    particles_cfg   JSONB       NOT NULL DEFAULT '{}',
    is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
    start_at        TIMESTAMPTZ,
    end_at          TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول support_tickets ----
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source       TEXT        NOT NULL DEFAULT 'contact'
        CHECK (source IN ('contact','ai_escalation','merchant_report')),
    user_email   TEXT,
    user_name    TEXT,
    subject      TEXT,
    message      TEXT        NOT NULL,
    status       TEXT        NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','in_progress','resolved','closed')),
    priority     TEXT        NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high','urgent')),
    admin_reply  TEXT,
    replied_at   TIMESTAMPTZ,
    replied_by   TEXT,
    user_id      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول upgrade_requests ----
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    id               BIGSERIAL   PRIMARY KEY,
    merchant_email   TEXT        NOT NULL REFERENCES public.merchant(email) ON DELETE CASCADE,
    current_plan     TEXT        NOT NULL,
    requested_plan   TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','contacted','completed','rejected')),
    admin_note       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMPTZ
);

-- ---- جدول platform_audit_log ----
CREATE TABLE IF NOT EXISTS public.platform_audit_log (
    id           BIGSERIAL   PRIMARY KEY,
    admin_email  TEXT        NOT NULL,
    action       TEXT        NOT NULL,
    target_type  TEXT,
    target_id    TEXT,
    old_value    JSONB,
    new_value    JSONB,
    ip_address   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول platform_kpi_snapshots ----
CREATE TABLE IF NOT EXISTS public.platform_kpi_snapshots (
    id               BIGSERIAL   PRIMARY KEY,
    snapshot_date    DATE        NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    total_merchants  INTEGER     NOT NULL DEFAULT 0,
    active_merchants INTEGER     NOT NULL DEFAULT 0,
    total_orders     INTEGER     NOT NULL DEFAULT 0,
    total_revenue    NUMERIC(16,2) NOT NULL DEFAULT 0,
    new_signups      INTEGER     NOT NULL DEFAULT 0,
    vip_count        INTEGER     NOT NULL DEFAULT 0,
    premium_count    INTEGER     NOT NULL DEFAULT 0,
    gold_count       INTEGER     NOT NULL DEFAULT 0,
    basic_count      INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول merchant_api_keys ----
CREATE TABLE IF NOT EXISTS public.merchant_api_keys (
    id                  BIGSERIAL   PRIMARY KEY,
    merchant_email      TEXT        NOT NULL UNIQUE REFERENCES public.merchant(email) ON DELETE CASCADE,
    yalidine_api_id     TEXT,
    yalidine_api_token  TEXT,
    zexpress_api_token  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول broker_links ----
CREATE TABLE IF NOT EXISTS public.broker_links (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    broker_email     TEXT        NOT NULL,
    product_id       BIGINT      REFERENCES public.products(id) ON DELETE CASCADE,
    merchant_email   TEXT        NOT NULL REFERENCES public.merchant(email) ON DELETE CASCADE,
    link_token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
    click_count      INTEGER     NOT NULL DEFAULT 0,
    conversion_count INTEGER     NOT NULL DEFAULT 0,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول user_cart ----
CREATE TABLE IF NOT EXISTS public.user_cart (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    cart_data        JSONB       NOT NULL DEFAULT '[]',
    coupon_code      TEXT,
    coupon_discount  NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول ai_knowledge_base ----
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id         BIGSERIAL   PRIMARY KEY,
    title      TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    category   TEXT        NOT NULL DEFAULT 'general'
        CHECK (category IN ('general','pricing','shipping','merchant','customer','faq')),
    language   TEXT        NOT NULL DEFAULT 'ar'
        CHECK (language IN ('ar','fr','en')),
    embedding  vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- جدول notifications ----
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        REFERENCES public.users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    message    TEXT,
    type       VARCHAR(50) DEFAULT 'info',
    is_read    BOOLEAN     DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول ad_design_requests ----
CREATE TABLE IF NOT EXISTS public.ad_design_requests (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        REFERENCES public.users(id) ON DELETE CASCADE,
    store_id      BIGINT      REFERENCES public.merchant(id) ON DELETE CASCADE,
    description   TEXT,
    reference_url TEXT,
    status        VARCHAR(20) DEFAULT 'pending',
    admin_notes   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول audit_logs ----
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    admin_email  TEXT,
    action       TEXT        NOT NULL,
    details      JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول vip_ads ----
CREATE TABLE IF NOT EXISTS public.vip_ads (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        REFERENCES public.users(id) ON DELETE CASCADE,
    store_id     BIGINT      REFERENCES public.merchant(id) ON DELETE CASCADE,
    title        TEXT,
    content      TEXT,
    image_url    TEXT,
    package_type VARCHAR(20),
    status       VARCHAR(20) DEFAULT 'pending',
    start_date   DATE,
    end_date     DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ---- جدول dcb_settings (إعدادات الدفع عبر الهاتف) ----
CREATE TABLE IF NOT EXISTS public.dcb_settings (
    id                      BIGSERIAL       PRIMARY KEY,
    is_enabled              BOOLEAN         NOT NULL DEFAULT FALSE,
    max_limit_per_order     NUMERIC(10,2)   NOT NULL DEFAULT 5000.00,
    platform_fee_percent    NUMERIC(5,2)    NOT NULL DEFAULT 5.00,
    supported_carriers      TEXT[]          DEFAULT '{mobilis,djezzy,ooredoo}',
    carrier_api_keys        JSONB           DEFAULT '{"mobilis":{"api_key":"","api_secret":"","endpoint":""},"djezzy":{"api_key":"","api_secret":"","endpoint":""},"ooredoo":{"api_key":"","api_secret":"","endpoint":""}}'::jsonb,
    min_order_amount        NUMERIC(10,2)   DEFAULT 100.00,
    daily_limit_per_phone   NUMERIC(10,2)   DEFAULT 15000.00,
    otp_expiry_seconds      INTEGER         DEFAULT 120,
    updated_by              TEXT,
    updated_at              TIMESTAMPTZ     DEFAULT NOW()
);

-- ---- جدول dcb_vendor_settings (إعدادات DCB لكل تاجر) ----
CREATE TABLE IF NOT EXISTS public.dcb_vendor_settings (
    id                  BIGSERIAL       PRIMARY KEY,
    merchant_email      TEXT            NOT NULL UNIQUE REFERENCES public.merchant(email) ON DELETE CASCADE,
    is_enabled          BOOLEAN         NOT NULL DEFAULT FALSE,
    max_limit_override  NUMERIC(10,2)   DEFAULT NULL,
    auto_accept         BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- ---- جدول dcb_transactions (معاملات الدفع عبر الهاتف) ----
CREATE TABLE IF NOT EXISTS public.dcb_transactions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            REFERENCES public.orders(id) ON DELETE SET NULL,
    phone_number    TEXT            NOT NULL,
    carrier         TEXT            NOT NULL CHECK (carrier IN ('mobilis','djezzy','ooredoo')),
    amount          NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    platform_fee    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    net_amount      NUMERIC(10,2)   NOT NULL DEFAULT 0,
    currency        TEXT            DEFAULT 'DZD',
    status          TEXT            NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','otp_sent','otp_verified','charging','completed','failed','refunded','expired')),
    otp_code        TEXT,
    otp_expires_at  TIMESTAMPTZ,
    otp_attempts    INTEGER         DEFAULT 0,
    carrier_ref     TEXT,
    failure_reason  TEXT,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ---- جدول dcb_transaction_splits (توزيع المعاملات على التجار) ----
CREATE TABLE IF NOT EXISTS public.dcb_transaction_splits (
    id              BIGSERIAL       PRIMARY KEY,
    transaction_id  UUID            NOT NULL REFERENCES public.dcb_transactions(id) ON DELETE CASCADE,
    merchant_email  TEXT            NOT NULL REFERENCES public.merchant(email) ON DELETE CASCADE,
    amount          NUMERIC(10,2)   NOT NULL CHECK (amount > 0),
    platform_fee    NUMERIC(10,2)   DEFAULT 0,
    net_amount      NUMERIC(10,2)   DEFAULT 0,
    status          TEXT            DEFAULT 'pending'
        CHECK (status IN ('pending','settled','failed')),
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);


-- ============================================================
-- 3. الفهارس (Indexes)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email             ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status            ON public.users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_role              ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_merchant_email          ON public.merchant(email);
CREATE INDEX IF NOT EXISTS idx_merchant_slug           ON public.merchant(slug);
CREATE INDEX IF NOT EXISTS idx_merchant_featured       ON public.merchant(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_merchant_health         ON public.merchant(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_owner          ON public.products(owner);
CREATE INDEX IF NOT EXISTS idx_products_marketing      ON public.products(allow_marketing);
CREATE INDEX IF NOT EXISTS idx_products_category       ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_merchant         ON public.orders(merchant_email);
CREATE INDEX IF NOT EXISTS idx_orders_broker           ON public.orders(broker_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery         ON public.orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notif_is_read           ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_store           ON public.reviews(store_email);
CREATE INDEX IF NOT EXISTS idx_ai_session              ON public.ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_point_req_broker        ON public.point_exchange_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_point_req_status        ON public.point_exchange_requests(status);
CREATE INDEX IF NOT EXISTS idx_realestate_wilaya       ON public.real_estate_listings(wilaya);
CREATE INDEX IF NOT EXISTS idx_realestate_type         ON public.real_estate_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_realestate_price        ON public.real_estate_listings(price);
CREATE INDEX IF NOT EXISTS idx_ledger_broker           ON public.commission_ledger(broker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_ad_design_user          ON public.ad_design_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_design_store         ON public.ad_design_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_vip_ads_user            ON public.vip_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_ads_store           ON public.vip_ads(store_id);
CREATE INDEX IF NOT EXISTS idx_vip_ads_status          ON public.vip_ads(status);
CREATE INDEX IF NOT EXISTS idx_announcements_active    ON public.platform_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_dates     ON public.platform_announcements(start_at, end_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_themes_active     ON public.event_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_event_themes_slug       ON public.event_themes(slug);
CREATE INDEX IF NOT EXISTS idx_tickets_status          ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_email           ON public.support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_tickets_priority        ON public.support_tickets(priority, status);
CREATE INDEX IF NOT EXISTS idx_upgrade_email           ON public.upgrade_requests(merchant_email);
CREATE INDEX IF NOT EXISTS idx_upgrade_status          ON public.upgrade_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_email         ON public.platform_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_date          ON public.platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_date                ON public.platform_kpi_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_broker_links_broker     ON public.broker_links(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_links_token      ON public.broker_links(link_token);
CREATE INDEX IF NOT EXISTS idx_broker_links_merchant   ON public.broker_links(merchant_email);
CREATE INDEX IF NOT EXISTS idx_user_cart_user          ON public.user_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_kb_embedding         ON public.ai_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_ai_kb_content_trgm      ON public.ai_knowledge_base USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_kb_cat_lang          ON public.ai_knowledge_base(category, language);

-- فهارس DCB
CREATE INDEX IF NOT EXISTS idx_dcb_transactions_phone   ON public.dcb_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_dcb_transactions_status  ON public.dcb_transactions(status);
CREATE INDEX IF NOT EXISTS idx_dcb_transactions_created ON public.dcb_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcb_transactions_order   ON public.dcb_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_dcb_splits_tx            ON public.dcb_transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_dcb_splits_merchant      ON public.dcb_transaction_splits(merchant_email);
CREATE INDEX IF NOT EXISTS idx_dcb_vendor_settings_email ON public.dcb_vendor_settings(merchant_email);

-- فهارس B2B (الجملة)
CREATE INDEX IF NOT EXISTS idx_products_show_in_b2b     ON public.products(show_in_b2b) WHERE show_in_b2b = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_wholesale       ON public.products(wholesale_price) WHERE wholesale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_show_on    ON public.platform_announcements USING gin(show_on);
CREATE INDEX IF NOT EXISTS idx_announcements_b2b        ON public.platform_announcements(is_active, start_at) WHERE is_active = TRUE;


-- ============================================================
-- 4. الدوال والـ Triggers (Functions & Triggers)
-- ============================================================

-- ---- تحديث updated_at تلقائياً ----
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at         ON public.users;
CREATE TRIGGER trg_users_updated_at         BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_merchant_updated_at      ON public.merchant;
CREATE TRIGGER trg_merchant_updated_at      BEFORE UPDATE ON public.merchant
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at      ON public.products;
CREATE TRIGGER trg_products_updated_at      BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_realestate_updated_at    ON public.real_estate_listings;
CREATE TRIGGER trg_realestate_updated_at    BEFORE UPDATE ON public.real_estate_listings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_api_keys_updated_at      ON public.merchant_api_keys;
CREATE TRIGGER trg_api_keys_updated_at      BEFORE UPDATE ON public.merchant_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_updated_at          ON public.user_cart;
CREATE TRIGGER trg_cart_updated_at          BEFORE UPDATE ON public.user_cart
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_kb_updated_at         ON public.ai_knowledge_base;
CREATE TRIGGER trg_ai_kb_updated_at         BEFORE UPDATE ON public.ai_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_dcb_vendor_updated_at     ON public.dcb_vendor_settings;
CREATE TRIGGER trg_dcb_vendor_updated_at     BEFORE UPDATE ON public.dcb_vendor_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_dcb_settings_updated_at   ON public.dcb_settings;
CREATE TRIGGER trg_dcb_settings_updated_at   BEFORE UPDATE ON public.dcb_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- دالة التحقق من حد DCB اليومي لكل رقم هاتف ----
CREATE OR REPLACE FUNCTION public.check_dcb_daily_limit(p_phone TEXT, p_daily_limit NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.dcb_transactions
    WHERE phone_number = p_phone
      AND status IN ('completed','charging','otp_verified')
      AND created_at >= CURRENT_DATE;
    RETURN p_daily_limit - v_total;
END; $$;

-- ---- توليد Slug للمتجر ----
CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name TEXT, store_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    base_slug  TEXT;
    final_slug TEXT;
    counter    INTEGER := 0;
BEGIN
    base_slug := lower(split_part(store_email, '@', 1));
    base_slug := regexp_replace(base_slug, '[^a-z0-9\-\.]', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF length(base_slug) < 3 THEN base_slug := 'store-' || base_slug; END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.merchant WHERE slug = final_slug) LOOP
        counter    := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    RETURN final_slug;
END; $$;

-- ---- دالة التحقق من الأدمن (تمنع Infinite Recursion) ----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND (role = 'admin' OR account_status = 'admin')
    );
$$;

-- ---- دالة متوسط تقييم المتجر ----
CREATE OR REPLACE FUNCTION public.get_store_rating(p_email TEXT)
RETURNS TABLE(avg_rating NUMERIC, total_reviews BIGINT)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT ROUND(AVG(rating)::NUMERIC, 1), COUNT(*)
    FROM public.reviews
    WHERE store_email = p_email AND is_hidden = FALSE;
$$;

-- ---- منح صلاحية الأدمن ----
CREATE OR REPLACE FUNCTION public.grant_admin_role(p_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users
    SET account_status = 'admin', role = 'admin', is_active = TRUE, updated_at = NOW()
    WHERE email = p_email;
    RETURN FOUND;
END; $$;

-- ---- منع حرق الأسعار (min_retail_price) ----
CREATE OR REPLACE FUNCTION public.check_min_retail_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.min_retail_price IS NOT NULL AND NEW.price < NEW.min_retail_price THEN
        RAISE EXCEPTION 'سعر المنتج (%) أقل من الحد الأدنى المسموح (%)',
            NEW.price, NEW.min_retail_price;
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_check_min_price ON public.products;
CREATE TRIGGER trg_check_min_price
    BEFORE INSERT OR UPDATE OF price ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.check_min_retail_price();

-- ---- احتساب عمولة السمسار ----
CREATE OR REPLACE FUNCTION public.process_broker_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.delivery_status = 'delivered'
       AND OLD.delivery_status != 'delivered'
       AND NEW.broker_id IS NOT NULL
       AND NEW.commission_amount > 0
       AND NEW.commission_paid = FALSE
    THEN
        UPDATE public.users
        SET broker_points = broker_points + NEW.commission_amount
        WHERE id = NEW.broker_id;

        INSERT INTO public.commission_ledger (broker_id, order_id, amount, type, description)
        VALUES (NEW.broker_id, NEW.id, NEW.commission_amount, 'earned',
                'عمولة طلب: ' || NEW.id::TEXT);

        NEW.commission_paid = TRUE;
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_broker_commission ON public.orders;
CREATE TRIGGER trg_broker_commission
    BEFORE UPDATE OF delivery_status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.process_broker_commission();

-- ---- تفعيل الكريدي تلقائياً ----
CREATE OR REPLACE FUNCTION public.auto_credit_eligibility()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.merchant
    SET credit_eligible = TRUE,
        credit_limit    = CASE
            WHEN total_sales > 500000 THEN 200000
            WHEN total_sales > 200000 THEN 100000
            ELSE 50000
        END
    WHERE created_at < NOW() - INTERVAL '3 months'
      AND account_status = 'active'
      AND credit_eligible = FALSE
      AND total_sales > 50000;
END; $$;

-- ---- ضمان ثيم نشط واحد ----
CREATE OR REPLACE FUNCTION public.enforce_single_active_theme()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE public.event_themes
        SET    is_active = FALSE
        WHERE  id != NEW.id AND is_active = TRUE;
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_single_active_theme ON public.event_themes;
CREATE TRIGGER trg_single_active_theme
    BEFORE INSERT OR UPDATE ON public.event_themes
    FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_theme();

-- ---- التقاط KPI اليومية ----
CREATE OR REPLACE FUNCTION public.capture_kpi_snapshot()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.platform_kpi_snapshots (
        snapshot_date, total_merchants, active_merchants, total_orders, total_revenue,
        new_signups, vip_count, premium_count, gold_count, basic_count
    )
    SELECT
        CURRENT_DATE,
        COUNT(*) FILTER (WHERE m.account_status != 'suspended'),
        COUNT(*) FILTER (WHERE m.account_status = 'active'),
        (SELECT COUNT(*)     FROM public.orders WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'),
        COALESCE((SELECT SUM(total_price) FROM public.orders WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'), 0),
        (SELECT COUNT(*)     FROM public.users   WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'),
        COUNT(*) FILTER (WHERE m.package_type = 'vip'),
        COUNT(*) FILTER (WHERE m.package_type = 'premium'),
        COUNT(*) FILTER (WHERE m.package_type = 'gold'),
        COUNT(*) FILTER (WHERE m.package_type = 'basic')
    FROM public.merchant m
    ON CONFLICT (snapshot_date) DO UPDATE SET
        total_merchants  = EXCLUDED.total_merchants,
        active_merchants = EXCLUDED.active_merchants,
        total_orders     = EXCLUDED.total_orders   + platform_kpi_snapshots.total_orders,
        total_revenue    = EXCLUDED.total_revenue  + platform_kpi_snapshots.total_revenue,
        new_signups      = EXCLUDED.new_signups,
        vip_count        = EXCLUDED.vip_count,
        premium_count    = EXCLUDED.premium_count,
        gold_count       = EXCLUDED.gold_count,
        basic_count      = EXCLUDED.basic_count;
END; $$;

-- ---- حساب نقاط صحة المتجر ----
CREATE OR REPLACE FUNCTION public.calculate_merchant_health_score(p_email TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_score         INTEGER := 0;
    v_order_count   INTEGER := 0;
    v_product_count INTEGER := 0;
    v_visitor_count INTEGER := 0;
    v_avg_rating    NUMERIC := 0;
    v_merchant      RECORD;
BEGIN
    SELECT store_image, bio, whatsapp, instagram, visitor_count, rating_avg
    INTO v_merchant FROM public.merchant WHERE email = p_email;
    IF NOT FOUND THEN RETURN 0; END IF;

    SELECT COUNT(*) INTO v_order_count FROM public.orders
    WHERE merchant_email = p_email AND created_at >= NOW() - INTERVAL '30 days';

    IF    v_order_count >= 20 THEN v_score := v_score + 30;
    ELSIF v_order_count >= 10 THEN v_score := v_score + 25;
    ELSIF v_order_count >=  5 THEN v_score := v_score + 15;
    END IF;

    IF v_merchant.store_image IS NOT NULL AND v_merchant.store_image != '' THEN v_score := v_score + 5; END IF;
    IF v_merchant.bio         IS NOT NULL AND v_merchant.bio         != '' THEN v_score := v_score + 5; END IF;
    IF v_merchant.whatsapp    IS NOT NULL AND v_merchant.whatsapp    != '' THEN v_score := v_score + 5; END IF;
    IF v_merchant.instagram   IS NOT NULL AND v_merchant.instagram   != '' THEN v_score := v_score + 5; END IF;

    v_visitor_count := COALESCE(v_merchant.visitor_count, 0);
    IF    v_visitor_count >= 500 THEN v_score := v_score + 20;
    ELSIF v_visitor_count >= 100 THEN v_score := v_score + 15;
    ELSIF v_visitor_count >=  20 THEN v_score := v_score + 10;
    ELSIF v_visitor_count >=   5 THEN v_score := v_score + 5;
    END IF;

    v_avg_rating := COALESCE(v_merchant.rating_avg, 0);
    v_score := v_score + ROUND((v_avg_rating / 5.0) * 15)::INTEGER;

    SELECT COUNT(*) INTO v_product_count FROM public.products WHERE owner = p_email;
    IF    v_product_count >= 16 THEN v_score := v_score + 15;
    ELSIF v_product_count >=  6 THEN v_score := v_score + 10;
    ELSIF v_product_count >=  1 THEN v_score := v_score + 5;
    END IF;

    RETURN GREATEST(0, LEAST(100, v_score));
END; $$;

-- ---- تسجيل إجراء مدير في سجل التدقيق ----
CREATE OR REPLACE FUNCTION public.write_audit_log(
    p_admin_email TEXT, p_action TEXT,
    p_target_type TEXT  DEFAULT NULL,
    p_target_id   TEXT  DEFAULT NULL,
    p_old         JSONB DEFAULT NULL,
    p_new         JSONB DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.platform_audit_log
        (admin_email, action, target_type, target_id, old_value, new_value)
    VALUES
        (p_admin_email, p_action, p_target_type, p_target_id, p_old, p_new);
END; $$;

-- ---- معالجة المستخدمين الجدد عند التسجيل (Trigger رئيسي) ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role      TEXT    := 'retailer';
    v_plan      TEXT    := 'basic';
    v_price     NUMERIC(10,2) := 0;
    v_is_yearly BOOLEAN := FALSE;
    v_full_name TEXT;
    v_phone     TEXT;
    v_slug      TEXT;
BEGIN
    v_role      := COALESCE(NEW.raw_user_meta_data->>'role',          'retailer');
    v_plan      := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'basic');
    v_price     := COALESCE((NEW.raw_user_meta_data->>'plan_price')::NUMERIC, 0);
    v_is_yearly := COALESCE((NEW.raw_user_meta_data->>'is_yearly')::BOOLEAN,  FALSE);
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

    -- إنشاء/تحديث سجل المستخدم
    INSERT INTO public.users (
        id, email, full_name, phone, selected_plan, plan_price, billing_period,
        account_status, payment_status, role, is_active, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.email, v_full_name, v_phone, v_plan, v_price,
        CASE WHEN v_is_yearly THEN 'yearly' ELSE 'monthly' END,
        'pending_approval', 'pending', v_role, FALSE, NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email       = EXCLUDED.email,
        full_name   = EXCLUDED.full_name,
        phone       = EXCLUDED.phone,
        selected_plan = EXCLUDED.selected_plan,
        plan_price  = EXCLUDED.plan_price,
        billing_period = EXCLUDED.billing_period,
        role        = EXCLUDED.role;

    -- إنشاء/تحديث سجل التاجر
    v_slug := public.generate_store_slug(v_full_name, NEW.email);

    INSERT INTO public.merchant (
        email, name, slug, package_type, account_status, visitor_count,
        subscription_end, is_wholesaler, created_at, updated_at
    ) VALUES (
        NEW.email, v_full_name, v_slug, v_plan, 'pending_approval', 0,
        NOW() + (CASE WHEN v_is_yearly THEN INTERVAL '365 days' ELSE INTERVAL '30 days' END),
        (v_role = 'wholesaler'), NOW(), NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        name          = EXCLUDED.name,
        package_type  = EXCLUDED.package_type,
        is_wholesaler = EXCLUDED.is_wholesaler;

    -- إشعار الأدمن
    INSERT INTO public.admin_notifications (
        type, title, message, user_email, user_phone, plan, price, is_read, created_at
    ) VALUES (
        'new_signup',
        'تسجيل جديد باقة: ' || upper(v_plan),
        'مستخدم جديد: ' || v_full_name || ' - ' || NEW.email ||
        ' | الباقة: ' || v_plan || ' | السعر: ' || v_price || ' DA',
        NEW.email, v_phone, v_plan, v_price, FALSE, NOW()
    );

    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 5. سياسات الأمان RLS (Row Level Security)
-- ============================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_themes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_kpi_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_api_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_links            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cart               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_design_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_ads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcb_settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcb_vendor_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcb_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcb_transaction_splits   ENABLE ROW LEVEL SECURITY;

-- ---- dcb_settings ----
DROP POLICY IF EXISTS "dcb_settings_select_auth"    ON public.dcb_settings;
DROP POLICY IF EXISTS "dcb_settings_update_admin"   ON public.dcb_settings;

CREATE POLICY "dcb_settings_select_auth"  ON public.dcb_settings FOR SELECT
    USING (auth.role() = 'authenticated');
CREATE POLICY "dcb_settings_update_admin" ON public.dcb_settings FOR UPDATE
    USING (public.is_admin());

-- ---- dcb_vendor_settings ----
DROP POLICY IF EXISTS "dcb_vendor_select_own"   ON public.dcb_vendor_settings;
DROP POLICY IF EXISTS "dcb_vendor_update_own"   ON public.dcb_vendor_settings;
DROP POLICY IF EXISTS "dcb_vendor_insert_own"   ON public.dcb_vendor_settings;

CREATE POLICY "dcb_vendor_select_own"  ON public.dcb_vendor_settings FOR SELECT
    USING (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "dcb_vendor_update_own"  ON public.dcb_vendor_settings FOR UPDATE
    USING (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "dcb_vendor_insert_own"  ON public.dcb_vendor_settings FOR INSERT
    WITH CHECK (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );

-- ---- dcb_transactions ----
DROP POLICY IF EXISTS "dcb_tx_insert_all"       ON public.dcb_transactions;
DROP POLICY IF EXISTS "dcb_tx_select_own"       ON public.dcb_transactions;
DROP POLICY IF EXISTS "dcb_tx_update_admin"     ON public.dcb_transactions;

CREATE POLICY "dcb_tx_insert_all"   ON public.dcb_transactions FOR INSERT
    WITH CHECK (TRUE);
CREATE POLICY "dcb_tx_select_own"   ON public.dcb_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.dcb_transaction_splits s
            WHERE s.transaction_id = dcb_transactions.id
              AND s.merchant_email = (auth.jwt() ->> 'email')
        )
        OR public.is_admin()
    );
CREATE POLICY "dcb_tx_update_admin" ON public.dcb_transactions FOR UPDATE
    USING (public.is_admin());

-- ---- dcb_transaction_splits ----
DROP POLICY IF EXISTS "dcb_splits_select_own"   ON public.dcb_transaction_splits;
DROP POLICY IF EXISTS "dcb_splits_insert_auth"  ON public.dcb_transaction_splits;
DROP POLICY IF EXISTS "dcb_splits_update_admin" ON public.dcb_transaction_splits;

CREATE POLICY "dcb_splits_select_own"  ON public.dcb_transaction_splits FOR SELECT
    USING (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "dcb_splits_insert_auth" ON public.dcb_transaction_splits FOR INSERT
    WITH CHECK (TRUE);
CREATE POLICY "dcb_splits_update_admin" ON public.dcb_transaction_splits FOR UPDATE
    USING (public.is_admin());

-- ---- users ----
DROP POLICY IF EXISTS "users_select_own"   ON public.users;
DROP POLICY IF EXISTS "users_update_own"   ON public.users;
DROP POLICY IF EXISTS "users_insert_own"   ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "admin_select_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_update_all_users" ON public.users;

CREATE POLICY "users_select_own"   ON public.users FOR SELECT
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_insert_own"   ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE
    USING (public.is_admin());

-- ---- merchant ----
-- التاجر يمكنه رؤية سجله الخاص بغض النظر عن حالة الحساب
DROP POLICY IF EXISTS "merchant_select_active"  ON public.merchant;
DROP POLICY IF EXISTS "merchant_update_own"     ON public.merchant;
DROP POLICY IF EXISTS "merchant_insert_own"     ON public.merchant;
DROP POLICY IF EXISTS "merchant_delete_admin"   ON public.merchant;
DROP POLICY IF EXISTS "admin_select_all_merchants" ON public.merchant;
DROP POLICY IF EXISTS "admin_update_all_merchants" ON public.merchant;

CREATE POLICY "merchant_select_active" ON public.merchant FOR SELECT
    USING (
        account_status = 'active'   -- مرئي للجميع إذا كان نشطاً
        OR public.is_admin()        -- الأدمن يرى الكل
        OR email = (auth.jwt() ->> 'email')  -- التاجر يرى سجله دائماً
    );
CREATE POLICY "merchant_update_own"    ON public.merchant FOR UPDATE
    USING (
        email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "merchant_insert_own"    ON public.merchant FOR INSERT
    WITH CHECK (
        email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "merchant_delete_admin"  ON public.merchant FOR DELETE
    USING (public.is_admin());

-- ---- products ----
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_own" ON public.products;
DROP POLICY IF EXISTS "products_update_own" ON public.products;
DROP POLICY IF EXISTS "products_delete_own" ON public.products;

CREATE POLICY "products_select_all"  ON public.products FOR SELECT USING (TRUE);
CREATE POLICY "products_insert_own"  ON public.products FOR INSERT
    WITH CHECK (
        owner = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "products_update_own"  ON public.products FOR UPDATE
    USING (
        owner = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "products_delete_own"  ON public.products FOR DELETE
    USING (
        owner = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );

-- ---- orders ----
DROP POLICY IF EXISTS "orders_insert_all" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;

CREATE POLICY "orders_insert_all"  ON public.orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "orders_select_own"  ON public.orders FOR SELECT
    USING (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );
CREATE POLICY "orders_update_own"  ON public.orders FOR UPDATE
    USING (
        merchant_email = (auth.jwt() ->> 'email')
        OR public.is_admin()
    );

-- ---- admin_notifications ----
DROP POLICY IF EXISTS "notif_insert_auth"  ON public.admin_notifications;
DROP POLICY IF EXISTS "notif_select_admin" ON public.admin_notifications;
DROP POLICY IF EXISTS "notif_update_admin" ON public.admin_notifications;

CREATE POLICY "notif_insert_auth"  ON public.admin_notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "notif_select_admin" ON public.admin_notifications FOR SELECT USING (public.is_admin());
CREATE POLICY "notif_update_admin" ON public.admin_notifications FOR UPDATE USING (public.is_admin());

-- ---- reviews ----
DROP POLICY IF EXISTS "reviews_select"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert"    ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;

CREATE POLICY "reviews_select"    ON public.reviews FOR SELECT USING (is_hidden = FALSE OR public.is_admin());
CREATE POLICY "reviews_insert"    ON public.reviews FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reviews_admin_all" ON public.reviews FOR ALL USING (public.is_admin());

-- ---- ai_conversations ----
DROP POLICY IF EXISTS "ai_insert"       ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_admin_select" ON public.ai_conversations;

CREATE POLICY "ai_insert"       ON public.ai_conversations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "ai_admin_select" ON public.ai_conversations FOR SELECT USING (public.is_admin());

-- ---- point_exchange_requests ----
DROP POLICY IF EXISTS "point_req_insert" ON public.point_exchange_requests;
DROP POLICY IF EXISTS "point_req_select" ON public.point_exchange_requests;
DROP POLICY IF EXISTS "point_req_update" ON public.point_exchange_requests;

CREATE POLICY "point_req_insert" ON public.point_exchange_requests FOR INSERT WITH CHECK (broker_id = auth.uid());
CREATE POLICY "point_req_select" ON public.point_exchange_requests FOR SELECT USING (broker_id = auth.uid() OR public.is_admin());
CREATE POLICY "point_req_update" ON public.point_exchange_requests FOR UPDATE USING (public.is_admin());

-- ---- real_estate_listings ----
DROP POLICY IF EXISTS "realestate_select" ON public.real_estate_listings;
DROP POLICY IF EXISTS "realestate_insert" ON public.real_estate_listings;
DROP POLICY IF EXISTS "realestate_update" ON public.real_estate_listings;
DROP POLICY IF EXISTS "realestate_delete" ON public.real_estate_listings;

CREATE POLICY "realestate_select" ON public.real_estate_listings FOR SELECT
    USING (is_available = TRUE OR public.is_admin()
        OR user_id = auth.uid()
        OR merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "realestate_insert" ON public.real_estate_listings FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "realestate_update" ON public.real_estate_listings FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin()
        OR merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "realestate_delete" ON public.real_estate_listings FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin()
        OR merchant_email = (auth.jwt() ->> 'email'));

-- ---- notifications ----
DROP POLICY IF EXISTS "notif_user_select"  ON public.notifications;
DROP POLICY IF EXISTS "notif_admin_manage" ON public.notifications;

CREATE POLICY "notif_user_select"  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_admin_manage" ON public.notifications FOR ALL
    USING (public.is_admin() OR auth.uid() = user_id) WITH CHECK (TRUE);

-- ---- ad_design_requests ----
DROP POLICY IF EXISTS "ad_req_manage_own" ON public.ad_design_requests;
CREATE POLICY "ad_req_manage_own" ON public.ad_design_requests FOR ALL
    USING (auth.uid() = user_id OR public.is_admin());

-- ---- audit_logs ----
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_admin" ON public.audit_logs FOR ALL USING (public.is_admin());

-- ---- vip_ads ----
DROP POLICY IF EXISTS "vip_ads_select" ON public.vip_ads;
DROP POLICY IF EXISTS "vip_ads_manage" ON public.vip_ads;

CREATE POLICY "vip_ads_select" ON public.vip_ads FOR SELECT
    USING (status = 'active' OR public.is_admin() OR auth.uid() = user_id);
CREATE POLICY "vip_ads_manage" ON public.vip_ads FOR ALL
    USING (auth.uid() = user_id OR public.is_admin());

-- ---- commission_ledger ----
DROP POLICY IF EXISTS "ledger_select" ON public.commission_ledger;
DROP POLICY IF EXISTS "ledger_insert" ON public.commission_ledger;

CREATE POLICY "ledger_select" ON public.commission_ledger FOR SELECT
    USING (broker_id = auth.uid() OR public.is_admin());
CREATE POLICY "ledger_insert" ON public.commission_ledger FOR INSERT WITH CHECK (TRUE);

-- ---- platform_announcements ----
DROP POLICY IF EXISTS "announcements_read"   ON public.platform_announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.platform_announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.platform_announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.platform_announcements;

CREATE POLICY "announcements_read"   ON public.platform_announcements FOR SELECT
    USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "announcements_insert" ON public.platform_announcements FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "announcements_update" ON public.platform_announcements FOR UPDATE USING (public.is_admin());
CREATE POLICY "announcements_delete" ON public.platform_announcements FOR DELETE USING (public.is_admin());

-- ---- event_themes ----
DROP POLICY IF EXISTS "themes_read"   ON public.event_themes;
DROP POLICY IF EXISTS "themes_insert" ON public.event_themes;
DROP POLICY IF EXISTS "themes_update" ON public.event_themes;
DROP POLICY IF EXISTS "themes_delete" ON public.event_themes;

CREATE POLICY "themes_read"   ON public.event_themes FOR SELECT USING (TRUE);
CREATE POLICY "themes_insert" ON public.event_themes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "themes_update" ON public.event_themes FOR UPDATE USING (public.is_admin());
CREATE POLICY "themes_delete" ON public.event_themes FOR DELETE USING (public.is_admin());

-- ---- support_tickets ----
DROP POLICY IF EXISTS "tickets_insert" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_select" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.support_tickets;

CREATE POLICY "tickets_insert" ON public.support_tickets FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "tickets_select" ON public.support_tickets FOR SELECT
    USING (public.is_admin() OR user_email = (auth.jwt() ->> 'email'));
CREATE POLICY "tickets_update" ON public.support_tickets FOR UPDATE USING (public.is_admin());

-- ---- upgrade_requests ----
DROP POLICY IF EXISTS "upgrade_insert" ON public.upgrade_requests;
DROP POLICY IF EXISTS "upgrade_select" ON public.upgrade_requests;
DROP POLICY IF EXISTS "upgrade_update" ON public.upgrade_requests;

CREATE POLICY "upgrade_insert" ON public.upgrade_requests FOR INSERT
    WITH CHECK (merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "upgrade_select" ON public.upgrade_requests FOR SELECT
    USING (public.is_admin() OR merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "upgrade_update" ON public.upgrade_requests FOR UPDATE USING (public.is_admin());

-- ---- platform_audit_log ----
DROP POLICY IF EXISTS "audit_log_insert" ON public.platform_audit_log;
DROP POLICY IF EXISTS "audit_log_select" ON public.platform_audit_log;

CREATE POLICY "audit_log_insert" ON public.platform_audit_log FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "audit_log_select" ON public.platform_audit_log FOR SELECT USING (public.is_admin());

-- ---- platform_kpi_snapshots ----
DROP POLICY IF EXISTS "kpi_select" ON public.platform_kpi_snapshots;
DROP POLICY IF EXISTS "kpi_insert" ON public.platform_kpi_snapshots;
DROP POLICY IF EXISTS "kpi_update" ON public.platform_kpi_snapshots;

CREATE POLICY "kpi_select" ON public.platform_kpi_snapshots FOR SELECT USING (public.is_admin());
CREATE POLICY "kpi_insert" ON public.platform_kpi_snapshots FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "kpi_update" ON public.platform_kpi_snapshots FOR UPDATE USING (public.is_admin());

-- ---- merchant_api_keys ----
DROP POLICY IF EXISTS "api_keys_select" ON public.merchant_api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON public.merchant_api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON public.merchant_api_keys;

CREATE POLICY "api_keys_select" ON public.merchant_api_keys FOR SELECT
    USING (public.is_admin() OR merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "api_keys_insert" ON public.merchant_api_keys FOR INSERT
    WITH CHECK (public.is_admin() OR merchant_email = (auth.jwt() ->> 'email'));
CREATE POLICY "api_keys_update" ON public.merchant_api_keys FOR UPDATE
    USING (public.is_admin() OR merchant_email = (auth.jwt() ->> 'email'));

-- ---- broker_links ----
DROP POLICY IF EXISTS "broker_links_select" ON public.broker_links;
DROP POLICY IF EXISTS "broker_links_insert" ON public.broker_links;
DROP POLICY IF EXISTS "broker_links_update" ON public.broker_links;

CREATE POLICY "broker_links_select" ON public.broker_links FOR SELECT
    USING (public.is_admin() OR broker_id = auth.uid());
CREATE POLICY "broker_links_insert" ON public.broker_links FOR INSERT WITH CHECK (broker_id = auth.uid());
CREATE POLICY "broker_links_update" ON public.broker_links FOR UPDATE
    USING (public.is_admin() OR broker_id = auth.uid());

-- ---- user_cart ----
DROP POLICY IF EXISTS "cart_select" ON public.user_cart;
DROP POLICY IF EXISTS "cart_insert" ON public.user_cart;
DROP POLICY IF EXISTS "cart_update" ON public.user_cart;

CREATE POLICY "cart_select" ON public.user_cart FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cart_insert" ON public.user_cart FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cart_update" ON public.user_cart FOR UPDATE USING (user_id = auth.uid());

-- ---- ai_knowledge_base ----
DROP POLICY IF EXISTS "ai_kb_select" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "ai_kb_insert" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "ai_kb_update" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "ai_kb_delete" ON public.ai_knowledge_base;

CREATE POLICY "ai_kb_select" ON public.ai_knowledge_base FOR SELECT USING (TRUE);
CREATE POLICY "ai_kb_insert" ON public.ai_knowledge_base FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "ai_kb_update" ON public.ai_knowledge_base FOR UPDATE USING (public.is_admin());
CREATE POLICY "ai_kb_delete" ON public.ai_knowledge_base FOR DELETE USING (public.is_admin());


-- ============================================================
-- 6. Storage Buckets للصور والفيديوهات
-- ============================================================

-- باكت صور المنتجات (5MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', TRUE, 5242880,
    ARRAY['image/jpeg','image/png','image/webp','image/gif','image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = TRUE, file_size_limit = 5242880;

-- باكت فيديوهات المنتجات (100MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-videos', 'product-videos', TRUE, 104857600,
    ARRAY['video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- باكت صور العقارات (5MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('real-estate-images', 'real-estate-images', TRUE, 5242880,
    ARRAY['image/jpeg','image/png','image/webp','image/gif','image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = TRUE, file_size_limit = 5242880;

-- سياسات Storage
DROP POLICY IF EXISTS "storage_product_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_product_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_realestate_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_realestate_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_realestate_delete" ON storage.objects;
-- الأسماء القديمة
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
DROP POLICY IF EXISTS "real_estate_images_select" ON storage.objects;
DROP POLICY IF EXISTS "real_estate_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "real_estate_images_delete" ON storage.objects;

CREATE POLICY "storage_product_select" ON storage.objects FOR SELECT
    USING (bucket_id IN ('product-images','product-videos'));

CREATE POLICY "storage_product_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('product-images','product-videos') AND auth.role() = 'authenticated');

CREATE POLICY "storage_product_delete" ON storage.objects FOR DELETE
    USING (bucket_id IN ('product-images','product-videos') AND auth.role() = 'authenticated');

CREATE POLICY "storage_realestate_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'real-estate-images');

CREATE POLICY "storage_realestate_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'real-estate-images');

CREATE POLICY "storage_realestate_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'real-estate-images');

-- باكت صور إعلانات الموقع B2B (3MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-ads', 'site-ads', TRUE, 3145728,
    ARRAY['image/jpeg','image/png','image/webp','image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = TRUE, file_size_limit = 3145728;

DROP POLICY IF EXISTS "storage_siteads_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_siteads_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_siteads_delete" ON storage.objects;

CREATE POLICY "storage_siteads_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'site-ads');

CREATE POLICY "storage_siteads_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'site-ads' AND auth.role() = 'authenticated');

CREATE POLICY "storage_siteads_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'site-ads' AND auth.role() = 'authenticated');


-- ============================================================
-- 7. إعداد حساب الأدمن الافتراضي
-- ============================================================
-- ⚠️  SETUP INSTRUCTIONS (do NOT commit real credentials here):
--
--  1. Replace ADMIN_EMAIL_PLACEHOLDER with your admin e-mail address.
--  2. Replace ADMIN_PASSWORD_PLACEHOLDER with a strong password.
--     The password is stored hashed via bcrypt — it is never stored in plain text.
--  3. Replace ADMIN_NAME_PLACEHOLDER with the admin's display name.
--  4. Replace ADMIN_PHONE_PLACEHOLDER with the admin's phone (e.g. +213xxxxxxxx).
--
--  Alternatively, skip this block entirely and create the admin user
--  directly from the Supabase Dashboard → Authentication → Users,
--  then update the public.users and public.merchant tables manually.
-- ============================================================

DO $$
DECLARE
    v_admin_id UUID;
    v_email    TEXT := 'ADMIN_EMAIL_PLACEHOLDER';    -- ← replace with your admin e-mail
    v_name     TEXT := 'ADMIN_NAME_PLACEHOLDER';     -- ← replace with admin display name
    v_phone    TEXT := 'ADMIN_PHONE_PLACEHOLDER';    -- ← replace with admin phone
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;

    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            v_admin_id, '00000000-0000-0000-0000-000000000000', v_email,
            crypt('ADMIN_PASSWORD_PLACEHOLDER', gen_salt('bf')), NOW(),  -- ← replace password
            '{"provider":"email","providers":["email"]}',
            json_build_object('full_name', v_name, 'phone', v_phone)::jsonb,
            NOW(), NOW(), '', '', '', ''
        );
    END IF;

    INSERT INTO public.users (id, email, full_name, phone, account_status, role, is_active, payment_status, selected_plan)
    VALUES (v_admin_id, v_email, v_name, v_phone, 'admin', 'admin', TRUE, 'paid', 'vip')
    ON CONFLICT (email) DO UPDATE SET
        account_status = 'admin', role = 'admin',
        is_active = TRUE, payment_status = 'paid', selected_plan = 'vip';

    INSERT INTO public.merchant (email, name, slug, package_type, account_status, visitor_count)
    VALUES (v_email, v_name, public.generate_store_slug(v_name, v_email), 'vip', 'active', 0)
    ON CONFLICT (email) DO UPDATE SET
        package_type = 'vip', account_status = 'active',
        name = v_name;

    UPDATE public.merchant
    SET social_ads_remaining = 3
    WHERE package_type = 'vip' AND social_ads_remaining IS NULL;

    RAISE NOTICE '✅ حساب الأدمن جاهز: %', v_email;
END $$;

-- إدراج الإعدادات الافتراضية لـ DCB
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.dcb_settings LIMIT 1) THEN
        INSERT INTO public.dcb_settings (is_enabled, max_limit_per_order, platform_fee_percent)
        VALUES (FALSE, 5000.00, 5.00);
    END IF;
END $$;


-- ============================================================
-- 8. التحقق النهائي من الجداول والأدمن
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_table(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_name
    );
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_status   TEXT;
    tbl_count  INTEGER := 0;
    v_missing  TEXT := '';
    v_tables   TEXT[] := ARRAY[
        'users','merchant','products','orders','admin_notifications','reviews',
        'ai_conversations','point_exchange_requests','real_estate_listings',
        'commission_ledger','platform_announcements','event_themes','support_tickets',
        'upgrade_requests','platform_audit_log','platform_kpi_snapshots',
        'merchant_api_keys','broker_links','user_cart','ai_knowledge_base',
        'notifications','ad_design_requests','audit_logs','vip_ads',
        'dcb_settings','dcb_vendor_settings','dcb_transactions','dcb_transaction_splits'
    ];
    t TEXT;
BEGIN
    -- Replace ADMIN_EMAIL_PLACEHOLDER below with your actual admin e-mail to verify the setup
    SELECT account_status INTO v_status FROM public.users WHERE email = 'ADMIN_EMAIL_PLACEHOLDER';

    FOREACH t IN ARRAY v_tables LOOP
        IF public.check_table(t) THEN
            tbl_count := tbl_count + 1;
        ELSE
            v_missing := v_missing || ' ' || t;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ الجداول المنشأة: %/28', tbl_count;
    RAISE NOTICE '✅ حالة الأدمن: %', COALESCE(v_status, '❌ غير موجود');

    IF v_missing = '' THEN
        RAISE NOTICE '🎉 قاعدة بيانات كلش هنا V5 جاهزة بنجاح!';
    ELSE
        RAISE WARNING '❌ الجداول المفقودة: %', v_missing;
    END IF;
END $$;