# ⚡ Sửa nhanh APK vẫn có giao diện Web

## 🎯 Cách nhanh nhất (5 phút)

### Dùng Bubblewrap CLI

```bash
# 1. Cài đặt Bubblewrap
npm install -g @bubblewrap/cli

# 2. Khởi tạo dự án TWA
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest

# Trả lời:
# - Domain: bofin.vercel.app
# - Package name: com.bofin.app (hoặc com.tmquang.bofin)
# - App name: BOfin
# - Start URL: /login

# 3. Build APK
bubblewrap build

# 4. Lấy SHA256 fingerprint
bubblewrap fingerprint
```

### Sau khi có SHA256:

1. **Copy SHA256** (dạng: `AA:BB:CC:...`)

2. **Mở file:** `public/.well-known/assetlinks.json`

3. **Thay thế:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.bofin.app",
    "sha256_cert_fingerprints": [
      "PASTE_SHA256_HERE"
    ]
  }
}]
```

4. **Deploy:**
```bash
git add public/.well-known/assetlinks.json
git commit -m "Add SHA256 fingerprint"
git push origin main
```

5. **Đợi 2 phút** để Vercel deploy

6. **Test:**
```bash
test-assetlinks.bat
```

7. **Rebuild APK:**
```bash
bubblewrap build
```

8. **Cài APK mới** lên điện thoại

**Xong!** APK giờ là native app 100%! 🎉

---

## 🔍 Kiểm tra nhanh

Sau khi cài APK mới:
- ✅ Không có thanh địa chỉ
- ✅ Không có menu browser
- ✅ Thanh trạng thái màu xanh
- ✅ Giống hệt native app

---

## ❓ Vẫn không được?

Xem hướng dẫn chi tiết: `FIX_APK_WEB_VIEW.md`
