# MCP Tools Configuration Guide

## Overview
This directory contains Model Context Protocol (MCP) tool configurations for CopperCore development, following least-privilege principles as defined in CLAUDE.md §6.

## Quick Setup
1. Copy `.claude/mcp_servers.json` to your Claude Desktop config directory:
   - **macOS**: `~/.claude/mcp_servers.json` 
   - **Windows**: `%APPDATA%\.claude\mcp_servers.json`
   - **Linux**: `~/.claude/mcp_servers.json`

2. Set required environment variables (see individual config docs)

3. Restart Claude Desktop to load configurations

## Available Configurations

| Tool | Purpose | Access Level | Documentation |
|------|---------|--------------|---------------|
| **E-1: GitHub** | Repository access, PR management | Read + PR creation | [E-1-github-config.md](./E-1-github-config.md) |
| **E-2: Filesystem** | File operations | Repo root only | [E-2-filesystem-config.md](./E-2-filesystem-config.md) |
| **E-3: Supabase/Postgres** | Database access | Dev RW, Prod RO | [E-3-supabase-postgres-config.md](./E-3-supabase-postgres-config.md) |
| **E-4: Web Search** | Documentation lookup | Vendor docs only | [E-4-web-search-config.md](./E-4-web-search-config.md) |
| **E-5: TestSprite** | Test generation | QA automation | [E-5-testsprite-config.md](./E-5-testsprite-config.md) |
| **E-6: Magic UI + Puppeteer** | UI scaffolding, browser automation | Dev environment only | [E-6-magic-ui-puppeteer-config.md](./E-6-magic-ui-puppeteer-config.md) |

## Environment Variables Required
Create a `.env` file or add to your shell profile:
```bash
# GitHub API access
export GITHUB_PAT="ghp_your_github_token_here"

# Database connections (environment-specific)  
export SUPABASE_DATABASE_URL="postgresql://user:pass@host:port/db"

# Search API
export BRAVE_API_KEY="your_brave_search_api_key"

# Test automation (optional)
export TESTSPRITE_API_KEY="your_testsprite_key"
```

## Security Principles
- **Least Privilege**: Each tool has minimal required permissions
- **Environment Isolation**: Development tools blocked from production
- **Factory Scoping**: All database access respects RLS policies  
- **Audit Trail**: All changes go through PR review process

## Agent Role Restrictions
Per `/AGENT.md` specifications:
- **All Agents**: GitHub (read/PR), Filesystem (repo-scoped)
- **Architect + Backend**: Full Supabase access (dev), read-only (prod)
- **DevOps**: All tools for CI/CD management
- **QA**: TestSprite + Puppeteer for test automation
- **Frontend**: Magic UI + Puppeteer for component development
- **Docs/PM**: Web search for documentation standards

## Troubleshooting

### Common Issues
1. **"MCP server not found"**: Ensure NPM packages are available globally
2. **"Authentication failed"**: Check environment variables are set correctly
3. **"Permission denied"**: Verify API keys have correct scopes
4. **"Connection timeout"**: Check network access to external services

### Verification Commands
```bash
# Test GitHub connection
npx @modelcontextprotocol/server-github --help

# Test Filesystem access  
npx @modelcontextprotocol/server-filesystem --help

# Test database connection
psql $SUPABASE_DATABASE_URL -c "SELECT current_user;"

# Test search API
curl -H "X-Subscription-Token: $BRAVE_API_KEY" "https://api.search.brave.com/res/v1/web/search?q=test"
```

## Configuration Updates
When modifying MCP configurations:
1. Update individual config files in this directory
2. Update master `/.claude/mcp_servers.json` file
3. Document changes in this README
4. Test all affected tools before committing
5. Create PR following approval process for MCP scope changes

## PRD References
- CLAUDE.md §6: "MCP Tools — Overview & Expectations"
- CLAUDE.md §2.2: "MCP scope expansions require human approval"
- SESSION_CHECKLIST.md E-1 through E-6: Individual tool requirements