# Logs — Why these exist

Claude’s chat memory is ephemeral. These small, durable logs let any agent (or a fresh session) quickly regain context.

- **AGENT_EVENT_LOG.md** — index of key events across all agents.
- **agents/*.log.md** — per-agent breadcrumbs.
- **SESSION_CHECKLIST.md** — project kanban/checklist (single source of progress truth).
- **TEMPLATE_EVENT_ENTRY.md** — exact format agents must use.

> Keep entries **short**. Link PRs/commits, not full diffs. Update at session end.