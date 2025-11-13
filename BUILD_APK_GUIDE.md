# Hướng dẫn tạo APK từ PWA cho BOfin App

## Phương pháp 1: Sử dụng Bubblewrap (Khuyến nghị)

Bubblewrap là công cụ của Google để tạo Android APK từ PWA sử dụng Trusted Web Activity (TWA).

### Bước 1: Cài đặt Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### Bước 2: Khởi tạo dự án TWA

```bash
bubblewrap init --manifest https://bofin.vercel.app/manifest.webmanifest
```

Trả lời các câu hỏi:
- Domain: bofin.vercel.app
- Package name: com.bofin.app (hoặc tên bạn muốn)
- App name: BOfin App
- Start URL: /login

### Bước 3: Build APK

```bash
bubblewrap build
```

APK sẽ được tạo trong thư mục `app-release-signed.apk`

### Bước 4: Cài đặt APK lên thiết bị

```bash
bubblewrap install
```

Hoặc copy file APK vào điện thoại và cài đặt thủ công.

---

## Phương pháp 2: Sử dụng PWABuilder

1. Truy cập: https://www.pwabuilder.com/
2. Nhập URL: https://bofin.vercel.app
3. Click "Start" để phân tích PWA
4. Chọn "Android" và click "Generate Package"
5. Tải xuống APK

---

## Phương pháp 3: Sử dụng Android Studio (Nâng cao)

### Bước 1: Tạo dự án Android mới

1. Mở Android Studio
2. New Project → Empty Activity
3. Package name: com.bofin.app
4. Language: Kotlin/Java

### Bước 2: Thêm dependencies vào build.gradle

```gradle
dependencies {
    implementation 'androidx.browser:browser:1.7.0'
}
```

### Bước 3: Cấu hình AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.bofin.app">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="BOfin App"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="bofin.vercel.app" />
            </intent-filter>
        </activity>
        
        <meta-data
            android:name="asset_statements"
            android:resource="@string/asset_statements" />
    </application>
</manifest>
```

### Bước 4: Tạo MainActivity

```kotlin
package com.bofin.app

import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val url = "https://bofin.vercel.app/login"
        val builder = CustomTabsIntent.Builder()
        val customTabsIntent = builder.build()
        customTabsIntent.launchUrl(this, Uri.parse(url))
        
        finish()
    }
}
```

### Bước 5: Build APK

```bash
./gradlew assembleRelease
```

---

## Lưu ý quan trọng

### 1. Digital Asset Links (Bắt buộc cho TWA)

Để TWA hoạt động, bạn cần thêm file `.well-known/assetlinks.json` vào web server:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.bofin.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Lấy SHA256 fingerprint:
```bash
keytool -list -v -keystore your-keystore.jks
```

### 2. Icon Requirements

- Icon 192x192px: `/public/icon-192x192.png`
- Icon 512x512px: `/public/icon-512x512.png`

Bạn cần tạo icon thực tế cho ứng dụng.

### 3. Build PWA trước

```bash
npm run build
```

Deploy lên Vercel để đảm bảo PWA hoạt động đúng.

### 4. Test PWA

Trước khi build APK, test PWA trên Chrome mobile:
1. Mở https://bofin.vercel.app/login trên Chrome mobile
2. Menu → "Add to Home screen"
3. Kiểm tra xem app có hoạt động như mong đợi không

---

## Khuyến nghị

**Phương pháp 1 (Bubblewrap)** là đơn giản và nhanh nhất cho hầu hết trường hợp.

**Phương pháp 2 (PWABuilder)** phù hợp nếu bạn không muốn cài đặt công cụ.

**Phương pháp 3 (Android Studio)** cho phép tùy chỉnh nhiều nhất nhưng phức tạp hơn.

---

## Troubleshooting

### Lỗi: "Digital Asset Links verification failed"

- Đảm bảo file `assetlinks.json` được deploy đúng
- Kiểm tra SHA256 fingerprint chính xác
- Test tại: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://bofin.vercel.app

### APK không cài đặt được

- Bật "Install from unknown sources" trong Settings
- Kiểm tra APK đã được sign chưa

### App mở browser thay vì TWA

- Kiểm tra Digital Asset Links
- Đảm bảo package name khớp với assetlinks.json
