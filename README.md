# Arreda - Plataforma de Aluguel de Imóveis por Temporada

O **Arreda** é uma plataforma web moderna e responsiva voltada para a busca, anúncios e reservas de imóveis por temporada. O sistema conecta proprietários que desejam anunciar seus imóveis a clientes que buscam opções de acomodação, integrando autenticação segura, gestão de reservas, calendários de disponibilidade e pagamentos online.

<img width="853" height="1844" alt="arredalist" src="https://github.com/user-attachments/assets/300a709f-9aa0-45bd-bc78-2b6594b07179" />
<img width="853" height="1844" alt="arredamobile" src="https://github.com/user-attachments/assets/c76a124f-e508-459c-af3e-0253ca96ff66" />
<img width="1920" height="3478" alt="webarreda" src="https://github.com/user-attachments/assets/5f96dba2-c3a2-4851-b313-a68dc2a3bfc4" />
<img width="1920" height="1747" alt="arredaweb" src="https://github.com/user-attachments/assets/164b8945-4d7d-4e96-ba59-fcc5a06302e5" />

veja um video do projeto aqui: https://youtu.be/__2yBNOP9a8


---

## Sumário

- Finalidade do Projeto
- Funcionalidades Principais
- Tech Stack (Tecnologias Utilizadas)
- Arquitetura e Estrutura de Pastas
- Segurança e Boas Práticas
- Como Executar o Projeto Localmente
- Variáveis de Ambiente
- Licença

---

## Finalidade do Projeto

O objetivo do Arreda é simplificar a intermediação entre proprietários de imóveis e inquilinos por temporada. A plataforma foi projetada para oferecer uma experiência fluida de navegação, busca avançada com filtros, sistema de favoritos, fluxo completo de solicitação e checkout de reserva com pagamento integrado.

---

## Funcionalidades Principais

### Para Clientes (Hóspedes)
- **Busca Avançada de Imóveis:** Filtros por localização, intervalo de datas, quantidade de hóspedes, faixa de preço, tipo de imóvel e comodidades.
- **Visualização Detalhada:** Fotos do imóvel, regras da casa, horário de check-in/check-out, comodidades, localização aproximada e dados do proprietário.
- **Gerenciamento de Favoritos:** Salve imóveis preferidos para fácil acesso posterior.
- **Solicitação de Reserva:** Seleção de datas no calendário interativo e envio de pedidos de reserva.
- **Checkout Seguro com Stripe:** Integração para pagamento via cartão de crédito.
- **Painel do Cliente:** Acompanhamento dos status das reservas (Pendente, Confirmada, Cancelada, Concluída) e histórico.

### Para Proprietários (Anfitriões)
- **Cadastro e Edição de Imóveis:** Publicação detalhada de anúncios com título, descrição, fotos, preço por diária, taxa de limpeza e regras.
- **Painel do Proprietário:** Visão geral do desempenho, lista de imóveis cadastrados e resumo de reservas recebidas.
- **Gestão de Reservas:** Aprovação, rejeição ou cancelamento de solicitações de reserva.
- **Calendário do Anfitrião:** Gerenciamento visual de datas ocupadas e bloqueadas por imóvel.

### Sistema & Autenticação
- Autenticação e controle de acesso com suporte a dois papéis de usuário (Proprietário e Cliente).
- Rotas protegidas conforme o perfil do usuário logado.

---

## Tech Stack (Tecnologias Utilizadas)

### Front-end
- **React 18:** Biblioteca para construção da interface de usuário.
- **TypeScript:** Tipagem estática para maior confiabilidade do código.
- **Vite:** Build tool ultra-rápido para o ambiente de desenvolvimento e empacotamento.
- **React Router DOM (v7):** Gerenciamento de rotas SPA (Single Page Application).
- **Tailwind CSS:** Framework CSS utilitário para estilização responsiva e moderna.
- **Lucide React:** Biblioteca de ícones vetoriais modernos.
- **Date-fns:** Utilitário para manipulação e formatação de datas.

### Back-end & Serviços (BaaS)
- **Supabase:** Plataforma Backend-as-a-Service fornecendo banco de dados PostgreSQL, autenticação e armazenamento.
- **Stripe JS & React Stripe JS:** Processamento seguro de pagamentos online na etapa de checkout.

---

## Arquitetura e Estrutura de Pastas

```text
arreda-main/
├── public/              # Arquivos estáticos
├── src/
│   ├── components/      # Componentes reutilizáveis (Navbar, Footer, Layouts, etc.)
│   ├── context/         # Contextos da aplicação (AuthContext, etc.)
│   ├── hooks/           # Custom React Hooks
│   ├── lib/             # Clientes de serviços externos (Supabase client)
│   ├── pages/           # Páginas da aplicação (Landing, Buscar, Dashboards, Checkout, etc.)
│   ├── services/        # Camada de serviços e requisições de API
│   ├── App.tsx          # Configuração de rotas principais
│   ├── main.tsx         # Ponto de entrada da aplicação
│   └── index.css        # Configurações globais do Tailwind CSS
├── supabase/            # Scripts e migrações do banco de dados Supabase
├── .env.example         # Exemplo de configuração de variáveis de ambiente
├── .gitignore           # Arquivos e pastas ignorados no controle de versão
├── package.json         # Dependências e scripts do projeto
├── tailwind.config.js   # Configuração de temas e plugins do Tailwind
└── vite.config.ts       # Configurações do Vite
```

---

## Segurança e Boas Práticas

Antes de realizar o commit ou submeter o projeto para repositórios públicos:

1. **Variáveis de Ambiente:** Todos os arquivos de configuração contendo dados sensíveis (como `.env`, `.env.local` e `.env.production`) estão incluídos no `.gitignore` para evitar vazamento de dados.
2. **Chaves Públicas vs Privadas:** Apenas chaves publicáveis (ex: `VITE_SUPABASE_ANON_KEY` e `VITE_STRIPE_PUBLISHABLE_KEY`) devem ser expostas no front-end. Chaves secretas (como `STRIPE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`) **nunca** devem ser incluídas no repositório front-end.
3. **Exemplo de Variáveis:** Utilize o arquivo `.env.example` como modelo para documentar quais chaves são necessárias para rodar o projeto.

---

## Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior recomendada)
- Gerenciador de pacotes npm, yarn ou pnpm

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO>
   cd arreda-main
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Preencha as variáveis com suas credenciais do Supabase e Stripe.

4. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acessar no navegador:**
   Abra o endereço indicado no terminal (geralmente `http://localhost:5173`).

---

## Comandos Úteis

- `npm run dev`: Inicia o ambiente de desenvolvimento local via Vite.
- `npm run build`: Gera os arquivos de produção na pasta `dist`.
- `npm run preview`: Visualiza localmente a build de produção.
- `npm run lint`: Executa a verificação estática do código com ESLint.
- `npm run typecheck`: Executa a checagem de tipos com TypeScript sem compilar.
