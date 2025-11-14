# Hướng dẫn tạo Android APK từ PWA Builder

## Bước 0: Kiểm tra PWA readiness (Tùy chọn)

Trước khi sử dụng PWA Builder, bạn có thể kiểm tra xem website đã sẵn sàng chưa:

```bash
# Sử dụng script kiểm tra (sau khi deploy)
tool\check-pwa-ready.bat https://bofin.vercel.app
```

Script này sẽ kiểm tra:
- ✅ HTTPS
- ✅ Manifest file
- ✅ Service Worker
- ✅ Icons
- ✅ Website accessibility

## Bước 1: Deploy website lên Vercel (hoặc hosting khác)

Trước khi sử dụng PWA Builder, bạn cần deploy website lên một URL công khai với HTTPS.

### Nếu chưa deploy:

1. **Deploy lên Vercel:**
   ```bash
   # Sử dụng script trong tool/
   tool\deploy-vercel.bat
   
   # Hoặc dùng Vercel CLI
   npm install -g vercel
   vercel --prod
   ```

2. **Lấy URL của website** (ví dụ: `https://bofin.vercel.app`)

## Bước 2: Kiểm tra PWA requirements

PWA Builder yêu cầu website phải có:

✅ **Web App Manifest** - Đã có trong `vite.config.ts`
✅ **Service Worker** - Đã có (Workbox tự động tạo)
✅ **HTTPS** - Vercel cung cấp HTTPS tự động
✅ **Icons** - Đã có (192x192, 512x512)

## Bước 3: Sử dụng PWA Builder

### 3.1. Truy cập PWA Builder

1. Mở trình duyệt và truy cập: **https://www.pwabuilder.com/**
2. Nhập URL của website đã deploy (ví dụ: `https://bofin.vercel.app`)
3. Click **"Start"** hoặc nhấn Enter

### 3.2. PWA Builder sẽ phân tích website

PWA Builder sẽ kiểm tra:
- ✅ Manifest file
- ✅ Service Worker
- ✅ Icons
- ✅ HTTPS
- ✅ Responsive design

### 3.3. Tạo Android Package

1. Sau khi phân tích xong, bạn sẽ thấy điểm số PWA
2. Click vào tab **"Android"** hoặc **"Build My PWA"**
3. Chọn **"Generate Android Package"**

### 3.4. Cấu hình Android App

Bạn sẽ được yêu cầu điền thông tin:

**Package Information:**
- **Package ID**: `app.vercel.bofin` (hoặc tùy chỉnh)
- **App Name**: `BOfin App`
- **App Version**: `1.0.0`
- **App Version Code**: `1`

**Signing:**
- Chọn **"Generate new signing key"** (lần đầu)
- Hoặc upload keystore nếu đã có (file trong `tool/android.keystore`)

**Icons:**
- PWA Builder sẽ tự động lấy icons từ manifest
- Có thể upload thêm nếu cần

**Permissions:**
- Kiểm tra các permissions cần thiết
- Thường không cần thêm permissions cho PWA cơ bản

### 3.5. Download Android Package

1. Click **"Generate Package"**
2. PWA Builder sẽ build APK/AAB file
3. Download file về máy

## Bước 4: Cài đặt APK trên Android

### Cách 1: Cài trực tiếp
1. Copy file APK vào điện thoại Android
2. Mở file APK
3. Cho phép "Install from unknown sources" nếu được hỏi
4. Cài đặt

### Cách 2: Upload lên Google Play Store
1. Sử dụng file AAB (Android App Bundle) thay vì APK
2. Tạo tài khoản Google Play Developer ($25 một lần)
3. Upload AAB lên Google Play Console
4. Điền thông tin app và submit để review

## Lưu ý quan trọng

### 1. Manifest phải đầy đủ
Đảm bảo manifest có đủ thông tin:
- ✅ name, short_name
- ✅ start_url, scope
- ✅ icons (ít nhất 192x192 và 512x512)
- ✅ display: "standalone"
- ✅ theme_color, background_color

### 2. Service Worker phải hoạt động
- Service Worker phải được register thành công
- Có thể kiểm tra trong DevTools > Application > Service Workers

### 3. HTTPS là bắt buộc
- PWA Builder chỉ hoạt động với HTTPS
- Vercel tự động cung cấp HTTPS

### 4. Icons phải đúng format
- PNG format
- Kích thước: 192x192, 512x512 (bắt buộc)
- Có thể thêm các kích thước khác: 144x144, 384x384

## Troubleshooting

### Lỗi: "Manifest not found"
- Kiểm tra manifest có được serve đúng không
- Truy cập: `https://your-domain.com/manifest.webmanifest`
- Đảm bảo manifest có đầy đủ thông tin

### Lỗi: "Service Worker not found"
- Kiểm tra service worker đã được register chưa
- Mở DevTools > Application > Service Workers
- Đảm bảo service worker đang active

### Lỗi: "Icons missing"
- Kiểm tra icons có tồn tại không
- Truy cập: `https://your-domain.com/icon-192x192.png`
- Đảm bảo icons có đúng kích thước

## Tài liệu tham khảo

- PWA Builder: https://www.pwabuilder.com/
- PWA Builder Documentation: https://docs.pwabuilder.com/
- Android App Bundle Guide: https://developer.android.com/guide/app-bundle

