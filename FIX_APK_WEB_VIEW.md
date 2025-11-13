# 🔧 Sửa lỗi APK vẫn hiển thị giao diện Web

## ❌ Vấn đề
APK đã cài vẫn có:
- Thanh địa chỉ web
- Giao diện browser
- Không phải native app hoàn toàn

## ✅ Nguyên nhân
Thiếu **Digital Asset Links** để xác thực TWA (Trusted Web Activity).

---

## 🚀 Giải pháp (3 bước)

### Bước 1: Lấy SHA256 Fingerprint từ APK

#### Cách 1: Dùng PWABuilder (Dễ nhất)

1. Khi tạo APK trên PWABuilder, sau khi download
2. PWABuilder sẽ hiển thị **SHA256 fingerprint** 
3. Copy fingerprint đó (dạng: `AA:BB:CC:DD:...`)

#### Cách 2: Dùng APK Analyzer (Android Studio)

1. Mở Android Studio
2. Menu → Build → Analyze APK
3. Chọn file APK đã tải
4. Xem trong phần **Signing**
5. Copy SHA256 fingerprint

#### Cách 3: Dùng keytool (Command line)

Nếu bạn có file `.keystore`:

```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

Hoặc extract từ APK:

```bash
# Cài đặt apksigner (Android SDK)
apksigner verify --print-certs app.apk
```

---

### Bước 2: Cập nhật assetlinks.json

1. Mở file: `public/.well-known/assetlinks.json`

2. Thay thế `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` bằng SHA256 thực tế:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.bofin.app",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
    ]
  }
}]
```

**Lưu ý:**
- Package name phải khớp với APK (vd: `com.bofin.app`)
- SHA256 phải đúng format (32 bytes, cách nhau bởi `:`)
- Không có dấu cách thừa

---

### Bước 3: Deploy và Verify

#### 3.1 Deploy lên Vercel

```bash
git add public/.well-known/assetlinks.json
git commit -m "Add Digital Asset Links for TWA"
git push origin main
```

#### 3.2 Verify file accessible

Mở trình duyệt và kiểm tra:

```
https://bofin.vercel.app/.well-known/assetlinks.json
```

File phải:
- ✅ Trả về status 200
- ✅ Content-Type: `application/json`
- ✅ Có nội dung JSON đúng

#### 3.3 Test bằng Google Tool

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://bofin.vercel.app&relation=delegate_permission/common.handle_all_urls
```

Phải trả về JSON với statement của bạn.

---

### Bước 4: Rebuild APK

1. Quay lại PWABuilder: https://www.pwabuilder.com/
2. Nhập lại: `https://bofin.vercel.app`
3. Generate APK mới
4. Gỡ APK cũ trên điện thoại
5. Cài APK mới

**Quan trọng:** Phải dùng cùng signing key!

---

## 🎯 Cách nhanh nhất (Không cần Digital Asset Links)

Nếu bạn muốn APK native ngay lập tức mà không cần setup phức tạp:

### Dùng Bubblewrap CLI

```bash
# Cài đặt
npm install -g @bubblewrap/cli

# Khởi tạo
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest

# Trả lời các câu hỏi:
# - Domain: bofin.vercel.app
# - Package name: com.bofin.app
# - App name: BOfin
# - Start URL: /login

# Build APK
bubblewrap build

# APK sẽ được tạo với signing key tự động
```

Bubblewrap sẽ:
- ✅ Tự động tạo signing key
- ✅ Tự động generate SHA256
- ✅ Hướng dẫn setup Digital Asset Links
- ✅ Build APK native hoàn toàn

---

## 📋 Checklist

- [ ] Lấy được SHA256 fingerprint từ APK
- [ ] Cập nhật `assetlinks.json` với SHA256 đúng
- [ ] Deploy lên Vercel
- [ ] Verify file accessible tại `/.well-known/assetlinks.json`
- [ ] Test bằng Google Digital Asset Links API
- [ ] Rebuild APK với cùng signing key
- [ ] Gỡ APK cũ
- [ ] Cài APK mới
- [ ] Mở app → Không còn giao diện web!

---

## 🐛 Troubleshooting

### APK vẫn hiển thị web sau khi setup?

1. **Xóa cache app:**
   - Settings → Apps → BOfin → Storage → Clear Cache
   - Gỡ và cài lại app

2. **Kiểm tra package name:**
   - Package name trong APK phải khớp với `assetlinks.json`
   - Xem trong PWABuilder settings

3. **Kiểm tra SHA256:**
   - SHA256 phải chính xác 100%
   - Không có dấu cách, phải có dấu `:`

4. **Kiểm tra file accessible:**
   - File phải ở đúng path: `/.well-known/assetlinks.json`
   - Phải trả về JSON, không phải HTML

5. **Đợi propagation:**
   - Sau khi deploy, đợi 5-10 phút
   - Google cần thời gian verify

### File assetlinks.json không accessible?

Thêm vào `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## 💡 Khuyến nghị

**Dùng Bubblewrap CLI** - Đơn giản nhất, tự động hóa mọi thứ!

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest
bubblewrap build
```

Sau khi build xong, Bubblewrap sẽ cho bạn:
- ✅ APK file
- ✅ SHA256 fingerprint
- ✅ Hướng dẫn setup assetlinks.json

Copy SHA256 vào `assetlinks.json`, deploy, và rebuild là xong!

---

## 📚 Tài liệu tham khảo

- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Bubblewrap Documentation](https://github.com/GoogleChromeLabs/bubblewrap)
