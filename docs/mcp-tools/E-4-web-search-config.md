# E-4: Web/Search MCP Config (Vendor Docs)

## Purpose
Controlled web search access for Claude agents to retrieve vendor documentation, API references, and technical standards while preventing unrestricted internet browsing.

## Allowed Content Categories
- ✅ **Technical Documentation**: Framework docs, API references, library guides
- ✅ **Standards & Specifications**: RFC documents, W3C standards, ISO specifications
- ✅ **Vendor Resources**: Official documentation for tools used in project
- ✅ **Security Best Practices**: OWASP, NIST guidelines, security advisories
- ❌ **Prohibited**: Social media, news sites, unverified technical content
- ❌ **Prohibited**: Sites that might contain malicious code or exploits

## Preferred Vendor Domains
Whitelist of trusted technical documentation sites:
```
docs.microsoft.com
developer.mozilla.org
nodejs.org/docs
reactjs.org/docs
supabase.com/docs
postgresql.org/docs
developer.github.com
docs.docker.com
kubernetes.io/docs
tailwindcss.com/docs
vitejs.dev/guide
tanstack.com/query/latest/docs
playwright.dev/docs
eslint.org/docs
typescript-eslint.io
```

## Claude Desktop Configuration
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "web-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

## API Key Setup
Get Brave Search API key:
1. Visit [Brave Search API](https://api.search.brave.com/)
2. Create account and generate API key
3. Add to environment variables:
```bash
export BRAVE_API_KEY="your_api_key_here"
```

## Search Guidelines

### Recommended Queries
- "React TypeScript best practices site:reactjs.org"
- "Supabase RLS policy examples site:supabase.com"
- "PostgreSQL optimistic locking site:postgresql.org"
- "ESLint complexity rules site:eslint.org"
- "Playwright factory testing patterns site:playwright.dev"

### Query Patterns to Avoid
- Generic programming questions without specific context
- Queries that might return unverified Stack Overflow answers
- Searches for code solutions from unknown sources
- Broad searches without domain restrictions

## Agent Usage Guidelines

### All Agents
- Use site-specific searches when possible
- Verify information against official documentation
- Prefer vendor documentation over third-party tutorials

### Role-Specific Usage
- **Architect**: Standards documents, design patterns, security guidelines
- **Backend**: API documentation, database best practices, security patterns
- **Frontend**: Component libraries, accessibility standards, browser APIs
- **DevOps**: CI/CD documentation, infrastructure standards, monitoring guides
- **QA**: Testing framework docs, accessibility testing, performance standards
- **Docs/PM**: Technical writing standards, API documentation examples

## Content Filtering
Search results filtered for:
- Official documentation sites
- Well-established technical resources
- Current/maintained content (not outdated tutorials)
- Security-vetted sources

## Rate Limiting
- Respect API rate limits (typically 1000 queries/month for free tier)
- Cache frequently accessed documentation
- Use local documentation when available

## Security Considerations
- Never search for or access potentially malicious content
- Avoid downloading files through search results
- Don't search for sensitive internal information
- Validate all external code examples before use

## Alternative MCP Servers
If Brave Search is unavailable:
```json
{
  "web-fetch": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"],
    "env": {}
  }
}
```

## Testing
```bash
# Test Brave Search API
curl -H "X-Subscription-Token: $BRAVE_API_KEY" \
  "https://api.search.brave.com/res/v1/web/search?q=React+documentation"

# Verify MCP server
npx @modelcontextprotocol/server-brave-search --help
```

## Usage Monitoring
Track search queries to ensure appropriate usage:
- Log search terms and domains accessed
- Monitor for prohibited content attempts
- Review API usage against rate limits
- Audit search results for security concerns

## Rollback Plan
If web search causes issues:
1. Revoke API key in Brave Search dashboard
2. Remove web-search entry from MCP config
3. Restart Claude Desktop
4. Use manual documentation lookup as fallback

## Local Documentation Priority
Before using web search, check for local resources:
- `node_modules/*/README.md` files
- `docs/` directory in project dependencies  
- Cached API documentation in project
- Official CLI help commands (`--help` flags)

## PRD References
- CLAUDE.md §6: "web-search — vendor docs/standards preferred"
- CLAUDE.md §0: "Authority order: PRD → CLAUDE.md → repo docs → code comments"
- AGENT.md: "Web search restricted to technical documentation"