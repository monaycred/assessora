-- Atualiza credenciais da instancia IASMIN direto no banco
-- Execute no SQL Editor do Supabase (projeto: mijahjrxckrofqoujjba)

UPDATE whatsapp_instances
SET
  api_url = 'https://evolution-evolution-api.k4ezzu.easypanel.host',
  api_key = '429683C4C977415CAAFCCE10F7D57E11',
  status_conexao = 'online',
  webhook_url = 'https://assessora.gedaias.com/api/webhook/evolution'
WHERE instance_name = 'IASMIN';
