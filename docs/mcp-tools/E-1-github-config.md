# E-1: GitHub MCP Config (Read/PR Scope)

## Purpose
Least-privilege GitHub access for Claude agents to read repository data and manage pull requests without broader repository write permissions.

## Required Token Scopes
Create a GitHub Personal Access Token with these **minimal** scopes:
- `repo:status` - Access commit status
- `public_repo` - Access public repositories  
- `pull_requests:write` - Create and manage PRs
- `contents:read` - Read repository contents
- `metadata:read` - Access repository metadata

## Token Creation Steps
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with scopes listed above
3. Set expiration (90 days recommended for security)
4. Store token securely in environment variables

## Environment Setup
```bash
# Add to your shell profile (.zshrc, .bashrc, etc.)
export GITHUB_PAT="ghp_your_token_here"

# Or use GitHub CLI (recommended)
gh auth login --scopes "repo:status,public_repo,pull_requests:write,contents:read,metadata:read"
```

## Claude Desktop Configuration
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PAT}"
      }
    }
  }
}
```

## Security Constraints
- ✅ **Allowed**: Read repo contents, create/update PRs, check CI status
- ✅ **Allowed**: Comment on PRs, request reviews
- ❌ **Prohibited**: Direct pushes to main/protected branches
- ❌ **Prohibited**: Repository settings changes
- ❌ **Prohibited**: Webhooks, secrets, or organization-level access

## Agent Usage Guidelines
Per CLAUDE.md and /AGENT.md:
- **All agents**: Can read repository data and create PRs
- **DevOps**: Additional CI/Actions status access
- **QA**: Can create test-related issues and PR reviews
- **No agent**: Can bypass branch protection or merge without review

## Testing
```bash
# Verify MCP server connection
npx @modelcontextprotocol/server-github --help

# Test with Claude Desktop (after config)
# Should be able to list repositories and create test PR
```

## Rollback Plan
If token is compromised:
1. Revoke token in GitHub Settings → Developer settings
2. Generate new token with same minimal scopes
3. Update environment variable
4. Restart Claude Desktop

## PRD References
- PRD-v1.5.md §11: "Agent roles with least privilege"
- CLAUDE.md §6: "MCP Tools — Overview & Expectations"
- AGENT.md: "Per-role MCP permissions matrix"