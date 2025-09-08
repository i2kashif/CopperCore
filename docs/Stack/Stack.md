# CopperCore ERP – Tech Stack

## Core
- **Database:** PostgreSQL (Supabase managed)
- **Security:** Row Level Security (RLS) with JWT claims
- **Realtime:** Supabase Realtime (logical replication → websockets)

## Backend / API
- **Primary Access:** Supabase PostgREST
- **Custom Logic:** Supabase Edge Functions (Deno) or Node microservices (Docker) for:
  - DN→GRN handshake
  - Idempotent numbering
  - QC override/event emission

## Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **UI:** TailwindCSS (+ shadcn/ui components)
- **Data:** Supabase JS client + TanStack Query
- **Testing:** Playwright + Puppeteer MCP for E2E, Vitest/Jest for units

## QA / DevOps
- **Testing orchestration:** TestSprite
- **CI/CD:** GitHub Actions → run migrations + seeded tests on ephemeral DB
- **Seed/Fixtures:** SQL migrations + JS seed scripts
- **Coverage Targets:** 100% on PRD §12 acceptance tests; 80% overall

## Agents & Automation
- **Claude agents:** planning-coordinator, architect-erp, backend, frontend, qa, devops, docs-pm, linter
- **MCP Services:** Supabase MCP, TestSprite, MagicUI, OpenMemory, Filesystem, Brave Browser Control, Puppeteer MCP, GitHub MCP