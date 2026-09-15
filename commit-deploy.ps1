#!/usr/bin/env pwsh

# Navigate to project directory
Set-Location "C:\Users\gedai\Documents\Claude\Projects\IASMIN"

# Configure git (if needed)
git config user.email "gedaias.moura@hotmail.com" 2>$null
git config user.name "Gedaías" 2>$null

# Add all changes
Write-Host "📝 Adding changes..." -ForegroundColor Cyan
git add -A

# Commit with descriptive message
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
git commit -m @"
feat: WhatsApp obrigatório com máscara de entrada e edição de perfil

- Tornar WhatsApp obrigatório no cadastro
- Remover o '55' do placeholder com máscara (XX) XXXXX-XXXX
- Pré-preenchimento com bandeira 🇧🇷
- Adicionar validação obrigatória (mínimo 10 dígitos)
- Permitir edição do WhatsApp na página de configurações
- Salvar número com código de país (55) no banco
- Formatar exibição de forma amigável (sem 55)

Fixes: Issue com número de WhatsApp não sendo salvo
"@

# Show log
Write-Host "`n✅ Últimos commits:" -ForegroundColor Green
git log --oneline -5

# Push to GitHub
Write-Host "`n🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "`n✅ Done! Vercel will auto-deploy the changes." -ForegroundColor Green
