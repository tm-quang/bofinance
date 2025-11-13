# Hướng dẫn Migration Database

Tài liệu này hướng dẫn cách chạy các migration SQL để tạo các bảng cần thiết cho ứng dụng BoFin.

## Các bảng cần tạo

1. **profiles** - Thông tin cá nhân, avatar
2. **wallets** - Các loại ví (tiền mặt, ngân hàng, tiết kiệm, tín dụng, v.v.)
3. **transactions** - Giao dịch Thu và Chi
4. **Storage bucket** - Lưu trữ avatar

## Cách chạy migration

### Cách 1: Qua Supabase Dashboard (Khuyến nghị)

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Mở từng file SQL trong thư mục `supabase/schema/` và chạy theo thứ tự:
   - `20251113_create_categories.sql` (nếu chưa có)
   - `20251113_create_profiles.sql`
   - `20251113_create_wallets.sql`
   - `20251113_create_transactions.sql`
   - `20251113_create_storage.sql`

### Cách 2: Qua Supabase CLI

```bash
# Cài đặt Supabase CLI (nếu chưa có)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Chạy migrations
supabase db push
```

## Tạo Storage Bucket

Nếu bạn chạy migration qua SQL Editor, storage bucket sẽ được tạo tự động. Nếu không, bạn có thể tạo thủ công:

1. Vào **Storage** trong Supabase Dashboard
2. Click **New bucket**
3. Tên bucket: `avatars`
4. Public bucket: **Bật** (checked)
5. Click **Create bucket**

## Kiểm tra kết quả

Sau khi chạy migration, kiểm tra:

1. **Tables**: Vào **Table Editor** và kiểm tra các bảng:
   - `profiles`
   - `wallets`
   - `transactions`
   - `categories` (nếu chưa có)

2. **Storage**: Vào **Storage** và kiểm tra bucket `avatars`

3. **Policies**: Vào **Authentication > Policies** và kiểm tra RLS policies đã được tạo

## Sử dụng trong code

### Profile Service

```typescript
import { 
  getCurrentProfile, 
  updateProfile, 
  changePassword, 
  uploadAvatar 
} from '@/lib/profileService'

// Lấy thông tin profile
const profile = await getCurrentProfile()

// Cập nhật thông tin
await updateProfile({ 
  full_name: 'Nguyễn Văn A',
  phone: '0123456789' 
})

// Đổi mật khẩu
await changePassword('oldPassword', 'newPassword')

// Upload avatar
const file = // File từ input
const avatarUrl = await uploadAvatar(file)
```

### Wallet Service

```typescript
import { 
  fetchWallets, 
  createWallet, 
  updateWallet, 
  deleteWallet 
} from '@/lib/walletService'

// Lấy tất cả ví
const wallets = await fetchWallets()

// Tạo ví mới
const newWallet = await createWallet({
  name: 'Ví tiết kiệm',
  type: 'Tiết kiệm',
  balance: 1000000,
  currency: 'VND'
})

// Cập nhật ví
await updateWallet(walletId, { 
  balance: 2000000 
})

// Xóa ví (soft delete)
await deleteWallet(walletId)
```

### Transaction Service

```typescript
import { 
  fetchTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getTransactionStats 
} from '@/lib/transactionService'

// Lấy giao dịch với filters
const transactions = await fetchTransactions({
  type: 'Chi',
  start_date: '2025-01-01',
  end_date: '2025-01-31'
})

// Tạo giao dịch mới
const transaction = await createTransaction({
  wallet_id: 'wallet-uuid',
  category_id: 'category-uuid',
  type: 'Chi',
  amount: 50000,
  description: 'Ăn trưa',
  transaction_date: '2025-01-15'
})

// Lấy thống kê
const stats = await getTransactionStats(
  '2025-01-01',
  '2025-01-31'
)
// stats: { total_income, total_expense, net_balance, transaction_count }
```

## Lưu ý quan trọng

1. **Row Level Security (RLS)**: Tất cả các bảng đều có RLS để đảm bảo user chỉ có thể truy cập dữ liệu của chính mình.

2. **Auto-update balance**: Số dư ví được tự động cập nhật khi có giao dịch mới/cập nhật/xóa thông qua database triggers.

3. **Auto-create profile**: Profile được tự động tạo khi user đăng ký thông qua database trigger.

4. **Storage permissions**: Avatar storage bucket có policies để chỉ cho phép user upload/sửa/xóa avatar của chính mình.

## Troubleshooting

### Lỗi: "relation does not exist"
- Đảm bảo đã chạy tất cả các migration theo đúng thứ tự
- Kiểm tra xem bạn đã chọn đúng database schema (public)

### Lỗi: "permission denied"
- Kiểm tra RLS policies đã được tạo đúng chưa
- Đảm bảo user đã đăng nhập khi thực hiện các thao tác

### Lỗi: "bucket does not exist"
- Tạo storage bucket `avatars` thủ công trong Supabase Dashboard
- Hoặc chạy lại file `20251113_create_storage.sql`

### Lỗi: "trigger does not exist"
- Đảm bảo function `handle_updated_at()` đã được tạo (trong file categories.sql)
- Chạy lại file `20251113_create_categories.sql` trước

## Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
- [Supabase Documentation](https://supabase.com/docs)
- Logs trong Supabase Dashboard > Logs
- Console errors trong browser DevTools

