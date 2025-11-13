# 📱 Tạo APK cho BOfin App

## ✅ Đã cài đặt xong

Dự án của bạn đã được cấu hình để tạo PWA và APK Android!

## 🚀 Các bước tiếp theo

### 1️⃣ Tạo Icon (2 phút)

```bash
npm run create-icons
```

Hoặc mở file `create-icons.html` trong trình duyệt:
- Tạo icon với chữ "BF" hoặc tên bạn muốn
- Tải xuống 2 file: `icon-192x192.png` và `icon-512x512.png`
- Copy vào thư mục `public/`

### 2️⃣ Build PWA

```bash
npm run build
```

### 3️⃣ Tạo APK (Chọn 1 trong 3 cách)

#### 🌟 Cách 1: PWABuilder (Dễ nhất - Không cần code)

1. Truy cập: https://www.pwabuilder.com/
2. Nhập: `https://bofin.vercel.app`
3. Click "Start" → "Package" → "Android"
4. Tải xuống APK

#### 🔧 Cách 2: Bubblewrap CLI

```bash
# Cài đặt
npm install -g @bubblewrap/cli

# Tạo APK
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest
bubblewrap build
```

#### 💻 Cách 3: Android Studio

Xem hướng dẫn chi tiết trong `BUILD_APK_GUIDE.md`

## 📚 Tài liệu

- **QUICK_START_APK.md** - Hướng dẫn nhanh (5 phút)
- **BUILD_APK_GUIDE.md** - Hướng dẫn chi tiết đầy đủ

## ⚠️ Lưu ý quan trọng

1. **Icon**: Phải thay thế icon placeholder bằng icon thực tế
2. **Digital Asset Links**: Để TWA hoạt động tốt, cần deploy file `public/.well-known/assetlinks.json` lên Vercel
3. **Test PWA**: Thử "Add to Home screen" trên Chrome mobile trước

## 🎯 Khuyến nghị

**Dùng PWABuilder** nếu bạn muốn nhanh và đơn giản!

---

Chúc bạn thành công! 🎉
