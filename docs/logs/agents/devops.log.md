# DevOps — Event Log

> Use the template at `../TEMPLATE_EVENT_ENTRY.md`. Keep entries short and link PRs/commits.

### 2024-09-06-devops-1
- **Branch/PR:** chore/modularity-caps (pushed, ready for manual PR creation)
- **Scope/files:** .eslintrc.cjs, .eslintignore, scripts/ci/check-max-lines.mjs, package.json, .github/workflows/ci.yml
- **Playbooks used:** CLAUDE.md §13 requirements, ESLint best practices
- **Decisions/risks:** 
  - ESLint v9 for latest rules support; React plugin for .tsx files
  - Custom line-count script vs complex ESLint plugin for simplicity
- **Outcome:** Complete modularity enforcement: 500-line cap, 80-line functions, complexity ≤12, CI integration
- **Next actions:** Manual PR creation, test locally with pnpm install + lint commands

### 2025-09-06-devops-2
- **Branch/PR:** config/mcp-tools (pushed, ready for manual PR creation)
- **Scope/files:** .claude/mcp_servers.json, .claude/mcp-configs/*.json, docs/mcp-tools/E-*.md + README.md
- **Playbooks used:** CLAUDE.md §6 least-privilege principles, MCP security guidelines
- **Decisions/risks:** 
  - Individual config files for maintainability vs single config complexity
  - Environment variable approach for secrets vs hardcoded paths for security
- **Outcome:** Complete E-1 to E-6 MCP tools: GitHub, Filesystem, Supabase, Web Search, TestSprite, Magic UI + Puppeteer
- **Next actions:** Manual PR creation, test MCP connections, environment variable setup guide

### 2025-09-06-devops-1 (placeholder)
- **Branch/PR:** 
- **Scope/files:** 
- **Playbooks used:** 
- **Decisions/risks:** 
- **Outcome:** 
- **Next actions:** 