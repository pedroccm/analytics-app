# Analytics App

Dashboard de analytics integrado com GoodData (TOTVS Analytics).

## Stack

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **GoodData API** - Backend direto (sem Django)

## Credenciais de Demo

Para testar o app, use a conta de demonstração do TOTVS Analytics:

| Campo | Valor |
|-------|-------|
| **URL** | https://analytics.totvs.com.br |
| **Usuário** | demo.gd@totvs.com.br |
| **Senha** | fastanalytics |

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Variáveis de ambiente

Crie um arquivo `.env.local`:

```env
GOODDATA_API_URL=https://analytics.totvs.com.br
```

## API Routes

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/auth/login` | POST | Login no GoodData |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Usuário atual |
| `/api/projects` | GET | Lista projetos |
| `/api/projects/[id]/dashboards` | GET | Lista dashboards |
| `/api/projects/[id]/dashboards/[id]` | GET | Detalhes do dashboard |
| `/api/filters/elements` | GET | Elementos de filtro |
| `/api/reports/execute` | POST | Executa relatório |

## Deploy na Vercel

1. Faça push do repositório para GitHub
2. Conecte na Vercel
3. Configure a variável `GOODDATA_API_URL`
4. Deploy!

## Estrutura

```
src/
├── app/
│   ├── api/           # Route Handlers (API)
│   ├── login/         # Página de login
│   └── dashboard/     # Dashboard principal
└── lib/
    ├── gooddata.ts    # Cliente GoodData
    └── session.ts     # Gerenciamento de sessão
```
