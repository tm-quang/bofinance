-- ============================================
-- Seed Default Categories vào Supabase
-- ============================================
-- Script này seed danh sách hạng mục mặc định vào bảng default_categories
-- CHẠY MỘT LẦN DUY NHẤT khi setup ban đầu
-- ============================================

-- Xóa dữ liệu cũ nếu có (tùy chọn - chỉ dùng khi muốn reset)
-- DELETE FROM default_categories;

-- ============================================
-- CHI TIÊU (EXPENSE) - Parent Categories
-- ============================================

-- 1. Ăn uống
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Ăn uống', 'Chi tiêu', 'food', NULL, 1)
ON CONFLICT DO NOTHING;

-- 2. Nhà cửa & Hóa đơn
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Nhà cửa & Hóa đơn', 'Chi tiêu', 'home', NULL, 2)
ON CONFLICT DO NOTHING;

-- 3. Di chuyển
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Di chuyển', 'Chi tiêu', 'transport', NULL, 3)
ON CONFLICT DO NOTHING;

-- 4. Sức khỏe
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Sức khỏe', 'Chi tiêu', 'health', NULL, 4)
ON CONFLICT DO NOTHING;

-- 5. Phát triển Bản thân
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Phát triển Bản thân', 'Chi tiêu', 'education', NULL, 5)
ON CONFLICT DO NOTHING;

-- 6. Gia đình & Con cái
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Gia đình & Con cái', 'Chi tiêu', 'community', NULL, 6)
ON CONFLICT DO NOTHING;

-- 7. Hiếu hỉ & Quan hệ
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Hiếu hỉ & Quan hệ', 'Chi tiêu', 'gift', NULL, 7)
ON CONFLICT DO NOTHING;

-- 8. Hưởng thụ & Giải trí
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Hưởng thụ & Giải trí', 'Chi tiêu', 'gaming', NULL, 8)
ON CONFLICT DO NOTHING;

-- 9. Mua sắm
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Mua sắm', 'Chi tiêu', 'shopping', NULL, 9)
ON CONFLICT DO NOTHING;

-- 10. Chi phí Tài chính
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Chi phí Tài chính', 'Chi tiêu', 'safe', NULL, 10)
ON CONFLICT DO NOTHING;

-- 11. Tiền ra
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền ra', 'Chi tiêu', 'other', NULL, 11)
ON CONFLICT DO NOTHING;

-- 12. Trả nợ
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Trả nợ', 'Chi tiêu', 'safe', NULL, 12)
ON CONFLICT DO NOTHING;

-- 13. Chi phí Linh tinh
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Chi phí Linh tinh', 'Chi tiêu', 'other', NULL, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- CHI TIÊU - Children Categories
-- ============================================

-- Children của "Ăn uống"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đi chợ, Nấu ăn', 'Chi tiêu', 'groceries', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Ăn tiệm, Nhà hàng', 'Chi tiêu', 'service', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Cafe, Đồ uống', 'Chi tiêu', 'coffee', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Giao đồ ăn (Delivery)', 'Chi tiêu', 'car', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiệc tùng, Bạn bè', 'Chi tiêu', 'party', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Ăn uống' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đồ ăn vặt, Rượu bia', 'Chi tiêu', 'other', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Nhà cửa & Hóa đơn"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiền thuê nhà / Trả góp nhà', 'Chi tiêu', 'home', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hóa đơn Điện', 'Chi tiêu', 'bolt', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hóa đơn Nước', 'Chi tiêu', 'water', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Internet, Truyền hình', 'Chi tiêu', 'wifi', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Gas, Đun nấu', 'Chi tiêu', 'fire', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí quản lý, Chung cư', 'Chi tiêu', 'service', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Sửa chữa nhà cửa', 'Chi tiêu', 'maintenance', parent_cat.id, 7 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Nhà cửa & Hóa đơn' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Giúp việc, Vệ sinh', 'Chi tiêu', 'service', parent_cat.id, 8 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Di chuyển"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Xăng, Dầu', 'Chi tiêu', 'car', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Gửi xe', 'Chi tiêu', 'car', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Taxi, Xe công nghệ', 'Chi tiêu', 'transport', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Vé tàu, Xe, Máy bay', 'Chi tiêu', 'travel', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo dưỡng, Sửa chữa xe', 'Chi tiêu', 'maintenance', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí cầu đường, Lệ phí', 'Chi tiêu', 'car', parent_cat.id, 6 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Di chuyển' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuê xe', 'Chi tiêu', 'car', parent_cat.id, 7 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Sức khỏe"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuốc men, Dược phẩm', 'Chi tiêu', 'health', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Khám bệnh, Bác sĩ, Phẫu thuật', 'Chi tiêu', 'health', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo hiểm y tế', 'Chi tiêu', 'safe', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Chăm sóc cá nhân (Cắt tóc, spa...)', 'Chi tiêu', 'wellness', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Sức khỏe' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thực phẩm chức năng', 'Chi tiêu', 'health', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Phát triển Bản thân"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Học phí, Khóa học', 'Chi tiêu', 'education', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Sách, Tài liệu', 'Chi tiêu', 'education', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Hội thảo, Sự kiện', 'Chi tiêu', 'event', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phần mềm, Ứng dụng', 'Chi tiêu', 'other', parent_cat.id, 4 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Phát triển Bản thân' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Văn phòng phẩm', 'Chi tiêu', 'personal', parent_cat.id, 5 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Gia đình & Con cái"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiêu vặt cho con', 'Chi tiêu', 'other', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Học phí con', 'Chi tiêu', 'education', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Gia đình & Con cái' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quần áo, Đồ dùng con', 'Chi tiêu', 'shopping', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Hiếu hỉ & Quan hệ"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quà tặng', 'Chi tiêu', 'gift', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiệc cưới, Sinh nhật', 'Chi tiêu', 'party', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hiếu hỉ & Quan hệ' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Từ thiện', 'Chi tiêu', 'charity', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Hưởng thụ & Giải trí"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Xem phim, Nhạc', 'Chi tiêu', 'movie', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Du lịch', 'Chi tiêu', 'travel', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Hưởng thụ & Giải trí' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thiết bị điện tử, Công nghệ', 'Chi tiêu', 'other', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Mua sắm"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Quần áo, Giày dép', 'Chi tiêu', 'shopping', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Mỹ phẩm, Làm đẹp', 'Chi tiêu', 'wellness', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Mua sắm' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Đồ gia dụng', 'Chi tiêu', 'home', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Chi phí Tài chính"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Phí ngân hàng', 'Chi tiêu', 'safe', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Bảo hiểm', 'Chi tiêu', 'safe', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Tài chính' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Thuế', 'Chi tiêu', 'safe', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- Children của "Chi phí Linh tinh"
WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Tiêu vặt', 'Chi tiêu', 'other', parent_cat.id, 1 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Mất tiền, Bị phạt', 'Chi tiêu', 'other', parent_cat.id, 2 FROM parent_cat
ON CONFLICT DO NOTHING;

WITH parent_cat AS (SELECT id FROM default_categories WHERE name = 'Chi phí Linh tinh' AND type = 'Chi tiêu' AND parent_id IS NULL LIMIT 1)
INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
SELECT 'Chi phí khác (Không thể phân loại)', 'Chi tiêu', 'other', parent_cat.id, 3 FROM parent_cat
ON CONFLICT DO NOTHING;

-- ============================================
-- THU NHẬP (INCOME) - Parent Categories
-- ============================================

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Lương', 'Thu nhập', 'salary', NULL, 1)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Thưởng', 'Thu nhập', 'bonus', NULL, 2)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền lãi', 'Thu nhập', 'investment', NULL, 3)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Lãi tiết kiệm', 'Thu nhập', 'savings', NULL, 4)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Đi vay', 'Thu nhập', 'safe', NULL, 5)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Thu nợ', 'Thu nhập', 'safe', NULL, 6)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Được cho/tặng', 'Thu nhập', 'gift', NULL, 7)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Tiền vào', 'Thu nhập', 'other', NULL, 8)
ON CONFLICT DO NOTHING;

INSERT INTO default_categories (name, type, icon_id, parent_id, display_order)
VALUES ('Khác', 'Thu nhập', 'other', NULL, 99)
ON CONFLICT DO NOTHING;

-- ============================================
-- HOÀN TẤT
-- ============================================
-- Sau khi chạy script này, bảng default_categories sẽ chứa đầy đủ
-- danh sách hạng mục mặc định. Admin có thể quản lý qua UI.
-- ============================================

