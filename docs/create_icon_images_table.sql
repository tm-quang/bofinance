-- ============================================
-- CREATE ICON IMAGES TABLE
-- ============================================
-- File này tạo bảng icon_images để lưu trữ các icon hình ảnh (PNG, JPG, SVG)
-- Sử dụng cho: thay đổi ảnh hạng mục, đổi ảnh đại diện chức năng, đổi ảnh avatar
-- ============================================

-- 1. Create ENUM type for file type (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_icon_file_type') THEN
        CREATE TYPE public.enum_icon_file_type AS ENUM ('png', 'jpg', 'jpeg', 'svg', 'webp');
    END IF;
END $$;

-- 2. Create ENUM type for usage type (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_icon_usage_type') THEN
        CREATE TYPE public.enum_icon_usage_type AS ENUM ('category', 'feature', 'avatar', 'general');
    END IF;
END $$;

-- 3. Check and clean duplicate data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'icon_images'
    ) THEN
        -- Delete duplicate entries, keeping only the most recent one per name
        DELETE FROM public.icon_images
        WHERE id NOT IN (
            SELECT DISTINCT ON (name) id
            FROM public.icon_images
            ORDER BY name, created_at DESC
        );
        
        -- Drop existing unique constraint if exists (to recreate it properly)
        ALTER TABLE public.icon_images DROP CONSTRAINT IF EXISTS icon_images_name_key;
    END IF;
END $$;

-- 4. Create icon_images table
CREATE TABLE IF NOT EXISTS public.icon_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(200) NOT NULL,
    file_type public.enum_icon_file_type NOT NULL,
    image_url TEXT NOT NULL,
    usage_type public.enum_icon_usage_type NOT NULL DEFAULT 'general',
    group_id VARCHAR(50) NOT NULL DEFAULT 'others',
    group_label VARCHAR(100) NOT NULL DEFAULT 'Khác',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT icon_images_name_key UNIQUE (name)
);

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_icon_images_name ON public.icon_images(name);
CREATE INDEX IF NOT EXISTS idx_icon_images_file_type ON public.icon_images(file_type);
CREATE INDEX IF NOT EXISTS idx_icon_images_usage_type ON public.icon_images(usage_type);
CREATE INDEX IF NOT EXISTS idx_icon_images_group_id ON public.icon_images(group_id);
CREATE INDEX IF NOT EXISTS idx_icon_images_is_active ON public.icon_images(is_active);
CREATE INDEX IF NOT EXISTS idx_icon_images_created_by ON public.icon_images(created_by);
CREATE INDEX IF NOT EXISTS idx_icon_images_usage_active ON public.icon_images(usage_type, is_active);
CREATE INDEX IF NOT EXISTS idx_icon_images_group_active ON public.icon_images(group_id, is_active);

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_icon_images ON public.icon_images;
CREATE TRIGGER handle_updated_at_icon_images
    BEFORE UPDATE ON public.icon_images
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Enable RLS
ALTER TABLE public.icon_images ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active icon images" ON public.icon_images;
DROP POLICY IF EXISTS "Authenticated users can view all icon images" ON public.icon_images;
DROP POLICY IF EXISTS "Admins can insert icon images" ON public.icon_images;
DROP POLICY IF EXISTS "Admins can update icon images" ON public.icon_images;
DROP POLICY IF EXISTS "Admins can delete icon images" ON public.icon_images;

-- Policy: Anyone (including anonymous) can view active icon images
-- This allows public access to active icons for use in categories, features, etc.
CREATE POLICY "Anyone can view active icon images"
    ON public.icon_images
    FOR SELECT
    USING (is_active = TRUE);

-- Policy: Authenticated users can view all icon images (including inactive)
-- This allows users to see all icons in admin panels
CREATE POLICY "Authenticated users can view all icon images"
    ON public.icon_images
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only admins can insert icon images
CREATE POLICY "Admins can insert icon images"
    ON public.icon_images
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Policy: Only admins can update icon images
CREATE POLICY "Admins can update icon images"
    ON public.icon_images
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

-- Policy: Only admins can delete icon images (soft delete by setting is_active = false)
CREATE POLICY "Admins can delete icon images"
    ON public.icon_images
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- 9. Add comments to table and columns
COMMENT ON TABLE public.icon_images IS 'Bảng lưu trữ các icon hình ảnh (PNG, JPG, SVG) để sử dụng cho hạng mục, chức năng, avatar';
COMMENT ON COLUMN public.icon_images.name IS 'Tên icon (unique identifier, ví dụ: food-icon, transport-icon)';
COMMENT ON COLUMN public.icon_images.label IS 'Tên hiển thị của icon (ví dụ: Ăn uống, Đi lại)';
COMMENT ON COLUMN public.icon_images.file_type IS 'Loại file: png, jpg, jpeg, svg, webp';
COMMENT ON COLUMN public.icon_images.image_url IS 'URL của ảnh trên Cloudinary hoặc CDN';
COMMENT ON COLUMN public.icon_images.usage_type IS 'Mục đích sử dụng: category (hạng mục), feature (chức năng), avatar (ảnh đại diện), general (chung)';
COMMENT ON COLUMN public.icon_images.group_id IS 'ID nhóm icon (ví dụ: life, finance, lifestyle)';
COMMENT ON COLUMN public.icon_images.group_label IS 'Tên nhóm icon (ví dụ: Sinh hoạt, Tài chính)';
COMMENT ON COLUMN public.icon_images.is_active IS 'Trạng thái hoạt động (false = đã xóa soft delete)';
COMMENT ON COLUMN public.icon_images.display_order IS 'Thứ tự hiển thị (số nhỏ hơn hiển thị trước)';
COMMENT ON COLUMN public.icon_images.created_by IS 'User ID của người tạo icon';

-- ============================================
-- END OF SCRIPT
-- ============================================

