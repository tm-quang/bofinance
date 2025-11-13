# BoFin Supabase Starter (React + Vite + Tailwind)

Khung dự án mới để thay thế stack Firebase hiện tại bằng Supabase. Bao gồm:

- React 19 + TypeScript + Vite 7
- Tailwind CSS đã cấu hình sẵn
- Supabase SDK (`@supabase/supabase-js`)
- UI intro kiểm tra kết nối Supabase

## 1. Bắt đầu nhanh

```bash
cd BOfin-app
cp env.example .env.local # hoặc tự tạo file .env.local
npm install
npm run dev
```

Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env.local` trước khi chạy.

## 2. Thiết lập Supabase

1. Tạo project mới trên [Supabase](https://supabase.com/).
2. Vào `Project Settings → API` để lấy `Project URL` và `anon public`.
3. Thêm vào `.env.local` như sau:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

4. (Tuỳ chọn) Tạo bảng mẫu:

```sql
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

5. Kiểm tra file `src/App.tsx` để thấy cách gọi `supabase.auth.getSession()` và thông báo trạng thái.

## 3. Phát triển giao diện

- Tailwind đã được bật thông qua `src/index.css`.
- Tạo component mới trong `src/components/` và import vào `App.tsx` hoặc tạo router (React Router, TanStack Router...) theo yêu cầu.
- Dùng `getSupabaseClient()` từ `src/lib/supabaseClient.ts` ở bất kỳ hook/service nào để tương tác với database hoặc auth.

## 4. Deploy lên Vercel

1. Đưa source lên GitHub/GitLab/Bitbucket.
2. Trên Vercel, chọn **Add New Project**, liên kết repository.
3. Thiết lập môi trường build:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Thêm biến môi trường (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) trong **Project Settings → Environment Variables**.
5. Deploy branch chính. Vercel sẽ build Vite và tự động deploy.

## 5. Kết nối sản phẩm thật

- Thêm cơ chế auth (magic link, email/password, OAuth) thông qua Supabase Auth.
- Thiết kế bảng dữ liệu (transactions, budgets…) và viết service layer tương ứng.
- Sử dụng Supabase Row Level Security (RLS) để bảo vệ dữ liệu người dùng.
- Bật thêm Supabase Storage nếu cần upload file/hóa đơn.

---

Cần hỗ trợ tiếp tục migrate logic từ Firebase sang Supabase (auth, realtime, policies, migration data), cứ báo để mình hỗ trợ chi tiết hơn.			   
