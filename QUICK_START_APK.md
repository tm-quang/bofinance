# Hướng dẫn nhanh tạo APK cho BOfin App

## Cách nhanh nhất (5 phút)

### Bước 1: Chuẩn bị icon

Tạo 2 file icon PNG:
- `public/icon-192x192.png` (192x192 pixels)
- `public/icon-512x512.png` (512x512 pixels)

Bạn có thể dùng logo của BOfin hoặc tạo icon đơn giản.

### Bước 2: Build PWA

```bash
npm run build
```

Deploy lên Vercel (nếu chưa):
```bash
vercel --prod
```

### Bước 3: Tạo APK bằng PWABuilder (Không cần code)

1. Mở trình duyệt và truy cập: **https://www.pwabuilder.com/**

2. Nhập URL: `https://bofin.vercel.app`

3. Click **"Start"**

4. PWABuilder sẽ phân tích PWA của bạn

5. Click tab **"Package"** → Chọn **"Android"**

6. Điền thông tin:
   - Package ID: `com.bofin.app`
   - App name: `BOfin App`
   - Version: `1.0.0`

7. Click **"Generate"** và tải xuống APK

8. Cài đặt APK lên điện thoại Android

**Xong!** Bạn đã có APK của BOfin App.

---

## Cách dùng Bubblewrap (Chuyên nghiệp hơn)

### Cài đặt

```bash
npm install -g @bubblewrap/cli
```

### Tạo APK

```bash
# Khởi tạo
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest

# Build APK
bubblewrap build

# Cài đặt lên điện thoại (kết nối USB)
bubblewrap install
```

APK sẽ nằm trong thư mục dự án.

---

## Lưu ý

1. **Icon**: Thay thế file placeholder bằng icon thực tế
2. **Test PWA**: Mở https://bofin.vercel.app/login trên Chrome mobile và thử "Add to Home screen"
3. **Digital Asset Links**: Để TWA hoạt động tốt nhất, cần thêm file verification (xem BUILD_APK_GUIDE.md)

---

## Cần giúp đỡ?

Xem hướng dẫn chi tiết trong file `BUILD_APK_GUIDE.md`
