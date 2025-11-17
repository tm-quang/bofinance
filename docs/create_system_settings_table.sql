-- ============================================
-- CREATE SYSTEM SETTINGS TABLE
-- ============================================
-- File này tạo bảng system_settings để lưu trữ các cài đặt hệ thống
-- Bao gồm: logo, ảnh quick actions, văn bản, menu, logic, thông báo, v.v.
-- ============================================

-- 1. Create ENUM type for setting category (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_setting_category') THEN
        CREATE TYPE public.enum_setting_category AS ENUM (
            'branding',      -- Logo, brand colors, app name
            'quick_actions', -- Quick action images and settings
            'content',       -- Text content, labels, messages
            'menu',          -- Menu items, navigation
            'logic',         -- Business logic settings
            'notifications', -- Notification templates
            'ui',            -- UI/UX settings
            'data',          -- Data management settings
            'other'          -- Other settings
        );
    END IF;
END $$;

-- 2. Create ENUM type for setting type (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_setting_type') THEN
        CREATE TYPE public.enum_setting_type AS ENUM (
            'text',         -- Plain text
            'image',        -- Image URL
            'json',         -- JSON data
            'boolean',      -- True/False
            'number',       -- Numeric value
            'url',          -- URL string
            'color'         -- Color code
        );
    END IF;
END $$;

-- 3. Check and clean duplicate data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'system_settings'
    ) THEN
        -- Delete duplicate entries, keeping only the most recent one per key
        DELETE FROM public.system_settings
        WHERE id NOT IN (
            SELECT DISTINCT ON (setting_key) id
            FROM public.system_settings
            ORDER BY setting_key, created_at DESC
        );
        
        -- Drop existing unique constraint if exists (to recreate it properly)
        ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;
    END IF;
END $$;

-- 4. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type public.enum_setting_type NOT NULL DEFAULT 'text',
    category public.enum_setting_category NOT NULL DEFAULT 'other',
    label VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Public settings can be accessed without auth
    metadata JSONB, -- Additional metadata (e.g., image dimensions, file size, etc.)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key)
);

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_type ON public.system_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_system_settings_active ON public.system_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON public.system_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_system_settings_category_active ON public.system_settings(category, is_active);

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_system_settings ON public.system_settings;
CREATE TRIGGER handle_updated_at_system_settings
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can view all settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can delete settings" ON public.system_settings;

-- Public settings can be viewed by anyone
CREATE POLICY "Public settings are viewable by everyone"
    ON public.system_settings
    FOR SELECT
    USING (is_public = TRUE);

-- Authenticated users can view all settings
CREATE POLICY "Authenticated users can view all settings"
    ON public.system_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete (you may want to add admin check)
-- For now, any authenticated user can manage settings
-- TODO: Add admin role check if needed
CREATE POLICY "Authenticated users can insert settings"
    ON public.system_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings"
    ON public.system_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete settings"
    ON public.system_settings
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- 9. Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, label, description, is_public)
VALUES
    -- Branding
    ('app_logo', '/logo-nontext.png', 'image', 'branding', 'Logo ứng dụng', 'Logo chính của ứng dụng', TRUE),
    ('app_name', 'BO.fin', 'text', 'branding', 'Tên ứng dụng', 'Tên hiển thị của ứng dụng', TRUE),
    ('app_splash_logo', '/logo-nontext.png', 'image', 'branding', 'Logo màn hình loading', 'Logo hiển thị khi tải ứng dụng', TRUE),
    
    -- Quick Actions Images
    ('quick_action_send_money', '/images/quick-actions/bofin-giftmoney.png', 'image', 'quick_actions', 'Ảnh Chi tiền', 'Ảnh cho nút Chi tiền', TRUE),
    ('quick_action_add_transaction', '', 'image', 'quick_actions', 'Ảnh Thêm thu/chi', 'Ảnh cho nút Thêm thu/chi', TRUE),
    ('quick_action_categories', '', 'image', 'quick_actions', 'Ảnh Hạng mục', 'Ảnh cho nút Hạng mục', TRUE),
    ('quick_action_split_bill', '', 'image', 'quick_actions', 'Ảnh Chia khoản', 'Ảnh cho nút Chia khoản', TRUE),
    ('quick_action_reminder', '', 'image', 'quick_actions', 'Ảnh Nhắc thu/chi', 'Ảnh cho nút Nhắc thu/chi', TRUE),
    ('quick_action_settings', '', 'image', 'quick_actions', 'Ảnh Cài đặt', 'Ảnh cho nút Cài đặt', TRUE),
    
    -- Content
    ('welcome_message', 'Chào mừng đến với BO.fin', 'text', 'content', 'Thông điệp chào mừng', 'Thông điệp hiển thị khi người dùng đăng nhập', FALSE),
    
    -- UI Settings
    ('theme_primary_color', '#0ea5e9', 'color', 'ui', 'Màu chủ đạo', 'Màu chủ đạo của giao diện', TRUE),
    ('theme_secondary_color', '#3b82f6', 'color', 'ui', 'Màu phụ', 'Màu phụ của giao diện', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

