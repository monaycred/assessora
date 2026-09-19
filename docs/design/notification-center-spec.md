# Central de notificações

## Tipos e destinos
- Cadastro pendente -> cadastro específico em Aprovações.
- Pedido de grupo -> pedido específico dentro do grupo.
- Comentário/reação -> publicação específica com comentário destacado.
- Denúncia -> denúncia específica na moderação.
- Marco -> jornada específica.
- Conteúdo sugerido -> item específico na fila de Descobrir.

## Confiabilidade
- A notificação guarda tipo da entidade e identificador, não uma URL livre.
- O servidor resolve o destino e confirma a permissão atual antes de abrir.
- Só marcar como lida depois que o destino responder com sucesso.
- Se o item já foi resolvido ou removido, mostrar estado explicativo e levar para a lista relacionada.
- Evitar notificações duplicadas por evento.
- Contador mostra apenas não lidas.
- Ações resolvidas deixam de aparecer como pendentes.

## Canais
- Central no aplicativo para tudo que envolve o usuário.
- WhatsApp para eventos prioritários: cadastro pendente, pedido de grupo, acompanhamento e pedido de apoio.
