-- ============================================
-- BO Finance App - Complete Database Schema
-- ============================================
-- File tổng hợp đầy đủ tất cả tables, columns, indexes, triggers, RLS policies
-- Tạo bởi: Auto-generated from codebase analysis
-- Ngày: 2025-12-01
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS handle_updated_at_profiles ON public.profiles;
CREATE TRIGGER handle_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Chi tiêu', 'Thu nhập')),
    icon_id TEXT NOT NULL,
    icon_url TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    default_category_id UUID,
    display_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for categories updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.categories;
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories"
    ON public.categories
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories"
    ON public.categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. DEFAULT_CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.default_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Chi tiêu', 'Thu nhập')),
    icon_id TEXT NOT NULL,
    icon_url TEXT,
    parent_id UUID REFERENCES public.default_categories(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for default_categories
CREATE INDEX IF NOT EXISTS idx_default_categories_parent_id ON public.default_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_default_categories_type ON public.default_categories(type);

-- RLS for default_categories (public read, admin write)
ALTER TABLE public.default_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view default categories" ON public.default_categories;
CREATE POLICY "Anyone can view default categories"
    ON public.default_categories
    FOR SELECT
    USING (true);

-- ============================================
-- 4. WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    icon TEXT,
    color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for wallets updated_at
DROP TRIGGER IF EXISTS handle_updated_at_wallets ON public.wallets;
CREATE TRIGGER handle_updated_at_wallets
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON public.wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON public.wallets(is_active);

-- RLS for wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 5. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('Thu', 'Chi')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    tags TEXT[],
    image_urls TEXT[],
    location TEXT,
    recipient_name TEXT,
    is_borrowed BOOLEAN DEFAULT FALSE,
    lender_name TEXT,
    lender_phone TEXT,
    borrow_date DATE,
    exclude_from_reports BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for transactions updated_at
DROP TRIGGER IF EXISTS handle_updated_at_transactions ON public.transactions;
CREATE TRIGGER handle_updated_at_transactions
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Function to auto-update wallet balance
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
        -- Revert old balance
        IF OLD.type = 'Thu' THEN
            UPDATE public.wallets
            SET balance = balance - OLD.amount
            WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'Chi' THEN
            UPDATE public.wallets
            SET balance = balance + OLD.amount
            WHERE id = OLD.wallet_id;
        END IF;
        -- Apply new balance
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
        -- Revert balance when deleting transaction
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

-- Trigger to auto-update wallet balance
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON public.transactions;
CREATE TRIGGER trigger_update_wallet_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_wallet_balance();

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 6. REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Thu', 'Chi')),
    amount NUMERIC(15, 2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    icon_id TEXT,
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    repeat_type TEXT NOT NULL DEFAULT 'none' CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    repeat_until DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    color TEXT,
    enable_notification BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for reminders updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at_reminders ON public.reminders;
CREATE TRIGGER handle_updated_at_reminders
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_date ON public.reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed_at ON public.reminders(completed_at);

-- RLS for reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
CREATE POLICY "Users can view own reminders"
    ON public.reminders
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
CREATE POLICY "Users can insert own reminders"
    ON public.reminders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
CREATE POLICY "Users can update own reminders"
    ON public.reminders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;
CREATE POLICY "Users can delete own reminders"
    ON public.reminders
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 7. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    deadline DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    week_start_date DATE,
    tags TEXT[],
    color TEXT,
    subtasks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Trigger for tasks updated_at
DROP TRIGGER IF EXISTS handle_updated_at_tasks ON public.tasks;
CREATE TRIGGER handle_updated_at_tasks
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_week_start_date ON public.tasks(week_start_date);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks"
    ON public.tasks
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks"
    ON public.tasks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
    ON public.tasks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
    ON public.tasks
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 8. BUDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    limit_type TEXT CHECK (limit_type IN ('hard', 'soft')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for budgets updated_at
DROP TRIGGER IF EXISTS handle_updated_at_budgets ON public.budgets;
CREATE TRIGGER handle_updated_at_budgets
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON public.budgets(is_active);

-- RLS for budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets"
    ON public.budgets
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
CREATE POLICY "Users can insert own budgets"
    ON public.budgets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
    ON public.budgets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can delete own budgets"
    ON public.budgets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 9. SHOPPING_LISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('market', 'supermarket', 'custom')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Trigger for shopping_lists updated_at
CREATE OR REPLACE FUNCTION update_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON public.shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON public.shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_lists_updated_at();

-- Indexes for shopping_lists
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON public.shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_at ON public.shopping_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_completed_at ON public.shopping_lists(completed_at);

-- RLS for shopping_lists
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can view own shopping lists"
    ON public.shopping_lists
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can insert own shopping lists"
    ON public.shopping_lists
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can update own shopping lists"
    ON public.shopping_lists
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own shopping lists" ON public.shopping_lists;
CREATE POLICY "Users can delete own shopping lists"
    ON public.shopping_lists
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 10. SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('text', 'image', 'json', 'boolean', 'number', 'url', 'color')),
    category TEXT NOT NULL CHECK (category IN ('branding', 'quick_actions', 'content', 'menu', 'logic', 'notifications', 'ui', 'data', 'other')),
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for system_settings updated_at
DROP TRIGGER IF EXISTS handle_updated_at_system_settings ON public.system_settings;
CREATE TRIGGER handle_updated_at_system_settings
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_active ON public.system_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON public.system_settings(is_public);

-- RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view public settings" ON public.system_settings;
CREATE POLICY "Public can view public settings"
    ON public.system_settings
    FOR SELECT
    USING (is_public = TRUE OR is_active = TRUE);

-- ============================================
-- 11. USER_PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    chart_period_type TEXT NOT NULL DEFAULT 'month' CHECK (chart_period_type IN ('day', 'week', 'month')),
    chart_show_advanced BOOLEAN NOT NULL DEFAULT FALSE,
    task_view_period TEXT CHECK (task_view_period IN ('week', 'month', 'custom')),
    task_custom_start_date DATE,
    task_custom_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for user_preferences updated_at
DROP TRIGGER IF EXISTS handle_updated_at_user_preferences ON public.user_preferences;
CREATE TRIGGER handle_updated_at_user_preferences
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
    ON public.user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 12. ICON_IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.icon_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('png', 'jpg', 'jpeg', 'svg', 'webp')),
    image_url TEXT NOT NULL,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('category', 'feature', 'avatar', 'general')),
    group_id TEXT NOT NULL,
    group_label TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for icon_images updated_at
DROP TRIGGER IF EXISTS handle_updated_at_icon_images ON public.icon_images;
CREATE TRIGGER handle_updated_at_icon_images
BEFORE UPDATE ON public.icon_images
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Indexes for icon_images
CREATE INDEX IF NOT EXISTS idx_icon_images_usage_type ON public.icon_images(usage_type);
CREATE INDEX IF NOT EXISTS idx_icon_images_group_id ON public.icon_images(group_id);
CREATE INDEX IF NOT EXISTS idx_icon_images_is_active ON public.icon_images(is_active);

-- RLS for icon_images (public read, admin write)
ALTER TABLE public.icon_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active icon images" ON public.icon_images;
CREATE POLICY "Anyone can view active icon images"
    ON public.icon_images
    FOR SELECT
    USING (is_active = TRUE);

-- ============================================
-- 13. STORAGE BUCKETS (Avatars)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
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
-- END OF SCHEMA
-- ============================================

