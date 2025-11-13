# Database Schema

Tài liệu này mô tả cấu trúc database cho ứng dụng BoFin.

## Các bảng

### 1. profiles
Lưu thông tin cá nhân của người dùng.

**Các cột:**
- `id` (uuid, PK): Tham chiếu đến `auth.users(id)`
- `email` (text): Email người dùng
- `full_name` (text): Họ và tên
- `avatar_url` (text): URL của avatar
- `phone` (text): Số điện thoại
- `date_of_birth` (date): Ngày sinh
- `created_at` (timestamptz): Thời gian tạo
- `updated_at` (timestamptz): Thời gian cập nhật

**Chức năng:**
- Tự động tạo profile khi user đăng ký
- Row Level Security (RLS) chỉ cho phép user xem/sửa profile của chính mình

### 2. wallets
Lưu thông tin các ví của người dùng.

**Các cột:**
- `id` (uuid, PK): ID ví
- `user_id` (uuid, FK): Tham chiếu đến `auth.users(id)`
- `name` (text): Tên ví
- `type` (text): Loại ví (Tiền mặt, Ngân hàng, Tiết kiệm, Tín dụng, Đầu tư, Khác)
- `balance` (numeric): Số dư hiện tại
- `currency` (text): Đơn vị tiền tệ (mặc định: VND)
- `icon` (text): Icon của ví
- `color` (text): Màu sắc của ví
- `is_active` (boolean): Trạng thái hoạt động
- `description` (text): Mô tả
- `created_at` (timestamptz): Thời gian tạo
- `updated_at` (timestamptz): Thời gian cập nhật

**Chức năng:**
- RLS chỉ cho phép user quản lý ví của chính mình
- Index để tối ưu truy vấn

### 3. transactions
Lưu các giao dịch Thu và Chi.

**Các cột:**
- `id` (uuid, PK): ID giao dịch
- `user_id` (uuid, FK): Tham chiếu đến `auth.users(id)`
- `wallet_id` (uuid, FK): Tham chiếu đến `wallets(id)`
- `category_id` (uuid, FK): Tham chiếu đến `categories(id)`
- `type` (text): Loại giao dịch (Thu hoặc Chi)
- `amount` (numeric): Số tiền
- `description` (text): Mô tả
- `transaction_date` (date): Ngày giao dịch
- `notes` (text): Ghi chú
- `tags` (text[]): Mảng các tag
- `created_at` (timestamptz): Thời gian tạo
- `updated_at` (timestamptz): Thời gian cập nhật

**Chức năng:**
- Tự động cập nhật số dư ví khi có giao dịch mới/cập nhật/xóa
- RLS chỉ cho phép user quản lý giao dịch của chính mình
- Index để tối ưu truy vấn

### 4. categories
Lưu các danh mục Thu và Chi (đã có sẵn).

## Storage

### avatars
Bucket lưu trữ avatar của người dùng.

**Policies:**
- Public read: Mọi người có thể xem avatar
- Authenticated upload: Chỉ user có thể upload avatar của chính mình
- Authenticated update/delete: Chỉ user có thể sửa/xóa avatar của chính mình

## Cách sử dụng

1. Chạy các file SQL theo thứ tự:
   - `20251113_create_categories.sql` (nếu chưa có)
   - `20251113_create_profiles.sql`
   - `20251113_create_wallets.sql`
   - `20251113_create_transactions.sql`
   - `20251113_create_storage.sql`

2. Import các service functions vào code:
   - `src/lib/profileService.ts`
   - `src/lib/walletService.ts`
   - `src/lib/transactionService.ts`

3. Sử dụng các functions trong components/pages của bạn.

## Lưu ý

- Tất cả các bảng đều có RLS (Row Level Security) để đảm bảo bảo mật
- Số dư ví được tự động cập nhật khi có giao dịch
- Profile được tự động tạo khi user đăng ký
- Storage bucket `avatars` cần được tạo trong Supabase Dashboard hoặc qua SQL

