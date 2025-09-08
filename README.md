# CopperCore ERP

> Factory-scoped ERP system for wires/cables/conductors with strict RLS, PU-level traceability, DN→GRN logistics, and Pakistan fiscal controls.

## Overview

CopperCore is a specialized ERP system designed for wire, cable, and conductor manufacturing with:

- **Factory Scoping**: Each user sees only their factory's data (global roles exempt)
- **Product Family Configuration**: Configurable attributes drive SKU identity, QC plans, and UI behavior
- **Work Order Lifecycle**: RM issue/return → production logs → FG receipt with TBD attribute finalization
- **PU-Level Traceability**: Barcode-based tracking from production to dispatch
- **DN→GRN Flow**: Optimized inter-factory transfers with discrepancy management
- **Pakistan Fiscal Compliance**: GST-ready invoicing with regulatory controls
- **Realtime Updates**: Live UI updates via Supabase Realtime

## Tech Stack

- **Database**: PostgreSQL (Supabase managed) with RLS
- **Backend**: Supabase PostgREST + Edge Functions
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Testing**: Playwright + TestSprite MCP
- **CI/CD**: GitHub Actions with ephemeral databases

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Supabase account

### Setup

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd CopperCore
   pnpm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **MCP Configuration (Optional)**
   ```bash
   cp .mcp.local.example.json .mcp.local.json
   # Edit .mcp.local.json with your local Claude extension paths
   # Only needed for brave_control and context7 services
   ```

4. **Database Setup**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Development**
   ```bash
   pnpm dev
   ```

### NPM Scripts

- `pnpm db:migrate` - Generate and apply migrations
- `pnpm db:seed` - Seed database with test data
- `pnpm db:reset` - Reset and reseed database
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run test suite
- `pnpm lint` - Lint codebase
- `pnpm typecheck` - Type checking

## Architecture

### Agent-Based Development
All development work flows through specialized Claude agents:

- `planning-coordinator` - Task planning and coordination
- `architect-erp` - Database schema, RLS policies, security
- `backend-developer` - API endpoints, business logic
- `frontend-developer` - React components, UI state
- `qa-test-engineer` - Testing and coverage
- `devops-engineer` - CI/CD and deployments
- `docs-pm` - Documentation and ADRs
- `code-linter` - Code quality and formatting

### Database Architecture
- **Factory-scoped RLS** using JWT claims (`role`, `factory_id`)
- **Document numbering** with fiscal year awareness
- **Audit trails** with tamper-evident logging
- **Realtime subscriptions** for live UI updates

## Documentation

| File | Purpose |
|------|---------|
| [`docs/PRD/PRD_v1.5.md`](docs/PRD/PRD_v1.5.md) | Complete requirements (single source of truth) |
| [`docs/Implementation_Checklist.md`](docs/Implementation_Checklist.md) | 20-step implementation plan |
| [`docs/Traceability_Matrix.md`](docs/Traceability_Matrix.md) | Requirement→Test→Agent mapping |
| [`CLAUDE.md`](CLAUDE.md) | AI development guide |
| [`docs/DB_GUIDE.md`](docs/DB_GUIDE.md) | Database operations guide |
| [`docs/Stack/Stack.md`](docs/Stack/Stack.md) | Technology stack details |

## Development Workflow

1. **Plan** - Use `planning-coordinator` to break down tasks
2. **Backend** - Schema, migrations, APIs via `architect-erp` + `backend-developer`  
3. **Frontend** - Components and UI via `frontend-developer`
4. **QA** - Tests and coverage via `qa-test-engineer`
5. **Review** - Linting via `code-linter`
6. **Deploy** - CI/CD via `devops-engineer`

## MCP Services

The project uses Model Context Protocol services for enhanced development:

- **Supabase MCP** - Database operations
- **TestSprite MCP** - Test generation and execution
- **MagicUI MCP** - Frontend component assistance
- **Puppeteer MCP** - Browser automation and E2E testing
- **GitHub MCP** - Repository operations
- **OpenMemory & Context7** - Context management

## Security & Compliance

- **RLS Enforcement**: All data access factory-scoped by JWT claims
- **Audit Trails**: Tamper-evident logging for all critical operations
- **Fiscal Compliance**: Pakistan GST-ready with regulatory controls
- **Secrets Management**: Environment variables, no secrets in code

## Testing

- **Acceptance Tests**: AT-* IDs linked to PRD requirements
- **Coverage Target**: ≥80% overall, 100% critical paths
- **E2E Testing**: Playwright with real database testing
- **No Mock DBs**: Real Postgres/Supabase for all workflow tests

## Support

For development questions, see:
- Implementation Checklist for current status
- CLAUDE.md for AI agent usage
- DB_GUIDE.md for database operations
- PRD v1.5 for complete requirements

## License

Proprietary - CopperCore Manufacturing ERP