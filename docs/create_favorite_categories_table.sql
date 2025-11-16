-- ============================================
-- CREATE FAVORITE CATEGORIES TABLE
-- ============================================
-- File này tạo bảng favorite_categories để lưu danh sách hạng mục thường dùng của người dùng
-- ============================================

-- 1. Create ENUM type for category type (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_category_type') THEN
        CREATE TYPE public.enum_category_type AS ENUM ('Chi tiêu', 'Thu nhập');
    END IF;
END $$;

-- 2. Check and clean duplicate data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'favorite_categories'
    ) THEN
        -- Delete duplicate entries, keeping only the most recent one per (user_id, category_type)
        DELETE FROM public.favorite_categories
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id, category_type) id
            FROM public.favorite_categories
            ORDER BY user_id, category_type, created_at DESC
        );
        
        -- Drop existing unique constraint if exists (to recreate it properly)
        ALTER TABLE public.favorite_categories DROP CONSTRAINT IF EXISTS favorite_categories_user_category_unique;
    END IF;
END $$;

-- 3. Create favorite_categories table
CREATE TABLE IF NOT EXISTS public.favorite_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_type public.enum_category_type NOT NULL,
    category_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT favorite_categories_user_category_unique UNIQUE (user_id, category_type)
);

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorite_categories_user_id ON public.favorite_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_categories_category_type ON public.favorite_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_favorite_categories_user_type ON public.favorite_categories(user_id, category_type);

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_favorite_categories ON public.favorite_categories;
CREATE TRIGGER handle_updated_at_favorite_categories
    BEFORE UPDATE ON public.favorite_categories
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Enable RLS
ALTER TABLE public.favorite_categories ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own favorite categories" ON public.favorite_categories;
DROP POLICY IF EXISTS "Users can insert own favorite categories" ON public.favorite_categories;
DROP POLICY IF EXISTS "Users can update own favorite categories" ON public.favorite_categories;
DROP POLICY IF EXISTS "Users can delete own favorite categories" ON public.favorite_categories;

-- Policy: Users can view their own favorite categories
CREATE POLICY "Users can view own favorite categories"
    ON public.favorite_categories
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorite categories
CREATE POLICY "Users can insert own favorite categories"
    ON public.favorite_categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own favorite categories
CREATE POLICY "Users can update own favorite categories"
    ON public.favorite_categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorite categories
CREATE POLICY "Users can delete own favorite categories"
    ON public.favorite_categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- END OF SCRIPT
-- ============================================

