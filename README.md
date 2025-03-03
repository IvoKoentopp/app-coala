# Coala Country Club

Sistema de gerenciamento para clube de futebol, incluindo:
- Gerenciamento de sócios
- Agendamento e confirmação de jogos
- Formação de times
- Estatísticas de jogadores
- Gestão financeira

## Implantação no Vercel

Para implantar este projeto no Vercel, siga os passos abaixo:

1. Crie uma conta no [Vercel](https://vercel.com) se ainda não tiver uma
2. Instale a CLI do Vercel:
   ```
   npm i -g vercel
   ```
3. Faça login na sua conta Vercel:
   ```
   vercel login
   ```
4. No diretório do projeto, execute:
   ```
   vercel
   ```
5. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do seu projeto Supabase

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

## Desenvolvimento Local

```
npm install
npm run dev
```

## Build para Produção

```
npm run build
```