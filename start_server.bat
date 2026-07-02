@echo off
title كلش هنا - السيرفر المحلي
echo.
echo  ======================================
echo   كلش هنا - بدء تشغيل السيرفر المحلي
echo  ======================================
echo.
echo  السيرفر يعمل على: http://localhost:3000
echo  اضغط Ctrl+C لإيقاف السيرفر
echo.
echo  افتح المتصفح على:
echo  - الصفحة الرئيسية : http://localhost:3000/index.html
echo  - لوحة الادارة    : http://localhost:3000/admin.html
echo  - لوحة التاجر     : http://localhost:3000/dashboard.html
echo.
cd /d "d:\kolch hna project"
python -m http.server 3000
pause
