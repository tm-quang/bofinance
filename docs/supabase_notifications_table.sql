-- Tạo bảng notifications trong Supabase
-- Chạy SQL này trong Supabase SQL Editor

-- 1. Tạo bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transaction', 'reminder', 'budget', 'system', 'admin', 'promotion', 'event')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  metadata JSONB DEFAULT NULL,
  related_id UUID DEFAULT NULL, -- ID của transaction, reminder, budget, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);

-- 3. Tạo function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo trigger để tự động cập nhật updated_at
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Tạo policy: Users chỉ có thể xem thông báo của chính họ
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Tạo policy: Users chỉ có thể tạo thông báo cho chính họ
CREATE POLICY "Users can insert their own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Tạo policy: Users chỉ có thể cập nhật thông báo của chính họ
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Tạo policy: Users chỉ có thể xóa thông báo của chính họ
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- 10. (Optional) Tạo policy cho admin để tạo thông báo cho tất cả users
-- Chỉ bật nếu bạn có role admin trong hệ thống
-- CREATE POLICY "Admins can create notifications for all users"
--   ON notifications
--   FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM user_roles 
--       WHERE user_id = auth.uid() 
--       AND role = 'admin'
--     )
--   );

-- 11. Tạo view để đếm số thông báo chưa đọc (optional, để tối ưu query)
CREATE OR REPLACE VIEW notifications_unread_count AS
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE status = 'unread'
GROUP BY user_id;

-- 12. Grant permissions cho view (nếu cần)
-- GRANT SELECT ON notifications_unread_count TO authenticated;

