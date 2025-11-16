-- ============================================
-- BOFIN APP - DATABASE SCHEMA FINAL (OPTIMIZED)
-- ============================================
-- File này chứa toàn bộ schema database cho ứng dụng BOfin
-- Đã được tối ưu hóa dung lượng và chuẩn hóa
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ENUM TYPES
-- (Tối ưu: Sử dụng ENUM thay vì TEXT CHECK để tiết kiệm dung lượng)
-- ============================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_transaction_type') THEN
        CREATE TYPE public.enum_transaction_type AS ENUM ('Thu', 'Chi');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_category_type') THEN
        CREATE TYPE public.enum_category_type AS ENUM ('Thu nhập', 'Chi tiêu');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_wallet_type') THEN
        CREATE TYPE public.enum_wallet_type AS ENUM ('Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_type') THEN
        CREATE TYPE public.enum_notification_type AS ENUM ('transaction', 'reminder', 'budget', 'system', 'admin', 'promotion', 'event');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_notification_status') THEN
        CREATE TYPE public.enum_notification_status AS ENUM ('unread', 'read', 'archived');
    END IF;
END $$;


-- ============================================
-- 3. TABLES
-- ============================================

-- 3.1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- (Tối ưu: Thêm user_id để chuẩn hóa)
    name TEXT NOT NULL,
    type public.enum_category_type NOT NULL, -- (Tối ưu: Sử dụng ENUM)
    icon_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone VARCHAR(20), -- (Tối ưu: Giới hạn VARCHAR)
    date_of_birth DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type public.enum_wallet_type NOT NULL, -- (Tối ưu: Sử dụng ENUM)
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'VND', -- (Tối ưu: CHAR(3) cho mã tiền tệ)
    icon TEXT,
    color VARCHAR(7), -- (Tối ưu: VARCHAR(7) cho mã hex color)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    type public.enum_transaction_type NOT NULL, -- (Tối ưu: Sử dụng ENUM)
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.enum_notification_type NOT NULL, -- (Tối ưu: Sử dụng ENUM)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status public.enum_notification_status NOT NULL DEFAULT 'unread', -- (Tối ưu: Sử dụng ENUM)
    metadata JSONB DEFAULT NULL,
    related_id UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ DEFAULT NULL
);

-- 3.6. Default Categories Table (for seeding)
CREATE TABLE IF NOT EXISTS default_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type public.enum_category_type NOT NULL, -- (Tối ưu: Sử dụng ENUM)
    icon_id TEXT NOT NULL,
    parent_id UUID REFERENCES default_categories(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, type, parent_id)
);

-- 3.7. Icons Table (if needed)
CREATE TABLE IF NOT EXISTS icons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon_data TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- 4.1. Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2. Function to update wallet balance on transaction changes
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'Thu' THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'Chi' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount
            WHERE id = NEW.wallet_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Hoàn tác số dư cũ
        IF OLD.type = 'Thu' THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'Chi' THEN
            UPDATE public.wallets
            SET balance = balance + OLD.amount
            WHERE id = OLD.wallet_id;
        END IF;
        -- Áp dụng số dư mới
        IF NEW.type = 'Thu' THEN
            UPDATE public.wallets
            SET balance = balance + NEW.amount
            WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'Chi' THEN
            UPDATE public.wallets
            SET balance = balance - NEW.amount
            WHERE id = NEW.wallet_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Hoàn tác số dư khi xóa giao dịch
        IF OLD.type = 'Thu' THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'Chi' THEN
            UPDATE public.wallets
            SET balance = balance + OLD.amount
            WHERE id = OLD.wallet_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4.3. Function to update notifications updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4. Function to handle new user creation
-- (Tối ưu: Tự động sao chép danh mục mặc định cho người dùng mới)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Tạo profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

    -- 2. Sao chép danh mục mặc định cho người dùng mới
    INSERT INTO public.categories (user_id, name, type, icon_id)
    SELECT
        NEW.id, -- ID của người dùng mới
        dc.name,
        dc.type,
        dc.icon_id
    FROM public.default_categories AS dc;
            
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- 5.1. Categories updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.categories;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5.2. Profiles updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at_profiles ON public.profiles;
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5.3. Wallets updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at_wallets ON public.wallets;
CREATE TRIGGER handle_updated_at_wallets
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5.4. Transactions updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at_transactions ON public.transactions;
CREATE TRIGGER handle_updated_at_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5.5. Transactions wallet balance trigger
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON public.transactions;
CREATE TRIGGER trigger_update_wallet_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_wallet_balance();

-- 5.6. Notifications updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- 5.7. Auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 6. INDEXES
-- ============================================

-- 6.1. Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id); -- (Tối ưu: Index cho cột user_id mới)

-- 6.2. Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
-- (Tối ưu: Thêm index tổng hợp cho truy vấn phổ biến)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);
-- (Tối ưu: Thêm index GIN cho tìm kiếm tag)
CREATE INDEX IF NOT EXISTS idx_transactions_tags_gin ON public.transactions USING GIN (tags);


-- 6.3. Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON public.wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON public.wallets(is_active);

-- 6.4. Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- 7.1. Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_categories ENABLE ROW LEVEL SECURITY; -- (Tối ưu: Bật RLS cho bảng default)

-- 7.2. Categories Policies
-- (Tối ưu: Sửa RLS để bảo mật, dựa trên user_id)
DROP POLICY IF EXISTS "Allow read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow write categories" ON public.categories;
CREATE POLICY "Users can manage their own categories"
    ON public.categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7.3. Default Categories Policies
DROP POLICY IF EXISTS "Allow all users to read default categories" ON public.default_categories;
CREATE POLICY "Allow all users to read default categories"
    ON public.default_categories
    FOR SELECT
    USING (true); -- Mọi người đều có thể đọc danh sách mẫu

-- 7.4. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 7.5. Wallets Policies
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
CREATE POLICY "Users can view own wallets"
    ON public.wallets
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
CREATE POLICY "Users can insert own wallets"
    ON public.wallets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
CREATE POLICY "Users can update own wallets"
    ON public.wallets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;
CREATE POLICY "Users can delete own wallets"
    ON public.wallets
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7.6. Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
    ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
    ON public.transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
    ON public.transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7.7. Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7.8. Icons Policies
CREATE POLICY "Allow authenticated users to read active icons"
    ON icons FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================
-- 8. STORAGE SETUP
-- ============================================

-- 8.1. Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 8.2. Storage Policies for Avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 9. VIEWS
-- ============================================

-- 9.1. Notifications unread count view
CREATE OR REPLACE VIEW notifications_unread_count AS
SELECT 
    user_id,
    COUNT(*) as unread_count
FROM notifications
WHERE status = 'unread'
GROUP BY user_id;

-- ============================================
-- 10. SEED DATA - DEFAULT CATEGORIES
-- (Không cần thay đổi, PostgreSQL sẽ tự động ép kiểu string sang ENUM)
-- ============================================

-- 10.1. CHI TIÊU (EXPENSE) - Parent Categories
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Ăn uống', 'Chi tiêu', 'food', NULL, 1)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Nhà cửa & Hóa đơn', 'Chi tiêu', 'home', NULL, 2)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Di chuyển', 'Chi tiêu', 'transport', NULL, 3)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Sức khỏe', 'Chi tiêu', 'health', NULL, 4)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Phát triển Bản thân', 'Chi tiêu', 'education', NULL, 5)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Gia đình & Con cái', 'Chi tiêu', 'community', NULL, 6)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Hiếu hỉ & Quan hệ', 'Chi tiêu', 'gift', NULL, 7)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Hưởng thụ & Giải trí', 'Chi tiêu', 'gaming', NULL, 8)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Mua sắm', 'Chi tiêu', 'shopping', NULL, 9)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Chi phí Tài chính', 'Chi tiêu', 'safe', NULL, 10)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền ra', 'Chi tiêu', 'other', NULL, 11)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Trả nợ', 'Chi tiêu', 'safe', NULL, 12)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Chi phí Linh tinh', 'Chi tiêu', 'other', NULL, 99)
ON CONFLICT DO NOTHING;

-- 10.2. CHI TIÊU - Children Categories

-- Children của "Ăn uống"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đi chợ, Nấu ăn', 'Chi tiêu', 'groceries', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Ăn tiệm, Nhà hàng', 'Chi tiêu', 'service', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Cafe, Đồ uống', 'Chi tiêu', 'coffee', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Giao đồ ăn (Delivery)', 'Chi tiêu', 'car', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiệc tùng, Bạn bè', 'Chi tiêu', 'party', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đồ ăn vặt, Rượu bia', 'Chi tiêu', 'other', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Nhà cửa & Hóa đơn"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiền thuê nhà / Trả góp nhà', 'Chi tiêu', 'home', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hóa đơn Điện', 'Chi tiêu', 'bolt', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hóa đơn Nước', 'Chi tiêu', 'water', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Internet, Truyền hình', 'Chi tiêu', 'wifi', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Gas, Đun nấu', 'Chi tiêu', 'fire', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí quản lý, Chung cư', 'Chi tiêu', 'service', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Sửa chữa nhà cửa', 'Chi tiêu', 'maintenance', parent_cat.id, 7 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Giúp việc, Vệ sinh', 'Chi tiêu', 'service', parent_cat.id, 8 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Di chuyển"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Xăng, Dầu', 'Chi tiêu', 'car', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Gửi xe', 'Chi tiêu', 'car', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Taxi, Xe công nghệ', 'Chi tiêu', 'transport', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Vé tàu, Xe, Máy bay', 'Chi tiêu', 'travel', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo dưỡng, Sửa chữa xe', 'Chi tiêu', 'maintenance', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí cầu đường, Lệ phí', 'Chi tiêu', 'car', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuê xe', 'Chi tiêu', 'car', parent_cat.id, 7 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Sức khỏe"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuốc men, Dược phẩm', 'Chi tiêu', 'health', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Khám bệnh, Bác sĩ, Phẫu thuật', 'Chi tiêu', 'health', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo hiểm y tế', 'Chi tiêu', 'safe', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Chăm sóc cá nhân (Cắt tóc, spa...)', 'Chi tiêu', 'wellness', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thực phẩm chức năng', 'Chi tiêu', 'health', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Phát triển Bản thân"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Học phí, Khóa học', 'Chi tiêu', 'education', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Sách, Tài liệu', 'Chi tiêu', 'education', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hội thảo, Sự kiện', 'Chi tiêu', 'event', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phần mềm, Ứng dụng', 'Chi tiêu', 'other', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Văn phòng phẩm', 'Chi tiêu', 'personal', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Gia đình & Con cái"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiêu vặt cho con', 'Chi tiêu', 'other', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Học phí con', 'Chi tiêu', 'education', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quần áo, Đồ dùng con', 'Chi tiêu', 'shopping', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tả, sữa', 'Chi tiêu', 'shopping', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Hiếu hỉ & Quan hệ"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quà tặng', 'Chi tiêu', 'gift', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiệc cưới, Sinh nhật', 'Chi tiêu', 'party', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Từ thiện', 'Chi tiêu', 'charity', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Hưởng thụ & Giải trí"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Xem phim, Nhạc', 'Chi tiêu', 'movie', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Du lịch', 'Chi tiêu', 'travel', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thiết bị điện tử, Công nghệ', 'Chi tiêu', 'other', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Mua sắm"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quần áo, Giày dép', 'Chi tiêu', 'shopping', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Mỹ phẩm, Làm đẹp', 'Chi tiêu', 'wellness', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đồ gia dụng', 'Chi tiêu', 'home', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Chi phí Tài chính"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí ngân hàng', 'Chi tiêu', 'safe', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo hiểm', 'Chi tiêu', 'safe', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuế', 'Chi tiêu', 'safe', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Chi phí Linh tinh"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiêu vặt', 'Chi tiêu', 'other', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Mất tiền, Bị phạt', 'Chi tiêu', 'other', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Chi phí khác (Không thể phân loại)', 'Chi tiêu', 'other', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- 10.3. THU NHẬP (INCOME) - Parent Categories
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Lương', 'Thu nhập', 'salary', NULL, 1)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Thưởng', 'Thu nhập', 'bonus', NULL, 2)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền lãi', 'Thu nhập', 'investment', NULL, 3)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Lãi tiết kiệm', 'Thu nhập', 'savings', NULL, 4)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Đi vay', 'Thu nhập', 'safe', NULL, 5)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Thu nợ', 'Thu nhập', 'safe', NULL, 6)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Được cho/tặng', 'Thu nhập', 'gift', NULL, 7)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền vào', 'Thu nhập', 'other', NULL, 8)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Khác', 'Thu nhập', 'other', NULL, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- END OF SCHEMA
-- ============================================