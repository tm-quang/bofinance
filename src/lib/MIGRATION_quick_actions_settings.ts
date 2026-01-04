/**
 * HƯỚNG DẪN MIGRATION DATABASE - THÊM CỘT QUICK_ACTIONS_SETTINGS
 * 
 * Để lưu cài đặt tiện ích vào database, bạn cần chạy migration SQL sau
 * trong Supabase SQL Editor:
 */

/*
-- Migration: Add quick_actions_settings column to profiles table
-- This column stores user's quick actions widget preferences as JSON
-- Format: { "action_id": true/false, ... }

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'quick_actions_settings'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN quick_actions_settings JSONB DEFAULT NULL;
        
        -- Add comment to describe the column
        COMMENT ON COLUMN profiles.quick_actions_settings IS 'User quick actions widget settings stored as JSON object with action_id as keys and boolean enabled status as values';
    END IF;
END $$;

-- Example data structure:
-- {
--   "notes-plans": true,
--   "send-money": true,
--   "add-transaction": true,
--   "categories": true,
--   "budgets": false,
--   "shopping-list": false,
--   "voice-to-text": false,
--   "settings": false
-- }
*/

/**
 * CÁCH CHẠY MIGRATION:
 * 
 * 1. Đăng nhập vào Supabase Dashboard
 * 2. Chọn project của bạn
 * 3. Vào SQL Editor (biểu tượng </> ở sidebar)
 * 4. Tạo New Query
 * 5. Copy đoạn SQL ở trên (bỏ dấu comment /*)
 * 6. Paste vào editor và click Run
 * 
 * SAU KHI CHẠY MIGRATION:
 * - Cài đặt tiện ích sẽ được lưu vào database
 * - Đồng bộ giữa các thiết bị
 * - Không mất cài đặt khi xóa cache
 * - localStorage cũ sẽ tự động migrate sang database
 */

export const MIGRATION_INSTRUCTIONS = `
Chạy migration SQL sau trong Supabase SQL Editor:

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'quick_actions_settings'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN quick_actions_settings JSONB DEFAULT NULL;
        
        COMMENT ON COLUMN profiles.quick_actions_settings IS 'User quick actions widget settings stored as JSON object with action_id as keys and boolean enabled status as values';
    END IF;
END $$;
`
