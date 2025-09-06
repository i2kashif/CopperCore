# E-2: Filesystem MCP Config (Repo-Root Only)

## Purpose
Restricted filesystem access for Claude agents limited to the CopperCore repository root, preventing access to sensitive system files or user home directory.

## Security Model
- ✅ **Allowed**: Read/write within `/path/to/CopperCore` repository
- ✅ **Allowed**: Create/edit project files, run scripts within repo
- ❌ **Prohibited**: Access to `$HOME` directory, system files, or other projects
- ❌ **Prohibited**: `/etc`, `/var`, `/usr`, or any system-level directories
- ❌ **Prohibited**: Files outside repository boundaries

## Claude Desktop Configuration
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", 
        "@modelcontextprotocol/server-filesystem", 
        "--allowed-dirs", 
        "/absolute/path/to/CopperCore"
      ],
      "env": {
        "MCP_FILESYSTEM_ALLOWED_DIRS": "/absolute/path/to/CopperCore"
      }
    }
  }
}
```

## Path Configuration
Replace `/absolute/path/to/CopperCore` with your actual repository path:

**macOS/Linux:**
```bash
# Find your repo path
pwd
# Example: /Users/username/Projects/CopperCore
```

**Windows:**
```powershell
# Find your repo path  
pwd
# Example: C:\Users\username\Projects\CopperCore
```

## Agent Usage Guidelines
Per CLAUDE.md §6 and /AGENT.md restrictions:

### All Agents
- Read source code, documentation, config files
- Edit files within assigned role scope
- Run build/test scripts via filesystem operations

### Role-Specific Restrictions
- **Frontend**: Primary access to `apps/web/`, `packages/shared/src/types/`
- **Backend**: Primary access to `apps/api/`, `packages/shared/`, `infra/`
- **DevOps**: Full repo access for CI/CD, configs, scripts
- **QA**: Access to `tests/`, `e2e/`, test configs
- **Docs/PM**: Access to `docs/`, `*.md` files, ADRs

### Prohibited Operations
- Creating files outside repository
- Accessing parent directories (`../`)
- Reading system files or environment configs
- Writing to system directories or user home

## Testing
```bash
# Verify MCP server connection
npx @modelcontextprotocol/server-filesystem --help

# Test directory restrictions (should fail)
# Attempt to access /etc/passwd or $HOME/.bashrc

# Test repo access (should succeed)  
# Read/write files within repository boundary
```

## Environment Variables
```bash
# Optional: Set explicit allowed directories
export MCP_FILESYSTEM_ALLOWED_DIRS="/absolute/path/to/CopperCore"

# Verification
echo $MCP_FILESYSTEM_ALLOWED_DIRS
```

## Security Validation
Regular checks to ensure filesystem boundaries:
1. **Directory traversal prevention**: No `../` access beyond repo root
2. **Symlink protection**: No following symlinks outside allowed directories  
3. **Hidden file protection**: Respect `.gitignore` for sensitive files
4. **Binary file safety**: Avoid modifying compiled binaries or large assets

## Rollback Plan
If filesystem access causes issues:
1. Remove `filesystem` entry from `mcp_servers.json`
2. Restart Claude Desktop
3. Verify no unauthorized file changes occurred
4. Re-enable with stricter directory permissions if needed

## PRD References
- CLAUDE.md §0: "Safety: Do not use --dangerously-skip-permissions"
- CLAUDE.md §6: "filesystem — repo root only (no $HOME or system paths)"
- AGENT.md: "Filesystem access scoped per agent role"