-- ============================================
-- FIX AUDIT LOGS RLS POLICY
-- ============================================
-- File này sửa lỗi "new row violates row-level security policy for table audit_logs"
-- Lỗi này xảy ra khi Supabase Audit Logs extension tạo bảng audit_logs
-- nhưng không có RLS policy phù hợp cho INSERT
-- ============================================

-- 1. Kiểm tra và tạo RLS policy cho audit_logs nếu bảng tồn tại
DO $$
BEGIN
    -- Kiểm tra xem bảng audit_logs có tồn tại không
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
    ) THEN
        -- Bật RLS nếu chưa bật
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Xóa policy cũ nếu có
        DROP POLICY IF EXISTS "Allow system to insert audit logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON public.audit_logs;
        
        -- Tạo policy cho INSERT - cho phép system/trigger insert
        -- Sử dụng SECURITY DEFINER function hoặc cho phép authenticated users
        CREATE POLICY "Allow system to insert audit logs"
            ON public.audit_logs
            FOR INSERT
            WITH CHECK (true); -- Cho phép tất cả authenticated users insert (vì đây là audit log tự động)
        
        -- Tạo policy cho SELECT - chỉ cho phép user đọc log của chính họ (nếu có user_id column)
        -- Nếu không có user_id, chỉ admin mới đọc được
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'audit_logs'
            AND column_name = 'user_id'
        ) THEN
            CREATE POLICY "Allow authenticated users to read their audit logs"
                ON public.audit_logs
                FOR SELECT
                USING (auth.uid() = user_id);
        ELSE
            -- Nếu không có user_id, không cho ai đọc (chỉ system có thể insert)
            CREATE POLICY "Deny all reads from audit logs"
                ON public.audit_logs
                FOR SELECT
                USING (false);
        END IF;
        
        RAISE NOTICE 'Đã tạo RLS policies cho bảng audit_logs';
    ELSE
        RAISE NOTICE 'Bảng audit_logs không tồn tại - không cần sửa';
    END IF;
END $$;

-- 2. Nếu bảng audit_logs không tồn tại nhưng bạn muốn tạo nó (tùy chọn)
-- Bạn có thể bỏ comment phần dưới nếu cần

/*
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow system to insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow users to read their audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);
*/

-- ============================================
-- END OF FIX
-- ============================================

