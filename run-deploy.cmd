@echo off
setlocal enabledelayedexpansion
cd /D "C:\Users\gedai\Documents\Claude\Projects\IASMIN"

REM Configure git
git config user.email "gedaias.moura@hotmail.com" >nul 2>&1
git config user.name "Gedaías" >nul 2>&1

REM Add changes
echo 📝 Adding all changes...
git add -A
if errorlevel 1 (
    echo Error adding changes!
    pause
    exit /b 1
)

REM Commit
echo 💾 Creating commit...
git commit -m "feat: WhatsApp obrigatório com máscara de entrada

- Tornar WhatsApp obrigatório no cadastro
- Máscara (XX) XXXXX-XXXX sem o 55
- Pré-preenchimento com bandeira 🇧🇷
- Validação obrigatória (mínimo 10 dígitos)
- Edição do WhatsApp na página de configurações
- Salvar com código de país (55) no banco
- Exibição amigável (sem 55)"
if errorlevel 1 (
    echo Error creating commit!
    pause
    exit /b 1
)

REM Show logs
echo.
echo ✅ Últimos commits:
git log --oneline -5

REM Push
echo.
echo 🚀 Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo Error pushing to GitHub!
    pause
    exit /b 1
)

echo.
echo ✅ Done! Vercel will auto-deploy the changes.
pause
