#!/usr/bin/env python3
import subprocess
import sys
import os

# Change to project directory
os.chdir(r"C:\Users\gedai\Documents\Claude\Projects\IASMIN")

print("📝 Adding all changes...")
subprocess.run(["git", "add", "-A"], check=True)

print("💾 Creating commit...")
commit_message = """feat: WhatsApp obrigatório com máscara de entrada e edição de perfil

- Tornar WhatsApp obrigatório no cadastro
- Remover o '55' do placeholder com máscara (XX) XXXXX-XXXX
- Pré-preenchimento com bandeira 🇧🇷
- Adicionar validação obrigatória (mínimo 10 dígitos)
- Permitir edição do WhatsApp na página de configurações
- Salvar número com código de país (55) no banco
- Formatar exibição de forma amigável (sem 55)

Fixes: Issue com número de WhatsApp não sendo salvo
"""

subprocess.run(["git", "config", "user.email", "gedaias.moura@hotmail.com"], check=False)
subprocess.run(["git", "config", "user.name", "Gedaías"], check=False)

subprocess.run(["git", "commit", "-m", commit_message], check=True)

print("\n✅ Últimos commits:")
subprocess.run(["git", "log", "--oneline", "-5"], check=True)

print("\n🚀 Pushing to GitHub...")
subprocess.run(["git", "push", "origin", "main"], check=True)

print("\n✅ Done! Vercel will auto-deploy the changes.")
sys.exit(0)
