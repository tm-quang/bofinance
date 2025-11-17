-- ============================================
-- UPDATE CATEGORIES TO GET ICON URL FROM ICONS TABLE
-- ============================================
-- File này cập nhật bảng categories để có thể lấy URL ảnh từ bảng icons
-- Khi icon_id trỏ đến icon trong bảng icons có icon_type = 'image' hoặc 'svg'
-- ============================================

-- 1. Đảm bảo icon_url column tồn tại
ALTER TABLE IF EXISTS public.categories
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Thêm comment
COMMENT ON COLUMN public.categories.icon_url IS 'URL to PNG/SVG image from icons table or custom URL (optional)';

-- 3. Tạo function để tự động populate icon_url từ icons table
-- Function này sẽ được gọi khi cần lấy URL từ icons table
CREATE OR REPLACE FUNCTION public.get_icon_url_from_icons(icon_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
    icon_url_result TEXT;
    icon_uuid UUID;
BEGIN
    -- Kiểm tra xem icon_id có phải là UUID không
    BEGIN
        icon_uuid := icon_id_param::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- Không phải UUID, return NULL (có thể là tên icon cho react-icon)
        RETURN NULL;
    END;
    
    -- Lấy image_url từ bảng icons nếu icon_type là 'image' hoặc 'svg'
    SELECT image_url INTO icon_url_result
    FROM public.icons
    WHERE id = icon_uuid
      AND is_active = TRUE
      AND (icon_type = 'image' OR icon_type = 'svg')
      AND image_url IS NOT NULL
    LIMIT 1;
    
    RETURN icon_url_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Tạo view để tự động join và lấy icon_url
CREATE OR REPLACE VIEW public.categories_with_icon_url AS
SELECT 
    c.*,
    COALESCE(
        c.icon_url,  -- Nếu đã có icon_url trong categories, dùng cái đó
        CASE 
            -- Nếu icon_id là UUID, lấy từ icons table
            WHEN c.icon_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                (SELECT image_url 
                 FROM public.icons 
                 WHERE id::TEXT = c.icon_id 
                   AND is_active = TRUE 
                   AND (icon_type = 'image' OR icon_type = 'svg')
                 LIMIT 1)
            ELSE NULL
        END
    ) AS resolved_icon_url
FROM public.categories c;

-- 5. Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_categories_icon_id ON public.categories(icon_id) WHERE icon_id IS NOT NULL;

-- 6. Thêm comment cho function
COMMENT ON FUNCTION public.get_icon_url_from_icons IS 'Lấy URL ảnh từ bảng icons dựa trên icon_id (UUID). Trả về NULL nếu không tìm thấy hoặc không phải UUID.';

-- 7. Tạo trigger function để tự động cập nhật icon_url khi icon được tạo/cập nhật
-- (Optional - có thể bỏ qua nếu muốn lấy real-time)
CREATE OR REPLACE FUNCTION public.sync_category_icon_url()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi icon được cập nhật, cập nhật icon_url trong categories nếu icon_id trùng
    IF TG_OP = 'UPDATE' AND (OLD.image_url IS DISTINCT FROM NEW.image_url) THEN
        UPDATE public.categories
        SET icon_url = NEW.image_url
        WHERE icon_id = NEW.id::TEXT
          AND (icon_url IS NULL OR icon_url = OLD.image_url);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Tạo trigger để tự động sync icon_url
DROP TRIGGER IF EXISTS sync_category_icon_url_trigger ON public.icons;
CREATE TRIGGER sync_category_icon_url_trigger
    AFTER UPDATE OF image_url ON public.icons
    FOR EACH ROW
    WHEN (NEW.icon_type IN ('image', 'svg') AND NEW.image_url IS NOT NULL)
    EXECUTE FUNCTION public.sync_category_icon_url();

-- 9. Cập nhật icon_url cho các categories hiện có (một lần)
-- Chỉ cập nhật những category chưa có icon_url và icon_id là UUID
UPDATE public.categories c
SET icon_url = i.image_url
FROM public.icons i
WHERE c.icon_id = i.id::TEXT
  AND c.icon_url IS NULL
  AND i.is_active = TRUE
  AND (i.icon_type = 'image' OR i.icon_type = 'svg')
  AND i.image_url IS NOT NULL;

-- ============================================
-- END OF SCRIPT
-- ============================================

