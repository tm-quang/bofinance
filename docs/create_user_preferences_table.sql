-- ============================================
-- CREATE USER PREFERENCES TABLE
-- ============================================
-- File này tạo bảng user_preferences để lưu cài đặt người dùng
-- ============================================

-- 1. Create ENUM type for chart period (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_chart_period_type') THEN
        CREATE TYPE public.enum_chart_period_type AS ENUM ('day', 'week', 'month');
    END IF;
END $$;

-- 2. Check and clean duplicate data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) THEN
        -- Delete duplicate entries, keeping only the most recent one per user_id
        DELETE FROM public.user_preferences
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id) id
            FROM public.user_preferences
            ORDER BY user_id, created_at DESC
        );
        
        -- Drop existing unique constraint if exists (to recreate it properly)
        ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_key;
    END IF;
END $$;

-- 3. Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chart_period_type public.enum_chart_period_type NOT NULL DEFAULT 'month',
    chart_show_advanced BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- 5. Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_updated_at_user_preferences ON public.user_preferences;
CREATE TRIGGER handle_updated_at_user_preferences
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON public.user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
    ON public.user_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- END OF SCRIPT
-- ============================================

