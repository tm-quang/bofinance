@echo off
chcp 65001 >nul
echo ========================================
echo    🔍 Test Digital Asset Links
echo ========================================
echo.

set DOMAIN=bofin.vercel.app

echo 📡 Testing assetlinks.json accessibility...
echo.
echo URL: https://%DOMAIN%/.well-known/assetlinks.json
echo.

curl -s -o nul -w "HTTP Status: %%{http_code}\n" https://%DOMAIN%/.well-known/assetlinks.json
echo.

echo 📄 Content:
echo.
curl -s https://%DOMAIN%/.well-known/assetlinks.json
echo.
echo.

echo 🔐 Google Verification:
echo.
echo URL: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://%DOMAIN%^&relation=delegate_permission/common.handle_all_urls
echo.

curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://%DOMAIN%&relation=delegate_permission/common.handle_all_urls"
echo.
echo.

echo ========================================
echo ✅ Test hoàn tất
echo ========================================
echo.
echo Nếu thấy JSON với statement của bạn = OK!
echo Nếu thấy empty hoặc error = Cần fix!
echo.

pause
