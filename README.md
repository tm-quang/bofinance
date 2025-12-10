# BOfin App - Financial Management Application

Ứng dụng quản lý tài chính cá nhân được xây dựng với React, TypeScript, Vite và Supabase.

## 🚀 Deployment trên Vercel

### Biến môi trường bắt buộc

Cần cấu hình các biến môi trường sau trong Vercel Dashboard:

#### Bắt buộc (Required):
- `VITE_SUPABASE_URL` - URL của Supabase project
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

#### Tùy chọn nhưng khuyến nghị (Optional but recommended):
- `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (mặc định: dz2rvqcve)
- `VITE_CLOUDINARY_UPLOAD_PRESET` - Cloudinary upload preset (mặc định: BO-fin)
- `VITE_CLOUDINARY_BASE_FOLDER` - Thư mục base trên Cloudinary (mặc định: BOfin-Img)
- `VITE_CLOUDINARY_ICON_FOLDER` - Thư mục icon (mặc định: icons)
- `VITE_BTMC_API_KEY` - API key cho BTMC Gold Price API
- `VITE_SPEECH_PROVIDER` - Provider cho speech recognition (mặc định: auto)
- `VITE_OPENAI_API_KEY` - API key cho OpenAI Whisper (nếu dùng OpenAI provider)

### Cách thêm biến môi trường trên Vercel:

1. Vào Vercel Dashboard → Project Settings → Environment Variables
2. Thêm từng biến môi trường với giá trị tương ứng
3. Chọn môi trường (Production, Preview, Development)
4. Redeploy project

### Build Command

Vercel sẽ tự động detect Vite và sử dụng:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 📦 Cài đặt local

```bash
# Clone repository
git clone https://github.com/tm-quang/bofinance.git
cd bofinance

# Install dependencies
npm install

# Copy environment template
cp env.template .env

# Điền các giá trị vào file .env

# Chạy dev server
npm run dev
```

## 🛠️ Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## 📝 Lưu ý

- File `.env` không được commit lên Git (đã có trong .gitignore)
- Server config trong `vite.config.ts` chỉ áp dụng cho development
- Production build không cần cấu hình server
