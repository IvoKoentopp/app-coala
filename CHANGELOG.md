# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.3] - 2025-02-24

### Alterado
- Simplificação do sistema de confirmação de jogos
- Melhorias no layout do Dashboard
- Adição de painéis de estatísticas para Cadastro e Jogos
- Melhorias na visualização do Hino
- Melhorias no sistema de cadastro de sócios
- Data de nascimento agora é opcional no cadastro

### Corrigido
- Correção no sistema de drag-and-drop
- Melhorias na validação de formulários
- Otimização do carregamento de dados

## [1.0.2] - 2025-02-23

### Alterado
- Atualização da página do Hino para usar URL externa
- Melhorias no layout da página do Hino com logo maior
- Ajustes nas configurações do clube para suportar URLs

## [1.0.1] - 2025-02-23

### Corrigido
- Bug no arrasta e solta dos sócios
- Limpeza das confirmações ao cancelar jogos
- Atualização automática dos quadros ao cancelar jogos
- Correção na exibição dos participantes após cancelamento do jogo

## [1.0.0] - 2025-02-23

### Adicionado
- Sistema de autenticação com Supabase
- Gerenciamento completo de sócios (CRUD)
- Gerenciamento de jogos com confirmações
- Sistema de drag-and-drop para confirmações
- Dashboard com estatísticas de membros
- Integração com armazenamento de fotos
- Sistema de padrinhos
- Controle de administradores
- Gestão de categorias de sócios
- Sistema de cancelamento de jogos com motivos

### Segurança
- Políticas de RLS no Supabase
- Proteção de rotas por autenticação
- Controle de acesso baseado em funções (admin/usuário)

### Interface
- Design responsivo com Tailwind CSS
- Componentes reutilizáveis
- Feedback visual para ações do usuário
- Interface drag-and-drop para confirmações