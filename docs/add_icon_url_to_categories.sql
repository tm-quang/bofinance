-- ============================================
-- ADD ICON_URL COLUMN TO CATEGORIES TABLE
-- ============================================
-- File này thêm column icon_url vào bảng categories
-- Để hỗ trợ lưu URL ảnh PNG/SVG cho custom icons
-- ============================================

-- 1. Add icon_url column to categories table
ALTER TABLE IF EXISTS public.categories
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Add comment to column
COMMENT ON COLUMN public.categories.icon_url IS 'URL to PNG/SVG image for custom icons (optional)';

-- 3. Verify the change
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'categories'
--   AND column_name = 'icon_url';

