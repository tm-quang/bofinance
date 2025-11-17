-- ============================================
-- CREATE ICONS TABLE
-- ============================================
-- File này tạo bảng icons để lưu trữ các icon cho hạng mục
-- Hỗ trợ nhiều loại icon: react-icon, image (PNG/JPG), svg, svg-url
-- ============================================

-- 1. Create ENUM type for icon type (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_icon_type') THEN
        CREATE TYPE public.enum_icon_type AS ENUM ('react-icon', 'image', 'svg', 'svg-url');
    END IF;
END $$;

-- 2. Check and clean duplicate data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'icons'
    ) THEN
        -- Delete duplicate entries, keeping only the most recent one per name
        DELETE FROM public.icons
        WHERE id NOT IN (
            SELECT DISTINCT ON (name) id
            FROM public.icons
            ORDER BY name, created_at DESC
        );
        
        -- Drop existing unique constraint if exists (to recreate it properly)
        ALTER TABLE public.icons DROP CONSTRAINT IF EXISTS icons_name_key;
    END IF;
END $$;

-- 3. Create icons table
CREATE TABLE IF NOT EXISTS public.icons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(200) NOT NULL,
    icon_type public.enum_icon_type NOT NULL,
    react_icon_name VARCHAR(100),
    react_icon_library VARCHAR(50),
    image_url TEXT,
    group_id VARCHAR(50) NOT NULL DEFAULT 'others',
    group_label VARCHAR(100) NOT NULL DEFAULT 'Khác',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT icons_name_key UNIQUE (name)
);

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_icons_name ON public.icons(name);
CREATE INDEX IF NOT EXISTS idx_icons_icon_type ON public.icons(icon_type);
CREATE INDEX IF NOT EXISTS idx_icons_group_id ON public.icons(group_id);
CREATE INDEX IF NOT EXISTS idx_icons_is_active ON public.icons(is_active);
CREATE INDEX IF NOT EXISTS idx_icons_created_by ON public.icons(created_by);
CREATE INDEX IF NOT EXISTS idx_icons_group_active ON public.icons(group_id, is_active);
CREATE INDEX IF NOT EXISTS idx_icons_type_active ON public.icons(icon_type, is_active);
CREATE INDEX IF NOT EXISTS idx_icons_react_library_name ON public.icons(react_icon_library, react_icon_name) WHERE react_icon_library IS NOT NULL;

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_icons ON public.icons;
CREATE TRIGGER handle_updated_at_icons
    BEFORE UPDATE ON public.icons
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Enable RLS
ALTER TABLE public.icons ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active icons" ON public.icons;
DROP POLICY IF EXISTS "Authenticated users can view all icons" ON public.icons;
DROP POLICY IF EXISTS "Admins can insert icons" ON public.icons;
DROP POLICY IF EXISTS "Admins can update icons" ON public.icons;
DROP POLICY IF EXISTS "Admins can delete icons" ON public.icons;

-- Policy: Anyone (including anonymous) can view active icons
-- This allows public access to active icons for use in categories
CREATE POLICY "Anyone can view active icons"
    ON public.icons
    FOR SELECT
    USING (is_active = TRUE);

-- Policy: Authenticated users can view all icons (including inactive)
-- This allows users to see all icons in admin panels
CREATE POLICY "Authenticated users can view all icons"
    ON public.icons
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only admins can insert icons
CREATE POLICY "Admins can insert icons"
    ON public.icons
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Policy: Only admins can update icons
CREATE POLICY "Admins can update icons"
    ON public.icons
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Policy: Only admins can delete icons (soft delete by setting is_active = false)
CREATE POLICY "Admins can delete icons"
    ON public.icons
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- 8. Add comments to table and columns
COMMENT ON TABLE public.icons IS 'Bảng lưu trữ các icon cho hạng mục, hỗ trợ react-icon, image (PNG/JPG), svg, svg-url';
COMMENT ON COLUMN public.icons.name IS 'Tên icon (unique identifier, ví dụ: food, transport)';
COMMENT ON COLUMN public.icons.label IS 'Tên hiển thị của icon (ví dụ: Ăn uống, Đi lại)';
COMMENT ON COLUMN public.icons.icon_type IS 'Loại icon: react-icon, image, svg, svg-url';
COMMENT ON COLUMN public.icons.react_icon_name IS 'Tên icon trong thư viện React Icons (ví dụ: FaHome, BsWallet)';
COMMENT ON COLUMN public.icons.react_icon_library IS 'Thư viện React Icons (ví dụ: fa, bs, lu, hi2, md)';
COMMENT ON COLUMN public.icons.image_url IS 'URL của ảnh trên Cloudinary (cho icon_type = image, svg, svg-url)';
COMMENT ON COLUMN public.icons.group_id IS 'ID nhóm icon (ví dụ: life, finance, lifestyle)';
COMMENT ON COLUMN public.icons.group_label IS 'Tên nhóm icon (ví dụ: Sinh hoạt, Tài chính)';
COMMENT ON COLUMN public.icons.is_active IS 'Trạng thái hoạt động (false = đã xóa soft delete)';
COMMENT ON COLUMN public.icons.display_order IS 'Thứ tự hiển thị (số nhỏ hơn hiển thị trước)';
COMMENT ON COLUMN public.icons.created_by IS 'User ID của người tạo icon';

-- ============================================
-- END OF SCRIPT
-- ============================================

