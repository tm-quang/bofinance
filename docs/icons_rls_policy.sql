-- ============================================
-- RLS Policy cho bảng icons
-- ============================================
-- Bảng icons chứa icons chung cho tất cả users
-- Nên cho phép authenticated users đọc, nhưng chỉ admin mới được tạo/sửa/xóa
-- ============================================

-- 1. Enable RLS cho bảng icons (nếu chưa enable)
ALTER TABLE icons ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Cho phép authenticated users đọc tất cả icons active
CREATE POLICY "Allow authenticated users to read active icons"
ON icons FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Policy: Cho phép authenticated users đọc tất cả icons (kể cả inactive) - nếu cần
-- Uncomment nếu muốn users có thể xem cả icons inactive
-- CREATE POLICY "Allow authenticated users to read all icons"
-- ON icons FOR SELECT
-- TO authenticated
-- USING (true);

-- 4. Policy: Chỉ cho phép user tạo icon của chính họ (nếu muốn)
-- CREATE POLICY "Allow users to create their own icons"
-- ON icons FOR INSERT
-- TO authenticated
-- WITH CHECK (created_by = auth.uid());

-- 5. Policy: Chỉ cho phép user sửa icon của chính họ (nếu muốn)
-- CREATE POLICY "Allow users to update their own icons"
-- ON icons FOR UPDATE
-- TO authenticated
-- USING (created_by = auth.uid())
-- WITH CHECK (created_by = auth.uid());

-- 6. Policy: Chỉ cho phép user xóa icon của chính họ (nếu muốn)
-- CREATE POLICY "Allow users to delete their own icons"
-- ON icons FOR DELETE
-- TO authenticated
-- USING (created_by = auth.uid());

-- ============================================
-- LƯU Ý:
-- ============================================
-- - Nếu icons là shared resource (tất cả users dùng chung):
--   Chỉ cần policy #2 (SELECT) là đủ
-- 
-- - Nếu muốn users tự tạo icons riêng:
--   Cần thêm policies #4, #5, #6
--
-- - Nếu muốn chỉ admin mới quản lý icons:
--   Không tạo policies INSERT/UPDATE/DELETE cho authenticated
--   Chỉ admin (service_role) mới có thể tạo/sửa/xóa
-- ============================================

