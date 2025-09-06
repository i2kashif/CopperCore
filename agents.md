# CopperCore ERP — Agents (Index)

> Use **multiple agent files** when working with Claude Code to improve **parallel development**, **quality**, and **context management**.
> This index stays **brief** and links to detailed specs in `/agents/*`.

- [Architect](./agents/architect.md)  
  *Schema/RLS patterns, ADRs, security reviews; gates risky changes.*  
  Prompts: [`realtime_cache_invalidation.md`](./docs/prompts/realtime_cache_invalidation.md), [`optimistic_locking.md`](./docs/prompts/optimistic_locking.md), [`audit_chain.md`](./docs/prompts/audit_chain.md)

- [Backend](./agents/backend.md)  
  *Service logic on Supabase + custom API; non-pricing business rules; realtime emitters.*  
  Prompts: [`rls_policy.md`](./docs/prompts/rls_policy.md), [`optimistic_locking.md`](./docs/prompts/optimistic_locking.md), [`audit_chain.md`](./docs/prompts/audit_chain.md)

- [Frontend](./agents/frontend.md)  
  *React+TS app; scanner-first PL; Realtime + TanStack cache keys.*  
  Prompts: [`realtime_cache_invalidation.md`](./docs/prompts/realtime_cache_invalidation.md), [`playwright_grn_discrepancy.md`](./docs/prompts/playwright_grn_discrepancy.md)

- [QA](./agents/qa.md)  
  *Acceptance specs (PRD §12), regression automation via TestSprite + Playwright; blocks PRs on coverage/regressions.*  
  Prompts: [`testsprite_acceptance_seed.md`](./docs/prompts/testsprite_acceptance_seed.md), [`playwright_grn_discrepancy.md`](./docs/prompts/playwright_grn_discrepancy.md)

- [DevOps](./agents/devops.md)  
  *CI/CD, envs, secrets (least privilege), preview DBs; rollout/rollback gates.*  
  Prompts: *(CI snippets embedded in playbooks above)*

- [Docs/PM](./agents/docs_pm.md)  
  *PRD alignment, ADR/RFC authoring, release notes tied to acceptance tests.*

## Least-Privilege Baseline (applies to all agents)
- **Prod DB is read-only** for all agents.
- MCP scopes must **not** be expanded without an ADR labeled **`Requires Approval`** and approvals per `CLAUDE.md`.

## References
- Operating guide: [`CLAUDE.md`](./CLAUDE.md)
- Prompt library index: [`docs/prompts/README.md`](./docs/prompts/README.md)