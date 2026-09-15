Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")

' Change to project directory
strPath = "C:\Users\gedai\Documents\Claude\Projects\IASMIN"
objShell.CurrentDirectory = strPath

' Configure git
objShell.Run "git config user.email gedaias.moura@hotmail.com", 0, True
objShell.Run "git config user.name Gedaías", 0, True

' Add changes
objShell.Run "git add -A", 0, True

' Commit with message
strMessage = "feat: WhatsApp obrigatório com máscara de entrada" & vbCrLf & vbCrLf & "- Tornar WhatsApp obrigatório no cadastro" & vbCrLf & "- Máscara (XX) XXXXX-XXXX sem o 55" & vbCrLf & "- Pré-preenchimento com bandeira 🇧🇷" & vbCrLf & "- Validação obrigatório (mínimo 10 dígitos)" & vbCrLf & "- Edição do WhatsApp na página de configurações" & vbCrLf & "- Salvar com código de país (55) no banco" & vbCrLf & "- Exibição amigável (sem 55)"

objShell.Run "git commit -m """ & strMessage & """", 0, True

' Push to GitHub
objShell.Run "git push origin main", 0, True

' Show confirmation
MsgBox "✅ Commit and push completed!" & vbCrLf & "Vercel will auto-deploy the changes.", 0, "Deployment"
