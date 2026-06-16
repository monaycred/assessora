@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Removendo lock file...
del .git\index.lock 2>nul

echo.
echo Fazendo stage dos arquivos modificados...
git add "src/app/(dashboard)/whatsapp/page.tsx" "src/app/api/whatsapp/instances/[name]/qr/route.ts" "src/components/layout/Sidebar.tsx"

echo.
echo Fazendo commit...
git commit -m "fix: add addiction tracker link to sidebar"

echo.
echo Fazendo push...
git push origin main

echo.
echo ====================================
echo PRONTO! Verifique o Vercel em 2-3 minutos
echo ====================================
pause
