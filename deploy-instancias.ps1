# deploy-instancias.ps1
# Execute no PowerShell dentro da pasta IASMIN:
#   cd "C:\Users\gedai\Documents\Claude\Projects\IASMIN"
#   .\deploy-instancias.ps1

Set-Location "C:\Users\gedai\Documents\Claude\Projects\IASMIN"

# Remove o lock file se existir
if (Test-Path ".git\index.lock") {
    Remove-Item ".git\index.lock" -Force
    Write-Host "Lock removido." -ForegroundColor Yellow
}

# Adiciona todos os arquivos modificados
git add -A

# Commit
git commit -m "feat: sistema de instancias WhatsApp estilo CRM-Raiz"

# Push
git push origin main

Write-Host ""
Write-Host "Deploy enviado! Aguarde o Vercel buildar automaticamente." -ForegroundColor Green
Write-Host "Acompanhe em: https://vercel.com/monaycred/assessora" -ForegroundColor Cyan
